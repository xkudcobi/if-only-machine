// Kullanıcının yapıştırdığı ya da sürüklediği fiyat listesini okur.
// Kabul edilenler: tek sütun fiyat, "tarih,fiyat", başlıklı tablolar, ; veya sekme ayraçlı dosyalar,
// Türkçe/Avrupa biçimli sayılar (1.234,56). Hatalar kod + satır numarasıyla fırlatılır,
// böylece arayüz iki dilde anlaşılır bir mesaj gösterebilir.
(function () {
  'use strict';
  const ns = (globalThis.IfOnly = globalThis.IfOnly || {});

  const MIN_ROWS = 60;
  const MAX_ROWS = 20000;
  // Başlıkta fiyat sütununu bulmak için bakılan adlar (küçük harfle).
  const PRICE_HEADERS = ['close', 'adj close', 'adj_close', 'price', 'kapanış', 'kapanis', 'fiyat', 'son', 'value', 'değer'];

  function csvError(code, line) {
    const error = new Error('csv:' + code + (line ? '@' + line : ''));
    error.code = code;
    error.line = line || 0;
    return error;
  }

  // Satırdaki en sık ayracı seçer; hiçbiri yoksa satır tek sütundur.
  function detectDelimiter(line) {
    const candidates = ['\t', ';', ','];
    let best = null;
    let bestCount = 0;
    for (const d of candidates) {
      const count = line.split(d).length - 1;
      if (count > bestCount) {
        best = d;
        bestCount = count;
      }
    }
    return best;
  }

  // "1.234,56", "1,234.56", "1234.56", "1234,56", "$1,234" gibi biçimleri sayıya çevirir.
  function parseNumber(raw, delimiter) {
    let text = String(raw).trim().replace(/^"|"$/g, '').replace(/[\s$€£₺]/g, '');
    if (!text) return NaN;
    const lastComma = text.lastIndexOf(',');
    const lastDot = text.lastIndexOf('.');
    if (lastComma >= 0 && lastDot >= 0) {
      // İkisi de varsa sonda olan ondalık ayırıcıdır.
      text = lastComma > lastDot ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '');
    } else if (lastComma >= 0) {
      // Yalnızca virgül: ayraç virgül değilse ondalık virgülüdür.
      text = delimiter === ',' ? text.replace(/,/g, '') : text.replace(',', '.');
    }
    if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(text)) return NaN;
    return Number(text);
  }

  // Tarih gibi görünen bir hücreyi zaman damgasına çevirir; anlaşılmazsa NaN.
  function parseDate(raw) {
    const text = String(raw).trim().replace(/^"|"$/g, '');
    let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(text);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
    m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/.exec(text);
    if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1]);
    return NaN;
  }

  function splitLine(line, delimiter) {
    return delimiter ? line.split(delimiter) : [line];
  }

  function parsePrices(text) {
    if (typeof text !== 'string' || !text.trim()) throw csvError('empty');
    // Satır sonları normalize edilir, boş satırlar ve # ile başlayan notlar atlanır.
    const lines = [];
    const rawLines = text.replace(/\r\n?/g, '\n').split('\n');
    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      if (line && line[0] !== '#') lines.push({ text: line, number: i + 1 });
    }
    if (!lines.length) throw csvError('empty');

    const delimiter = detectDelimiter(lines[0].text);
    let priceColumn = -1;
    let dateColumn = -1;
    let first = 0;

    // Başlık satırı var mı? İlk satırda hiç sayı yoksa başlıktır.
    const headerCells = splitLine(lines[0].text, delimiter).map((c) => c.trim().replace(/^"|"$/g, '').toLowerCase());
    const headerHasNumber = headerCells.some((c) => Number.isFinite(parseNumber(c, delimiter)));
    if (!headerHasNumber) {
      first = 1;
      priceColumn = headerCells.findIndex((c) => PRICE_HEADERS.includes(c));
      dateColumn = headerCells.findIndex((c) => ['date', 'tarih', 'time', 'zaman', 'gün', 'day'].includes(c));
    }

    // Başlıktan bulunamadıysa ilk veri satırındaki son sayısal sütun fiyat kabul edilir.
    if (first < lines.length) {
      const sample = splitLine(lines[first].text, delimiter);
      if (priceColumn < 0) {
        for (let c = sample.length - 1; c >= 0; c--) {
          if (Number.isFinite(parseNumber(sample[c], delimiter)) && !Number.isFinite(parseDate(sample[c]))) {
            priceColumn = c;
            break;
          }
        }
      }
      if (dateColumn < 0 && sample.length > 1 && Number.isFinite(parseDate(sample[0]))) dateColumn = 0;
    }
    if (priceColumn < 0) throw csvError('noPriceColumn', lines[first] ? lines[first].number : 1);

    const count = lines.length - first;
    if (count > MAX_ROWS) throw csvError('tooLong');
    const prices = new Float64Array(count);
    const dates = dateColumn >= 0 ? new Array(count) : null;
    for (let i = 0; i < count; i++) {
      const line = lines[first + i];
      const cells = splitLine(line.text, delimiter);
      const value = parseNumber(cells[priceColumn] === undefined ? '' : cells[priceColumn], delimiter);
      if (!Number.isFinite(value)) throw csvError('badNumber', line.number);
      if (value <= 0) throw csvError('nonPositive', line.number);
      prices[i] = value;
      if (dates) dates[i] = parseDate(cells[dateColumn] || '');
    }
    if (count < MIN_ROWS) throw csvError('tooShort');

    // Tarihler yeniden eskiye sıralıysa (çoğu sitenin indirdiği biçim) ters çevrilir.
    let reversed = false;
    if (dates && Number.isFinite(dates[0]) && Number.isFinite(dates[count - 1]) && dates[0] > dates[count - 1]) {
      prices.reverse();
      dates.reverse();
      reversed = true;
    }
    return { prices, dates, reversed };
  }

  ns.csv = { MIN_ROWS, MAX_ROWS, parsePrices, parseNumber, parseDate, detectDelimiter };
  if (typeof module !== 'undefined') module.exports = ns.csv;
})();
