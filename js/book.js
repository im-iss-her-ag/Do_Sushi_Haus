/* ==========================================================================
   Do Sushi Haus – Flip-book menu
   <div class="book" data-book data-pages="18" data-src="assets/book/p{n}.webp"></div>

   Faces: [designed front cover, menu page 1 … n, designed back cover]
   Each leaf carries two faces (front / back). Flipping a leaf rotates it
   -180° around the spine. The page follows the finger while dragging and
   finishes (or springs back) on release.
   ========================================================================== */
(() => {
  const PHONE = '03683 6098662', TEL = 'tel:+4936836098662';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const coverFront = `
    <div class="cover">
      <div>
        <div class="cover__logo">
          <img src="assets/img/logo-tmp.webp" alt="">
          <svg viewBox="0 0 100 100" filter="url(#brushy)" aria-hidden="true">
            <path d="M14 70A44 44 0 1 1 70 93" stroke="#d4a72c" stroke-width=".9"/>
            <path d="M82 16A44 44 0 0 1 95 42" stroke="#c62a1f" stroke-width="1.8"/>
          </svg>
        </div>
        <p class="cover__kicker">Do Sushi Haus</p>
        <h3 class="cover__title">Speisekarte</h3>
        <p class="cover__sub">Sushi · Asia · Schmalkalden</p>
      </div>
      <span class="cover__hint">Zum Öffnen tippen</span>
    </div>`;
  const coverBack = `
    <div class="cover cover--back">
      <div class="cover__body">
        <p class="cover__kicker">Arigatō</p>
        <h3 class="cover__title">Danke fürs Blättern</h3>
        <p>Bestellung &amp; Reservierung</p>
        <p><a href="${TEL}">${PHONE}</a></p>
        <p style="margin-top:1em">Steingasse 10 · 98574 Schmalkalden</p>
        <p>Mo, Mi–So · 11:00–14:30 · 16:30–21:00</p>
        <button class="btn btn--ghost cover__restart" type="button" data-restart>Von vorn blättern</button>
      </div>
    </div>`;

  const init = book => {
    const PAD = innerWidth < 900;                       // mobile: one page per leaf (no spreads)
    book.classList.toggle('book--pad', PAD);
    book.dataset.mode = PAD ? 'pad' : 'spread';
    const pages = +book.dataset.pages;
    const src = n => book.dataset.src.replace('{n}', String(n).padStart(2, '0'));
    const faces = [coverFront, ...Array.from({ length: pages }, (_, i) => i + 1), coverBack];
    const N = PAD ? faces.length - 1 : Math.ceil(faces.length / 2);   // number of turns
    const LEAVES = PAD ? faces.length : N;
    const face = (f, side) => {
      if (f === undefined) return `<div class="leaf__face leaf__${side}"></div>`;
      if (typeof f === 'string') return `<div class="leaf__face leaf__${side}">${f}</div>`;
      return `<div class="leaf__face leaf__${side}"><img data-src="${src(f)}" alt="Speisekarte Seite ${f}" decoding="async"></div>`;
    };

    book.innerHTML = `
      <div class="book__stage" tabindex="0" role="region" aria-roledescription="Buch" aria-label="Speisekarte zum Blättern">
        <div class="book__inner" data-state="closed">
          ${Array.from({ length: LEAVES }, (_, i) => PAD
            ? `<div class="leaf" data-i="${i}">${face(faces[i], 'front')}${face(undefined, 'back')}</div>`
            : `<div class="leaf" data-i="${i}">${face(faces[2 * i], 'front')}${face(faces[2 * i + 1], 'back')}</div>`).join('')}
          <span class="book__edges" aria-hidden="true"></span>
        </div>
      </div>
      <div class="book__controls">
        <button class="book__btn" type="button" data-dir="-1" aria-label="Zurückblättern">‹</button>
        <span class="book__count" aria-live="polite"></span>
        <button class="book__btn" type="button" data-dir="1" aria-label="Weiterblättern">›</button>
      </div>
      <div class="book__progress" aria-hidden="true"><span></span></div>
      <p class="book__tip"></p>`;

    const stage = book.querySelector('.book__stage');
    const inner = book.querySelector('.book__inner');
    const leaves = [...book.querySelectorAll('.leaf')];
    const count = book.querySelector('.book__count');
    const [prevBtn, nextBtn] = book.querySelectorAll('.book__btn');
    const bar = book.querySelector('.book__progress span');
    const tip = book.querySelector('.book__tip');
    const mobile = () => false;                         // spreads only on desktop; mobile uses PAD mode
    tip.textContent = matchMedia('(pointer: coarse)').matches ? 'Wischen oder tippen zum Blättern' : 'Klicken, ziehen oder Pfeiltasten ← → zum Blättern';

    let cur = 0;          // leaves already turned
    let side = 'R';       // mobile only: which half of the spread is in view

    // fetch page images only once the book is near the viewport, then around the current spread
    let near = false;
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { near = true; o.disconnect(); load(); } }, { rootMargin: '600px 0px' }).observe(book);
    const load = () => {
      if (!near) return;
      leaves.forEach((l, i) => {
        if (Math.abs(i - cur) <= 3) l.querySelectorAll('img[data-src]').forEach(img => { img.src = img.dataset.src; img.removeAttribute('data-src'); });
      });
    };
    // Only the leaves around the open spread exist for the GPU; the rest are display:none.
    // (19 preserve-3d leaves with photos at once exhausted iOS memory and crashed Safari/Chrome.)
    const KEEP = 2;
    const stack = () => leaves.forEach((l, i) => {
      l.style.zIndex = l.classList.contains('is-flipped') ? i + 1 : N - i + N;
      const near = i >= cur - KEEP && i <= cur + KEEP - 1;
      l.style.display = near ? '' : 'none';
    });

    const label = () => {
      if (cur === 0) return 'Umschlag';
      if (cur === N) return 'Rückseite';
      if (PAD) return `Seite ${cur} / ${pages}`;
      // visible faces: left = back of leaf cur-1 (face 2cur-1), right = front of leaf cur (face 2cur)
      const l = 2 * cur - 1, r = 2 * cur;
      if (mobile()) return `Seite ${side === 'L' ? l : Math.min(r, pages)} / ${pages}`;
      return `Seite ${l}${r <= pages ? '–' + r : ''} / ${pages}`;
    };
    const edges = () => { inner.style.setProperty('--right', ((N - cur) / N).toFixed(3)); inner.style.setProperty('--left', (cur / N).toFixed(3)); };
    const setSide = s => { side = s; inner.dataset.side = s; };
    const render = () => {
      inner.dataset.state = cur === 0 ? 'closed' : cur === N ? 'end' : 'open';
      inner.dataset.side = side;
      count.textContent = label();
      prevBtn.disabled = cur === 0;
      nextBtn.disabled = cur === N;
      bar.style.setProperty('--bp', cur / N);
      edges();
      stack(); load();
    };

    const turn = (dir, fromDrag) => {
      if ((dir > 0 && cur >= N) || (dir < 0 && cur <= 0)) return;
      // desktop: leaving a closed state → slide the book back first, then turn
      if (!PAD && !fromDrag && !reduce && (cur === 0 || cur === N) && inner.dataset.state !== 'open') {
        inner.dataset.state = 'open';
        return setTimeout(() => turn(dir, true), 450);
      }
      const leaf = leaves[dir > 0 ? cur : cur - 1];
      leaves.forEach((l, i) => { if (Math.abs(i - (dir > 0 ? cur : cur - 1)) <= 1) l.style.display = ''; });
      leaf.style.zIndex = 200;
      leaf.classList.remove('is-dragging');
      leaf.style.transform = '';
      leaf.style.removeProperty('--shade');
      if (!fromDrag && !reduce) { leaf.classList.add('is-turning'); setTimeout(() => leaf.classList.remove('is-turning'), 1050); }
      leaf.classList.toggle('is-flipped', dir > 0);
      cur += dir;
      setSide(dir > 0 ? 'L' : 'R');
      count.textContent = label();
      inner.dataset.state = cur === 0 ? 'closed' : cur === N ? 'end' : 'open';
      prevBtn.disabled = cur === 0; nextBtn.disabled = cur === N;
      bar.style.setProperty('--bp', cur / N);
      edges();
      load();
      setTimeout(stack, reduce ? 0 : 1000);
    };

    // On mobile the first tap on the closed book also slides the view
    // Mobile shows one page: step = slide across the spread, or flip a leaf
    const canSlideNext = () => mobile() && cur > 0 && cur < N && side === 'L';
    const canSlidePrev = () => mobile() && cur > 0 && cur < N && side === 'R';
    const slide = s => { setSide(s); count.textContent = label(); };
    const next = () => canSlideNext() ? slide('R') : turn(1);
    const prev = () => canSlidePrev() ? slide('L') : turn(-1);
    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);
    book.addEventListener('click', e => {
      if (!e.target.closest('[data-restart]')) return;
      e.stopPropagation();
      // close page by page, quickly, for a satisfying rewind
      const step = () => { if (cur > 0) { turn(-1); setTimeout(step, reduce ? 0 : 140); } else setSide('R'); };
      step();
    });
    stage.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    });

    /* ---------- Tap & drag ---------- */
    let d = null;
    stage.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('a, button')) return;
      d = { x0: e.clientX, x: e.clientX, t: performance.now(), v: 0, leaf: null, dir: 0, p: 0 };
    });
    addEventListener('pointermove', e => {
      if (!d) return;
      const dx = e.clientX - d.x0, now = performance.now();
      d.v = (e.clientX - d.x) / Math.max(1, now - d.t); d.x = e.clientX; d.t = now;
      if (!d.leaf) {
        if (Math.abs(dx) < 8) return;
        d.dir = dx < 0 ? 1 : -1;
        if ((d.dir > 0 && canSlideNext()) || (d.dir < 0 && canSlidePrev())) { d.slide = true; d.leaf = true; return; }
        if ((d.dir > 0 && cur >= N) || (d.dir < 0 && cur <= 0)) { d.dir = 0; return; }
        d.leaf = leaves[d.dir > 0 ? cur : cur - 1]; d.leaf.style.display = "";
        d.leaf.classList.add('is-dragging'); d.leaf.style.zIndex = 200;
        stage.classList.add('is-grabbing');
        try { stage.setPointerCapture(e.pointerId); } catch (err) {}
      }
      if (!d.dir || d.slide) return;
      const w = book.querySelector('.leaf').offsetWidth;
      d.p = Math.min(1, Math.max(0, Math.abs(dx) / (w * 1.1)));
      const angle = d.dir > 0 ? -180 * d.p : -180 * (1 - d.p);
      d.goal = angle;
      if (!d.raf) {
        const leaf = d.leaf; let a = d.cur ?? (d.dir > 0 ? 0 : -180);
        const tick = () => {
          if (!d || d.leaf !== leaf) return;
          a += (d.goal - a) * 0.28; d.cur = a;
          leaf.style.transform = `rotateY(${a.toFixed(2)}deg)`;
          leaf.style.setProperty('--shade', (Math.sin(-a / 180 * Math.PI) * .9).toFixed(3));
          d.raf = requestAnimationFrame(tick);
        };
        d.raf = requestAnimationFrame(tick);
      }
    });
    const end = e => {
      if (!d) return;
      if (d.raf) cancelAnimationFrame(d.raf);
      const { leaf, dir, p, v, x0, slide: isSlide, x } = d; d = null;
      if (isSlide) { if (Math.abs(x - x0) > 40 || Math.abs(v) > .45) (dir > 0 ? next : prev)(); return; }
      stage.classList.remove('is-grabbing');
      if (!leaf) {                                   // plain tap → flip by side
        if (e.type === 'pointercancel') return;
        const r = stage.getBoundingClientRect();
        const rightSide = PAD ? x0 > r.left + r.width * .35 : x0 > r.left + r.width / 2;
        if (cur === 0) return next();
        if (cur === N) return prev();
        return rightSide ? next() : prev();
      }
      const fling = dir > 0 ? v < -0.45 : v > 0.45;
      if (p > 0.33 || fling) turn(dir, true);
      else {                                          // spring back
        leaf.classList.remove('is-dragging');
        leaf.style.transform = ''; leaf.style.removeProperty('--shade');
        setTimeout(stack, 1050);
      }
    };
    addEventListener('pointerup', end);
    addEventListener('pointercancel', end);

    addEventListener('resize', () => { count.textContent = label(); });
    render();
  };
  document.querySelectorAll('[data-book]').forEach(book => {
    init(book);
    let mode = book.dataset.mode;
    addEventListener('resize', () => {
      const m = innerWidth < 900 ? 'pad' : 'spread';
      if (m !== mode) { mode = m; init(book); }
    });
  });
})();