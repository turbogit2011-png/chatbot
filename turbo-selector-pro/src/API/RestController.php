<?php

namespace TurboSelectorPro\API;

use TurboSelectorPro\Repositories\VehicleRepository;
use TurboSelectorPro\Services\FitmentService;
use TurboSelectorPro\Utils\RateLimiter;
use WP_REST_Request;

if (! defined('ABSPATH')) {
    exit;
}

class RestController
{
    private VehicleRepository $vehicleRepository;
    private FitmentService $fitmentService;

    public function __construct(FitmentService $fitmentService)
    {
        $this->vehicleRepository = new VehicleRepository();
        $this->fitmentService = $fitmentService;
    }

    public function register(): void
    {
        add_action('rest_api_init', function () {
            register_rest_route('tsp/v1', '/makes', ['methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => [$this, 'makes']]);
            register_rest_route('tsp/v1', '/models/(?P<make_id>\d+)', ['methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => [$this, 'models']]);
            register_rest_route('tsp/v1', '/generations/(?P<model_id>\d+)', ['methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => [$this, 'generations']]);
            register_rest_route('tsp/v1', '/engines/(?P<generation_id>\d+)', ['methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => [$this, 'engines']]);
            register_rest_route('tsp/v1', '/search', ['methods' => 'POST', 'permission_callback' => [$this, 'verifyRequest'], 'callback' => [$this, 'search']]);
        });
    }

    public function verifyRequest(WP_REST_Request $request): bool
    {
        $nonce = $request->get_header('X-WP-Nonce');
        return wp_verify_nonce($nonce, 'wp_rest') === 1;
    }

    private function throttle(): bool
    {
        return RateLimiter::allow('public_' . wp_hash($_SERVER['REMOTE_ADDR'] ?? ''), 120, 60);
    }

    public function makes()
    {
        if (! $this->throttle()) {
            return $this->response([], false, __('Rate limit exceeded.', 'turbo-selector-pro'));
        }

        return $this->response($this->vehicleRepository->getMakes());
    }

    public function models(WP_REST_Request $request)
    {
        return $this->response($this->vehicleRepository->getModelsByMake(absint($request['make_id'])));
    }

    public function generations(WP_REST_Request $request)
    {
        return $this->response($this->vehicleRepository->getGenerationsByModel(absint($request['model_id'])));
    }

    public function engines(WP_REST_Request $request)
    {
        return $this->response($this->vehicleRepository->getEnginesByGeneration(absint($request['generation_id'])));
    }

    public function search(WP_REST_Request $request)
    {
        $criteria = (array) $request->get_json_params();
        $result = $this->fitmentService->find_matching_products($criteria);

        return $this->response($result);
    }

    private function response($data, bool $success = true, string $message = '')
    {
        return rest_ensure_response(['success' => $success, 'data' => $data, 'message' => $message]);
    }
}
