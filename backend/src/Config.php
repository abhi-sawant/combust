<?php

declare(strict_types=1);

namespace Combust;

/** Loads key=value pairs from backend/.env — no library needed for such a small format. */
final class Config
{
    private static ?array $values = null;

    public static function get(string $key, ?string $default = null): ?string
    {
        self::load();
        return self::$values[$key] ?? $default;
    }

    private static function load(): void
    {
        if (self::$values !== null) {
            return;
        }

        self::$values = [];
        $path = __DIR__ . '/../.env';

        if (!is_file($path)) {
            return;
        }

        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            [$key, $value] = array_pad(explode('=', $line, 2), 2, '');
            self::$values[trim($key)] = trim($value);
        }
    }
}
