// Kaydetme, yükleme ve paylaşım bağlantıları.
// Tarayıcı depolaması parametre olarak verilir; testlerde basit bir sahte nesne kullanılabilir.
(function () {
  'use strict';
  const ns = (globalThis.IfOnly = globalThis.IfOnly || {});

  const KEYS = { lang: 'ifonly.lang', last: 'ifonly.last', slots: 'ifonly.slots' };
  const SNAPSHOT_VERSION = 1;
  const MAX_SLOTS = 30;
  const MAX_NAME = 60;

  // Kendi fiyatları 6 anlamlı basamağa yuvarlanır; kayıt boyutu küçük kalır, sonuç değişmez sayılır.
  function roundPrice(p) {
    return Number(p.toPrecision(6));
  }

  function toSnapshot(state) {
    const snap = {
      v: SNAPSHOT_VERSION,
      marketId: state.marketId,
      seed: state.seed,
      strategyId: state.strategyId,
      params: state.params,
      settings: state.settings
    };
    if (state.custom) {
      snap.custom = {
        prices: Array.from(state.custom.prices, roundPrice),
        dates: state.custom.dates ? state.custom.dates.slice() : null
      };
    }
    return snap;
  }

  // Bozuk JSON ya da erişilemeyen depolama durumunda null döner, asla fırlatmaz.
  function readJson(storage, key) {
    try {
      const raw = storage && storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // Yazma başarısız olursa (kota dolu, gizli sekme) false döner.
  function writeJson(storage, key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function loadLang(storage) {
    try {
      const lang = storage && storage.getItem(KEYS.lang);
      return lang === 'tr' || lang === 'en' ? lang : null;
    } catch (e) {
      return null;
    }
  }

  function saveLang(storage, lang) {
    try {
      storage.setItem(KEYS.lang, lang);
      return true;
    } catch (e) {
      return false;
    }
  }

  function loadLast(storage) {
    return readJson(storage, KEYS.last);
  }

  function saveLast(storage, state) {
    return writeJson(storage, KEYS.last, toSnapshot(state));
  }

  function listSlots(storage) {
    const slots = readJson(storage, KEYS.slots);
    if (!Array.isArray(slots)) return [];
    return slots.filter((s) => s && typeof s.name === 'string' && s.snapshot && typeof s.snapshot === 'object');
  }

  function cleanName(name) {
    return String(name || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
  }

  // Aynı adla kayıt varsa üzerine yazılır; en yeni kayıt listenin başına gelir.
  function saveSlot(storage, name, state, now) {
    const clean = cleanName(name);
    if (!clean) return { ok: false, reason: 'name' };
    const slots = listSlots(storage).filter((s) => s.name !== clean);
    slots.unshift({ name: clean, savedAt: now || Date.now(), snapshot: toSnapshot(state) });
    const ok = writeJson(storage, KEYS.slots, slots.slice(0, MAX_SLOTS));
    return ok ? { ok: true, name: clean } : { ok: false, reason: 'storage' };
  }

  function deleteSlot(storage, name) {
    const slots = listSlots(storage);
    const kept = slots.filter((s) => s.name !== name);
    if (kept.length === slots.length) return false;
    return writeJson(storage, KEYS.slots, kept);
  }

  function findSlot(storage, name) {
    return listSlots(storage).find((s) => s.name === name) || null;
  }

  // Paylaşım bağlantısı: #m=bubble&s=3&r=trend&a=18&b=90&f=0.002&c=1000
  // Kendi fiyatları bağlantıya sığmaz; o durumda varsayılan piyasa yazılır.
  function encodeHash(state) {
    const strategy = ns.strategies.findStrategy(state.strategyId);
    const params = state.params[strategy.id];
    const marketId = state.marketId === 'custom' ? ns.state.DEFAULT_MARKET : state.marketId;
    const parts = [
      'm=' + marketId,
      's=' + state.seed,
      'r=' + strategy.id,
      'a=' + params[strategy.params[0].key],
      'b=' + params[strategy.params[1].key],
      'f=' + state.settings.fee,
      'c=' + state.settings.start
    ];
    return '#' + parts.join('&');
  }

  // Bağlantıyı bir anlık görüntüye çevirir. Tanınmayan bağlantıda null; kısmen bozuksa elde kalan kısım.
  function decodeHash(hash) {
    const text = String(hash || '').replace(/^#/, '');
    if (!text) return null;
    const fields = {};
    for (const pair of text.split('&')) {
      const eq = pair.indexOf('=');
      if (eq > 0) fields[pair.slice(0, eq)] = decodeURIComponent(pair.slice(eq + 1));
    }
    // Boş alanlar sıfır değil "yok" demektir; Number('') 0 verdiği için ayrıca kontrol edilir.
    const num = (v) => (v === undefined || v === '' ? NaN : Number(v));
    const strategy = ns.strategies.findStrategy(fields.r);
    if (!strategy || !ns.markets.findPreset(fields.m)) return null;
    const snap = {
      marketId: fields.m,
      strategyId: strategy.id,
      params: {
        [strategy.id]: {
          [strategy.params[0].key]: num(fields.a),
          [strategy.params[1].key]: num(fields.b)
        }
      },
      settings: { fee: num(fields.f), start: num(fields.c) }
    };
    const seed = num(fields.s);
    if (Number.isInteger(seed) && seed > 0) snap.seed = seed;
    return snap;
  }

  ns.storage = {
    KEYS,
    toSnapshot,
    loadLang,
    saveLang,
    loadLast,
    saveLast,
    listSlots,
    saveSlot,
    deleteSlot,
    findSlot,
    encodeHash,
    decodeHash
  };
  if (typeof module !== 'undefined') module.exports = ns.storage;
})();
