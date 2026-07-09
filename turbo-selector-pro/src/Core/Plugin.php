<?php

namespace TurboSelectorPro\Core;

use TurboSelectorPro\Admin\AdminMenu;
use TurboSelectorPro\API\RestController;
use TurboSelectorPro\Integrations\WooCommerceIntegration;
use TurboSelectorPro\Shortcodes\ResultsShortcode;
use TurboSelectorPro\Shortcodes\SelectorShortcode;
use TurboSelectorPro\Services\CacheService;
use TurboSelectorPro\Services\FitmentService;

if (! defined('ABSPATH')) {
    exit;
}

class Plugin
{
    public function boot(): void
    {
        Migrator::maybeMigrate();

        $cacheService = new CacheService();
        $fitmentService = new FitmentService($cacheService);

        (new AdminMenu($fitmentService))->register();
        (new RestController($fitmentService))->register();
        (new SelectorShortcode())->register();
        (new ResultsShortcode($fitmentService))->register();
        (new WooCommerceIntegration())->register();

        add_action('wp_enqueue_scripts', [$this, 'registerAssets']);
        add_action('admin_enqueue_scripts', [$this, 'registerAdminAssets']);
    }

    public function registerAssets(): void
    {
        wp_register_style('tsp-frontend', TSP_PLUGIN_URL . 'assets/css/frontend.css', [], TSP_VERSION);
        wp_register_script('tsp-frontend', TSP_PLUGIN_URL . 'assets/js/frontend.js', ['jquery'], TSP_VERSION, true);

        wp_localize_script('tsp-frontend', 'tspConfig', [
            'endpoint' => esc_url_raw(rest_url('tsp/v1')),
            'nonce' => wp_create_nonce('wp_rest'),
            'placeholders' => Settings::getUiTexts(),
        ]);
    }

    public function registerAdminAssets(): void
    {
        wp_register_style('tsp-admin', TSP_PLUGIN_URL . 'assets/css/admin.css', [], TSP_VERSION);
        wp_register_script('tsp-admin', TSP_PLUGIN_URL . 'assets/js/admin.js', ['jquery'], TSP_VERSION, true);
    }
}
