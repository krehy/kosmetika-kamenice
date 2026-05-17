(function () {
  'use strict';

  // ───────── Footer year ─────────
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ───────── Topbar background on scroll ─────────
  const topbar = document.getElementById('topbar');
  const updateTopbar = () => {
    if (window.scrollY > 60) topbar.classList.add('scrolled');
    else topbar.classList.remove('scrolled');
  };
  updateTopbar();
  window.addEventListener('scroll', updateTopbar, { passive: true });

  // ───────── Reveal on scroll ─────────
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  // ───────── Scroll-driven hero image sequence ─────────
  const scrollZone = document.getElementById('hero-scroll-zone');
  const canvas = document.getElementById('hero-canvas');
  if (!scrollZone || !canvas) return;

  const FRAME_COUNT = 96;
  const FRAME_PATH = (i) =>
    `./frames/f-${String(i + 1).padStart(3, '0')}.jpg`;
  const SOURCE_W = 1280;
  const SOURCE_H = 720;

  const ctx = canvas.getContext('2d', { alpha: false });
  const images = new Array(FRAME_COUNT);
  const loaded = new Array(FRAME_COUNT).fill(false);
  let loadedCount = 0;
  let lastDrawn = -1;
  let canvasW = 0;
  let canvasH = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  const resizeCanvas = () => {
    const rect = canvas.getBoundingClientRect();
    canvasW = rect.width;
    canvasH = rect.height;
    canvas.width = Math.round(canvasW * dpr);
    canvas.height = Math.round(canvasH * dpr);
    // Re-draw current frame at new size.
    lastDrawn = -1;
    draw();
  };

  // Draws frame `idx` (or nearest loaded frame) to canvas with object-fit: cover.
  const drawImage = (img) => {
    const cw = canvas.width;
    const ch = canvas.height;
    const imgRatio = SOURCE_W / SOURCE_H;
    const canvasRatio = cw / ch;
    let dw, dh, dx, dy;
    if (canvasRatio > imgRatio) {
      dw = cw;
      dh = cw / imgRatio;
      dx = 0;
      dy = (ch - dh) / 2;
    } else {
      dh = ch;
      dw = ch * imgRatio;
      dx = (cw - dw) / 2;
      dy = 0;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
  };

  const findNearestLoaded = (idx) => {
    if (loaded[idx]) return idx;
    // Search outward for nearest loaded frame.
    for (let d = 1; d < FRAME_COUNT; d++) {
      if (idx - d >= 0 && loaded[idx - d]) return idx - d;
      if (idx + d < FRAME_COUNT && loaded[idx + d]) return idx + d;
    }
    return -1;
  };

  const computeProgress = () => {
    const rect = scrollZone.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;
    const scrolled = -rect.top;
    let p = scrolled / scrollable;
    if (p < 0) p = 0;
    if (p > 1) p = 1;
    return p;
  };

  const draw = () => {
    if (!canvasW || !canvasH) return;
    const progress = computeProgress();
    const target = Math.min(
      FRAME_COUNT - 1,
      Math.floor(progress * FRAME_COUNT)
    );
    const idx = findNearestLoaded(target);
    if (idx < 0 || idx === lastDrawn) return;
    drawImage(images[idx]);
    lastDrawn = idx;
  };

  // ───────── Preload all frames in parallel ─────────
  // Load first frame eagerly, then the rest. As each one lands, redraw if
  // it's nearer to the current scroll position than what's currently shown.
  for (let i = 0; i < FRAME_COUNT; i++) {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      loaded[i] = true;
      loadedCount++;
      // Only force a redraw if this frame might improve the current view.
      const progress = computeProgress();
      const target = Math.floor(progress * FRAME_COUNT);
      if (
        lastDrawn === -1 ||
        Math.abs(i - target) < Math.abs(lastDrawn - target)
      ) {
        // Defer to rAF so we don't draw mid-layout.
        requestAnimationFrame(draw);
      }
    };
    img.src = FRAME_PATH(i);
    images[i] = img;
  }

  // ───────── rAF loop driving scroll-synced redraws ─────────
  let needsDraw = false;
  const tick = () => {
    if (needsDraw) {
      draw();
      needsDraw = false;
    }
    requestAnimationFrame(tick);
  };
  const markDirty = () => { needsDraw = true; };
  window.addEventListener('scroll', markDirty, { passive: true });
  window.addEventListener('resize', () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    resizeCanvas();
  });

  resizeCanvas();
  requestAnimationFrame(tick);
})();
