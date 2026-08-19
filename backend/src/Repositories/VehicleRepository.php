<?php

declare(strict_types=1);

namespace Combust\Repositories;

use Combust\Database;
use Combust\Support\Uuid;

final class VehicleRepository
{
    private const SELECT = 'SELECT id, name, plate, created_at AS createdAt FROM vehicles';

    public function allForUser(int $userId): array
    {
        $stmt = Database::connection()->prepare(self::SELECT . ' WHERE user_id = ? ORDER BY created_at ASC');
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    public function findForUser(string $id, int $userId): ?array
    {
        $stmt = Database::connection()->prepare(self::SELECT . ' WHERE id = ? AND user_id = ? LIMIT 1');
        $stmt->execute([$id, $userId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(int $userId, string $name, ?string $plate): array
    {
        $id = Uuid::v4();
        $stmt = Database::connection()->prepare(
            'INSERT INTO vehicles (id, user_id, name, plate) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([$id, $userId, $name, $plate]);

        /** @var array $vehicle */
        $vehicle = $this->findForUser($id, $userId);
        return $vehicle;
    }

    public function update(string $id, int $userId, string $name, ?string $plate): ?array
    {
        $stmt = Database::connection()->prepare(
            'UPDATE vehicles SET name = ?, plate = ? WHERE id = ? AND user_id = ?'
        );
        $stmt->execute([$name, $plate, $id, $userId]);

        return $this->findForUser($id, $userId);
    }

    public function delete(string $id, int $userId): bool
    {
        $stmt = Database::connection()->prepare('DELETE FROM vehicles WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $userId]);
        return $stmt->rowCount() > 0;
    }

    /** Deletes all of the user's vehicles; fuel_entries cascade-delete via the FK. */
    public function resetForUser(int $userId): void
    {
        $stmt = Database::connection()->prepare('DELETE FROM vehicles WHERE user_id = ?');
        $stmt->execute([$userId]);
    }
}
