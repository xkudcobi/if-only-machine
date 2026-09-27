'use strict';
const assert = require('assert');
const { test, memoryStorage } = require('./harness');
const { state: S, storage, strategies, model: M } = globalThis.IfOnly;

const fresh = () => S.initialState('en');

test('initial state opens on a filled example', () => {
  const s = fresh();
  assert.strictEqual(s.marketId, S.DEFAULT_MARKET);
  assert.strictEqual(s.strategyId, S.DEFAULT_STRATEGY);
  for (const strategy of strategies.STRATEGIES) assert.ok(s.params[strategy.id]);
  assert.strictEqual(S.initialState('de').lang, 'en');
});

test('unknown or no-op actions return the very same object', () => {
  const s = fresh();
  assert.strictEqual(S.reduce(s, { type: 'nope' }), s);
  assert.strictEqual(S.reduce(s, { type: 'market', marketId: 'moon' }), s);
  assert.strictEqual(S.reduce(s, { type: 'market', marketId: s.marketId }), s);
  assert.strictEqual(S.reduce(s, { type: 'market', marketId: 'custom' }), s, 'no custom prices loaded yet');
  assert.strictEqual(S.reduce(s, { type: 'lang', lang: 'fr' }), s);
  assert.strictEqual(S.reduce(s, { type: 'params', params: { ...s.params.trend } }), s);
});

test('reducer never mutates the previous state', () => {
  const s = fresh();
  const before = JSON.stringify(s);
  S.reduce(s, { type: 'params', params: { fast: 40 } });
  S.reduce(s, { type: 'settings', settings: { fee: 0.01 } });
  S.reduce(s, { type: 'strategy', strategyId: 'dip' });
  assert.strictEqual(JSON.stringify(s), before);
});

test('params are snapped to the grid for the active rule only', () => {
  let s = S.reduce(fresh(), { type: 'strategy', strategyId: 'dip' });
  s = S.reduce(s, { type: 'params', params: { drop: 0.2001 } });
  assert.ok(strategies.paramValues(strategies.findStrategy('dip').params[0]).includes(s.params.dip.drop));
  assert.deepStrictEqual(s.params.trend, fresh().params.trend);
});

test('settings are clamped to sane ranges', () => {
  let s = S.reduce(fresh(), { type: 'settings', settings: { fee: 5, start: -3 } });
  assert.strictEqual(s.settings.fee, S.FEE_MAX);
  assert.strictEqual(s.settings.start, 1);
  s = S.reduce(s, { type: 'settings', settings: { fee: 'x' } });
  assert.strictEqual(s.settings.fee, S.FEE_MAX);
});

test('custom prices switch the market; reshuffle is ignored there', () => {
  const prices = Float64Array.from({ length: 100 }, (_, i) => 10 + i);
  let s = S.reduce(fresh(), { type: 'custom', prices, dates: null });
  assert.strictEqual(s.marketId, 'custom');
  assert.strictEqual(S.reduce(s, { type: 'reshuffle' }), s);
  s = S.reduce(s, { type: 'market', marketId: 'steady' });
  s = S.reduce(s, { type: 'reshuffle' });
  assert.strictEqual(s.seed, 2);
  assert.strictEqual(S.reduce(fresh(), { type: 'custom', prices: new Float64Array(5) }).marketId, S.DEFAULT_MARKET);
});

test('store notifies subscribers only on real changes', () => {
  const store = S.createStore(fresh());
  let calls = 0;
  const off = store.subscribe(() => calls++);
  store.dispatch({ type: 'strategy', strategyId: 'bounce' });
  store.dispatch({ type: 'strategy', strategyId: 'bounce' });
  assert.strictEqual(calls, 1);
  off();
  store.dispatch({ type: 'strategy', strategyId: 'dip' });
  assert.strictEqual(calls, 1);
});

