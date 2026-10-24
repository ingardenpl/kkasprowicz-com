/* kkasprowicz.com — animowane tła: sieć neuronów (hero), globus z punktów (projekt), fala energii (kontakt).
   Każda scena: pauza poza ekranem i przy ukrytej karcie, jedna klatka statyczna przy „ogranicz ruch”. */
(function () {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const DPR = () => Math.min(devicePixelRatio || 1, 2);
  // główka impulsu jako gotowy sprite (bez tworzenia gradientów w każdej klatce)
  const sprites = {};
  function glow(light) {
    const key = light ? "l" : "d";
    if (sprites[key]) return sprites[key];
    const c = document.createElement("canvas"); c.width = c.height = 32;
    const g = c.getContext("2d"), r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    const rgb = light ? "4,120,87" : "52,211,153";
    r.addColorStop(0, light ? "rgba(6,78,59,.95)" : "rgba(255,255,255,1)"); r.addColorStop(0.38, `rgba(${rgb},.55)`); r.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = r; g.fillRect(0, 0, 32, 32);
    return (sprites[key] = c);
  }

  function scene(canvas, setup, draw) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, raf = 0, visible = false, ready = false, t0 = performance.now();
    const state = {};

    function resize() {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, r.width); h = Math.max(1, r.height);
      const d = DPR();
      canvas.width = Math.round(w * d); canvas.height = Math.round(h * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);
      setup(state, w, h);
      ready = true;
      frame(performance.now(), true);
    }
    function frame(now, once) {
      if (!ready) return;
      draw(ctx, state, w, h, (now - t0) / 1000);
      if (!once && visible && !document.hidden && !reduced.matches) raf = requestAnimationFrame(frame);
    }
    function start() { cancelAnimationFrame(raf); if (visible && !document.hidden && !reduced.matches) raf = requestAnimationFrame(frame); }

    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; start(); }).observe(canvas);
    document.addEventListener("visibilitychange", start);
    document.addEventListener("kk-theme", () => frame(performance.now(), true));
    reduced.addEventListener?.("change", () => { start(); frame(performance.now(), true); });
    // ponowne skalowanie po przeniesieniu okna na ekran o innym DPR
    const watchDpr = () => matchMedia(`(resolution: ${devicePixelRatio}dppx)`).addEventListener("change", () => { resize(); watchDpr(); }, { once: true });
    watchDpr();
    return state;
  }

  /* Wspólna sieć dendrytów (hero i wizytówka): generator gałęzi, bufor kresek, wzrost, pulsujące
     zakończenia, rozbłyski i impulsy płynące po niciach — ta sama kolorystyka i ruch w obu modułach */
  const root = document.documentElement;
  function growNet(seeds, maxDepth) {
    const paths = [], nodes = [];
    function grow(u, v, ang, len, depth) {
      const path = [[u, v]];
      const seg = 0.018, n = Math.round(len / seg);
      for (let i = 0; i < n; i++) {
        ang += (Math.random() - 0.5) * 0.5;
        u += Math.cos(ang) * seg; v += Math.sin(ang) * seg;
        path.push([u, v]);
        if (depth < maxDepth && i > 3 && Math.random() < 0.07) grow(u, v, ang + (Math.random() < 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.6), len * (0.35 + Math.random() * 0.3), depth + 1);
      }
      paths.push(path);
      nodes.push({ u, v, r: depth ? 1.6 : 2.4, ph: Math.random() * 6.283 });
    }
    for (const sd of seeds) grow(sd.u, sd.v, sd.ang, sd.len, 0);
    return { paths, nodes, verts: paths.flat() };
  }

  // X, Y: mapowanie współrzędnych sieci na piksele; pn: postęp wzrostu 0→1; sparkPts: punkty rozbłysków
  function drawNet(ctx, s, net, X, Y, w, h, t, pn, light, sparkPts) {
    const rgb = light ? "4,120,87" : "52,211,153";
    const key = `${s.key}|${light ? "l" : "d"}`;
    if (!s.netBuf || (s.netBuf.key !== key && !s.stale)) {
      const d = Math.min(devicePixelRatio || 1, 2);
      const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w * d)); c.height = Math.max(1, Math.round(h * d));
      const g = c.getContext("2d"); g.scale(d, d);
      g.strokeStyle = `rgba(${rgb},${light ? 0.42 : 0.34})`; g.lineWidth = 0.9; g.lineJoin = g.lineCap = "round";
      g.beginPath();
      for (const path of net.paths) { g.moveTo(X(path[0][0]), Y(path[0][1])); for (const [u, v] of path) g.lineTo(X(u), Y(v)); }
      g.stroke();
      s.netBuf = { key, c };
    }
    if (pn > 0 && pn < 1) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = `rgba(${rgb},${light ? 0.42 : 0.34})`; ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (const path of net.paths) {
        const m = Math.max(1, Math.floor(path.length * pn));
        ctx.moveTo(X(path[0][0]), Y(path[0][1]));
        for (let i = 1; i < m; i++) ctx.lineTo(X(path[i][0]), Y(path[i][1]));
      }
      ctx.stroke();
    } else if (pn >= 1) {
      ctx.globalAlpha = 0.85 + 0.15 * Math.sin(t * 0.7);
      ctx.drawImage(s.netBuf.c, 0, 0, w, h);
    }
    ctx.globalAlpha = 1;
    if (pn < 1) return;

    // zakończenia gałęzi — delikatnie pulsujące neurony
    const sprite = glow(light);
    if (!light) ctx.globalCompositeOperation = "lighter";
    for (const n of net.nodes) {
      const k2 = 0.5 + 0.5 * Math.sin(t * 0.8 + n.ph);
      ctx.globalAlpha = 0.35 + 0.45 * k2;
      const sz = n.r * (5 + 3 * k2);
      ctx.drawImage(sprite, X(n.u) - sz / 2, Y(n.v) - sz / 2, sz, sz);
    }
    if (reduced.matches) { ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; return; }

    // rozbłyski: losowe punkty powoli zapalają się i gasną (2–4 s)
    s.sparks ??= []; s.pulses ??= [];
    for (let i = 0; s.sparks.length < s.maxS && i < 50; i++) s.sparks.push({ i: (Math.random() * sparkPts.length) | 0, t0: t - (s.seeded ? 0 : Math.random() * 3), dur: 2 + Math.random() * 2, sz: 6 + Math.random() * 6 });
    s.seeded = true;
    s.sparks = s.sparks.filter((sp) => {
      const age = (t - sp.t0) / sp.dur;
      if (age >= 1) return false;
      const p = sparkPts[sp.i], pu = p.u ?? p[0], pv = p.v ?? p[1];
      ctx.globalAlpha = Math.sin(age * Math.PI) * 0.6;
      ctx.drawImage(sprite, X(pu) - sp.sz / 2, Y(pv) - sp.sz / 2, sp.sz, sp.sz);
      return true;
    });

    // impulsy płynące po niciach (w obie strony), powoli; prędkość w segmentach na sekundę
    const dt = Math.min(0.05, Math.max(0, t - (s.lastT ?? t))); s.lastT = t;
    for (let i = 0; s.pulses.length < s.maxP && i < 10; i++) {
      const path = net.paths[(Math.random() * net.paths.length) | 0];
      if (path.length > 4) s.pulses.push({ path, k: 0, sp: 3.6 + Math.random() * 3.6, dir: Math.random() < 0.6 ? 1 : -1 });
    }
    s.pulses = s.pulses.filter((q) => {
      q.k += q.sp * dt;
      const L = q.path.length - 1;
      if (q.k >= L) return false;
      const f = q.dir > 0 ? q.k : L - q.k, i = Math.floor(f), r = f - i;
      const a = q.path[i], b = q.path[Math.min(L, i + 1)];
      const x = X(a[0] + (b[0] - a[0]) * r), y = Y(a[1] + (b[1] - a[1]) * r);
      ctx.globalAlpha = 0.75 * Math.sin((q.k / L) * Math.PI);
      ctx.drawImage(sprite, x - 5, y - 5, 10, 10);
      return true;
    });
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }

  /* 1. Hero: sieć neuronów z białą dziurą — dryfujące węzły, synapsy wg odległości, impulsy-komety
        z jasnego źródła przeskakujące kaskadą; kolory, grubość kresek i rozbłyski jak w wizytówce */
  const neural = document.getElementById("neural");
  const mouse = { x: -1e4, y: -1e4 };
  if (neural) {
    const host = neural.parentElement;
    host.addEventListener("pointermove", (e) => { const r = neural.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    host.addEventListener("pointerleave", () => { mouse.x = mouse.y = -1e4; });
  }
  scene(neural, (s, w, h) => {
    const mobile = w < 700;
    const n = Math.round(Math.min(mobile ? 110 : 190, Math.max(70, (w * h) / 5200)));
    if (!s.nodes || Math.abs(s.nodes.length - n) > 12) {
      s.nodes = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
        r: 0.9 + Math.random() * 1.7, ph: Math.random() * Math.PI * 2, nb: [],
      }));
      s.pulses = []; s.emit = 0;
    }
    s.link = Math.min(150, Math.max(100, w / 10));
    s.hx = w * (mobile ? 0.72 : 0.74); s.hy = h * (mobile ? 0.3 : 0.42);
    s.hr = mobile ? 180 : 260;
    s.maxP = mobile ? 50 : 90;
  }, (ctx, s, w, h, t) => {
    ctx.clearRect(0, 0, w, h);
    const light = root.classList.contains("is-light");
    const rgb = light ? "4,120,87" : "52,211,153";
    const L = s.link, L2 = L * L, N = s.nodes, live = !reduced.matches;

    if (!live) s.pulses.length = 0;
    const dt = Math.min(0.05, Math.max(0, t - (s.last ?? t))); s.last = t;
    for (const p of N) {
      p.nb.length = 0;
      if (!live) continue;
      p.x += p.vx; p.y += p.vy;
      if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20;
      const dx = mouse.x - p.x, dy = mouse.y - p.y, d2 = dx * dx + dy * dy;
      if (d2 < 32000) { p.x += dx * 0.004; p.y += dy * 0.004; }
    }

    // synapsy: odcinki grupowane w kubełki przezroczystości (jedna ścieżka na kubełek); kreska 0,9 px jak w wizytówce
    const B = 6, buckets = Array.from({ length: B }, () => []);
    for (let i = 0; i < N.length; i++) {
      const a = N[i];
      for (let j = i + 1; j < N.length; j++) {
        const b = N[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 > L2) continue;
        buckets[Math.min(B - 1, ((1 - d2 / L2) * B) | 0)].push(a.x, a.y, b.x, b.y);
        a.nb.push(b); b.nb.push(a);
      }
    }
    ctx.lineWidth = 0.9; ctx.lineCap = "round";
    buckets.forEach((seg, k) => {
      if (!seg.length) return;
      ctx.strokeStyle = `rgba(${rgb},${(((k + 0.5) / B) * (light ? 0.42 : 0.34)).toFixed(3)})`;
      ctx.beginPath();
      for (let i = 0; i < seg.length; i += 4) { ctx.moveTo(seg[i], seg[i + 1]); ctx.lineTo(seg[i + 2], seg[i + 3]); }
      ctx.stroke();
    });

    // promienie białej dziury do najbliższych neuronów
    const near = [];
    for (const p of N) { const d = Math.hypot(p.x - s.hx, p.y - s.hy); if (d < s.hr) near.push([d, p]); }
    near.sort((a, b) => a[0] - b[0]);
    near.length = Math.min(near.length, 10);
    for (const [d, p] of near) {
      ctx.strokeStyle = light ? `rgba(4,120,87,${((1 - d / s.hr) * 0.45).toFixed(3)})` : `rgba(209,250,229,${((1 - d / s.hr) * 0.4).toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(s.hx, s.hy); ctx.lineTo(p.x, p.y); ctx.stroke();
    }

    // emisja impulsów: z białej dziury i spontanicznie z neuronów
    if (live) {
      s.emit -= dt;
      if (s.emit <= 0 && near.length && s.pulses.length < s.maxP) {
        s.emit = 0.07 + Math.random() * 0.16;
        s.pulses.push({ a: null, b: near[(Math.random() * near.length) | 0][1], k: 0, sp: 0.006 + Math.random() * 0.006, g: 0 });
      }
      if (Math.random() < dt * 3.5 && s.pulses.length < s.maxP * 0.6) {
        const a = N[(Math.random() * N.length) | 0];
        if (a.nb.length) s.pulses.push({ a, b: a.nb[(Math.random() * a.nb.length) | 0], k: 0, sp: 0.005 + Math.random() * 0.006, g: 1 });
      }
    }

    // impulsy-komety; po dotarciu do neuronu kaskada dalej (główka = ten sam sprite co w wizytówce)
    const sprite = glow(light);
    if (!light) ctx.globalCompositeOperation = "lighter";
    const next = [];
    for (const q of s.pulses) {
      q.k += q.sp;
      if (q.k >= 1) {
        const b = q.b;
        if (q.g < 4 && b.nb.length && Math.random() < 0.7 && s.pulses.length + next.length < s.maxP) {
          let c = b.nb[(Math.random() * b.nb.length) | 0];
          if (c === q.a && b.nb.length > 1) c = b.nb[(Math.random() * b.nb.length) | 0];
          next.push({ a: b, b: c, k: 0, sp: q.sp, g: q.g + 1 });
        }
        continue;
      }
      next.push(q);
      const ax = q.a ? q.a.x : s.hx, ay = q.a ? q.a.y : s.hy;
      const x = ax + (q.b.x - ax) * q.k, y = ay + (q.b.y - ay) * q.k;
      const kt = Math.max(0, q.k - 0.35), tx = ax + (q.b.x - ax) * kt, ty = ay + (q.b.y - ay) * kt;
      ctx.lineWidth = 1.2;
      for (let n = 0; n < 3; n++) {
        const k0 = n / 3, k1 = (n + 1) / 3;
        ctx.strokeStyle = `rgba(${rgb},${(0.25 + 0.3 * n).toFixed(2)})`;
        ctx.beginPath(); ctx.moveTo(tx + (x - tx) * k0, ty + (y - ty) * k0); ctx.lineTo(tx + (x - tx) * k1, ty + (y - ty) * k1); ctx.stroke();
      }
      ctx.globalAlpha = 0.75; ctx.drawImage(sprite, x - 5, y - 5, 10, 10); ctx.globalAlpha = 1;
    }
    s.pulses = next;
    ctx.lineWidth = 0.9;

    // neurony z pulsowaniem — ten sam odcień co punkty i zakończenia w wizytówce
    ctx.fillStyle = `rgb(${rgb})`;
    for (const p of N) {
      const k = 0.55 + 0.45 * Math.sin(t * 1.6 + p.ph);
      ctx.globalAlpha = 0.5 + 0.5 * k;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.8 + 0.4 * k), 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // biała dziura: jasny rdzeń, oddychająca poświata
    const br = 0.85 + 0.15 * Math.sin(t * 1.3), R = (light ? 56 : 74) * br;
    const halo = ctx.createRadialGradient(s.hx, s.hy, 0, s.hx, s.hy, R);
    if (light) {
      halo.addColorStop(0, "rgba(255,255,255,1)"); halo.addColorStop(0.1, "rgba(16,185,129,.55)");
      halo.addColorStop(0.4, "rgba(16,185,129,.14)"); halo.addColorStop(1, "rgba(16,185,129,0)");
    } else {
      halo.addColorStop(0, "rgba(255,255,255,1)"); halo.addColorStop(0.07, "rgba(236,253,245,.85)");
      halo.addColorStop(0.25, "rgba(110,231,183,.28)"); halo.addColorStop(1, "rgba(16,185,129,0)");
    }
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(s.hx, s.hy, R, 0, 6.283); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(s.hx, s.hy, 2.6 + 0.6 * br, 0, 6.283); ctx.fill();
    if (light) { ctx.strokeStyle = "rgba(4,120,87,.7)"; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.globalCompositeOperation = "source-over";
  });

  /* 2. Globus z punktów z orbitującymi impulsami — tło karty trackera */
  scene(document.getElementById("globeFx"), (s, w, h) => {
    if (!s.pts) {
      s.pts = [];
      const n = 520, ga = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < n; i++) {
        const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), th = ga * i;
        s.pts.push([Math.cos(th) * r, y, Math.sin(th) * r]);
      }
    }
    s.R = Math.min(w * 0.42, h * 0.48);
    s.cx = w - s.R * 0.95; s.cy = h * 0.52;
  }, (ctx, s, w, h, t) => {
    ctx.clearRect(0, 0, w, h);
    const rot = t * 0.18, c = Math.cos(rot), sn = Math.sin(rot), tilt = 0.38, ct = Math.cos(tilt), st = Math.sin(tilt);
    for (const [x0, y0, z0] of s.pts) {
      const x = x0 * c - z0 * sn, z1 = x0 * sn + z0 * c;
      const y = y0 * ct - z1 * st, z = y0 * st + z1 * ct;
      if (z < -0.15) continue;
      const a = 0.12 + 0.6 * Math.max(0, z);
      ctx.fillStyle = `rgba(16,185,129,${a.toFixed(3)})`;
      ctx.fillRect(s.cx + x * s.R - 1, s.cy + y * s.R - 1, 2, 2);
    }
    // orbity energii
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < 3; k++) {
      const ang = t * (0.5 + k * 0.17) + k * 2.1, inc = 0.5 + k * 0.45;
      const x = Math.cos(ang) * s.R * 1.12, z = Math.sin(ang) * s.R * 1.12;
      const y = z * Math.sin(inc) * 0.35;
      const px = s.cx + x, py = s.cy + y;
      const g = ctx.createRadialGradient(px, py, 0, px, py, 14);
      g.addColorStop(0, "rgba(167,243,208,.9)"); g.addColorStop(1, "rgba(16,185,129,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, 14, 0, 6.283); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  });

  /* 3. Fala energii — nakładające się sinusoidy w kontakcie */
  scene(document.getElementById("wave"), (s, w, h) => { s.lines = 7; }, (ctx, s, w, h, t) => {
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < s.lines; i++) {
      const amp = h * (0.06 + i * 0.018), f = 0.004 + i * 0.0007, ph = t * (0.6 + i * 0.12) + i;
      ctx.strokeStyle = `rgba(52,211,153,${(0.08 + (i / s.lines) * 0.22).toFixed(3)})`;
      ctx.lineWidth = i === s.lines - 1 ? 1.6 : 1;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 6) {
        const env = Math.sin((x / w) * Math.PI);
        const y = h * 0.62 + Math.sin(x * f + ph) * amp * env + Math.sin(x * f * 2.3 - ph * 0.7) * amp * 0.3 * env;
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  });

  /* 4. Twarz z dendrytów (wizytówka, na całą szerokość): kreski grafiki i punkty-neurony, a od zakończeń
        dendrytów rozrasta się w przestrzeń sieć gałęzi; po niciach powoli płyną impulsy, zakończenia pulsują */
  const faceCv = document.getElementById("faceFx");
  if (faceCv) {
    const img = new Image();
    new IntersectionObserver(([e], io) => { if (e.isIntersecting) { io.disconnect(); img.src = faceCv.dataset.src; } }, { rootMargin: "600px 0px" }).observe(faceCv);
    new Promise((ok, err) => { img.onload = ok; img.onerror = err; }).then(() => img.decode().catch(() => {})).then(() => {
      // próbkowanie grafiki (współrzędne u, v w obrębie obrazka 0..1)
      const RES = 520, STEP = 2;
      const k = RES / Math.max(img.width, img.height);
      const W = Math.round(img.width * k), H = Math.round(img.height * k);
      const oc = document.createElement("canvas"); oc.width = W; oc.height = H;
      const o = oc.getContext("2d", { willReadFrequently: true });
      o.drawImage(img, 0, 0, W, H);
      const px = o.getImageData(0, 0, W, H).data;
      const pts = [], cell = new Map();
      for (let y = 0; y < H; y += STEP) for (let x = 0; x < W; x += STEP) {
        const a = px[(y * W + x) * 4 + 3];
        if (a < 70) continue;
        cell.set(x + "," + y, pts.length);
        pts.push({ u: x / W, v: y / H, a: a / 255, nb: [] });
      }
      if (!pts.length) throw new Error("face: brak punktów");
      pts.forEach((p) => {
        const x = Math.round(p.u * W), y = Math.round(p.v * H);
        for (let dy = -STEP; dy <= STEP; dy += STEP) for (let dx = -STEP; dx <= STEP; dx += STEP) {
          if (!dx && !dy) continue;
          const j = cell.get((x + dx) + "," + (y + dy));
          if (j !== undefined) p.nb.push(j);
        }
      });

      // sieć wychodząca: z zakończeń dendrytów (punkty z jednym sąsiadem, daleko od środka twarzy)
      const C = { u: 0.62, v: 0.48 };
      const tips = pts.filter((p) => p.nb.length <= 1 && Math.hypot(p.u - C.u, p.v - C.v) > 0.3);
      const anchors = [];
      for (const p of tips.sort(() => Math.random() - 0.5)) {
        if (anchors.every((q) => Math.hypot(q.u - p.u, q.v - p.v) > 0.07)) anchors.push(p);
        if (anchors.length >= 34) break;
      }
      const net = growNet(anchors.map((p) => ({ u: p.u, v: p.v, ang: Math.atan2(p.v - C.v, p.u - C.u) + (Math.random() - 0.5) * 0.6, len: 0.35 + Math.random() * 0.75 })), 2);

      let born = 0;
      new IntersectionObserver(([e], io) => { if (e.isIntersecting) { born = performance.now(); io.disconnect(); } }, { threshold: 0.2 }).observe(faceCv);

      scene(faceCv, (s, w, h) => {
        // twarz duża, nieco w prawo, żeby sieć miała miejsce po lewej (jak na grafice)
        const size = Math.min(h * 0.92, w * (w < 700 ? 0.95 : 0.6));
        s.dw = s.dh = size;
        s.ox = w * (w < 700 ? 0.5 : 0.56) - size / 2; s.oy = (h - size) / 2;
        s.maxS = w < 700 ? 45 : 90; s.maxP = w < 700 ? 10 : 22;
        const d = Math.min(devicePixelRatio || 1, 2), key = `${Math.round(w)}x${Math.round(h)}x${d}`;
        if (s.key === key) return;
        // przebudowa bufora z opóźnieniem (przeciąganie okna), do tego czasu stary bufor rozciągnięty
        s.key = key; s.keyAt = performance.now(); s.stale = true;
        s.d = d;
      }, (ctx, s, w, h) => {
        ctx.clearRect(0, 0, w, h);
        if (!s.key) return;
        const light = root.classList.contains("is-light");
        const tag = light ? "l" : "d", rgb = light ? "4,120,87" : "52,211,153";
        const now = performance.now(), t = now / 1000;
        const X = (u) => s.ox + u * s.dw, Y = (v) => s.oy + v * s.dh;
        // postęp: twarz 0→1 w 2 s, potem sieć rośnie 0→1 w 2,5 s
        const el = reduced.matches ? 1e9 : born ? now - born : 0;
        const pf = Math.min(1, el / 2000), pn = Math.min(1, Math.max(0, (el - 1600) / 2500));

        // statyczne warstwy (kreski twarzy, punkty, gotowa sieć) w buforze dla motywu i rozmiaru
        // jeden bufor (twarz + sieć) tylko dla bieżącego motywu
        if (!s.buf || s.buf.tag !== tag || (s.stale && (reduced.matches || now - s.keyAt > 150))) {
          s.stale = false;
          const bw = Math.round(w * s.d), bh = Math.round(h * s.d);
          const tint = document.createElement("canvas"); tint.width = Math.round(s.dw * s.d); tint.height = Math.round(s.dh * s.d);
          const tg = tint.getContext("2d");
          tg.drawImage(img, 0, 0, tint.width, tint.height);
          tg.globalCompositeOperation = "source-in"; tg.fillStyle = light ? "#047857" : "#34d399"; tg.fillRect(0, 0, tint.width, tint.height);
          const face = document.createElement("canvas"); face.width = bw; face.height = bh;
          const fg = face.getContext("2d"); fg.scale(s.d, s.d);
          fg.globalAlpha = light ? 0.8 : 0.66; fg.drawImage(tint, s.ox, s.oy, s.dw, s.dh);
          fg.fillStyle = `rgb(${rgb})`;
          for (const p of pts) { fg.globalAlpha = p.a * (0.35 + 0.35 * Math.random()); fg.fillRect(X(p.u) - 0.8, Y(p.v) - 0.8, 1.6, 1.6); }
          s.buf = { tag, face };
        }
        const B = s.buf;

        // twarz: pojawia się i lekko oddycha
        ctx.globalAlpha = pf * (0.92 + 0.08 * Math.sin(t * 0.9));
        ctx.drawImage(B.face, 0, 0, w, h);
        drawNet(ctx, s, net, X, Y, w, h, t, pn, light, pts);
      });
    }).catch(() => {
      // brak grafiki: bez pustego pasa; strzałka z hero prowadzi wtedy prosto do „O mnie”
      faceCv.closest("section").hidden = true;
      document.querySelector(".scroll")?.setAttribute("href", "#o-mnie");
    });
  }

  /* 5. Arkusz atlasu — tło karty „Atlas AI w edukacji”: siatka kartograficzna, punkty rozjaśniane falą,
        pulsujące ogniska i łuki między nimi z wędrującym światłem (odpowiednik globusa trackera, ale płaski) */
  scene(document.getElementById("atlasFx"), (s, w, h) => {
    s.W = Math.min(w * 0.5, h * 1.6); s.H = s.W * 0.52;
    s.cx = w - s.W * 0.52; s.cy = h * 0.5;
    if (!s.pts) {
      s.pts = Array.from({ length: 150 }, () => ({ u: Math.random(), v: Math.random(), ph: Math.random() * 6.283 }));
      s.hot = [[0.18, 0.32], [0.36, 0.58], [0.52, 0.28], [0.7, 0.5], [0.84, 0.3]].map(([u, v], i) => ({ u, v, ph: i * 0.9 }));
    }
  }, (ctx, s, w, h, t) => {
    ctx.clearRect(0, 0, w, h);
    const light = false, rgb = "52,211,153"; // karta atlasu jest czarna w obu motywach
    // odwzorowanie: równoleżniki proste, południki lekko zakrzywione (jak w projekcji Robinsona)
    const X = (u, v) => s.cx + (u - 0.5) * s.W * (0.84 + 0.16 * Math.cos((v - 0.5) * Math.PI));
    const Y = (v) => s.cy + (v - 0.5) * s.H;
    ctx.lineWidth = 0.9; ctx.strokeStyle = `rgba(${rgb},${light ? 0.3 : 0.22})`;
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) { const u = i / 12; ctx.moveTo(X(u, 0), Y(0)); for (let j = 1; j <= 12; j++) ctx.lineTo(X(u, j / 12), Y(j / 12)); }
    for (let j = 0; j <= 6; j++) { const v = j / 6; ctx.moveTo(X(0, v), Y(v)); ctx.lineTo(X(1, v), Y(v)); }
    ctx.stroke();
    // punkty: fala jasności przebiega przez mapę ze wschodu na zachód
    const live = !reduced.matches;
    ctx.fillStyle = `rgb(${rgb})`;
    for (const p of s.pts) {
      const wave = live ? Math.max(0, Math.sin(p.u * 7 - t * 0.9 + p.ph * 0.2)) : 0.4;
      ctx.globalAlpha = 0.18 + 0.6 * wave;
      ctx.fillRect(X(p.u, p.v) - 1, Y(p.v) - 1, 2, 2);
    }
    ctx.globalAlpha = 1;
    // łuki między ogniskami i wędrujące światło
    const sprite = glow(light);
    if (!light) ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(${rgb},${light ? 0.45 : 0.38})`; ctx.lineWidth = 1;
    for (let i = 0; i < s.hot.length - 1; i++) {
      const a = s.hot[i], b = s.hot[i + 1];
      const ax = X(a.u, a.v), ay = Y(a.v), bx = X(b.u, b.v), by = Y(b.v);
      const mx = (ax + bx) / 2, my = Math.min(ay, by) - s.H * 0.28;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke();
      if (live) {
        const k = ((t * 0.12 + i * 0.25) % 1), q = 1 - k;
        const x = q * q * ax + 2 * q * k * mx + k * k * bx, y = q * q * ay + 2 * q * k * my + k * k * by;
        ctx.globalAlpha = 0.8 * Math.sin(k * Math.PI);
        ctx.drawImage(sprite, x - 5, y - 5, 10, 10);
      }
    }
    // ogniska: jasny rdzeń i rozchodzący się pierścień
    for (const o of s.hot) {
      const x = X(o.u, o.v), y = Y(o.v);
      ctx.globalAlpha = 0.9; ctx.drawImage(sprite, x - 7, y - 7, 14, 14);
      if (live) {
        const k = ((t * 0.35 + o.ph) % 1);
        ctx.globalAlpha = 0.5 * (1 - k); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, 4 + k * 22, 0, 6.283); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  });

  /* 6. Karty projektów (AIQ, Algorytm w todze, HIL): dryfujące neurony łączące się w sieć,
        opcjonalnie z symbolem w środku: obracający się posąg Temidy (themis) albo napis HISTORY z neuronów (history) */
  const symbols = {
    // Temida: posąg obrócony z profilu (popiersie: głowa, szyja, ramiona, toga) jako chmura neuronów
    // z siatką, obraca się wokół osi, punkty pulsują, fala rozjaśnienia przechodzi od dołu do góry;
    // przepaska to jaśniejszy pierścień
    themis(ctx, cx, cy, S, t, rgb, live, s) {
      if (!s.th) {
        const prof = (y) => {
          if (y < 0.34) { const d = y - 0.17; return Math.sqrt(Math.max(0, 0.17 * 0.17 - d * d)) * (y < 0.06 ? 0.9 : 1); }
          if (y < 0.42) return 0.07 + (y - 0.34) * 0.25;
          if (y < 0.54) return 0.09 + (y - 0.42) * 2.9;
          return 0.44 + (y - 0.54) * 0.15;
        };
        const pts = [], rings = [], links = [];
        for (let i = 0; i <= 36; i++) {
          const y = i / 36, r = prof(y), n = Math.max(6, Math.round(r * 56));
          const ring = [];
          for (let k = 0; k < n; k++) {
            const a = (k / n) * 6.283 + (i % 2) * 0.1;
            ring.push(pts.length);
            pts.push({ x: Math.cos(a) * r, y, z: Math.sin(a) * r, ph: Math.random() * 6.283, band: y > 0.165 && y < 0.205 });
          }
          rings.push(ring);
        }
        for (let i = 0; i < rings.length; i++) {
          const R = rings[i];
          for (let k = 0; k < R.length; k++) {
            links.push([R[k], R[(k + 1) % R.length]]);
            if (i + 1 < rings.length) { const Q = rings[i + 1]; links.push([R[k], Q[Math.round((k / R.length) * Q.length) % Q.length]]); }
          }
        }
        s.th = { pts, links };
      }
      const { pts, links } = s.th;
      const ang = live ? t * 0.3 : 0.6, ca = Math.cos(ang), sa = Math.sin(ang);
      const wave = live ? 1.15 - ((t * 0.22) % 1.3) : -1; // od dołu (y=1) do góry (y=0)
      const P = (p) => {
        const X = p.x * ca - p.z * sa, D = p.x * sa + p.z * ca;
        return [cx + X * S * 0.95, cy + (p.y - 0.55) * S * 1.15, D];
      };
      const proj = pts.map(P);
      // siatka: krawędzie bledną wraz z głębią (trzy progi), tylne pomijane
      ctx.lineWidth = 0.8;
      const tiers = [[0.15, 0.3], [-0.2, 0.14], [-0.45, 0.06]];
      for (let k = 0; k < tiers.length; k++) {
        const [lo, al] = tiers[k], hi = k ? tiers[k - 1][0] : 9;
        ctx.strokeStyle = `rgba(${rgb},${al})`;
        ctx.beginPath();
        for (const [a, b] of links) { const d = proj[a][2] + proj[b][2]; if (d < lo || d >= hi) continue; ctx.moveTo(proj[a][0], proj[a][1]); ctx.lineTo(proj[b][0], proj[b][1]); }
        ctx.stroke();
      }
      // neurony: pulsują, przepaska jaśniejsza, fala rozjaśnienia
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], [x, y, d] = proj[i];
        const w = Math.exp(-((p.y - wave) ** 2) / 0.003);
        const k = 0.5 + 0.5 * Math.sin(t * 1.5 + p.ph);
        const a = Math.max(0, Math.min(1, 0.22 + 0.5 * (d / 0.5 + 0.5) * (0.6 + 0.4 * k) + w * 0.8));
        ctx.globalAlpha = a; ctx.fillStyle = p.band ? "#ecfdf5" : `rgb(${rgb})`;
        const r = (p.band ? 1.9 : 1.3) + 0.9 * k + w * 1.2;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    // HISTORY: napis spróbkowany na punkty-neurony, które pulsują, mienią się przebiegającą falą
    // i łączą cienkimi liniami z sąsiadami
    history(ctx, cx, cy, S, t, rgb, live, s) {
      if (!s.hist) {
        const oc = document.createElement("canvas"), W = 480, H = 110, STEP = 4;
        oc.width = W; oc.height = H;
        const g = oc.getContext("2d", { willReadFrequently: true });
        g.fillStyle = "#fff"; g.font = "700 96px Tinos, Georgia, 'Times New Roman', serif"; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText("HISTORY", W / 2, H / 2 + 4);
        const px = g.getImageData(0, 0, W, H).data, pts = [], cell = new Map();
        for (let y = 0; y < H; y += STEP) for (let x = 0; x < W; x += STEP) {
          if (px[(y * W + x) * 4 + 3] < 120) continue;
          cell.set(x + "," + y, pts.length);
          pts.push({ u: (x - W / 2) / W, v: (y - H / 2) / W, ph: Math.random() * 6.283, nb: [] });
        }
        pts.forEach((p) => {
          const x = Math.round(p.u * W + W / 2), y = Math.round(p.v * W + H / 2);
          const r = cell.get((x + STEP) + "," + y), dn = cell.get(x + "," + (y + STEP));
          if (r !== undefined) p.nb.push(r); if (dn !== undefined) p.nb.push(dn);
        });
        s.hist = { pts };
        // po doładowaniu fontu Tinos przebuduj napis raz
        if (!s.histFonts && document.fonts) { s.histFonts = true; document.fonts.ready.then(() => { s.hist = null; document.dispatchEvent(new Event("kk-theme")); }); }
      }
      const { pts } = s.hist, sc = S * 1.9;
      const X = (p) => cx + p.u * sc, Y = (p) => cy + p.v * sc;
      const wave = live ? ((t * 0.25) % 1.6) - 0.8 : 9;
      ctx.lineWidth = 0.7; ctx.strokeStyle = `rgba(${rgb},.28)`;
      ctx.beginPath();
      for (const p of pts) for (const j of p.nb) { ctx.moveTo(X(p), Y(p)); ctx.lineTo(X(pts[j]), Y(pts[j])); }
      ctx.stroke();
      ctx.fillStyle = `rgb(${rgb})`;
      for (const p of pts) {
        const k = 0.5 + 0.5 * Math.sin(t * 1.8 + p.ph), w = Math.exp(-((p.u - wave) ** 2) / 0.006);
        ctx.globalAlpha = Math.min(1, 0.3 + 0.45 * k + 0.6 * w);
        const r = 1.1 + 0.8 * k + 1.2 * w;
        ctx.beginPath(); ctx.arc(X(p), Y(p), r, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };
  function neuronCard(id, symbol) {
    scene(document.getElementById(id), (s, w, h) => {
      const mobile = w < 700;
      const n = mobile ? 34 : 58;
      if (!s.nodes || s.nodes.length !== n) {
        s.nodes = Array.from({ length: n }, () => ({ u: Math.random(), v: Math.random(), vx: (Math.random() - 0.5) * 0.16, vy: (Math.random() - 0.5) * 0.16, r: 1 + Math.random() * 1.8, ph: Math.random() * 6.283 }));
      }
      // obszar sieci: prawa część karty (na telefonie cała szerokość, górna część)
      s.x0 = mobile ? 0 : w * 0.38; s.x1 = w; s.y0 = 0; s.y1 = mobile ? h * 0.62 : h;
      s.link = Math.min(140, Math.max(90, (s.x1 - s.x0) / 5));
      s.S = Math.min((s.y1 - s.y0) * (mobile ? 0.5 : 0.6), (s.x1 - s.x0) * 0.36);
      s.cy = s.y0 + (s.y1 - s.y0) * (mobile ? 0.38 : 0.5);
    }, (ctx, s, w, h, t) => {
      ctx.clearRect(0, 0, w, h);
      const light = false, rgb = "52,211,153"; // karta jest czarna w obu motywach
      const W = s.x1 - s.x0, H = s.y1 - s.y0, live = !reduced.matches;
      const dt = Math.min(0.05, Math.max(0, t - (s.last ?? t))); s.last = t;
      const N = s.nodes;
      for (const p of N) {
        if (live) {
          p.u += p.vx * dt; p.v += p.vy * dt;
          if (p.u < -0.02) p.u = 1.02; else if (p.u > 1.02) p.u = -0.02;
          if (p.v < -0.02) p.v = 1.02; else if (p.v > 1.02) p.v = -0.02;
        }
        p.x = s.x0 + p.u * W; p.y = s.y0 + p.v * H;
      }
      const L2 = s.link * s.link, B = 5, buckets = Array.from({ length: B }, () => []);
      for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) {
        const a = N[i], b = N[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 > L2) continue;
        buckets[Math.min(B - 1, ((1 - d2 / L2) * B) | 0)].push(a.x, a.y, b.x, b.y);
      }
      ctx.lineWidth = 0.9; ctx.lineCap = "round";
      buckets.forEach((seg, k) => {
        if (!seg.length) return;
        ctx.strokeStyle = `rgba(${rgb},${(((k + 0.5) / B) * (light ? 0.42 : 0.36)).toFixed(3)})`;
        ctx.beginPath();
        for (let i = 0; i < seg.length; i += 4) { ctx.moveTo(seg[i], seg[i + 1]); ctx.lineTo(seg[i + 2], seg[i + 3]); }
        ctx.stroke();
      });
      const sprite = glow(light);
      if (!light) ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgb(${rgb})`;
      for (const p of N) {
        const k = 0.55 + 0.45 * Math.sin(t * 1.4 + p.ph);
        ctx.globalAlpha = 0.5 + 0.5 * k;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.8 + 0.4 * k), 0, 6.283); ctx.fill();
        if (p.r > 2.3) { ctx.globalAlpha = 0.35 + 0.45 * k; ctx.drawImage(sprite, p.x - 7, p.y - 7, 14, 14); }
      }
      ctx.globalAlpha = 1;
      if (symbol) symbols[symbol](ctx, s.x0 + W * 0.5, s.cy, s.S, t, rgb, live, s);
      ctx.globalCompositeOperation = "source-over";
    });
  }
  neuronCard("aiqFx");
  neuronCard("togaFx", "themis");
  neuronCard("hilFx", "history");

  // Linie energii w SVG (CSS) — pauza poza ekranem
  const flow = document.querySelector(".flow");
  if (flow) new IntersectionObserver(([e]) => flow.classList.toggle("paused", !e.isIntersecting)).observe(flow);
})();
