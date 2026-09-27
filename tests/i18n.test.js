'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { test } = require('./harness');
const { i18n, format, strategies, markets } = globalThis.IfOnly;

const en = i18n.STRINGS.en;
const tr = i18n.STRINGS.tr;

test('both languages have exactly the same keys', () => {
  const missingInTr = Object.keys(en).filter((k) => !(k in tr));
  const missingInEn = Object.keys(tr).filter((k) => !(k in en));
  assert.deepStrictEqual(missingInTr, [], 'missing in tr');
  assert.deepStrictEqual(missingInEn, [], 'missing in en');
});

test('placeholders match between languages', () => {
  const names = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
  for (const key of Object.keys(en)) assert.strictEqual(names(tr[key]), names(en[key]), key);
});

test('no string is empty and Turkish strings are not left in English', () => {
  for (const key of Object.keys(en)) {
    assert.ok(en[key].trim(), 'empty en ' + key);
    assert.ok(tr[key].trim(), 'empty tr ' + key);
  }
  // Uzun cümlelerin iki dilde aynı kalması çevrilmeyi unuttuğumuzu gösterir.
  const same = Object.keys(en).filter((k) => en[k] === tr[k] && en[k].length > 12);
  assert.deepStrictEqual(same, []);
});

test('every market, rule and knob has a label in the dictionary', () => {
  for (const preset of markets.PRESETS) {
    assert.ok(en['market.' + preset.id + '.name'] && en['market.' + preset.id + '.blurb'], preset.id);
  }
  for (const s of strategies.STRATEGIES) {
    for (const suffix of ['name', 'blurb', 'sentence']) assert.ok(en['rule.' + s.id + '.' + suffix], s.id + suffix);
    for (const p of s.params) {
      assert.ok(en['param.' + s.id + '.' + p.key], s.id + '.' + p.key);
      assert.ok(en['rule.' + s.id + '.sentence'].includes('{' + p.key + '}'), 'sentence uses ' + p.key);
    }
  }
});

test('every key used in index.html exists', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const used = [...html.matchAll(/data-i18n(?:-placeholder|-title|-aria)?="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(used.length > 30);
  for (const key of used) assert.ok(key in en, key);
});

test('every literal key used in the scripts exists', () => {
  const root = path.join(__dirname, '..', 'js');
  const files = ['app.js', 'ui/panels.js', 'ui/charts.js', 'ui/heatmap.js', 'ui/luck.js', 'ui/controls.js', 'format.js'];
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    for (const m of source.matchAll(/\bt\('([a-z]+\.[\w.]*\w)'/g)) assert.ok(m[1] in en, file + ': ' + m[1]);
  }
});

test('translation fills placeholders and falls back safely', () => {
  i18n.setLang('en');
  assert.strictEqual(i18n.t('chart.year', { n: 3 }), 'Year 3');
  assert.strictEqual(i18n.t('no.such.key'), 'no.such.key');
  assert.strictEqual(i18n.t('chart.year'), 'Year {n}');
  i18n.setLang('tr');
  assert.strictEqual(i18n.t('chart.year', { n: 3 }), '3. yıl');
  i18n.setLang('xx');
  assert.strictEqual(i18n.getLang(), 'en');
});

test('language is detected from the browser setting', () => {
  assert.strictEqual(i18n.detectLang('tr-TR'), 'tr');
  assert.strictEqual(i18n.detectLang('TR'), 'tr');
  assert.strictEqual(i18n.detectLang('en-GB'), 'en');
  assert.strictEqual(i18n.detectLang(undefined), 'en');
});

test('numbers follow the chosen language', () => {
  i18n.setLang('en');
  assert.strictEqual(format.coins(1234.4), '1,234');
  assert.strictEqual(format.signedPercent(0.12), '+12%');
  i18n.setLang('tr');
  assert.strictEqual(format.coins(1234.4), '1.234');
  assert.strictEqual(format.percent(0.12), '%12');
  assert.strictEqual(format.coins(NaN), format.DASH);
  const days = strategies.findStrategy('trend').params[0];
  assert.strictEqual(format.paramValue(days, 18), '18 gün');
  i18n.setLang('en');
});
