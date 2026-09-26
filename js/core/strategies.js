// Oyuncunun seçebileceği basit kurallar. Her kural iki ayarlı bir düğmedir;
// fiyat dizisine bakıp her gün için "elimde olsun mu (1) olmasın mı (0)" kararını yazar.
(function () {
  'use strict';
  const ns = (globalThis.IfOnly = globalThis.IfOnly || {});

  // Her ayar ızgarada bu kadar adıma bölünür; 24 x 24 = 576 farklı kural aynı anda denenir.
  const GRID_STEPS = 24;

  // Ayarın alabileceği değerleri üretir. Gün cinsinden ayarlar tam sayıya yuvarlanır.
  function paramValues(param) {
    const steps = param.steps || GRID_STEPS;
    const values = [];
    for (let i = 0; i < steps; i++) {
      const raw = param.min + ((param.max - param.min) * i) / (steps - 1);
      values.push(param.kind === 'days' ? Math.round(raw) : Math.round(raw * 1000) / 1000);
    }
    return values;
  }

  // Verilen değere en yakın ızgara indisini bulur (kaydırıcı ile ısı haritası aynı noktayı göstersin diye).
  function nearestIndex(param, value) {
    const values = paramValues(param);
    let best = 0;
    for (let i = 1; i < values.length; i++) {
      if (Math.abs(values[i] - value) < Math.abs(values[best] - value)) best = i;
    }
    return best;
  }

  // "Yükselişi takip et": kısa dönem ortalaması uzun dönem ortalamasının üstündeyse elde tut.
  const trend = {
    id: 'trend',
    icon: '📈',
    params: [
      { key: 'fast', kind: 'days', min: 3, max: 72, fallback: 18 },
      { key: 'slow', kind: 'days', min: 20, max: 250, fallback: 90 }
    ],
    // Kısa pencere uzundan kısa olmalı; aksi halde kural anlamsızdır ve haritada gri görünür.
    isValid: (p) => p.fast < p.slow,
    warmup: (p) => p.slow,
    fill(cache, p, out) {
      const fastMean = cache.get('mean', p.fast);
      const slowMean = cache.get('mean', p.slow);
      const n = out.length;
      for (let t = 0; t < n; t++) {
        // NaN karşılaştırması her zaman false döner, yani pencere dolana kadar dışarıda beklenir.
        out[t] = fastMean[t] > slowMean[t] ? 1 : 0;
      }
    }
  };

  // "Düşüşte al": fiyat son 60 günün zirvesinden yeterince düşünce al, hedef kâra ulaşınca sat.
  const DIP_LOOKBACK = 60;
  const dip = {
    id: 'dip',
    icon: '🛒',
    params: [
      { key: 'drop', kind: 'percent', min: 0.03, max: 0.4, fallback: 0.13 },
      { key: 'gain', kind: 'percent', min: 0.03, max: 0.6, fallback: 0.2 }
    ],
    isValid: () => true,
    // Pencere dolmadan da çalışabilir (aşağıya bakın), o yüzden ısınma süresi yok sayılacak kadar kısadır.
    warmup: () => 1,
    fill(cache, p, out) {
      const prices = cache.prices;
      const recentHigh = cache.get('max', DIP_LOOKBACK);
      const n = out.length;
      let holding = 0;
      let entryPrice = 0;
      // İlk 60 günde pencere henüz dolmamıştır; o sürede "şimdiye kadarki en yüksek" kullanılır.
      // Aksi halde kısa fiyat listelerinde kural hiç alım yapamazdı.
      let highSoFar = 0;
      for (let t = 0; t < n; t++) {
        const price = prices[t];
        if (price > highSoFar) highSoFar = price;
        const high = recentHigh[t] === recentHigh[t] ? recentHigh[t] : highSoFar;
        if (holding) {
          // Hedef kâra ulaşınca sat.
          if (price >= entryPrice * (1 + p.gain)) holding = 0;
        } else if (price <= high * (1 - p.drop)) {
          // Zirveden yeterince düştüyse al ve alış fiyatını hatırla.
          holding = 1;
          entryPrice = price;
        }
        out[t] = holding;
      }
    }
  };

  // "Yeni zirveleri kovala": son N günün en yükseğini geçince al, son M günün en düşüğünü kırınca sat.
  const breakout = {
    id: 'breakout',
    icon: '🚀',
    params: [
      { key: 'entry', kind: 'days', min: 5, max: 120, fallback: 40 },
      { key: 'exit', kind: 'days', min: 5, max: 120, fallback: 20 }
    ],
    isValid: () => true,
    warmup: (p) => Math.max(p.entry, p.exit) + 1,
    fill(cache, p, out) {
      const prices = cache.prices;
      const highs = cache.get('max', p.entry);
      const lows = cache.get('min', p.exit);
      const n = out.length;
      let holding = 0;
      out[0] = 0;
      for (let t = 1; t < n; t++) {
        // Bugünü değil, dünden geriye bakan pencereyi kullanırız; yoksa fiyat kendi zirvesini hiç geçemez.
        if (!holding && prices[t] > highs[t - 1]) holding = 1;
        else if (holding && prices[t] < lows[t - 1]) holding = 0;
        out[t] = holding;
      }
    }
  };

  // "Geri sekmeye oyna": fiyat ortalamasının çok altına inince al, ortalamaya dönünce sat.
  const bounce = {
    id: 'bounce',
    icon: '🏀',
    params: [
      { key: 'window', kind: 'days', min: 10, max: 160, fallback: 40 },
      { key: 'depth', kind: 'ratio', min: 0.4, max: 3, fallback: 1.5 }
    ],
    isValid: () => true,
    warmup: (p) => p.window,
    fill(cache, p, out) {
      const prices = cache.prices;
      const mean = cache.get('mean', p.window);
      const spread = cache.get('std', p.window);
      const n = out.length;
      let holding = 0;
      for (let t = 0; t < n; t++) {
        const m = mean[t];
        if (m === m) {
          // m === m, NaN değilse doğrudur; pencere dolmadan hiçbir şey yapılmaz.
          if (!holding && prices[t] < m - p.depth * spread[t]) holding = 1;
          else if (holding && prices[t] >= m) holding = 0;
        }
        out[t] = holding;
      }
    }
  };

  const STRATEGIES = [trend, dip, breakout, bounce];

  function findStrategy(id) {
    return STRATEGIES.find((s) => s.id === id) || null;
  }

  // Varsayılan ayarlar: her ayarın fallback değerine en yakın ızgara noktası.
  function defaultParams(strategy) {
    const params = {};
    for (const param of strategy.params) {
      params[param.key] = paramValues(param)[nearestIndex(param, param.fallback)];
    }
    return params;
  }

  // Dışarıdan gelen (ör. kayıttan okunan) ayarları ızgaraya oturtur, bozuk değerleri varsayılana çeker.
  function normalizeParams(strategy, raw) {
    const params = {};
    const defaults = defaultParams(strategy);
    for (const param of strategy.params) {
      // Boş metin ve null, Number() ile 0 olurdu; bunlar da "değer yok" sayılır.
      const input = raw ? raw[param.key] : undefined;
      const value = input === null || input === '' ? NaN : Number(input);
      params[param.key] = Number.isFinite(value)
        ? paramValues(param)[nearestIndex(param, value)]
        : defaults[param.key];
    }
    return params;
  }

  ns.strategies = { STRATEGIES, GRID_STEPS, findStrategy, paramValues, nearestIndex, defaultParams, normalizeParams };
  if (typeof module !== 'undefined') module.exports = ns.strategies;
})();
