<?php
/**
 * Plugin Name:       Turbo-Git Huby SEO
 * Description:       Tworzy strony hubów SEO (turbosprężarki wg marki) jednym kliknięciem. Tworzy WYŁĄCZNIE nowe strony (nigdy nie nadpisuje istniejących). Rollback = przycisk „Usuń huby”.
 * Version:           1.0.0
 * Requires PHP:      7.4
 * Author:            Turbo-Git Forge
 */

if (!defined('ABSPATH')) { exit; }

define('TGH_DIR', plugin_dir_path(__FILE__));
define('TGH_MARK', '_tg_hub'); // meta-znacznik stron utworzonych przez tę wtyczkę

add_action('admin_menu', function () {
    add_menu_page('TG Huby SEO', 'TG Huby SEO', 'manage_options', 'tg-huby', 'tgh_render_page', 'dashicons-networking', 59);
});

/** Definicje hubów: czytane z hubs/defs.json (wygenerowane z realnego katalogu). */
function tgh_defs(): array {
    $raw = file_get_contents(TGH_DIR . 'hubs/defs.json');
    $defs = json_decode($raw, true);
    return is_array($defs) ? $defs : [];
}

function tgh_find_page_by_slug(string $slug, int $parent = 0) {
    $q = get_posts([
        'name' => $slug, 'post_type' => 'page', 'post_status' => ['publish','draft','pending','private'],
        'post_parent' => $parent, 'numberposts' => 1, 'fields' => 'ids',
    ]);
    return $q ? (int)$q[0] : 0;
}

function tgh_create_all(): array {
    $report = [];

    // 1) Strona nadrzędna /huby/
    $parent_id = tgh_find_page_by_slug('huby', 0);
    if (!$parent_id) {
        $idx_html = file_get_contents(TGH_DIR . 'hubs/index-huby.html');
        $parent_id = wp_insert_post([
            'post_title'   => 'Turbosprężarki wg marki',
            'post_name'    => 'huby',
            'post_content' => $idx_html,
            'post_status'  => 'publish',
            'post_type'    => 'page',
        ]);
        if (!is_wp_error($parent_id) && $parent_id) {
            update_post_meta($parent_id, TGH_MARK, '1');
            update_post_meta($parent_id, 'rank_math_title', 'Turbosprężarki wg marki pojazdu — regenerowane | Turbo-Git');
            update_post_meta($parent_id, 'rank_math_description', 'Katalog regenerowanych turbosprężarek wg marki: Audi, VW, Seat, Skoda, Ford, Opel, BMW. Nowy CHRA, gwarancja 24 mies., wysyłka 24h.');
            $report[] = 'UTWORZONO: /huby/ (index)';
        } else {
            $report[] = 'BŁĄD tworzenia /huby/';
            return $report;
        }
    } else {
        $report[] = 'POMINIĘTO: /huby/ już istnieje (nie nadpisujemy)';
    }

    // 2) Huby marek jako podstrony /huby/<slug>/
    foreach (tgh_defs() as $d) {
        $slug = sanitize_title($d['slug']);
        if (tgh_find_page_by_slug($slug, $parent_id)) {
            $report[] = 'POMINIĘTO: /huby/' . $slug . '/ już istnieje';
            continue;
        }
        $file = TGH_DIR . 'hubs/' . basename($d['file']);
        if (!is_readable($file)) { $report[] = 'BŁĄD: brak pliku ' . esc_html($d['file']); continue; }
        $html = file_get_contents($file);
        $pid = wp_insert_post([
            'post_title'   => $d['title'],
            'post_name'    => $slug,
            'post_content' => $html,
            'post_status'  => 'publish',
            'post_type'    => 'page',
            'post_parent'  => $parent_id,
        ]);
        if (is_wp_error($pid) || !$pid) { $report[] = 'BŁĄD tworzenia ' . esc_html($d['title']); continue; }
        update_post_meta($pid, TGH_MARK, '1');
        update_post_meta($pid, 'rank_math_title', $d['seo_title']);
        update_post_meta($pid, 'rank_math_description', $d['seo_desc']);
        update_post_meta($pid, 'rank_math_focus_keyword', $d['kw']);
        $report[] = 'UTWORZONO: /huby/' . $slug . '/ (' . esc_html($d['title']) . ')';
    }
    return $report;
}

function tgh_delete_all(): array {
    $ids = get_posts(['post_type'=>'page','post_status'=>'any','numberposts'=>-1,'fields'=>'ids',
                      'meta_key'=>TGH_MARK,'meta_value'=>'1']);
    $n = 0;
    foreach ($ids as $id) { wp_trash_post($id); $n++; }
    return ['Przeniesiono do kosza: ' . $n . ' stron hubów (możesz je przywrócić z Kosza).'];
}

function tgh_render_page(): void {
    if (!current_user_can('manage_options')) { wp_die('Brak uprawnień.'); }
    $report = [];
    if (isset($_POST['tgh_action']) && check_admin_referer('tgh_go', 'tgh_nonce')) {
        $report = ($_POST['tgh_action'] === 'create') ? tgh_create_all() : tgh_delete_all();
        flush_rewrite_rules();
    }
    $existing = get_posts(['post_type'=>'page','post_status'=>'any','numberposts'=>-1,'fields'=>'ids',
                           'meta_key'=>TGH_MARK,'meta_value'=>'1']);
    echo '<div class="wrap"><h1>Turbo-Git — Huby SEO</h1>';
    echo '<p>Tworzy <strong>nowe</strong> strony: <code>/huby/</code> + 7 hubów marek (Audi, VW, Seat, Skoda, Ford, Opel, BMW) z treścią, siatką produktów, FAQ i danymi strukturalnymi. <strong>Niczego nie nadpisuje.</strong></p>';
    if ($report) {
        echo '<div class="notice notice-info"><ul style="margin:8px 16px">';
        foreach ($report as $r) { echo '<li>' . wp_kses_post($r) . '</li>'; }
        echo '</ul></div>';
    }
    echo '<p>Stron hubów w systemie: <strong>' . count($existing) . '</strong></p>';
    echo '<form method="post" style="display:inline">';
    wp_nonce_field('tgh_go', 'tgh_nonce');
    echo '<button class="button button-primary button-hero" name="tgh_action" value="create">Utwórz huby (8 stron)</button> ';
    echo '<button class="button button-hero" name="tgh_action" value="delete" onclick="return confirm(\'Przenieść wszystkie strony hubów do kosza?\')">Usuń huby (rollback)</button>';
    echo '</form>';
    echo '<p style="margin-top:16px;color:#666">Po utworzeniu: dodaj link do <code>/huby/</code> w menu (Wygląd → Menu). Ponowne kliknięcie „Utwórz” pomija istniejące strony (bezpieczne).</p>';
    echo '</div>';
}
