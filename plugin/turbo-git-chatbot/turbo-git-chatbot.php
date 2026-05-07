<?php
/**
 * Plugin Name:  TURBO-GIT Chatbot
 * Plugin URI:   https://turbo-git.com
 * Description:  Asystent AI do doboru turbosprężarek — premium chatbot sprzedażowy. Zbiera leady, wysyła powiadomienia e-mail, konfigurowalny z poziomu panelu WordPress.
 * Version:      1.0.0
 * Author:       TURBO-GIT
 * Author URI:   https://turbo-git.com
 * License:      GPL-2.0+
 * Text Domain:  turbo-git-chatbot
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'TGC_VERSION', '1.0.0' );
define( 'TGC_PATH',    plugin_dir_path( __FILE__ ) );
define( 'TGC_URL',     plugin_dir_url( __FILE__ ) );

class TurboGit_Chatbot {

    public function __construct() {
        add_action( 'wp_enqueue_scripts',     [ $this, 'enqueue'          ] );
        add_action( 'admin_menu',             [ $this, 'admin_menu'       ] );
        add_action( 'admin_init',             [ $this, 'register_settings'] );
        add_action( 'wp_ajax_tgc_lead',       [ $this, 'handle_lead'      ] );
        add_action( 'wp_ajax_nopriv_tgc_lead',[ $this, 'handle_lead'      ] );
    }

    /* ── FRONTEND ── */

    public function enqueue() {
        wp_enqueue_script(
            'turbo-git-chatbot',
            TGC_URL . 'assets/turbo-git-chatbot.js',
            [],
            TGC_VERSION,
            true
        );

        wp_localize_script( 'turbo-git-chatbot', 'TurboGitConfig', [
            'phone'          => get_option( 'tgc_phone',        '+48 123 456 789' ),
            'phoneDisplay'   => get_option( 'tgc_phone_display','+48 123 456 789' ),
            'email'          => get_option( 'tgc_email',        'info@turbo-git.com' ),
            'autoOpenDelay'  => (int) get_option( 'tgc_auto_open', 5000 ),
            'ajaxUrl'        => admin_url( 'admin-ajax.php' ),
            'nonce'          => wp_create_nonce( 'tgc_lead' ),
        ] );
    }

    /* ── AJAX: odbierz lead, wyślij e-mail ── */

    public function handle_lead() {
        if ( ! check_ajax_referer( 'tgc_lead', 'nonce', false ) ) {
            wp_send_json_error( 'invalid_nonce', 403 );
        }

        $raw  = isset( $_POST['data'] ) ? wp_unslash( $_POST['data'] ) : '{}';
        $data = json_decode( $raw, true );
        if ( ! is_array( $data ) ) {
            wp_send_json_error( 'bad_data', 400 );
        }

        $car  = isset( $data['car']  ) ? $data['car']  : [];
        $lead = isset( $data['lead'] ) ? $data['lead'] : [];
        $ts   = isset( $data['ts']   ) ? sanitize_text_field( $data['ts'] ) : current_time('mysql');

        // Sanitize
        $sanitized_car = array_map( 'sanitize_text_field', array_filter( $car,  'is_string' ) );
        $sanitized_lead= array_map( 'sanitize_text_field', array_filter( $lead, 'is_string' ) );

        // Zapisz do opcji (prosta baza leadów)
        $leads   = get_option( 'tgc_leads', [] );
        $leads[] = [
            'car'  => $sanitized_car,
            'lead' => $sanitized_lead,
            'ts'   => $ts,
            'ip'   => $_SERVER['REMOTE_ADDR'] ?? '',
        ];
        update_option( 'tgc_leads', array_slice( $leads, -500 ) ); // max 500 leadów

        // Wyślij e-mail
        $notify_email = get_option( 'tgc_notify_email', get_option( 'admin_email' ) );
        if ( $notify_email ) {
            $subject = '[TURBO-GIT] Nowy lead — ' . ( $sanitized_lead['imie'] ?? 'Brak imienia' );
            $body    = $this->build_email( $sanitized_car, $sanitized_lead, $ts );
            wp_mail(
                $notify_email,
                $subject,
                $body,
                [ 'Content-Type: text/html; charset=UTF-8' ]
            );
        }

        wp_send_json_success( [ 'received' => true ] );
    }

    private function build_email( $car, $lead, $ts ) {
        $rows_car = '';
        $labels_car = [
            'marka' => 'Marka', 'model' => 'Model', 'rok' => 'Rok',
            'silnik' => 'Silnik', 'numerTurbo' => 'Nr turbiny',
            'vin' => 'VIN', 'autoOpis' => 'Opis auta', 'awariaOpis' => 'Objawy awarii',
        ];
        foreach ( $labels_car as $k => $label ) {
            if ( ! empty( $car[ $k ] ) ) {
                $rows_car .= '<tr><td style="padding:6px 12px;color:#888;white-space:nowrap">' . esc_html( $label ) . '</td>'
                           . '<td style="padding:6px 12px;color:#222;font-weight:600">' . esc_html( $car[ $k ] ) . '</td></tr>';
            }
        }
        $name  = esc_html( $lead['imie']    ?? '—' );
        $phone = esc_html( $lead['telefon'] ?? '—' );
        $email = esc_html( $lead['email']   ?? '—' );

        return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f0f0f5;font-family:-apple-system,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f5;padding:30px 0">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)">
  <tr><td style="background:linear-gradient(135deg,#1a0800,#0a0a18);padding:24px 28px">
    <div style="font-size:22px;font-weight:900;color:#fff">TURBO<span style="color:#ff7433">-GIT</span></div>
    <div style="font-size:13px;color:#888;margin-top:4px">Nowe zapytanie z chatbota</div>
  </td></tr>
  <tr><td style="padding:24px 28px">
    <div style="background:#fff8f5;border:1px solid #ffe0cc;border-radius:10px;padding:16px 20px;margin-bottom:20px">
      <div style="font-size:11px;font-weight:700;color:#ff7433;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">Dane kontaktowe</div>
      <table cellpadding="0" cellspacing="0" style="width:100%">
        <tr><td style="padding:4px 0;color:#888;width:80px">Imię</td><td style="padding:4px 0;font-weight:700;font-size:17px;color:#111">' . $name . '</td></tr>
        <tr><td style="padding:4px 0;color:#888">Telefon</td><td style="padding:4px 0;font-weight:600;color:#ff7433;font-size:15px"><a href="tel:' . rawurlencode( $lead['telefon'] ?? '' ) . '" style="color:#ff7433">' . $phone . '</a></td></tr>
        <tr><td style="padding:4px 0;color:#888">E-mail</td><td style="padding:4px 0;color:#333">' . $email . '</td></tr>
      </table>
    </div>
    ' . ( $rows_car ? '<div style="background:#f8f8fc;border:1px solid #e8e8f0;border-radius:10px;padding:16px 20px;margin-bottom:20px">
      <div style="font-size:11px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Dane pojazdu / turbiny</div>
      <table cellpadding="0" cellspacing="0" style="width:100%">' . $rows_car . '</table>
    </div>' : '' ) . '
    <div style="font-size:11px;color:#bbb;margin-top:16px">Zapytanie złożone: ' . esc_html( $ts ) . '</div>
  </td></tr>
  <tr><td style="background:#f8f8fc;padding:16px 28px;text-align:center">
    <a href="tel:' . rawurlencode( $lead['telefon'] ?? '' ) . '" style="display:inline-block;background:#ff7433;color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none">📞 Oddzwoń teraz: ' . $phone . '</a>
  </td></tr>
</table>
</td></tr></table></body></html>';
    }

    /* ── ADMIN ── */

    public function admin_menu() {
        add_options_page(
            'TURBO-GIT Chatbot',
            'TURBO-GIT Chatbot',
            'manage_options',
            'turbo-git-chatbot',
            [ $this, 'settings_page' ]
        );
        add_submenu_page(
            'options-general.php',
            'TURBO-GIT — Leady',
            'TG Leady',
            'manage_options',
            'turbo-git-leads',
            [ $this, 'leads_page' ]
        );
    }

    public function register_settings() {
        $fields = [
            'tgc_phone'         => '+48 123 456 789',
            'tgc_phone_display' => '+48 123 456 789',
            'tgc_email'         => 'info@turbo-git.com',
            'tgc_notify_email'  => get_option( 'admin_email' ),
            'tgc_auto_open'     => 5000,
        ];
        foreach ( $fields as $key => $default ) {
            register_setting( 'tgc_settings', $key, [
                'sanitize_callback' => 'sanitize_text_field',
                'default'           => $default,
            ] );
        }
    }

    public function settings_page() {
        if ( ! current_user_can( 'manage_options' ) ) return;
        $saved = isset( $_GET['settings-updated'] );
        ?>
        <style>
          .tgc-wrap { max-width:700px }
          .tgc-logo { font-size:24px;font-weight:900;margin-bottom:24px }
          .tgc-logo span { color:#ff7433 }
          .tgc-card { background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:24px;margin-bottom:20px }
          .tgc-card h2 { font-size:15px;font-weight:700;margin:0 0 16px;padding:0;color:#1a1a2e }
          .tgc-field { margin-bottom:16px }
          .tgc-field label { display:block;font-size:13px;font-weight:600;color:#444;margin-bottom:5px }
          .tgc-field input { width:100%;padding:8px 12px;border:1px solid #dde1e7;border-radius:7px;font-size:14px }
          .tgc-field input:focus { outline:none;border-color:#ff7433;box-shadow:0 0 0 3px rgba(255,116,51,.15) }
          .tgc-field .desc { font-size:12px;color:#888;margin-top:4px }
          .tgc-save { background:#ff7433;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer }
          .tgc-save:hover { background:#e86020 }
          .tgc-notice { background:#f0fff4;border:1px solid #68d391;border-radius:8px;padding:10px 16px;margin-bottom:20px;color:#276749;font-size:13px }
        </style>
        <div class="wrap tgc-wrap">
          <div class="tgc-logo">TURBO<span>-GIT</span> Chatbot — Ustawienia</div>
          <?php if ( $saved ) : ?>
            <div class="tgc-notice">✅ Ustawienia zostały zapisane.</div>
          <?php endif; ?>
          <form method="post" action="options.php">
            <?php settings_fields( 'tgc_settings' ); ?>
            <div class="tgc-card">
              <h2>📞 Dane kontaktowe firmy</h2>
              <div class="tgc-field">
                <label>Numer telefonu (do linku tel:)</label>
                <input type="text" name="tgc_phone" value="<?php echo esc_attr( get_option( 'tgc_phone', '+48 123 456 789' ) ); ?>" />
                <div class="desc">Format: +48123456789 (bez spacji, do klikania na mobile)</div>
              </div>
              <div class="tgc-field">
                <label>Numer telefonu (wyświetlany w chatbocie)</label>
                <input type="text" name="tgc_phone_display" value="<?php echo esc_attr( get_option( 'tgc_phone_display', '+48 123 456 789' ) ); ?>" />
              </div>
              <div class="tgc-field">
                <label>Adres e-mail firmy</label>
                <input type="email" name="tgc_email" value="<?php echo esc_attr( get_option( 'tgc_email', 'info@turbo-git.com' ) ); ?>" />
              </div>
            </div>
            <div class="tgc-card">
              <h2>🔔 Powiadomienia o leadach</h2>
              <div class="tgc-field">
                <label>E-mail do powiadomień</label>
                <input type="email" name="tgc_notify_email" value="<?php echo esc_attr( get_option( 'tgc_notify_email', get_option( 'admin_email' ) ) ); ?>" />
                <div class="desc">Na ten adres trafi e-mail za każdym razem gdy ktoś wyśle zapytanie przez chatbot.</div>
              </div>
            </div>
            <div class="tgc-card">
              <h2>⚙️ Zachowanie chatbota</h2>
              <div class="tgc-field">
                <label>Automatyczne otwarcie po X milisekundach</label>
                <input type="number" name="tgc_auto_open" value="<?php echo esc_attr( get_option( 'tgc_auto_open', 5000 ) ); ?>" min="0" step="500" style="width:140px" />
                <div class="desc">5000 = 5 sekund. Wpisz 0 żeby wyłączyć automatyczne otwieranie.</div>
              </div>
            </div>
            <button type="submit" class="tgc-save">Zapisz ustawienia</button>
          </form>
        </div>
        <?php
    }

    public function leads_page() {
        if ( ! current_user_can( 'manage_options' ) ) return;
        $leads = get_option( 'tgc_leads', [] );
        $leads = array_reverse( $leads ); // najnowsze pierwsze
        ?>
        <style>
          .tgc-leads { max-width:960px }
          .tgc-logo { font-size:22px;font-weight:900;margin-bottom:20px }
          .tgc-logo span { color:#ff7433 }
          .tgc-lead-card { background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:18px 22px;margin-bottom:14px }
          .tgc-lead-head { display:flex;justify-content:space-between;align-items:center;margin-bottom:12px }
          .tgc-lead-name { font-size:16px;font-weight:700 }
          .tgc-lead-phone { color:#ff7433;font-weight:700;font-size:15px;text-decoration:none }
          .tgc-lead-ts { font-size:11px;color:#aaa }
          .tgc-lead-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px }
          .tgc-lead-item { background:#f8f8fc;border-radius:7px;padding:8px 12px;font-size:12px }
          .tgc-lead-item .k { color:#888;margin-bottom:2px }
          .tgc-lead-item .v { font-weight:600;color:#1a1a2e }
          .tgc-empty { color:#888;font-size:14px;padding:24px 0 }
        </style>
        <div class="wrap tgc-leads">
          <div class="tgc-logo">TURBO<span>-GIT</span> — Leady z chatbota (<?php echo count( $leads ); ?>)</div>
          <?php if ( empty( $leads ) ) : ?>
            <div class="tgc-empty">Brak leadów. Gdy ktoś wyśle zapytanie przez chatbot, pojawi się tutaj.</div>
          <?php else : ?>
            <?php foreach ( $leads as $l ) :
              $car  = $l['car']  ?? [];
              $lead = $l['lead'] ?? [];
              $ts   = $l['ts']   ?? '';
              $name = $lead['imie'] ?? '—';
              $phone= $lead['telefon'] ?? '—';
            ?>
            <div class="tgc-lead-card">
              <div class="tgc-lead-head">
                <div>
                  <div class="tgc-lead-name"><?php echo esc_html( $name ); ?></div>
                  <a class="tgc-lead-phone" href="tel:<?php echo esc_attr( $phone ); ?>"><?php echo esc_html( $phone ); ?></a>
                </div>
                <div class="tgc-lead-ts"><?php echo esc_html( $ts ); ?></div>
              </div>
              <div class="tgc-lead-grid">
                <?php
                $items = array_merge(
                    array_filter( [ 'E-mail' => $lead['email'] ?? '' ] ),
                    array_filter( [
                        'Marka'    => $car['marka']      ?? '',
                        'Model'    => $car['model']      ?? '',
                        'Rok'      => $car['rok']        ?? '',
                        'Silnik'   => $car['silnik']     ?? '',
                        'Nr turbo' => $car['numerTurbo'] ?? '',
                        'VIN'      => $car['vin']        ?? '',
                        'Opis'     => $car['autoOpis']   ?? '',
                        'Awaria'   => $car['awariaOpis'] ?? '',
                    ] )
                );
                foreach ( $items as $k => $v ) : ?>
                  <div class="tgc-lead-item">
                    <div class="k"><?php echo esc_html( $k ); ?></div>
                    <div class="v"><?php echo esc_html( $v ); ?></div>
                  </div>
                <?php endforeach; ?>
              </div>
            </div>
            <?php endforeach; ?>
          <?php endif; ?>
        </div>
        <?php
    }
}

new TurboGit_Chatbot();
