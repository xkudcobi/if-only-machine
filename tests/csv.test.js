'use strict';
const assert = require('assert');
const { test } = require('./harness');
const { csv } = globalThis.IfOnly;

function lines(n, make) {
  return Array.from({ length: n }, (_, i) => make(i)).join('\n');
}

function day(i) {
  return new Date(Date.UTC(2020, 0, 1) + i * 86400000).toISOString().slice(0, 10);
}

test('a plain column of prices is read as-is', () => {
  const result = csv.parsePrices(lines(80, (i) => String(100 + i)));
  assert.strictEqual(result.prices.length, 80);
  assert.strictEqual(result.prices[0], 100);
  assert.strictEqual(result.dates, null);
});

test('a header row picks the close column, not the first number', () => {
  const text = 'Date,Open,High,Low,Close,Volume\n' + lines(70, (i) => `${day(i)},1,2,0.5,${50 + i},99999`);
  const result = csv.parsePrices(text);
  assert.strictEqual(result.prices[0], 50);
  assert.strictEqual(result.prices[69], 119);
  assert.ok(Number.isFinite(result.dates[0]));
});

test('newest-first files are flipped to oldest-first', () => {
  const text = 'tarih;fiyat\n' + lines(65, (i) => `${day(64 - i)};${(200 - i).toFixed(2).replace('.', ',')}`);
  const result = csv.parsePrices(text);
  assert.ok(result.reversed);
  assert.strictEqual(result.prices[0], 136);
  assert.ok(result.dates[0] < result.dates[64]);
});

test('Turkish and European number formats', () => {
  assert.strictEqual(csv.parseNumber('1.234,56', ';'), 1234.56);
  assert.strictEqual(csv.parseNumber('1,234.56', ','), 1234.56);
  assert.strictEqual(csv.parseNumber('12,5', ';'), 12.5);
  assert.strictEqual(csv.parseNumber('"₺ 1.000,5"', '\t'), 1000.5);
  assert.ok(Number.isNaN(csv.parseNumber('abc', ',')));
  assert.ok(Number.isNaN(csv.parseNumber('2024-01-02', ',')));
});

test('dates in both orders', () => {
  assert.strictEqual(csv.parseDate('2024-03-05'), Date.UTC(2024, 2, 5));
  assert.strictEqual(csv.parseDate('05.03.2024'), Date.UTC(2024, 2, 5));
  assert.ok(Number.isNaN(csv.parseDate('yesterday')));
});

test('blank lines, Windows line endings and # notes are ignored', () => {
  const text = '# my prices\r\n' + lines(61, (i) => String(10 + i)).replace(/\n/g, '\r\n\r\n');
  assert.strictEqual(csv.parsePrices(text).prices.length, 61);
});

test('errors carry a code and, when it makes sense, a line number', () => {
  const expectError = (text, code, line) => {
    try {
      csv.parsePrices(text);
      assert.fail('should have thrown ' + code);
    } catch (error) {
      assert.strictEqual(error.code, code);
      if (line) assert.strictEqual(error.line, line);
    }
  };
  expectError('', 'empty');
  expectError('   \n\n', 'empty');
  expectError(lines(10, (i) => String(i + 1)), 'tooShort');
  expectError(lines(80, (i) => (i === 41 ? 'oops' : String(i + 1))), 'badNumber', 42);
  expectError(lines(80, (i) => (i === 5 ? '0' : String(i + 1))), 'nonPositive', 6);
  expectError('name,colour\nx,y\nz,w', 'noPriceColumn');
  expectError(lines(csv.MAX_ROWS + 1, () => '1'), 'tooLong');
});
