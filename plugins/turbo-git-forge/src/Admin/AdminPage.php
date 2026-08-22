<?php
declare(strict_types=1);

namespace TurboGit\Forge\Admin;

use TurboGit\Forge\Modules\ModuleRegistry;
use TurboGit\Forge\Support\Security;

/**
 * Panel kontrolny Forge (read-only na tym etapie): lista modułów, ich status (ON/OFF), notka bezpieczeństwa.
 * Nie zawiera żadnej akcji zapisującej dane produktów — te wymagają changesetu + zgody.
 */
final class AdminPage
{
    public function __construct(private ModuleRegistry $modules) {}

    public function register(): void
    {
        add_action('admin_menu', function (): void {
            add_menu_page(
                'Turbo-Git Forge',
                'Turbo-Git Forge',
                Security::CAP,
                'turbo-git-forge',
                [$this, 'render'],
                'dashicons-admin-generic',
                58
            );
        });
    }

    public function render(): void
    {
        Security::assertManage();
        echo '<div class="wrap"><h1>Turbo-Git Forge</h1>';
        echo '<div class="notice notice-info"><p><strong>Tryb bezpieczny.</strong> Żadna zmiana produktów nie jest wykonywana bez cyklu PREVIEW → APPROVE → APPLY → VERIFY → ROLLBACK, backupu i jawnej zgody. Tworzenie produktów jest zablokowane.</p></div>';
        echo '<table class="widefat striped"><thead><tr><th>Moduł</th><th>Status</th><th>Zmienia dane?</th></tr></thead><tbody>';
        foreach ($this->modules->all() as $m) {
            printf(
                '<tr><td>%s</td><td>%s</td><td>%s</td></tr>',
                esc_html($m->title()),
                $m->isEnabled() ? '<span style="color:#15803d">WŁĄCZONY</span>' : '<span style="color:#64748b">WYŁĄCZONY (domyślnie)</span>',
                $m->isMutating() ? 'tak (wymaga changesetu)' : 'nie (podgląd/raport)'
            );
        }
        echo '</tbody></table>';
        echo '<p style="margin-top:16px;color:#64748b">Wersja ' . esc_html(TGF_VERSION) . ' · dziennik audytu: tabela <code>' . esc_html($GLOBALS['wpdb']->prefix) . 'tgf_audit_log</code></p>';
        echo '</div>';
    }
}
