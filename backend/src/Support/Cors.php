<?php

declare(strict_types=1);

namespace Combust\Support;

use Combust\Config;

final class Cors
{
    /** Allows only the configured frontend origin, and short-circuits preflight OPTIONS requests. */
    public static function handle(): void
    {
        $allowedOrigin = Config::get('FRONTEND_URL', '*');

        header("Access-Control-Allow-Origin: {$allowedOrigin}");
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Max-Age: 86400');
        header('Vary: Origin');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
