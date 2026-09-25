// Uydurma ama gerçekçi davranan piyasa geçmişleri üretir.
// Her piyasa bir "dönemler" listesidir: her dönemin kendi yönü, oynaklığı ve ani sıçramaları vardır.
(function () {
  'use strict';
  const ns = (globalThis.IfOnly = globalThis.IfOnly || {});

  // Bir yılda yaklaşık 250 işlem günü var; yıllık değerleri günlüğe çevirmek için kullanılır.
  const DAYS_PER_YEAR = 250;
  const DT = 1 / DAYS_PER_YEAR;
  const START_PRICE = 100;

  // Hazır piyasa senaryoları. drift = yıllık eğilim, vol = yıllık oynaklık,
  // pull > 0 ise fiyat dönemin başladığı seviyeye doğru geri çekilir (yatay piyasa).
  const PRESETS = [
    {
      id: 'steady',
      icon: '🌤',
      segments: [{ days: 1250, drift: 0.1, vol: 0.13 }]
    },
    {
      id: 'rollercoaster',
      icon: '🎢',
      segments: [{ days: 1250, drift: 0.05, vol: 0.42, jumpChance: 0.012, jumpSize: 0.07 }]
    },
    {
      id: 'bubble',
      icon: '🫧',
      segments: [
        { days: 380, drift: 0.12, vol: 0.18 },
        { days: 330, drift: 0.9, vol: 0.28 },
        { days: 160, drift: -1.5, vol: 0.5, jumpChance: 0.03, jumpSize: 0.06 },
        { days: 380, drift: 0.03, vol: 0.28 }
      ]
    },
    {
      id: 'slump',
      icon: '🌧',
      segments: [
        { days: 240, drift: 0.06, vol: 0.16 },
        { days: 620, drift: -0.34, vol: 0.26, jumpChance: 0.006, jumpSize: 0.05 },
        { days: 390, drift: 0.16, vol: 0.2 }
      ]
    },
    {
      id: 'sideways',
      icon: '〰',
      segments: [{ days: 1250, drift: 0, vol: 0.26, pull: 4 }]
    },
    {
      id: 'moody',
      icon: '🌗',
      // Bu piyasa sabit dönemler yerine sakin ve gergin ruh halleri arasında rastgele geçiş yapar.
      moods: {
        days: 1250,
        calm: { drift: 0.16, vol: 0.12 },
        nervous: { drift: -0.28, vol: 0.38, jumpChance: 0.015, jumpSize: 0.05 },
        // Günlük ruh hali değiştirme olasılıkları.
        calmToNervous: 0.008,
        nervousToCalm: 0.02
      }
    }
  ];

  function findPreset(id) {
    return PRESETS.find((p) => p.id === id) || null;
  }

  // Tek bir günlük log-getiri adımı. Sıçrama işareti yazı-tura ile seçilir ama aşağı yönlü biraz daha olasıdır.
  function dailyStep(rng, regime) {
    const drift = regime.drift || 0;
    const vol = regime.vol || 0;
    let step = (drift - 0.5 * vol * vol) * DT + vol * Math.sqrt(DT) * rng.normal();
    if (regime.jumpChance && rng.next() < regime.jumpChance) {
      const direction = rng.next() < 0.6 ? -1 : 1;
      step += direction * regime.jumpSize * (0.5 + rng.next());
    }
    return step;
  }

  function totalDays(preset) {
    if (preset.moods) return preset.moods.days;
    return preset.segments.reduce((sum, s) => sum + s.days, 0);
  }

  // Hazır bir senaryodan ve tohumdan fiyat dizisi üretir. Aynı (id, seed) her zaman aynı sonucu verir.
  function buildMarket(presetId, seed) {
    const preset = findPreset(presetId);
    if (!preset) throw new Error('unknown market: ' + presetId);
    const rng = ns.rng.createRng(presetId + ':' + seed);
    const n = totalDays(preset);
    const prices = new Float64Array(n);
    let logPrice = Math.log(START_PRICE);
    prices[0] = START_PRICE;

    if (preset.moods) {
      const m = preset.moods;
      let nervous = false;
      for (let t = 1; t < n; t++) {
        // Ruh hali değişimi bir Markov zinciri gibi işler.
        const flip = nervous ? m.nervousToCalm : m.calmToNervous;
        if (rng.next() < flip) nervous = !nervous;
        logPrice += dailyStep(rng, nervous ? m.nervous : m.calm);
        prices[t] = Math.exp(logPrice);
      }
    } else {
      let t = 1;
      for (const segment of preset.segments) {
        // Geri çekilme hedefi dönemin başındaki seviyedir.
        const anchor = logPrice;
        // İlk dönemin ilk günü zaten START_PRICE, o yüzden bir gün eksik ilerler.
        const end = Math.min(n, t + segment.days - (t === 1 ? 1 : 0));
        for (; t < end; t++) {
          let step = dailyStep(rng, segment);
          if (segment.pull) step += segment.pull * (anchor - logPrice) * DT;
          logPrice += step;
          prices[t] = Math.exp(logPrice);
        }
      }
    }
    return prices;
  }

  // Grafikler için küçük bir önizleme: fiyat dizisini `points` noktaya indirger.
  function downsample(prices, points) {
    const count = Math.max(2, Math.min(points, prices.length));
    const out = new Float64Array(count);
    for (let i = 0; i < count; i++) {
      out[i] = prices[Math.round((i * (prices.length - 1)) / (count - 1))];
    }
    return out;
  }

  ns.markets = { PRESETS, DAYS_PER_YEAR, START_PRICE, findPreset, buildMarket, downsample, totalDays };
  if (typeof module !== 'undefined') module.exports = ns.markets;
})();
