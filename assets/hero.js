// ---------- Default Social — Hero Animation ----------
// CONVERT INTO REACT COMPONENTS LATER, THIS IS JUST A PROOF OF CONCEPT FOR NOW
// Neural-mesh of service nodes + morphing verb headline
(function() {
  const root = document.getElementById('hero-canvas-root');
  if (!root) return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
  root.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let DPR = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0;
  let mouse = { x: -9999, y: -9999, active: false };

  // ---------- Palette (reads CSS custom properties so the animation themes
  //            automatically when --accent / --line / --cream / --ink change) ----------
  function readOklch(name, fallback) {
    try {
      var raw = getComputedStyle(document.body).getPropertyValue(name).trim();
      var m = raw.match(/oklch\(([^)\/]+)(?:\/[^)]+)?\)/i);
      if (m && m[1]) return m[1].trim().replace(/\s+/g, ' ');
    } catch (e) {}
    return fallback;
  }
  var PAL = {
    accent:  readOklch('--accent',   '0.62 0.18 28'),   // tomato — action (core)
    accent2: readOklch('--accent-2', '0.50 0.10 220'),  // petrol — signal (endpoints)
    line:    readOklch('--line',     '0.85 0.012 85'),
    cream:   readOklch('--cream',    '0.20 0.010 60'),  // dark ink (text)
    ink:     readOklch('--ink',      '0.95 0.008 85'),  // bone (paper)
  };
  function oklchA(triplet, alpha) {
    return 'oklch(' + triplet + ' / ' + alpha + ')';
  }
  // Interpolate two oklch triplets ("L C H" strings) by t in [0,1].
  // Hue takes the shortest path around the wheel.
  function lerpOklch(a, b, t) {
    var pa = a.split(/\s+/).map(Number);
    var pb = b.split(/\s+/).map(Number);
    var L = pa[0] + (pb[0] - pa[0]) * t;
    var C = pa[1] + (pb[1] - pa[1]) * t;
    var ha = pa[2], hb = pb[2];
    if (hb - ha > 180) ha += 360;
    else if (hb - ha < -180) hb += 360;
    var H = ha + (hb - ha) * t;
    return L.toFixed(3) + ' ' + C.toFixed(3) + ' ' + H.toFixed(3);
  }
  // Allow external re-theming (e.g. palette swaps in the comparison canvas)
  window.__heroRefreshPalette = function () {
    PAL.accent  = readOklch('--accent',   PAL.accent);
    PAL.accent2 = readOklch('--accent-2', PAL.accent2);
    PAL.line    = readOklch('--line',     PAL.line);
    PAL.cream   = readOklch('--cream',    PAL.cream);
    PAL.ink     = readOklch('--ink',      PAL.ink);
  };

  const NODES_DEF = [
    { label: 'WEB',       angle: -0.95, r: 0.42 },
    { label: 'SEO',       angle: -0.32, r: 0.36 },
    { label: 'SOCIAL',    angle:  0.30, r: 0.40 },
    { label: 'CREATIVE',  angle:  0.95, r: 0.38 },
    { label: 'STRATEGY',  angle:  1.60, r: 0.42 },
    { label: 'VIRAL',     angle:  2.40, r: 0.36 },
    { label: 'GROWTH',    angle: -2.55, r: 0.40 },
    { label: 'AI',        angle: -1.70, r: 0.46 },
  ];
  const nodes = NODES_DEF.map((n, i) => ({
    ...n,
    x: 0, y: 0,
    bx: 0, by: 0,
    phase: i * 0.7,
    pulse: 0,
  }));

  // Edges — mostly star-from-center, plus a few cross links
  const center = { x: 0, y: 0, label: 'AI · CORE' };
  const extraEdges = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0],
    [0, 4], [2, 6], [3, 7],
  ];

  function resize() {
    const rect = root.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    layout();
  }

  function layout() {
    center.x = W * 0.5;
    center.y = H * 0.5;
    const baseR = Math.min(W, H) * 0.42;
    nodes.forEach(n => {
      n.bx = center.x + Math.cos(n.angle) * baseR * (n.r * 1.6);
      n.by = center.y + Math.sin(n.angle) * baseR * (n.r * 1.6);
    });
  }

  window.addEventListener('resize', resize);
  root.addEventListener('mousemove', (e) => {
    const rect = root.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
  });
  root.addEventListener('mouseleave', () => { mouse.active = false; });
  resize();

  let t0 = performance.now();
  let pulseClock = 0;

  function loop(now) {
    const t = (now - t0) / 1000;
    pulseClock += 1;

    // Update node positions
    nodes.forEach((n, i) => {
      const drift = 14;
      const fx = n.bx + Math.cos(t * 0.5 + n.phase) * drift;
      const fy = n.by + Math.sin(t * 0.6 + n.phase * 1.3) * drift;
      // mouse attraction
      let mx = 0, my = 0;
      if (mouse.active) {
        const dx = mouse.x - fx, dy = mouse.y - fy;
        const d2 = dx*dx + dy*dy;
        if (d2 < 240*240) {
          const f = (1 - d2 / (240*240)) * 18;
          mx = (dx / Math.sqrt(d2 + 1)) * f;
          my = (dy / Math.sqrt(d2 + 1)) * f;
        }
      }
      n.x = n.x ? n.x + (fx + mx - n.x) * 0.08 : fx;
      n.y = n.y ? n.y + (fy + my - n.y) * 0.08 : fy;
      n.pulse = Math.max(0, n.pulse - 0.02);
    });

    // Fire a random pulse occasionally
    if (Math.random() < 0.03) {
      nodes[Math.floor(Math.random() * nodes.length)].pulse = 1;
    }

    ctx.clearRect(0, 0, W, H);

    // Edges
    ctx.lineWidth = 1;
    extraEdges.forEach(([a, b]) => {
      const A = nodes[a], B = nodes[b];
      const grad = ctx.createLinearGradient(A.x, A.y, B.x, B.y);
      grad.addColorStop(0, oklchA(PAL.line, 0.7));
      grad.addColorStop(1, oklchA(PAL.line, 0.7));
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.stroke();
    });

    // Center-to-node edges (subtle tomato → petrol gradient, echoing the pulse path)
    nodes.forEach(n => {
      const grad = ctx.createLinearGradient(center.x, center.y, n.x, n.y);
      grad.addColorStop(0, oklchA(PAL.accent,  0.40));
      grad.addColorStop(1, oklchA(PAL.accent2, 0.40));
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(n.x, n.y);
      ctx.stroke();
    });

    // Traveling pulses along edges — tomato leaving center, fading through
    // the midpoint, re-emerging as petrol as they arrive at each outer node.
    const speed = 0.4;
    const tick = (t * speed) % 1;
    nodes.forEach((n, i) => {
      const offset = (tick + i * 0.13) % 1;
      const px = center.x + (n.x - center.x) * offset;
      const py = center.y + (n.y - center.y) * offset;
      const r = 2 + 2 * Math.sin(t * 4 + i);
      // V-curve alpha: peaks at the endpoints, dips to a near-invisible midpoint.
      const dip = Math.abs(offset * 2 - 1);
      const alpha = 0.15 + 0.75 * dip;
      const hue = lerpOklch(PAL.accent, PAL.accent2, offset);
      ctx.fillStyle = oklchA(hue, alpha);
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Outer nodes — petrol rings (signal endpoints) on bone-filled disks
    nodes.forEach((n) => {
      // halo when pulsing
      if (n.pulse > 0.01) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 22 + (1 - n.pulse) * 30, 0, Math.PI * 2);
        ctx.fillStyle = oklchA(PAL.accent2, 0.22 * n.pulse);
        ctx.fill();
      }
      // disk — bone fill so the petrol ring reads against the paper bg
      ctx.beginPath();
      ctx.arc(n.x, n.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = oklchA(PAL.ink, 1);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = oklchA(PAL.accent2, 0.95);
      ctx.stroke();

      // label
      ctx.font = '500 10px "JetBrains Mono", monospace';
      ctx.fillStyle = oklchA(PAL.cream, 0.92);
      ctx.textBaseline = 'middle';
      const isRight = n.x > center.x;
      ctx.textAlign = isRight ? 'left' : 'right';
      const ox = isRight ? 12 : -12;
      ctx.fillText(n.label, n.x + ox, n.y);
    });

    // Center node
    const centerPulse = 1 + Math.sin(t * 2.4) * 0.2;
    ctx.beginPath();
    ctx.arc(center.x, center.y, 26 * centerPulse, 0, Math.PI * 2);
    ctx.fillStyle = oklchA(PAL.accent, 0.10);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(center.x, center.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = oklchA(PAL.accent, 1);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(center.x, center.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = oklchA(PAL.ink, 1);
    ctx.fill();

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // ---------- Morphing verb ----------
  const verbEl = document.getElementById('hero-verb');
  if (verbEl) {
    const VERBS = ['design', 'build', 'launch', 'scale', 'optimise', 'engineer'];
    let i = 0;
    function swap() {
      verbEl.style.opacity = '0';
      verbEl.style.transform = 'translateY(-12px)';
      setTimeout(() => {
        i = (i + 1) % VERBS.length;
        verbEl.textContent = VERBS[i];
        verbEl.style.transform = 'translateY(12px)';
        requestAnimationFrame(() => {
          verbEl.style.opacity = '1';
          verbEl.style.transform = '';
        });
      }, 350);
    }
    verbEl.textContent = VERBS[0];
    setInterval(swap, 2200);
  }

  // ---------- Live status counter ----------
  const counters = document.querySelectorAll('[data-counter]');
  counters.forEach(el => {
    const base = parseInt(el.dataset.counter, 10);
    let val = base;
    el.textContent = val.toLocaleString();
    setInterval(() => {
      val += Math.random() < 0.5 ? 1 : 0;
      el.textContent = val.toLocaleString();
    }, 1800 + Math.random() * 2000);
  });
})();
