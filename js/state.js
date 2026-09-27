// Uygulamanın tek durum kaynağı. Arayüz durumu doğrudan değiştirmez; dispatch({ type, ... }) çağırır,
// saf `reduce` fonksiyonu yeni bir durum üretir ve aboneler bilgilendirilir.
(function () {
  'use strict';
  const ns = (globalThis.IfOnly = globalThis.IfOnly || {});

  const FEE_MAX = 0.05;
  const START_MIN = 1;
  const START_MAX = 1e9;
  // İlk açılışta dolu ve ilginç bir örnek görünsün: balon piyasasında trend takibi.
  const DEFAULT_MARKET = 'bubble';
  const DEFAULT_STRATEGY = 'trend';

  function allDefaultParams() {
    const params = {};
    for (const strategy of ns.strategies.STRATEGIES) params[strategy.id] = ns.strategies.defaultParams(strategy);
    return params;
  }

  function initialState(lang) {
    return {
      lang: lang === 'tr' ? 'tr' : 'en',
      marketId: DEFAULT_MARKET,
      seed: 1,
      // Kullanıcının kendi fiyatları: { prices: Float64Array, dates: number[] | null }
      custom: null,
      strategyId: DEFAULT_STRATEGY,
      params: allDefaultParams(),
      settings: { fee: ns.engine.DEFAULT_OPTIONS.fee, start: ns.engine.DEFAULT_OPTIONS.start }
    };
  }

  function clamp(value, lo, hi) {
    return Math.min(hi, Math.max(lo, value));
  }

  function cleanSettings(current, patch) {
    const next = { ...current };
    if (patch && Number.isFinite(Number(patch.fee))) next.fee = clamp(Number(patch.fee), 0, FEE_MAX);
    if (patch && Number.isFinite(Number(patch.start))) next.start = clamp(Math.round(Number(patch.start)), START_MIN, START_MAX);
    return next;
  }

  function isKnownMarket(id) {
    return !!ns.markets.findPreset(id);
  }

  // Saf durum geçişi. Geçersiz eylemler durumu olduğu gibi döndürür (aynı nesne), böylece gereksiz çizim olmaz.
  function reduce(state, action) {
    switch (action.type) {
      case 'lang':
        return action.lang === state.lang || !['en', 'tr'].includes(action.lang) ? state : { ...state, lang: action.lang };

      case 'market':
        if (action.marketId === 'custom') return state.custom ? { ...state, marketId: 'custom' } : state;
        if (!isKnownMarket(action.marketId) || action.marketId === state.marketId) return state;
        return { ...state, marketId: action.marketId };

      case 'reshuffle': {
        // Kendi fiyatlarında karıştırılacak bir tohum yoktur.
        if (state.marketId === 'custom') return state;
        const seed = Number.isInteger(action.seed) && action.seed > 0 ? action.seed : state.seed + 1;
        return { ...state, seed };
      }

      case 'custom':
        if (!action.prices || action.prices.length < ns.csv.MIN_ROWS) return state;
        return { ...state, custom: { prices: action.prices, dates: action.dates || null }, marketId: 'custom' };

      case 'strategy':
        if (!ns.strategies.findStrategy(action.strategyId) || action.strategyId === state.strategyId) return state;
        return { ...state, strategyId: action.strategyId };

      case 'params': {
        const strategy = ns.strategies.findStrategy(state.strategyId);
        const merged = { ...state.params[strategy.id], ...action.params };
        const params = ns.strategies.normalizeParams(strategy, merged);
        const before = state.params[strategy.id];
        if (strategy.params.every((p) => params[p.key] === before[p.key])) return state;
        return { ...state, params: { ...state.params, [strategy.id]: params } };
      }

      case 'settings': {
        const settings = cleanSettings(state.settings, action.settings);
        if (settings.fee === state.settings.fee && settings.start === state.settings.start) return state;
        return { ...state, settings };
      }

      case 'snapshot':
        return applySnapshot(state, action.snapshot);

      default:
        return state;
    }
  }

  // Kayıttan ya da bağlantıdan gelen, güvenilmeyen bir nesneyi duruma uygular.
  // Tanınmayan her alan yok sayılır; kötü değerler varsayılana çekilir.
  function applySnapshot(state, snap) {
    if (!snap || typeof snap !== 'object') return state;
    let next = { ...state, params: { ...state.params } };
    if (snap.custom && Array.isArray(snap.custom.prices)) {
      const prices = Float64Array.from(snap.custom.prices, Number);
      if (prices.length >= ns.csv.MIN_ROWS && prices.every((p) => Number.isFinite(p) && p > 0)) {
        next.custom = { prices, dates: Array.isArray(snap.custom.dates) ? snap.custom.dates.map(Number) : null };
      }
    }
    if (snap.marketId === 'custom' && next.custom) next.marketId = 'custom';
    else if (isKnownMarket(snap.marketId)) next.marketId = snap.marketId;
    if (Number.isInteger(snap.seed) && snap.seed > 0) next.seed = snap.seed;
    if (ns.strategies.findStrategy(snap.strategyId)) next.strategyId = snap.strategyId;
    if (snap.params && typeof snap.params === 'object') {
      for (const strategy of ns.strategies.STRATEGIES) {
        if (snap.params[strategy.id]) next.params[strategy.id] = ns.strategies.normalizeParams(strategy, snap.params[strategy.id]);
      }
    }
    if (snap.settings) next.settings = cleanSettings(next.settings, snap.settings);
    return next;
  }

  // Basit yayınla-abone ol deposu.
  function createStore(initial) {
    let state = initial;
    const subscribers = new Set();
    return {
      getState: () => state,
      dispatch(action) {
        const previous = state;
        state = reduce(state, action);
        if (state !== previous) for (const fn of subscribers) fn(state, previous, action);
        return state;
      },
      subscribe(fn) {
        subscribers.add(fn);
        return () => subscribers.delete(fn);
      }
    };
  }

  ns.state = { initialState, reduce, createStore, FEE_MAX, DEFAULT_MARKET, DEFAULT_STRATEGY };
  if (typeof module !== 'undefined') module.exports = ns.state;
})();
