// Metin ağırlıklı paneller: üstteki hikâye cümlesi, rakamlar tablosu, kayıt listesi ve durum mesajları.
(function () {
  'use strict';
  const ns = (globalThis.IfOnly = globalThis.IfOnly || {});
  const t = (key, vars) => ns.i18n.t(key, vars);

  // Elde tutmaya göre %1'den küçük fark "başa baş" sayılır.
  const TIE = 0.01;

  function renderStory(els, run, state) {
    const f = ns.format;
    const strategy = ns.strategies.findStrategy(state.strategyId);
    const rule = f.coins(run.stats.finalValue);
    const hold = f.coins(run.hold.finalValue);
    let headline;
    let mood;
    if (!run.valid) {
      headline = t('story.invalid');
      mood = 'invalid';
    } else if (run.stats.trades === 0) {
      headline = t('story.never', { start: f.coins(run.stats.start) });
      mood = 'lose';
    } else if (Math.abs(run.edge) < TIE) {
      headline = t('story.tie', { rule });
      mood = 'tie';
    } else if (run.edge > 0) {
      headline = t('story.win', { rule, hold });
      mood = 'win';
    } else {
      headline = t('story.lose', { rule, hold });
      mood = 'lose';
    }
    els.headline.textContent = headline;
    els.headline.dataset.mood = mood;
    els.sub.textContent = t('story.sub', {
      start: f.coins(run.stats.start),
      years: f.decimal((run.equity.length - 1) / ns.markets.DAYS_PER_YEAR, 1),
      // Tekil/çoğul: İngilizcede 'once' ile '3 times' farklı kelimeler.
      times: run.stats.trades === 1 ? t('story.once') : t('story.times', { n: f.integer(run.stats.trades) }),
      exposure: f.percent(run.stats.exposure)
    });
    els.badge.textContent = run.valid ? f.signedPercent(run.edge) : f.DASH;
    els.badge.dataset.mood = mood;
    els.ruleName.textContent = strategy.icon + ' ' + t('rule.' + strategy.id + '.name');
  }

  // Rakamlar tablosu: her satır [etiket, kural değeri, elde tutma değeri].
  function renderNumbers(tbody, run) {
    const f = ns.format;
    const s = run.stats;
    const h = run.hold;
    const rows = [
      ['row.final', f.coins(s.finalValue), f.coins(h.finalValue)],
      ['row.yearly', f.signedPercent(s.yearlyReturn), f.signedPercent(h.yearlyReturn)],
      ['row.drop', f.percent(s.maxDrawdown), f.percent(h.maxDrawdown)],
      ['row.trades', f.integer(s.trades), f.integer(h.trades)],
      ['row.wins', f.percent(s.winRate), f.percent(h.winRate)],
      ['row.exposure', f.percent(s.exposure), f.percent(h.exposure)],
      ['row.bumpy', f.percent(s.bumpiness), f.percent(h.bumpiness)]
    ];
    tbody.textContent = '';
    for (const [key, a, b] of rows) {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = t(key);
      const tdA = document.createElement('td');
      tdA.textContent = a;
      const tdB = document.createElement('td');
      tdB.textContent = b;
      tr.append(th, tdA, tdB);
      tbody.append(tr);
    }
  }

  function renderSlots(list, slots, handlers) {
    list.textContent = '';
    if (!slots.length) {
      const empty = document.createElement('li');
      empty.className = 'slot-empty';
      empty.textContent = t('save.empty');
      list.append(empty);
      return;
    }
    const dateFormat = new Intl.DateTimeFormat(ns.i18n.getLang() === 'tr' ? 'tr-TR' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' });
    for (const slot of slots) {
      const li = document.createElement('li');
      li.className = 'slot';
      const name = document.createElement('span');
      name.className = 'slot-name';
      name.textContent = slot.name;
      const when = document.createElement('span');
      when.className = 'slot-date';
      when.textContent = Number.isFinite(slot.savedAt) ? dateFormat.format(new Date(slot.savedAt)) : '';
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'small';
      open.textContent = t('save.open');
      open.addEventListener('click', () => handlers.onOpen(slot.name));
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'small ghost';
      del.textContent = t('save.delete');
      del.addEventListener('click', () => handlers.onDelete(slot.name));
      li.append(name, when, open, del);
      list.append(li);
    }
  }

  // Kısa süreli durum mesajı. Mesaj bir anahtar + değişkenler olarak saklanır ki dil değişince yeniden çevrilsin.
  function createStatus(node) {
    let current = null;
    let timer = 0;
    function paint() {
      node.textContent = current ? t(current.key, current.vars) : '';
      node.dataset.kind = current ? current.kind : '';
    }
    return {
      show(key, vars, kind, sticky) {
        current = { key, vars, kind: kind || 'info' };
        paint();
        clearTimeout(timer);
        if (!sticky) {
          timer = setTimeout(() => {
            current = null;
            paint();
          }, 6000);
        }
      },
      clear() {
        current = null;
        paint();
      },
      repaint: paint
    };
  }

  ns.panels = { renderStory, renderNumbers, renderSlots, createStatus };
})();
