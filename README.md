# If-Only Machine

Türkçe: [README.tr.md](README.tr.md)

Pick a simple rule like "buy after a 15% drop, sell after a 20% gain", replay it through five years of market ups and downs, and see whether it beat just buying once and holding on — and whether that was skill or luck.

Open `index.html` in any modern browser. That's it: no install, no server, no internet connection. The page opens on a working example (a bubble that inflates and pops, with a trend-following rule), so there is something to look at and poke from the very first second.

## What you see

- **The story at the top.** One sentence tells you who won: the rule or plain holding, in coins. Below it: how many times the rule bought and how much of the time it was in the market.
- **The price chart.** Green bands show when the rule owned the thing, green triangles mark buys, red ones mark sells. Hover anywhere to read the day, the price and both coin balances. Press **Replay** to watch the whole history play out from day one.
- **The coin chart.** Your coins with the rule (solid green) against just holding (dashed grey).
- **Every setting at once.** Each rule has two knobs. The map runs every combination of them (576 versions) in a few milliseconds and colours each square: green beat holding, red lost to it, the star is the best square. Click a square, or use the arrow keys, to jump to that setting.
- **Skill or luck?** The rule is run again in 200 parallel worlds: the same market cut into short pieces and glued back together in a random order. The histogram shows how the rule did across all of them, and a plain sentence gives the verdict. It also checks how the map's best square does in those worlds, which is usually the most humbling line on the page.
- **The numbers.** Final coins, average per year, worst drop along the way, number of buys, share of trades that made money, time in the market and how bumpy the ride was, side by side with just holding.

## Markets and rules

Six made-up markets, each built from a seed so the same one always looks the same:

| Market | What it does |
| --- | --- |
| Calm climb | Slow, steady rise with small wobbles |
| Rollercoaster | Big swings and sudden jumps both ways |
| Bubble and pop | Normal, then a mania, then a crash, then a long hangover |
| Long slump | A short good spell, years of decline, a partial recovery |
| Going nowhere | Pulled back to the same level again and again |
| Moody | Switches at random between calm and nervous spells |

**Another version** keeps the same kind of market but rolls new luck.

Four rules, each with two knobs:

| Rule | In plain words |
| --- | --- |
| Follow the trend | Own it while the short-term average is above the long-term average |
| Buy the dip | Buy when the price is X% below its 60-day high, sell once up Y% |
| Chase new highs | Buy when the price beats its N-day high, sell when it breaks its M-day low |
| Bet on a bounce | Buy when the price sinks well below its average, sell once it is back |

## Language

The page speaks English and Turkish. Use the **TR | EN** switch in the top right corner; everything changes on the spot, and the choice is remembered next time. On the first visit the language follows your browser.

## Going deeper

Open **Use your own prices, change the costs, save your setups** under the numbers:

- **Your own prices.** Paste a list of prices (one per line) or a CSV with a date and a price column, or open a file, or drop it on the text box. Headers like `Close`, `Adj Close`, `Price`, `Kapanış` or `Fiyat` are found automatically; otherwise the last numeric column is used. Comma, semicolon and tab separated files work, as do numbers written as `1,234.56` or `1.234,56`. Newest-first files are flipped. At least 60 rows are needed. If something is wrong, the message names the line.
- **Costs.** The cost per trade (0.2% by default) is taken on every buy and every sell. Push it up and watch the busy rules fall apart. The starting coins can be changed too.
- **Saved setups.** Give a setup a name and save it in the browser. Your own prices are saved with it.
- **Share a link.** The address bar always holds the current setup (`#m=bubble&s=1&r=trend&a=18&b=90&...`), so a copied link opens the same thing on another machine. Links cannot carry your own prices.

## How it works

The rule never sees the future. At the close of each day it looks only at prices up to that day and decides "own it" or "stay out"; that decision applies to the move from today's close to tomorrow's. A test changes every price after a cut-off day and checks that no rule changes a single decision before it.

Coins grow with the price while the rule is in and stay flat while it is out. Each change of position costs the fee. "Just holding" is the same simulation with the rule set to "in" every day, so it pays the fee once.

The map reuses one position buffer and one indicator cache for all 576 combinations: each moving average, rolling high, rolling low and rolling spread is computed once per window in O(n) (running sums for averages and spread, a monotonic queue for highs and lows) and shared by every square that needs it. Only summary numbers are kept per square; full coin curves are built only for the selected setting.

The parallel worlds are a block bootstrap: the daily moves of the real history are cut into 20-day pieces, drawn at random and chained together. That keeps the short-term texture (trends, calm and nervous spells) but shuffles the order. The experiment runs a few worlds per animation frame so the page never freezes, and restarts quietly whenever you touch a knob. The verdict is simple on purpose:

- beat holding in at least 60% of the worlds: looks like skill
- 40% to 60%: a coin flip
- below 40%, but it won in the real history: probably luck
- below 40% and lost here too: not a winner

## Project layout

```
index.html            page structure, loads the scripts in order
css/style.css         all styling
js/core/              logic with no DOM access, testable in Node
  rng.js              seeded random numbers (mulberry32 + Box-Muller)
  markets.js          market presets and the price builder
  indicators.js       rolling mean, spread, high and low, plus a cache
  strategies.js       the four rules, their knobs and the knob grid
  engine.js           the day-by-day simulation and its numbers
  sweep.js            runs every knob combination for the map
  worlds.js           parallel worlds, verdicts, histograms
  csv.js              reading pasted or dropped price lists
js/i18n.js            every visible sentence, in English and Turkish
js/format.js          numbers and percentages per language
js/state.js           the single state object and the reducer
js/storage.js         saved setups, last session, share links
js/model.js           memoized results derived from the state
js/ui/                drawing and input: charts, map, luck panel, controls
js/app.js             wires state, model and UI together
tests/                Node tests for the core, state, storage and dictionary
```

Changes flow in one direction: an input dispatches an action, the reducer returns a new state, the model recomputes only what that change affects (moving a knob does not rerun the map; switching markets does), and the UI redraws.

## Tests

With Node.js 18 or newer:

```
npm test
```

or `node tests/run.js`. There are no dependencies. The tests cover the indicators against slow reference versions, the simulation (fees, drawdown, open trades, no peeking into the future), each rule on hand-made price lists, the map against single runs, the parallel worlds, the CSV reader and its errors, the reducer, saving and links (including broken storage), and that the English and Turkish dictionaries have the same keys and placeholders.

## A note

The markets are invented and nothing here is financial advice. The whole point of the page is how easy it is to find a rule that would have worked, and how rarely that means anything.

## License

MIT, see [LICENSE](LICENSE).
