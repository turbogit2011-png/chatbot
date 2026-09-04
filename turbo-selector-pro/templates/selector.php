<div class="tsp-selector tsp-mode-<?php echo esc_attr($atts['mode']); ?> tsp-theme-<?php echo esc_attr($atts['theme']); ?>" data-show-results="<?php echo esc_attr($atts['show_results']); ?>">
    <div class="tsp-grid">
        <?php foreach ($fields as $field) : ?>
            <div class="tsp-field" data-field="<?php echo esc_attr($field); ?>">
                <?php if ($atts['hide_labels'] !== 'true') : ?><label><?php echo esc_html(ucfirst(str_replace('_', ' ', $field))); ?></label><?php endif; ?>
                <select <?php disabled($field !== 'make'); ?> name="<?php echo esc_attr($field); ?>">
                    <option value=""><?php echo esc_html__('Wybierz', 'turbo-selector-pro'); ?> <?php echo esc_html($field); ?></option>
                </select>
            </div>
        <?php endforeach; ?>
    </div>
    <button type="button" class="tsp-submit"><?php echo esc_html($atts['submit_text']); ?></button>
    <div class="tsp-messages" aria-live="polite"></div>
    <div class="tsp-results-container"></div>
</div>
