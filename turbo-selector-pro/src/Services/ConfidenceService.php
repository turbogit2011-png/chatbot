<?php

namespace TurboSelectorPro\Services;

if (! defined('ABSPATH')) {
    exit;
}

class ConfidenceService
{
    public function score(array $criteria, array $fitment): int
    {
        $score = 0;

        if (! empty($criteria['engine_id']) && (int) $criteria['engine_id'] === (int) $fitment['engine_id']) {
            $score = 100;
        } elseif (! empty($criteria['generation_id']) && (int) $criteria['generation_id'] === (int) $fitment['generation_id']) {
            $score = 70;
        } elseif (! empty($criteria['model_id']) && (int) $criteria['model_id'] === (int) $fitment['model_id']) {
            $score = 40;
        }

        return (int) apply_filters('tsp_fitment_confidence', $score, $criteria, $fitment);
    }

    public function rationale(int $score): string
    {
        if ($score >= 95) {
            return __('Pełne dopasowanie po silniku.', 'turbo-selector-pro');
        }
        if ($score >= 70) {
            return __('Dopasowanie po generacji – wymaga weryfikacji silnika.', 'turbo-selector-pro');
        }

        return __('Dopasowanie przybliżone po modelu – wymaga ręcznej weryfikacji.', 'turbo-selector-pro');
    }
}
