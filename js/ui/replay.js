// "Yeniden oynat": zaman çizgisini baştan sona animasyonla yürütür.
// Süre gün sayısından bağımsız tutulur; uzun geçmişlerde de birkaç saniyede biter.
(function () {
  'use strict';
  const ns = (globalThis.IfOnly = globalThis.IfOnly || {});

  const DURATION_MS = 6000;

  function createReplay(handlers) {
    let frame = 0;
    let startedAt = 0;
    let length = 0;
    let running = false;

    function tick(now) {
      if (!running) return;
      if (!startedAt) startedAt = now;
      const progress = Math.min(1, (now - startedAt) / DURATION_MS);
      // Yavaş başlayıp hızlanan, sonda yavaşlayan bir akış.
      const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      handlers.onFrame(Math.round(eased * (length - 1)));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else stop();
    }

    function start(n) {
      stop();
      if (n < 2) return;
      length = n;
      startedAt = 0;
      running = true;
      handlers.onState(true);
      frame = requestAnimationFrame(tick);
    }

    function stop() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(frame);
      handlers.onState(false);
    }

    return { start, stop, isRunning: () => running };
  }

  ns.replay = { createReplay, DURATION_MS };
})();
