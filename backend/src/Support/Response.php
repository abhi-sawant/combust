<?php

declare(strict_types=1);

namespace Combust\Support;

final class Response
{
    /** Sends the JSON response and halts the script — controllers never need to `return` after calling this. */
    public static function json(mixed $data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }

    /** @param array<string, string> $details */
    public static function error(string $message, int $status = 400, array $details = []): never
    {
        self::json(['error' => $message, 'details' => $details], $status);
    }
}
