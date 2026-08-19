<?php

declare(strict_types=1);

namespace Combust\Support;

final class Validator
{
    /**
     * @param array<string, mixed> $data
     * @param list<string> $fields
     * @return array<string, string> field => error message, empty if all present
     */
    public static function requireFields(array $data, array $fields): array
    {
        $errors = [];

        foreach ($fields as $field) {
            if (!isset($data[$field]) || $data[$field] === '') {
                $errors[$field] = "{$field} is required";
            }
        }

        return $errors;
    }

    public static function isEmail(string $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_EMAIL) !== false;
    }
}
