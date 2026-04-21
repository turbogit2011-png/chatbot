<?php

namespace TurboSelectorPro\Utils;

if (! defined('ABSPATH')) {
    exit;
}

class RateLimiter
{
    public static function allow(string $key, int $limit = 60, int $window = 60): bool
    {
        $transientKey = 'tsp_rl_' . md5($key);
        $count = (int) get_transient($transientKey);

        if ($count >= $limit) {
            return false;
        }

        set_transient($transientKey, $count + 1, $window);
        return true;
    }
}
