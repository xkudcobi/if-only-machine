// Sol sütundaki seçimler: piyasa kartları, kural kartları ve iki ayar kaydırıcısı.
// DOM yalnızca dil ya da kural değişince yeniden kurulur; kaydırıcı sürüklenirken odak kaybolmasın diye
// diğer durumlarda sadece değerler güncellenir.
(function () {
  'use strict';
  const ns = (globalThis.IfOnly = globalThis.IfOnly || {});
  const { COLORS, fitCanvas, extent } = ns.canvas;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function drawSparkline(canvas, prices) {
    const { ctx, width, height } = fitCanvas(canvas);
    const points = ns.markets.downsample(prices, 60);
    const [lo, hi] = extent(points, 0, points.length);
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const px = 2 + ((width - 4) * i) / (points.length - 1);
      const py = 2 + (height - 4) * (1 - (points[i] - lo) / (hi - lo || 1));
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  function createControls(els, handlers) {
    const { marketList, ruleList, tuneBox, reshuffleButton } = els;
    let builtFor = '';
    let sparkKey = '';
    const sliders = {};
    let sentence = null;

    reshuffleButton.addEventListener('click', () => handlers.onReshuffle());

    function buildMarkets(state) {
      marketList.textContent = '';
      const entries = ns.markets.PRESETS.map((p) => ({ id: p.id, icon: p.icon }));
      if (state.custom) entries.push({ id: 'custom', icon: '📄' });
      for (const entry of entries) {
        const card = el('button', 'card market-card');
        card.type = 'button';
        card.dataset.id = entry.id;
        const head = el('span', 'card-head');
        head.append(el('span', 'card-icon', entry.icon), el('span', 'card-name', ns.i18n.t('market.' + entry.id + '.name')));
        const spark = el('canvas', 'sparkline');
        spark.setAttribute('aria-hidden', 'true');
        const blurb = el('span', 'card-blurb', entry.id === 'custom'
          ? ns.i18n.t('market.custom.blurb', { days: ns.format.integer(state.custom.prices.length) })
          : ns.i18n.t('market.' + entry.id + '.blurb'));
        card.append(head, spark, blurb);
        card.addEventListener('click', () => handlers.onMarket(entry.id));
        marketList.append(card);
      }
      sparkKey = '';
    }

    function buildRules() {
      ruleList.textContent = '';
      for (const strategy of ns.strategies.STRATEGIES) {
        const card = el('button', 'card rule-card');
        card.type = 'button';
        card.dataset.id = strategy.id;
        const head = el('span', 'card-head');
        head.append(el('span', 'card-icon', strategy.icon), el('span', 'card-name', ns.i18n.t('rule.' + strategy.id + '.name')));
        card.append(head, el('span', 'card-blurb', ns.i18n.t('rule.' + strategy.id + '.blurb')));
        card.addEventListener('click', () => handlers.onStrategy(strategy.id));
        ruleList.append(card);
      }
    }

    function buildTune(strategy) {
      tuneBox.textContent = '';
      sentence = el('p', 'rule-sentence');
      tuneBox.append(sentence);
      for (const key of Object.keys(sliders)) delete sliders[key];
      for (const param of strategy.params) {
        const values = ns.strategies.paramValues(param);
        const id = 'slider-' + param.key;
        const row = el('div', 'slider-row');
        const label = el('label', 'slider-label', ns.i18n.t('param.' + strategy.id + '.' + param.key));
        label.htmlFor = id;
        const output = el('output', 'slider-value');
        output.htmlFor = id;
        const input = el('input');
        input.type = 'range';
        input.id = id;
        input.min = '0';
        input.max = String(values.length - 1);
        input.step = '1';
        input.addEventListener('input', () => {
          handlers.onParams({ [param.key]: values[Number(input.value)] });
        });
        row.append(label, output, input);
        tuneBox.append(row);
        sliders[param.key] = { input, output, param, values };
      }
    }

    // Kural cümlesi; değerler kalın yazılır. Metin i18n'den gelir, değerler güvenli biçimde araya eklenir.
    function renderSentence(strategy, params) {
      const template = ns.i18n.t('rule.' + strategy.id + '.sentence');
      sentence.textContent = '';
      const parts = template.split(/(\{\w+\})/);
      for (const part of parts) {
        const match = /^\{(\w+)\}$/.exec(part);
        const param = match && strategy.params.find((p) => p.key === match[1]);
        if (param) sentence.append(el('strong', 'chip', ns.format.paramInline(param, params[param.key])));
        else if (part) sentence.append(document.createTextNode(part));
      }
    }

    function render(state) {
      const strategy = ns.strategies.findStrategy(state.strategyId);
      const buildKey = state.lang + '|' + strategy.id + '|' + (state.custom ? state.custom.prices.length : 0);
      if (buildKey !== builtFor) {
        buildMarkets(state);
        buildRules();
        buildTune(strategy);
        builtFor = buildKey;
      }

      for (const card of marketList.children) card.setAttribute('aria-pressed', String(card.dataset.id === state.marketId));
      for (const card of ruleList.children) card.setAttribute('aria-pressed', String(card.dataset.id === state.strategyId));
      reshuffleButton.disabled = state.marketId === 'custom';

      // Kıvılcım grafikleri tohum değişince yeniden çizilir.
      const key = state.seed + '|' + builtFor;
      if (key !== sparkKey) {
        for (const card of marketList.children) {
          const id = card.dataset.id;
          const prices = id === 'custom' ? state.custom.prices : ns.markets.buildMarket(id, state.seed);
          drawSparkline(card.querySelector('canvas'), prices);
        }
        sparkKey = key;
      }

      const params = state.params[strategy.id];
      for (const key of Object.keys(sliders)) {
        const { input, output, param } = sliders[key];
        const index = ns.strategies.nearestIndex(param, params[key]);
        if (Number(input.value) !== index) input.value = String(index);
        output.textContent = ns.format.paramValue(param, params[key]);
      }
      renderSentence(strategy, params);
    }

    return {
      render,
      // Pencere boyutu değişince kıvılcımlar yeniden çizilsin.
      invalidate() {
        sparkKey = '';
      }
    };
  }

  ns.controls = { createControls };
})();
