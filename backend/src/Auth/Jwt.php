<?php

declare(strict_types=1);

namespace Combust\Auth;

use Combust\Config;
use RuntimeException;

/** Hand-rolled HS256 JWT encode/decode — no external library needed for this. */
final class Jwt
{
    /** @param array<string, mixed> $payload */
    public static function encode(array $payload, int $ttlSeconds): string
    {
        $header = ['typ' => 'JWT', 'alg' => 'HS256'];
        $now = time();
        $payload['iat'] = $now;
        $payload['exp'] = $now + $ttlSeconds;

        $segments = [
            self::base64UrlEncode((string) json_encode($header)),
            self::base64UrlEncode((string) json_encode($payload)),
        ];

        $signature = hash_hmac('sha256', implode('.', $segments), (string) Config::get('JWT_SECRET'), true);
        $segments[] = self::base64UrlEncode($signature);

        return implode('.', $segments);
    }

    /**
     * @return array<string, mixed>
     * @throws RuntimeException if the token is malformed, expired, or its signature doesn't match
     */
    public static function decode(string $token): array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new RuntimeException('Malformed token');
        }

        [$headerB64, $payloadB64, $signatureB64] = $parts;

        $expectedSignature = hash_hmac('sha256', "{$headerB64}.{$payloadB64}", (string) Config::get('JWT_SECRET'), true);
        if (!hash_equals($expectedSignature, self::base64UrlDecode($signatureB64))) {
            throw new RuntimeException('Invalid signature');
        }

        $payload = json_decode(self::base64UrlDecode($payloadB64), true);
        if (!is_array($payload)) {
            throw new RuntimeException('Invalid payload');
        }

        if (($payload['exp'] ?? 0) < time()) {
            throw new RuntimeException('Token expired');
        }

        return $payload;
    }

    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string
    {
        $padded = str_pad($data, strlen($data) % 4 === 0 ? strlen($data) : strlen($data) + 4 - strlen($data) % 4, '=');
        return (string) base64_decode(strtr($padded, '-_', '+/'));
    }
}
