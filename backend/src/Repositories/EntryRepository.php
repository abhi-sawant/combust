<?php

declare(strict_types=1);

namespace Combust\Repositories;

use Combust\Database;
use Combust\Support\Uuid;

final class EntryRepository
{
    private const SELECT = 'SELECT id, vehicle_id AS vehicleId, date, odometer_reading AS odometerReading,
        fuel_station AS fuelStation, amount_paid AS amountPaid, litres_filled AS litresFilled
        FROM fuel_entries';

    public function allForVehicle(string $vehicleId): array
    {
        $stmt = Database::connection()->prepare(self::SELECT . ' WHERE vehicle_id = ? ORDER BY odometer_reading ASC');
        $stmt->execute([$vehicleId]);
        return array_map(self::castRow(...), $stmt->fetchAll());
    }

    public function find(string $id): ?array
    {
        $stmt = Database::connection()->prepare(self::SELECT . ' WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ? self::castRow($row) : null;
    }

    public function create(string $vehicleId, array $input): array
    {
        $id = Uuid::v4();
        $stmt = Database::connection()->prepare(
            'INSERT INTO fuel_entries (id, vehicle_id, date, odometer_reading, fuel_station, amount_paid, litres_filled)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $id,
            $vehicleId,
            $input['date'],
            $input['odometerReading'],
            $input['fuelStation'],
            $input['amountPaid'],
            $input['litresFilled'],
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
             SET date = ?, odometer_reading = ?, fuel_station = ?, amount_paid = ?, litres_filled = ?
             WHERE id = ? AND vehicle_id = ?'
        );
        $stmt->execute([
            $input['date'],
            $input['odometerReading'],
            $input['fuelStation'],
            $input['amountPaid'],
            $input['litresFilled'],
            $id,
            $vehicleId,
        ]);

        return $this->find($id);
    }

    /** Deletes an entry only if it belongs to one of this user's vehicles. */
    public function deleteForUser(string $id, int $userId): bool
    {
        $stmt = Database::connection()->prepare(
            'DELETE fe FROM fuel_entries fe
             JOIN vehicles v ON v.id = fe.vehicle_id
             WHERE fe.id = ? AND v.user_id = ?'
        );
        $stmt->execute([$id, $userId]);
        return $stmt->rowCount() > 0;
    }

    /** @return array<string, int> vehicleId => entry count */
    public function countsForUser(int $userId): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT v.id AS vehicleId, COUNT(fe.id) AS count
             FROM vehicles v
             LEFT JOIN fuel_entries fe ON fe.vehicle_id = v.id
             WHERE v.user_id = ?
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
        return $row;
    }
}
