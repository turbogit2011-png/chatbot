<?php

namespace TurboSelectorPro\Repositories;

use TurboSelectorPro\Database\Schema;

if (! defined('ABSPATH')) {
    exit;
}

class FitmentRepository
{
    public function findFitments(array $criteria): array
    {
        global $wpdb;

        $where = ['f.is_active = 1'];
        $params = [];

        foreach (['make_id', 'model_id', 'generation_id', 'engine_id'] as $key) {
            if (! empty($criteria[$key])) {
                $where[] = 'f.' . $key . ' = %d';
                $params[] = absint($criteria[$key]);
            }
        }

        if (! empty($criteria['oem_number'])) {
            $where[] = 'f.oem_number = %s';
            $params[] = sanitize_text_field($criteria['oem_number']);
        }

        if (! empty($criteria['turbo_number'])) {
            $where[] = 'f.turbo_number = %s';
            $params[] = sanitize_text_field($criteria['turbo_number']);
        }

        $queryArgs = [
            'where' => $where,
            'params' => $params,
            'order_by' => 'f.fitment_confidence DESC, f.is_primary DESC, f.id DESC',
        ];
        $queryArgs = apply_filters('tsp_matching_products_query_args', $queryArgs, $criteria);

        $sql = 'SELECT f.* FROM ' . Schema::table('fitments') . ' f WHERE ' . implode(' AND ', (array) ($queryArgs['where'] ?? [])) . ' ORDER BY ' . ($queryArgs['order_by'] ?? 'f.id DESC');
        $params = (array) ($queryArgs['params'] ?? []);

        if (! empty($params)) {
            $sql = $wpdb->prepare($sql, $params);
        }

        return (array) $wpdb->get_results($sql, ARRAY_A);
    }

    public function logSearch(array $payload): void
    {
        global $wpdb;

        $wpdb->insert(
            Schema::table('search_logs'),
            [
                'session_id' => sanitize_text_field($payload['session_id'] ?? wp_generate_uuid4()),
                'make_id' => absint($payload['make_id'] ?? 0) ?: null,
                'model_id' => absint($payload['model_id'] ?? 0) ?: null,
                'generation_id' => absint($payload['generation_id'] ?? 0) ?: null,
                'engine_id' => absint($payload['engine_id'] ?? 0) ?: null,
                'product_count' => absint($payload['product_count'] ?? 0),
                'created_at' => current_time('mysql'),
                'user_ip_hash' => sanitize_text_field($payload['user_ip_hash'] ?? ''),
                'user_agent_hash' => sanitize_text_field($payload['user_agent_hash'] ?? ''),
            ],
            ['%s', '%d', '%d', '%d', '%d', '%d', '%s', '%s', '%s']
        );
    }
}
