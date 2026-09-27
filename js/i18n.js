// Kullanıcının gördüğü bütün metinler burada, iki dilde durur.
// Kodun geri kalanı metin yazmaz; yalnızca anahtar ister: t('map.title').
(function () {
  'use strict';
  const ns = (globalThis.IfOnly = globalThis.IfOnly || {});

  const STRINGS = {
    en: {
      'app.title': 'If-Only Machine',
      'app.tagline': 'What if you had followed one simple rule? Replay it through years of market ups and downs — then find out whether it was skill or luck.',
      'lang.switch': 'Switch language',

      'step.market': '1. Pick a market',
      'step.rule': '2. Pick a rule',
      'step.tune': '3. Tune it',
      'market.reshuffle': '🎲 Another version',
      'market.reshuffleTitle': 'Same kind of market, different luck',
      'market.custom.name': 'Your prices',
      'market.custom.blurb': '{days} days you brought in.',
      'market.steady.name': 'Calm climb',
      'market.steady.blurb': 'Slowly goes up, few surprises.',
      'market.rollercoaster.name': 'Rollercoaster',
      'market.rollercoaster.blurb': 'Wild swings and sudden jumps both ways.',
      'market.bubble.name': 'Bubble and pop',
      'market.bubble.blurb': 'A mania that shoots up, then bursts.',
      'market.slump.name': 'Long slump',
      'market.slump.blurb': 'Drifts down for years, then recovers a bit.',
      'market.sideways.name': 'Going nowhere',
      'market.sideways.blurb': 'Bounces around the same level.',
      'market.moody.name': 'Moody',
      'market.moody.blurb': 'Calm stretches broken by nervous spells.',

      'rule.trend.name': 'Follow the trend',
      'rule.trend.blurb': 'Stay in while prices are generally rising.',
      'rule.trend.sentence': 'Own it while the {fast}-day average is above the {slow}-day average.',
      'rule.dip.name': 'Buy the dip',
      'rule.dip.blurb': 'Buy after a fall, sell after a gain.',
      'rule.dip.sentence': 'Buy when the price falls {drop} below its 60-day high. Sell once you are up {gain}.',
      'rule.breakout.name': 'Chase new highs',
      'rule.breakout.blurb': 'Jump in on records, bail out on new lows.',
      'rule.breakout.sentence': 'Buy when the price beats its {entry}-day high. Sell when it breaks its {exit}-day low.',
      'rule.bounce.name': 'Bet on a bounce',
      'rule.bounce.blurb': 'Buy when it looks too cheap, sell when it is back to normal.',
      'rule.bounce.sentence': 'Buy when the price sinks {depth} its usual wobble below the {window}-day average. Sell once it is back to average.',

      'param.trend.fast': 'Short average',
      'param.trend.slow': 'Long average',
      'param.dip.drop': 'Buy after a drop of',
      'param.dip.gain': 'Sell after a gain of',
      'param.breakout.entry': 'High over',
      'param.breakout.exit': 'Low over',
      'param.bounce.window': 'Average over',
      'param.bounce.depth': 'How far below',
      'unit.days': '{n} days',
      'unit.times': '{n}×',

      'story.win': 'The rule wins: {rule} coins, against {hold} for just holding.',
      'story.lose': 'Just holding wins: {hold} coins, against {rule} with the rule.',
      'story.tie': 'A dead heat: both end up near {rule} coins.',
      'story.sub': 'You start with {start} coins and {years} years of history. The rule bought {times} and was in the market {exposure} of the time.',
      'story.once': 'once',
      'story.times': '{n} times',
      'story.invalid': 'These two settings contradict each other: the short average has to be shorter than the long one.',
      'story.never': 'With these settings the rule never bought anything, so your {start} coins just sat still.',
      'story.replay': '▶ Replay',
      'story.pause': '❚❚ Pause',
      'story.best': '★ Jump to the best setting',

      'chart.price': 'Price',
      'chart.holding': 'Rule is holding',
      'chart.buy': 'buy',
      'chart.sell': 'sell',
      'chart.equityRule': 'Your coins with the rule',
      'chart.equityHold': 'Just holding',
      'chart.year': 'Year {n}',
      'chart.day': 'Day {n}',
      'chart.tip': '{day} · price {price} · rule {rule} · holding {hold}',

      'map.title': 'Every setting at once',
      'map.caption': 'Each square is one version of the rule. We tried {count} versions in {ms} ms, and {beat} of them beat just holding.',
      'map.worse': 'worse than holding',
      'map.better': 'better than holding',
      'map.invalid': 'not possible',
      'map.tip': '{a} · {b} → {coins} coins ({edge} vs holding)',
      'map.tipInvalid': '{a} · {b} → this combination does not make sense',
      'map.hint': 'Click a square to try it. Arrow keys work too.',
      'map.aria': 'Map of every setting. Use the arrow keys to move between settings.',

      'luck.title': 'Skill or luck?',
      'luck.intro': 'We shuffle this market\'s ups and downs into {count} parallel worlds that feel the same but play out differently, then run your rule in each one.',
      'luck.running': 'Visiting parallel worlds… {done} of {count}',
      'luck.verdict.skill': 'Looks like skill: your rule beat holding in {share} of the worlds.',
      'luck.verdict.coin': 'A coin flip: your rule beat holding in {share} of the worlds, about as often as not.',
      'luck.verdict.luck': 'Probably luck: it won in the real history, but in only {share} of the other worlds.',
      'luck.verdict.loser': 'Not a winner: it lost here, and beat holding in only {share} of the worlds.',
      'luck.verdict.unknown': 'This rule never gets to trade, so there is nothing to test.',
      'luck.best': 'The map\'s best square ({a} · {b}) beat holding in {share} of the worlds. Picking the winner after the fact is the oldest trap there is.',
      'luck.axis': 'better or worse than just holding →',
      'luck.zero': 'just holding',
      'luck.real': 'what really happened',
      'luck.rerun': '🌍 New worlds',
      'luck.samples': 'A few of the parallel worlds',

      'numbers.title': 'The numbers',
      'numbers.rule': 'With the rule',
      'numbers.hold': 'Just holding',
      'row.final': 'Coins at the end',
      'row.yearly': 'Average per year',
      'row.drop': 'Worst drop along the way',
      'row.trades': 'Times it bought',
      'row.wins': 'Trades that made money',
      'row.exposure': 'Time in the market',
      'row.bumpy': 'Bumpiness of the ride',

      'more.title': 'Use your own prices, change the costs, save your setups',
      'custom.title': 'Your own prices',
      'custom.help': 'Paste a list of prices, one per line, or a CSV with a date and a price column. Oldest-first and newest-first both work.',
      'custom.placeholder': '2024-01-02,101.5\n2024-01-03,102.1\n2024-01-04,100.8\n…',
      'custom.load': 'Use these prices',
      'custom.file': '…or open a file',
      'custom.ok': 'Loaded {days} days of prices.',
      'custom.reversed': 'Loaded {days} days of prices (flipped to oldest-first).',
      'csv.empty': 'There is nothing to read yet.',
      'csv.tooShort': 'Need at least {min} prices to say anything useful.',
      'csv.tooLong': 'That is more than {max} rows. Try a shorter stretch.',
      'csv.badNumber': 'Line {line} does not look like a price.',
      'csv.nonPositive': 'Line {line} has a price of zero or less.',
      'csv.noPriceColumn': 'Could not find a column with prices in it.',
      'csv.fileError': 'Could not read that file.',

      'settings.title': 'Costs',
      'settings.fee': 'Cost per trade',
      'settings.feeHelp': 'A small cut taken every time the rule buys or sells.',
      'settings.start': 'Starting coins',

      'save.title': 'Saved setups',
      'save.placeholder': 'Name this setup',
      'save.button': 'Save',
      'save.open': 'Open',
      'save.delete': 'Delete',
      'save.empty': 'Nothing saved yet.',
      'save.saved': 'Saved “{name}”.',
      'save.loaded': 'Opened “{name}”.',
      'save.defaultName': '{rule} on {market}',
      'save.share': '🔗 Copy a link to this setup',
      'save.copied': 'Link copied.',
      'save.copyFailed': 'Could not copy automatically. Here is the link: {url}',
      'save.customNoShare': 'Links cannot carry your own prices, so this one points to “{market}”.',
      'save.storageFull': 'Could not save: the browser storage is full or blocked.',
      'save.badLink': 'That link looked broken, so the default example is shown instead.',

      'how.title': 'How does this work?',
      'how.p1': 'Pick a market and a rule. The machine walks through the price history day by day. Each evening the rule looks only at prices it has already seen and decides: own it, or stay out. Nothing peeks into the future.',
      'how.p2': 'Your coins grow or shrink with the price while the rule owns it, and a small cost is taken every time it buys or sells. “Just holding” means buying on the first day and never selling. That is the thing to beat.',
      'how.p3': 'The colourful map runs every combination of the two knobs at once. Green squares beat holding, red squares lost to it. A map with one lonely green island usually means luck, not a good idea.',
      'how.p4': 'The parallel worlds are built by cutting the real history into short pieces and gluing them back together in a random order. Same mood, different story. A rule that only wins in the original story was fitted to that story.',

      'footer.note': 'The markets here are made up. Nothing on this page is financial advice; it is a toy for seeing how easy it is to fool yourself with hindsight.',
      'footer.local': 'Everything runs in your browser. Nothing is sent anywhere.'
    },

    tr: {
      'app.title': 'Keşke Makinesi',
      'app.tagline': 'Tek bir basit kurala uysaydın ne olurdu? Kuralı yılların inişli çıkışlı piyasasında yeniden oynat, sonra bunun beceri mi yoksa şans mı olduğunu gör.',
      'lang.switch': 'Dili değiştir',

      'step.market': '1. Bir piyasa seç',
      'step.rule': '2. Bir kural seç',
      'step.tune': '3. Ayarını yap',
      'market.reshuffle': '🎲 Başka bir versiyon',
      'market.reshuffleTitle': 'Aynı türden piyasa, başka bir şans',
      'market.custom.name': 'Senin fiyatların',
      'market.custom.blurb': 'Senin getirdiğin {days} gün.',
      'market.steady.name': 'Sakin tırmanış',
      'market.steady.blurb': 'Yavaş yavaş yükselir, pek sürpriz yok.',
      'market.rollercoaster.name': 'Hız treni',
      'market.rollercoaster.blurb': 'Sert iniş çıkışlar, iki yöne de ani sıçramalar.',
      'market.bubble.name': 'Balon ve patlama',
      'market.bubble.blurb': 'Hızla şişen bir çılgınlık, ardından patlama.',
      'market.slump.name': 'Uzun durgunluk',
      'market.slump.blurb': 'Yıllarca aşağı süzülür, sonra biraz toparlanır.',
      'market.sideways.name': 'Yerinde sayan',
      'market.sideways.blurb': 'Hep aynı seviyenin etrafında gidip gelir.',
      'market.moody.name': 'Huysuz',
      'market.moody.blurb': 'Sakin dönemler, arada gergin nöbetler.',

      'rule.trend.name': 'Akıntıya uy',
      'rule.trend.blurb': 'Fiyatlar genel olarak yükselirken içeride kal.',
      'rule.trend.sentence': 'Son {fast} günün ortalaması, son {slow} günün ortalamasının üstündeyken elinde tut.',
      'rule.dip.name': 'Düşüşte al',
      'rule.dip.blurb': 'Düşüşten sonra al, kârdayken sat.',
      'rule.dip.sentence': 'Fiyat son 60 günün zirvesinin {drop} altına inince al. {gain} kâra geçince sat.',
      'rule.breakout.name': 'Zirveyi kovala',
      'rule.breakout.blurb': 'Rekor gelince atla, yeni dip gelince kaç.',
      'rule.breakout.sentence': 'Fiyat son {entry} günün en yükseğini geçince al. Son {exit} günün en düşüğünün altına inince sat.',
      'rule.bounce.name': 'Geri sekmeye oyna',
      'rule.bounce.blurb': 'Fazla ucuz görünce al, normale dönünce sat.',
      'rule.bounce.sentence': 'Fiyat, son {window} günün ortalamasından olağan salınımının {depth} kadar aşağı düşünce al. Ortalamaya dönünce sat.',

      'param.trend.fast': 'Kısa ortalama',
      'param.trend.slow': 'Uzun ortalama',
      'param.dip.drop': 'Şu kadar düşünce al',
      'param.dip.gain': 'Şu kadar kârda sat',
      'param.breakout.entry': 'Zirve penceresi',
      'param.breakout.exit': 'Dip penceresi',
      'param.bounce.window': 'Ortalama penceresi',
      'param.bounce.depth': 'Ne kadar altında',
      'unit.days': '{n} gün',
      'unit.times': '{n} katı',

      'story.win': 'Kural kazanıyor: {rule} jeton; sadece elde tutsaydın {hold}.',
      'story.lose': 'Sadece elde tutmak kazanıyor: {hold} jeton; kuralla {rule}.',
      'story.tie': 'Başa baş: ikisi de {rule} jeton civarında bitiyor.',
      'story.sub': '{start} jetonla ve {years} yıllık bir geçmişle başlıyorsun. Kural {times} alım yaptı ve zamanın {exposure} kadarında piyasadaydı.',
      'story.once': '1 kez',
      'story.times': '{n} kez',
      'story.invalid': 'Bu iki ayar birbiriyle çelişiyor: kısa ortalamanın, uzun ortalamadan kısa olması gerekiyor.',
      'story.never': 'Bu ayarlarla kural hiç alım yapmadı; {start} jetonun olduğu yerde bekledi.',
      'story.replay': '▶ Yeniden oynat',
      'story.pause': '❚❚ Durdur',
      'story.best': '★ En iyi ayara atla',

      'chart.price': 'Fiyat',
      'chart.holding': 'Kural elinde tutuyor',
      'chart.buy': 'al',
      'chart.sell': 'sat',
      'chart.equityRule': 'Kuralla jetonların',
      'chart.equityHold': 'Sadece elde tutmak',
      'chart.year': '{n}. yıl',
      'chart.day': '{n}. gün',
      'chart.tip': '{day} · fiyat {price} · kural {rule} · elde tutmak {hold}',

      'map.title': 'Tüm ayarlar bir arada',
      'map.caption': 'Her kare kuralın bir versiyonu. {count} versiyonu {ms} ms içinde denedik; {beat} tanesi sadece elde tutmayı geçti.',
      'map.worse': 'elde tutmaktan kötü',
      'map.better': 'elde tutmaktan iyi',
      'map.invalid': 'mümkün değil',
      'map.tip': '{a} · {b} → {coins} jeton (elde tutmaya göre {edge})',
      'map.tipInvalid': '{a} · {b} → bu ikili anlamsız',
      'map.hint': 'Denemek için bir kareye tıkla. Ok tuşları da çalışır.',
      'map.aria': 'Bütün ayarların haritası. Ayarlar arasında ok tuşlarıyla gezebilirsin.',

      'luck.title': 'Beceri mi, şans mı?',
      'luck.intro': 'Bu piyasanın iniş çıkışlarını, havası aynı ama gidişatı farklı {count} paralel dünyaya karıştırıyor ve kuralını her birinde çalıştırıyoruz.',
      'luck.running': 'Paralel dünyalar geziliyor… {done} / {count}',
      'luck.verdict.skill': 'Beceriye benziyor: kuralın dünyaların {share} kadarında elde tutmayı geçti.',
      'luck.verdict.coin': 'Yazı tura: kuralın dünyaların {share} kadarında elde tutmayı geçti, yani aşağı yukarı yarı yarıya.',
      'luck.verdict.luck': 'Büyük ihtimalle şans: gerçek geçmişte kazandı ama öbür dünyaların yalnızca {share} kadarında.',
      'luck.verdict.loser': 'Kazandırmıyor: burada kaybetti, dünyaların da yalnızca {share} kadarında elde tutmayı geçti.',
      'luck.verdict.unknown': 'Bu kural hiç işlem yapamıyor, dolayısıyla sınanacak bir şey yok.',
      'luck.best': 'Haritadaki en iyi kare ({a} · {b}) dünyaların {share} kadarında elde tutmayı geçti. Kazananı olup bittikten sonra seçmek, bilinen en eski tuzaktır.',
      'luck.axis': 'sadece elde tutmaktan iyi ya da kötü →',
      'luck.zero': 'sadece elde tutmak',
      'luck.real': 'gerçekte olan',
      'luck.rerun': '🌍 Yeni dünyalar',
      'luck.samples': 'Paralel dünyalardan birkaçı',

      'numbers.title': 'Rakamlar',
      'numbers.rule': 'Kuralla',
      'numbers.hold': 'Sadece elde tutmak',
      'row.final': 'Sondaki jeton',
      'row.yearly': 'Yıllık ortalama',
      'row.drop': 'Yoldaki en kötü düşüş',
      'row.trades': 'Alım sayısı',
      'row.wins': 'Kârla biten işlemler',
      'row.exposure': 'Piyasada geçen süre',
      'row.bumpy': 'Yolculuğun sarsıntısı',

      'more.title': 'Kendi fiyatlarını kullan, masrafı değiştir, denemelerini kaydet',
      'custom.title': 'Kendi fiyatların',
      'custom.help': 'Her satıra bir fiyat gelecek şekilde bir liste ya da tarih ve fiyat sütunu olan bir CSV yapıştır. Eskiden yeniye de, yeniden eskiye de olur.',
      'custom.placeholder': '2024-01-02;101,5\n2024-01-03;102,1\n2024-01-04;100,8\n…',
      'custom.load': 'Bu fiyatları kullan',
      'custom.file': '…ya da bir dosya aç',
      'custom.ok': '{days} günlük fiyat yüklendi.',
      'custom.reversed': '{days} günlük fiyat yüklendi (eskiden yeniye çevrildi).',
      'csv.empty': 'Henüz okunacak bir şey yok.',
      'csv.tooShort': 'İşe yarar bir şey söyleyebilmek için en az {min} fiyat gerekiyor.',
      'csv.tooLong': 'Bu {max} satırdan fazla. Daha kısa bir dönem dene.',
      'csv.badNumber': '{line}. satır fiyata benzemiyor.',
      'csv.nonPositive': '{line}. satırdaki fiyat sıfır ya da daha küçük.',
      'csv.noPriceColumn': 'İçinde fiyat olan bir sütun bulunamadı.',
      'csv.fileError': 'Bu dosya okunamadı.',

      'settings.title': 'Masraflar',
      'settings.fee': 'İşlem başına masraf',
      'settings.feeHelp': 'Kural her alıp sattığında kesilen küçük bir pay.',
      'settings.start': 'Başlangıç jetonu',

      'save.title': 'Kayıtlı denemeler',
      'save.placeholder': 'Bu denemeye bir ad ver',
      'save.button': 'Kaydet',
      'save.open': 'Aç',
      'save.delete': 'Sil',
      'save.empty': 'Henüz kayıt yok.',
      'save.saved': '“{name}” kaydedildi.',
      'save.loaded': '“{name}” açıldı.',
      'save.defaultName': '{market}: {rule}',
      'save.share': '🔗 Bu denemenin bağlantısını kopyala',
      'save.copied': 'Bağlantı kopyalandı.',
      'save.copyFailed': 'Otomatik kopyalanamadı. Bağlantı şu: {url}',
      'save.customNoShare': 'Bağlantı senin fiyatlarını taşıyamaz; bu yüzden “{market}” piyasasını gösteriyor.',
      'save.storageFull': 'Kaydedilemedi: tarayıcı depolaması dolu ya da kapalı.',
      'save.badLink': 'Bağlantı bozuk görünüyordu, onun yerine varsayılan örnek açıldı.',

      'how.title': 'Bu nasıl çalışıyor?',
      'how.p1': 'Bir piyasa ve bir kural seç. Makine fiyat geçmişini gün gün yürür. Her akşam kural yalnızca o güne kadar gördüğü fiyatlara bakar ve karar verir: elinde tut ya da dışarıda kal. Hiçbir adımda geleceğe bakılmaz.',
      'how.p2': 'Kural elinde tuttuğu sürece jetonların fiyatla birlikte büyür ya da küçülür; her alışta ve satışta küçük bir masraf kesilir. “Sadece elde tutmak” ilk gün alıp hiç satmamak demek. Geçilmesi gereken çıta bu.',
      'how.p3': 'Renkli harita iki düğmenin bütün bileşimlerini aynı anda çalıştırır. Yeşil kareler elde tutmayı geçti, kırmızılar ona yenildi. Kırmızı denizin ortasında tek bir yeşil ada varsa bu genelde iyi bir fikir değil, şanstır.',
      'how.p4': 'Paralel dünyalar, gerçek geçmişi kısa parçalara bölüp rastgele bir sırayla yeniden yapıştırarak kurulur. Hava aynı, hikâye farklı. Yalnızca asıl hikâyede kazanan bir kural, o hikâyeye göre biçilmiş demektir.',

      'footer.note': 'Buradaki piyasalar uydurmadır. Bu sayfadaki hiçbir şey yatırım tavsiyesi değildir; geriye bakarak kendini kandırmanın ne kadar kolay olduğunu gösteren bir oyuncaktır.',
      'footer.local': 'Her şey tarayıcında çalışır. Hiçbir veri bir yere gönderilmez.'
    }
  };

  const SUPPORTED = ['en', 'tr'];
  let current = 'en';
  const listeners = [];

  // Tarayıcı dili "tr" ile başlıyorsa Türkçe, değilse İngilizce.
  function detectLang(navigatorLanguage) {
    return String(navigatorLanguage || '').toLowerCase().startsWith('tr') ? 'tr' : 'en';
  }

  function setLang(lang) {
    const next = SUPPORTED.includes(lang) ? lang : 'en';
    if (next === current) return;
    current = next;
    for (const fn of listeners) fn(current);
  }

  function getLang() {
    return current;
  }

  function onLangChange(fn) {
    listeners.push(fn);
  }

  // Anahtarı çevirir ve {ad} biçimindeki yer tutucuları doldurur.
  // Anahtar yoksa İngilizceye, o da yoksa anahtarın kendisine düşer; böylece eksik çeviri göze batar ama sayfayı kırmaz.
  function t(key, vars) {
    const table = STRINGS[current];
    let text = table[key];
    if (text === undefined) text = STRINGS.en[key];
    if (text === undefined) return key;
    if (vars) {
      text = text.replace(/\{(\w+)\}/g, (match, name) => (vars[name] === undefined ? match : String(vars[name])));
    }
    return text;
  }

  function has(key) {
    return Object.prototype.hasOwnProperty.call(STRINGS[current], key);
  }

  // Sayfadaki data-i18n* öznitelikli öğelerin metinlerini günceller.
  function applyToDom(root) {
    root.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    root.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
    root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
  }

  ns.i18n = { STRINGS, SUPPORTED, detectLang, setLang, getLang, onLangChange, t, has, applyToDom };
  if (typeof module !== 'undefined') module.exports = ns.i18n;
})();
