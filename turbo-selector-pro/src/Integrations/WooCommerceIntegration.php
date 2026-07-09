<?php

namespace TurboSelectorPro\Integrations;

if (! defined('ABSPATH')) {
    exit;
}

class WooCommerceIntegration
{
    public function register(): void
    {
        add_filter('query_vars', [$this, 'queryVars']);
        add_action('wp_head', [$this, 'canonical']);
    }

    public function queryVars(array $vars): array
    {
        return array_merge($vars, ['make', 'model', 'generation', 'engine']);
    }

    public function canonical(): void
    {
        if (! is_page() || empty($_GET['make'])) {
            return;
        }

        $url = remove_query_arg(['paged', 'orderby']);
        echo '<link rel="canonical" href="' . esc_url($url) . '" />' . "\n";
    }
}
