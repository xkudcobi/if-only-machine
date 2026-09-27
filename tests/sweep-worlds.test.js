'use strict';
const assert = require('assert');
const { test, near } = require('./harness');
const { sweep, worlds, strategies, engine, markets, rng } = globalThis.IfOnly;

const options = { fee: 0.002, start: 1000 };

test('the grid has one cell per combination and marks impossible ones', () => {
  const prices = markets.buildMarket('steady', 2);
  const trend = strategies.findStrategy('trend');
  const grid = sweep.runGrid(prices, trend, options);
  assert.strictEqual(grid.edges.length, grid.rows * grid.cols);
  let invalid = 0;
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const i = r * grid.cols + c;
      const p = sweep.cellParams(trend, r, c);
      if (p.fast >= p.slow) {
        invalid++;
        assert.strictEqual(grid.valid[i], 0);
        assert.ok(Number.isNaN(grid.edges[i]));
      }
    }
  }
  assert.strictEqual(grid.validCount, grid.rows * grid.cols - invalid);
});

test('each grid cell agrees with running that rule on its own', () => {
  const prices = markets.buildMarket('rollercoaster', 4);
  for (const strategy of strategies.STRATEGIES) {
    const grid = sweep.runGrid(prices, strategy, options);
    for (const [r, c] of [[0, 0], [5, 17], [grid.rows - 1, grid.cols - 1]]) {
      const i = r * grid.cols + c;
      if (!grid.valid[i]) continue;
      const single = engine.runRule(prices, strategy, sweep.cellParams(strategy, r, c), options);
      near(grid.finalValues[i], single.stats.finalValue, 1e-6, strategy.id);
    }
  }
});

test('best index really is the best, and cellOf inverts cellParams', () => {
  const prices = markets.buildMarket('sideways', 1);
  const bounce = strategies.findStrategy('bounce');
  const grid = sweep.runGrid(prices, bounce, options);
  for (let i = 0; i < grid.edges.length; i++) if (grid.valid[i]) assert.ok(grid.edges[i] <= grid.edges[grid.bestIndex]);
  const cell = sweep.cellOf(bounce, sweep.cellParams(bounce, 7, 11));
  assert.deepStrictEqual(cell, { row: 7, col: 11 });
});

test('a history shorter than every warm-up leaves the whole grid empty', () => {
  const prices = Float64Array.from({ length: 4 }, (_, i) => 100 + i);
  const grid = sweep.runGrid(prices, strategies.findStrategy('breakout'), options);
  assert.strictEqual(grid.validCount, 0);
  assert.strictEqual(grid.bestIndex, -1);
});

test('resampling keeps length and start, and only reuses real daily moves', () => {
  const prices = markets.buildMarket('slump', 1);
  const returns = worlds.logReturns(prices);
  const out = new Float64Array(prices.length);
  worlds.resampleInto(returns, prices[0], rng.createRng(1), 20, out);
  assert.strictEqual(out[0], prices[0]);
  const known = new Set(Array.from(returns, (r) => r.toFixed(10)));
  for (let t = 1; t < out.length; t++) assert.ok(known.has(Math.log(out[t] / out[t - 1]).toFixed(10)));
});

test('a worlds run is repeatable, finishes stepwise and reports shares in [0, 1]', () => {
  const prices = markets.buildMarket('bubble', 1);
  const trend = strategies.findStrategy('trend');
  const config = { prices, strategy: trend, params: strategies.defaultParams(trend), compareParams: { fast: 3, slow: 20 }, options, count: 40, seed: 9 };
  const a = worlds.createWorldsRun(config).runAll();
  const b = worlds.createWorldsRun(config).runAll();
  assert.deepStrictEqual(a.rule.edges, b.rule.edges);
  assert.strictEqual(a.done, 40);
  assert.ok(a.rule.beatShare >= 0 && a.rule.beatShare <= 1);
  assert.strictEqual(a.compare.edges.length, 40);
  assert.ok(a.samples.length > 0);

  const stepped = worlds.createWorldsRun(config);
  let guard = 0;
  while (!stepped.step(0) && guard++ < 1000);
  assert.deepStrictEqual(stepped.summary().rule.edges, a.rule.edges);
  assert.strictEqual(stepped.progress(), 1);
});

test('verdict thresholds', () => {
  assert.strictEqual(worlds.verdict(0.3, 0.8), 'skill');
  assert.strictEqual(worlds.verdict(0.3, 0.5), 'coin');
  assert.strictEqual(worlds.verdict(0.3, 0.1), 'luck');
  assert.strictEqual(worlds.verdict(-0.3, 0.1), 'loser');
  assert.strictEqual(worlds.verdict(0.3, NaN), 'unknown');
});

test('histogram counts everything and clamps outliers into the edge bins', () => {
  const bins = worlds.histogram([-5, 0.1, 0.2, 0.9, 7], 4, 0, 1);
  assert.deepStrictEqual(Array.from(bins), [3, 0, 0, 2]);
  assert.strictEqual(worlds.median([3, 1, 2]), 2);
  assert.strictEqual(worlds.median([4, 1, 2, 3]), 2.5);
  assert.ok(Number.isNaN(worlds.median([])));
});
