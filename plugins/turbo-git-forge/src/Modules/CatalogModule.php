<?php
declare(strict_types=1);

namespace TurboGit\Forge\Modules;

/**
 * Product Forge Catalog.
 * Na tym etapie moduł działa WYŁĄCZNIE w trybie PREVIEW/RAPORT (read-only): buduje scorecard jakości
 * katalogu wg reguł z docs/catalog/data-validation-rules.md. Nie zmienia niczego.
 * Faktyczne poprawki (np. rozdzielenie brand/vehicle, migracja SKU) wymagają osobnego, zatwierdzonego
 * changesetu przez ChangesetEngine (APPROVE + jawna zgoda + backup + rollback).
 */
final class CatalogModule extends AbstractModule
{
    public function key(): string { return 'catalog'; }
    public function title(): string { return 'Product Forge Catalog'; }

    // Domyślnie non-mutating: raport jakości nie modyfikuje danych.
    public function isMutating(): bool { return false; }

    /**
     * Zbuduj raport jakości dla listy produktów (read-only).
     * @param int[] $productIds
     * @return array<int,array{product_id:int,score:int,errors:string[],warnings:string[]}>
     */
    public function buildQualityReport(array $productIds): array
    {
        $rows = [];
        foreach ($productIds as $pid) {
            $product = wc_get_product((int) $pid);
            if (!$product) {
                continue;
            }
            $errors = [];
            $warnings = [];

            $sku = (string) $product->get_sku();
            if ($sku === '') {
                $errors[] = 'SKU_MISSING';
            } elseif (preg_match('/^\d{6,}$/', $sku)) {
                // SKU wygląda jak numer turbo (same cyfry) — reguła V2.
                $errors[] = 'SKU_LOOKS_LIKE_TURBO_NUMBER';
            } elseif (!preg_match('/^TG-[A-Z]+-\d{3,}$/', $sku)) {
                $warnings[] = 'SKU_NOT_TG_FORMAT';
            }

            $condition = (string) $product->get_meta('_tgf_condition', true);
            if ($condition === 'new') {
                $errors[] = 'REFURBISHED_MARKED_NEW'; // reguła V3
            }

            foreach (['_tgf_turbo_primary', '_tgf_status_power_hp', '_tgf_status_engine_code'] as $req) {
                if ($product->get_meta($req, true) === '') {
                    $warnings[] = 'MISSING_' . strtoupper($req);
                }
            }

            $score = max(0, 100 - (count($errors) * 25) - (count($warnings) * 8));
            $rows[] = [
                'product_id' => (int) $pid,
                'score'      => $score,
                'errors'     => $errors,
                'warnings'   => $warnings,
            ];
        }
        return $rows;
    }
}
