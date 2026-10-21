/* ==========================================================================
   NANCY IBARRA SALON SPA | app.js
   Sin dependencias. Un solo loop requestAnimationFrame lee el scroll y mueve
   todo lo que depende de el (no se usa addEventListener('scroll')).
   Secciones:
     0. Configuracion        6. Hero (particulas, mariposas, profundidad)
     1. Utilidades           7. Marquee, manifiesto, imagen expandida
     2. Motor de scroll      8. Servicios horizontales, pasos, parallax
     3. Texto y revelados    9. Interacciones (botones, tilt, FAQ, formulario)
     4. Preloader           10. Mariposa guia y WhatsApp flotante
     5. Navegacion y menu
   ========================================================================== */
(() => {
  'use strict';
  window.__nancy = true;

  /* ---------- 0. Configuracion (cambia aqui el numero y los mensajes) ---------- */
  const CONFIG = {
    phone: '529992770631',                       // WhatsApp en formato internacional, sin + ni espacios
    defaultMsg: 'Hola, quiero información de Nancy Ibarra Salón Spa.',
  };
  const WA = (text) => `https://wa.me/${CONFIG.phone}?text=${encodeURIComponent(text)}`;

  /* ---------- 1. Utilidades ---------- */
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeIO = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const pad2 = (n) => String(n).padStart(2, '0');
  const mq = (q) => window.matchMedia(q);
  const reduced = mq('(prefers-reduced-motion: reduce)');
  const fine = mq('(hover: hover) and (pointer: fine)');
  let vw = innerWidth;
  let vh = innerHeight;
  let menuOpen = false;

  const docTop = (el) => { let t = 0; while (el) { t += el.offsetTop; el = el.offsetParent; } return t; };
  const maxScroll = () => Math.max(0, root.scrollHeight - innerHeight);

  const measures = [];
  const ticks = [];
  const onMeasure = (fn) => measures.push(fn);
  const onTick = (fn) => ticks.push(fn);
  const measureAll = () => { vw = innerWidth; vh = innerHeight; measures.forEach((fn) => fn()); };

  const pointer = { x: innerWidth / 2, y: innerHeight / 2, active: false };

  /* ---------- 2. Motor de scroll ---------- */
  const S = { y: scrollY, target: scrollY, set: scrollY, last: scrollY, vel: 0, smooth: false, forced: false };

  function scrollableAncestor(el, dy) {
    while (el && el !== document.body && el !== root) {
      if (el.nodeType === 1) {
        const oy = getComputedStyle(el).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
          if (dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
        }
      }
      el = el.parentElement;
    }
    return false;
  }

  function initSmooth() {
    if (reduced.matches || !fine.matches) return;
    S.smooth = true;
    addEventListener('wheel', (e) => {
      if (e.ctrlKey) return;                       // zoom con trackpad
      if (document.body.classList.contains('locked')) { e.preventDefault(); return; }
      if (scrollableAncestor(e.target, e.deltaY)) return;
      e.preventDefault();
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 34; else if (e.deltaMode === 2) dy *= innerHeight;
      S.target = clamp(S.target + dy, 0, maxScroll());
    }, { passive: false });
  }

  function goTo(y) {
    y = clamp(y, 0, maxScroll());
    if (S.smooth) { S.target = y; S.forced = true; }
    else scrollTo({ top: y, behavior: reduced.matches ? 'auto' : 'smooth' });
  }

  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(.05, (now - lastT) / 1000) || .016;
    lastT = now;
    if (S.smooth) {
      const actual = scrollY;
      if (Math.abs(actual - S.set) > 3) {            // cambio externo (teclado, barra, foco del navegador)
        S.y = S.set = actual;
        if (!S.forced) S.target = actual;            // si pedimos un destino (goTo), se respeta
      } else {
        S.y += (S.target - S.y) * (1 - Math.exp(-dt * 7.5));
        if (Math.abs(S.target - S.y) < .15) { S.y = S.target; S.forced = false; }
        if (Math.abs(S.y - S.set) > .01) { scrollTo(0, S.y); S.set = S.y; }
      }
    } else {
      S.y = scrollY;
    }
    S.vel = lerp(S.vel, (S.y - S.last) / dt, .18);
    S.last = S.y;
    for (let i = 0; i < ticks.length; i++) ticks[i](S.y, dt, S.vel, now / 1000);
    requestAnimationFrame(frame);
  }

  /* ---------- 3. Texto partido y revelados ---------- */
  function wrapWords(el, { mask }) {
    let i = 0;
    const walk = (node) => {
      const frag = document.createDocumentFragment();
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
            const wi = document.createElement('span');
            wi.textContent = tok;
            if (mask) {
              wi.className = 'wi';
              wi.style.setProperty('--i', i++);
              const w = document.createElement('span');
              w.className = 'w';
              w.setAttribute('aria-hidden', 'true');
              w.appendChild(wi);
              frag.appendChild(w);
            } else {
              wi.className = 'mf';
              frag.appendChild(wi);
            }
          });
        } else if (n.nodeType === 1) {
          if (n.tagName === 'BR' || n.classList.contains('mf-pill')) { frag.appendChild(n); return; }
          const c = n.cloneNode(false);
          c.appendChild(walk(n));
          frag.appendChild(c);
        }
      });
      return frag;
    };
    if (mask) el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '));
    const f = walk(el);
    el.textContent = '';
    el.appendChild(f);
  }

  function countUp(el) {
    const end = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const pre = el.dataset.prefix || '';
    const fmt = (v) => pre + v.toLocaleString('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    if (reduced.matches) { el.textContent = fmt(end); return; }
    let st = null;
    const step = (t) => {
      if (st === null) st = t;
      const p = clamp((t - st) / 1900);
      el.textContent = fmt(end * easeOut(p));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function observeReveals() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        if (e.target.hasAttribute('data-count')) countUp(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: .01 });
    $$('.rv, [data-split], .mf-pill, [data-count]').forEach((el) => io.observe(el));
  }

  /* ---------- 4. Preloader ---------- */
  function runLoader() {
    const loader = $('#loader');
    const heroImg = $('.arch-main img');
    const ready = () => {
      root.classList.add('is-ready');
      document.body.classList.remove('locked');
      observeReveals();
      if (location.hash && $(location.hash)) setTimeout(() => goTo(anchorY($(location.hash))), 150);
    };
    if (!loader) { ready(); return; }

    document.body.classList.add('locked');
    const num = $('#ldNum');
    const bar = $('.ld-bar i');
    const MIN = reduced.matches ? 700 : 2400;
    const t0 = performance.now();
    let loaded = false;
    let shown = 0;
    const finish = () => { loaded = true; };

    Promise.all([
      document.fonts ? document.fonts.ready : Promise.resolve(),
      new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true }))),
      new Promise((r) => { if (!heroImg || heroImg.complete) r(); else { heroImg.addEventListener('load', r, { once: true }); heroImg.addEventListener('error', r, { once: true }); } }),
    ]).then(finish);
    setTimeout(finish, 4500);

    const tick = (now) => {
      const elapsed = now - t0;
      const cap = loaded ? 100 : 90;
      shown += (cap - shown) * .07;
      const timeCap = clamp(elapsed / MIN) * 100;
      const val = Math.min(shown, timeCap);
      num.textContent = Math.round(val);
      bar.style.setProperty('--p', (val / 100).toFixed(3));
      if (loaded && elapsed > MIN && val > 99) {
        num.textContent = '100';
        bar.style.setProperty('--p', 1);
        loader.classList.add('done');
        setTimeout(ready, 650);
        setTimeout(() => { loader.classList.add('gone'); loader.setAttribute('aria-hidden', 'true'); }, 1500);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- 5. Navegacion, progreso y menu ---------- */
  const anchorY = (el) => (el.id === 'inicio' ? 0 : docTop(el));

  function initNav() {
    const nav = $('#nav');
    const bar = $('#progress i');
    const links = $$('.nav-links a');
    let acc = 0;
    let lastY = 0;
    onTick((y) => {
      const d = y - lastY;
      lastY = y;
      if (Math.abs(d) > .4) acc = Math.sign(d) === Math.sign(acc) ? acc + d : d;
      if (y < 420 || acc < -24 || menuOpen) nav.classList.remove('hide');
      else if (acc > 70) nav.classList.add('hide');
      nav.classList.toggle('solid', y > 40);
      const m = maxScroll();
      bar.style.transform = `scaleX(${m ? clamp(y / m) : 0})`;
    });

    const spy = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    ['servicios', 'experiencia', 'resultados', 'resenas', 'contacto'].forEach((id) => { const s = $('#' + id); if (s) spy.observe(s); });

    // anclas con scroll suave propio
    $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const el = $(id);
      if (!el) return;
      e.preventDefault();
      if (menuOpen) setMenu(false);
      goTo(anchorY(el));
    }));
  }

  const burger = $('#burger');
  const menu = $('#menu');
  function setMenu(open) {
    menuOpen = open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', String(!open));
    menu.inert = !open;
    document.body.classList.toggle('locked', open);
  }
  function initMenu() {
    burger.addEventListener('click', () => setMenu(!menuOpen));
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) setMenu(false); });
    menu.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    mq('(min-width: 1000px)').addEventListener('change', (e) => { if (e.matches && menuOpen) setMenu(false); });
  }

  /* ---------- 6. Hero: particulas, mariposas y profundidad ---------- */
  const BF = '<svg class="bf" viewBox="0 0 120 100" aria-hidden="true">'
    + '<g class="wr"><path d="M60 50C64 30 82 8 108 8c10 0 10 14 2 28-6 10-20 18-36 18-6 0-11-2-14-4Z" fill="url(#gWing)"/><path d="M60 54c14 0 32 4 36 18 3 12-8 22-18 16-10-6-16-20-18-30Z" fill="url(#gWing2)"/><circle cx="94" cy="22" r="4.5" fill="#fff" opacity=".4"/><circle cx="82" cy="75" r="3.2" fill="#fff" opacity=".4"/></g>'
    + '<g class="wl"><g transform="translate(120 0) scale(-1 1)"><path d="M60 50C64 30 82 8 108 8c10 0 10 14 2 28-6 10-20 18-36 18-6 0-11-2-14-4Z" fill="url(#gWing)"/><path d="M60 54c14 0 32 4 36 18 3 12-8 22-18 16-10-6-16-20-18-30Z" fill="url(#gWing2)"/><circle cx="94" cy="22" r="4.5" fill="#fff" opacity=".4"/><circle cx="82" cy="75" r="3.2" fill="#fff" opacity=".4"/></g></g>'
    + '<path d="M60 38c2 6 2 24 0 36-2-12-2-30 0-36Z" fill="#3F1A78"/><path d="M60 40c-2-10-6-16-12-20M60 40c2-10 6-16 12-20" stroke="#3F1A78" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>';

  function makeFlies(host, specs) {
    return specs.map((s) => {
      const el = document.createElement('div');
      el.className = 'fly';
      el.style.width = s.size + 'px';
      el.innerHTML = BF;
      el.firstChild.style.setProperty('--flap', (.38 + Math.random() * .22).toFixed(2) + 's');
      host.appendChild(el);
      return { el, ...s, px: Math.random() * 6.28, py: Math.random() * 6.28, x: null, y: null, rot: 0 };
    });
  }

  function stepFlies(flies, host, t, followTarget) {
    const w = host.clientWidth;
    const h = host.clientHeight;
    flies.forEach((f) => {
      let tx = (f.cx + f.ax * Math.sin(t * f.fx + f.px)) * w;
      let ty = (f.cy + f.ay * Math.cos(t * f.fy + f.py)) * h;
      if (f.follow && followTarget) { tx = followTarget.x + Math.sin(t * 1.3) * 26; ty = followTarget.y + Math.cos(t * 1.1) * 22; }
      if (f.x === null) { f.x = tx; f.y = ty; }
      const nx = lerp(f.x, tx, f.follow && followTarget ? .045 : .03);
      const ny = lerp(f.y, ty, f.follow && followTarget ? .045 : .03);
      const dx = nx - f.x;
      const dy = ny - f.y;
      f.x = nx;
      f.y = ny;
      if (Math.hypot(dx, dy) > .12) {
        let d = Math.atan2(dy, dx) + Math.PI / 2 - f.rot;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        f.rot += d * .07;
      }
      f.el.style.transform = `translate3d(${(f.x - f.size / 2).toFixed(1)}px,${(f.y - f.size * .42).toFixed(1)}px,0) rotate(${f.rot.toFixed(3)}rad)`;
    });
  }

  function initHero() {
    const hero = $('#inicio');
    const copy = $('.hero-copy');
    const visual = $('.hero-visual');
    const depthEls = $$('[data-depth]').map((el) => ({ el, d: parseFloat(el.dataset.depth), x: 0, y: 0 }));
    let visible = true;
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(hero);

    /* particulas */
    const cv = $('#sparkles');
    let ctx = null; let W = 0; let H = 0; let parts = [];
    const spawn = (anywhere) => ({
      x: Math.random() * W, y: anywhere ? Math.random() * H : H + 12,
      r: Math.random() * 2 + .7, vy: -(Math.random() * .3 + .08), vx: (Math.random() - .5) * .14,
      tw: Math.random() * 6.28, ts: Math.random() * .018 + .006, star: Math.random() < .38,
      c: Math.random() < .55 ? '126,67,216' : '170,128,232',
    });
    onMeasure(() => {
      if (!cv || reduced.matches) return;
      const dpr = Math.min(2, devicePixelRatio || 1);
      const r = cv.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx = cv.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      parts = Array.from({ length: vw < 700 ? 26 : 58 }, () => spawn(true));
    });

    /* mariposas */
    const fliesHost = $('#heroFlies');
    const small = () => vw < 700;
    let flies = [];
    if (!reduced.matches) {
      flies = makeFlies(fliesHost, [
        { size: 66, cx: .74, cy: .3, ax: .12, ay: .1, fx: .37, fy: .51 },
        { size: 40, cx: .5, cy: .66, ax: .3, ay: .16, fx: .29, fy: .43 },
        { size: 52, cx: .2, cy: .36, ax: .12, ay: .18, fx: .33, fy: .27, follow: true },
        { size: 30, cx: .9, cy: .8, ax: .08, ay: .1, fx: .5, fy: .41 },
      ]);
      onMeasure(() => flies.forEach((f, i) => { f.size = [66, 40, 52, 30][i] * (small() ? .72 : 1); f.el.style.width = f.size + 'px'; }));
    }

    onTick((y, dt, vel, t) => {
      /* salida del hero al hacer scroll */
      if (y < vh * 1.2) {
        copy.style.transform = `translate3d(0,${(y * .1).toFixed(1)}px,0)`;
        copy.style.opacity = (1 - clamp(y / (vh * .85))).toFixed(3);
        visual.style.transform = `translate3d(0,${(y * -.05).toFixed(1)}px,0)`;
      }
      if (!visible) return;

      /* profundidad con el mouse */
      if (fine.matches && !reduced.matches) {
        const nx = pointer.active ? pointer.x / vw - .5 : 0;
        const ny = pointer.active ? pointer.y / vh - .5 : 0;
        depthEls.forEach((o) => {
          o.x = lerp(o.x, nx * o.d, .06);
          o.y = lerp(o.y, ny * o.d, .06);
          o.el.style.transform = `translate3d(${o.x.toFixed(2)}px,${o.y.toFixed(2)}px,0)`;
        });
      }

      /* particulas */
      if (ctx) {
        ctx.clearRect(0, 0, W, H);
        const rect = cv.getBoundingClientRect();
        const mx = pointer.x - rect.left;
        const my = pointer.y - rect.top;
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          p.tw += p.ts;
          p.x += p.vx + Math.sin(p.tw) * .09;
          p.y += p.vy;
          if (pointer.active && fine.matches) {
            const dx = p.x - mx; const dy = p.y - my; const d2 = dx * dx + dy * dy;
            if (d2 < 14000) { const f = (1 - d2 / 14000) * 1.4; p.x += (dx / Math.sqrt(d2 + 1)) * f; p.y += (dy / Math.sqrt(d2 + 1)) * f; }
          }
          if (p.y < -14 || p.x < -14 || p.x > W + 14) Object.assign(p, spawn(false), { x: Math.random() * W });
          const a = .22 + .6 * (.5 + .5 * Math.sin(p.tw * 3));
          ctx.fillStyle = `rgba(${p.c},${a.toFixed(3)})`;
          if (p.star) {
            const s = p.r * 3.2;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y - s); ctx.quadraticCurveTo(p.x, p.y, p.x + s, p.y);
            ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + s); ctx.quadraticCurveTo(p.x, p.y, p.x - s, p.y);
            ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - s); ctx.fill();
          } else {
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
          }
        }
      }

      /* mariposas */
      if (flies.length) {
        const r = fliesHost.getBoundingClientRect();
        const follow = pointer.active && fine.matches && pointer.y > r.top && pointer.y < r.bottom
          ? { x: pointer.x - r.left, y: pointer.y - r.top } : null;
        stepFlies(flies, fliesHost, t, follow);
      }
    });
  }

  function initCtaFlies() {
    const host = $('#ctaFlies');
    if (!host || reduced.matches) return;
    const flies = makeFlies(host, [
      { size: 84, cx: .14, cy: .3, ax: .07, ay: .16, fx: .31, fy: .39 },
      { size: 58, cx: .86, cy: .66, ax: .07, ay: .18, fx: .27, fy: .46 },
      { size: 40, cx: .72, cy: .2, ax: .12, ay: .1, fx: .43, fy: .35 },
    ]);
    let visible = false;
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(host);
    onTick((y, dt, vel, t) => { if (visible) stepFlies(flies, host, t, null); });
  }

  /* ---------- 7. Marquee, manifiesto, imagen expandida ---------- */
  function initMarquee() {
    const track = $('#marquee');
    if (!track || reduced.matches) return;
    const g = track.firstElementChild;
    for (let i = 0; i < 2; i++) { const c = g.cloneNode(true); c.setAttribute('aria-hidden', 'true'); track.appendChild(c); }
    let w = 0; let x = 0; let visible = false;
    onMeasure(() => { w = g.offsetWidth; });
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(track.parentElement);
    onTick((y, dt, vel) => {
      if (!visible || !w) return;
      x -= (58 + vel * .26) * dt;
      if (x <= -w) x += w; else if (x > 0) x -= w;
      track.style.transform = `translate3d(${x.toFixed(1)}px,0,0) skewX(${clamp(-vel * .004, -7, 7).toFixed(2)}deg)`;
    });
  }

  function initManifesto() {
    const el = $('[data-scrub]');
    if (!el) return;
    wrapWords(el, { mask: false });
    if (reduced.matches) { $$('.mf', el).forEach((w) => { w.style.opacity = 1; }); return; }
    const words = $$('.mf', el);
    const n = words.length;
    let top = 0; let h = 0;
    onMeasure(() => { top = docTop(el); h = el.offsetHeight; });
    onTick((y) => {
      const p = clamp((y + vh * .86 - top) / (h + vh * .42));
      const pos = p * (n + 5);
      for (let i = 0; i < n; i++) {
        const o = (.16 + .84 * clamp((pos - i) / 4)).toFixed(3);
        if (words[i]._o !== o) { words[i]._o = o; words[i].style.opacity = o; }
      }
    });
  }

  function initExpand() {
    const sec = $('#xp');
    if (!sec || reduced.matches) return;
    const frame = $('#xpFrame');
    const img = $('img', frame);
    const scrim = $('.xp-scrim', frame);
    const copy = $('#xpCopy');
    const l1 = $('.xp-l1');
    const l2 = $('.xp-l2');
    let top = 0; let range = 1; let last = -1;
    onMeasure(() => { top = docTop(sec); range = Math.max(1, sec.offsetHeight - vh); last = -1; });
    onTick((y) => {
      const p = clamp((y - top) / range);
      if (p === last) return;
      last = p;
      const mob = vw < 700;
      const e = easeIO(clamp(p / .72));
      const sx0 = mob ? 15 : 31; const sy0 = mob ? 17 : 14;
      const sx = lerp(sx0, 0, e); const sy = lerp(sy0, 0, e);
      const halfW = (vw * (1 - 2 * sx0 / 100)) / 2;
      const rt = lerp(halfW, 0, e); const rb = lerp(28, 0, e);
      frame.style.clipPath = `inset(${sy.toFixed(2)}% ${sx.toFixed(2)}% ${sy.toFixed(2)}% ${sx.toFixed(2)}% round ${rt.toFixed(1)}px ${rt.toFixed(1)}px ${rb.toFixed(1)}px ${rb.toFixed(1)}px)`;
      img.style.scale = lerp(1.3, 1, e).toFixed(4);
      scrim.style.opacity = clamp((p - .42) / .34).toFixed(3);
      const c = clamp((p - .6) / .25);
      copy.style.opacity = c.toFixed(3);
      copy.style.transform = `translate3d(0,${((1 - c) * 44).toFixed(1)}px,0)`;
      copy.style.visibility = c > .02 ? 'visible' : 'hidden';
      l1.style.transform = `translate3d(${(-e * 16).toFixed(2)}vw,0,0)`;
      l2.style.transform = `translate3d(${(e * 16).toFixed(2)}vw,0,0)`;
    });
  }

  /* ---------- 8. Servicios horizontales, pasos y parallax ---------- */
  function initServices() {
    const sec = $('#servicios');
    if (!sec) return;
    const track = $('#hsTrack');
    const viewport = $('#hsViewport');
    const cards = $$('.svc', track);

    // pase lo que pase, el contenedor no debe desplazarse solo (foco con teclado)
    viewport.addEventListener('scroll', () => { viewport.scrollLeft = 0; });

    if (!reduced.matches) {
      const bar = $('#hsBar');
      const cur = $('#hsCur');
      const imgs = cards.map((c) => $('.svc-img img', c));
      const total = cards.filter((c) => !c.classList.contains('svc-end')).length;
      let top = 0; let dist = 0; let range = 1; let shown = '';
      onMeasure(() => {
        dist = Math.max(0, track.scrollWidth - viewport.clientWidth);
        range = Math.max(1, dist * 1.2);
        const hgt = Math.round(vh + range);
        if (sec.style.height !== hgt + 'px') sec.style.height = hgt + 'px';
        top = docTop(sec);
        cards.forEach((c) => { c._x = c.offsetLeft; c._w = c.offsetWidth; });
      });
      onTick((y) => {
        const p = clamp((y - top) / range);
        const x = -p * dist;
        track.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
        bar.style.transform = `scaleX(${p.toFixed(4)})`;
        for (let i = 0; i < cards.length; i++) {
          const d = (cards[i]._x + x + cards[i]._w / 2 - vw / 2) / vw;
          if (imgs[i]) imgs[i].style.transform = `translate3d(${(-d * 7).toFixed(2)}%,0,0)`;
        }
        const s = pad2(Math.round(p * (total - 1)) + 1);
        if (s !== shown) { shown = s; cur.textContent = s; }
      });
      track.addEventListener('focusin', (e) => {
        const card = e.target.closest('.svc');
        if (!card) return;
        const want = clamp(card._x + card._w / 2 - vw / 2, 0, dist);
        goTo(top + (dist ? want / dist : 0) * range);
      });
    }

    // tilt y brillo que sigue al cursor
    if (fine.matches && !reduced.matches) {
      cards.forEach((c) => {
        const art = $('article', c);
        c.addEventListener('pointermove', (e) => {
          const r = art.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          art.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
          art.style.setProperty('--my', (py * 100).toFixed(1) + '%');
          if (!c.classList.contains('svc-end')) {
            art.style.setProperty('--ry', ((px - .5) * 7).toFixed(2) + 'deg');
            art.style.setProperty('--rx', ((.5 - py) * 6).toFixed(2) + 'deg');
          }
        });
        c.addEventListener('pointerleave', () => { art.style.setProperty('--rx', '0deg'); art.style.setProperty('--ry', '0deg'); });
      });
    }
  }

  function initFlow() {
    const steps = $$('#steps .step');
    const imgs = $$('#flowVisual .flow-arch img');
    const no = $('#flowNo');
    if (!steps.length) return;
    const activate = (i) => {
      steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
      imgs.forEach((im, k) => im.classList.toggle('is-active', k === i));
      no.textContent = '0' + (i + 1);
    };
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) activate(parseInt(e.target.dataset.i, 10)); }),
      { rootMargin: '-46% 0px -46% 0px' });
    steps.forEach((s) => io.observe(s));
  }

  function initParallax() {
    if (reduced.matches) return;
    const items = $$('[data-speed]').map((el) => ({ el, s: parseFloat(el.dataset.speed), top: 0, h: 0, vis: false }));
    const io = new IntersectionObserver((es) => es.forEach((e) => { const o = items.find((i) => i.el === e.target); if (o) o.vis = e.isIntersecting; }), { rootMargin: '20% 0px' });
    items.forEach((o) => io.observe(o.el));
    onMeasure(() => items.forEach((o) => { o.top = docTop(o.el); o.h = o.el.offsetHeight; }));
    onTick((y) => items.forEach((o) => {
      if (!o.vis) return;
      const c = o.top + o.h / 2 - (y + vh / 2);
      o.el.style.transform = `translate3d(0,${(-c * o.s * (vw < 700 ? .6 : 1)).toFixed(1)}px,0)`;
    }));
  }

  /* ---------- 9. Interacciones ---------- */
  function initButtons() {
    $$('.btn').forEach((b) => {
      const setOrigin = (e) => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--bx', (e.clientX - r.left).toFixed(0) + 'px');
        b.style.setProperty('--by', (e.clientY - r.top).toFixed(0) + 'px');
      };
      b.addEventListener('pointerenter', setOrigin);
      b.addEventListener('pointerleave', setOrigin);
    });
    if (!fine.matches || reduced.matches) return;
    $$('[data-magnetic]').forEach((b) => {
      let r = null;
      b.addEventListener('pointerenter', () => { r = b.getBoundingClientRect(); });
      b.addEventListener('pointermove', (e) => {
        if (!r) return;
        b.style.transform = `translate(${((e.clientX - r.left - r.width / 2) * .22).toFixed(1)}px,${((e.clientY - r.top - r.height / 2) * .32).toFixed(1)}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; r = null; });
    });
  }

  function initFaq() {
    $$('.acc-i').forEach((item) => {
      const btn = $('button', item);
      btn.addEventListener('click', () => {
        const open = !item.classList.contains('open');
        $$('.acc-i.open').forEach((o) => { o.classList.remove('open'); $('button', o).setAttribute('aria-expanded', 'false'); });
        if (open) { item.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
      });
    });
  }

  function burst(btn) {
    if (reduced.matches) return;
    const r = btn.getBoundingClientRect();
    for (let i = 0; i < 16; i++) {
      const s = document.createElement('span');
      const a = (i / 16) * Math.PI * 2 + Math.random() * .4;
      const d = 50 + Math.random() * 60;
      s.className = 'burst';
      s.style.left = r.left + r.width / 2 + 'px';
      s.style.top = r.top + r.height / 2 + 'px';
      s.style.setProperty('--tx', Math.cos(a) * d + 'px');
      s.style.setProperty('--ty', Math.sin(a) * d + 'px');
      s.style.background = i % 3 === 0 ? '#C2A3EE' : i % 3 === 1 ? '#7E43D8' : '#fff';
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 1000);
    }
  }

  function initForm() {
    const form = $('#form');
    if (!form) return;
    const name = $('#f-name'); const svc = $('#f-svc'); const tel = $('#f-tel');
    const date = $('#f-date'); const msg = $('#f-msg');
    const note = $('#formNote'); const btn = $('#submit');
    const iso = new Date(); iso.setMinutes(iso.getMinutes() - iso.getTimezoneOffset());
    date.min = iso.toISOString().slice(0, 10);

    const fail = (input, errId, text) => {
      input.closest('.field').classList.add('invalid');
      input.setAttribute('aria-invalid', 'true');
      $('#' + errId).textContent = text;
    };
    const clear = (input, errId) => {
      input.closest('.field').classList.remove('invalid');
      input.removeAttribute('aria-invalid');
      $('#' + errId).textContent = '';
    };
    name.addEventListener('input', () => clear(name, 'e-name'));
    svc.addEventListener('change', () => clear(svc, 'e-svc'));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      clear(name, 'e-name'); clear(svc, 'e-svc');
      let first = null;
      if (name.value.trim().length < 2) { fail(name, 'e-name', 'Cuéntanos tu nombre para saludarte.'); first = first || name; }
      if (!svc.value) { fail(svc, 'e-svc', 'Elige el servicio que te interesa.'); first = first || svc; }
      if (first) { first.focus(); return; }

      const lines = [`Hola, soy ${name.value.trim()}. Quiero agendar mi cita en Nancy Ibarra Salón Spa.`, `Servicio: ${svc.value}`];
      if (date.value) {
        const d = new Date(date.value + 'T12:00:00');
        lines.push('Fecha que me gustaría: ' + d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }));
      }
      if (tel.value.trim()) lines.push('Mi teléfono: ' + tel.value.trim());
      if (msg.value.trim()) lines.push('Detalles: ' + msg.value.trim());

      burst(btn);
      note.textContent = '¡Listo! Abriendo WhatsApp con tu mensaje...';
      window.open(WA(lines.join('\n')), '_blank', 'noopener');
      setTimeout(() => { note.textContent = 'Se abrirá WhatsApp con tu mensaje listo para enviar.'; }, 5000);
    });
  }

  /* ---------- 10. Mariposa guia y WhatsApp flotante ---------- */
  function initGuide() {
    const g = $('#guide');
    if (!g || reduced.matches) return;
    g.innerHTML = BF;
    g.firstChild.style.setProperty('--flap', '.32s');
    let x = vw * .5; let y = vh * .7; let rot = 0; let alpha = 0;
    onTick((sy, dt, vel) => {
      const m = maxScroll();
      const p = m ? sy / m : 0;
      const size = vw < 700 ? 32 : 44;
      g.style.width = size + 'px';
      const moving = Math.abs(vel) > 90 && sy > vh * .7 && p < .975 && !menuOpen;
      alpha = lerp(alpha, moving ? 1 : 0, moving ? .08 : .04);
      g.style.opacity = (alpha * .95).toFixed(3);
      const tx = vw * (.5 + .4 * Math.sin(p * Math.PI * 10 + 1));
      const ty = vh * (.66 + .14 * Math.sin(p * Math.PI * 17));
      const nx = lerp(x, tx, .06); const ny = lerp(y, ty, .06);
      const dx = nx - x; const dy = ny - y;
      x = nx; y = ny;
      if (Math.hypot(dx, dy) > .1) {
        let d = Math.atan2(dy, dx) + Math.PI / 2 - rot;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        rot += d * .09;
      }
      g.style.transform = `translate3d(${(x - size / 2).toFixed(1)}px,${(y - size * .4).toFixed(1)}px,0) rotate(${rot.toFixed(3)}rad)`;
    });
  }

  function initWaTip() {
    const w = $('#waFloat');
    if (!w) return;
    // se muestra una sola vez, y solo si la persona sigue cerca del inicio
    setTimeout(() => {
      if (S.y > vh * 1.6) return;
      w.classList.add('tip');
      setTimeout(() => w.classList.remove('tip'), 6000);
    }, 7000);
  }

  /* ---------- Arranque ---------- */
  function init() {
    // enlaces de WhatsApp (una sola fuente de verdad: CONFIG)
    $$('[data-wa]').forEach((a) => { a.href = WA(a.dataset.wa || CONFIG.defaultMsg); });

    // contadores en 0 hasta que entren en pantalla
    $$('[data-count]').forEach((el) => { el.textContent = (el.dataset.prefix || '') + '0'; });

    // titulares partidos por palabras
    $$('[data-split]').forEach((el) => wrapWords(el, { mask: true }));
    const heroTitle = $('.hero-title');
    if (heroTitle) heroTitle.style.setProperty('--d', '.3s');

    addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { pointer.active = false; });

    initSmooth();
    initMenu();
    initNav();
    initHero();
    initCtaFlies();
    initMarquee();
    initManifesto();
    initExpand();
    initServices();
    initFlow();
    initParallax();     // siempre despues de servicios: depende de la altura que fija esa seccion
    initButtons();
    initFaq();
    initForm();
    initGuide();
    initWaTip();

    measureAll();
    requestAnimationFrame(frame);

    let rt;
    const remeasure = () => { clearTimeout(rt); rt = setTimeout(measureAll, 140); };
    addEventListener('resize', () => { if (innerWidth !== vw || Math.abs(innerHeight - vh) > 120) remeasure(); });
    new ResizeObserver(remeasure).observe(document.body);
    addEventListener('load', remeasure, { once: true });
    if (document.fonts) document.fonts.ready.then(remeasure);

    runLoader();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
