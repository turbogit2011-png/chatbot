<?php
declare(strict_types=1);

namespace TurboGit\Forge\Support;

/**
 * Niezmienny (append-only) dziennik audytu. Każda operacja Forge (preview, approve, apply, rollback)
 * zapisuje wpis: kto, kiedy, co, na jakim produkcie, z jakim changesetem.
 */
final class AuditLog
{
    public static function table(): string
    {
        global $wpdb;
        return $wpdb->prefix . 'tgf_audit_log';
    }

    public static function install(): void
    {
        global $wpdb;
        $table   = self::table();
        $charset = $wpdb->get_charset_collate();
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta("CREATE TABLE {$table} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            created_at DATETIME NOT NULL,
            user_id BIGINT UNSIGNED NOT NULL,
            module VARCHAR(64) NOT NULL,
            action VARCHAR(32) NOT NULL,
            changeset_id VARCHAR(64) NULL,
            object_type VARCHAR(32) NULL,
            object_id BIGINT UNSIGNED NULL,
            summary TEXT NULL,
            payload LONGTEXT NULL,
            PRIMARY KEY (id),
            KEY changeset_id (changeset_id),
            KEY object_id (object_id)
        ) {$charset};");
    }

    /**
     * @param array<string,mixed> $data
     */
    public static function record(string $module, string $action, array $data = []): void
    {
        global $wpdb;
        $wpdb->insert(self::table(), [
            'created_at'   => current_time('mysql', true),
            'user_id'      => get_current_user_id(),
            'module'       => $module,
            'action'       => $action,
            'changeset_id' => $data['changeset_id'] ?? null,
            'object_type'  => $data['object_type'] ?? null,
            'object_id'    => $data['object_id'] ?? null,
            'summary'      => $data['summary'] ?? null,
            'payload'      => isset($data['payload']) ? wp_json_encode($data['payload']) : null,
        ]);
    }
}
