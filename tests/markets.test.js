'use strict';
const assert = require('assert');
const { test } = require('./harness');
const { markets, rng } = globalThis.IfOnly;

test('the random source is deterministic per seed and differs across seeds', () => {
  const a = rng.createRng('x');
  const b = rng.createRng('x');
  const c = rng.createRng('y');
  const seqA = [a.next(), a.next(), a.normal()];
  assert.deepStrictEqual(seqA, [b.next(), b.next(), b.normal()]);
  assert.notStrictEqual(seqA[0], c.next());
});

test('uniform numbers stay in [0, 1) and normals look normal', () => {
  const r = rng.createRng(42);
  let sum = 0;
  let sumSq = 0;
  const n = 20000;
  for (let i = 0; i < n; i++) {
    const u = r.next();
    assert.ok(u >= 0 && u < 1);
    const z = r.normal();
    sum += z;
    sumSq += z * z;
  }
  assert.ok(Math.abs(sum / n) < 0.05, 'mean near zero');
  assert.ok(Math.abs(sumSq / n - 1) < 0.05, 'variance near one');
});

test('every preset builds a positive series of the declared length', () => {
  for (const preset of markets.PRESETS) {
    const prices = markets.buildMarket(preset.id, 1);
    assert.strictEqual(prices.length, markets.totalDays(preset), preset.id);
    assert.strictEqual(prices[0], markets.START_PRICE);
    assert.ok(prices.every((p) => Number.isFinite(p) && p > 0), preset.id);
  }
});

test('same preset and seed give the same history; another seed gives another one', () => {
  const a = markets.buildMarket('moody', 7);
  const b = markets.buildMarket('moody', 7);
  const c = markets.buildMarket('moody', 8);
  assert.deepStrictEqual(Array.from(a), Array.from(b));
  assert.notDeepStrictEqual(Array.from(a), Array.from(c));
});

test('the bubble really inflates and pops', () => {
  const prices = markets.buildMarket('bubble', 1);
  const peak = Math.max(...prices);
  assert.ok(peak > 2 * markets.START_PRICE, 'should at least double');
  assert.ok(prices[prices.length - 1] < peak * 0.6, 'should fall well off the top');
});

test('unknown markets throw', () => {
  assert.throws(() => markets.buildMarket('moon', 1));
});

test('downsample keeps both ends', () => {
  const prices = Float64Array.from({ length: 1000 }, (_, i) => i + 1);
  const small = markets.downsample(prices, 10);
  assert.strictEqual(small.length, 10);
  assert.strictEqual(small[0], 1);
  assert.strictEqual(small[9], 1000);
});
