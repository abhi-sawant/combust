<?php

declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');

// Tiny PSR-4-ish autoloader — maps the "Combust\" namespace onto ./src/,
// so no Composer/vendor folder is needed on shared hosting.
spl_autoload_register(function (string $class): void {
    $prefix = 'Combust\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }

    $relative = substr($class, strlen($prefix));
    $path = __DIR__ . '/src/' . str_replace('\\', '/', $relative) . '.php';

    if (is_file($path)) {
        require $path;
    }
});

use Combust\Controllers\AccountController;
use Combust\Controllers\AuthController;
use Combust\Controllers\EntriesController;
use Combust\Controllers\VehiclesController;
use Combust\Router;
use Combust\Support\Cors;
use Combust\Support\Response;

Cors::handle();

set_exception_handler(function (Throwable $e): void {
    error_log($e->getMessage() . "\n" . $e->getTraceAsString());
    Response::error('Server error', 500);
});

$router = new Router();

$router->post('/auth/signup/send-otp', [AuthController::class, 'signupSendOtp']);
$router->post('/auth/signup/verify', [AuthController::class, 'signupVerify']);
$router->post('/auth/login', [AuthController::class, 'login']);
$router->post('/auth/forgot-password/send-otp', [AuthController::class, 'forgotPasswordSendOtp']);
$router->post('/auth/forgot-password/reset', [AuthController::class, 'forgotPasswordReset']);
$router->get('/me', [AuthController::class, 'me']);

$router->get('/vehicles', [VehiclesController::class, 'index']);
$router->post('/vehicles', [VehiclesController::class, 'store']);
$router->put('/vehicles/{id}', [VehiclesController::class, 'update']);
$router->delete('/vehicles/{id}', [VehiclesController::class, 'destroy']);

// Registered before "/entries/{id}"-shaped routes so "bulk"/"counts" aren't captured as an id.
$router->post('/entries/bulk', [EntriesController::class, 'bulkStore']);
$router->get('/entries/counts', [EntriesController::class, 'counts']);
$router->get('/entries', [EntriesController::class, 'index']);
$router->post('/entries', [EntriesController::class, 'store']);
$router->put('/entries/{id}', [EntriesController::class, 'update']);
$router->delete('/entries/{id}', [EntriesController::class, 'destroy']);

$router->post('/account/reset-data', [AccountController::class, 'resetData']);

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
$router->dispatch($_SERVER['REQUEST_METHOD'], $path);
