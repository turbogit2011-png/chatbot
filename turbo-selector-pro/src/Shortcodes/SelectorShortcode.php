<?php

namespace TurboSelectorPro\Shortcodes;

if (! defined('ABSPATH')) {
    exit;
}

class SelectorShortcode
{
    public function register(): void
    {
        add_shortcode('turbo_selector', [$this, 'render']);
    }

    public function render(array $atts = []): string
    {
        $atts = shortcode_atts([
            'mode' => 'inline',
            'show_results' => 'true',
            'theme' => 'dark',
            'hide_labels' => 'false',
            'submit_text' => __('Pokaż pasujące turbosprężarki', 'turbo-selector-pro'),
        ], $atts, 'turbo_selector');

        wp_enqueue_style('tsp-frontend');
        wp_enqueue_script('tsp-frontend');

        $fields = apply_filters('tsp_selector_fields', ['make', 'model', 'generation', 'year', 'engine', 'power', 'engine_code']);

        ob_start();
        include TSP_PLUGIN_DIR . 'templates/selector.php';
        return (string) ob_get_clean();
    }
}
