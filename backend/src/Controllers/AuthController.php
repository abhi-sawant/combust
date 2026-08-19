<?php

declare(strict_types=1);

namespace Combust\Controllers;

use Combust\Auth\AuthMiddleware;
use Combust\Auth\Jwt;
use Combust\Auth\Otp;
use Combust\Config;
use Combust\Mail\Mailer;
use Combust\Repositories\OtpRepository;
use Combust\Repositories\UserRepository;
use Combust\Support\Request;
use Combust\Support\Response;
use Combust\Support\Validator;

final class AuthController
{
    private UserRepository $users;
    private OtpRepository $otps;

    public function __construct()
    {
        $this->users = new UserRepository();
        $this->otps = new OtpRepository();
    }

    public function signupSendOtp(): void
    {
        $data = Request::json();
        $errors = Validator::requireFields($data, ['email']);
        if ($errors) {
            Response::error('Validation failed', 422, $errors);
        }

        $email = strtolower(trim((string) $data['email']));
        if (!Validator::isEmail($email)) {
            Response::error('Enter a valid email', 422);
        }

        if ($this->users->findByEmail($email)) {
            Response::error('An account with this email already exists', 409);
        }

        $code = Otp::generate();
        $this->otps->create($email, Otp::hash($code), 'signup');
        Mailer::sendOtp($email, $code, 'signup');

        Response::json(['message' => 'OTP sent']);
    }

    public function signupVerify(): void
    {
        $data = Request::json();
        $errors = Validator::requireFields($data, ['name', 'email', 'password', 'otp']);
        if ($errors) {
            Response::error('Validation failed', 422, $errors);
        }

        $email = strtolower(trim((string) $data['email']));
        $name = trim((string) $data['name']);
        $password = (string) $data['password'];
        $otp = trim((string) $data['otp']);

        if (!Validator::isEmail($email)) {
            Response::error('Enter a valid email', 422);
        }
        if (strlen($password) < 8) {
            Response::error('Password must be at least 8 characters', 422);
        }

        $record = $this->otps->findLatestValid($email, 'signup');
        if (!$record || !Otp::verify($otp, $record['code_hash'])) {
            Response::error('Invalid or expired code', 422);
        }

        if ($this->users->findByEmail($email)) {
            Response::error('An account with this email already exists', 409);
        }

        $user = $this->users->create($name, $email, password_hash($password, PASSWORD_DEFAULT));
        $this->otps->markConsumed((int) $record['id']);

        $this->respondWithToken($user);
    }

    public function login(): void
    {
        $data = Request::json();
        $errors = Validator::requireFields($data, ['email', 'password']);
        if ($errors) {
            Response::error('Validation failed', 422, $errors);
        }

        $email = strtolower(trim((string) $data['email']));
        $user = $this->users->findByEmail($email);

        if (!$user || !password_verify((string) $data['password'], $user['password_hash'])) {
            Response::error('Invalid email or password', 401);
        }

        $this->respondWithToken($user);
    }

    public function forgotPasswordSendOtp(): void
    {
        $data = Request::json();
        $errors = Validator::requireFields($data, ['email']);
        if ($errors) {
            Response::error('Validation failed', 422, $errors);
        }

        $email = strtolower(trim((string) $data['email']));
        $user = $this->users->findByEmail($email);

        // Always respond the same way whether or not the account exists, so the
        // response can't be used to enumerate which emails are registered.
        if ($user) {
            $code = Otp::generate();
            $this->otps->create($email, Otp::hash($code), 'password_reset');
            Mailer::sendOtp($email, $code, 'password_reset');
        }

        Response::json(['message' => 'If that email exists, a code has been sent']);
    }

    public function forgotPasswordReset(): void
    {
        $data = Request::json();
        $errors = Validator::requireFields($data, ['email', 'otp', 'newPassword']);
        if ($errors) {
            Response::error('Validation failed', 422, $errors);
        }

        $email = strtolower(trim((string) $data['email']));
        $otp = trim((string) $data['otp']);
        $newPassword = (string) $data['newPassword'];

        if (strlen($newPassword) < 8) {
            Response::error('Password must be at least 8 characters', 422);
        }

        $record = $this->otps->findLatestValid($email, 'password_reset');
        $user = $this->users->findByEmail($email);

        if (!$record || !$user || !Otp::verify($otp, $record['code_hash'])) {
            Response::error('Invalid or expired code', 422);
        }

        $this->users->updatePassword((int) $user['id'], password_hash($newPassword, PASSWORD_DEFAULT));
        $this->otps->markConsumed((int) $record['id']);

        Response::json(['message' => 'Password updated']);
    }

    public function me(): void
    {
        $payload = AuthMiddleware::requireUser();
        $user = $this->users->findById((int) $payload['sub']);

        if (!$user) {
            Response::error('Unauthorized', 401);
        }

        Response::json(['user' => self::publicUser($user)]);
    }

    private function respondWithToken(array $user): void
    {
        $ttlDays = (int) Config::get('JWT_TTL_DAYS', '30');
        $token = Jwt::encode(['sub' => (int) $user['id']], 60 * 60 * 24 * $ttlDays);

        Response::json(['token' => $token, 'user' => self::publicUser($user)]);
    }

    private static function publicUser(array $user): array
    {
        return ['id' => (int) $user['id'], 'name' => $user['name'], 'email' => $user['email']];
    }
}
