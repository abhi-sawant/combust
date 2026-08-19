<?php

declare(strict_types=1);

namespace Combust\Controllers;

use Combust\Auth\AuthMiddleware;
use Combust\Repositories\VehicleRepository;
use Combust\Support\Response;

final class AccountController
{
    public function resetData(): void
    {
        $userId = (int) AuthMiddleware::requireUser()['sub'];
        (new VehicleRepository())->resetForUser($userId);
        Response::json(['message' => 'All data cleared']);
    }
}
