<?php

declare(strict_types=1);

namespace Combust\Auth;

use Combust\Support\Response;
use Throwable;

final class AuthMiddleware
{
    /**
     * Verifies the "Authorization: Bearer <token>" header and returns the token payload
     * (contains "sub", the user id). Halts the request with 401 if missing/invalid/expired.
     *
     * @return array<string, mixed>
     */
    public static function requireUser(): array
    {
        $header = self::authorizationHeader();

        if (!preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
            Response::error('Unauthorized', 401);
        }

        try {
            return Jwt::decode($matches[1]);
        } catch (Throwable) {
            Response::error('Unauthorized', 401);
        }
    }

    private static function authorizationHeader(): string
    {
        if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
            return (string) $_SERVER['HTTP_AUTHORIZATION'];
        }

        // Some Apache/cPanel setups strip the Authorization header before it reaches PHP;
        // the .htaccess rewrite rule re-exposes it via getallheaders() as a fallback.
        if (function_exists('getallheaders')) {
            foreach (getallheaders() as $name => $value) {
                if (strcasecmp($name, 'Authorization') === 0) {
                    return $value;
                }
            }
        }

        return '';
    }
}
