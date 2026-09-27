// "Paralel dünyalar": aynı piyasanın iniş çıkışlarını bloklar halinde karıştırıp
// benzer karakterde ama farklı sırada geçen yüzlerce alternatif geçmiş üretir.
// Bir kural bu dünyaların çoğunda da kazanıyorsa beceridir; yalnızca asıl geçmişte kazanıyorsa şanstır.
(function () {
  'use strict';
  const ns = (globalThis.IfOnly = globalThis.IfOnly || {});

  const DEFAULT_BLOCK = 20;
  // Grafikte gösterilecek örnek dünya sayısı ve her birinin nokta sayısı.
  const SAMPLE_COUNT = 6;
  const SAMPLE_POINTS = 160;

  function median(values) {
    if (!values.length) return NaN;
    const sorted = Array.from(values).sort((a, b) => a - b);
    const mid = sorted.length >> 1;
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // Günlük log-getiriler bir kez çıkarılır, her dünya için yeniden kullanılır.
  function logReturns(prices) {
    const out = new Float64Array(Math.max(0, prices.length - 1));
    for (let t = 1; t < prices.length; t++) out[t - 1] = Math.log(prices[t] / prices[t - 1]);
    return out;
  }

  // Blok karıştırma: rastgele bir yerden `block` günlük parçalar alınıp uç uca eklenir.
  // Blok kullanmak, trendlerin ve sakin/gergin dönemlerin kısa vadeli dokusunu korur.
  function resampleInto(returns, startPrice, rng, block, out) {
    const m = returns.length;
    const size = Math.max(1, Math.min(block, m));
    let logPrice = Math.log(startPrice);
    out[0] = startPrice;
    let t = 1;
    while (t <= m) {
      const from = rng.int(m - size + 1);
      for (let k = 0; k < size && t <= m; k++, t++) {
        logPrice += returns[from + k];
        out[t] = Math.exp(logPrice);
      }
    }
    return out;
  }

  // Parça parça ilerleyen bir deney: arayüz donmasın diye her karede birkaç dünya çalıştırılır.
  // Aynı nesne testlerde runAll() ile tek seferde bitirilebilir.
  function createWorldsRun(config) {
    const { prices, strategy, params, compareParams, options } = config;
    const count = Math.max(1, config.count || 200);
    const block = config.block || DEFAULT_BLOCK;
    const rng = ns.rng.createRng('worlds:' + (config.seed || 1));
    const n = prices.length;
    const returns = logReturns(prices);
    // Tamponlar bir kez ayrılır ve her dünyada üzerine yazılır.
    const worldPrices = new Float64Array(n);
    const positions = new Uint8Array(n);
    const holdPositions = ns.engine.holdPositions(n);
    const ruleEdges = new Float64Array(count);
    const compareEdges = compareParams ? new Float64Array(count) : null;
    const samples = [];
    let done = 0;

    function edgeFor(cache, holdFinal, p) {
      if (!strategy.isValid(p)) return NaN;
      strategy.fill(cache, p, positions);
      const stats = ns.engine.simulate(worldPrices, positions, options, null);
      return stats.finalValue / holdFinal - 1;
    }

    function runOne() {
      resampleInto(returns, prices[0], rng, block, worldPrices);
      // Her dünyanın kendi göstergeleri vardır; önbellek dünya başına yeniden kurulur.
      const cache = ns.indicators.createIndicatorCache(worldPrices);
      const holdFinal = ns.engine.simulate(worldPrices, holdPositions, options, null).finalValue;
      ruleEdges[done] = edgeFor(cache, holdFinal, params);
      if (compareEdges) compareEdges[done] = edgeFor(cache, holdFinal, compareParams);
      if (samples.length < SAMPLE_COUNT) samples.push(ns.markets.downsample(worldPrices, SAMPLE_POINTS));
      done++;
    }

    // En fazla `budgetMs` milisaniye çalışır; hepsi bitince true döner.
    function step(budgetMs) {
      const deadline = Date.now() + (budgetMs || 12);
      while (done < count) {
        runOne();
        if (Date.now() >= deadline) break;
      }
      return done >= count;
    }

    function summarize(edges) {
      const list = [];
      for (let i = 0; i < done; i++) if (edges[i] === edges[i]) list.push(edges[i]);
      let beat = 0;
      for (const e of list) if (e > 0) beat++;
      return { edges: list, beatShare: list.length ? beat / list.length : NaN, median: median(list) };
    }

    function summary() {
      return {
        done,
        count,
        rule: summarize(ruleEdges),
        compare: compareEdges ? summarize(compareEdges) : null,
        samples
      };
    }

    function runAll() {
      while (done < count) runOne();
      return summary();
    }

    return { step, runAll, summary, progress: () => done / count };
  }

  // Sonucu dört düz cümleden birine çevirir. Eşikler bilinçli olarak basit tutuldu.
  function verdict(originalEdge, beatShare) {
    if (!(beatShare === beatShare)) return 'unknown';
    if (beatShare >= 0.6) return 'skill';
    if (beatShare >= 0.4) return 'coin';
    return originalEdge > 0 ? 'luck' : 'loser';
  }

  // Histogram için kutucuklara böler. Aralık dışındaki değerler kenar kutularına sıkıştırılır.
  function histogram(values, binCount, lo, hi) {
    const bins = new Uint32Array(binCount);
    const width = (hi - lo) / binCount || 1;
    for (const v of values) {
      let b = Math.floor((v - lo) / width);
      if (b < 0) b = 0;
      if (b >= binCount) b = binCount - 1;
      bins[b]++;
    }
    return bins;
  }

  ns.worlds = { DEFAULT_BLOCK, median, logReturns, resampleInto, createWorldsRun, verdict, histogram };
  if (typeof module !== 'undefined') module.exports = ns.worlds;
})();
