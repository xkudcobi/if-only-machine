// Bir kuralın bütün ayar kombinasyonlarını tek seferde dener ve ısı haritası için sonuç tablosu üretir.
// Performans notu: tek bir pozisyon tamponu ve tek bir gösterge önbelleği yeniden kullanılır,
// her kombinasyon için yalnızca sayılar hesaplanır, bakiye eğrisi saklanmaz.
(function () {
  'use strict';
  const ns = (globalThis.IfOnly = globalThis.IfOnly || {});

  function now() {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  // Izgara indisinden ayar nesnesine: index = satır * sütunSayısı + sütun.
  function cellParams(strategy, rowIndex, colIndex) {
    const [rowParam, colParam] = strategy.params;
    return {
      [rowParam.key]: ns.strategies.paramValues(rowParam)[rowIndex],
      [colParam.key]: ns.strategies.paramValues(colParam)[colIndex]
    };
  }

  // Ayar nesnesinden ızgaradaki hücreye.
  function cellOf(strategy, params) {
    const [rowParam, colParam] = strategy.params;
    return {
      row: ns.strategies.nearestIndex(rowParam, params[rowParam.key]),
      col: ns.strategies.nearestIndex(colParam, params[colParam.key])
    };
  }

  function runGrid(prices, strategy, options, cache) {
    const started = now();
    const n = prices.length;
    const indicatorCache = cache || ns.indicators.createIndicatorCache(prices);
    const [rowParam, colParam] = strategy.params;
    const rowValues = ns.strategies.paramValues(rowParam);
    const colValues = ns.strategies.paramValues(colParam);
    const rows = rowValues.length;
    const cols = colValues.length;
    const size = rows * cols;

    const finalValues = new Float64Array(size).fill(NaN);
    const edges = new Float64Array(size).fill(NaN);
    const trades = new Uint16Array(size);
    const valid = new Uint8Array(size);
    const positions = new Uint8Array(n);
    const hold = ns.engine.simulate(prices, ns.engine.holdPositions(n), options, null);
    // Tek ayar nesnesi döngü boyunca yeniden kullanılır.
    const params = {};

    let bestIndex = -1;
    let worstIndex = -1;
    let validCount = 0;
    let beatCount = 0;
    for (let r = 0; r < rows; r++) {
      params[rowParam.key] = rowValues[r];
      for (let c = 0; c < cols; c++) {
        params[colParam.key] = colValues[c];
        const index = r * cols + c;
        // Isınma süresi fiyat geçmişinden uzunsa ya da ayarlar çelişiyorsa hücre boş kalır.
        if (!strategy.isValid(params) || strategy.warmup(params) >= n) continue;
        strategy.fill(indicatorCache, params, positions);
        const stats = ns.engine.simulate(prices, positions, options, null);
        valid[index] = 1;
        validCount++;
        finalValues[index] = stats.finalValue;
        edges[index] = stats.finalValue / hold.finalValue - 1;
        trades[index] = Math.min(65535, stats.trades);
        if (edges[index] > 0) beatCount++;
        if (bestIndex < 0 || edges[index] > edges[bestIndex]) bestIndex = index;
        if (worstIndex < 0 || edges[index] < edges[worstIndex]) worstIndex = index;
      }
    }

    return {
      strategyId: strategy.id,
      rows,
      cols,
      rowValues,
      colValues,
      finalValues,
      edges,
      trades,
      valid,
      validCount,
      beatCount,
      bestIndex,
      worstIndex,
      hold,
      elapsedMs: now() - started
    };
  }

  // Geçerli hücrelerdeki farkların ortancası; "tipik bir ayar ne yapardı" sorusunun cevabı.
  function medianEdge(grid) {
    const list = [];
    for (let i = 0; i < grid.edges.length; i++) if (grid.valid[i]) list.push(grid.edges[i]);
    return ns.worlds.median(list);
  }

  ns.sweep = { runGrid, cellParams, cellOf, medianEdge };
  if (typeof module !== 'undefined') module.exports = ns.sweep;
})();
