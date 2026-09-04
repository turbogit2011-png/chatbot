<?php

namespace TurboSelectorPro\Core;

if (! defined('ABSPATH')) {
    exit;
}

class Autoloader
{
    public static function register(): void
    {
        spl_autoload_register([self::class, 'autoload']);
    }

    public static function autoload(string $class): void
    {
        $prefix = 'TurboSelectorPro\\';

        if (strpos($class, $prefix) !== 0) {
            return;
        }

        $relative = str_replace('\\', '/', substr($class, strlen($prefix)));
        $file = TSP_PLUGIN_DIR . 'src/' . $relative . '.php';

        if (file_exists($file)) {
            require_once $file;
        }
    }
}
