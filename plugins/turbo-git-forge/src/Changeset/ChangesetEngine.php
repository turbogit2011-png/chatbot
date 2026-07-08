<?php
declare(strict_types=1);

namespace TurboGit\Forge\Changeset;

use TurboGit\Forge\Support\AuditLog;
use TurboGit\Forge\Support\Security;

/**
 * Silnik zmian. Wymusza cykl: PREVIEW → EXPORT → APPROVE → APPLY → VERIFY → ROLLBACK.
 *
 * Gwarancje bezpieczeństwa:
 *  - APPLY jest możliwe TYLKO dla changesetu ze statusem APPROVED i jawną flagą zgody użytkownika.
 *  - Przed każdą zmianą pola tworzony jest backup dotychczasowej wartości (w changesecie).
 *  - Zmiany masowe (> LIMIT) wymagają dodatkowego, osobnego potwierdzenia.
 *  - Silnik NIE tworzy nowych produktów (operuje wyłącznie na istniejących product_id).
 *  - Każdy krok trafia do AuditLog.
 */
final class ChangesetEngine
{
    /** Powyżej tylu operacji wymagane jest osobne potwierdzenie „bulk". */
    public const BULK_LIMIT = 10;

    public const PREVIEW  = 'PREVIEW';
    public const APPROVED = 'APPROVED';
    public const APPLIED  = 'APPLIED';
    public const ROLLEDBACK = 'ROLLEDBACK';

    /**
     * Zbuduj podgląd zmian (nic nie zapisuje). Waliduje istnienie i bezpieczny warunek (np. tytuł).
     *
     * @param array<int,array{product_id:int,expected_title?:string,changes:array<string,mixed>}> $ops
     */
    public function preview(string $module, array $ops): Changeset
    {
        Security::assertManage();
        $cs = new Changeset($module);

        foreach ($ops as $op) {
            $pid = (int) ($op['product_id'] ?? 0);
            $product = $pid > 0 ? wc_get_product($pid) : null;

            if (!$product) {
                $cs->addSkipped($pid, 'PRODUCT_NOT_FOUND'); // reguła: tylko istniejące product_id
                continue;
            }
            // Zasada #6: dodatkowy bezpieczny warunek (np. zgodność tytułu) przed jakąkolwiek zmianą.
            if (isset($op['expected_title']) && $product->get_name() !== $op['expected_title']) {
                $cs->addSkipped($pid, 'TITLE_MISMATCH');
                continue;
            }
            $before = [];
            foreach (array_keys($op['changes']) as $key) {
                $before[$key] = $product->get_meta($key, true); // backup wartości sprzed zmiany
            }
            $cs->addChange($pid, $before, $op['changes']);
        }

        AuditLog::record($module, 'PREVIEW', [
            'changeset_id' => $cs->id(),
            'summary'      => sprintf('Podgląd: %d zmian, %d pominiętych', $cs->countChanges(), $cs->countSkipped()),
        ]);

        return $cs;
    }

    /** Oznacz changeset jako zatwierdzony (człowiek). Wymaga nonce + capability. */
    public function approve(Changeset $cs): void
    {
        Security::verify('approve_changeset');
        $cs->setStatus(self::APPROVED);
        AuditLog::record($cs->module(), 'APPROVE', ['changeset_id' => $cs->id()]);
    }

    /**
     * Zastosuj zmiany. Dozwolone TYLKO gdy: status=APPROVED, capApply, jawna zgoda, a przy bulk — potwierdzenie bulk.
     */
    public function apply(Changeset $cs, bool $explicitConsent, bool $bulkConfirmed = false): ApplyResult
    {
        Security::verify('apply_changeset');

        if (!Security::canApply()) {
            return ApplyResult::denied('BRAK_UPRAWNIEN_APPLY');
        }
        if ($cs->status() !== self::APPROVED) {
            return ApplyResult::denied('CHANGESET_NIE_ZATWIERDZONY');
        }
        if (!$explicitConsent) {
            return ApplyResult::denied('BRAK_JAWNEJ_ZGODY');
        }
        if ($cs->countChanges() > self::BULK_LIMIT && !$bulkConfirmed) {
            return ApplyResult::denied('WYMAGANE_POTWIERDZENIE_BULK');
        }

        $applied = 0;
        foreach ($cs->changes() as $change) {
            $product = wc_get_product($change['product_id']);
            if (!$product) {
                continue; // nigdy nie tworzymy — jeśli zniknął, pomijamy
            }
            foreach ($change['after'] as $key => $value) {
                $product->update_meta_data($key, $value);
            }
            $product->save();
            $applied++;
        }

        $cs->setStatus(self::APPLIED);
        AuditLog::record($cs->module(), 'APPLY', [
            'changeset_id' => $cs->id(),
            'summary'      => sprintf('Zastosowano %d zmian', $applied),
            'payload'      => $cs->toArray(), // pełny snapshot before/after → umożliwia rollback
        ]);

        return ApplyResult::ok($applied);
    }

    /** Cofnij zmiany przywracając wartości „before" z changesetu. */
    public function rollback(Changeset $cs, bool $explicitConsent): ApplyResult
    {
        Security::verify('rollback_changeset');
        if (!Security::canApply() || !$explicitConsent) {
            return ApplyResult::denied('BRAK_UPRAWNIEN_LUB_ZGODY');
        }
        $restored = 0;
        foreach ($cs->changes() as $change) {
            $product = wc_get_product($change['product_id']);
            if (!$product) {
                continue;
            }
            foreach ($change['before'] as $key => $value) {
                $product->update_meta_data($key, $value);
            }
            $product->save();
            $restored++;
        }
        $cs->setStatus(self::ROLLEDBACK);
        AuditLog::record($cs->module(), 'ROLLBACK', [
            'changeset_id' => $cs->id(),
            'summary'      => sprintf('Przywrócono %d zmian', $restored),
        ]);
        return ApplyResult::ok($restored);
    }
}
