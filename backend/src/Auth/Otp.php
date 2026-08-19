<?php

declare(strict_types=1);

namespace Combust\Auth;

use Combust\Config;

final class Otp
{
    public static function generate(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    /** Codes are stored hashed (with a server-side pepper) so a DB dump alone can't be replayed. */
    public static function hash(string $code): string
    {
        return hash_hmac('sha256', $code, (string) Config::get('JWT_SECRET'));
    }

    public static function verify(string $code, string $hash): bool
    {
        return hash_equals($hash, self::hash($code));
    }
}
