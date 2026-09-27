// "Beceri mi, şans mı?" paneli: paralel dünyalardaki sonuçların histogramı ve birkaç örnek dünya.
(function () {
  'use strict';
  const ns = (globalThis.IfOnly = globalThis.IfOnly || {});
  const { COLORS, fitCanvas, edgeColor } = ns.canvas;
  const PAD = { left: 14, right: 14, top: 26, bottom: 34 };
  const BINS = 28;

  function createLuckView(els) {
    const { histCanvas, samplesCanvas } = els;
    let last = null;

    function drawHistogram(summary, originalEdge) {
      const { ctx, width, height } = fitCanvas(histCanvas);
      const edges = summary ? summary.rule.edges : [];
      if (!edges.length) return;
      // Aralık: sonuçların %5-%95 dilimi, sıfır ve gerçek sonuç mutlaka içinde; uçlar kenar kutularında toplanır.
      const sorted = edges.slice().sort((a, b) => a - b);
      let lo = Math.min(0, originalEdge, sorted[Math.floor(sorted.length * 0.05)]);
      let hi = Math.max(0, originalEdge, sorted[Math.floor(sorted.length * 0.95)]);
      const margin = (hi - lo) * 0.08 || 0.05;
      lo -= margin;
      hi += margin;
      const bins = ns.worlds.histogram(edges, BINS, lo, hi);
      let tallest = 1;
      for (const b of bins) if (b > tallest) tallest = b;

      const plotW = width - PAD.left - PAD.right;
      const plotH = height - PAD.top - PAD.bottom;
      const x = (v) => PAD.left + ((v - lo) / (hi - lo)) * plotW;
      const barW = plotW / BINS;
      for (let i = 0; i < BINS; i++) {
        const center = lo + (i + 0.5) * ((hi - lo) / BINS);
        const h = (bins[i] / tallest) * plotH;
        ctx.fillStyle = edgeColor(center, Math.max(Math.abs(lo), Math.abs(hi)) * 0.6);
        ctx.fillRect(PAD.left + i * barW + 1, PAD.top + plotH - h, barW - 2, h);
      }

      // Taban çizgisi.
      ctx.strokeStyle = 'rgba(31,36,48,0.25)';
      ctx.beginPath();
      ctx.moveTo(PAD.left, PAD.top + plotH + 0.5);
      ctx.lineTo(width - PAD.right, PAD.top + plotH + 0.5);
      ctx.stroke();

      marker(ctx, x(0), PAD.top, plotH, COLORS.ink, ns.i18n.t('luck.zero'), [4, 3], width);
      marker(ctx, x(originalEdge), PAD.top, plotH, COLORS.accent, ns.i18n.t('luck.real'), null, width, true);

      ctx.fillStyle = COLORS.muted;
      ctx.font = '11px system-ui, sans-serif';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillText(ns.format.signedPercent(lo), PAD.left, PAD.top + plotH + 6);
      ctx.textAlign = 'right';
      ctx.fillText(ns.format.signedPercent(hi), width - PAD.right, PAD.top + plotH + 6);
      ctx.textAlign = 'center';
      ctx.fillText(ns.i18n.t('luck.axis'), PAD.left + plotW / 2, PAD.top + plotH + 19);
    }

    // Dikey işaret çizgisi ve üstünde etiket; etiket kenara taşmasın diye hizası ayarlanır.
    function marker(ctx, px, top, plotH, color, label, dash, width, bold) {
      ctx.strokeStyle = color;
      ctx.lineWidth = bold ? 3 : 1.5;
      ctx.setLineDash(dash || []);
      ctx.beginPath();
      ctx.moveTo(px, top - 4);
      ctx.lineTo(px, top + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
      ctx.font = (bold ? '600 ' : '') + '11px system-ui, sans-serif';
      ctx.fillStyle = bold ? '#9a6a0c' : COLORS.ink;
      ctx.textBaseline = 'bottom';
      ctx.textAlign = px < width * 0.2 ? 'left' : px > width * 0.8 ? 'right' : 'center';
      // Gerçek sonuç etiketi bir satır yukarıda durur, sıfır etiketiyle çakışmasın.
      // Sola ya da sağa hizalı etiket çizgiden biraz uzak durur ki çizgi harfin üstüne binmesin.
      const nudge = ctx.textAlign === 'left' ? 4 : ctx.textAlign === 'right' ? -4 : 0;
      ctx.fillText(label, px + nudge, bold ? top - 8 : top + 10);
    }

    function drawSamples(summary, originalPrices) {
      const { ctx, width, height } = fitCanvas(samplesCanvas);
      if (!summary || !summary.samples.length) return;
      const original = ns.markets.downsample(originalPrices, 160);
      const all = summary.samples.concat([original]);
      // Log ölçek: dünyalar arasındaki büyük farklar da aynı kutuya sığsın.
      let lo = Infinity;
      let hi = -Infinity;
      for (const s of all) {
        for (const v of s) {
          const lv = Math.log(v);
          if (lv < lo) lo = lv;
          if (lv > hi) hi = lv;
        }
      }
      const pad = 6;
      const x = (i, n) => pad + ((width - 2 * pad) * i) / (n - 1);
      const y = (v) => pad + (height - 2 * pad) * (1 - (Math.log(v) - lo) / (hi - lo || 1));
      const line = (s, color, w) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(x(0, s.length), y(s[0]));
        for (let i = 1; i < s.length; i++) ctx.lineTo(x(i, s.length), y(s[i]));
        ctx.stroke();
      };
      summary.samples.forEach((s, k) => line(s, 'hsla(' + (200 + k * 28) + ', 45%, 50%, 0.55)', 1.2));
      line(original, COLORS.ink, 2);
      ctx.lineWidth = 1;
    }

    function render(view) {
      last = view;
      drawHistogram(view.summary, view.originalEdge);
      drawSamples(view.summary, view.prices);
    }

    return {
      render,
      redraw() {
        if (last) render(last);
      }
    };
  }

  ns.luck = { createLuckView };
})();
