/* Жизнь миньонов: моргание и взгляд, следящий за курсором. Дыхание - в CSS. */

const gsap = window.gsap;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const LOOK_RANGE = 2.6;
const BLINK_MIN = 2.2;
const BLINK_SPREAD = 4.5;

export function createLife() {
  const actors = [];

  /** @param {SVGElement} svg @param {() => boolean} isAsleep */
  function attach(svg, isAsleep = () => false) {
    const lids = svg.querySelectorAll('.m-lid');
    const pupils = [...svg.querySelectorAll('.m-pupil')];
    const actor = {
      svg,
      toX: pupils.map((p) => gsap.quickTo(p, 'x', { duration: 0.35, ease: 'power3.out' })),
      toY: pupils.map((p) => gsap.quickTo(p, 'y', { duration: 0.35, ease: 'power3.out' })),
      timer: null,
    };
    if (!REDUCED) {
      const blink = () => {
        const rest = isAsleep() ? 0.52 : 0;
        gsap.timeline()
          .to(lids, { scaleY: 1, duration: 0.07, ease: 'power2.in' })
          .to(lids, { scaleY: rest, duration: 0.13, ease: 'power2.out' });
        actor.timer = gsap.delayedCall(BLINK_MIN + Math.random() * BLINK_SPREAD, blink);
      };
      actor.timer = gsap.delayedCall(1 + Math.random() * BLINK_SPREAD, blink);
    }
    actors.push(actor);
    return () => {
      actor.timer?.kill();
      actors.splice(actors.indexOf(actor), 1);
    };
  }

  if (!REDUCED) {
    let queued = false;
    let px = 0;
    let py = 0;
    const aim = () => {
      queued = false;
      for (const a of actors) {
        const r = a.svg.getBoundingClientRect();
        if (!r.width) continue;
        const dx = px - (r.left + r.width / 2);
        const dy = py - (r.top + r.height * 0.4);
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, d / 260) * LOOK_RANGE;
        a.toX.forEach((f) => f((dx / d) * k));
        a.toY.forEach((f) => f((dy / d) * k));
      }
    };
    addEventListener('pointermove', (e) => {
      px = e.clientX;
      py = e.clientY;
      if (!queued) { queued = true; requestAnimationFrame(aim); }
    }, { passive: true });
  }

  return { attach };
}
