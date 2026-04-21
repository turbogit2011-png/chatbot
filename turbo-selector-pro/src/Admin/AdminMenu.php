<?php

namespace TurboSelectorPro\Admin;

use TurboSelectorPro\Core\Settings;
use TurboSelectorPro\Database\Schema;
use TurboSelectorPro\Services\CsvService;
use TurboSelectorPro\Services\DemoDataSeeder;
use TurboSelectorPro\Services\FitmentService;

if (! defined('ABSPATH')) {
    exit;
}

class AdminMenu
{
    private FitmentService $fitmentService;

    public function __construct(FitmentService $fitmentService)
    {
        $this->fitmentService = $fitmentService;
    }

    public function register(): void
    {
        add_action('admin_menu', [$this, 'menu']);
        add_action('admin_post_tsp_save_settings', [$this, 'saveSettings']);
        add_action('admin_post_tsp_import_csv', [$this, 'importCsv']);
        add_action('admin_post_tsp_export_csv', [$this, 'exportCsv']);
        add_action('admin_post_tsp_seed_demo', [$this, 'seedDemo']);
    }

    public function menu(): void
    {
        $cap = 'manage_options';
        add_menu_page('Turbo Selector Pro', 'Turbo Selector Pro', $cap, 'tsp-dashboard', [$this, 'dashboard'], 'dashicons-filter', 56);

        $pages = [
            'tsp-dashboard' => ['Dashboard', 'dashboard'],
            'tsp-makes' => ['Marki', 'makes'],
            'tsp-models' => ['Modele', 'models'],
            'tsp-generations' => ['Generacje', 'generations'],
            'tsp-engines' => ['Silniki', 'engines'],
            'tsp-fitments' => ['Dopasowania', 'fitments'],
            'tsp-import-export' => ['Import / Export', 'importExport'],
            'tsp-settings' => ['Ustawienia', 'settings'],
            'tsp-search-logs' => ['Logi wyszukiwań', 'logs'],
        ];

        foreach ($pages as $slug => $cfg) {
            add_submenu_page('tsp-dashboard', $cfg[0], $cfg[0], $cap, $slug, [$this, $cfg[1]]);
        }
    }

    public function dashboard(): void
    {
        echo '<div class="wrap"><h1>Turbo Selector Pro</h1><p>Dashboard pluginu i skróty administracyjne.</p></div>';
    }

    public function makes(): void
    {
        $this->simpleCrud('vehicle_makes', ['name', 'slug', 'sort_order', 'is_active'], 'Marki');
    }

    public function models(): void
    {
        $this->simpleCrud('vehicle_models', ['make_id', 'name', 'slug', 'sort_order', 'is_active'], 'Modele');
    }

    public function generations(): void
    {
        $this->simpleCrud('vehicle_generations', ['model_id', 'name', 'slug', 'platform_code', 'body_type', 'year_from', 'year_to', 'is_active'], 'Generacje');
    }

    public function engines(): void
    {
        $this->simpleCrud('vehicle_engines', ['generation_id', 'engine_label', 'displacement', 'fuel_type', 'engine_type', 'power_hp', 'power_kw', 'engine_code', 'emission_standard', 'has_dpf', 'has_start_stop', 'year_from', 'year_to', 'is_active'], 'Silniki');
    }

    public function fitments(): void
    {
        $this->simpleCrud('fitments', ['product_id', 'make_id', 'model_id', 'generation_id', 'engine_id', 'oem_number', 'turbo_number', 'fitment_notes', 'fitment_confidence', 'is_primary', 'is_active'], 'Dopasowania');
    }

