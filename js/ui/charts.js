// Fiyat grafiği (alış/satış işaretleri ve elde tutulan dönemlerle) ve jeton grafiği (kural ve elde tutmak).
// İki grafik aynı zaman eksenini paylaşır; birinin üstünde gezinmek ikisinde de aynı günü gösterir.
(function () {
  'use strict';
  const ns = (globalThis.IfOnly = globalThis.IfOnly || {});
  const { COLORS, fitCanvas, extent, niceTicks } = ns.canvas;
  const PAD = { left: 56, right: 14, top: 14, bottom: 26 };
  // Bu kadar çok işlemde işaretler birbirine girer, çizilmez; gölgeli dönemler yine görünür.
  const MAX_MARKERS = 160;

  function createCharts(els) {
    const { priceCanvas, equityCanvas, tooltip } = els;
    let data = null;
    let hoverIndex = -1;
    // Yeniden oynatma sırasında çizimin kesildiği gün; null ise tamamı çizilir.
    let playIndex = null;

    function xScale(width, n) {
      const plot = width - PAD.left - PAD.right;
      return (i) => PAD.left + (plot * i) / Math.max(1, n - 1);
    }

    function yScale(height, lo, hi) {
      const plot = height - PAD.top - PAD.bottom;
      const span = hi - lo || 1;
      return (v) => PAD.top + plot * (1 - (v - lo) / span);
    }

    // Değer aralığına biraz nefes payı ekler.
    function padded(lo, hi) {
      const margin = (hi - lo) * 0.06 || Math.abs(hi) * 0.05 || 1;
      return [lo - margin, hi + margin];
    }

    function dayLabel(i) {
      const dates = data && data.dates;
      if (dates && Number.isFinite(dates[i])) return new Date(dates[i]).toISOString().slice(0, 10);
      return ns.i18n.t('chart.day', { n: ns.format.integer(i + 1) });
    }

    // Alt eksen: tarih varsa yıl başları, yoksa her 250 günde bir "n. yıl".
    function drawTimeAxis(ctx, width, height, n) {
      const x = xScale(width, n);
      ctx.fillStyle = COLORS.muted;
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const dates = data.dates;
      if (dates && Number.isFinite(dates[0]) && Number.isFinite(dates[n - 1])) {
        let lastYear = new Date(dates[0]).getUTCFullYear();
        for (let i = 1; i < n; i++) {
          const year = Number.isFinite(dates[i]) ? new Date(dates[i]).getUTCFullYear() : lastYear;
          if (year !== lastYear) {
            ctx.fillText(String(year), x(i), height - PAD.bottom + 7);
            lastYear = year;
          }
        }
        return;
      }
      const perYear = ns.markets.DAYS_PER_YEAR;
      for (let i = 0, year = 1; i < n; i += perYear, year++) {
        const center = Math.min(i + perYear / 2, (i + n - 1) / 2);
        ctx.fillText(ns.i18n.t('chart.year', { n: year }), x(center), height - PAD.bottom + 7);
        if (i > 0) {
          ctx.strokeStyle = COLORS.grid;
          ctx.beginPath();
          ctx.moveTo(x(i), PAD.top);
          ctx.lineTo(x(i), height - PAD.bottom);
          ctx.stroke();
        }
      }
    }

    function drawValueAxis(ctx, width, height, lo, hi, formatTick) {
      const y = yScale(height, lo, hi);
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (const tick of niceTicks(lo, hi, 4)) {
        const py = y(tick);
        ctx.strokeStyle = COLORS.grid;
        ctx.beginPath();
        ctx.moveTo(PAD.left, py);
        ctx.lineTo(width - PAD.right, py);
        ctx.stroke();
        ctx.fillStyle = COLORS.muted;
        ctx.fillText(formatTick(tick), PAD.left - 8, py);
      }
    }

    function strokeSeries(ctx, series, upto, x, y) {
      ctx.beginPath();
      ctx.moveTo(x(0), y(series[0]));
      for (let i = 1; i < upto; i++) ctx.lineTo(x(i), y(series[i]));
      ctx.stroke();
    }

    function triangle(ctx, cx, cy, size, up) {
      ctx.beginPath();
      if (up) {
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx + size, cy + size * 0.8);
        ctx.lineTo(cx - size, cy + size * 0.8);
      } else {
        ctx.moveTo(cx, cy + size);
        ctx.lineTo(cx + size, cy - size * 0.8);
        ctx.lineTo(cx - size, cy - size * 0.8);
      }
      ctx.closePath();
      ctx.fill();
    }

    function drawCrosshair(ctx, height, x, y, index, series, colors) {
      if (index < 0) return;
      ctx.strokeStyle = 'rgba(31,36,48,0.35)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x(index), PAD.top);
      ctx.lineTo(x(index), height - PAD.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      series.forEach((s, k) => {
        ctx.fillStyle = colors[k];
        ctx.beginPath();
        ctx.arc(x(index), y(s[index]), 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function drawPrice() {
      const { ctx, width, height } = fitCanvas(priceCanvas);
      const { prices, run } = data;
      const n = prices.length;
      const upto = playIndex === null ? n : Math.max(1, Math.min(n, playIndex + 1));
      const [lo, hi] = padded(...extent(prices, 0, n));
      const x = xScale(width, n);
      const y = yScale(height, lo, hi);

      drawValueAxis(ctx, width, height, lo, hi, ns.format.price);
      drawTimeAxis(ctx, width, height, n);

      // Kuralın elinde tuttuğu dönemler yeşil şeritler.
      ctx.fillStyle = COLORS.ruleSoft;
      for (const trade of run.trades) {
        if (trade.entry >= upto) break;
        const end = Math.min(trade.exit, upto - 1);
        ctx.fillRect(x(trade.entry), PAD.top, Math.max(1, x(end) - x(trade.entry)), height - PAD.top - PAD.bottom);
      }

      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      strokeSeries(ctx, prices, upto, x, y);
      ctx.lineWidth = 1;

      if (run.trades.length <= MAX_MARKERS) {
        for (const trade of run.trades) {
          if (trade.entry < upto) {
            ctx.fillStyle = COLORS.buy;
            triangle(ctx, x(trade.entry), y(prices[trade.entry]) + 11, 5, true);
          }
          if (!trade.open && trade.exit < upto) {
            ctx.fillStyle = COLORS.sell;
            triangle(ctx, x(trade.exit), y(prices[trade.exit]) - 11, 5, false);
          }
        }
      }

      if (playIndex !== null) drawPlayhead(ctx, height, x(upto - 1));
      drawCrosshair(ctx, height, x, y, hoverIndex < upto ? hoverIndex : -1, [prices], [COLORS.ink]);
    }

    function drawEquity() {
      const { ctx, width, height } = fitCanvas(equityCanvas);
      const { run } = data;
      const n = run.equity.length;
      const upto = playIndex === null ? n : Math.max(1, Math.min(n, playIndex + 1));
      const range = extent(run.equity, 0, n);
      extent(run.holdEquity, 0, n, range);
      const [lo, hi] = padded(range[0], range[1]);
      const x = xScale(width, n);
      const y = yScale(height, lo, hi);

      drawValueAxis(ctx, width, height, lo, hi, ns.format.coins);
      drawTimeAxis(ctx, width, height, n);

      // Başlangıç çizgisi: bunun altı zarar.
      const start = run.stats.start;
      ctx.strokeStyle = 'rgba(31,36,48,0.3)';
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(PAD.left, y(start));
      ctx.lineTo(width - PAD.right, y(start));
      ctx.stroke();

      ctx.lineJoin = 'round';
      ctx.strokeStyle = COLORS.hold;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      strokeSeries(ctx, run.holdEquity, upto, x, y);
      ctx.setLineDash([]);
      ctx.strokeStyle = COLORS.rule;
      ctx.lineWidth = 2.5;
      strokeSeries(ctx, run.equity, upto, x, y);
      ctx.lineWidth = 1;

      if (playIndex !== null) drawPlayhead(ctx, height, x(upto - 1));
      drawCrosshair(ctx, height, x, y, hoverIndex < upto ? hoverIndex : -1, [run.holdEquity, run.equity], [COLORS.hold, COLORS.rule]);
    }

    function drawPlayhead(ctx, height, px) {
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, PAD.top);
      ctx.lineTo(px, height - PAD.bottom);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    function draw() {
      if (!data) return;
      drawPrice();
      drawEquity();
      updateTooltip();
    }

    function updateTooltip() {
      const index = playIndex !== null ? playIndex : hoverIndex;
      if (!data || index < 0) {
        tooltip.hidden = true;
        return;
      }
      const i = Math.min(index, data.prices.length - 1);
      tooltip.hidden = false;
      tooltip.textContent = ns.i18n.t('chart.tip', {
        day: dayLabel(i),
        price: ns.format.price(data.prices[i]),
        rule: ns.format.coins(data.run.equity[i]),
        hold: ns.format.coins(data.run.holdEquity[i])
      });
    }

    function indexFromEvent(event, canvas) {
      const rect = canvas.getBoundingClientRect();
      const n = data.prices.length;
      const plot = rect.width - PAD.left - PAD.right;
      const ratio = (event.clientX - rect.left - PAD.left) / plot;
      return Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1))));
    }

    for (const canvas of [priceCanvas, equityCanvas]) {
      canvas.addEventListener('pointermove', (event) => {
        if (!data || playIndex !== null) return;
        hoverIndex = indexFromEvent(event, canvas);
        draw();
      });
      canvas.addEventListener('pointerleave', () => {
        hoverIndex = -1;
        draw();
      });
    }

    return {
      render(next) {
        data = next;
        if (hoverIndex >= next.prices.length) hoverIndex = -1;
        draw();
      },
      setPlayIndex(index) {
        playIndex = index;
        hoverIndex = -1;
        draw();
      },
      redraw: draw
    };
  }

  ns.charts = { createCharts };
})();
