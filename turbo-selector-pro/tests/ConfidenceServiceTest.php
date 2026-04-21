<?php

use TurboSelectorPro\Services\ConfidenceService;

it('calculates full match confidence', function () {
    $service = new ConfidenceService();
    $score = $service->score(['engine_id' => 9], ['engine_id' => 9, 'generation_id' => 1, 'model_id' => 1]);
    expect($score)->toBe(100);
});

it('returns rationale for partial match', function () {
    $service = new ConfidenceService();
    expect($service->rationale(70))->toContain('generacji');
});