    public function importExport(): void
    {
        echo '<div class="wrap"><h1>Import / Export</h1>';
        echo '<h2>Import CSV</h2><form method="post" enctype="multipart/form-data" action="' . esc_url(admin_url('admin-post.php')) . '">';
        wp_nonce_field('tsp_import_csv');
        echo '<input type="hidden" name="action" value="tsp_import_csv" /><input type="file" name="csv_file" accept=".csv" required />';
        submit_button('Importuj CSV', 'primary', 'submit', false);
        echo '</form>';
        echo '<h2>Export CSV</h2><p>';
        foreach (['vehicle_makes','vehicle_models','vehicle_generations','vehicle_engines','fitments'] as $entity) {
            $url = wp_nonce_url(admin_url('admin-post.php?action=tsp_export_csv&entity=' . $entity), 'tsp_export_csv');
            echo '<a class="button" href="' . esc_url($url) . '">Export ' . esc_html($entity) . '</a> ';
        }
        echo '</p><h2>Demo Data</h2><form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
        wp_nonce_field('tsp_seed_demo');
        echo '<input type="hidden" name="action" value="tsp_seed_demo" />';
        submit_button('Wstaw demo data świadomie', 'secondary', 'submit', false);
        echo '</form></div>';
    }

    public function settings(): void
    {
        $settings = Settings::get();
        ?>
        <div class="wrap"><h1>Ustawienia</h1>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <?php wp_nonce_field('tsp_save_settings'); ?>
                <input type="hidden" name="action" value="tsp_save_settings" />
                <table class="form-table">
                    <tr><th>Liczba wyników</th><td><input name="results_per_page" value="<?php echo esc_attr((string) $settings['results_per_page']); ?>"/></td></tr>
                    <tr><th>Domyślny widok</th><td><select name="default_view_mode"><option value="grid">Grid</option><option value="list" <?php selected($settings['default_view_mode'], 'list'); ?>>List</option></select></td></tr>
                    <tr><th>Logi wyszukiwań</th><td><input type="checkbox" name="enable_search_logs" value="1" <?php checked((int) $settings['enable_search_logs'], 1); ?>/></td></tr>
                    <tr><th>Ukrywaj out of stock</th><td><input type="checkbox" name="hide_out_of_stock" value="1" <?php checked((int) $settings['hide_out_of_stock'], 1); ?>/></td></tr>
                    <tr><th>AI endpoint</th><td><input class="regular-text" name="ai_endpoint" value="<?php echo esc_attr((string) $settings['ai_endpoint']); ?>"/></td></tr>
                    <tr><th>Cache TTL</th><td><input name="cache_ttl" value="<?php echo esc_attr((string) $settings['cache_ttl']); ?>"/></td></tr>
                </table>
                <?php submit_button('Zapisz'); ?>
            </form>
        </div>
        <?php
    }

    public function saveSettings(): void
    {
        if (! current_user_can('manage_options')) {
            wp_die(esc_html__('Brak uprawnień', 'turbo-selector-pro'));
        }
        check_admin_referer('tsp_save_settings');

        $settings = Settings::get();
        $settings['results_per_page'] = absint($_POST['results_per_page'] ?? 12);
        $settings['default_view_mode'] = sanitize_text_field(wp_unslash($_POST['default_view_mode'] ?? 'grid'));
        $settings['enable_search_logs'] = isset($_POST['enable_search_logs']) ? 1 : 0;
        $settings['hide_out_of_stock'] = isset($_POST['hide_out_of_stock']) ? 1 : 0;
        $settings['ai_endpoint'] = esc_url_raw(wp_unslash($_POST['ai_endpoint'] ?? ''));
        $settings['cache_ttl'] = absint($_POST['cache_ttl'] ?? 600);

        update_option(Settings::OPTION_KEY, $settings);
        wp_safe_redirect(admin_url('admin.php?page=tsp-settings&updated=1'));
        exit;
    }



    public function importCsv(): void
    {
        if (! current_user_can('manage_options')) {
            wp_die('Forbidden');
        }
        check_admin_referer('tsp_import_csv');
        $file = $_FILES['csv_file']['tmp_name'] ?? '';
        if (! $file) {
            wp_safe_redirect(admin_url('admin.php?page=tsp-import-export&error=1'));
            exit;
        }
        $result = (new CsvService())->import($file);
        wp_safe_redirect(admin_url('admin.php?page=tsp-import-export&imported=' . absint($result['imported'])));
        exit;
    }

