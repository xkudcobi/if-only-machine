// Tohumlu (seed'li) rastgele sayı üreteci.
// Aynı tohum her seferinde aynı piyasa geçmişini üretsin diye Math.random yerine bunu kullanıyoruz.
(function () {
  'use strict';
  // Tüm modüller tek bir ortak ad alanına bağlanır; tarayıcıda window, Node'da globalThis.
  const ns = (globalThis.IfOnly = globalThis.IfOnly || {});

  // Metin ya da sayıyı 32 bitlik bir tohuma çevirir (FNV-1a karması).
  function hashSeed(value) {
    const text = String(value);
    let h = 2166136261 >>> 0;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    // Sıfır tohum mulberry32'de sorun çıkarmaz ama yine de ayırt edilebilir olsun.
    return h || 0x9e3779b9;
  }

  // mulberry32: küçük, hızlı ve istatistiksel olarak bu iş için yeterli bir üreteç.
  function createRng(seed) {
    let state = (typeof seed === 'number' ? seed >>> 0 : hashSeed(seed)) || 1;
    // Box-Muller iki normal sayı üretir; ikincisini bir sonraki çağrı için saklarız.
    let spareNormal = null;

    function next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    function normal() {
      if (spareNormal !== null) {
        const value = spareNormal;
        spareNormal = null;
        return value;
      }
      // log(0) olmasın diye u1 sıfırdan uzak tutulur.
      let u1 = next();
      while (u1 <= 1e-12) u1 = next();
      const u2 = next();
      const radius = Math.sqrt(-2 * Math.log(u1));
      spareNormal = radius * Math.sin(2 * Math.PI * u2);
      return radius * Math.cos(2 * Math.PI * u2);
    }

    // [0, max) aralığında tam sayı.
    function int(max) {
      return Math.floor(next() * max);
    }

    return { next, normal, int };
  }

  ns.rng = { createRng, hashSeed };
  if (typeof module !== 'undefined') module.exports = ns.rng;
})();
