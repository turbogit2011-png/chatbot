<?php

namespace TurboSelectorPro\Services;

use TurboSelectorPro\Core\Settings;

if (! defined('ABSPATH')) {
    exit;
}

class CacheService
{
    public function get(string $key)
    {
        if (! Settings::get('enable_cache', 1)) {
            return false;
        }

        return get_transient('tsp_' . md5($key));
    }

    public function set(string $key, $value): void
    {
        if (! Settings::get('enable_cache', 1)) {
            return;
        }

        set_transient('tsp_' . md5($key), $value, absint(Settings::get('cache_ttl', 600)));
    }
}
