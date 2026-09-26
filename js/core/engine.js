// Kuralın verdiği "elde tut / tutma" kararlarını paraya çeviren simülasyon motoru.
// Kural: positions[t] = 1 ise t günü kapanışında alınmış (ya da tutuluyor) ve t+1 kapanışına kadar elde demektir.
// Karar yalnızca t gününe kadar bilinen fiyatlarla verilir, geleceğe bakılmaz.
(function () {
  'use strict';
  const ns = (globalThis.IfOnly = globalThis.IfOnly || {});

  const DEFAULT_OPTIONS = { fee: 0.002, start: 1000 };

  function readOptions(options) {
    const fee = options && Number.isFinite(options.fee) ? options.fee : DEFAULT_OPTIONS.fee;
    const start = options && Number.isFinite(options.start) ? options.start : DEFAULT_OPTIONS.start;
    if (fee < 0 || fee >= 1) throw new Error('fee must be in [0, 1)');
    if (start <= 0) throw new Error('start must be positive');
    return { fee, start };
  }

  // Tek geçişte bakiye eğrisini ve özet sayıları hesaplar.
  // `equityOut` verilirse günlük bakiye oraya yazılır; binlerce kural denerken null geçilip bellek ayrılmaz.
  function simulate(prices, positions, options, equityOut) {
    const { fee, start } = readOptions(options);
    const n = prices.length;
    if (n < 2) throw new Error('need at least two prices');
    if (positions.length < n) throw new Error('positions shorter than prices');

    let equity = start;
    let peak = start;
    let maxDrawdown = 0;
    let trades = 0;
    let wins = 0;
    let closedTrades = 0;
    let daysHeld = 0;
    let entryEquity = 0;
    // Günlük getirilerin ortalaması ve karesi; "iniş çıkış" (oynaklık) hesabı için.
    let sumReturn = 0;
    let sumReturnSq = 0;

    // İlk gün alım varsa ücret hemen kesilir.
    if (positions[0]) {
      entryEquity = equity;
      equity *= 1 - fee;
      trades++;
    }
    if (equityOut) equityOut[0] = equity;

    for (let t = 1; t < n; t++) {
      const before = equity;
      const held = positions[t - 1];
      if (held) {
        equity *= prices[t] / prices[t - 1];
        daysHeld++;
      }
      const now = positions[t];
      if (now !== held) {
        if (now) {
          // Alış: işlem ücreti kesilir, alış anındaki bakiye kazanç hesabı için saklanır.
          entryEquity = equity;
          trades++;
        }
        equity *= 1 - fee;
        if (!now) {
          // Satış: ücret sonrası bakiye alıştakinden büyükse işlem kazançlıdır.
          closedTrades++;
          if (equity > entryEquity) wins++;
        }
      }
      const dailyReturn = equity / before - 1;
      sumReturn += dailyReturn;
      sumReturnSq += dailyReturn * dailyReturn;
      if (equity > peak) peak = equity;
      const drawdown = equity / peak - 1;
      if (drawdown < maxDrawdown) maxDrawdown = drawdown;
      if (equityOut) equityOut[t] = equity;
    }

    // Dönem sonunda hâlâ eldeyse açık işlem, güncel değerle kazanç sayılır.
    const openAtEnd = positions[n - 1] === 1;
    if (openAtEnd) {
      closedTrades++;
      if (equity > entryEquity) wins++;
    }

    const steps = n - 1;
    const meanReturn = sumReturn / steps;
    const variance = Math.max(0, sumReturnSq / steps - meanReturn * meanReturn);
    const years = steps / ns.markets.DAYS_PER_YEAR;
    return {
      start,
      finalValue: equity,
      totalReturn: equity / start - 1,
      yearlyReturn: Math.pow(equity / start, 1 / years) - 1,
      maxDrawdown,
      trades,
      winRate: closedTrades > 0 ? wins / closedTrades : NaN,
      exposure: daysHeld / steps,
      bumpiness: Math.sqrt(variance) * Math.sqrt(ns.markets.DAYS_PER_YEAR),
      openAtEnd
    };
  }

  // "Hiçbir şey yapmadan elde tut" karşılaştırması: ilk gün al, hiç satma.
  function holdPositions(n) {
    return new Uint8Array(n).fill(1);
  }

  // Grafikte işaretlemek için alış-satış çiftlerini çıkarır.
  function listTrades(prices, positions) {
    const trades = [];
    const n = prices.length;
    let entry = -1;
    for (let t = 0; t < n; t++) {
      const now = positions[t];
      const before = t > 0 ? positions[t - 1] : 0;
      if (now && !before) entry = t;
      if (!now && before && entry >= 0) {
        trades.push({ entry, exit: t, change: prices[t] / prices[entry] - 1, open: false });
        entry = -1;
      }
    }
    if (entry >= 0) trades.push({ entry, exit: n - 1, change: prices[n - 1] / prices[entry] - 1, open: true });
    return trades;
  }

  // Tek bir kuralı tam ayrıntıyla çalıştırır: pozisyonlar, bakiye eğrisi, işlemler ve elde tutma kıyası.
  function runRule(prices, strategy, params, options, cache) {
    const n = prices.length;
    const indicatorCache = cache || ns.indicators.createIndicatorCache(prices);
    const positions = new Uint8Array(n);
    const equity = new Float64Array(n);
    const holdEquity = new Float64Array(n);
    const valid = strategy.isValid(params);
    if (valid) strategy.fill(indicatorCache, params, positions);
    const stats = simulate(prices, positions, options, equity);
    const hold = simulate(prices, holdPositions(n), options, holdEquity);
    return {
      valid,
      positions,
      equity,
      holdEquity,
      stats,
      hold,
      trades: listTrades(prices, positions),
      // Kuralın elde tutmaya göre farkı; oyunun asıl sorusu budur.
      edge: stats.finalValue / hold.finalValue - 1
    };
  }

  ns.engine = { DEFAULT_OPTIONS, simulate, holdPositions, listTrades, runRule };
  if (typeof module !== 'undefined') module.exports = ns.engine;
})();
