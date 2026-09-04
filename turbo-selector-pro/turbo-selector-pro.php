<?php
/**
 * Plugin Name: Turbo Selector Pro
 * Description: Profesjonalny selektor doboru turbosprężarek dla WooCommerce z własną bazą dopasowań pojazdów.
 * Version: 1.0.0
 * Requires at least: 6.4
 * Requires PHP: 8.0
 * Author: Turbo Selector Team
 * Text Domain: turbo-selector-pro
 * Domain Path: /languages
 */

if (! defined('ABSPATH')) {
    exit;
}

define('TSP_VERSION', '1.0.0');
define('TSP_PLUGIN_FILE', __FILE__);
define('TSP_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('TSP_PLUGIN_URL', plugin_dir_url(__FILE__));

require_once TSP_PLUGIN_DIR . 'src/Core/Autoloader.php';

TurboSelectorPro\Core\Autoloader::register();

register_activation_hook(TSP_PLUGIN_FILE, ['TurboSelectorPro\\Core\\Activator', 'activate']);
register_deactivation_hook(TSP_PLUGIN_FILE, ['TurboSelectorPro\\Core\\Activator', 'deactivate']);

add_action('plugins_loaded', static function () {
    load_plugin_textdomain('turbo-selector-pro', false, dirname(plugin_basename(TSP_PLUGIN_FILE)) . '/languages');

    $plugin = new TurboSelectorPro\Core\Plugin();
    $plugin->boot();
});
