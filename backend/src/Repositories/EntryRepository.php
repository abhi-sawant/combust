<?php

declare(strict_types=1);

namespace Combust\Repositories;

use Combust\Database;
use Combust\Support\Clock;
use Combust\Support\Uuid;

final class EntryRepository
{
    private const SELECT = 'SELECT id, vehicle_id AS vehicleId, date, odometer_reading AS odometerReading,
        fuel_station AS fuelStation, amount_paid AS amountPaid, litres_filled AS litresFilled,
        is_full_tank AS isFullTank, missed_previous AS missedPrevious
        FROM fuel_entries';

    public function allForVehicle(string $vehicleId): array
    {
        $stmt = Database::connection()->prepare(self::SELECT . ' WHERE vehicle_id = ? AND deleted_at IS NULL ORDER BY odometer_reading ASC');
        $stmt->execute([$vehicleId]);
        return array_map(self::castRow(...), $stmt->fetchAll());
    }

    public function find(string $id): ?array
    {
        $stmt = Database::connection()->prepare(self::SELECT . ' WHERE id = ? AND deleted_at IS NULL LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ? self::castRow($row) : null;
    }

    public function create(string $vehicleId, array $input): array
    {
        $id = Uuid::v4();
        $now = Clock::nowMs();
        $stmt = Database::connection()->prepare(
            'INSERT INTO fuel_entries
                (id, vehicle_id, date, odometer_reading, fuel_station, amount_paid, litres_filled, is_full_tank, missed_previous, updated_at, synced_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $id,
            $vehicleId,
            $input['date'],
            $input['odometerReading'],
            $input['fuelStation'],
            $input['amountPaid'],
            $input['litresFilled'],
            self::flag($input['isFullTank'] ?? true),
            self::flag($input['missedPrevious'] ?? false),
            $now,
            $now,
        ]);

        /** @var array $entry */
        $entry = $this->find($id);
        return $entry;
    }

    /** @param list<array> $entries */
    public function bulkCreate(string $vehicleId, array $entries): array
    {
        $db = Database::connection();
        $db->beginTransaction();

        $created = [];
        foreach ($entries as $input) {
            $created[] = $this->create($vehicleId, $input);
        }

        $db->commit();
        return $created;
    }

    public function updateForVehicle(string $id, string $vehicleId, array $input): ?array
    {
        $stmt = Database::connection()->prepare(
            'UPDATE fuel_entries
             SET date = ?, odometer_reading = ?, fuel_station = ?, amount_paid = ?, litres_filled = ?,
                 is_full_tank = COALESCE(?, is_full_tank), missed_previous = COALESCE(?, missed_previous),
                 updated_at = ?, synced_at = ?
             WHERE id = ? AND vehicle_id = ? AND deleted_at IS NULL'
        );
        $stmt->execute([
            $input['date'],
            $input['odometerReading'],
            $input['fuelStation'],
            $input['amountPaid'],
            $input['litresFilled'],
            isset($input['isFullTank']) ? self::flag($input['isFullTank']) : null,
            isset($input['missedPrevious']) ? self::flag($input['missedPrevious']) : null,
            Clock::nowMs(),
            Clock::nowMs(),
            $id,
            $vehicleId,
        ]);

        return $this->find($id);
    }

    /** Deletes an entry only if it belongs to one of this user's vehicles. */
    public function deleteForUser(string $id, int $userId): bool
    {
        $stmt = Database::connection()->prepare(
            'UPDATE fuel_entries fe
             JOIN vehicles v ON v.id = fe.vehicle_id
             SET fe.deleted_at = ?, fe.updated_at = ?, fe.synced_at = ?
             WHERE fe.id = ? AND v.user_id = ? AND fe.deleted_at IS NULL'
        );
        $now = Clock::nowMs();
        $stmt->execute([$now, $now, $now, $id, $userId]);
        return $stmt->rowCount() > 0;
    }

    /** @return array<string, int> vehicleId => entry count */
    public function countsForUser(int $userId): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT v.id AS vehicleId, COUNT(fe.id) AS count
             FROM vehicles v
             LEFT JOIN fuel_entries fe ON fe.vehicle_id = v.id AND fe.deleted_at IS NULL
             WHERE v.user_id = ? AND v.deleted_at IS NULL
             GROUP BY v.id'
        );
        $stmt->execute([$userId]);

        $counts = [];
        foreach ($stmt->fetchAll() as $row) {
            $counts[$row['vehicleId']] = (int) $row['count'];
        }
        return $counts;
    }

    private static function castRow(array $row): array
    {
        $row['odometerReading'] = (float) $row['odometerReading'];
        $row['amountPaid'] = (float) $row['amountPaid'];
        $row['litresFilled'] = (float) $row['litresFilled'];
        $row['isFullTank'] = (bool) $row['isFullTank'];
        $row['missedPrevious'] = (bool) $row['missedPrevious'];
        return $row;
    }

    private static function flag(mixed $value): int
    {
        return filter_var($value, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
    }
}
