<div class="tsp-results">
    <h3><?php echo esc_html(sprintf(__('Wyniki: %d', 'turbo-selector-pro'), (int) $result['count'])); ?></h3>
    <div class="tsp-results-grid">
        <?php foreach ($result['products'] as $item) : ?>
            <article class="tsp-card">
                <img src="<?php echo esc_url($item['image'] ?: wc_placeholder_img_src()); ?>" alt="<?php echo esc_attr($item['name']); ?>" />
                <h4><?php echo esc_html($item['name']); ?></h4>
                <div class="price"><?php echo wp_kses_post($item['price_html']); ?></div>
                <div class="meta">OEM: <?php echo esc_html((string) $item['oem_number']); ?> | TURBO: <?php echo esc_html((string) $item['turbo_number']); ?></div>
                <div class="badge"><?php echo esc_html($item['confidence'] >= 95 ? 'Dopasowanie główne' : 'Wymaga weryfikacji'); ?></div>
                <a href="<?php echo esc_url($item['permalink']); ?>" class="button"><?php echo esc_html__('Zobacz produkt', 'turbo-selector-pro'); ?></a>
            </article>
        <?php endforeach; ?>
    </div>
</div>
