<?php

declare(strict_types=1);

namespace Combust\Repositories;

use Combust\Database;
use Combust\Support\Clock;
use Combust\Support\Uuid;

final class VehicleRepository
{
    private const SELECT = 'SELECT id, name, plate, created_at AS createdAt FROM vehicles';
    private const LIVE = ' deleted_at IS NULL';

    public function allForUser(int $userId): array
    {
        $stmt = Database::connection()->prepare(self::SELECT . ' WHERE user_id = ? AND' . self::LIVE . ' ORDER BY created_at ASC');
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    public function findForUser(string $id, int $userId): ?array
    {
        $stmt = Database::connection()->prepare(self::SELECT . ' WHERE id = ? AND user_id = ? AND' . self::LIVE . ' LIMIT 1');
        $stmt->execute([$id, $userId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(int $userId, string $name, ?string $plate): array
    {
        $id = Uuid::v4();
        $stmt = Database::connection()->prepare(
            'INSERT INTO vehicles (id, user_id, name, plate, updated_at, synced_at) VALUES (?, ?, ?, ?, ?, ?)'
        );
        $now = Clock::nowMs();
        $stmt->execute([$id, $userId, $name, $plate, $now, $now]);

        /** @var array $vehicle */
        $vehicle = $this->findForUser($id, $userId);
        return $vehicle;
    }

    public function update(string $id, int $userId, string $name, ?string $plate): ?array
    {
        $stmt = Database::connection()->prepare(
            'UPDATE vehicles SET name = ?, plate = ?, updated_at = ?, synced_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
        );
        $now = Clock::nowMs();
        $stmt->execute([$name, $plate, $now, $now, $id, $userId]);

        return $this->findForUser($id, $userId);
    }

    public function delete(string $id, int $userId): bool
    {
        $stmt = Database::connection()->prepare('UPDATE vehicles SET deleted_at = ?, updated_at = ?, synced_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL');
        $now = Clock::nowMs();
        $stmt->execute([$now, $now, $now, $id, $userId]);
        $this->tombstoneEntries($userId, $now, $id);
        return $stmt->rowCount() > 0;
    }

    /** Tombstones all of the user's vehicles and entries so other devices learn of the reset on their next sync. */
    public function resetForUser(int $userId): void
    {
        $now = Clock::nowMs();
        $this->tombstoneEntries($userId, $now);
        $stmt = Database::connection()->prepare(
            'UPDATE vehicles SET deleted_at = ?, updated_at = ?, synced_at = ? WHERE user_id = ? AND deleted_at IS NULL'
        );
        $stmt->execute([$now, $now, $now, $userId]);
    }

    private function tombstoneEntries(int $userId, int $now, ?string $vehicleId = null): void
    {
        $sql = 'UPDATE fuel_entries fe JOIN vehicles v ON v.id = fe.vehicle_id
                SET fe.deleted_at = ?, fe.updated_at = ?, fe.synced_at = ?
                WHERE v.user_id = ? AND fe.deleted_at IS NULL';
        $params = [$now, $now, $now, $userId];
        if ($vehicleId !== null) {
            $sql .= ' AND v.id = ?';
            $params[] = $vehicleId;
        }
        Database::connection()->prepare($sql)->execute($params);
    }
}
