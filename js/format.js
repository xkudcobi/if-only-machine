// Sayıları seçili dile göre biçimlendirir: "1,234" / "1.234", "12%" / "%12".
(function () {
  'use strict';
  const ns = (globalThis.IfOnly = globalThis.IfOnly || {});

  const LOCALES = { en: 'en-US', tr: 'tr-TR' };
  // Intl biçimleyicileri pahalıdır; dil ve seçenek başına bir kez kurulur.
  const cache = new Map();

  function formatter(kind, options) {
    const lang = ns.i18n.getLang();
    const key = lang + ':' + kind;
    let f = cache.get(key);
    if (!f) {
      f = new Intl.NumberFormat(LOCALES[lang] || 'en-US', options);
      cache.set(key, f);
    }
    return f;
  }

  function isNumber(v) {
    return typeof v === 'number' && Number.isFinite(v);
  }

  const DASH = '—';

  function coins(v) {
    return isNumber(v) ? formatter('coins', { maximumFractionDigits: 0 }).format(v) : DASH;
  }

  function price(v) {
    if (!isNumber(v)) return DASH;
    // Küçük fiyatlarda kuruş önemlidir, büyüklerde kalabalık yapar.
    return Math.abs(v) >= 1000
      ? formatter('price0', { maximumFractionDigits: 0 }).format(v)
      : formatter('price2', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  }

  function percent(v) {
    if (!isNumber(v)) return DASH;
    // Çok küçük yüzdelerde bir ondalık gösterilir; yoksa "0%" yanıltıcı olur.
    return Math.abs(v) < 0.1 && v !== 0
      ? formatter('pct1', { style: 'percent', maximumFractionDigits: 1 }).format(v)
      : formatter('pct0', { style: 'percent', maximumFractionDigits: 0 }).format(v);
  }

  function signedPercent(v) {
    if (!isNumber(v)) return DASH;
    const text = percent(Math.abs(v));
    if (Math.abs(v) < 0.0005) return text;
    return (v > 0 ? '+' : '−') + text;
  }

  // İşlem masrafı gibi çok küçük oranlar için iki ondalıklı yüzde: "0.25%" / "%0,25".
  function finePercent(v) {
    return isNumber(v) ? formatter('pctFine', { style: 'percent', maximumFractionDigits: 2 }).format(v) : DASH;
  }

  function decimal(v, digits) {
    if (!isNumber(v)) return DASH;
    return formatter('dec' + digits, { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(v);
  }

  function integer(v) {
    return isNumber(v) ? formatter('int', { maximumFractionDigits: 0 }).format(v) : DASH;
  }

  // Kural ayarını insan diline çevirir: "18 gün", "%13", "1,5 katı".
  function paramValue(param, value) {
    if (param.kind === 'days') return ns.i18n.t('unit.days', { n: integer(value) });
    if (param.kind === 'percent') return percent(value);
    return ns.i18n.t('unit.times', { n: decimal(value, 2) });
  }

  // Cümle içinde kullanılan kısa hali: gün sayısı yalın, gerisi paramValue ile aynı.
  function paramInline(param, value) {
    return param.kind === 'days' ? integer(value) : paramValue(param, value);
  }

  ns.format = { coins, price, percent, signedPercent, finePercent, decimal, integer, paramValue, paramInline, DASH };
  if (typeof module !== 'undefined') module.exports = ns.format;
})();
