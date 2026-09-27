// Durumdan türetilen ağır hesapların hafızalı (memoized) katmanı.
// Arayüz her çizimde buradan ister; girdiler değişmediyse hesap tekrarlanmaz.
// Örneğin yalnızca kaydırıcı oynarsa fiyatlar ve ısı haritası yeniden hesaplanmaz, sadece tek kural çalışır.
(function () {
  'use strict';
  const ns = (globalThis.IfOnly = globalThis.IfOnly || {});

  function createModel() {
    let pricesKey = null;
    let prices = null;
    let cache = null;
    let gridKey = null;
    let grid = null;
    let runKey = null;
    let run = null;

    function options(state) {
      return { fee: state.settings.fee, start: state.settings.start };
    }

    // Fiyatlar: hazır piyasada (id, tohum), kendi fiyatlarında ise nesnenin kendisi anahtardır.
    function getPrices(state) {
      const key = state.marketId === 'custom' && state.custom ? state.custom : state.marketId + ':' + state.seed;
      if (key !== pricesKey) {
        prices = state.marketId === 'custom' && state.custom
          ? state.custom.prices
          : ns.markets.buildMarket(state.marketId, state.seed);
        cache = ns.indicators.createIndicatorCache(prices);
        pricesKey = key;
        // Fiyat değişince bağlı her şey geçersizdir.
        gridKey = null;
        runKey = null;
      }
      return prices;
    }

    function getGrid(state) {
      const p = getPrices(state);
      const key = state.strategyId + '|' + state.settings.fee + '|' + state.settings.start;
      if (key !== gridKey) {
        grid = ns.sweep.runGrid(p, ns.strategies.findStrategy(state.strategyId), options(state), cache);
        gridKey = key;
      }
      return grid;
    }

    function getRun(state) {
      const p = getPrices(state);
      const strategy = ns.strategies.findStrategy(state.strategyId);
      const params = state.params[strategy.id];
      const key = strategy.id + '|' + JSON.stringify(params) + '|' + state.settings.fee + '|' + state.settings.start;
      if (key !== runKey) {
        run = ns.engine.runRule(p, strategy, params, options(state), cache);
        runKey = key;
      }
      return run;
    }

    // Haritadaki en iyi hücrenin ayarları; hiç geçerli hücre yoksa null.
    function getBestParams(state) {
      const g = getGrid(state);
      if (g.bestIndex < 0) return null;
      const strategy = ns.strategies.findStrategy(state.strategyId);
      return ns.sweep.cellParams(strategy, Math.floor(g.bestIndex / g.cols), g.bestIndex % g.cols);
    }

    return { getPrices, getGrid, getRun, getBestParams, options };
  }

  ns.model = { createModel };
  if (typeof module !== 'undefined') module.exports = ns.model;
})();
