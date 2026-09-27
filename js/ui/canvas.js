// Canvas yardımcıları: keskin çizim için piksel yoğunluğu ayarı, ortak renkler ve eksen hesapları.
(function () {
  'use strict';
  const ns = (globalThis.IfOnly = globalThis.IfOnly || {});

  // Renkler CSS'teki değişkenlerle aynı tutulur; canvas CSS değişkeni okuyamadığı için burada da durur.
  const COLORS = {
    ink: '#1f2430',
    muted: '#7a7466',
    grid: 'rgba(31, 36, 48, 0.08)',
    paper: '#fffaf0',
    rule: '#2f8f63',
    ruleSoft: 'rgba(47, 143, 99, 0.13)',
    hold: '#8b8fa3',
    buy: '#2f8f63',
    sell: '#d9573f',
    worse: [217, 87, 63],
    neutral: [243, 234, 216],
    better: [47, 143, 99],
    invalid: '#ddd6c6',
    accent: '#f2b33d'
  };

  // Canvas'ı kapsayıcısının CSS boyutuna ve ekranın piksel yoğunluğuna uydurur.
  // Boyut değişmediyse yeniden ayırma yapmaz; her karede çağrılabilir.
  function fitCanvas(canvas) {
    const ratio = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(10, Math.round(rect.width));
    const height = Math.max(10, Math.round(rect.height));
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    return { ctx, width, height };
  }

  // Dizinin [from, to) aralığındaki en küçük ve en büyük değeri.
  function extent(values, from, to, into) {
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = from; i < to; i++) {
      const v = values[i];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    if (into) {
      if (lo < into[0]) into[0] = lo;
      if (hi > into[1]) into[1] = hi;
      return into;
    }
    return [lo, hi];
  }

  // Okunaklı eksen çizgileri: 1, 2, 2.5, 5 x 10^k adımları.
  function niceTicks(lo, hi, count) {
    if (!(hi > lo)) return [lo];
    const rough = (hi - lo) / Math.max(1, count);
    const power = Math.pow(10, Math.floor(Math.log10(rough)));
    const candidates = [1, 2, 2.5, 5, 10];
    let step = power;
    for (const c of candidates) {
      if (c * power >= rough) {
        step = c * power;
        break;
      }
    }
    const ticks = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) ticks.push(Math.round(v * 1e9) / 1e9);
    return ticks;
  }

  // İki RGB rengi arasında doğrusal karışım.
  function mix(a, b, t) {
    const k = Math.max(0, Math.min(1, t));
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * k) + ',' + Math.round(a[1] + (b[1] - a[1]) * k) + ',' + Math.round(a[2] + (b[2] - a[2]) * k) + ')';
  }

  // Elde tutmaya göre farkı renge çevirir: kırmızı ← krem → yeşil. `scale` rengin doygunlaştığı fark.
  function edgeColor(edge, scale) {
    if (!(edge === edge)) return COLORS.invalid;
    const t = Math.max(-1, Math.min(1, edge / (scale || 0.5)));
    // Karekök, küçük farkları da görünür kılar.
    const k = Math.sqrt(Math.abs(t));
    return t >= 0 ? mix(COLORS.neutral, COLORS.better, k) : mix(COLORS.neutral, COLORS.worse, k);
  }

  ns.canvas = { COLORS, fitCanvas, extent, niceTicks, mix, edgeColor };
})();
