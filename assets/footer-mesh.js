/* ---------- Default Social — Footer divider ribbon ----------
   Anchored-grid mesh that lives in a full-bleed ribbon above the footer.

   Model: every dot has a fixed home on a jittered grid (= organisation).
   Each frame computes a TARGET offset from (ambient breathing + cursor
   repulsion + random pulsing) and EASES the live offset toward it. When
   the influence ends the offset eases back to zero — no velocity builds
   up, so the field can never clump.

   Mounts on .footer-ribbon. Respects prefers-reduced-motion (single
   static frame).
------------------------------------------------------------------- */
(function () {
  const ribbon = document.querySelector('.footer-ribbon');
  if (!ribbon) return;
  if (ribbon.dataset.meshMounted === '1') return;
  ribbon.dataset.meshMounted = '1';

  // Host setup
  const cs = getComputedStyle(ribbon);
  if (cs.position === 'static') ribbon.style.position = 'relative';
  ribbon.style.isolation = 'isolate';
  ribbon.style.overflow = 'hidden';

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'absolute', inset: '0', zIndex: '0', pointerEvents: 'none',
  });
  ribbon.prepend(canvas);

  // ----- Tunable parameters -----
  const P = {
    cellSize:        60,     // jittered grid pitch — smaller = denser
    jitterPct:       0.55,   // home jitter as % of cell size
    baseR:           2.4,    // base node radius
    jitterR:         2.6,    // random radius added on top
    TH:              160,    // link distance threshold
    cursorR:         180,    // cursor influence radius
    cursorPush:      48,     // peak cursor displacement (px)
    ambient:         3.2,    // ambient oscillation amplitude (px)
    ease:            0.12,   // offset easing per frame
    dotOp:           0.75,
    lineOp:          0.40,
    scrollPxPerSec:  32,     // leftward drift speed
  };

  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0, h = 0;
  let nodes = [];
  let totalW = 0;                       // seamless wrap width (snaps to grid pitch)
  const mouse = { x: -9999, y: -9999, active: false };

  function resize() {
    const r = ribbon.getBoundingClientRect();
    w = Math.max(1, r.width);
    h = Math.max(1, r.height);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function init() {
    nodes = [];
    const sz = P.cellSize;
    // Buffer one cell on each side so dots stream in/out cleanly
    const cols = Math.ceil(w / sz) + 2;
    const rows = Math.ceil(h / sz) + 1;
    // Wrap width snaps to grid pitch so the pattern is seamless
    totalW = cols * sz;
    // Inset homes vertically so ambient + max radius still fits inside
    const safeY = P.baseR + P.jitterR + P.ambient + 2.4 + 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Start one cell left of 0 so the leading column drifts on screen smoothly
        const hx = (c - 0.5) * sz + Math.random() * sz * P.jitterPct;
        const hy = (r + 0.5) * sz + (Math.random() - 0.5) * sz * P.jitterPct;
        if (hy < safeY || hy > h - safeY) continue;
        nodes.push({
          hx: hx, hy: hy,
          ox: 0, oy: 0,
          phase:       Math.random() * Math.PI * 2,
          phaseSpeed:  0.4 + Math.random() * 0.4,
          pulsePhase:  Math.random() * Math.PI * 2,
          pulsePeriod: 3 + Math.random() * 5,
          r: P.baseR + Math.random() * P.jitterR,
          accent: Math.random() < 0.28 ? 1 : 0,   // ~28% petrol, 72% tomato
        });
      }
    }
  }

  let rafId = 0;
  let last = performance.now();

  function step(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now * 0.001;

    ctx.clearRect(0, 0, w, h);

    // ----- Scroll homes leftward, wrap right -----
    const drift = P.scrollPxPerSec * dt;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.hx -= drift;
      if (n.hx < -P.cellSize) n.hx += totalW;
    }

    // ----- Update each node's target offset; ease toward it -----
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];

      let tx = Math.sin(t * n.phaseSpeed + n.phase) * P.ambient;
      let ty = Math.cos(t * n.phaseSpeed * 0.85 + n.phase * 1.3) * P.ambient;

      if (mouse.active) {
        const dx = n.hx - mouse.x, dy = n.hy - mouse.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d > 0.01 && d < P.cursorR) {
          const f = (1 - d / P.cursorR);
          const ease = f * f * (3 - 2 * f);
          tx += (dx / d) * ease * P.cursorPush;
          ty += (dy / d) * ease * P.cursorPush;
        }
      }

      n.ox += (tx - n.ox) * P.ease;
      n.oy += (ty - n.oy) * P.ease;
    }

    // Edges (early-reject on home distance) — endpoints clamped vertically
    const TH = P.TH;
    const margin = P.baseR + P.jitterR + 2.4 + 1; // safe inset so dots + pulse fit
    function clampY(v) { return v < margin ? margin : (v > h - margin ? h - margin : v); }
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      const ax = a.hx + a.ox, ay = clampY(a.hy + a.oy);
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const hdx = a.hx - b.hx, hdy = a.hy - b.hy;
        if (hdx * hdx + hdy * hdy > (TH + 80) * (TH + 80)) continue;

        const bx = b.hx + b.ox, by = clampY(b.hy + b.oy);
        const dx = ax - bx, dy = ay - by;
        const d2 = dx * dx + dy * dy;
        if (d2 < TH * TH) {
          const d = Math.sqrt(d2);
          const alpha = (1 - d / TH) * P.lineOp;
          ctx.strokeStyle = 'oklch(0.45 0.06 220 / ' + alpha.toFixed(3) + ')';
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }
      }
    }

    // Nodes (with random pulsing) — clamped vertically
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const x = n.hx + n.ox, y = clampY(n.hy + n.oy);
      // Sharp pulse — sin^10 keeps most nodes at rest, occasional peaks
      const s = Math.sin((t / n.pulsePeriod) * Math.PI * 2 + n.pulsePhase);
      const pulse = s > 0 ? Math.pow(s, 10) : 0;
      const rPulse  = pulse * 2.4;
      const opPulse = pulse * 0.22;

      ctx.beginPath();
      ctx.arc(x, y, n.r + rPulse, 0, Math.PI * 2);
      ctx.fillStyle = n.accent
        ? 'oklch(0.50 0.10 220 / ' + (P.dotOp + opPulse).toFixed(3) + ')'
        : 'oklch(0.62 0.18 28 / ' + (P.dotOp + opPulse).toFixed(3) + ')';
      ctx.fill();

      if (pulse > 0.25) {
        ctx.beginPath();
        ctx.arc(x, y, (n.r + rPulse) * 2.4, 0, Math.PI * 2);
        ctx.fillStyle = n.accent
          ? 'oklch(0.50 0.10 220 / ' + (pulse * 0.10).toFixed(3) + ')'
          : 'oklch(0.62 0.18 28 / ' + (pulse * 0.10).toFixed(3) + ')';
        ctx.fill();
      }
    }

    rafId = requestAnimationFrame(step);
  }

  // Observers & events
  new ResizeObserver(() => { resize(); init(); }).observe(ribbon);
  resize(); init();

  ribbon.addEventListener('mousemove', (e) => {
    const r = ribbon.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    mouse.active = true;
  });
  ribbon.addEventListener('mouseleave', () => { mouse.active = false; });

  // Pause when offscreen
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting && !rafId) {
        last = performance.now();
        rafId = requestAnimationFrame(step);
      } else if (!entry.isIntersecting && rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }
  }, { threshold: 0 });
  io.observe(ribbon);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    step(performance.now());
    cancelAnimationFrame(rafId);
    rafId = 0;
  } else {
    rafId = requestAnimationFrame((t) => { last = t; step(t); });
  }
})();
