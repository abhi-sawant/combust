<?php

declare(strict_types=1);

namespace Combust\Repositories;

use Combust\Database;

final class UserRepository
{
    public function findByEmail(string $email): ?array
    {
        $stmt = Database::connection()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    public function findById(int $id): ?array
    {
        $stmt = Database::connection()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    public function create(string $name, string $email, string $passwordHash): array
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO users (name, email, password_hash, email_verified_at) VALUES (?, ?, ?, NOW())'
        );
        $stmt->execute([$name, $email, $passwordHash]);

        /** @var array $user */
        $user = $this->findById((int) Database::connection()->lastInsertId());
        return $user;
    }

    public function updatePassword(int $id, string $passwordHash): void
    {
        $stmt = Database::connection()->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
        $stmt->execute([$passwordHash, $id]);
    }
}
