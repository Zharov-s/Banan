/* Досье миньона. Адаптация «Course card to course page transition, with the lessons coming out of the counter»
   из Animorio (animorio.com, лицензия: animorio.com/en/license): отсек подъёмника становится страницей -
   светлый лист вырастает из отсека на весь экран, миньон, имя и оба показателя летят на свои места по лёгкой дуге,
   а строки журнала выкатываются из-под счётчиков. Назад - всё сворачивается, и платформа приземляется с бликом. */
import { formatMoney, formatPercent, plural } from '../data/compute.js';
import { minionSvg, armPose, drawArms } from '../art/minion.js';
import { BANANA, ICON_BACK } from '../art/props.js';

const gsap = window.gsap;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const OPEN_TIME = 0.9;
const CLOSE_TIME = 0.75;
const ARC = 0.55;
const ROW_STAGGER = 0.07;
const OTHERS_DROP = 18;
const SETTLE = 3;
const MAX_SLOTS = 60;
const CLEAR = 'x,y,scale,scaleX,scaleY,opacity,visibility,color,clipPath,transform,xPercent,--rule';

const $ = (s, r) => r.querySelector(s);
const $$ = (s, r) => [...r.querySelectorAll(s)];
const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};

export function createDetail({ root, app, scene, life, sound, onClose }) {
  const sheet = $('[data-sheet]', root);
  const hero = $('[data-hero]', root);
  const sheen = $('[data-sheen]', root);
  const back = $('[data-back]', root);
  const scroll = $('[data-scroll]', root);
  const D = Object.fromEntries($$('[data-d]', root).map((n) => [n.dataset.d, n]));
  const ins = [...$$('[data-in]', root), ...$$('.detail__ring, .detail__pad', root)];
  const lists = { days: $('[data-rows="days"]', root), mods: $('[data-rows="mods"]', root) };
  const top = $('[data-top]', app);
  back.innerHTML = ICON_BACK;

  let current = null;
  let busy = false;
  let tl = null;
  let detachLife = null;
  let standings = null;

  const rect = (node) => {
    const r = node.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  };
  const inset = (r) => `inset(${r.y}px ${innerWidth - r.x - r.w}px ${innerHeight - r.y - r.h}px ${r.x}px round 14px)`;
  const FULL = 'inset(0px 0px 0px 0px round 0px)';

  /* дуга полёта: x идёт плавно, y чуть опережает (на обратном пути отстаёт) */
  const inOut = gsap.parseEase('power3.inOut');
  const lead = gsap.parseEase('power3.out');
  const yOut = (t) => inOut(t) * (1 - ARC) + lead(t) * ARC;
  const yBack = (t) => 1 - yOut(1 - t);

  /* ---- содержимое ---- */
  function row(cells) {
    const li = el('li', 'rows__item');
    cells.forEach((c, i) => li.append(el('span', `rows__c${i}`, c)));
    return li;
  }

  function fill(m) {
    root.style.setProperty('--accent', m.accent);
    D.minion.innerHTML = minionSvg(m, `d-${m.id}`);
    const svg = D.minion.firstElementChild;
    const src = scene.getBay(m.id);
    const holds = m.check !== null;
    drawArms(svg, m.look, armPose(m.look, holds ? 'hold' : 'down'));
    const asleep = m.share === null && m.check === null;
    gsap.set($$('.m-lid', svg), { scaleY: asleep ? 0.52 : 0, transformOrigin: '50% 0%' });
    gsap.set($('.m-nana-s', svg), { scale: holds ? src.shown.scale : 0.4, opacity: holds ? 1 : 0, svgOrigin: '0 0' });
    gsap.set($('.m-crown-s', svg), { opacity: src.shown.shareLead ? 1 : 0 });
    svg.classList.toggle('is-gold', src.shown.checkLead);
    svg.classList.toggle('is-asleep', asleep);
    svg.dataset.mood = src.svg.dataset.mood;
    detachLife?.();
    detachLife = life.attach(svg, () => asleep);

    D.last.textContent = m.last;
    D.first.textContent = m.first;
    $('[data-team]', root).textContent = m.team;

    const placeOf = (place, isLeader) => (place === null ? '' : isLeader ? 'лидер' : `${place} место`);
    $('[data-place="share"]', root).textContent = placeOf(m.sharePlace, standings.shareLeaders.includes(m.id));
    $('[data-place="check"]', root).textContent = placeOf(m.checkPlace, standings.checkLeaders.includes(m.id));

    D.share.textContent = formatPercent(m.share);
    D.renewals.textContent = m.renewals > 0
      ? `${m.upsells} из ${m.renewals} ${plural(m.renewals, 'продления', 'продлений', 'продлений')} с допродажей`
      : 'Продлений пока нет';

    const slots = $('[data-slots]', root);
    slots.textContent = '';
    if (m.renewals > 0 && m.renewals <= MAX_SLOTS) {
      for (let i = 0; i < m.renewals; i++) {
        const s = el('span', i < m.upsells ? 'slot slot--full' : 'slot');
        if (i < m.upsells) s.innerHTML = BANANA;
        slots.append(s);
      }
    } else if (m.renewals > MAX_SLOTS) {
      const bar = el('span', 'slots__bar');
      bar.style.setProperty('--p', m.share);
      slots.append(bar);
    }

    const issue = $('[data-issue]', root);
    issue.hidden = m.issues.length === 0;
    issue.textContent = m.issues.join('; ');

    lists.days.textContent = '';
    m.days.forEach((d) => lists.days.append(row([d.date, d.what || '-', `${d.upsells} из ${d.renewals}`])));

    D.check.textContent = formatMoney(m.check);
    D.mods.textContent = m.mods.length > 0
      ? `${m.mods.length} ${plural(m.mods.length, 'модификатор', 'модификатора', 'модификаторов')} на ${formatMoney(m.modSum)}`
      : 'Модификаторов пока нет';
    lists.mods.textContent = '';
    m.mods.forEach((d) => lists.mods.append(row([d.date, d.what || '-', formatMoney(d.sum)])));
  }

  /* ---- общие части перехода ---- */
  /* откуда и куда летит каждая часть: [часть досье, часть отсека, есть ли она на сцене] */
  function pieces(bay) {
    return [
      { d: D.minion, s: bay.svg, text: false, on: true },
      { d: D.last, s: bay.last, text: true, on: true },
      { d: D.first, s: bay.first, text: true, on: true },
      { d: D.share, s: bay.deckText, text: true, on: bay.shown.share !== null },
      { d: D.check, s: bay.price, text: true, on: bay.shown.check !== null },
    ];
  }

  /* сдвиг и масштаб, при которых часть досье совпадает со своей частью в отсеке */
  function offset(p) {
    const s = rect(p.s);
    const d = rect(p.d);
    const sc = p.text
      ? parseFloat(getComputedStyle(p.s).fontSize) / parseFloat(getComputedStyle(p.d).fontSize)
      : s.w / d.w;
    return { x: s.x + s.w / 2 - d.x - (d.w * sc) / 2, y: s.y + s.h / 2 - d.y - (d.h * sc) / 2, scale: sc };
  }

  const rowsOf = (list) => $$('.rows__item', list);
  const counters = () => [[lists.days, D.renewals], [lists.mods, D.mods]];
  const others = (bay) => scene.bays.filter((b) => b !== bay);

  function rollState(item, counter, list) {
    const r = rect(item);
    const c = rect(counter);
    gsap.set(item, { transformOrigin: `${c.x + c.w / 2 - r.x}px 0px` });
    return { y: rect(list).y - r.y - r.h * 0.6, scaleX: 0.12, scaleY: 0.5, opacity: 0, '--rule': 0 };
  }

  function open(id) {
    if (busy || current) return;
    const bay = scene.getBay(id);
    if (!bay?.data) return;
    busy = true;
    current = bay;
    fill(bay.data);
    scroll.scrollTop = 0;
    gsap.set([sheet, hero, sheen, back, ...ins, ...pieces(bay).map((p) => p.d)], { clearProps: CLEAR });
    root.classList.add('is-moving');
    root.setAttribute('aria-hidden', 'false');
    sound.play('open');

    if (REDUCED) {
      gsap.set(root, { autoAlpha: 0 });
      tl = gsap.timeline({ onComplete: opened }).to(root, { autoAlpha: 1, duration: 0.3 });
      return;
    }

    const T = OPEN_TIME;
    const srcBay = rect(bay.el);
    const srcWall = rect(bay.wall);
    const dstHero = rect(hero);
    tl = gsap.timeline({ onComplete: opened });

    /* лист вырастает из отсека, стена отсека становится шапкой досье */
    tl.fromTo(sheet, { clipPath: inset(srcBay) }, { clipPath: FULL, duration: T, ease: 'power4.inOut' }, 0);
    tl.fromTo(hero, { x: srcWall.x - dstHero.x, y: srcWall.y - dstHero.y, scaleX: srcWall.w / dstHero.w, scaleY: srcWall.h / dstHero.h, transformOrigin: '0 0' },
      { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: T, ease: 'power4.inOut' }, 0);
    tl.fromTo(hero, { opacity: 0 }, { opacity: 1, duration: T * 0.25, ease: 'power1.out' }, 0);

    /* миньон, имя и показатели летят на свои места, каждый чуть позже предыдущего */
    pieces(bay).forEach((p, n) => {
      if (!p.on) {
        tl.fromTo(p.d, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, T * 0.6);
        return;
      }
      const o = offset(p);
      const at = 0.03 + n * 0.025;
      const dur = T * 0.92;
      gsap.set(p.d, { transformOrigin: '0 0' });
      tl.fromTo(p.d, { x: o.x, scale: o.scale }, { x: 0, scale: 1, duration: dur, ease: 'power3.inOut' }, at);
      tl.fromTo(p.d, { y: o.y }, { y: 0, duration: dur, ease: yOut }, at);
      if (p.text) tl.fromTo(p.d, { color: '#ffffff' }, { color: getComputedStyle(p.d).color, duration: dur * 0.7, ease: 'power1.inOut' }, at + dur * 0.15);
    });
    gsap.set(bay.el, { visibility: 'hidden' });

    /* остальные отсеки и шапка отступают */
    others(bay).forEach((o) => {
      const gap = Math.abs(scene.bays.indexOf(o) - scene.bays.indexOf(bay));
      tl.to(o.el, { y: OTHERS_DROP, opacity: 0, duration: T * 0.5, ease: 'power2.in' }, gap * 0.035);
    });
    tl.to(top, { y: -8, opacity: 0, duration: T * 0.4, ease: 'power2.in' }, 0);

    /* остальное содержимое встаёт на место */
    tl.fromTo(ins, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.035 }, T * 0.55);
    tl.fromTo(back, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2.2)' }, T * 0.6);

    /* строки журнала выкатываются из-под счётчиков, счётчик кивает */
    counters().forEach(([list, counter]) => {
      const items = rowsOf(list);
      items.forEach((item, n) => {
        tl.fromTo(item, rollState(item, counter, list),
          { y: 0, scaleX: 1, scaleY: 1, opacity: 1, '--rule': 1, duration: 0.7, ease: 'expo.out', onStart: () => sound.play('row') }, T * 0.72 + n * ROW_STAGGER);
      });
      if (items.length) tl.fromTo(counter, { scale: 1 }, { keyframes: [{ scale: 1.06, duration: 0.14, ease: 'power2.out' }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.45)' }] }, T * 0.7);
    });

    tl.fromTo(sheen, { xPercent: -120, opacity: 1 }, { xPercent: 120, duration: 1.1, ease: 'power2.inOut' }, T * 0.7);
  }

  function opened() {
    busy = false;
    tl = null;
    root.classList.add('is-open');
    root.classList.remove('is-moving');
    app.inert = true;
    gsap.set([sheet, hero, ...pieces(current).map((p) => p.d), ...$$('.rows__item', root)], { clearProps: CLEAR });
    gsap.set(sheen, { opacity: 0 });
    back.focus({ preventScroll: true });
  }

  function close() {
    if (busy || !current) return;
    busy = true;
    const bay = current;
    app.inert = false;
    scroll.scrollTop = 0;
    root.classList.add('is-moving');
    root.classList.remove('is-open');
    sound.play('close');

    if (REDUCED) {
      gsap.set([bay.el, top, ...others(bay).map((o) => o.el)], { clearProps: 'y,opacity,visibility' });
      tl = gsap.timeline({ onComplete: closed }).to(root, { autoAlpha: 0, duration: 0.3 });
      return;
    }

    const T = CLOSE_TIME;
    const go = 0.2;
    const srcBay = rect(bay.el);
    const srcWall = rect(bay.wall);
    const dstHero = rect(hero);
    tl = gsap.timeline({ onComplete: closed });

    /* строки закатываются обратно под счётчики, последняя первой */
    counters().forEach(([list, counter]) => {
      rowsOf(list).reverse().forEach((item, n) => {
        tl.to(item, { ...rollState(item, counter, list), duration: 0.32, ease: 'power3.in' }, n * ROW_STAGGER * 0.45);
      });
    });
    tl.to(ins, { opacity: 0, y: 6, duration: 0.22, ease: 'power2.in', stagger: { each: 0.015, from: 'end' } }, 0);
    tl.to(back, { opacity: 0, scale: 0.7, duration: 0.2, ease: 'power2.in' }, 0);

    tl.to(sheet, { clipPath: inset(srcBay), duration: T, ease: 'power4.inOut' }, go);
    tl.set(sheet, { clipPath: FULL }, 0);
    tl.to(hero, { x: srcWall.x - dstHero.x, y: srcWall.y - dstHero.y, scaleX: srcWall.w / dstHero.w, scaleY: srcWall.h / dstHero.h, transformOrigin: '0 0', duration: T, ease: 'power4.inOut' }, go);
    tl.to(hero, { opacity: 0, duration: T * 0.25, ease: 'power1.in' }, go + T * 0.75);

    pieces(bay).slice().reverse().forEach((p, n) => {
      if (!p.on) { tl.to(p.d, { opacity: 0, duration: 0.2, ease: 'power2.in' }, 0); return; }
      const o = offset(p);
      const at = go + 0.02 + n * 0.02;
      const dur = T * 0.92;
      gsap.set(p.d, { transformOrigin: '0 0' });
      tl.to(p.d, { x: o.x, scale: o.scale, duration: dur, ease: 'power3.inOut' }, at);
      tl.to(p.d, { y: o.y, duration: dur, ease: yBack }, at);
      if (p.text) tl.to(p.d, { color: '#ffffff', duration: dur * 0.6, ease: 'power1.inOut' }, at + dur * 0.3);
    });

    /* сцена возвращается: шапка, затем остальные отсеки с небольшим перелётом */
    tl.to(top, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, go + T * 0.5);
    others(bay).forEach((o) => {
      const gap = Math.abs(scene.bays.indexOf(o) - scene.bays.indexOf(bay));
      tl.to(o.el, { y: 0, opacity: 1, duration: 0.7, ease: 'back.out(1.6)' }, go + T * 0.45 + gap * 0.05);
    });

    /* отсек принимает миньона: платформа проседает и пружинит, по ней пробегает блик */
    tl.add(() => {
      gsap.set(bay.el, { visibility: 'visible' });
      root.classList.remove('is-moving');
      sound.play('land');
      gsap.fromTo(bay.rider, { y: 0 }, { keyframes: [{ y: SETTLE, duration: 0.09, ease: 'power2.out' }, { y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' }] });
      gsap.fromTo(bay.deck.querySelector('.lift__sheen'), { opacity: 1, xPercent: -100 },
        { xPercent: 100, duration: 0.9, ease: 'power2.inOut', onComplete() { gsap.set(this.targets(), { opacity: 0 }); } });
    }, go + T);
  }

  function closed() {
    const bay = current;
    busy = false;
    current = null;
    tl = null;
    root.classList.remove('is-moving', 'is-open');
    root.setAttribute('aria-hidden', 'true');
    gsap.set([sheet, hero, back, root, ...ins, ...Object.values(D)], { clearProps: CLEAR });
    gsap.set([top, ...scene.bays.map((b) => b.el)], { clearProps: 'y,opacity,visibility' });
    detachLife?.();
    detachLife = null;
    bay.el.focus({ preventScroll: true });
    onClose();
  }

  back.addEventListener('click', close);
  back.addEventListener('pointerdown', () => { if (!REDUCED) gsap.to(back, { scale: 0.9, duration: 0.14, ease: 'power2.out', overwrite: 'auto' }); });
  const release = () => { if (!REDUCED && !busy) gsap.to(back, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.45)', overwrite: 'auto' }); };
  back.addEventListener('pointerup', release);
  back.addEventListener('pointerleave', release);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  /* окно меняет размер: завершаем движение, CSS расставит всё по новым местам */
  addEventListener('resize', () => { if (tl) tl.progress(1); });

  return {
    open,
    close,
    isOpen: () => current !== null,
    currentId: () => current?.id ?? null,
    /* новые данные из таблицы при открытом досье */
    refresh(next) {
      standings = next;
      if (current && !busy) {
        const m = next.members.find((x) => x.id === current.id);
        if (m) fill(m);
      }
    },
  };
}
