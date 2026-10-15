/* ==========================================================================
   Do Sushi Haus – Motion engine (vanilla, no dependencies)

   Markup hooks
   .reveal            fade + rise
   [data-stagger]     children reveal one after another
   [data-split]       headline split into words that rise from a mask
   [data-frame]       title frame opens from the centre
   .reveal-ink        round photo: ink-circle reveal + ensō ring draws
   .reveal-wipe       wide photo: brush wipe from left
   [data-drop]        children (lanterns) drop on a spring
   [data-speed="n"]   parallax: n > 0 lags behind scroll, n < 0 runs ahead
   [data-rotate="n"]  rotates with scroll position (deg per px)
   [data-hero-out]    fades & lifts away while the hero scrolls out
   [data-glow]        exposes --p (0→1 while in view) for CSS

   Behaviour
   · Elements reveal when entering; they reset only after leaving through the
     bottom edge, so scrolling back up replays them – content above stays put.
   · --dir tells CSS which edge an element came from.
   · Scroll velocity is published as --vel on <html> (lanterns, plates lean).
   ========================================================================== */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- Split headlines into words (keeps <em>, <br>) ---------- */
  const split = el => {
    let i = 0;
    const base = parseFloat(el.style.getPropertyValue('--d')) || 0;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const w = document.createElement('span'); w.className = 'split-word';
            const inner = document.createElement('span'); inner.textContent = part;
            inner.style.setProperty('--d', `${base + i++ * 85}ms`);
            w.append(inner); frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    walk(el);
  };

  /* ---------- Stagger delays ---------- */
  const stagger = (parent, step) => {
    [...parent.children].forEach((c, i) => c.style.setProperty('--d', `${Math.min(i, 12) * step}ms`));
  };
  $$('[data-stagger]').forEach(el => stagger(el, +el.dataset.stagger || 90));
  $$('[data-drop]').forEach(el => stagger(el, 140));
  $$('.pond .footer__grid').forEach(el => stagger(el, 120));
  $$('[data-split]').forEach(el => {
    // a split headline inside a stagger group starts at its slot in the group
    const d = el.style.getPropertyValue('--d');
    if (d) el.style.setProperty('--d', d);
    split(el);
  });

  /* ---------- Scroll-scrubbed text: words light up with scroll position ---------- */
  const scrubTexts = $$('[data-scrub-text]').map(el => {
    const words = [];
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.append(' ');
          const w = document.createElement('span'); w.className = 'scrub-word'; w.textContent = part;
          words.push(w); frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
    walk(el);
    return { el, words, lit: -1 };
  });

  /* ---------- Scroll-linked collage: children travel from a stack to their spot ---------- */
  const spreads = $$('[data-spread]').map(el => ({ el, items: $$('[data-x]', el).map(c => ({
    c, x: +c.dataset.x || 0, y: +c.dataset.y || 0, r: +c.dataset.r || 0, s: +(c.dataset.s || 1)
  })) }));

  /* ---------- Reveal observer ---------- */
  const targets = $$('.reveal, [data-stagger], [data-frame], .reveal-ink, .reveal-wipe, [data-drop], .brush, .pond, .hero__visual');
  const show = el => el.classList.add('is-in', 'is-visible');

  if (reduce) { targets.forEach(show); scrubTexts.forEach(t => t.words.forEach(w => w.classList.add('is-lit'))); return; }
  root.classList.add('js-motion');

  let lastY = scrollY;
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    const el = e.target;
    if (e.isIntersecting) {
      el.style.setProperty('--dir', e.boundingClientRect.top < 0 ? -1 : 1);
      show(el);
    } else if (e.boundingClientRect.top > innerHeight) {
      // left through the bottom (user scrolled up) → reset so it replays
      el.style.setProperty('--dir', 1);
      el.classList.remove('is-in', 'is-visible');
    }
  }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  const start = () => targets.forEach(el => io.observe(el));
  // Wait for the intro to finish before revealing the hero
  const intro = document.getElementById('intro');
  if (intro && !intro.classList.contains('is-done') && document.body.contains(intro)) {
    let started = false;
    const go = () => { if (!started) { started = true; start(); } };
    document.addEventListener('intro:done', go, { once: true });
    setTimeout(go, 6000);
  } else start();

  /* ---------- UI injected once: progress thread & back-to-top ---------- */
  const bar = Object.assign(document.createElement('div'), { className: 'scroll-progress' });
  const top = Object.assign(document.createElement('button'), { className: 'to-top', type: 'button', ariaLabel: 'Nach oben' });
  top.innerHTML = '<svg viewBox="0 0 52 52" aria-hidden="true"><circle class="track" cx="26" cy="26" r="24"/><circle class="bar" cx="26" cy="26" r="24" pathLength="1"/></svg><span aria-hidden="true">↑</span>';
  top.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
  document.body.append(bar, top);

  /* ---------- Scroll-linked layer ---------- */
  const mobile = () => innerWidth < 768;
  const para = $$('[data-speed]').map(el => ({ el, k: +el.dataset.speed }));
  const rot = $$('[data-rotate]').map(el => ({ el, k: +el.dataset.rotate }));
  const glow = $$('[data-glow]');
  const heroOut = $$('[data-hero-out]');
  const heroVisual = document.querySelector('main > .hero:first-child .hero__visual'); // only when the hero opens the page
  const header = document.querySelector('.site-header');
  let docH = 0, vh = innerHeight;

  // Cache each element's page position (without our own translate applied)
  const measure = () => {
    vh = innerHeight;
    docH = root.scrollHeight - vh;
    [...para, ...rot].forEach(o => {
      const prev = o.el.style.translate;
      o.el.style.translate = 'none';
      const r = o.el.getBoundingClientRect();
      o.c = r.top + scrollY + r.height / 2;
      o.el.style.translate = prev;
    });
    glow.forEach(el => { const r = el.getBoundingClientRect(); el._t = r.top + scrollY; el._h = r.height; });
  };

  let vel = 0, raf = 0, hidden = false, acc = 0, holdUntil = performance.now() + 1500;
  document.addEventListener('click', e => { if (e.target.closest('a[href*="#"]')) holdUntil = performance.now() + 1600; }, true);
  addEventListener('hashchange', () => { holdUntil = performance.now() + 1600; });
  const frame = () => {
    const y = scrollY;
    const dy = y - lastY; lastY = y;
    vel += (clamp(dy, -60, 60) - vel) * 0.18;              // smoothed velocity
    root.style.setProperty('--vel', (clamp(vel / 30, -1, 1) * 5).toFixed(2));

    const p = docH > 0 ? clamp(y / docH, 0, 1) : 0;
    root.style.setProperty('--progress', p.toFixed(4));
    top.classList.toggle('is-shown', y > vh * 0.8);

    // Smart header (ignored while the mobile menu is open)
    if (header && !document.body.classList.contains('menu-open')) {
      acc = Math.sign(dy) === Math.sign(acc) ? acc + dy : dy;
      // jumps (anchor links, page load at #hash) never hide the header
      if (performance.now() < holdUntil || Math.abs(dy) > 250) { hidden = false; acc = 0; }
      else if (y < 160) hidden = false;
      else if (acc > 24) hidden = true;
      else if (acc < -12) hidden = false;
      root.classList.toggle('header-hidden', hidden);
    }

    const f = mobile() ? 0.5 : 1;
    const mid = y + vh / 2;
    para.forEach(o => {
      const d = o.c - mid;
      if (Math.abs(d) > vh * 1.5) return;                  // far away → skip
      o.el.style.translate = `0 ${(d * o.k * f).toFixed(1)}px`;
    });
    rot.forEach(o => {
      const d = o.c - mid;
      if (Math.abs(d) > vh * 1.5) return;
      o.el.style.rotate = `${(d * o.k).toFixed(2)}deg`;
    });
    glow.forEach(el => {
      const g = clamp((y + vh - el._t) / (vh + el._h), 0, 1);
      el.style.setProperty('--p', g.toFixed(3));
    });

    // Scrubbed text: progress 0 when the block enters at 85% of the viewport, 1 when its end passes 40%
    scrubTexts.forEach(t => {
      const r = t.el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) return;
      const p = clamp((vh * .85 - r.top) / (r.height + vh * .45), 0, 1);
      const lit = Math.round(p * t.words.length);
      if (lit === t.lit) return;
      t.words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
      t.lit = lit;
    });
    // Collage: p 0 → stacked in the centre, 1 → at data-x/y (vw / px), rotation data-r
    spreads.forEach(o => {
      const r = o.el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) return;
      const p = clamp((vh - r.top) / (r.height * .7 + vh * .3), 0, 1);
      const e = 1 - Math.pow(1 - p, 3);
      const unit = Math.min(innerWidth, 1400) / 100;
      o.items.forEach(it => {
        it.c.style.transform = `translate3d(${(it.x * unit * e).toFixed(1)}px, ${(it.y * e).toFixed(1)}px, 0) rotate(${(it.r * e).toFixed(2)}deg) scale(${(.82 + (it.s - .82) * e).toFixed(3)})`;
      });
    });

    // Hero scrolls away: text lifts & fades, dish settles back
    const h = clamp(y / (vh * 0.9), 0, 1);
    heroOut.forEach(el => {
      el.style.opacity = (1 - h * 1.3).toFixed(3);
      el.style.translate = `0 ${(-h * 90).toFixed(1)}px`;
    });
    if (heroVisual) heroVisual.style.scale = (1 - h * 0.12).toFixed(4);

    // keep running until the scroll has settled
    raf = Math.abs(vel) > 0.05 || Math.abs(dy) > 0 ? requestAnimationFrame(frame) : 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', () => { measure(); kick(); });
  new ResizeObserver(() => { measure(); kick(); }).observe(document.body);
  document.fonts && document.fonts.ready.then(() => { measure(); kick(); });
  measure(); kick();
})();
