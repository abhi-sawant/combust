<?php

declare(strict_types=1);

namespace Combust\Support;

final class Request
{
    /** Parses the raw JSON request body. Returns an empty array for missing/invalid bodies. */
    public static function json(): array
    {
        $raw = file_get_contents('php://input');
        $data = json_decode((string) $raw, true);
        return is_array($data) ? $data : [];
    }

    public static function query(string $key, ?string $default = null): ?string
    {
        return isset($_GET[$key]) ? (string) $_GET[$key] : $default;
    }
}
