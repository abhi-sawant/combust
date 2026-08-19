<?php

declare(strict_types=1);

namespace Combust\Repositories;

use Combust\Database;

final class OtpRepository
{
    public function create(string $email, string $codeHash, string $purpose, int $ttlMinutes = 10): void
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO otp_codes (email, code_hash, purpose, expires_at)
             VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))'
        );
        $stmt->execute([$email, $codeHash, $purpose, $ttlMinutes]);
    }

    /** Latest not-yet-consumed, not-yet-expired code for this email+purpose, if any. */
    public function findLatestValid(string $email, string $purpose): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT * FROM otp_codes
             WHERE email = ? AND purpose = ? AND consumed_at IS NULL AND expires_at > NOW()
             ORDER BY created_at DESC LIMIT 1'
        );
        $stmt->execute([$email, $purpose]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function markConsumed(int $id): void
    {
        $stmt = Database::connection()->prepare('UPDATE otp_codes SET consumed_at = NOW() WHERE id = ?');
        $stmt->execute([$id]);
    }
}
