<?php

namespace TurboSelectorPro\Core;

if (! defined('ABSPATH')) {
    exit;
}

class Settings
{
    public const OPTION_KEY = 'tsp_settings';

    public static function defaults(): array
    {
        return [
            'results_per_page' => 12,
            'default_view_mode' => 'grid',
            'show_result_counter' => 1,
            'enable_search_logs' => 1,
            'hide_out_of_stock' => 1,
            'only_published' => 1,
            'ai_endpoint' => '',
            'enable_cache' => 1,
            'cache_ttl' => 600,
            'ui_texts' => [
                'make' => __('Wybierz markę', 'turbo-selector-pro'),
                'model' => __('Wybierz model', 'turbo-selector-pro'),
                'generation' => __('Wybierz generację', 'turbo-selector-pro'),
                'year' => __('Wybierz rok', 'turbo-selector-pro'),
                'engine' => __('Wybierz silnik', 'turbo-selector-pro'),
                'power' => __('Wybierz moc', 'turbo-selector-pro'),
                'submit' => __('Pokaż pasujące turbosprężarki', 'turbo-selector-pro'),
                'no_results' => __('Brak wyników', 'turbo-selector-pro'),
            ],
        ];
    }

    public static function setDefaults(): void
    {
        if (! get_option(self::OPTION_KEY)) {
            add_option(self::OPTION_KEY, self::defaults());
        }
    }

    public static function get(string $key = null, $default = null)
    {
        $settings = wp_parse_args((array) get_option(self::OPTION_KEY, []), self::defaults());

        if ($key === null) {
            return $settings;
        }

        return $settings[$key] ?? $default;
    }

    public static function getUiTexts(): array
    {
        $settings = self::get();
        return (array) ($settings['ui_texts'] ?? []);
    }
}
