(function ($) {
  const endpoint = (path) => `${tspConfig.endpoint}${path}`;

  const request = (url, method = 'GET', data = null) =>
    fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': tspConfig.nonce,
      },
      body: data ? JSON.stringify(data) : null,
    }).then((r) => r.json());

  const populate = ($select, rows, label = 'name') => {
    $select.prop('disabled', false).empty().append('<option value="">—</option>');
    rows.forEach((row) => $select.append(`<option value="${row.id}">${row[label]}</option>`));
  };

  $('.tsp-selector').each(function () {
    const $root = $(this);
    const $make = $root.find('[name="make"]');
    const $model = $root.find('[name="model"]');
    const $generation = $root.find('[name="generation"]');
    const $engine = $root.find('[name="engine"]');
    const $messages = $root.find('.tsp-messages');
    const $results = $root.find('.tsp-results-container');

    request(endpoint('/makes')).then((res) => populate($make, res.data));

    $make.on('change', function () {
      const makeId = $(this).val();
      $model.prop('disabled', true); $generation.prop('disabled', true); $engine.prop('disabled', true);
      if (!makeId) { return; }
      request(endpoint(`/models/${makeId}`)).then((res) => populate($model, res.data));
    });

    $model.on('change', function () {
      const modelId = $(this).val();
      $generation.prop('disabled', true); $engine.prop('disabled', true);
      if (!modelId) { return; }
      request(endpoint(`/generations/${modelId}`)).then((res) => populate($generation, res.data));
    });

    $generation.on('change', function () {
      const generationId = $(this).val();
      $engine.prop('disabled', true);
      if (!generationId) { return; }
      request(endpoint(`/engines/${generationId}`)).then((res) => populate($engine, res.data, 'engine_label'));
    });

    $root.find('.tsp-submit').on('click', function () {
      const payload = {
        make_id: parseInt($make.val() || 0, 10),
        model_id: parseInt($model.val() || 0, 10),
        generation_id: parseInt($generation.val() || 0, 10),
        engine_id: parseInt($engine.val() || 0, 10),
      };

      if (!payload.make_id || !payload.model_id) {
        $messages.text('Uzupełnij wymagane pola.');
        return;
      }

      $messages.text('Ładowanie...');
      request(endpoint('/search'), 'POST', payload).then((res) => {
        $messages.text(`Znaleziono: ${res.data.count}`);
        if ($root.data('show-results') === true || $root.data('show-results') === 'true') {
          const cards = (res.data.products || []).map((p) => `<div class="tsp-card"><strong>${p.name}</strong><br>${p.price_html}<br><a href="${p.permalink}">Produkt</a></div>`).join('');
          $results.html(`<div class="tsp-results-grid">${cards || '<p>Brak wyników</p>'}</div>`);
        }
      });
    });
  });
})(jQuery);
