'use strict';
const assert = require('assert');
const { test, near } = require('./harness');
const { engine, strategies, markets, indicators } = globalThis.IfOnly;

const noFee = { fee: 0, start: 1000 };

test('holding without fees tracks the price exactly', () => {
  const prices = Float64Array.from([100, 110, 99, 121]);
  const equity = new Float64Array(4);
  const stats = engine.simulate(prices, engine.holdPositions(4), noFee, equity);
  near(stats.finalValue, 1210);
  near(equity[1], 1100);
  near(equity[2], 990);
  assert.strictEqual(stats.trades, 1);
  near(stats.exposure, 1);
});

test('staying out keeps the coins untouched', () => {
  const prices = Float64Array.from([100, 50, 20, 300]);
  const stats = engine.simulate(prices, new Uint8Array(4), { fee: 0.01, start: 500 });
  assert.strictEqual(stats.finalValue, 500);
  assert.strictEqual(stats.trades, 0);
  assert.ok(Number.isNaN(stats.winRate));
  assert.strictEqual(stats.maxDrawdown, 0);
});

test('a position decided at day t only earns the move from t to t+1', () => {
  // Kural 1. gün kapanışında alır, 2. gün kapanışında satar: yalnızca 110 → 121 hareketini kazanır.
  const prices = Float64Array.from([100, 110, 121, 60]);
  const positions = Uint8Array.from([0, 1, 0, 0]);
  const stats = engine.simulate(prices, positions, noFee);
  near(stats.finalValue, 1100);
  assert.strictEqual(stats.trades, 1);
  near(stats.winRate, 1);
});

test('fees are charged on every buy and every sell', () => {
  const prices = Float64Array.from([100, 100, 100, 100, 100]);
  const positions = Uint8Array.from([1, 0, 1, 0, 0]);
  const stats = engine.simulate(prices, positions, { fee: 0.01, start: 1000 });
  near(stats.finalValue, 1000 * Math.pow(0.99, 4));
  assert.strictEqual(stats.trades, 2);
  // Düz fiyatta ücret yüzünden her işlem zararla kapanır.
  assert.strictEqual(stats.winRate, 0);
});

test('max drawdown measures the worst fall from a peak', () => {
  const prices = Float64Array.from([100, 200, 100, 150, 50, 400]);
  const stats = engine.simulate(prices, engine.holdPositions(6), noFee);
  near(stats.maxDrawdown, -0.75);
});

test('an open trade at the end counts as closed at the last price', () => {
  const prices = Float64Array.from([100, 90, 120]);
  const stats = engine.simulate(prices, Uint8Array.from([0, 1, 1]), noFee);
  assert.ok(stats.openAtEnd);
  near(stats.winRate, 1);
  near(stats.finalValue, 1000 * (120 / 90));
});

test('invalid inputs are rejected', () => {
  assert.throws(() => engine.simulate(Float64Array.from([1]), new Uint8Array(1), noFee));
  assert.throws(() => engine.simulate(Float64Array.from([1, 2]), new Uint8Array(1), noFee));
  assert.throws(() => engine.simulate(Float64Array.from([1, 2]), new Uint8Array(2), { fee: 1, start: 1 }));
  assert.throws(() => engine.simulate(Float64Array.from([1, 2]), new Uint8Array(2), { fee: 0, start: -5 }));
});

test('listTrades pairs every buy with its sell and flags the open one', () => {
  const prices = Float64Array.from([10, 11, 12, 13, 14, 15]);
  const trades = engine.listTrades(prices, Uint8Array.from([1, 1, 0, 0, 1, 1]));
  assert.deepStrictEqual(trades.map((t) => [t.entry, t.exit, t.open]), [[0, 2, false], [4, 5, true]]);
  near(trades[0].change, 0.2);
});

test('runRule reports the edge against holding and matches simulate', () => {
  const prices = markets.buildMarket('bubble', 3);
  const trend = strategies.findStrategy('trend');
  const params = strategies.defaultParams(trend);
  const result = engine.runRule(prices, trend, params, { fee: 0.002, start: 1000 });
  near(result.edge, result.stats.finalValue / result.hold.finalValue - 1, 1e-12);
  near(result.equity[prices.length - 1], result.stats.finalValue, 1e-9);
  assert.ok(result.valid);
});

test('no rule can see the future: changing tomorrow never changes today', () => {
  // Her kural için: fiyatların son kısmını değiştirmek, o güne kadarki kararları değiştirmemeli.
  const prices = markets.buildMarket('rollercoaster', 5);
  const cut = 700;
  const altered = Float64Array.from(prices);
  for (let t = cut + 1; t < altered.length; t++) altered[t] = altered[t] * (t % 2 ? 1.7 : 0.4);
  for (const strategy of strategies.STRATEGIES) {
    const params = strategies.defaultParams(strategy);
    const a = new Uint8Array(prices.length);
    const b = new Uint8Array(prices.length);
    strategy.fill(indicators.createIndicatorCache(prices), params, a);
    strategy.fill(indicators.createIndicatorCache(altered), params, b);
    for (let t = 0; t <= cut; t++) assert.strictEqual(a[t], b[t], strategy.id + ' peeked at day ' + t);
  }
});
