// Bağımlılıksız küçük test düzeneği: test() ile kaydet, run() ile çalıştır.
'use strict';
const path = require('path');

const tests = [];
let currentFile = '';

function test(name, fn) {
  tests.push({ name, fn, file: currentFile });
}

// Tarayıcıdaki <script> sırasıyla aynı sırada çekirdek modülleri yükler; hepsi globalThis.IfOnly'ye bağlanır.
function loadCore() {
  const root = path.join(__dirname, '..', 'js');
  const files = [
    'core/rng.js',
    'core/markets.js',
    'core/indicators.js',
    'core/strategies.js',
    'core/engine.js',
    'core/sweep.js',
    'core/worlds.js',
    'core/csv.js',
    'i18n.js',
    'format.js',
    'state.js',
    'storage.js',
    'model.js'
  ];
  for (const file of files) require(path.join(root, file));
  return globalThis.IfOnly;
}

// Kayan nokta karşılaştırması.
function near(actual, expected, tolerance, message) {
  const tol = tolerance === undefined ? 1e-9 : tolerance;
  if (!(Math.abs(actual - expected) <= tol)) {
    throw new Error((message || 'values differ') + ': expected ' + expected + ', got ' + actual);
  }
}

// Testlerde kullanılan basit, bellekte duran localStorage benzeri.
function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    size: () => map.size
  };
}

function setFile(name) {
  currentFile = name;
}

async function run() {
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log('  ok   ' + t.file + ' › ' + t.name);
    } catch (error) {
      failed++;
      console.log('  FAIL ' + t.file + ' › ' + t.name);
      console.log('       ' + (error && error.stack ? error.stack.split('\n').slice(0, 3).join('\n       ') : error));
    }
  }
  console.log('\n' + (tests.length - failed) + ' passed, ' + failed + ' failed, ' + tests.length + ' total');
  return failed;
}

module.exports = { test, loadCore, near, memoryStorage, setFile, run };
