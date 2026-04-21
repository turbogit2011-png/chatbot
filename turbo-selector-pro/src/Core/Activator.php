<?php

namespace TurboSelectorPro\Core;

use TurboSelectorPro\Database\Schema;

if (! defined('ABSPATH')) {
    exit;
}

class Activator
{
    public static function activate(): void
    {
        Schema::createTables();
        Settings::setDefaults();
        update_option('tsp_plugin_version', TSP_VERSION);
        flush_rewrite_rules();
    }

    public static function deactivate(): void
    {
        flush_rewrite_rules();
    }
}