test('share links round-trip the setup', () => {
  let s = S.reduce(fresh(), { type: 'market', marketId: 'moody' });
  s = S.reduce(s, { type: 'reshuffle', seed: 12 });
  s = S.reduce(s, { type: 'strategy', strategyId: 'breakout' });
  s = S.reduce(s, { type: 'params', params: { entry: 60, exit: 10 } });
  s = S.reduce(s, { type: 'settings', settings: { fee: 0.005, start: 2500 } });
  const back = S.reduce(fresh(), { type: 'snapshot', snapshot: storage.decodeHash(storage.encodeHash(s)) });
  assert.strictEqual(back.marketId, 'moody');
  assert.strictEqual(back.seed, 12);
  assert.strictEqual(back.strategyId, 'breakout');
  assert.deepStrictEqual(back.params.breakout, s.params.breakout);
  assert.deepStrictEqual(back.settings, s.settings);
});

test('broken links decode to null or get repaired', () => {
  assert.strictEqual(storage.decodeHash(''), null);
  assert.strictEqual(storage.decodeHash('#hello'), null);
  assert.strictEqual(storage.decodeHash('#m=moon&r=trend'), null);
  const snap = storage.decodeHash('#m=steady&r=dip&a=x&b=&f=abc&s=-4');
  const s = S.reduce(fresh(), { type: 'snapshot', snapshot: snap });
  assert.strictEqual(s.marketId, 'steady');
  assert.deepStrictEqual(s.params.dip, strategies.defaultParams(strategies.findStrategy('dip')));
  assert.strictEqual(s.seed, 1);
  assert.strictEqual(s.settings.fee, fresh().settings.fee);
});

test('saved slots: save, overwrite by name, list newest first, delete', () => {
  const store = memoryStorage();
  const s = fresh();
  assert.deepStrictEqual(storage.listSlots(store), []);
  assert.ok(storage.saveSlot(store, '  first  ', s, 1).ok);
  assert.ok(storage.saveSlot(store, 'second', S.reduce(s, { type: 'strategy', strategyId: 'dip' }), 2).ok);
  assert.ok(storage.saveSlot(store, 'first', s, 3).ok);
  assert.deepStrictEqual(storage.listSlots(store).map((x) => x.name), ['first', 'second']);
  assert.strictEqual(storage.findSlot(store, 'second').snapshot.strategyId, 'dip');
  assert.strictEqual(storage.saveSlot(store, '   ', s).ok, false);
  assert.ok(storage.deleteSlot(store, 'first'));
  assert.strictEqual(storage.deleteSlot(store, 'first'), false);
  assert.strictEqual(storage.listSlots(store).length, 1);
});

test('custom prices survive a save and load', () => {
  const store = memoryStorage();
  const prices = Float64Array.from({ length: 90 }, (_, i) => 1 + i / 3);
  const s = S.reduce(fresh(), { type: 'custom', prices, dates: null });
  storage.saveLast(store, s);
  const back = S.reduce(fresh(), { type: 'snapshot', snapshot: storage.loadLast(store) });
  assert.strictEqual(back.marketId, 'custom');
  assert.strictEqual(back.custom.prices.length, 90);
  assert.ok(Math.abs(back.custom.prices[10] - prices[10]) < 1e-5);
});

test('storage failures never throw', () => {
  const broken = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('quota');
    }
  };
  assert.strictEqual(storage.loadLang(broken), null);
  assert.strictEqual(storage.loadLast(broken), null);
  assert.deepStrictEqual(storage.listSlots(broken), []);
  assert.strictEqual(storage.saveSlot(broken, 'x', fresh()).ok, false);
  assert.strictEqual(storage.saveLang(broken, 'tr'), false);
  assert.strictEqual(storage.loadLast(null), null);
  const corrupt = memoryStorage();
  corrupt.setItem(storage.KEYS.slots, '{not json');
  assert.deepStrictEqual(storage.listSlots(corrupt), []);
});

test('model memoizes: moving a knob does not rerun the whole map', () => {
  const model = M.createModel();
  let s = fresh();
  const grid = model.getGrid(s);
  const run = model.getRun(s);
  assert.strictEqual(model.getGrid(s), grid);
  s = S.reduce(s, { type: 'params', params: { fast: 30 } });
  assert.strictEqual(model.getGrid(s), grid);
  assert.notStrictEqual(model.getRun(s), run);
  s = S.reduce(s, { type: 'reshuffle' });
  assert.notStrictEqual(model.getGrid(s), grid);
  assert.ok(model.getBestParams(s));
});
