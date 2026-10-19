/* Do Sushi Haus – QR-Speisekarte: "Lazy Susan" category turntable */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const txt = el => el ? el.textContent.trim() : '';

  // Plate photo per category (falls back to the first dish photo)
  const COVER = {
    vorspeisen: 'assets/img/wakame.webp', bowl: 'assets/img/bowl.webp', 'hoso-maki': 'assets/img/maki.webp',
    nigiri: 'assets/img/nigiri.webp', sashimi: 'assets/img/sashimi.webp', 'ura-maki': 'assets/img/uramaki.webp',
    crunchy: 'assets/img/crunchy.webp', signature: 'assets/img/dragon-sq.webp',
    'asia-vorspeise': 'assets/img/fruehlingsrollen.webp', hauptgerichte: 'assets/img/pho.webp', wok: 'assets/img/wok.webp',
  };
  const WORLD = { sushi: { label: 'Sushi', color: '#d4a72c' }, asia: { label: 'Asia', color: '#e07a2e' } };

  /* ---------- Parse menu data from the <template> ---------- */
  const src = $('#menuData').content;
  const cats = $$('section.cat', src).map(sec => {
    const box = $('.title-frame__box', sec);
    const dishes = $$('li.dish', sec).map(li => ({
      code: txt($('.dish__code', li)).replace(/\.$/, ''),
      name: txt($('.dish__name', li)),
      tags: $$('.dish__head .tag', li).map(t => ({ text: txt(t), cls: t.className })),
      price: txt($(':scope > .dish__price', li)),
      desc: $('.dish__desc', li)?.innerHTML.trim() || '',
      opts: $$('.dish__options li', li).map(o => ({ name: txt(o.firstElementChild), price: txt($('.dish__price', o)) })),
      img: $('.dish__thumb', li)?.dataset.zoom || '',
    }));
    const sets = $$('article.set-card', sec).map(a => ({
      label: txt($('.label', a)), name: txt($('.set-card__name', a)), price: txt($('.set-card__price', a)),
      items: $$('ul li', a).map(txt), img: $('.set-card__img', a)?.getAttribute('src') || '',
      seal: $('.seal', a)?.innerHTML || '',
    }));
    const items = sets.length ? sets : dishes;
    return {
      id: sec.id, world: sec.dataset.world || 'sushi',
      title: txt(box.firstChild), sub: txt($('.title-frame__sub', box)), desc: txt($('.title-frame__desc', sec)),
      sets: !!sets.length, items,
      cover: COVER[sec.id] || items.find(i => i.img)?.img || '',
    };
  });
  // Sushi-Menüs are the headline offer: shown as a featured strip, not on the turntable
  const setCat = cats.find(c => c.sets);
  cats.splice(cats.indexOf(setCat), 1);
  const N = cats.length, STEP = 360 / N;

  /* ---------- Featured Sushi-Menüs ---------- */
  const qsets = $('#qsets');
  if (setCat) {
    const sets = setCat.items;
    const star = sets.findIndex(d => d.seal);
    qsets.innerHTML =
      `<div class="qsets__head"><p class="qsets__eyebrow">Unsere Empfehlung</p>` +
      `<h2 class="qsets__title" id="qsetsTitle">Sushi <em>Menüs</em></h2>` +
      `<p class="qsets__sub">${esc(setCat.desc || setCat.sub)}</p></div>` +
      `<div class="qsets__track" id="qsetsTrack">${sets.map((d, k) =>
        `<button class="qset${k === star ? ' qset--star' : ''}" type="button" data-set="${k}">` +
        (d.img ? `<img src="${esc(d.img)}" alt="" ${k > 1 ? 'loading="lazy"' : ''}>` : '') +
        `<span class="qset__no" aria-hidden="true">${String(k + 1).padStart(2, '0')}</span>` +
        (d.seal ? `<span class="qs__seal">${d.seal}</span>` : '') +
        `<span class="qset__body"><span class="qset__label">${esc(d.label)}</span>` +
        `<span class="qset__row"><span class="qset__name">${esc(d.name)}</span><span class="qset__price">${esc(d.price)}</span></span>` +
        `<ul class="qset__list">${d.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></span></button>`).join('')}</div>` +
      `<div class="qsets__nav"><button type="button" data-sets="-1" aria-label="Vorheriges Menü">‹</button><button type="button" data-sets="1" aria-label="Nächstes Menü">›</button></div>` +
      `<div class="qsets__dots" aria-hidden="true">${sets.map(() => '<span></span>').join('')}</div>`;
    const track = $('#qsetsTrack'), dots = $$('.qsets__dots span', qsets), cards = $$('.qset', track);
    const syncDots = () => {
      const mid = track.scrollLeft + track.clientWidth / 2;
      let best = 0, bd = Infinity;
      cards.forEach((c, k) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = k; } });
      dots.forEach((d, k) => d.classList.toggle('is-on', k === best));
    };
    track.addEventListener('scroll', () => requestAnimationFrame(syncDots), { passive: true });
    syncDots();
    // arrows + mouse drag for desktop
    const cardStep = () => (cards[1]?.offsetLeft ?? 0) - cards[0].offsetLeft;
    qsets.addEventListener('click', e => {
      const b = e.target.closest('[data-sets]');
      if (b) track.scrollBy({ left: +b.dataset.sets * cardStep(), behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    let md = null;
    track.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button === 0) md = { x: e.clientX, l: track.scrollLeft, moved: false }; });
    addEventListener('pointermove', e => {
      if (!md) return;
      const dx = e.clientX - md.x;
      if (!md.moved && Math.abs(dx) > 5) { md.moved = true; track.classList.add('is-drag'); }
      if (md.moved) track.scrollLeft = md.l - dx;
    });
    addEventListener('pointerup', () => {
      if (!md) return;
      const moved = md.moved; md = null; setTimeout(() => track.classList.remove('is-drag'), 0);
      if (moved) { // snap to the nearest card
        const k = Math.round((track.scrollLeft) / cardStep());
        track.scrollTo({ left: k * cardStep(), behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    });
  }


  /* ---------- Build the turntable ---------- */
  const stage = $('#lzStage'), wheel = $('#lzWheel'), disc = $('#lzDisc');
  wheel.insertAdjacentHTML('beforeend', cats.map((c, i) =>
    `<button class="lz__plate" type="button" style="--a:${i * STEP}deg;--wc:${WORLD[c.world].color}" data-i="${i}" aria-label="${esc(c.title)}">` +
    `<span class="lz__dish"><img src="${esc(c.cover)}" alt="" ${i > 2 && i < N - 2 ? 'loading="lazy"' : ''} draggable="false"></span>` +
    `<span class="lz__name">${esc(c.title)}</span></button>`).join(''));
  const plates = $$('.lz__plate', wheel);

  // Rim coloured per world: gold for Sushi, lantern orange for Asia
  disc.style.setProperty('--rim', `conic-gradient(from ${-STEP / 2}deg, ${cats.map((c, i) =>
    `${WORLD[c.world].color} ${i * STEP}deg ${(i + 1) * STEP - .6}deg, #111 ${(i + 1) * STEP - .6}deg ${(i + 1) * STEP}deg`).join(', ')})`);

  /* ---------- State ---------- */
  let angle = 0;          // continuous wheel angle (deg); index = angle / STEP
  let cur = -1;
  const mod = i => ((i % N) + N) % N;
  const setAngle = a => { angle = a; wheel.style.transform = `rotate(${-a}deg)`; };
  const markActive = i => plates.forEach((p, k) => p.classList.toggle('is-active', k === i));

  const info = $('#lzInfo'), list = $('#qlist'), next = $('#qnext');

  function renderInfo(c, i) {
    const w = WORLD[c.world];
    const count = c.items.length;
    info.style.setProperty('--wc', w.color);
    info.innerHTML =
      `<p class="lz__world">${w.label} · ${i + 1}/${N}</p>` +
      `<h1 class="lz__title">${esc(c.title)}</h1>` +
      `<p class="lz__meta">${[c.sub, `${count} ${c.sets ? (count === 1 ? 'Menü' : 'Menüs') : (count === 1 ? 'Gericht' : 'Gerichte')}`].filter(Boolean).map(esc).join(' · ')}</p>` +
      (c.desc ? `<p class="lz__desc">${esc(c.desc)}</p>` : '');
  }

  const tags = d => d.tags.map(t => `<span class="${esc(t.cls)}">${esc(t.text)}</span>`).join('');
  const opts = d => d.opts.length ? `<ul class="qd__opts">${d.opts.map(o => `<li><span>${esc(o.name)}</span><span class="lead"></span><span class="p">${esc(o.price)}</span></li>`).join('')}</ul>` : '';

  function renderList(c, dir) {
    list.style.setProperty('--dir', dir);
    list.innerHTML = c.items.map((d, k) => c.sets
      ? `<li class="qs" style="--i:${k}"><button class="qs__btn" type="button" data-k="${k}">` +
          (d.img ? `<span class="qs__img"><img src="${esc(d.img)}" alt="" loading="lazy"></span>` : '') +
          (d.seal ? `<span class="qs__seal">${d.seal}</span>` : '') +
          `<span class="qs__body"><span class="qs__label">${esc(d.label)}</span><span class="qs__name">${esc(d.name)}</span><span class="qs__price">${esc(d.price)}</span>` +
          `<ul class="qs__list">${d.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></span></button></li>`
      : `<li class="qd" style="--i:${k}"><button class="qd__btn" type="button" data-k="${k}">` +
          `<span class="qd__img">${d.img ? `<img src="${esc(d.img)}" alt="" loading="lazy" width="84" height="84">` : ''}</span>` +
          `<span class="qd__body"><span class="qd__top"><span class="qd__code">${esc(d.code)}</span>${tags(d)}</span>` +
          `<span class="qd__name">${esc(d.name)}</span>${d.desc ? `<span class="qd__desc">${d.desc}</span>` : ''}</span>` +
          `<span class="qd__price">${esc(d.price)}</span></button>${opts(d)}</li>`
    ).join('');

    const n = cats[mod(cur + 1)];
    next.innerHTML = `<button type="button" data-step="1"><img src="${esc(n.cover)}" alt="" loading="lazy"><span><small>Weiterdrehen</small><strong>${esc(n.title)}</strong></span><span>›</span></button>`;
  }

  function go(i, { dir = 0, scroll = false, fromDrag = false } = {}) {
    const target = mod(i);
    // rotate along the shortest way from the current continuous angle
    let delta = target - mod(Math.round(angle / STEP));
    if (delta > N / 2) delta -= N;
    if (delta < -N / 2) delta += N;
    const snapped = Math.round(angle / STEP) * STEP + delta * STEP;
    if (!fromDrag || snapped !== angle) setAngle(snapped);
    if (target === cur) return;
    const d = dir || Math.sign(delta) || 1;
    cur = target;
    const c = cats[cur];
    markActive(cur);
    renderInfo(c, cur);
    renderList(c, d);
    history.replaceState(null, '', '#' + c.id);
    $('#lzPillImg').src = c.cover;
    $('#lzPillName').textContent = c.title;
    if (scroll) {
      lockDock();
      const y = info.getBoundingClientRect().top + scrollY;
      if (Math.abs(scrollY - y) > 4) scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }
  const step = s => go(cur + s, { dir: s, scroll: true });

  /* ---------- Drag / swipe the turntable ---------- */
  let drag = null;
  stage.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, a: angle, moved: false, t: performance.now(), v: 0, lx: e.clientX };
  });
  addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < 6) return;
      if (Math.abs(e.clientY - drag.y) > Math.abs(dx)) { drag = null; return; } // vertical scroll wins
      drag.moved = true; stage.classList.add('is-drag'); stage.setPointerCapture?.(e.pointerId);
    }
    const now = performance.now();
    drag.v = (e.clientX - drag.lx) / Math.max(1, now - drag.t); drag.lx = e.clientX; drag.t = now;
    const R = wheel.offsetTop - (parseFloat(getComputedStyle(document.body).getPropertyValue('--lz-top')) || 50);
    setAngle(drag.a - (dx / R) * (180 / Math.PI));
    markActive(mod(Math.round(angle / STEP)));
  });
  const endDrag = () => {
    if (!drag) return;
    const d = drag; drag = null; stage.classList.remove('is-drag');
    if (!d.moved) return;
    // flick: carry momentum by up to two plates
    const fling = Math.max(-2, Math.min(2, Math.round(-d.v * 2.2)));
    const target = Math.round(angle / STEP) + fling;
    const dir = Math.sign(target * STEP - d.a) || 1;
    setAngle(target * STEP);
    go(target, { dir, fromDrag: true, scroll: true });
    stage.dataset.justDragged = '1';
    setTimeout(() => delete stage.dataset.justDragged, 50);
  };
  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', endDrag);

  wheel.addEventListener('click', e => {
    const p = e.target.closest('.lz__plate');
    if (!p || stage.dataset.justDragged) return;
   
    go(+p.dataset.i, { scroll: true });
  });
  stage.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-step]');
    if (b) step(+b.dataset.step);
  });

  // Swipe sideways on the dish list to turn the table too
  let sw = null;
  list.addEventListener('touchstart', e => { const t = e.touches[0]; sw = { x: t.clientX, y: t.clientY }; }, { passive: true });
  list.addEventListener('touchend', e => {
    if (!sw) return;
    const t = e.changedTouches[0], dx = t.clientX - sw.x, dy = t.clientY - sw.y; sw = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) step(dx < 0 ? 1 : -1);
  }, { passive: true });

  /* ---------- Dock: collapse while reading down, expand on scroll up ---------- */
  const lz = $('#lz');
  let lastY = scrollY, lockUntil = 0;
  addEventListener('scroll', () => {
    const y = scrollY, now = performance.now();
    if (now < lockUntil) { lastY = y; return; }   // ignore our own auto-scroll after a turn
    if (y > lastY + 6 && y > 160) lz.classList.add('is-min');
    else if (y < lastY - 10 || y < 160) lz.classList.remove('is-min');
    lastY = y;
  }, { passive: true });
  $('#lzPill').addEventListener('click', () => lz.classList.remove('is-min'));
  const lockDock = () => { lockUntil = performance.now() + 900; lz.classList.remove('is-min'); };

  /* ---------- Detail sheet ---------- */
  const sheet = $('#qsheet'), sheetBody = $('#qsheetBody');
  let lastFocus = null;
  const openSheet = e => {
    if (e.target.closest('.qsets__track.is-drag')) return;
    const b = e.target.closest('[data-k], [data-set]');
    if (!b) return;
    const c = b.dataset.set ? setCat : cats[cur], d = c.items[+(b.dataset.set ?? b.dataset.k)];
    sheetBody.innerHTML = c.sets
      ? `<div class="qsheet__hero qsheet__hero--wide">${d.img ? `<img src="${esc(d.img)}" alt="${esc(d.name)}">` : ''}</div>` +
        `<div class="qsheet__text"><p class="qs__label">${esc(d.label)}</p><h2 id="qsheetName">${esc(d.name)}</h2>` +
        `<ul class="qs__list">${d.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="qsheet__price">${esc(d.price)}</p></div>`
      : `<div class="qsheet__hero">${d.img ? `<img src="${esc(d.img)}" alt="${esc(d.name)}">` : ''}</div>` +
        `<div class="qsheet__text"><div class="qd__top"><span class="qd__code">${esc(c.title)} · ${esc(d.code)}</span>${tags(d)}</div>` +
        `<h2 id="qsheetName">${esc(d.name)}</h2>${d.desc ? `<p>${d.desc}</p>` : ''}${opts(d)}` +
        (d.price ? `<p class="qsheet__price">${esc(d.price)}</p>` : '') + `</div>`;
    lastFocus = b;
    sheet.hidden = false; sheet.classList.remove('is-closing');
    document.documentElement.style.overflow = 'hidden';
    $('.qsheet__close', sheet).focus();
  };
  list.addEventListener('click', openSheet);
  qsets.addEventListener('click', openSheet);
  const closeSheet = () => {
    if (sheet.hidden || sheet.classList.contains('is-closing')) return;
    sheet.classList.add('is-closing');
    setTimeout(() => { sheet.hidden = true; document.documentElement.style.overflow = ''; lastFocus?.focus({ preventScroll: true }); }, reduceMotion ? 0 : 280);
  };
  sheet.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeSheet(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
  // swipe the sheet down to close
  let sy = null;
  sheet.addEventListener('touchstart', e => { if ($('.qsheet__panel', sheet).scrollTop <= 0) sy = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener('touchend', e => { if (sy !== null && e.changedTouches[0].clientY - sy > 90) closeSheet(); sy = null; }, { passive: true });

  /* ---------- Start ---------- */
  stage.tabIndex = 0;
  const start = Math.max(0, cats.findIndex(c => '#' + c.id === location.hash));
  wheel.style.transition = 'none';
  setAngle(start * STEP);
  go(start, { dir: 1 });
  requestAnimationFrame(() => requestAnimationFrame(() => { wheel.style.transition = ''; }));
  // a small welcome spin so guests see the table turns
  if (!reduceMotion && !location.hash) {
    setTimeout(() => setAngle(-STEP * .35), 500);
    setTimeout(() => { if (!drag && cur === 0) setAngle(0); }, 1150);
  }
})();
