/* Игровое поле. Семь подъёмников в одном цеху:
   высота платформы - доля допродаж, размер банана над головой - средний чек,
   бананы на платформе - продления с допродажей. */
import { ROSTER } from '../config.js';
import { formatMoney, formatPercent } from '../data/compute.js';
import { minionSvg, armPose, drawArms, geometry, VIEW, NANA_BASE } from '../art/minion.js';
import { BANANA, BUNCH, pileLayout } from '../art/props.js';

const gsap = window.gsap;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const HOVER = matchMedia('(hover: hover) and (pointer: fine)').matches;
const ROWS = [4, 3];
const SCALE_STEPS = [0, 0.25, 0.5, 0.75, 1];
const NANA_MIN = 0.6;
const NANA_RANGE = 0.9;
const RISE = 1.1;

const WINDOW_ART = `<svg viewBox="0 0 200 200" aria-hidden="true">
  <g fill="#fff"><circle class="star" cx="42" cy="58" r="1.6"/><circle class="star" cx="150" cy="42" r="1.3"/><circle class="star" cx="168" cy="96" r="1.7"/><circle class="star" cx="64" cy="122" r="1.2"/><circle class="star" cx="118" cy="26" r="1.2"/><circle class="star" cx="30" cy="98" r="1.1"/></g>
  <path d="M92 34Q84 52 96 66Q106 76 122 72Q108 84 92 76Q76 66 80 48Q83 38 92 34Z" fill="#ffd64a" transform="translate(-10 14) scale(0.52)"/>
  <path d="M0 200V168L22 150L40 162L66 138L92 160L120 142L148 164L170 148L200 170V200Z" fill="#33267f"/>
</svg>`;

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};

const nanaScale = (check, maxCheck) => (check === null || maxCheck <= 0 ? 0 : NANA_MIN + NANA_RANGE * (check / maxCheck));
const placeText = (place) => (place === null ? 'нет данных' : `${place} место`);

function buildBay(member, index) {
  const bay = el('button', 'bay');
  bay.type = 'button';
  bay.dataset.id = member.id;
  bay.style.setProperty('--accent', member.accent);

  const wall = el('span', 'bay__wall');
  const beam = el('span', 'bay__beam');
  const shaft = el('span', 'bay__shaft');
  const rod = el('span', 'bay__rod');
  shaft.append(rod);

  const lift = el('span', 'lift');
  const rider = el('span', 'lift__rider');
  rider.innerHTML = minionSvg(member, `s-${member.id}`);
  const svg = rider.firstElementChild;
  svg.style.setProperty('--beat', `${-(index * 0.47).toFixed(2)}s`);
  const price = el('span', 'lift__price');
  rider.append(price);
  const pile = el('span', 'lift__pile');
  const deck = el('span', 'lift__deck');
  const deckText = el('span', 'lift__pct');
  deck.append(deckText, el('span', 'lift__sheen'));
  lift.append(rider, pile, deck);
  wall.append(beam, shaft, lift);

  const floor = el('span', 'bay__floor');
  const rankShare = el('span', 'bay__rank');
  rankShare.dataset.rank = 'share';
  const rankCheck = el('span', 'bay__rank');
  rankCheck.dataset.rank = 'check';
  const last = el('span', 'bay__last', member.last);
  const first = el('span', 'bay__first', member.first);
  floor.append(el('span', 'bay__base'), rankShare, rankCheck, last, first);
  bay.append(wall, floor);

  const arms = { ...armPose(member.look, 'down') };
  drawArms(svg, member.look, arms);
  gsap.set(svg.querySelectorAll('.m-lid'), { scaleY: 0, transformOrigin: '50% 0%' });

  return {
    id: member.id, member, el: bay, wall, lift, rod, rider, svg, price, pile, deck, deckText,
    rankShare, rankCheck, last, first, arms,
    nana: svg.querySelector('.m-nana-s'), crown: svg.querySelector('.m-crown-s'),
    shown: { share: null, check: null, upsells: 0, shareLead: false, checkLead: false, pct: 0, money: 0, scale: 0, kinds: '' },
    data: null,
  };
}

