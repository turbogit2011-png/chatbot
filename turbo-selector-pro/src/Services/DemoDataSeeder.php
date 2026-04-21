<?php

namespace TurboSelectorPro\Services;

use TurboSelectorPro\Database\Schema;

if (! defined('ABSPATH')) {
    exit;
}

class DemoDataSeeder
{
    public function seed(): void
    {
        global $wpdb;

        $now = current_time('mysql');
        $wpdb->insert(Schema::table('vehicle_makes'), ['name' => 'Audi', 'slug' => 'audi', 'sort_order' => 1, 'is_active' => 1, 'created_at' => $now, 'updated_at' => $now]);
        $makeId = (int) $wpdb->insert_id;
        $wpdb->insert(Schema::table('vehicle_models'), ['make_id' => $makeId, 'name' => 'A4', 'slug' => 'a4', 'sort_order' => 1, 'is_active' => 1, 'created_at' => $now, 'updated_at' => $now]);
        $modelId = (int) $wpdb->insert_id;
        $wpdb->insert(Schema::table('vehicle_generations'), ['model_id' => $modelId, 'name' => 'B8', 'slug' => 'b8', 'platform_code' => '8K', 'body_type' => 'Sedan', 'year_from' => 2008, 'year_to' => 2015, 'is_active' => 1, 'created_at' => $now, 'updated_at' => $now]);
        $genId = (int) $wpdb->insert_id;
        $wpdb->insert(Schema::table('vehicle_engines'), ['generation_id' => $genId, 'engine_label' => '2.0 TDI', 'displacement' => '1968', 'fuel_type' => 'Diesel', 'engine_type' => 'R4', 'power_hp' => 143, 'power_kw' => 105, 'engine_code' => 'CAGA', 'year_from' => 2008, 'year_to' => 2012, 'is_active' => 1, 'created_at' => $now, 'updated_at' => $now]);
    }
}
