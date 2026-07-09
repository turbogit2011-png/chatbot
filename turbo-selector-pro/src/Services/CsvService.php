<?php

namespace TurboSelectorPro\Services;

use TurboSelectorPro\Database\Schema;

if (! defined('ABSPATH')) {
    exit;
}

class CsvService
{
    public function import(string $tmpPath): array
    {
        $handle = fopen($tmpPath, 'rb');
        if (! $handle) {
            return ['success' => false, 'errors' => ['Nie udało się otworzyć pliku CSV.'], 'imported' => 0];
        }

        $header = fgetcsv($handle);
        $required = ['entity'];
        foreach ($required as $col) {
            if (! in_array($col, (array) $header, true)) {
                return ['success' => false, 'errors' => ['Brak kolumny: ' . $col], 'imported' => 0];
            }
        }

        $imported = 0;
        $errors = [];
        while (($row = fgetcsv($handle)) !== false) {
            $data = array_combine($header, $row);
            if (! is_array($data)) {
                continue;
            }

            $entity = sanitize_text_field($data['entity'] ?? '');
            try {
                $this->upsertEntity($entity, $data);
                $imported++;
            } catch (\Throwable $e) {
                $errors[] = $e->getMessage();
            }
        }

        fclose($handle);
        return ['success' => empty($errors), 'errors' => $errors, 'imported' => $imported];
    }

    public function export(string $entity): void
    {
        global $wpdb;
        $allowed = ['vehicle_makes', 'vehicle_models', 'vehicle_generations', 'vehicle_engines', 'fitments'];
        if (! in_array($entity, $allowed, true)) {
            wp_die('Invalid export entity');
        }

        $rows = $wpdb->get_results('SELECT * FROM ' . Schema::table($entity), ARRAY_A);
        if (headers_sent()) {
            return;
        }

        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="tsp-' . $entity . '.csv"');
        $out = fopen('php://output', 'wb');

        if (! empty($rows)) {
            fputcsv($out, array_keys($rows[0]));
            foreach ($rows as $row) {
                fputcsv($out, $row);
            }
        }

        fclose($out);
        exit;
    }

    private function upsertEntity(string $entity, array $data): void
    {
        global $wpdb;
        $now = current_time('mysql');

        if ($entity === 'make') {
            $wpdb->replace(Schema::table('vehicle_makes'), ['name' => sanitize_text_field($data['make'] ?? ''), 'slug' => sanitize_title($data['make'] ?? ''), 'sort_order' => 0, 'is_active' => 1, 'created_at' => $now, 'updated_at' => $now]);
        }
    }
}
