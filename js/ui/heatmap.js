// "Tüm ayarlar bir arada" haritası: her kare kuralın bir versiyonu, rengi elde tutmaya göre sonucu.
// Tıklama ya da ok tuşlarıyla seçim yapılır; seçim uygulamaya geri bildirilir, harita durumu kendisi tutmaz.
(function () {
  'use strict';
  const ns = (globalThis.IfOnly = globalThis.IfOnly || {});
  const { COLORS, fitCanvas, edgeColor } = ns.canvas;
  const PAD = { left: 64, right: 10, top: 10, bottom: 44 };

  function createHeatmap(canvas, tooltip, handlers) {
    let grid = null;
    let strategy = null;
    let selected = { row: 0, col: 0 };
    let hover = null;
    let colorScale = 0.5;
    let layout = null;
    let hatch = null;

    // Geçersiz hücreler için çizgili desen; bir kez oluşturulur.
    function hatchPattern(ctx) {
      if (hatch) return hatch;
      const tile = document.createElement('canvas');
      tile.width = 6;
      tile.height = 6;
      const tctx = tile.getContext('2d');
      tctx.fillStyle = COLORS.invalid;
      tctx.fillRect(0, 0, 6, 6);
      tctx.strokeStyle = 'rgba(31,36,48,0.12)';
      tctx.beginPath();
      tctx.moveTo(0, 6);
      tctx.lineTo(6, 0);
      tctx.stroke();
      hatch = ctx.createPattern(tile, 'repeat');
      return hatch;
    }

    // Renk ölçeği: farkların %90'lık dilimi; tek bir uç değer bütün haritayı soluklaştırmasın.
    function computeScale(g) {
      const list = [];
      for (let i = 0; i < g.edges.length; i++) if (g.valid[i]) list.push(Math.abs(g.edges[i]));
      if (!list.length) return 0.5;
      list.sort((a, b) => a - b);
      return Math.min(2, Math.max(0.05, list[Math.floor(list.length * 0.9)]));
    }

    function cellAt(clientX, clientY) {
      if (!layout) return null;
      const rect = canvas.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const col = Math.floor((px - PAD.left) / layout.cellW);
      // Satır 0 en altta; y ekseni yukarı doğru büyür.
      const row = grid.rows - 1 - Math.floor((py - PAD.top) / layout.cellH);
      if (col < 0 || col >= grid.cols || row < 0 || row >= grid.rows) return null;
      return { row, col };
    }

    function cellLabel(row, col) {
      const [rowParam, colParam] = strategy.params;
      return {
        a: ns.i18n.t('param.' + strategy.id + '.' + rowParam.key) + ' ' + ns.format.paramValue(rowParam, grid.rowValues[row]),
        b: ns.i18n.t('param.' + strategy.id + '.' + colParam.key) + ' ' + ns.format.paramValue(colParam, grid.colValues[col])
      };
    }

    function draw() {
      if (!grid) return;
      const { ctx, width, height } = fitCanvas(canvas);
      const plotW = width - PAD.left - PAD.right;
      const plotH = height - PAD.top - PAD.bottom;
      const cellW = plotW / grid.cols;
      const cellH = plotH / grid.rows;
      layout = { cellW, cellH };
      const xOf = (col) => PAD.left + col * cellW;
      const yOf = (row) => PAD.top + (grid.rows - 1 - row) * cellH;

      for (let r = 0; r < grid.rows; r++) {
        for (let c = 0; c < grid.cols; c++) {
          const index = r * grid.cols + c;
          ctx.fillStyle = grid.valid[index] ? edgeColor(grid.edges[index], colorScale) : hatchPattern(ctx);
          // Yarım piksel boşluk kareleri ayırır.
          ctx.fillRect(xOf(c) + 0.5, yOf(r) + 0.5, cellW - 1, cellH - 1);
        }
      }

      // En iyi kare yıldızla işaretlenir.
      if (grid.bestIndex >= 0) {
        const br = Math.floor(grid.bestIndex / grid.cols);
        const bc = grid.bestIndex % grid.cols;
        ctx.fillStyle = COLORS.ink;
        ctx.font = Math.max(9, Math.min(cellW, cellH) * 0.8) + 'px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', xOf(bc) + cellW / 2, yOf(br) + cellH / 2 + 1);
      }

      if (hover) {
        ctx.strokeStyle = 'rgba(31,36,48,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(xOf(hover.col) + 0.5, yOf(hover.row) + 0.5, cellW - 1, cellH - 1);
      }

      // Seçili kare kalın çerçeveyle.
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(xOf(selected.col) - 0.5, yOf(selected.row) - 0.5, cellW + 1, cellH + 1);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(xOf(selected.col) + 1.5, yOf(selected.row) + 1.5, cellW - 3, cellH - 3);

      drawAxes(ctx, width, height, xOf, yOf, cellW, cellH);
    }

    function drawAxes(ctx, width, height, xOf, yOf, cellW, cellH) {
      const [rowParam, colParam] = strategy.params;
      ctx.fillStyle = COLORS.muted;
      ctx.font = '11px system-ui, sans-serif';

      // Alt eksen: ilk, orta ve son değer.
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (const c of [0, Math.floor(grid.cols / 2), grid.cols - 1]) {
        ctx.fillText(ns.format.paramInline(colParam, grid.colValues[c]), xOf(c) + cellW / 2, height - PAD.bottom + 4);
      }
      ctx.fillStyle = COLORS.ink;
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillText(ns.i18n.t('param.' + strategy.id + '.' + colParam.key) + ' →', PAD.left + (width - PAD.left - PAD.right) / 2, height - PAD.bottom + 21);

      // Sol eksen.
      ctx.fillStyle = COLORS.muted;
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (const r of [0, Math.floor(grid.rows / 2), grid.rows - 1]) {
        ctx.fillText(ns.format.paramInline(rowParam, grid.rowValues[r]), PAD.left - 6, yOf(r) + cellH / 2);
      }
      ctx.save();
      ctx.translate(14, PAD.top + (height - PAD.top - PAD.bottom) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.ink;
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillText(ns.i18n.t('param.' + strategy.id + '.' + rowParam.key) + ' →', 0, 0);
      ctx.restore();
    }

    function showTooltip(cell, clientX, clientY) {
      if (!cell) {
        tooltip.hidden = true;
        return;
      }
      const index = cell.row * grid.cols + cell.col;
      const labels = cellLabel(cell.row, cell.col);
      tooltip.textContent = grid.valid[index]
        ? ns.i18n.t('map.tip', { ...labels, coins: ns.format.coins(grid.finalValues[index]), edge: ns.format.signedPercent(grid.edges[index]) })
        : ns.i18n.t('map.tipInvalid', labels);
      tooltip.hidden = false;
      const host = tooltip.offsetParent || canvas.parentElement;
      const hostRect = host.getBoundingClientRect();
      const left = Math.min(clientX - hostRect.left + 14, hostRect.width - tooltip.offsetWidth - 4);
      tooltip.style.left = Math.max(4, left) + 'px';
      tooltip.style.top = clientY - hostRect.top + 16 + 'px';
    }

    canvas.addEventListener('pointermove', (event) => {
      if (!grid) return;
      const cell = cellAt(event.clientX, event.clientY);
      const changed = !cell !== !hover || (cell && hover && (cell.row !== hover.row || cell.col !== hover.col));
      hover = cell;
      if (changed) draw();
      showTooltip(cell, event.clientX, event.clientY);
    });
    canvas.addEventListener('pointerleave', () => {
      hover = null;
      tooltip.hidden = true;
      draw();
    });
    canvas.addEventListener('click', (event) => {
      const cell = grid && cellAt(event.clientX, event.clientY);
      if (cell) handlers.onSelect(cell.row, cell.col);
    });
    canvas.addEventListener('keydown', (event) => {
      if (!grid) return;
      const moves = { ArrowUp: [1, 0], ArrowDown: [-1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
      const move = moves[event.key];
      if (!move) return;
      event.preventDefault();
      const row = Math.max(0, Math.min(grid.rows - 1, selected.row + move[0]));
      const col = Math.max(0, Math.min(grid.cols - 1, selected.col + move[1]));
      handlers.onSelect(row, col);
    });

    return {
      render(nextGrid, nextStrategy, nextSelected) {
        if (nextGrid !== grid) colorScale = computeScale(nextGrid);
        grid = nextGrid;
        strategy = nextStrategy;
        selected = nextSelected;
        draw();
      },
      redraw: draw,
      scale: () => colorScale
    };
  }

  ns.heatmap = { createHeatmap };
})();
