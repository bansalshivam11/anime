/* ═══════════════════════════════════════════════════════════
   UCHIHA ITACHI — scroll-scrubbed frames + mouse-tracked eyes
   ═══════════════════════════════════════════════════════════ */

import {
  clamp,
  createGhostCursor,
  damp,
  drawCover,
  fitCanvas,
  lerp,
  syncSize,
  window4,
} from "./canvas-utils.js";

export function initPageEffects() {
  let disposed = false;
  let animationFrameId;
  let revealObserver;
  const eventController = new AbortController();
  const { signal } = eventController;

  const MAIN_COUNT = 71;
  const EYE_COUNT  = 51;
  const pad = n => String(n).padStart(3, '0');

  const REQUIRED_ELEMENT_IDS = [
    'loader', 'loaderFill', 'loaderPct', 'amaterasuCanvas', 'stormFlash',
    'stormBolt', 'boltPath', 'boltGlow', 'cursor', 'soundToggle',
    'soundState', 'railScroll', 'hint', 'scrub', 'mainCanvas', 'scrubGlow',
    'titleblock', 'featherCanvas', 'eyes', 'eyeCanvas', 'eyeFlare',
    'eyeReadout', 'jutsu', 'ghostCanvas',
  ];
  const missingElements = REQUIRED_ELEMENT_IDS.filter(id => !document.getElementById(id));
  if (missingElements.length) {
    throw new Error(`Page effects could not start; missing elements: ${missingElements.join(', ')}`);
  }

  const mainFrames = [];
  const eyeFrames  = [];
  let loaded = 0;
  const total = MAIN_COUNT + EYE_COUNT;

  const loaderEl  = document.getElementById('loader');
  const loaderFill = document.getElementById('loaderFill');
  const loaderPct  = document.getElementById('loaderPct');

  function load(src, bucket, index) {
    return new Promise(res => {
      const img = new Image();
      img.decoding = 'async';
      let complete = false;
      const finish = success => {
        if (complete) return;
        complete = true;
        if (disposed) {
          res();
          return;
        }
        bucket[index] = success ? img : null;
        if (!success) console.warn(`Image frame failed to load: ${src}`);
        loaded++;
        const pct = loaded / total;
        loaderFill.style.width = `${(pct * 100).toFixed(1)}%`;
        loaderPct.textContent = String(Math.round(pct * 100)).padStart(2, '0');
        res();
      };
      img.onload = () => finish(img.naturalWidth > 0);
      img.onerror = () => finish(false);
      img.src = src;
    });
  }

  function nearestLoadedFrame(frames, index) {
    if (!Array.isArray(frames) || frames.length === 0) return null;
    index = clamp(Math.floor(index), 0, frames.length - 1);
    if (frames[index]) return frames[index];
    for (let distance = 1; distance < frames.length; distance++) {
      const before = frames[index - distance];
      const after = frames[index + distance];
      if (before) return before;
      if (after) return after;
    }
    return null;
  }

  const jobs = [];
  for (let i = 1; i <= MAIN_COUNT; i++) jobs.push(load(`frames/main/${pad(i)}.jpg`, mainFrames, i - 1));
  for (let i = 1; i <= EYE_COUNT;  i++) jobs.push(load(`frames/eyes/${pad(i)}.jpg`, eyeFrames,  i - 1));

  Promise.all(jobs).then(() => {
    if (disposed) return;
    setTimeout(() => {
      if (disposed) return;
      loaderEl.classList.add('done');
      // ensure first paint is correct once fonts/layout settle
      resizeAll();
      setTimeout(() => {
        if (!disposed) loaderEl.style.display = 'none';
      }, 1100);
    }, 420);
  });

  /* ─────────────────── canvas cover-draw helper ─────────────────── */
  /* Keeps the backing store in step with the element's real box. Uses
     offsetWidth/Height, not getBoundingClientRect, because these canvases carry
     CSS transforms and a transformed rect would poison the size. */
  const scrubSection = document.getElementById('scrub');
  const mainCanvas   = document.getElementById('mainCanvas');
  const scrubGlow    = document.getElementById('scrubGlow');
  const titleblock   = document.getElementById('titleblock');
  const phases       = [...document.querySelectorAll('.phase')];
  let mainCtx = fitCanvas(mainCanvas);

  /* frame index is lerped toward the scroll target → butter-smooth both ways */
  let frameTarget = 0, frameShown = 0, lastDrawn = -1;
  let scrubProgress = 0;

  function readScrub() {
    const rect = scrubSection.getBoundingClientRect();
    const dist = scrubSection.offsetHeight - window.innerHeight;
    scrubProgress = clamp(-rect.top / (dist || 1));
    frameTarget = scrubProgress * (MAIN_COUNT - 1);
  }

  /* caption choreography */
  /* tuned to the footage: 1-13 closed · 14-24 opening · 25-52 sharingan · 53-71 crows */
  const PHASE_WINDOWS = [
    [0.13, 0.17, 0.21, 0.25],   // 静寂
    [0.27, 0.31, 0.37, 0.42],   // 覚醒
    [0.45, 0.49, 0.63, 0.69],   // 写輪眼
    [0.74, 0.79, 0.97, 1.01],   // 烏
  ];

  function paintOverlays(p) {
    phases.forEach((el, i) => {
      const phaseWindow = PHASE_WINDOWS[i];
      if (!phaseWindow) {
        el.style.opacity = '0';
        return;
      }
      const o = window4(p, ...phaseWindow);
      el.style.opacity = o.toFixed(3);
      el.style.setProperty('--y', `${((1 - o) * 34).toFixed(1)}px`);
      el.style.filter = `blur(${((1 - o) * 7).toFixed(2)}px)`;
    });

    const t = window4(p, -0.10, -0.05, 0.07, 0.13);
    titleblock.style.opacity = t.toFixed(3);
    titleblock.style.transform = `translateX(-50%) translateY(${((1 - t) * 40).toFixed(1)}px) scale(${(0.97 + t * 0.03).toFixed(3)})`;
    titleblock.style.letterSpacing = `${((1 - t) * 0.12).toFixed(3)}em`;

    // red bloom ramps up as the sharingan ignites
    scrubGlow.style.opacity = (clamp((p - 0.32) / 0.16) * 0.85).toFixed(3);
  }

  /* ═════════════════ crow-feather particle field ═════════════════ */
  const featherCanvas = document.getElementById('featherCanvas');
  let fCtx = fitCanvas(featherCanvas);
  const feathers = [];

  function seedFeathers() {
    feathers.length = 0;
    const n = window.innerWidth < 820 ? 28 : 54;
    for (let i = 0; i < n; i++) {
      feathers.push({
        x: Math.random(), y: Math.random(),
        s: 0.35 + Math.random() * 1.15,      // scale
        vx: 0.18 + Math.random() * 0.5,      // drift speed
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.02,
        sway: Math.random() * Math.PI * 2,
        a: 0.16 + Math.random() * 0.5,
      });
    }
  }
  seedFeathers();

  function drawFeather(ctx, f, w, h, dir, intensity) {
    const x = f.x * w, y = f.y * h;
    const len = 22 * f.s * (w / 1280 + 0.55);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(f.rot + Math.sin(f.sway) * 0.35 + (dir < 0 ? Math.PI : 0));
    ctx.globalAlpha = f.a * intensity;
    ctx.fillStyle = '#0d0d10';
    ctx.strokeStyle = 'rgba(255,43,43,.55)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-len, 0);
    ctx.quadraticCurveTo(-len * 0.15, -len * 0.42, len, 0);
    ctx.quadraticCurveTo(-len * 0.15,  len * 0.42, -len, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  /* ═════════════════ AMATERASU — black flame hem ═════════════════ */
  /* Amaterasu burns black, so the fire can't be read by its fill — it's read by
     the crimson rim around it. Every tongue is drawn twice: a hot additive halo
     first, then a slightly smaller pure-black core stamped on top. What survives
     between the two radii is the burning edge. */
  const amaCanvas = document.getElementById('amaterasuCanvas');
  let amaCtx = fitCanvas(amaCanvas);
  const flames = [];
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let amaPainted = false;

  function seedFlames() {
    flames.length = 0;
    /* one tongue every ~26 css px, so the hem stays dense on any width */
    const n = Math.max(22, Math.round(window.innerWidth / 26));
    for (let i = 0; i < n; i++) {
      const depth = Math.random();                    // 0 far · 1 near
      flames.push({
        x: (i + Math.random() * 1.1) / n,             // 0..1 across the band
        depth,
        drift: (Math.random() - 0.5) * 0.05,          // lateral wander per second
        /* far tongues run tall and thin, near ones squat and fat — capped under
           1 so no tip is ever cut off flat by the canvas edge */
        h: (0.42 + Math.random() * 0.5) * (1.15 - depth * 0.35),
        w: (0.34 + Math.random() * 0.6) * (0.7 + depth * 0.7),
        speed: 0.7 + Math.random() * 1.25,            // lick rate
        lean: (Math.random() - 0.5) * 0.5,            // steady tilt off vertical
        phase: Math.random() * Math.PI * 2,
        seed: Math.random() * 100,
      });
    }
    /* far tongues first, so a near black body can eclipse a distant rim */
    flames.sort((a, b) => a.depth - b.depth);
  }
  seedFlames();

  /* one tongue = a stack of shrinking blobs riding a leaning, wobbling spine */
  function flameBlob(f, i, BLOBS, w, h, p, tall, wide) {
    const u = i / (BLOBS - 1);                        // 0 base → 1 tip
    const baseX = (f.x + Math.sin(p * 0.4 + f.seed) * f.drift) * w;
    return {
      u,
      x: baseX + (f.lean * u + Math.sin(p * 1.7 + u * 3.4 + f.seed) * 0.6 * u) * wide,
      /* the spine crowds its blobs toward the tip, which sharpens the taper */
      y: h - Math.pow(u, 0.82) * tall,
      r: wide * (1 - u * 0.78) + wide * 0.06,
    };
  }

  function drawFlame(ctx, f, w, h, t) {
    const p = f.phase + t * f.speed;
    const lick = 0.74 + Math.sin(p) * 0.18 + Math.sin(p * 2.9 + f.seed) * 0.08;
    const tall = h * f.h * lick;
    const wide = h * 0.24 * f.w;
    const near = 0.55 + f.depth * 0.45;               // distance dims everything
    const BLOBS = 9;

    /* pass 1 — the halo. Hot only near the root; the tip burns out to nothing. */
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < BLOBS; i++) {
      const b = flameBlob(f, i, BLOBS, w, h, p, tall, wide);
      const r = b.r * 1.28;
      const heat = Math.pow(1 - b.u, 1.6) * 0.9 + 0.06;
      const g = ctx.createRadialGradient(b.x, b.y, r * 0.45, b.x, b.y, r);
      g.addColorStop(0,    `rgba(214,32,44,${0.42 * heat * near})`);
      g.addColorStop(0.55, `rgba(126,12,30,${0.2 * heat * near})`);
      g.addColorStop(1,    'rgba(46,0,14,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    /* pass 2 — the black body, punched inside the halo */
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < BLOBS; i++) {
      const b = flameBlob(f, i, BLOBS, w, h, p, tall, wide);
      const a = (0.97 - b.u * 0.42) * near;           // tips thin out into smoke
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      g.addColorStop(0,   `rgba(3,2,4,${a})`);
      g.addColorStop(0.62, `rgba(6,3,8,${a * 0.8})`);
      g.addColorStop(1,   'rgba(9,5,11,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* a few sparks shed off the tips — cheap, and they sell the fire as alive */
  function drawEmbers(ctx, w, h, t) {
    ctx.globalCompositeOperation = 'lighter';
    const n = 14;
    for (let i = 0; i < n; i++) {
      const s = i * 12.9898;
      const life = (t * (0.22 + (i % 5) * 0.05) + i / n) % 1;
      const x = ((Math.sin(s) * 0.5 + 0.5) + Math.sin(t * 0.6 + s) * 0.02) * w;
      const y = h - life * h * 0.95;
      const a = Math.sin(life * Math.PI) * 0.5;
      const r = h * 0.018 * (1.4 - life * 0.6);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,74,60,${a})`);
      g.addColorStop(1, 'rgba(120,10,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function paintAmaterasu(t) {
    const w = amaCanvas.width, h = amaCanvas.height;
    amaCtx.clearRect(0, 0, w, h);
    for (const f of flames) drawFlame(amaCtx, f, w, h, t);
    drawEmbers(amaCtx, w, h, t);
  }

  /* ═══════════════ ACT II — mouse-tracked eyes ═══════════════ */
  const eyesSection = document.getElementById('eyes');
  const eyeCanvas   = document.getElementById('eyeCanvas');
  const eyeFlare    = document.getElementById('eyeFlare');
  const eyeReadout  = document.getElementById('eyeReadout');
  let eyeCtx = fitCanvas(eyeCanvas);

  /* Gaze lookup table.
     The clip's pupils travel: centre(f1) -> far left(f5..9) -> centre(f13..27)
     -> far right(f30..41) -> back toward centre(f43..51). Feeding the raw
     sequence to the pointer made the eyes swing back left at the right-hand end.
     These are the only frames that form a monotonic left->right sweep, ordered by
     the measured red-pupil centroid (px, image space, 1280 wide). */
  const GAZE_LUT = [
    { f: 5,  cx: 613.4 },   // far left
    { f: 4,  cx: 622.5 },
    { f: 3,  cx: 631.3 },
    { f: 2,  cx: 645.2 },
    { f: 1,  cx: 652.4 },   // centre
    { f: 28, cx: 652.5 },
    { f: 29, cx: 663.4 },
    { f: 30, cx: 671.4 },
    { f: 31, cx: 672.7 },   // far right
  ].map(o => ({ idx: o.f - 1, cx: o.cx }));

  let mx = 0.5, my = 0.5;            // raw pointer, 0..1
  let ex = 0.5, ey = 0.5;            // eased pointer
  let gazePos = (GAZE_LUT.length - 1) / 2;   // float position along the LUT
  let eyeLastKey = '';

  window.addEventListener('pointermove', e => {
    mx = e.clientX / window.innerWidth;
    my = e.clientY / window.innerHeight;
    cursorX = e.clientX; cursorY = e.clientY;
  }, { passive: true, signal });

  // touch: let a finger drag the gaze too
  window.addEventListener('touchmove', e => {
    const t = e.touches[0];
    if (!t) return;
    mx = t.clientX / window.innerWidth;
    my = t.clientY / window.innerHeight;
  }, { passive: true, signal });

  /* ═══════════════ ACT III — ghost cursor + reveal + parallax ═══════════════ */
  const jutsuSection = document.getElementById('jutsu');
  const ghostCanvas  = document.getElementById('ghostCanvas');
  const ghost = createGhostCursor(ghostCanvas, {
    color: '#ff2b2b',      // sharingan red
    trailLength: 28,
    brightness: 0.45,      // 29 additive blobs stack fast — higher blows out to white
    edgeIntensity: 0.45,
  });

  let jutsuLit = false;
  let revealX = 0.5, revealY = 0.5;      // eased, section-relative 0..1
  let revealTX = 0.5, revealTY = 0.5;
  let revealR = 0, revealRT = 420;   // starts closed: no shader work until hovered

  function setLit(on) {
    if (jutsuLit === on) return;
    jutsuLit = on;
    jutsuSection.classList.toggle('lit', on);
    if (!on) ghost.leave();
  }

  jutsuSection.addEventListener('pointermove', e => {
    const r = jutsuSection.getBoundingClientRect();
    revealTX = clamp((e.clientX - r.left) / Math.max(1, r.width));
    revealTY = clamp((e.clientY - r.top) / Math.max(1, r.height));
    ghost.move(revealTX, revealTY, true);
    setLit(true);
  }, { passive: true, signal });

  jutsuSection.addEventListener('pointerleave', () => setLit(false), { passive: true, signal });

  // hovering a card opens the reveal wider — the image "comes through" the card
  document.querySelectorAll('.jutsu .card').forEach(card => {
    card.addEventListener('pointerenter', () => { revealRT = 580; }, { passive: true, signal });
    card.addEventListener('pointerleave', () => { revealRT = 420; }, { passive: true, signal });
  });

  /* parallax targets: heading bits carry an explicit data-px, cards get one by index */
  const pxItems = [...document.querySelectorAll('#jutsu [data-px]')]
    .map(el => ({ el, speed: parseFloat(el.dataset.px) || 0.2, delay: 0 }));

  document.querySelectorAll('#jutsu .card').forEach((el, i) => {
    pxItems.push({ el, speed: 0.30 + i * 0.06, delay: i * 0.05 });
  });
  document.querySelectorAll('.jutsu__amaterasu').forEach(el => {
    pxItems.push({ el, speed: -0.22, delay: 0.1 });
  });

  // start hidden so nothing pops in before the first parallax paint
  pxItems.forEach(it => { it.el.style.opacity = '0'; });
  ghost.resize();

  function paintJutsu() {
    const r = jutsuSection.getBoundingClientRect();
    const vh = window.innerHeight;
    if (r.top > vh || r.bottom < 0) return;

    // 0 when the section is one viewport below, 1 once its top passes the middle
    const enter = clamp((vh - r.top) / (vh * 0.9));

    for (const it of pxItems) {
      const local = clamp((enter - it.delay) / (1 - it.delay || 1));
      const eased = 1 - Math.pow(1 - local, 3);          // easeOutCubic
      // parallax keeps drifting after the fade completes
      const rect = it.el.getBoundingClientRect();
      const centred = (rect.top + rect.height / 2 - vh / 2) / vh;   // -1..1-ish
      const drift = centred * it.speed * 120;
      it.el.style.opacity = eased.toFixed(3);
      it.el.style.transform =
        `translate3d(0, ${(drift + (1 - eased) * 60).toFixed(1)}px, 0)`;
    }
  }

  /* ═════════════════════ custom cursor ═════════════════════ */
  const cursorEl = document.getElementById('cursor');
  let cursorX = window.innerWidth / 2, cursorY = window.innerHeight / 2;
  let cx = cursorX, cy = cursorY;
  document.querySelectorAll('a, .card, .eyes__sticky').forEach(el => {
    el.addEventListener('pointerenter', () => cursorEl.classList.add('hot'), { signal });
    el.addEventListener('pointerleave', () => cursorEl.classList.remove('hot'), { signal });
  });

  /* ═════════════════════ scroll chrome ═════════════════════ */
  const hint = document.getElementById('hint');
  const railScroll = document.getElementById('railScroll');
  let lastScrollY = window.scrollY;
  let scrollDir = 1, scrollVel = 0;

  function readScroll(deltaMs) {
    const y = window.scrollY;
    const d = (y - lastScrollY) * (1000 / 60) / Math.max(deltaMs, 1);
    if (Math.abs(d) > 0.4) scrollDir = d > 0 ? 1 : -1;
    scrollVel = damp(scrollVel, Math.min(Math.abs(d) / 42, 1), 0.12, deltaMs);
    lastScrollY = y;

    const doc = document.documentElement.scrollHeight - window.innerHeight;
    const pct = Math.round((y / (doc || 1)) * 100);
    railScroll.textContent = `SCROLL ${String(pct).padStart(3, '0')}%`;
    hint.classList.toggle('hide', y > window.innerHeight * 0.4);
  }

  /* ═══════════════════════════════════════════════════════════
     STORM — lightning flashes + synthesised thunder
     A strike is a burst of flickers; STRIKE_GAP is the beat between the
     flickers inside one strike. Strikes themselves recur on a random
     interval so it reads as weather rather than a strobe.
     ═══════════════════════════════════════════════════════════ */
  const STRIKE_GAP   = 500;          // ms between flickers within a strike
  const STRIKE_EVERY = [3200, 7000]; // ms between strikes (random in range)

  const stormFlash = document.getElementById('stormFlash');
  const stormBolt  = document.getElementById('stormBolt');
  const boltPath   = document.getElementById('boltPath');
  const boltGlow   = document.getElementById('boltGlow');
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  /* ── thunder: filtered noise + sub rumble, no audio files ── */
  let audioCtx = null, thunderOn = false;

  function initAudio() {
    if (audioCtx) return audioCtx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      audioCtx = new AC();
      return audioCtx;
    } catch (error) {
      console.warn('Thunder audio is unavailable in this browser.', error);
      return null;
    }
  }

  function playThunder(power = 1) {
    if (!thunderOn) return;
    const ctx = initAudio();
    if (!ctx || ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const dur = 2.2 + Math.random() * 2.4 * power;

    // noise burst = the crack
    const frames = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < frames; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;          // brown-ish noise
      d[i] = last * 3.2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1400 * power, now);
    lp.frequency.exponentialRampToValueAtTime(90, now + dur);   // distance rolloff

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 28;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.55 * power, now + 0.04);  // crack
    gain.gain.exponentialRampToValueAtTime(0.16 * power, now + 0.5);   // body
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);         // rumble tail

    // sub-bass shove you feel more than hear
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(58, now);
    sub.frequency.exponentialRampToValueAtTime(24, now + dur * 0.8);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.exponentialRampToValueAtTime(0.32 * power, now + 0.12);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + dur * 0.85);

    src.connect(hp); hp.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
    sub.connect(subGain); subGain.connect(ctx.destination);

    src.start(now); src.stop(now + dur);
    sub.start(now); sub.stop(now + dur);
  }

  /* ── bolt geometry: recursive jagged polyline with forks ── */
  function makeBolt() {
    const x0 = 80 + Math.random() * 840;
    let x = x0, y = 0;
    let dPath = `M ${x.toFixed(0)} 0`;
    const steps = 14 + Math.floor(Math.random() * 8);
    const forks = [];
    const drift = (Math.random() - 0.5) * 40;

    for (let i = 1; i <= steps; i++) {
      y = (i / steps) * (620 + Math.random() * 300);
      x += drift + (Math.random() - 0.5) * 130;
      x = Math.max(20, Math.min(980, x));
      dPath += ` L ${x.toFixed(0)} ${y.toFixed(0)}`;
      if (Math.random() < 0.30 && i > 3) {
        let fx = x, fy = y, f = `M ${x.toFixed(0)} ${y.toFixed(0)}`;
        const fs = 2 + Math.floor(Math.random() * 4);
        for (let k = 0; k < fs; k++) {
          fx += (Math.random() - 0.5) * 150;
          fy += 40 + Math.random() * 80;
          f += ` L ${fx.toFixed(0)} ${fy.toFixed(0)}`;
        }
        forks.push(f);
      }
    }
    return { d: dPath + ' ' + forks.join(' '), x: x0 / 1000 };
  }

  let stormTimer = null;

  function flicker(el, peak, ms) {
    if (disposed) return;
    el.style.transition = 'none';
    el.style.opacity = String(peak);
    requestAnimationFrame(() => {
      if (disposed) return;
      el.style.transition = `opacity ${ms}ms cubic-bezier(.22,1,.36,1)`;
      el.style.opacity = '0';
    });
  }

  function strike() {
    if (disposed) return;
    const heavy = Math.random() < 0.55;           // heavy = visible bolt
    const power = heavy ? 1 : 0.55 + Math.random() * 0.25;

    if (heavy) {
      const b = makeBolt();
      boltPath.setAttribute('d', b.d);
      boltGlow.setAttribute('d', b.d);
      stormFlash.style.setProperty('--bx', (b.x * 100).toFixed(0) + '%');
      flicker(stormBolt, 1, 190);
    } else {
      stormFlash.style.setProperty('--bx', (15 + Math.random() * 70).toFixed(0) + '%');
    }

    flicker(stormFlash, heavy ? 0.9 : 0.42, heavy ? 380 : 300);

    // the second beat of the same strike, one STRIKE_GAP later
    const beats = heavy ? 1 + Math.floor(Math.random() * 2) : 1;
    for (let i = 1; i <= beats; i++) {
      setTimeout(() => {
        if (disposed) return;
        flicker(stormFlash, (heavy ? 0.7 : 0.3) * (1 - i * 0.2), 260);
        if (heavy && i === 1) flicker(stormBolt, 0.75, 140);
      }, STRIKE_GAP * i);
    }

    // thunder trails the flash by the speed of sound
    setTimeout(() => {
      if (!disposed) playThunder(power);
    }, heavy ? 260 : 620);

    const [lo, hi] = STRIKE_EVERY;
    stormTimer = setTimeout(strike, lo + Math.random() * (hi - lo));
  }

  if (!reducedMotion) stormTimer = setTimeout(strike, 1800);

  /* ── sound toggle (browsers require a gesture before audio) ── */
  const soundToggle = document.getElementById('soundToggle');
  const soundState  = document.getElementById('soundState');
  soundToggle.addEventListener('click', async () => {
    thunderOn = !thunderOn;
    soundToggle.setAttribute('aria-pressed', String(thunderOn));
    soundState.textContent = thunderOn ? 'ON' : 'OFF';
    if (thunderOn) {
      try {
        const ctx = initAudio();
        if (ctx && ctx.state === 'suspended') await ctx.resume();
        playThunder(0.7);
      } catch (error) {
        thunderOn = false;
        soundToggle.setAttribute('aria-pressed', 'false');
        soundState.textContent = 'OFF';
        console.warn('Thunder audio could not start.', error);
      }
    }
  }, { signal });

  /* ═════════════════════ resize ═════════════════════ */
  function resizeAll() {
    mainCtx = fitCanvas(mainCanvas);
    fCtx    = fitCanvas(featherCanvas);
    eyeCtx  = fitCanvas(eyeCanvas);
    amaCtx  = fitCanvas(amaCanvas);
    lastDrawn = -1; eyeLastKey = '';
    seedFeathers();
    seedFlames(); amaPainted = false;
    ghost.resize();
  }
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resizeAll, 140); }, { signal });

  /* ═════════════════════ main loop ═════════════════════ */
  let previousFrameTime = 0;

  function tick(time) {
    const deltaMs = previousFrameTime
      ? Math.min(time - previousFrameTime, 50)
      : 1000 / 60;
    const frameScale = deltaMs / (1000 / 60);
    previousFrameTime = time;

    readScroll(deltaMs);
    readScrub();

    if (syncSize(mainCanvas) || syncSize(eyeCanvas) ||
        syncSize(featherCanvas) || syncSize(amaCanvas)) resizeAll();

    /* — Amaterasu: the hem never stops burning (one static pass if the user
         asked for reduced motion) — */
    if (!reduceMotion) paintAmaterasu(performance.now() / 1000);
    else if (!amaPainted) { paintAmaterasu(0); amaPainted = true; }

    /* — Act I: scrubbed frames — */
    frameShown = damp(frameShown, frameTarget, 0.14, deltaMs);
    const idx = Math.round(clamp(frameShown, 0, MAIN_COUNT - 1));
    if (idx !== lastDrawn) {
      const w = mainCanvas.width, h = mainCanvas.height;
      mainCtx.clearRect(0, 0, w, h);
      if (drawCover(mainCtx, nearestLoadedFrame(mainFrames, idx), w, h)) lastDrawn = idx;
    }
    paintOverlays(scrubProgress);

    /* — feathers: fly forward on scroll down, backward on scroll up — */
    const fw = featherCanvas.width, fh = featherCanvas.height;
    const intensity = clamp((scrubProgress - 0.70) / 0.14) * (0.45 + scrollVel * 0.55);
    fCtx.clearRect(0, 0, fw, fh);
    if (intensity > 0.01) {
      const speed = (0.0009 + scrollVel * 0.006) * scrollDir;
      for (const f of feathers) {
        f.x += f.vx * speed * frameScale;
        f.y += (Math.sin(f.sway) * 0.0006 + f.vx * speed * 0.18) * frameScale;
        f.sway += (0.02 + f.vx * 0.01) * frameScale;
        f.rot  += f.spin * (0.3 + scrollVel) * frameScale;
        if (f.x > 1.15) f.x = -0.15;
        if (f.x < -0.15) f.x = 1.15;
        if (f.y > 1.15) f.y = -0.15;
        if (f.y < -0.15) f.y = 1.15;
        drawFeather(fCtx, f, fw, fh, scrollDir, intensity);
      }
    }

    /* — Act II: gaze follows the pointer — */
    ex = damp(ex, mx, 0.075, deltaMs);
    ey = damp(ey, my, 0.075, deltaMs);

    const eyeRect = eyesSection.getBoundingClientRect();
    const eyeVisible = eyeRect.top < window.innerHeight && eyeRect.bottom > 0;

    if (eyeVisible) {
      /* pointer X walks the monotonic gaze table — left stays left, right stays
         right. The image itself never moves; only which frame is shown changes. */
      gazePos = damp(gazePos, ex * (GAZE_LUT.length - 1), 0.13, deltaMs);
      const g = clamp(gazePos, 0, GAZE_LUT.length - 1);
      const i0 = Math.floor(g), i1 = Math.min(i0 + 1, GAZE_LUT.length - 1);
      const t = g - i0;
      const key = `${i0}|${t.toFixed(2)}`;

      if (key !== eyeLastKey) {
        const w = eyeCanvas.width, h = eyeCanvas.height;
        eyeCtx.clearRect(0, 0, w, h);
        // crossfade the two nearest gaze frames so the sweep reads continuous
        eyeCtx.globalAlpha = 1;
        const frameA = nearestLoadedFrame(eyeFrames, GAZE_LUT[i0].idx);
        const okA = drawCover(eyeCtx, frameA, w, h, 1.18);
        if (t > 0.01 && i1 !== i0) {
          eyeCtx.globalAlpha = t;
          drawCover(eyeCtx, nearestLoadedFrame(eyeFrames, GAZE_LUT[i1].idx), w, h, 1.18);
          eyeCtx.globalAlpha = 1;
        }
        if (okA) eyeLastKey = key;
      }

      eyeFlare.style.setProperty('--mx', (ex * 100).toFixed(1) + '%');
      eyeFlare.style.setProperty('--my', (ey * 100).toFixed(1) + '%');

      const axis = (ex - 0.5) * 200;
      const dir = axis < -8 ? '左' : axis > 8 ? '右' : '中';
      eyeReadout.textContent =
        `視線 ${dir} ${Math.abs(axis).toFixed(1).padStart(4, '0')} / FRAME ` +
        String(GAZE_LUT[Math.round(g)].idx + 1).padStart(2, '0');
    }

    /* — Act III: parallax, reveal mask, ghost cursor — */
    paintJutsu();

    const jr = jutsuSection.getBoundingClientRect();
    if (jr.top < window.innerHeight && jr.bottom > 0) {
      revealX = damp(revealX, revealTX, 0.13, deltaMs);
      revealY = damp(revealY, revealTY, 0.13, deltaMs);
      revealR = damp(revealR, jutsuLit ? revealRT : 0, 0.09, deltaMs);
      const rs = jutsuSection.style;
      rs.setProperty('--rx', (revealX * 100).toFixed(2) + '%');
      rs.setProperty('--ry', (revealY * 100).toFixed(2) + '%');
      rs.setProperty('--r',  revealR.toFixed(0) + 'px');
      if (ghost.ok && (jutsuLit || revealR > 1)) ghost.render();
    }

    /* — cursor — */
    cx = damp(cx, cursorX, 0.2, deltaMs);
    cy = damp(cy, cursorY, 0.2, deltaMs);
    cursorEl.style.transform = `translate(${cx}px, ${cy}px)`;

    if (!disposed) animationFrameId = requestAnimationFrame(tick);
  }
  animationFrameId = requestAnimationFrame(tick);

  /* ═════════════════════ reveals ═════════════════════ */
  /* #jutsu is excluded — it runs the scroll-driven parallax instead */
  document.querySelectorAll(
    '.quote__jp, .quote blockquote, .quote__mark, .footer__big, .footer__row'
  ).forEach((el, i) => {
    el.setAttribute('data-reveal', '');
    if (!el.style.getPropertyValue('--i')) el.style.setProperty('--i', i % 4);
  });

  const revealElements = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.18 });
    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    revealElements.forEach(el => el.classList.add('in'));
  }

  return () => {
    disposed = true;
    eventController.abort();
    clearTimeout(stormTimer);
    clearTimeout(rt);
    cancelAnimationFrame(animationFrameId);
    revealObserver?.disconnect();
    thunderOn = false;
    if (audioCtx && audioCtx.state !== "closed") {
      audioCtx.close().catch(error => console.warn("Could not close thunder audio.", error));
    }
  };
}
