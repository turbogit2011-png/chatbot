<?php

namespace TurboSelectorPro\Shortcodes;

use TurboSelectorPro\Services\FitmentService;

if (! defined('ABSPATH')) {
    exit;
}

class ResultsShortcode
{
    private FitmentService $fitmentService;

    public function __construct(FitmentService $fitmentService)
    {
        $this->fitmentService = $fitmentService;
    }

    public function register(): void
    {
        add_shortcode('turbo_selector_results', [$this, 'render']);
    }

    public function render(): string
    {
        $criteria = [
            'make_id' => absint($_GET['make_id'] ?? 0),
            'model_id' => absint($_GET['model_id'] ?? 0),
            'generation_id' => absint($_GET['generation_id'] ?? 0),
            'engine_id' => absint($_GET['engine_id'] ?? 0),
            'year' => absint($_GET['year'] ?? 0),
            'engine_code' => sanitize_text_field(wp_unslash($_GET['engine_code'] ?? '')),
        ];

        $result = $this->fitmentService->find_matching_products($criteria);
        $result = apply_filters('tsp_results_item_data', $result, $criteria);

        ob_start();
        do_action('tsp_before_results', $criteria, $result);
        include TSP_PLUGIN_DIR . 'templates/results.php';
        do_action('tsp_after_results', $criteria, $result);

        return (string) ob_get_clean();
    }
}
