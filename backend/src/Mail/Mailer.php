<?php

declare(strict_types=1);

namespace Combust\Mail;

use Combust\Config;

/** Wraps PHP's built-in mail() — works out of the box on cPanel shared hosting. */
final class Mailer
{
    public static function sendOtp(string $to, string $code, string $purpose): bool
    {
        $subject = $purpose === 'signup'
            ? 'Verify your Combust account'
            : 'Reset your Combust password';

        $body = "Your Combust verification code is: {$code}\n\n"
            . "This code expires in 10 minutes. If you didn't request this, you can ignore this email.";

        return self::send($to, $subject, $body);
    }

    private static function send(string $to, string $subject, string $body): bool
    {
        $fromName = Config::get('MAIL_FROM_NAME', 'Combust');
        $fromEmail = Config::get('MAIL_FROM', 'noreply@example.com');

        $headers = "From: {$fromName} <{$fromEmail}>\r\n"
            . "Content-Type: text/plain; charset=UTF-8\r\n";

        return mail($to, $subject, $body, $headers);
    }
}
