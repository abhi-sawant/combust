<?php

declare(strict_types=1);

namespace Combust\Controllers;

use Combust\Auth\AuthMiddleware;
use Combust\Repositories\VehicleRepository;
use Combust\Support\Request;
use Combust\Support\Response;
use Combust\Support\Validator;

final class VehiclesController
{
    private VehicleRepository $vehicles;

    public function __construct()
    {
        $this->vehicles = new VehicleRepository();
    }

    public function index(): void
    {
        $userId = (int) AuthMiddleware::requireUser()['sub'];
        Response::json($this->vehicles->allForUser($userId));
    }

    public function store(): void
    {
        $userId = (int) AuthMiddleware::requireUser()['sub'];
        $data = Request::json();

        $errors = Validator::requireFields($data, ['name']);
        if ($errors) {
            Response::error('Validation failed', 422, $errors);
        }

        $vehicle = $this->vehicles->create($userId, trim((string) $data['name']), self::plate($data));
        Response::json($vehicle, 201);
    }

    public function update(array $params): void
    {
        $userId = (int) AuthMiddleware::requireUser()['sub'];
        $data = Request::json();

        $errors = Validator::requireFields($data, ['name']);
        if ($errors) {
            Response::error('Validation failed', 422, $errors);
        }

        if (!$this->vehicles->findForUser($params['id'], $userId)) {
            Response::error('Vehicle not found', 404);
        }

        $vehicle = $this->vehicles->update($params['id'], $userId, trim((string) $data['name']), self::plate($data));
        Response::json($vehicle);
    }

    public function destroy(array $params): void
    {
        $userId = (int) AuthMiddleware::requireUser()['sub'];

        if (!$this->vehicles->delete($params['id'], $userId)) {
            Response::error('Vehicle not found', 404);
        }

        Response::json(['message' => 'Deleted']);
    }

    private static function plate(array $data): ?string
    {
        $plate = trim((string) ($data['plate'] ?? ''));
        return $plate === '' ? null : $plate;
    }
}
