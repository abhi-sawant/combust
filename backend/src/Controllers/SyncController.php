<?php

declare(strict_types=1);

namespace Combust\Controllers;

use Combust\Auth\AuthMiddleware;
use Combust\Database;
use Combust\Support\Clock;
use Combust\Support\Request;
use Combust\Support\Response;
use DateTimeImmutable;
use DateTimeZone;
use PDO;

/**
 * Two-way sync. The client pushes every record changed since its last sync (tombstones
 * included) and gets back everything the server wrote since its cursor. Conflicts are
 * resolved per row by last-write-wins on `updatedAt`; ties go to the server.
 */
final class SyncController
{
    private const MAX_RECORDS = 5000;
    private const UUID = '/^[0-9a-fA-F-]{36}$/';

    public function sync(): void
    {
        $userId = (int) AuthMiddleware::requireUser()['sub'];
        $data = Request::json();

        $vehicles = $data['vehicles'] ?? [];
        $entries = $data['entries'] ?? [];
        $services = $data['services'] ?? [];
        if (
            !is_array($vehicles) || !is_array($entries) || !is_array($services)
            || count($vehicles) + count($entries) + count($services) > self::MAX_RECORDS
        ) {
            Response::error('Invalid sync payload', 422);
        }

        $cursor = max(0, (int) ($data['cursor'] ?? 0));
        $serverNow = Clock::nowMs();
        $db = Database::connection();

        $db->beginTransaction();
        foreach ($vehicles as $v) {
            if (is_array($v)) {
                $this->upsertVehicle($db, $userId, $v, $serverNow);
            }
        }
        foreach ($entries as $e) {
            if (is_array($e)) {
                $this->upsertEntry($db, $userId, $e, $serverNow);
            }
        }

        foreach ($services as $s) {
            if (is_array($s)) {
                $this->upsertService($db, $userId, $s, $serverNow);
            }
        }

        // `>=` so rows written in the same millisecond as the previous cursor are never missed;
        // the client applies changes idempotently.
        $pulledVehicles = $db->prepare(
            'SELECT id, name, plate, created_at AS createdAt, updated_at AS updatedAt, deleted_at AS deletedAt
             FROM vehicles WHERE user_id = ? AND synced_at >= ?'
        );
        $pulledVehicles->execute([$userId, $cursor]);

        $pulledEntries = $db->prepare(
            'SELECT fe.id, fe.vehicle_id AS vehicleId, fe.date, fe.odometer_reading AS odometerReading,
                    fe.fuel_station AS fuelStation, fe.amount_paid AS amountPaid, fe.litres_filled AS litresFilled,
                    fe.is_full_tank AS isFullTank, fe.missed_previous AS missedPrevious,
                    fe.updated_at AS updatedAt, fe.deleted_at AS deletedAt
             FROM fuel_entries fe JOIN vehicles v ON v.id = fe.vehicle_id
             WHERE v.user_id = ? AND fe.synced_at >= ?'
        );
        $pulledEntries->execute([$userId, $cursor]);

        $pulledServices = $db->prepare(
            'SELECT si.id, si.vehicle_id AS vehicleId, si.name, si.last_changed_date AS lastChangedDate,
                    si.last_changed_odometer AS lastChangedOdometer, si.interval_km AS intervalKm,
                    si.interval_months AS intervalMonths, si.notes, si.updated_at AS updatedAt, si.deleted_at AS deletedAt
             FROM service_items si JOIN vehicles v ON v.id = si.vehicle_id
             WHERE v.user_id = ? AND si.synced_at >= ?'
        );
        $pulledServices->execute([$userId, $cursor]);
        $db->commit();

        Response::json([
            'cursor' => $serverNow,
            'vehicles' => array_map(self::castVehicle(...), $pulledVehicles->fetchAll()),
            'entries' => array_map(self::castEntry(...), $pulledEntries->fetchAll()),
            'services' => array_map(self::castService(...), $pulledServices->fetchAll()),
        ]);
    }

