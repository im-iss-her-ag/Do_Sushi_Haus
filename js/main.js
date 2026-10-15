/* Do Sushi Haus – shared behaviour (vanilla JS, no dependencies) */
(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Intro: once per session, skippable ---------- */
  const intro = $('#intro');
  if (intro) {
    let seen = false;
    try { seen = sessionStorage.getItem('do-intro') === '1'; } catch (e) {}
    const finish = () => {
      if (intro.classList.contains('is-done')) return;
      intro.classList.add('is-done');
      document.documentElement.style.overflow = '';
      document.dispatchEvent(new Event('intro:done'));
      try { sessionStorage.setItem('do-intro', '1'); } catch (e) {}
    };
    if (seen || reduceMotion) {
      intro.remove();
    } else {
      document.documentElement.style.overflow = 'hidden';
      const stage = $('#introStage');
      const fit = () => stage.style.setProperty('--k', Math.min(1, Math.min(innerWidth, innerHeight) * 0.8 / 440));
      fit(); addEventListener('resize', fit);

      // Swap in the koi video when it exists
      const mobile = innerWidth < 768;
      const src = intro.dataset[mobile ? 'videoMobile' : 'videoDesktop'];
      if (src) {
        stage.remove();
        const v = Object.assign(document.createElement('video'), { src, muted: true, playsInline: true, autoplay: true, className: 'intro__video' });
        v.addEventListener('ended', finish);
        v.addEventListener('error', finish);
        intro.prepend(v);
        setTimeout(() => { if (v.readyState < 3) finish(); }, 1500); // slow network → skip
      } else {
        setTimeout(finish, 4200);
      }
      $('#introSkip').addEventListener('click', finish);
    }
  }

  /* ---------- Header: solid after scrolling ---------- */
  const header = $('#header');
  if (header) {
    const onScroll = () => header.classList.toggle('is-solid', scrollY > 40);
    onScroll(); addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Mobile menu ---------- */
  const toggle = $('#menuToggle');
  if (toggle) {
    const setOpen = open => {
      document.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', open);
      toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    };
    toggle.addEventListener('click', () => setOpen(!document.body.classList.contains('menu-open')));
    $$('#mobileMenu a').forEach(a => a.addEventListener('click', () => setOpen(false)));
    addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  }

  /* ---------- Opening hours & live badge ---------- */
  // Mo–So 11:00–14:30 & 16:30–21:00, Tuesday closed (except public holidays)
  const DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const SLOTS = [[660, 870], [990, 1260]];
  const CLOSED_DAY = 2;
  const fmt = m => `${String(m / 60 | 0).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const now = new Date(), today = now.getDay(), min = now.getHours() * 60 + now.getMinutes();

  $$('[data-hours]').forEach(tbody => {
    tbody.innerHTML = [1, 2, 3, 4, 5, 6, 0].map(d => {
      const closed = d === CLOSED_DAY;
      const cls = [d === today && 'is-today', closed && 'is-closed'].filter(Boolean).join(' ');
      return `<tr class="${cls}"><th scope="row">${DAYS[d]}</th><td>${closed ? 'Ruhetag' : SLOTS.map(s => `${fmt(s[0])}–${fmt(s[1])}`).join(' · ')}</td></tr>`;
    }).join('');
  });

  // Timeline: 10:00 → 22:00
  const T0 = 600, T1 = 1320, pct = m => ((m - T0) / (T1 - T0) * 100).toFixed(2) + '%';
  const SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  $$('[data-timeline]').forEach(el => {
    const mid = s => pct((s[0] + s[1]) / 2);
    el.innerHTML = `<div class="tl-head"><span></span><div><span style="left:${mid(SLOTS[0])}">Mittag</span><span style="left:${mid(SLOTS[1])}">Abend</span></div></div>` + [1, 2, 3, 4, 5, 6, 0].map((d, i) => {
      const closed = d === CLOSED_DAY, isToday = d === today;
      const slots = closed ? '' : SLOTS.map(s => `<span class="tl-slot" style="left:${pct(s[0])};width:calc(${pct(s[1])} - ${pct(s[0])});--i:${i}" title="${fmt(s[0])}–${fmt(s[1])}"><span>${fmt(s[0])}–${fmt(s[1])}</span></span>`).join('');
      const nowMark = isToday && min >= T0 && min <= T1 ? `<span class="tl-now" style="left:${pct(min)}" title="Jetzt ${fmt(min)}"></span>` : '';
      return `<div class="tl-row${isToday ? ' is-today' : ''}${closed ? ' is-closed' : ''}"><span class="tl-day">${SHORT[d]}</span><div class="tl-bar" role="img" aria-label="${DAYS[d]}: ${closed ? 'Ruhetag' : SLOTS.map(s => fmt(s[0]) + ' bis ' + fmt(s[1])).join(' und ')}">${slots}${nowMark}</div></div>`;
    }).join('') + '<div class="tl-scale"><span></span><div><span>10</span><span>13</span><span>16</span><span>19</span><span>22 Uhr</span></div></div>'

  });

  const status = (() => {
    if (today !== CLOSED_DAY) {
      const open = SLOTS.find(s => min >= s[0] && min < s[1]);
      if (open) return { open: true, text: `Jetzt geöffnet · bis ${fmt(open[1])} Uhr` };
      const next = SLOTS.find(s => min < s[0]);
      if (next) return { open: false, text: `Geschlossen · öffnet um ${fmt(next[0])} Uhr` };
    }
    for (let i = 1; i <= 7; i++) {
      const d = (today + i) % 7;
      if (d !== CLOSED_DAY) return { open: false, text: `Geschlossen · öffnet ${i === 1 ? 'morgen' : DAYS[d]} um ${fmt(SLOTS[0][0])} Uhr` };
    }
  })();
  $$('[data-open-badge]').forEach(b => { b.textContent = status.text; b.classList.toggle('is-open', status.open); });

  /* ---------- Sushi belt (kaiten): auto-run · drag · swipe · trackpad · arrows ---------- */
  const belt = $('#belt'), track = $('#beltTrack');
  // Phones / touch: lantern windows use cheap transform parallax (motion.js [data-speed]) instead of
  // position: fixed, which repaints on every scroll frame on iOS. Must run before motion.js reads [data-speed].
  if (matchMedia('(pointer: coarse), (max-width: 1023px)').matches) {
    $$('.window__bg').forEach(bg => bg.setAttribute('data-speed', '-1.3'));
  }

  // Phones / touch: native horizontal scrolling (no clones, no per-frame JS, no huge GPU layer).
  // A 34-plate translated track with will-change + mask exhausted GPU memory on iOS and crashed the tab.
  const nativeBelt = belt && (matchMedia('(pointer: coarse)').matches || innerWidth < 1024);
  if (nativeBelt) belt.classList.add('belt--native');
  if (belt && track && !nativeBelt) {
    const originals = [...track.children];
    // one cloned set makes the loop endless; clones are hidden from assistive tech
    originals.forEach(p => { const c = p.cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.inert = true; track.appendChild(c); });

    const AUTO = reduceMotion ? 0 : (innerWidth < 768 ? 0.022 : 0.03); // px per ms
    let setW = 1, step = 1;
    const measure = () => {
      setW = track.children[originals.length].offsetLeft - track.children[0].offsetLeft;
      step = track.children[1].offsetLeft - track.children[0].offsetLeft;
    };
    measure(); addEventListener('resize', measure);

    const rail = document.createElement('div'); rail.className = 'belt__rail'; belt.prepend(rail);
    let leanShown = 0;
    let x = 0, v = 0, target = null, hover = false, drag = null, visible = false, last = 0, raf = 0, lean = 0, prevX = 0;
    const wrap = () => {
      if (x >= setW) { x -= setW; if (target !== null) target -= setW; }
      else if (x < 0) { x += setW; if (target !== null) target += setW; }
    };
    const loop = t => {
      const dt = Math.min(48, t - (last || t)); last = t;
      if (drag) {
        const before = x;
        x += (drag.goal - x) * Math.min(1, dt * 0.025);  // follow the finger softly
        if (x >= setW) { x -= setW; drag.goal -= setW; } else if (x < 0) { x += setW; drag.goal += setW; }
        void before;
      } else {
        if (target !== null) {                       // arrow: ease to the next plate
          x += (target - x) * Math.min(1, dt * 0.012);
          if (Math.abs(target - x) < 0.4) { x = target; target = null; }
        } else {
          x += (v + (hover ? 0 : AUTO)) * dt;          // inertia blends back into auto-run
          v *= Math.pow(0.94, dt / 16);
          if (Math.abs(v) < 0.002) v = 0;
        }
      }
      wrap();
      track.style.transform = `translate3d(${(-x).toFixed(2)}px,0,0)`;
      rail.style.transform = `translate3d(${(-(x % 40)).toFixed(2)}px,0,0)`;
      // plates lean with the belt's own speed
      const inst = dt ? (x - prevX) / dt : 0; prevX = x;
      lean += (Math.max(-5, Math.min(5, (inst - AUTO) * 6)) - lean) * Math.min(1, dt * 0.006);
      if (Math.abs(lean - leanShown) > 0.05) { leanShown = lean; belt.style.setProperty('--bvel', lean.toFixed(2)); }
      raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
    };
    const run = () => { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) run(); }).observe(belt);
    document.addEventListener('visibilitychange', run);

    // Pointer drag (mouse + touch; vertical page scroll stays native via touch-action: pan-y)
    belt.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('.belt__nav')) return;
      drag = { x: e.clientX, t: performance.now(), moved: 0, goal: x };
      v = 0; target = null;
    });
    addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - drag.x, now = performance.now(), dt = Math.max(1, now - drag.t);
      if (!belt.classList.contains('is-dragging') && Math.abs(dx) + drag.moved > 4) {
        belt.classList.add('is-dragging');
        try { belt.setPointerCapture(e.pointerId); } catch (err) {}
      }
      drag.moved += Math.abs(dx);
      drag.goal -= dx;
      v = v * 0.6 + (-dx / dt) * 0.4;                 // remember fling speed
      drag.x = e.clientX; drag.t = now;
      run();
    });
    const release = () => {
      if (!drag) return;
      if (performance.now() - drag.t > 90) v = 0;      // held still before letting go → no fling
      v = Math.max(-3, Math.min(3, v));
      belt.dataset.moved = drag.moved > 6 ? '1' : '';
      x = drag.goal; wrap();
      drag = null; belt.classList.remove('is-dragging');
    };
    addEventListener('pointerup', release);
    addEventListener('pointercancel', release);
    belt.addEventListener('click', e => { if (belt.dataset.moved) { e.preventDefault(); e.stopPropagation(); belt.dataset.moved = ''; } }, true);

    // Hover pauses (mouse only)
    belt.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hover = true; });
    belt.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hover = false; });

    // Trackpad / shift+wheel horizontal scrolling
    belt.addEventListener('wheel', e => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
      if (!dx) return;
      e.preventDefault();
      target = null; x += dx; v = dx * 0.004; run();
    }, { passive: false });

    // Arrow buttons: glide exactly one plate
    $$('[data-belt]', belt).forEach(btn => btn.addEventListener('click', () => {
      const base = target ?? x;
      target = Math.round(base / step) * step + (+btn.dataset.belt) * step;
      v = 0; run();
    }));
  }

  /* ---------- Map (Google Maps embed): load only after consent, optionally remembered. ---------- */
  const loadMap = box => {
    const q = encodeURIComponent(box.dataset.query || `${box.dataset.lat},${box.dataset.lng}`);
    const frame = Object.assign(document.createElement('iframe'), {
      src: `https://maps.google.com/maps?q=${q}&z=16&hl=de&output=embed`,
      title: 'Karte: ' + (box.dataset.label || 'Standort'),
      loading: 'lazy', referrerPolicy: 'no-referrer-when-downgrade', allowFullscreen: true
    });
    box.innerHTML = ''; box.style.padding = '0'; box.classList.add('is-map');
    box.append(frame);
  };
  let mapOk = false;
  try { mapOk = localStorage.getItem('do-map') === '1'; } catch (e) {}
  $$('.map-ph[data-lat]').forEach(box => {
    if (mapOk) return loadMap(box);
    const btn = $('[data-load-map]', box);
    btn && btn.addEventListener('click', () => {
      if ($('[data-map-remember]', box)?.checked) { try { localStorage.setItem('do-map', '1'); } catch (e) {} }
      loadMap(box);
    });
  });

  /* ---------- Pointer lamp (desktop only) ---------- */
  const spot = $('.ambient__spot');
  if (spot && finePointer && !reduceMotion) {
    let tx = innerWidth / 2, ty = innerHeight * .3, x = tx, y = ty, raf = 0;
    const tick = () => {
      x += (tx - x) * .08; y += (ty - y) * .08;
      spot.style.setProperty('--mx', `${x}px`); spot.style.setProperty('--my', `${y}px`);
      raf = Math.abs(tx - x) + Math.abs(ty - y) > .5 ? requestAnimationFrame(tick) : 0;
    };
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
  }

  /* ---------- Speisekarte: category scroll-spy ---------- */
  const catBar = $('#catBar');
  if (catBar) {
    const links = $$('a', catBar);
    const tabs = $$('[data-tab]');
    const setActive = id => {
      const link = links.find(a => a.hash === `#${id}`);
      if (!link || link.classList.contains('is-active')) return;
      links.forEach(a => a.classList.toggle('is-active', a === link));
      tabs.forEach(t => t.classList.toggle('is-active', t.dataset.tab === link.dataset.world));
      // keep the active chip visible inside the horizontal bar
      catBar.scrollTo({ left: link === links[0] ? 0 : link.offsetLeft - catBar.clientWidth / 2 + link.clientWidth / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    const spy = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }),
      { rootMargin: '-45% 0px -50% 0px' });
    $$('[data-cat]').forEach(s => spy.observe(s));
    // back at the top → first category
    const first = $('[data-cat]');
    new IntersectionObserver(([e]) => { if (e.isIntersecting) setActive(first.id); }).observe($('.page-hero'));
  }

  /* ---------- Set cards: number badge + mobile swipe showcase (centre card, dots) ---------- */
  $$('.sets').forEach(strip => {
    const cards = [...strip.querySelectorAll(':scope > .set-card')];
    cards.forEach(c => {
      const no = (c.querySelector('.label')?.textContent.match(/\d+/) || [])[0];
      if (no && c.querySelector('.set-card__img')) c.insertAdjacentHTML('afterbegin', `<span class="set-card__no" aria-hidden="true">${no}</span>`);
    });
    const hint = Object.assign(document.createElement('p'), { className: 'sets-hint', textContent: '← Wischen für alle Menüs →' });
    const dots = Object.assign(document.createElement('div'), { className: 'sets-dots' });
    dots.innerHTML = cards.map((_, i) => `<button type="button" aria-label="Menü ${i + 1}"></button>`).join('');
    strip.before(hint); strip.after(dots);
    const btns = [...dots.children];
    btns.forEach((b, i) => b.addEventListener('click', () => cards[i].scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'center' })));
    let raf = 0;
    const update = () => {
      raf = 0;
      const mid = strip.getBoundingClientRect().left + strip.clientWidth / 2;
      let best = 0, bd = Infinity;
      cards.forEach((c, i) => { const r = c.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - mid); if (d < bd) { bd = d; best = i; } });
      cards.forEach((c, i) => c.classList.toggle('is-center', i === best));
      btns.forEach((b, i) => b.classList.toggle('is-on', i === best));
    };
    strip.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    addEventListener('resize', update);
    // start on the Chef's choice card if there is one (phones)
    const fav = cards.findIndex(c => c.querySelector('.seal'));
    if (innerWidth < 900 && fav > 0) strip.scrollLeft = cards[fav].offsetLeft - (strip.clientWidth - cards[fav].offsetWidth) / 2;
    update();
  });

  /* ---------- Dish sheet: photo flies out of the thumbnail, details stagger in,
     swipe / arrows browse the same category, closes back into the thumbnail ---------- */
  if ($('[data-zoom]')) {
    const box = document.createElement('div');
    box.className = 'dsheet'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Gericht');
    box.innerHTML = `
      <div class="dsheet__card">
        <button class="dsheet__close" type="button" aria-label="Schließen">✕</button>
        <div class="dsheet__photo">
          <svg class="dsheet__ring" viewBox="0 0 100 100" aria-hidden="true"><path pathLength="1" d="M50 3A47 47 0 1 1 8 30"/><path class="r2" pathLength="1" d="M84 14A47 47 0 0 1 96 36"/></svg>
          <img alt="">
        </div>
        <div class="dsheet__body">
          <p class="dsheet__cat label"></p>
          <h3 class="dsheet__name"></h3>
          <div class="dsheet__tags"></div>
          <p class="dsheet__desc"></p>
          <ul class="dsheet__opts"></ul>
          <div class="dsheet__foot">
            <span class="dsheet__price"></span>
            <a class="btn btn--primary dsheet__call" href="tel:+4936836098662"><svg><use href="#i-phone"/></svg>Bestellen</a>
          </div>
          <p class="dsheet__note"></p>
        </div>
        <div class="dsheet__nav">
          <button type="button" data-step="-1" aria-label="Vorheriges Gericht">‹</button>
          <span class="dsheet__count"></span>
          <button type="button" data-step="1" aria-label="Nächstes Gericht">›</button>
        </div>
      </div>
      <img class="dsheet__fly" alt="" aria-hidden="true">`;
    document.body.append(box);
    const card = $('.dsheet__card', box), photo = $('.dsheet__photo', box), img = $('.dsheet__photo img', box), fly = $('.dsheet__fly', box);
    let list = [], idx = 0, opener = null;

    const fill = li => {
      const t = $('.dish__thumb', li);
      img.src = t.dataset.zoom;
      $('.dsheet__name', box).textContent = $('.dish__name', li).textContent;
      $('.dsheet__cat', box).textContent = li.closest('.cat')?.querySelector('.title-frame__box')?.firstChild?.textContent.trim() || '';
      $('.dsheet__tags', box).innerHTML = [...li.querySelectorAll('.dish__head .tag')].map(x => x.outerHTML).join('');
      const d = $('.dish__desc', li);
      $('.dsheet__desc', box).innerHTML = d ? d.innerHTML : '';
      const o = $('.dish__options', li);
      $('.dsheet__opts', box).innerHTML = o ? o.innerHTML : '';
      const pr = $(':scope > .dish__price', li)?.textContent.trim();
      $('.dsheet__price', box).textContent = pr || (o ? 'ab ' + [...o.querySelectorAll('.dish__price')].map(x => x.textContent.trim()).sort((a, b) => parseFloat(a.replace(',', '.')) - parseFloat(b.replace(',', '.')))[0] : '');
      $('.dsheet__note', box).textContent = (t.dataset.cap || '').includes('Symbolbild') ? 'Symbolbild – Serviervorschlag' : '';
      $('.dsheet__count', box).textContent = `${idx + 1} / ${list.length}`;
      box.classList.remove('is-shown'); void card.offsetWidth; box.classList.add('is-shown');
    };

    // FLIP: animate a copy of the image between two rects
    const flyBetween = (from, to, src, done) => {
      if (reduceMotion || !from || !to) return done && done();
      fly.src = src;
      Object.assign(fly.style, { left: to.left + 'px', top: to.top + 'px', width: to.width + 'px', height: to.height + 'px', opacity: 1 });
      const sx = from.width / to.width, sy = from.height / to.height;
      fly.style.transition = 'none';
      fly.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${sx}, ${sy})`;
      void fly.offsetWidth;
      fly.style.transition = 'transform .62s cubic-bezier(.16,1,.3,1)';
      fly.style.transform = 'none';
      setTimeout(() => { fly.style.opacity = 0; done && done(); }, 620);
    };

    const open = t => {
      opener = t;
      const li = t.closest('.dish');
      list = [...li.closest('.menu-list').querySelectorAll('.dish--img')];
      idx = list.indexOf(li);
      fill(li);
      box.classList.add('is-open', 'is-flying');
      document.documentElement.classList.add('dsheet-lock');
      requestAnimationFrame(() => flyBetween(t.getBoundingClientRect(), photo.getBoundingClientRect(), t.dataset.zoom, () => box.classList.remove('is-flying')));
      $('.dsheet__close', box).focus({ preventScroll: true });
    };
    const close = () => {
      if (!box.classList.contains('is-open')) return;
      const thumb = list[idx] && $('.dish__thumb', list[idx]);
      const from = photo.getBoundingClientRect();
      box.classList.add('is-closing');
      if (thumb && !reduceMotion) {
        fly.src = img.src;
        const to = thumb.getBoundingClientRect();
        Object.assign(fly.style, { transition: 'none', transform: 'none', left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px', opacity: 1 });
        box.classList.add('is-flying');
        void fly.offsetWidth;
        fly.style.transition = 'transform .5s cubic-bezier(.65,0,.35,1), opacity .2s .4s';
        fly.style.transform = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}, ${to.height / from.height})`;
        fly.style.opacity = 0;
      }
      setTimeout(() => {
        box.classList.remove('is-open', 'is-closing', 'is-flying', 'is-shown');
        document.documentElement.classList.remove('dsheet-lock');
        (thumb || opener)?.focus({ preventScroll: true });
      }, reduceMotion ? 0 : 480);
    };
    const step = dir => {
      if (list.length < 2) return;
      idx = (idx + dir + list.length) % list.length;
      card.dataset.dir = dir > 0 ? 'next' : 'prev';
      fill(list[idx]);
    };

    document.addEventListener('click', e => {
      const t = e.target.closest('[data-zoom]');
      if (t) { e.preventDefault(); open(t); return; }
      if (!box.classList.contains('is-open')) return;
      if (e.target === box || e.target.closest('.dsheet__close')) close();
      const st = e.target.closest('[data-step]');
      if (st) step(+st.dataset.step);
    });
    addEventListener('keydown', e => {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    });
    // swipe left/right to browse, swipe down to close
    let sx = 0, sy = 0;
    card.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    card.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
      else if (dy > 90 && card.scrollTop <= 0) close();
    }, { passive: true });
  }

  /* ---------- Koi pond ripples ---------- */
  const pond = $('#pond');
  if (pond && !reduceMotion) {
    const ripple = (x, y) => {
      const r = document.createElement('span');
      r.className = 'ripple';
      r.style.left = `${x}px`; r.style.top = `${y}px`;
      pond.appendChild(r);
      r.addEventListener('animationend', () => r.remove());
    };
    const footer = pond.parentElement;
    let last = 0;
    footer.addEventListener('pointerdown', e => {
      const b = pond.getBoundingClientRect(); ripple(e.clientX - b.left, e.clientY - b.top);
    });
    if (finePointer) footer.addEventListener('pointermove', e => {
      if (performance.now() - last < 140) return;
      last = performance.now();
      const b = pond.getBoundingClientRect(); ripple(e.clientX - b.left, e.clientY - b.top);
    });
  }
})();
