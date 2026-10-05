<?php

declare(strict_types=1);

namespace Combust\Support;

use Combust\Config;

final class Cors
{
    /** Allows only configured frontend origins, and short-circuits preflight OPTIONS requests. */
    public static function handle(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        if ($origin !== '' && in_array($origin, self::allowedOrigins(), true)) {
            header("Access-Control-Allow-Origin: {$origin}");
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization');
            header('Access-Control-Max-Age: 86400');
        }
        header('Vary: Origin');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }

    /** FRONTEND_URL plus any comma-separated extras in CORS_ALLOWED_ORIGINS (e.g. a local dev server). */
    private static function allowedOrigins(): array
    {
        $origins = [Config::get('FRONTEND_URL', '')];
        foreach (explode(',', Config::get('CORS_ALLOWED_ORIGINS', '')) as $extra) {
            $origins[] = $extra;
        }

        return array_values(array_filter(array_map(
            fn (string $o) => rtrim(trim($o), '/'),
            $origins,
        )));
    }
}
