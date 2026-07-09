<?php

namespace TurboSelectorPro\Core;

use TurboSelectorPro\Database\Schema;

if (! defined('ABSPATH')) {
    exit;
}

class Migrator
{
    public static function maybeMigrate(): void
    {
        $installed = (string) get_option('tsp_plugin_version', '0.0.0');
        if (version_compare($installed, TSP_VERSION, '<')) {
            Schema::createTables();
            update_option('tsp_plugin_version', TSP_VERSION);
        }
    }
}
