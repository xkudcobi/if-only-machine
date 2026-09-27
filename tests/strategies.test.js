'use strict';
const assert = require('assert');
const { test } = require('./harness');
const { strategies, indicators } = globalThis.IfOnly;

function fillFor(id, prices, params) {
  const strategy = strategies.findStrategy(id);
  const out = new Uint8Array(prices.length);
  strategy.fill(indicators.createIndicatorCache(Float64Array.from(prices)), params, out);
  return Array.from(out);
}

test('parameter grids span min to max with the right number of steps', () => {
  for (const s of strategies.STRATEGIES) {
    for (const p of s.params) {
      const values = strategies.paramValues(p);
      assert.strictEqual(values.length, strategies.GRID_STEPS);
      assert.strictEqual(values[0], p.min);
      assert.strictEqual(values[values.length - 1], p.max);
      for (let i = 1; i < values.length; i++) assert.ok(values[i] > values[i - 1], s.id + '.' + p.key + ' not increasing');
    }
  }
});

test('default parameters sit on the grid and are valid', () => {
  for (const s of strategies.STRATEGIES) {
    const params = strategies.defaultParams(s);
    assert.ok(s.isValid(params), s.id);
    for (const p of s.params) assert.ok(strategies.paramValues(p).includes(params[p.key]));
  }
});

test('normalizeParams snaps to the grid and repairs garbage', () => {
  const trend = strategies.findStrategy('trend');
  const fixed = strategies.normalizeParams(trend, { fast: 'banana', slow: 91.2 });
  assert.strictEqual(fixed.fast, strategies.defaultParams(trend).fast);
  assert.ok(strategies.paramValues(trend.params[1]).includes(fixed.slow));
  assert.deepStrictEqual(strategies.normalizeParams(trend, null), strategies.defaultParams(trend));
});

test('trend rule refuses a short window that is not shorter than the long one', () => {
  const trend = strategies.findStrategy('trend');
  assert.strictEqual(trend.isValid({ fast: 50, slow: 50 }), false);
  assert.strictEqual(trend.isValid({ fast: 10, slow: 50 }), true);
});

test('trend rule is in only after both averages exist and the short one is higher', () => {
  const prices = [10, 10, 10, 11, 12, 13, 12, 9, 8];
  const out = fillFor('trend', prices, { fast: 2, slow: 3 });
  assert.deepStrictEqual(out, [0, 0, 0, 1, 1, 1, 1, 0, 0]);
});

test('dip rule buys after the drop and sells at the target gain', () => {
  const prices = [100, 100, 85, 80, 90, 97, 100];
  // Zirve 100; %15 düşüşte (85) al, %15 kârda (97,75 ve üstü) sat.
  const out = fillFor('dip', prices, { drop: 0.15, gain: 0.15 });
  assert.deepStrictEqual(out, [0, 0, 1, 1, 1, 1, 0]);
});

test('breakout rule buys above the previous high and sells below the previous low', () => {
  const prices = [10, 11, 10, 12, 13, 12, 11, 9, 10];
  // 3. gün 12, önceki iki günün zirvesini (11) geçer; 6. gün 11, önceki iki günün dibinin (12) altına iner.
  const out = fillFor('breakout', prices, { entry: 2, exit: 2 });
  assert.deepStrictEqual(out, [0, 0, 0, 1, 1, 1, 0, 0, 0]);
});

test('bounce rule buys well below the average and sells back at it', () => {
  const prices = [10, 10, 10, 10, 7, 8, 11, 11];
  const out = fillFor('bounce', prices, { window: 4, depth: 1 });
  assert.strictEqual(out[4], 1, 'should buy the sharp drop');
  assert.strictEqual(out[6], 0, 'should sell once back above average');
});

test('every rule writes only zeros and ones', () => {
  const prices = Array.from({ length: 300 }, (_, i) => 100 + 20 * Math.sin(i / 7) + i * 0.1);
  for (const s of strategies.STRATEGIES) {
    const out = fillFor(s.id, prices, strategies.defaultParams(s));
    assert.ok(out.every((v) => v === 0 || v === 1), s.id);
  }
});
