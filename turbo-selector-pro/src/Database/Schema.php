<?php

namespace TurboSelectorPro\Database;

if (! defined('ABSPATH')) {
    exit;
}

class Schema
{
    public static function table(string $name): string
    {
        global $wpdb;
        return $wpdb->prefix . 'tsp_' . $name;
    }

    public static function createTables(): void
    {
        global $wpdb;

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        $charsetCollate = $wpdb->get_charset_collate();

        $queries = [];

        $queries[] = "CREATE TABLE " . self::table('vehicle_makes') . " (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            name VARCHAR(191) NOT NULL,
            slug VARCHAR(191) NOT NULL,
            sort_order INT NOT NULL DEFAULT 0,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY slug (slug),
            KEY is_active (is_active),
            KEY sort_order (sort_order)
        ) $charsetCollate";

        $queries[] = "CREATE TABLE " . self::table('vehicle_models') . " (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            make_id BIGINT UNSIGNED NOT NULL,
            name VARCHAR(191) NOT NULL,
            slug VARCHAR(191) NOT NULL,
            sort_order INT NOT NULL DEFAULT 0,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY make_slug (make_id,slug),
            KEY make_id (make_id),
            KEY is_active (is_active)
        ) $charsetCollate";

        $queries[] = "CREATE TABLE " . self::table('vehicle_generations') . " (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            model_id BIGINT UNSIGNED NOT NULL,
            name VARCHAR(191) NOT NULL,
            slug VARCHAR(191) NOT NULL,
            platform_code VARCHAR(191) NULL,
            body_type VARCHAR(191) NULL,
            year_from SMALLINT UNSIGNED NULL,
            year_to SMALLINT UNSIGNED NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY model_slug (model_id,slug),
            KEY model_id (model_id),
            KEY years (year_from,year_to),
            KEY is_active (is_active)
        ) $charsetCollate";

        $queries[] = "CREATE TABLE " . self::table('vehicle_engines') . " (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            generation_id BIGINT UNSIGNED NOT NULL,
            engine_label VARCHAR(191) NOT NULL,
            displacement VARCHAR(50) NULL,
            fuel_type VARCHAR(100) NULL,
            engine_type VARCHAR(100) NULL,
            power_hp SMALLINT UNSIGNED NULL,
            power_kw SMALLINT UNSIGNED NULL,
            engine_code VARCHAR(191) NULL,
            emission_standard VARCHAR(100) NULL,
            has_dpf TINYINT(1) NOT NULL DEFAULT 0,
            has_start_stop TINYINT(1) NOT NULL DEFAULT 0,
            year_from SMALLINT UNSIGNED NULL,
            year_to SMALLINT UNSIGNED NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            PRIMARY KEY (id),
            KEY generation_id (generation_id),
            KEY engine_code (engine_code),
            KEY power_hp (power_hp),
            KEY is_active (is_active)
        ) $charsetCollate";

        $queries[] = "CREATE TABLE " . self::table('fitments') . " (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            product_id BIGINT UNSIGNED NOT NULL,
            make_id BIGINT UNSIGNED NOT NULL,
            model_id BIGINT UNSIGNED NOT NULL,
            generation_id BIGINT UNSIGNED NULL,
            engine_id BIGINT UNSIGNED NULL,
            oem_number VARCHAR(191) NULL,
            turbo_number VARCHAR(191) NULL,
            fitment_notes TEXT NULL,
            fitment_confidence TINYINT UNSIGNED NOT NULL DEFAULT 0,
            is_primary TINYINT(1) NOT NULL DEFAULT 0,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uniq_logic (product_id,make_id,model_id,generation_id,engine_id),
            KEY product_id (product_id),
            KEY make_model (make_id,model_id),
            KEY generation_engine (generation_id,engine_id),
            KEY oem_number (oem_number),
            KEY turbo_number (turbo_number),
            KEY is_active (is_active)
        ) $charsetCollate";

        $queries[] = "CREATE TABLE " . self::table('search_logs') . " (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            session_id VARCHAR(191) NOT NULL,
            make_id BIGINT UNSIGNED NULL,
            model_id BIGINT UNSIGNED NULL,
            generation_id BIGINT UNSIGNED NULL,
            engine_id BIGINT UNSIGNED NULL,
            product_count INT NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL,
            user_ip_hash VARCHAR(191) NULL,
            user_agent_hash VARCHAR(191) NULL,
            PRIMARY KEY (id),
            KEY created_at (created_at),
            KEY session_id (session_id)
        ) $charsetCollate";

        foreach ($queries as $query) {
            dbDelta($query);
        }
    }
}
