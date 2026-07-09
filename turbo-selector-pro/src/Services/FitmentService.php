<?php

namespace TurboSelectorPro\Services;

use TurboSelectorPro\Core\Settings;
use TurboSelectorPro\Repositories\FitmentRepository;

if (! defined('ABSPATH')) {
    exit;
}

class FitmentService
{
    private FitmentRepository $fitmentRepository;
    private ConfidenceService $confidenceService;
    private CacheService $cacheService;

    public function __construct(?CacheService $cacheService = null)
    {
        $this->fitmentRepository = new FitmentRepository();
        $this->confidenceService = new ConfidenceService();
        $this->cacheService = $cacheService ?: new CacheService();
    }

    public function find_matching_products(array $criteria): array
    {
        $criteria = $this->sanitizeCriteria($criteria);
        $cacheKey = 'matching_' . wp_json_encode($criteria);
        $cached = $this->cacheService->get($cacheKey);

        if ($cached !== false) {
            return $cached;
        }

        $fitments = $this->fitmentRepository->findFitments($criteria);
        $products = [];
        $missingData = $this->missingData($criteria);

        foreach ($fitments as $fitment) {
            $product = wc_get_product(absint($fitment['product_id']));
            if (! $product) {
                continue;
            }

            if (Settings::get('only_published', 1) && get_post_status($product->get_id()) !== 'publish') {
                continue;
            }

            if (Settings::get('hide_out_of_stock', 1) && ! $product->is_in_stock()) {
                continue;
            }

            $score = $this->confidenceService->score($criteria, $fitment);
            $products[] = [
                'product_id' => $product->get_id(),
                'name' => $product->get_name(),
                'price_html' => $product->get_price_html(),
                'permalink' => get_permalink($product->get_id()),
                'image' => wp_get_attachment_image_url($product->get_image_id(), 'woocommerce_thumbnail'),
                'stock' => $product->get_stock_status(),
                'oem_number' => $fitment['oem_number'],
                'turbo_number' => $fitment['turbo_number'],
                'is_primary' => (bool) $fitment['is_primary'],
                'confidence' => $score,
                'justification' => $this->confidenceService->rationale($score),
                'requires_verification' => $score < 95,
            ];
        }

        usort($products, static fn($a, $b) => $b['confidence'] <=> $a['confidence']);

        $result = [
            'products' => $products,
            'count' => count($products),
            'missing_data' => $missingData,
        ];

        if (Settings::get('enable_search_logs', 1)) {
            $this->fitmentRepository->logSearch([
                'session_id' => wp_get_session_token() ?: wp_generate_uuid4(),
                'make_id' => $criteria['make_id'] ?? 0,
                'model_id' => $criteria['model_id'] ?? 0,
                'generation_id' => $criteria['generation_id'] ?? 0,
                'engine_id' => $criteria['engine_id'] ?? 0,
                'product_count' => $result['count'],
                'user_ip_hash' => wp_hash($_SERVER['REMOTE_ADDR'] ?? ''),
                'user_agent_hash' => wp_hash($_SERVER['HTTP_USER_AGENT'] ?? ''),
            ]);
        }

        $this->cacheService->set($cacheKey, $result);

        return $result;
    }

    private function sanitizeCriteria(array $criteria): array
    {
        return [
            'make_id' => absint($criteria['make_id'] ?? 0),
            'model_id' => absint($criteria['model_id'] ?? 0),
            'generation_id' => absint($criteria['generation_id'] ?? 0),
            'engine_id' => absint($criteria['engine_id'] ?? 0),
            'year' => absint($criteria['year'] ?? 0),
            'power' => sanitize_text_field($criteria['power'] ?? ''),
            'engine_code' => sanitize_text_field($criteria['engine_code'] ?? ''),
            'oem_number' => sanitize_text_field($criteria['oem_number'] ?? ''),
            'turbo_number' => sanitize_text_field($criteria['turbo_number'] ?? ''),
        ];
    }

    private function missingData(array $criteria): array
    {
        $required = ['make_id', 'model_id', 'generation_id', 'engine_id'];
        $missing = [];
        foreach ($required as $field) {
            if (empty($criteria[$field])) {
                $missing[] = $field;
            }
        }

        return $missing;
    }
}
