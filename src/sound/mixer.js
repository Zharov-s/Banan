/* Переключатель звука с микшером. Адаптация «Sound toggle with the scroll mixer» из Animorio
   (animorio.com, лицензия: animorio.com/en/license): шарик на пружине со сжатием, смена букв при наведении,
   сегментные индикаторы с падающими пиками. Громкость каждого канала крутится колесом мыши,
   перетаскиванием или стрелками - прокрутка управляет микшером, как в оригинале. */
import { CHANNELS } from './engine.js';

const gsap = window.gsap;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SLIDE = 0.5;
const SQUASH = 0.3;
const SEGMENTS = 10;
const PEAK_HOLD = 0.7;
const PEAK_FALL = 5;
const WHEEL_STEP = 0.0016;
const KEY_STEP = 0.05;

const split = (word, cls) => `<span class="sound__text ${cls}">${[...word].map((c, i) => `<span class="c" style="--i:${i}">${c}</span>`).join('')}</span>`;

export function createMixer(root, sound) {
  root.innerHTML = `
    <div class="mixer__strips">${CHANNELS.map((c, i) => `
      <div class="strip" role="slider" tabindex="0" data-strip="${i}" style="--accent:${c.color}"
        aria-label="Громкость: ${c.name}" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(c.volume * 100)}">
        <span class="strip__meter" aria-hidden="true">${'<i></i>'.repeat(SEGMENTS)}</span>
        <span class="strip__name">${c.name}</span>
      </div>`).join('')}
    </div>
    <button class="sound" type="button" aria-pressed="false" aria-label="Звук игры" data-toggle>
      <span class="sound__words" aria-hidden="true">${split('Звук', 'sound__text--a')}${split('Звук', 'sound__text--b')}</span>
      <span class="sound__track" aria-hidden="true"><span class="sound__fill"></span><span class="sound__knob" data-knob><span class="sound__ball" data-ball></span></span></span>
    </button>`;

  const smooth = window.CustomEase ? window.CustomEase.create('smooth', 'M0,0 C0.32,0.72 0,1 1,1') : 'power3.out';
  const toggle = root.querySelector('[data-toggle]');
  const knob = root.querySelector('[data-knob]');
  const ball = root.querySelector('[data-ball]');
  let on = false;
  let dx = 20;

  const measure = () => {
    dx = Math.max(0, knob.parentElement.clientWidth - knob.offsetWidth - 6);
    gsap.set(knob, { x: on ? dx : 0 });
  };
  measure();
  addEventListener('resize', measure);

  /* шарик едет по кривой, проскакивает на пиксель и возвращается; на старте вытягивается */
  const slide = () => {
    gsap.killTweensOf([knob, ball]);
    const end = on ? dx : 0;
    if (REDUCED) { gsap.set(knob, { x: end }); return; }
    gsap.timeline()
      .to(knob, { x: end + (on ? 1 : -1), duration: SLIDE, ease: smooth })
      .to(knob, { x: end, duration: 0.25, ease: 'sine.inOut' });
    gsap.timeline()
      .set(ball, { transformOrigin: on ? '0% 50%' : '100% 50%' })
      .to(ball, { scaleX: 1 + SQUASH, scaleY: 1 - SQUASH * 0.45, duration: 0.13, ease: 'power2.out' })
      .to(ball, { scaleX: 1, scaleY: 1, duration: 0.8, ease: 'elastic.out(1, 0.42)' });
  };

  toggle.addEventListener('click', () => {
    on = sound.setOn(!on);
    toggle.setAttribute('aria-pressed', String(on));
    root.classList.toggle('is-on', on);
    slide();
    if (on) sound.play('pop', { delay: 0.12 });
  });
  toggle.addEventListener('pointerdown', () => { if (!REDUCED) gsap.to(toggle, { scale: 0.95, duration: 0.15, ease: 'power2.out', overwrite: 'auto' }); });
  const release = () => { if (!REDUCED) gsap.to(toggle, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.45)', overwrite: 'auto' }); };
  toggle.addEventListener('pointerup', release);
  toggle.addEventListener('pointerleave', release);

  /* каналы */
  const strips = [...root.querySelectorAll('[data-strip]')].map((node, i) => ({
    node, i, segs: [...node.querySelectorAll('i')], disp: 0, lit: -1, peak: 0, peakAt: -1, hold: 0, cap: -1,
  }));

  const setVolume = (s, v) => {
    sound.setVolume(s.i, v);
    s.node.setAttribute('aria-valuenow', String(Math.round(sound.volume(s.i) * 100)));
  };

  for (const s of strips) {
    s.node.addEventListener('wheel', (e) => {
      e.preventDefault();
      const before = Math.round(sound.volume(s.i) * SEGMENTS);
      setVolume(s, sound.volume(s.i) - e.deltaY * WHEEL_STEP);
      if (Math.round(sound.volume(s.i) * SEGMENTS) !== before) sound.play('tick');
    }, { passive: false });

    let dragFrom = null;
    s.node.addEventListener('pointerdown', (e) => {
      dragFrom = { y: e.clientY, v: sound.volume(s.i) };
      s.node.setPointerCapture(e.pointerId);
    });
    s.node.addEventListener('pointermove', (e) => {
      if (dragFrom) setVolume(s, dragFrom.v + (dragFrom.y - e.clientY) / 60);
    });
    const drop = () => { dragFrom = null; };
    s.node.addEventListener('pointerup', drop);
    s.node.addEventListener('pointercancel', drop);

    s.node.addEventListener('keydown', (e) => {
      const dir = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
      if (!dir) return;
      e.preventDefault();
      setVolume(s, sound.volume(s.i) + dir * KEY_STEP);
      sound.play('tick');
    });
  }

  /* без звука индикаторы тихо дышат в своём ритме, чтобы микшер читался и выключенным */
  const idle = (i, t) => {
    if (i === 0) return 0.5 + 0.22 * Math.sin(t * 0.8) + 0.12 * Math.sin(t * 3.1);
    if (i === 1) { const ph = (t * 0.55 + 0.3) % 1; return 0.2 + 0.8 * Math.exp(-ph / 0.12); }
    const ph = (t * 0.4) % 1;
    return 0.15 + 0.85 * Math.exp(-ph / 0.07);
  };

  gsap.ticker.add(() => {
    const t = gsap.ticker.time;
    const dt = Math.min(0.1, gsap.ticker.deltaRatio() / 60);
    for (const s of strips) {
      const v = sound.volume(s.i);
      const live = sound.level(s.i);
      const lvl = live === null ? v * (0.25 + 0.5 * Math.max(0, Math.min(1, idle(s.i, t)))) : Math.min(v, live);
      s.disp += (lvl - s.disp) * (lvl > s.disp ? 0.55 : 0.16);
      const n = Math.round(s.disp * SEGMENTS);
      if (n >= s.peak) { s.peak = n; s.hold = PEAK_HOLD; }
      else if (s.hold > 0) s.hold -= dt;
      else s.peak = Math.max(n, s.peak - PEAK_FALL * dt);
      const pk = Math.floor(s.peak) - 1;
      const cap = Math.round(v * SEGMENTS);
      if (n === s.lit && pk === s.peakAt && cap === s.cap) continue;
      s.segs.forEach((seg, j) => {
        seg.classList.toggle('on', j < n);
        seg.classList.toggle('peak', j === pk && j >= n);
        seg.classList.toggle('off', j >= cap);
      });
      s.lit = n;
      s.peakAt = pk;
      s.cap = cap;
    }
  });
}
