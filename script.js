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

  // ───────── Scroll-driven hero video ─────────
  const scrollZone = document.getElementById('hero-scroll-zone');
  const video = document.getElementById('hero-video');
  if (!scrollZone || !video) return;

  // Safari / iOS choke on rapid currentTime seeks of mp4. Detect and fall back to CSS-only.
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isSafari =
    /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua) || isIOS;
  if (isSafari) {
    console.warn(
      '[hero] Safari/iOS detected — scroll-driven video seek may stutter. ' +
        'Falling back to CSS scale/fade animation.'
    );
    video.style.transition = 'transform 0.45s ease-out, opacity 0.45s ease-out';
  }

  let duration = 0;
  let currentTime = 0;
  let ready = false;
  let firstFrameForced = false;

  // Force the browser to actually decode and render a frame. Without this, a
  // paused video with currentTime=0 often shows nothing until user interacts.
  const forceFirstFrame = () => {
    if (firstFrameForced) return;
    firstFrameForced = true;
    const p = video.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        video.pause();
        try { video.currentTime = 0.001; } catch (e) {}
      }).catch(() => {
        try { video.currentTime = 0.001; } catch (e) {}
      });
    } else {
      try { video.pause(); } catch (e) {}
      try { video.currentTime = 0.001; } catch (e) {}
    }
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

  const applyFallback = (progress) => {
    const scale = 1 + progress * 0.08;
    const opacity = 1 - progress * 0.25;
    video.style.transform = `scale(${scale})`;
    video.style.opacity = String(opacity);
  };

  const tick = () => {
    if (!ready) {
      requestAnimationFrame(tick);
      return;
    }

    const progress = computeProgress();

    if (isSafari) {
      applyFallback(progress);
    } else {
      // Snap exactly to a frame boundary (24fps) — avoids partial-frame seeks
      // that some decoders treat as cache misses.
      const fps = 24;
      const target = duration * progress;
      const snapped = Math.round(target * fps) / fps;
      const safe = Math.max(0.001, Math.min(snapped, duration - 1 / fps));
      if (Math.abs(video.currentTime - safe) > 1 / (fps * 2)) {
        try { video.currentTime = safe; } catch (e) {}
      }
    }

    requestAnimationFrame(tick);
  };

  const onMetadata = () => {
    duration = video.duration || 0;
    if (!duration || Number.isNaN(duration)) return;
    ready = true;
    forceFirstFrame();
  };

  if (video.readyState >= 1 && video.duration) {
    onMetadata();
  } else {
    video.addEventListener('loadedmetadata', onMetadata, { once: true });
    video.addEventListener('canplay', onMetadata, { once: true });
  }

  // Nudge the browser to start buffering immediately.
  try { video.load(); } catch (e) {}

  // Start the rAF loop. It will idle until `ready` flips true.
  requestAnimationFrame(tick);
})();
