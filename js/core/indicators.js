// Kuralların baktığı yardımcı seriler: hareketli ortalama, en yüksek, en düşük ve oynaklık.
// Hepsi O(n) çalışır; binlerce kural denenirken aynı pencere bir kez hesaplanıp önbellekte tutulur.
(function () {
  'use strict';
  const ns = (globalThis.IfOnly = globalThis.IfOnly || {});

  // Pencere dolmadan önceki günlerde değer yoktur; NaN "henüz bilinmiyor" anlamına gelir.
  function checkWindow(window) {
    if (!Number.isInteger(window) || window < 1) throw new Error('window must be a positive integer');
  }

  // Kayan toplam ile hareketli ortalama.
  function rollingMean(values, window, out) {
    checkWindow(window);
    const n = values.length;
    const result = out || new Float64Array(n);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += values[i];
      if (i >= window) sum -= values[i - window];
      result[i] = i >= window - 1 ? sum / window : NaN;
    }
    return result;
  }

  // Hareketli standart sapma. Sayısal taşmayı azaltmak için değerler ilk elemana göre kaydırılır.
  function rollingStd(values, window, out) {
    checkWindow(window);
    const n = values.length;
    const result = out || new Float64Array(n);
    const shift = n > 0 ? values[0] : 0;
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      const v = values[i] - shift;
      sum += v;
      sumSq += v * v;
      if (i >= window) {
        const old = values[i - window] - shift;
        sum -= old;
        sumSq -= old * old;
      }
      if (i >= window - 1) {
        const mean = sum / window;
        // Yuvarlama hatası yüzünden varyans çok küçük negatif çıkabilir; sıfırda kırpılır.
        const variance = Math.max(0, sumSq / window - mean * mean);
        result[i] = Math.sqrt(variance);
      } else {
        result[i] = NaN;
      }
    }
    return result;
  }

  // Tek yönlü kuyruk (monotonic deque) ile kayan en yüksek/en düşük. `better(a, b)` true ise a, b'yi gölgeler.
  function rollingExtreme(values, window, out, better) {
    checkWindow(window);
    const n = values.length;
    const result = out || new Float64Array(n);
    // Kuyruk, dizideki indisleri tutar; baş ve son işaretçileri ile halka gibi değil düz dizi gibi kullanılır.
    const queue = new Int32Array(n);
    let head = 0;
    let tail = 0;
    for (let i = 0; i < n; i++) {
      // Yeni değerin gölgelediği eski adaylar artık hiç kazanamaz, atılır.
      while (tail > head && !better(values[queue[tail - 1]], values[i])) tail--;
      queue[tail++] = i;
      // Pencereden çıkan indis baştan atılır.
      if (queue[head] <= i - window) head++;
      result[i] = i >= window - 1 ? values[queue[head]] : NaN;
    }
    return result;
  }

  // Eşitlikte yeni değer eskisini gölgeler; sonuç değişmez ama kuyruk kısa kalır.
  const rollingMax = (values, window, out) => rollingExtreme(values, window, out, (a, b) => a > b);
  const rollingMin = (values, window, out) => rollingExtreme(values, window, out, (a, b) => a < b);

  const BUILDERS = { mean: rollingMean, std: rollingStd, max: rollingMax, min: rollingMin };

  // Bir fiyat dizisi için göstergeleri bir kez hesaplayıp saklayan önbellek.
  function createIndicatorCache(prices) {
    const store = new Map();
    return {
      prices,
      get(kind, window) {
        const key = kind + ':' + window;
        let series = store.get(key);
        if (!series) {
          const build = BUILDERS[kind];
          if (!build) throw new Error('unknown indicator: ' + kind);
          series = build(prices, window);
          store.set(key, series);
        }
        return series;
      },
      size() {
        return store.size;
      }
    };
  }

  ns.indicators = { rollingMean, rollingStd, rollingMax, rollingMin, createIndicatorCache };
  if (typeof module !== 'undefined') module.exports = ns.indicators;
})();
