<?php

namespace TurboSelectorPro\Repositories;

use TurboSelectorPro\Database\Schema;

if (! defined('ABSPATH')) {
    exit;
}

class VehicleRepository
{
    public function getMakes(): array
    {
        global $wpdb;
        $sql = 'SELECT * FROM ' . Schema::table('vehicle_makes') . ' WHERE is_active = 1 ORDER BY sort_order ASC, name ASC';
        return (array) $wpdb->get_results($sql, ARRAY_A);
    }

    public function getModelsByMake(int $makeId): array
    {
        global $wpdb;
        $sql = $wpdb->prepare('SELECT * FROM ' . Schema::table('vehicle_models') . ' WHERE is_active = 1 AND make_id = %d ORDER BY sort_order ASC, name ASC', $makeId);
        return (array) $wpdb->get_results($sql, ARRAY_A);
    }

    public function getGenerationsByModel(int $modelId): array
    {
        global $wpdb;
        $sql = $wpdb->prepare('SELECT * FROM ' . Schema::table('vehicle_generations') . ' WHERE is_active = 1 AND model_id = %d ORDER BY year_from DESC, name ASC', $modelId);
        return (array) $wpdb->get_results($sql, ARRAY_A);
    }

    public function getEnginesByGeneration(int $generationId): array
    {
        global $wpdb;
        $sql = $wpdb->prepare('SELECT * FROM ' . Schema::table('vehicle_engines') . ' WHERE is_active = 1 AND generation_id = %d ORDER BY power_hp DESC, engine_label ASC', $generationId);
        return (array) $wpdb->get_results($sql, ARRAY_A);
    }
}
