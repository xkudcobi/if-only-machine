'use strict';
const assert = require('assert');
const { test, near } = require('./harness');
const { indicators, rng } = globalThis.IfOnly;

// Karşılaştırma için bilerek yavaş ve açık yazılmış referans hesaplar.
function naive(values, window, reducer) {
  return values.map((_, i) => (i < window - 1 ? NaN : reducer(values.slice(i - window + 1, i + 1))));
}
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const std = (xs) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) * (b - m), 0) / xs.length);
};

function randomSeries(n, seed) {
  const r = rng.createRng(seed);
  const out = [];
  let p = 100;
  for (let i = 0; i < n; i++) {
    p *= 1 + r.normal() * 0.02;
    out.push(p);
  }
  return out;
}

function compare(fast, slow) {
  assert.strictEqual(fast.length, slow.length);
  for (let i = 0; i < slow.length; i++) {
    if (Number.isNaN(slow[i])) assert.ok(Number.isNaN(fast[i]), 'expected NaN at ' + i);
    else near(fast[i], slow[i], 1e-7, 'index ' + i);
  }
}

test('rolling mean matches a naive average for several windows', () => {
  const values = randomSeries(300, 'mean');
  for (const w of [1, 2, 7, 50, 300]) compare(indicators.rollingMean(values, w), naive(values, w, mean));
});

test('rolling std matches a naive standard deviation', () => {
  const values = randomSeries(260, 'std');
  for (const w of [2, 10, 60]) compare(indicators.rollingStd(values, w), naive(values, w, std));
});

test('rolling std of a constant series is exactly zero, never NaN from rounding', () => {
  const values = new Array(50).fill(123.456);
  const out = indicators.rollingStd(values, 10);
  for (let i = 9; i < 50; i++) assert.strictEqual(out[i], 0);
});

test('rolling max and min match naive versions, including ties', () => {
  const values = randomSeries(400, 'extreme').map((v) => Math.round(v));
  for (const w of [1, 3, 20, 99]) {
    compare(indicators.rollingMax(values, w), naive(values, w, (xs) => Math.max(...xs)));
    compare(indicators.rollingMin(values, w), naive(values, w, (xs) => Math.min(...xs)));
  }
});

test('window longer than the series gives all NaN', () => {
  const out = indicators.rollingMean([1, 2, 3], 5);
  assert.ok(Array.from(out).every(Number.isNaN));
});

test('bad windows are rejected', () => {
  assert.throws(() => indicators.rollingMean([1, 2], 0));
  assert.throws(() => indicators.rollingMax([1, 2], 1.5));
});

test('indicator cache computes each series once', () => {
  const cache = indicators.createIndicatorCache(Float64Array.from(randomSeries(100, 'cache')));
  const a = cache.get('mean', 10);
  const b = cache.get('mean', 10);
  assert.strictEqual(a, b);
  cache.get('max', 10);
  assert.strictEqual(cache.size(), 2);
  assert.throws(() => cache.get('median', 3));
});