    public function exportCsv(): void
    {
        if (! current_user_can('manage_options')) {
            wp_die('Forbidden');
        }
        check_admin_referer('tsp_export_csv');
        (new CsvService())->export(sanitize_text_field(wp_unslash($_GET['entity'] ?? '')));
    }

    public function seedDemo(): void
    {
        if (! current_user_can('manage_options')) {
            wp_die('Forbidden');
        }
        check_admin_referer('tsp_seed_demo');
        (new DemoDataSeeder())->seed();
        wp_safe_redirect(admin_url('admin.php?page=tsp-import-export&seeded=1'));
        exit;
    }

    public function logs(): void
    {
        global $wpdb;
        $rows = $wpdb->get_results('SELECT * FROM ' . Schema::table('search_logs') . ' ORDER BY created_at DESC LIMIT 100', ARRAY_A);
        echo '<div class="wrap"><h1>Logi wyszukiwań</h1><table class="widefat"><thead><tr><th>Data</th><th>Session</th><th>make/model/gen/engine</th><th>Wyniki</th></tr></thead><tbody>';
        foreach ($rows as $row) {
            echo '<tr><td>' . esc_html($row['created_at']) . '</td><td>' . esc_html($row['session_id']) . '</td><td>' . esc_html($row['make_id'] . '/' . $row['model_id'] . '/' . $row['generation_id'] . '/' . $row['engine_id']) . '</td><td>' . esc_html((string) $row['product_count']) . '</td></tr>';
        }
        echo '</tbody></table></div>';
    }

    private function simpleCrud(string $table, array $fields, string $title): void
    {
        if (! current_user_can('manage_options')) {
            wp_die(esc_html__('Brak uprawnień', 'turbo-selector-pro'));
        }

        global $wpdb;
        $tableName = Schema::table($table);

        if (isset($_POST['tsp_action']) && wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['_wpnonce'] ?? '')), 'tsp_crud_' . $table)) {
            $action = sanitize_text_field(wp_unslash($_POST['tsp_action']));
            if ($action === 'delete') {
                $wpdb->delete($tableName, ['id' => absint($_POST['id'])], ['%d']);
            }
            if ($action === 'save') {
                $data = [];
                foreach ($fields as $field) {
                    $raw = $_POST[$field] ?? '';
                    $data[$field] = is_numeric($raw) ? absint($raw) : sanitize_text_field(wp_unslash($raw));
                }
                $data['created_at'] = current_time('mysql');
                $data['updated_at'] = current_time('mysql');
                $wpdb->insert($tableName, $data);
            }
        }

        $rows = $wpdb->get_results('SELECT * FROM ' . $tableName . ' ORDER BY id DESC LIMIT 200', ARRAY_A);
        echo '<div class="wrap"><h1>' . esc_html($title) . '</h1><form method="post">';
        wp_nonce_field('tsp_crud_' . $table);
        echo '<input type="hidden" name="tsp_action" value="save">';
        foreach ($fields as $field) {
            echo '<p><label>' . esc_html($field) . '<br><input name="' . esc_attr($field) . '" class="regular-text"></label></p>';
        }
        submit_button('Dodaj rekord');
        echo '</form><hr><table class="widefat"><thead><tr><th>ID</th>';
        foreach ($fields as $field) {
            echo '<th>' . esc_html($field) . '</th>';
        }
        echo '<th>Akcja</th></tr></thead><tbody>';
        foreach ($rows as $row) {
            echo '<tr><td>' . esc_html((string) $row['id']) . '</td>';
            foreach ($fields as $field) {
                echo '<td>' . esc_html((string) ($row[$field] ?? '')) . '</td>';
            }
            echo '<td><form method="post">';
            wp_nonce_field('tsp_crud_' . $table);
            echo '<input type="hidden" name="tsp_action" value="delete"><input type="hidden" name="id" value="' . esc_attr((string) $row['id']) . '"><button class="button-link-delete">Usuń</button></form></td></tr>';
        }
        echo '</tbody></table></div>';
    }
}
