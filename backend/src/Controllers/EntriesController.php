<?php

declare(strict_types=1);

namespace Combust\Controllers;

use Combust\Auth\AuthMiddleware;
use Combust\Repositories\EntryRepository;
use Combust\Repositories\VehicleRepository;
use Combust\Support\Request;
use Combust\Support\Response;
use Combust\Support\Validator;

final class EntriesController
{
    private const REQUIRED_FIELDS = ['date', 'odometerReading', 'fuelStation', 'amountPaid', 'litresFilled'];

    private EntryRepository $entries;
    private VehicleRepository $vehicles;

    public function __construct()
    {
        $this->entries = new EntryRepository();
        $this->vehicles = new VehicleRepository();
    }

    public function index(): void
    {
        $userId = (int) AuthMiddleware::requireUser()['sub'];
        $vehicleId = $this->ownedVehicleId($userId);

        Response::json($this->entries->allForVehicle($vehicleId));
    }

    public function store(): void
    {
        $userId = (int) AuthMiddleware::requireUser()['sub'];
        $vehicleId = $this->ownedVehicleId($userId);
        $data = Request::json();

        $errors = Validator::requireFields($data, self::REQUIRED_FIELDS);
        if ($errors) {
            Response::error('Validation failed', 422, $errors);
        }

        Response::json($this->entries->create($vehicleId, $data), 201);
    }

    public function bulkStore(): void
    {
        $userId = (int) AuthMiddleware::requireUser()['sub'];
        $vehicleId = $this->ownedVehicleId($userId);
        $data = Request::json();

        if (!isset($data['entries']) || !is_array($data['entries'])) {
            Response::error('entries must be an array', 422);
        }

        foreach ($data['entries'] as $entry) {
            $errors = Validator::requireFields($entry, self::REQUIRED_FIELDS);
            if ($errors) {
                Response::error('Validation failed', 422, $errors);
            }
        }

        Response::json($this->entries->bulkCreate($vehicleId, $data['entries']), 201);
    }

    public function update(array $params): void
    {
        $userId = (int) AuthMiddleware::requireUser()['sub'];
        $vehicleId = $this->ownedVehicleId($userId);
        $data = Request::json();

        $errors = Validator::requireFields($data, self::REQUIRED_FIELDS);
        if ($errors) {
            Response::error('Validation failed', 422, $errors);
        }

        $entry = $this->entries->updateForVehicle($params['id'], $vehicleId, $data);
        if (!$entry) {
            Response::error('Entry not found', 404);
        }

        Response::json($entry);
    }

    public function destroy(array $params): void
    {
        $userId = (int) AuthMiddleware::requireUser()['sub'];

        if (!$this->entries->deleteForUser($params['id'], $userId)) {
            Response::error('Entry not found', 404);
        }

        Response::json(['message' => 'Deleted']);
    }

    public function counts(): void
    {
        $userId = (int) AuthMiddleware::requireUser()['sub'];
        Response::json($this->entries->countsForUser($userId));
    }

    /** Reads ?vehicleId= from the query string and confirms it belongs to the current user. */
    private function ownedVehicleId(int $userId): string
    {
        $vehicleId = Request::query('vehicleId');
        if (!$vehicleId) {
            Response::error('vehicleId is required', 422);
        }

        if (!$this->vehicles->findForUser($vehicleId, $userId)) {
            Response::error('Vehicle not found', 404);
        }

        return $vehicleId;
    }
}