    private function upsertVehicle(PDO $db, int $userId, array $v, int $serverNow): void
    {
        $id = (string) ($v['id'] ?? '');
        $name = trim((string) ($v['name'] ?? ''));
        $updatedAt = (int) ($v['updatedAt'] ?? 0);
        if (!preg_match(self::UUID, $id) || $name === '' || $updatedAt <= 0) {
            return;
        }
        $plate = trim((string) ($v['plate'] ?? ''));
        $plate = $plate === '' ? null : $plate;
        $deletedAt = isset($v['deletedAt']) ? (int) $v['deletedAt'] : null;

        $stmt = $db->prepare('SELECT user_id, updated_at FROM vehicles WHERE id = ? FOR UPDATE');
        $stmt->execute([$id]);
        $existing = $stmt->fetch();

        if ($existing === false) {
            $db->prepare(
                'INSERT INTO vehicles (id, user_id, name, plate, created_at, updated_at, deleted_at, synced_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([$id, $userId, $name, $plate, self::toDateTime($v['createdAt'] ?? null), $updatedAt, $deletedAt, $serverNow]);
            return;
        }

        if ((int) $existing['user_id'] !== $userId || $updatedAt <= (int) $existing['updated_at']) {
            return;
        }

        $db->prepare(
            'UPDATE vehicles SET name = ?, plate = ?, updated_at = ?, deleted_at = ?, synced_at = ? WHERE id = ?'
        )->execute([$name, $plate, $updatedAt, $deletedAt, $serverNow, $id]);
    }

    private function upsertEntry(PDO $db, int $userId, array $e, int $serverNow): void
    {
        $id = (string) ($e['id'] ?? '');
        $vehicleId = (string) ($e['vehicleId'] ?? '');
        $updatedAt = (int) ($e['updatedAt'] ?? 0);
        $date = (string) ($e['date'] ?? '');
        if (
            !preg_match(self::UUID, $id) || !preg_match(self::UUID, $vehicleId) || $updatedAt <= 0
            || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)
            || !is_numeric($e['odometerReading'] ?? null) || !is_numeric($e['amountPaid'] ?? null)
            || !is_numeric($e['litresFilled'] ?? null)
        ) {
            return;
        }

        $owner = $db->prepare('SELECT user_id FROM vehicles WHERE id = ?');
        $owner->execute([$vehicleId]);
        $ownerId = $owner->fetchColumn();
        if ($ownerId === false || (int) $ownerId !== $userId) {
            return;
        }

        $deletedAt = isset($e['deletedAt']) ? (int) $e['deletedAt'] : null;
        $fields = [
            $vehicleId,
            $date,
            (float) $e['odometerReading'],
            mb_substr(trim((string) ($e['fuelStation'] ?? '')), 0, 255),
            (float) $e['amountPaid'],
            (float) $e['litresFilled'],
            filter_var($e['isFullTank'] ?? true, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
            filter_var($e['missedPrevious'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
            $updatedAt,
            $deletedAt,
            $serverNow,
        ];

        $stmt = $db->prepare(
            'SELECT fe.updated_at, v.user_id FROM fuel_entries fe JOIN vehicles v ON v.id = fe.vehicle_id
             WHERE fe.id = ? FOR UPDATE'
        );
        $stmt->execute([$id]);
        $existing = $stmt->fetch();

        if ($existing === false) {
            $db->prepare(
                'INSERT INTO fuel_entries (vehicle_id, date, odometer_reading, fuel_station, amount_paid, litres_filled,
                    is_full_tank, missed_previous, updated_at, deleted_at, synced_at, id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([...$fields, $id]);
            return;
        }

        if ((int) $existing['user_id'] !== $userId || $updatedAt <= (int) $existing['updated_at']) {
            return;
        }

        $db->prepare(
            'UPDATE fuel_entries SET vehicle_id = ?, date = ?, odometer_reading = ?, fuel_station = ?, amount_paid = ?,
                litres_filled = ?, is_full_tank = ?, missed_previous = ?, updated_at = ?, deleted_at = ?, synced_at = ?
             WHERE id = ?'
        )->execute([...$fields, $id]);
    }

    private function upsertService(PDO $db, int $userId, array $s, int $serverNow): void
    {
        $id = (string) ($s['id'] ?? '');
        $vehicleId = (string) ($s['vehicleId'] ?? '');
        $name = mb_substr(trim((string) ($s['name'] ?? '')), 0, 255);
        $updatedAt = (int) ($s['updatedAt'] ?? 0);
        $date = $s['lastChangedDate'] ?? null;
        if (
            !preg_match(self::UUID, $id) || !preg_match(self::UUID, $vehicleId) || $name === '' || $updatedAt <= 0
            || ($date !== null && (!is_string($date) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)))
        ) {
            return;
        }
        $odometer = self::optionalNumber($s['lastChangedOdometer'] ?? null, false);
        $intervalKm = self::optionalNumber($s['intervalKm'] ?? null, true);
        $intervalMonths = self::optionalNumber($s['intervalMonths'] ?? null, true);
        if ($odometer === false || $intervalKm === false || $intervalMonths === false) {
            return;
        }

        $owner = $db->prepare('SELECT user_id FROM vehicles WHERE id = ?');
        $owner->execute([$vehicleId]);
        $ownerId = $owner->fetchColumn();
        if ($ownerId === false || (int) $ownerId !== $userId) {
            return;
        }

        $notes = isset($s['notes']) ? trim((string) $s['notes']) : '';
        $deletedAt = isset($s['deletedAt']) ? (int) $s['deletedAt'] : null;
        $fields = [
            $vehicleId, $name, $date, $odometer, $intervalKm, $intervalMonths,
            $notes === '' ? null : $notes, $updatedAt, $deletedAt, $serverNow,
        ];

        $stmt = $db->prepare(
            'SELECT si.updated_at, v.user_id FROM service_items si JOIN vehicles v ON v.id = si.vehicle_id
             WHERE si.id = ? FOR UPDATE'
        );
        $stmt->execute([$id]);
        $existing = $stmt->fetch();

        if ($existing === false) {
            $db->prepare(
                'INSERT INTO service_items (vehicle_id, name, last_changed_date, last_changed_odometer, interval_km,
                    interval_months, notes, updated_at, deleted_at, synced_at, id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([...$fields, $id]);
            return;
        }

        if ((int) $existing['user_id'] !== $userId || $updatedAt <= (int) $existing['updated_at']) {
            return;
        }

        $db->prepare(
            'UPDATE service_items SET vehicle_id = ?, name = ?, last_changed_date = ?, last_changed_odometer = ?,
                interval_km = ?, interval_months = ?, notes = ?, updated_at = ?, deleted_at = ?, synced_at = ?
             WHERE id = ?'
        )->execute([...$fields, $id]);
    }

    /** null → null, non-negative number → value (int when $integer), anything else → false (invalid). */
    private static function optionalNumber(mixed $v, bool $integer): int|float|null|false
    {
        if ($v === null || $v === '') {
            return null;
        }
        if (!is_numeric($v) || (float) $v < 0) {
            return false;
        }
        return $integer ? (int) round((float) $v) : (float) $v;
    }

    /** Client ISO timestamp → UTC DATETIME string (falls back to now). */
    private static function toDateTime(mixed $iso): string
    {
        try {
            $dt = new DateTimeImmutable(is_string($iso) && $iso !== '' ? $iso : 'now');
        } catch (\Exception) {
            $dt = new DateTimeImmutable('now');
        }
        return $dt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    }

    private static function castVehicle(array $row): array
    {
        $row['createdAt'] = str_replace(' ', 'T', (string) $row['createdAt']) . 'Z';
        $row['updatedAt'] = (int) $row['updatedAt'];
        $row['deletedAt'] = $row['deletedAt'] === null ? null : (int) $row['deletedAt'];
        return $row;
    }

    private static function castEntry(array $row): array
    {
        $row['odometerReading'] = (float) $row['odometerReading'];
        $row['amountPaid'] = (float) $row['amountPaid'];
        $row['litresFilled'] = (float) $row['litresFilled'];
        $row['isFullTank'] = (bool) $row['isFullTank'];
        $row['missedPrevious'] = (bool) $row['missedPrevious'];
        $row['updatedAt'] = (int) $row['updatedAt'];
        $row['deletedAt'] = $row['deletedAt'] === null ? null : (int) $row['deletedAt'];
        return $row;
    }

    private static function castService(array $row): array
    {
        $row['lastChangedOdometer'] = $row['lastChangedOdometer'] === null ? null : (float) $row['lastChangedOdometer'];
        $row['intervalKm'] = $row['intervalKm'] === null ? null : (int) $row['intervalKm'];
        $row['intervalMonths'] = $row['intervalMonths'] === null ? null : (int) $row['intervalMonths'];
        $row['updatedAt'] = (int) $row['updatedAt'];
        $row['deletedAt'] = $row['deletedAt'] === null ? null : (int) $row['deletedAt'];
        return $row;
    }
}