export function createScene({ stage, sound, onSelect }) {
  const windowEl = el('div', 'stage__window');
  windowEl.innerHTML = WINDOW_ART;
  stage.append(windowEl);

  const bays = [];
  const rows = [];
  let cursor = 0;
  for (const size of ROWS) {
    const row = el('div', `row${cursor === 0 ? ' row--first' : ''}${cursor + size >= ROSTER.length ? ' row--last' : ''}`);
    row.style.setProperty('--n', size);
    const scale = el('div', 'scale');
    for (const p of SCALE_STEPS) {
      const line = el('span', 'scale__line');
      line.style.setProperty('--p', p);
      if (p > 0) line.append(el('span', '', `${p * 100}%`));
      else line.style.borderTopColor = 'transparent';
      scale.append(line);
    }
    row.append(scale);
    const members = ROSTER.slice(cursor, cursor + size);
    const rowBays = members.map((m, i) => buildBay(m, cursor + i));
    rowBays.forEach((b) => row.append(b.el));
    rows.push({ el: row, bays: rowBays, travel: 240, mw: 120 });
    bays.push(...rowBays);
    cursor += size;
    stage.append(row);
  }
  const byId = new Map(bays.map((b) => [b.id, b]));
  const rowOf = (bay) => rows.find((r) => r.bays.includes(bay));

  /* ---- геометрия: размер миньона и ход подъёмника под текущий экран ---- */
  const tagOffset = (bay, scale, mw) => {
    const g = geometry(bay.member.look);
    const topUnits = g.top - NANA_BASE.lift - NANA_BASE.height * Math.max(scale, 0.01) - 6;
    return ((VIEW.h - topUnits) / VIEW.w) * mw + 4;
  };

  function layout() {
    for (const row of rows) {
      const sample = row.bays[0];
      const wallH = sample.wall.clientHeight;
      const bayW = sample.el.clientWidth;
      const deckH = sample.deck.offsetHeight || 30;
      const mw = Math.floor(Math.max(54, Math.min(bayW * 0.76, wallH * 0.27, 160)));
      const headroom = mw * 0.31 + 40;
      const travel = Math.max(40, Math.floor(wallH - deckH - (mw * VIEW.h) / VIEW.w - headroom));
      row.mw = mw;
      row.travel = travel;
      row.el.style.setProperty('--mw', `${mw}px`);
      row.el.style.setProperty('--travel', `${travel}px`);
      for (const bay of row.bays) {
        const y = -(bay.shown.share ?? 0) * travel;
        gsap.set([bay.lift, bay.rod], { y });
        gsap.set(bay.price, { y: -tagOffset(bay, bay.shown.scale, mw) });
      }
    }
  }

  /* ---- бананы на платформе ---- */
  function syncPile(bay, count, animate, at) {
    const items = pileLayout(count);
    const kinds = items.map((i) => i.kind).join(',');
    if (kinds === bay.shown.kinds) return;
    const grew = kinds.startsWith(bay.shown.kinds) && bay.shown.kinds !== '';
    const keep = grew ? bay.pile.children.length : 0;
    if (!grew) bay.pile.textContent = '';
    items.slice(keep).forEach((item, n) => {
      const node = el('span', `nana nana--${item.kind}`);
      node.style.setProperty('--side', item.side);
      node.style.setProperty('--col', item.col);
      node.style.setProperty('--row', item.row);
      node.innerHTML = item.kind === 'bunch' ? BUNCH : BANANA;
      bay.pile.append(node);
      if (!animate || REDUCED) return;
      const delay = at + n * 0.09;
      gsap.fromTo(node, { y: -rowOf(bay).mw * 1.6, opacity: 0, rotation: item.side * 50 },
        { y: 0, opacity: 1, rotation: 0, duration: 0.7, ease: 'bounce.out', delay, onStart: () => sound.play('pop', { delay: 0.25 }) });
    });
    bay.shown.kinds = kinds;
  }

  /* ---- знаки лидерства ---- */
  function setCrown(bay, on, animate, at) {
    if (bay.shown.shareLead === on) return;
    bay.shown.shareLead = on;
    bay.el.classList.toggle('is-share-lead', on);
    gsap.killTweensOf(bay.crown);
    if (!animate || REDUCED) { gsap.set(bay.crown, { opacity: on ? 1 : 0, y: 0, rotation: 0 }); return; }
    if (on) {
      gsap.fromTo(bay.crown, { y: -46, opacity: 0, rotation: -28, svgOrigin: '0 0' },
        { y: 0, opacity: 1, rotation: 0, duration: 0.95, ease: 'bounce.out', delay: at, onStart: () => sound.play('crown') });
    } else {
      gsap.to(bay.crown, { y: -26, opacity: 0, rotation: 40, duration: 0.45, ease: 'power2.out', delay: at });
    }
  }

  function setGold(bay, on) {
    if (bay.shown.checkLead === on) return;
    bay.shown.checkLead = on;
    bay.el.classList.toggle('is-check-lead', on);
    bay.svg.classList.toggle('is-gold', on);
  }

  const mood = (bay, m) => {
    const asleep = m.share === null && m.check === null;
    bay.asleep = asleep;
    bay.svg.classList.toggle('is-asleep', asleep);
    const lead = bay.shown.shareLead || bay.shown.checkLead;
    bay.svg.dataset.mood = asleep ? 'flat' : lead ? 'open' : 'smile';
    gsap.to(bay.svg.querySelectorAll('.m-lid'), { scaleY: asleep ? 0.52 : 0, duration: 0.4, ease: 'power2.out' });
  };

  function celebrate(bay, at) {
    if (REDUCED) return;
    const tl = gsap.timeline({ delay: at });
    tl.to(bay.rider, { y: -rowOf(bay).mw * 0.2, scaleY: 1.06, scaleX: 0.96, duration: 0.24, ease: 'power2.out', onStart: () => sound.play('yay') })
      .to(bay.rider, { y: 0, scaleY: 1, scaleX: 1, duration: 0.6, ease: 'bounce.out' });
  }

  /* ---- обновление по данным ---- */
  function update(standings, { first = false } = {}) {
    const animate = !REDUCED;
    standings.members.forEach((m, i) => {
      const bay = byId.get(m.id);
      const row = rowOf(bay);
      const at = first ? 0.3 + i * 0.09 : 0;
      const prev = bay.shown;
      const improved = !first && ((m.share ?? 0) > (prev.share ?? 0) || (m.check ?? 0) > (prev.check ?? 0) || m.upsells > prev.upsells);
      bay.data = m;

      /* подъёмник: доля допродаж */
      const y = -(m.share ?? 0) * row.travel;
      if (m.share !== prev.share) {
        const moves = Math.abs((m.share ?? 0) - (prev.share ?? 0)) > 0.001;
        if (animate && moves) {
          gsap.to([bay.lift, bay.rod], { y, duration: RISE, ease: 'power3.inOut', delay: at, overwrite: true, onStart: () => sound.play('lift') });
          gsap.to(bay.rider, { keyframes: [{ scaleY: 0.95, scaleX: 1.04, duration: 0.14, ease: 'power2.out' }, { scaleY: 1, scaleX: 1, duration: 0.7, ease: 'elastic.out(1, 0.42)' }], delay: at + RISE - 0.08 });
        } else gsap.set([bay.lift, bay.rod], { y });
        const target = Math.round((m.share ?? 0) * 100);
        if (m.share === null) bay.deckText.textContent = '';
        else if (animate) gsap.to(prev, { pct: target, duration: RISE, ease: 'power2.out', delay: at, onUpdate: () => { bay.deckText.textContent = `${Math.round(prev.pct)}%`; } });
        else { prev.pct = target; bay.deckText.textContent = formatPercent(m.share); }
      }

      /* банан над головой и ценник: средний чек */
      const scale = nanaScale(m.check, standings.maxCheck);
      if (m.check !== prev.check || scale !== prev.scale) {
        const holds = m.check !== null;
        const startScale = prev.scale > 0 ? prev.scale : 0.4;
        if (animate) {
          gsap.to(bay.arms, { ...armPose(bay.member.look, holds ? 'hold' : 'down'), duration: 0.6, ease: 'power3.out', delay: at + (first ? RISE * 0.6 : 0), onUpdate: () => drawArms(bay.svg, bay.member.look, bay.arms) });
          gsap.fromTo(bay.nana, { scale: startScale, svgOrigin: '0 0' }, { scale: holds ? scale : 0.4, opacity: holds ? 1 : 0, duration: 0.8, ease: holds ? 'back.out(2)' : 'power2.out', delay: at + (first ? RISE * 0.7 : 0.15) });
          gsap.to(bay.price, { y: -tagOffset(bay, scale, row.mw), opacity: holds ? 1 : 0, duration: 0.6, ease: 'power3.out', delay: at + (first ? RISE * 0.8 : 0.2) });
          if (holds) gsap.to(prev, { money: m.check, duration: 0.9, ease: 'power2.out', delay: at + (first ? RISE * 0.8 : 0.2), onUpdate: () => { bay.price.textContent = formatMoney(prev.money); } });
        } else {
          Object.assign(bay.arms, armPose(bay.member.look, holds ? 'hold' : 'down'));
          drawArms(bay.svg, bay.member.look, bay.arms);
          gsap.set(bay.nana, { scale: holds ? scale : 0.4, opacity: holds ? 1 : 0, svgOrigin: '0 0' });
          gsap.set(bay.price, { y: -tagOffset(bay, scale, row.mw), opacity: holds ? 1 : 0 });
          prev.money = m.check ?? 0;
          bay.price.textContent = formatMoney(m.check);
        }
      }

      syncPile(bay, m.upsells, !first || animate, at + (first ? RISE * 0.5 : 0));
      setCrown(bay, standings.shareLeaders.includes(m.id), true, at + (first ? RISE : 0.2));
      setGold(bay, standings.checkLeaders.includes(m.id));

      Object.assign(prev, { share: m.share, check: m.check, upsells: m.upsells, scale });
      mood(bay, m);
      if (improved) celebrate(bay, 0.35);

      bay.rankShare.textContent = placeText(m.sharePlace);
      bay.rankCheck.textContent = placeText(m.checkPlace);
      bay.el.setAttribute('aria-label', `${m.last} ${m.first}. Доля допродаж ${m.share === null ? 'нет данных' : formatPercent(m.share)}, средний чек ${m.check === null ? 'нет данных' : formatMoney(m.check)}. Открыть статистику`);
    });
  }

  /* ---- отклик на наведение и нажатие ---- */
  for (const bay of bays) {
    const holdPose = () => armPose(bay.member.look, bay.shown.check !== null ? 'hold' : 'down');
    const moveArms = (pose, duration, ease) => gsap.to(bay.arms, { ...pose, duration, ease, overwrite: true, onUpdate: () => drawArms(bay.svg, bay.member.look, bay.arms) });

    if (HOVER && !REDUCED) {
      bay.el.addEventListener('pointerenter', () => {
        sound.play('chirp');
        gsap.timeline()
          .to(bay.rider, { y: -7, duration: 0.16, ease: 'power2.out' })
          .to(bay.rider, { y: 0, duration: 0.5, ease: 'bounce.out' });
        if (bay.shown.check === null) moveArms(armPose(bay.member.look, 'wave'), 0.3, 'back.out(2)');
        if (!bay.asleep) bay.svg.dataset.mood = 'open';
      });
      bay.el.addEventListener('pointerleave', () => {
        moveArms(holdPose(), 0.5, 'power3.out');
        if (bay.data) mood(bay, bay.data);
      });
    }
    bay.el.addEventListener('pointerdown', () => { if (!REDUCED) gsap.to(bay.rider, { scaleY: 0.93, scaleX: 1.05, duration: 0.14, ease: 'power2.out', overwrite: 'auto' }); });
    const release = () => { if (!REDUCED) gsap.to(bay.rider, { scaleY: 1, scaleX: 1, duration: 0.7, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' }); };
    bay.el.addEventListener('pointerup', release);
    bay.el.addEventListener('pointerleave', release);
    bay.el.addEventListener('pointercancel', release);
    bay.el.addEventListener('click', () => onSelect(bay.id));
  }

  let resizeTimer = 0;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 60);
  }).observe(stage);
  layout();

  return {
    update,
    layout,
    bays,
    getBay: (id) => byId.get(id),
    setFocus(kind) {
      if (kind) stage.dataset.focus = kind;
      else delete stage.dataset.focus;
    },
  };
}
