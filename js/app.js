// Uygulamanın giriş noktası: depoyu kurar, bileşenleri bağlar ve durum değiştikçe ekranı yeniden çizer.
// Hesap mantığı core/ altında, çizim ui/ altında; burası yalnızca ikisini birbirine bağlar.
(function () {
  'use strict';
  const ns = globalThis.IfOnly;
  const { i18n, storage, format } = ns;
  const $ = (id) => document.getElementById(id);

  const WORLD_COUNT = 200;
  // Paralel dünya deneyi, kaydırıcı sürüklenirken her adımda baştan başlamasın diye kısa bir bekleme.
  const WORLDS_DELAY_MS = 220;
  const SAVE_DELAY_MS = 500;

  // Gizli sekmede ya da kapalı depolamada localStorage erişimi hata fırlatabilir.
  const localStore = (() => {
    try {
      const probe = window.localStorage;
      probe.getItem('ifonly.lang');
      return probe;
    } catch (e) {
      return null;
    }
  })();

  // --- Başlangıç durumu: dil, sonra bağlantı ya da son oturum. ---
  const lang = storage.loadLang(localStore) || i18n.detectLang(navigator.language);
  i18n.setLang(lang);
  let startState = ns.state.initialState(lang);
  const hashSnapshot = storage.decodeHash(location.hash);
  const badLink = !!location.hash && location.hash.length > 1 && !hashSnapshot;
  const initialSnapshot = hashSnapshot || storage.loadLast(localStore);
  if (initialSnapshot) startState = ns.state.reduce(startState, { type: 'snapshot', snapshot: initialSnapshot });

  const store = ns.state.createStore(startState);
  const model = ns.model.createModel();
  const dispatch = (action) => store.dispatch(action);

  // --- Bileşenler ---
  const charts = ns.charts.createCharts({
    priceCanvas: $('price-chart'),
    equityCanvas: $('equity-chart'),
    tooltip: $('chart-tip')
  });

  const heatmap = ns.heatmap.createHeatmap($('heatmap'), $('map-tip'), {
    onSelect(row, col) {
      const strategy = ns.strategies.findStrategy(store.getState().strategyId);
      dispatch({ type: 'params', params: ns.sweep.cellParams(strategy, row, col) });
    }
  });

  const luckView = ns.luck.createLuckView({ histCanvas: $('luck-hist'), samplesCanvas: $('luck-samples') });

  const controls = ns.controls.createControls(
    { marketList: $('market-list'), ruleList: $('rule-list'), tuneBox: $('tune-box'), reshuffleButton: $('reshuffle') },
    {
      onMarket: (marketId) => dispatch({ type: 'market', marketId }),
      onReshuffle: () => dispatch({ type: 'reshuffle' }),
      onStrategy: (strategyId) => dispatch({ type: 'strategy', strategyId }),
      onParams: (params) => dispatch({ type: 'params', params })
    }
  );

  const customStatus = ns.panels.createStatus($('custom-status'));
  const saveStatus = ns.panels.createStatus($('save-status'));

  const replay = ns.replay.createReplay({
    onFrame: (index) => charts.setPlayIndex(index),
    onState(running) {
      const button = $('replay');
      button.dataset.i18n = running ? 'story.pause' : 'story.replay';
      button.textContent = i18n.t(button.dataset.i18n);
      if (!running) charts.setPlayIndex(null);
    }
  });

  // --- Paralel dünyalar: arka planda, kare kare ilerleyen deney. ---
  const worlds = { key: '', run: null, frame: 0, timer: 0, seed: 1, originalEdge: 0 };

  function worldsKeyOf(state) {
    const prices = model.getPrices(state);
    return [prices.length, prices[prices.length - 1], state.strategyId, JSON.stringify(state.params[state.strategyId]), state.settings.fee, worlds.seed].join('|');
  }

  function scheduleWorlds(state, force) {
    const key = worldsKeyOf(state);
    if (!force && key === worlds.key) return;
    worlds.key = key;
    cancelAnimationFrame(worlds.frame);
    clearTimeout(worlds.timer);
    $('luck-progress').hidden = false;
    setProgress(0);
    worlds.timer = setTimeout(() => startWorlds(store.getState()), WORLDS_DELAY_MS);
  }

  function startWorlds(state) {
    const strategy = ns.strategies.findStrategy(state.strategyId);
    const run = model.getRun(state);
    worlds.originalEdge = run.edge;
    if (!run.valid) {
      worlds.run = null;
      renderLuck();
      return;
    }
    const best = model.getBestParams(state);
    worlds.run = ns.worlds.createWorldsRun({
      prices: model.getPrices(state),
      strategy,
      params: state.params[strategy.id],
      compareParams: best,
      options: model.options(state),
      count: WORLD_COUNT,
      seed: worlds.seed
    });
    const step = () => {
      const finished = worlds.run.step(10);
      renderLuck();
      if (!finished) worlds.frame = requestAnimationFrame(step);
    };
    worlds.frame = requestAnimationFrame(step);
  }

  function setProgress(share) {
    $('luck-progress').firstElementChild.style.width = Math.round(share * 100) + '%';
  }

  function renderLuck() {
    const state = store.getState();
    const verdictEl = $('luck-verdict');
    const bestEl = $('luck-best');
    $('luck-intro').textContent = i18n.t('luck.intro', { count: format.integer(WORLD_COUNT) });
    if (!worlds.run) {
      $('luck-progress').hidden = true;
      verdictEl.textContent = i18n.t('luck.verdict.unknown');
      verdictEl.dataset.verdict = 'unknown';
      bestEl.textContent = '';
      luckView.render({ summary: null, originalEdge: 0, prices: model.getPrices(state) });
      return;
    }
    const summary = worlds.run.summary();
    const finished = summary.done >= summary.count;
    $('luck-progress').hidden = finished;
    setProgress(summary.done / summary.count);
    if (!finished) {
      verdictEl.textContent = i18n.t('luck.running', { done: format.integer(summary.done), count: format.integer(summary.count) });
      verdictEl.dataset.verdict = 'running';
    } else {
      const verdict = ns.worlds.verdict(worlds.originalEdge, summary.rule.beatShare);
      verdictEl.textContent = i18n.t('luck.verdict.' + verdict, { share: format.percent(summary.rule.beatShare) });
      verdictEl.dataset.verdict = verdict;
    }
    // En iyi kare, seçili kareden farklıysa kıyas cümlesi gösterilir.
    const strategy = ns.strategies.findStrategy(state.strategyId);
    const best = model.getBestParams(state);
    const current = state.params[strategy.id];
    const isSame = best && strategy.params.every((p) => best[p.key] === current[p.key]);
    if (finished && best && summary.compare && !isSame) {
      const [pa, pb] = strategy.params;
      bestEl.textContent = i18n.t('luck.best', {
        a: format.paramValue(pa, best[pa.key]),
        b: format.paramValue(pb, best[pb.key]),
        share: format.percent(summary.compare.beatShare)
      });
    } else {
      bestEl.textContent = '';
    }
    luckView.render({ summary, originalEdge: worlds.originalEdge, prices: model.getPrices(state) });
  }

  // --- Ana çizim ---
  let saveTimer = 0;

  function render(state, previous) {
    const langChanged = !previous || previous.lang !== state.lang;
    if (langChanged) {
      i18n.setLang(state.lang);
      document.documentElement.lang = state.lang;
      document.title = i18n.t('app.title');
      i18n.applyToDom(document);
      for (const button of document.querySelectorAll('.lang-switch button')) {
        button.setAttribute('aria-pressed', String(button.dataset.lang === state.lang));
      }
      customStatus.repaint();
      saveStatus.repaint();
      renderSlotList();
    }
    replay.stop();

    const strategy = ns.strategies.findStrategy(state.strategyId);
    const prices = model.getPrices(state);
    const run = model.getRun(state);
    const grid = model.getGrid(state);

    controls.render(state);
    ns.panels.renderStory(
      { headline: $('story-headline'), sub: $('story-sub'), badge: $('edge-badge'), ruleName: $('rule-name') },
      run,
      state
    );
    charts.render({ prices, run, dates: state.marketId === 'custom' && state.custom ? state.custom.dates : null });
    heatmap.render(grid, strategy, ns.sweep.cellOf(strategy, state.params[strategy.id]));
    $('map-caption').textContent = i18n.t('map.caption', {
      count: format.integer(grid.validCount),
      ms: format.integer(Math.max(1, Math.round(grid.elapsedMs))),
      beat: format.integer(grid.beatCount)
    });
    $('jump-best').disabled = grid.bestIndex < 0;
    ns.panels.renderNumbers($('numbers-body'), run);

    const fee = $('fee');
    if (Number(fee.value) !== state.settings.fee) fee.value = String(state.settings.fee);
    $('fee-value').textContent = format.finePercent(state.settings.fee);
    const startInput = $('start-coins');
    if (document.activeElement !== startInput) startInput.value = String(state.settings.start);

    if (langChanged && worlds.run) renderLuck();
    scheduleWorlds(state, false);

    // Adres çubuğu her zaman paylaşılabilir hali gösterir; kendi fiyatlarında bağlantı taşınamadığı için temizlenir.
    const hash = state.marketId === 'custom' ? '' : storage.encodeHash(state);
    if (location.hash !== hash) history.replaceState(null, '', hash || location.pathname + location.search);

    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => storage.saveLast(localStore, store.getState()), SAVE_DELAY_MS);
  }

  function renderSlotList() {
    ns.panels.renderSlots($('slot-list'), storage.listSlots(localStore), {
      onOpen(name) {
        const slot = storage.findSlot(localStore, name);
        if (!slot) return;
        dispatch({ type: 'snapshot', snapshot: slot.snapshot });
        saveStatus.show('save.loaded', { name });
      },
      onDelete(name) {
        storage.deleteSlot(localStore, name);
        renderSlotList();
      }
    });
  }

  // --- Olaylar ---
  for (const button of document.querySelectorAll('.lang-switch button')) {
    button.addEventListener('click', () => {
      storage.saveLang(localStore, button.dataset.lang);
      dispatch({ type: 'lang', lang: button.dataset.lang });
    });
  }

  $('replay').addEventListener('click', () => {
    if (replay.isRunning()) replay.stop();
    else replay.start(model.getPrices(store.getState()).length);
  });

  $('jump-best').addEventListener('click', () => {
    const best = model.getBestParams(store.getState());
    if (best) dispatch({ type: 'params', params: best });
  });

  $('rerun-worlds').addEventListener('click', () => {
    worlds.seed++;
    scheduleWorlds(store.getState(), true);
  });

  function loadCustomText(text) {
    try {
      const parsed = ns.csv.parsePrices(text);
      dispatch({ type: 'custom', prices: parsed.prices, dates: parsed.dates });
      customStatus.show(parsed.reversed ? 'custom.reversed' : 'custom.ok', { days: format.integer(parsed.prices.length) }, 'ok');
    } catch (error) {
      const code = error && error.code ? error.code : 'fileError';
      customStatus.show('csv.' + code, { line: error.line, min: ns.csv.MIN_ROWS, max: format.integer(ns.csv.MAX_ROWS) }, 'error', true);
    }
  }

  $('custom-load').addEventListener('click', () => loadCustomText($('custom-text').value));

  function readFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      $('custom-text').value = String(reader.result);
      loadCustomText(String(reader.result));
    };
    reader.onerror = () => customStatus.show('csv.fileError', null, 'error', true);
    reader.readAsText(file);
  }

  $('custom-file').addEventListener('change', (event) => {
    readFile(event.target.files[0]);
    event.target.value = '';
  });

  // Dosya doğrudan metin kutusuna da bırakılabilir.
  const textArea = $('custom-text');
  textArea.addEventListener('dragover', (event) => {
    event.preventDefault();
    textArea.classList.add('dragging');
  });
  textArea.addEventListener('dragleave', () => textArea.classList.remove('dragging'));
  textArea.addEventListener('drop', (event) => {
    event.preventDefault();
    textArea.classList.remove('dragging');
    readFile(event.dataTransfer.files[0]);
  });

  $('fee').addEventListener('input', (event) => dispatch({ type: 'settings', settings: { fee: Number(event.target.value) } }));
  $('start-coins').addEventListener('change', (event) => {
    dispatch({ type: 'settings', settings: { start: Number(event.target.value) } });
    event.target.value = String(store.getState().settings.start);
  });

  $('slot-save').addEventListener('click', () => {
    const state = store.getState();
    const typed = $('slot-name').value.trim();
    const name = typed || i18n.t('save.defaultName', {
      rule: i18n.t('rule.' + state.strategyId + '.name'),
      market: i18n.t('market.' + state.marketId + '.name')
    });
    const result = storage.saveSlot(localStore, name, state);
    if (result.ok) {
      $('slot-name').value = '';
      saveStatus.show('save.saved', { name: result.name }, 'ok');
    } else {
      saveStatus.show('save.storageFull', null, 'error');
    }
    renderSlotList();
  });

  $('share').addEventListener('click', async () => {
    const state = store.getState();
    const url = location.href.split('#')[0] + storage.encodeHash(state);
    try {
      await navigator.clipboard.writeText(url);
      if (state.marketId === 'custom') {
        saveStatus.show('save.customNoShare', { market: i18n.t('market.' + ns.state.DEFAULT_MARKET + '.name') }, 'info');
      } else {
        saveStatus.show('save.copied', null, 'ok');
      }
    } catch (e) {
      saveStatus.show('save.copyFailed', { url }, 'info', true);
    }
  });

  // Pencere boyutu değişince tüm canvas'lar yeni boyuta göre yeniden çizilir (kare başına bir kez).
  let resizeFrame = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      charts.redraw();
      heatmap.redraw();
      luckView.redraw();
      controls.invalidate();
      controls.render(store.getState());
    });
  });

  store.subscribe(render);
  render(store.getState(), null);
  if (badLink) saveStatus.show('save.badLink', null, 'info');
})();
