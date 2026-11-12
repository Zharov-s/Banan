/* Миньон: параметрический векторный персонаж. Одна функция рисует всех семерых,
   отличия задаются в ROSTER.look (рост, ширина, глаза, причёска, аксессуар). */

const INK = '#2a2147';
const SKIN = '#ffd64a';
const SKIN_SHADE = '#f2b01e';
const LID = '#f7c531';
const DENIM = '#4169d6';
const DENIM_DARK = '#2f4fae';
const STEEL = '#c3c8da';
const STEEL_DARK = '#8b91ab';
const GOLD = '#ffc93c';
const GOLD_DARK = '#f0a012';

const CX = 60;
const BOTTOM = 128;
export const VIEW = Object.freeze({ w: 120, h: 142 });
export const NANA_BASE = Object.freeze({ lift: 29, height: 24 });

/** @returns {{top:number,L:number,R:number,r:number,ey:number,my:number,oy:number,sy:number,eyeR:number,eyeXs:number[]}} */
export function geometry(look) {
  const r = look.w / 2;
  const top = BOTTOM - look.h;
  const eyeR = look.eyes === 1 ? 14 : 12;
  const ey = top + look.h * 0.3 + 2;
  const my = ey + eyeR + 5.5;
  const oy = Math.max(BOTTOM - look.h * 0.3, my + 12);
  return {
    top, r, L: CX - r, R: CX + r, ey, my, oy, sy: my - 1, eyeR,
    eyeXs: look.eyes === 1 ? [CX] : [CX - 11.5, CX + 11.5],
  };
}

const HAIR = {
  sprout: (g) => `<path d="M${CX} ${g.top + 1}q-1-9-7-13M${CX} ${g.top + 1}q0-10 1-15M${CX} ${g.top + 1}q2-9 8-12" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`,
  curls: (g) => [[-15, 4], [-8, -2], [0, -4], [8, -2], [15, 4], [-4, 2], [5, 2]]
    .map(([x, y]) => `<circle cx="${CX + x}" cy="${g.top + y}" r="5" fill="${INK}"/>`).join(''),
  bun: (g, a) => `<circle cx="${CX}" cy="${g.top - 5}" r="7.5" fill="${INK}"/>
    <path d="M${CX} ${g.top + 1}l-9-4.5v9zM${CX} ${g.top + 1}l9-4.5v9z" fill="${a}"/><circle cx="${CX}" cy="${g.top + 1}" r="2.2" fill="${a}"/>`,
  helmet: (g, a) => {
    const rr = g.r + 1.5;
    const dx = rr * Math.cos(0.3);
    const y = g.top + g.r - rr * Math.sin(0.3);
    return `<path d="M${CX - dx} ${y}A${rr} ${rr} 0 0 1 ${CX + dx} ${y}Z" fill="${a}"/>
      <rect x="${CX - 3.5}" y="${g.top - 3.5}" width="7" height="${y - g.top + 3}" rx="3" fill="#fff" opacity=".28"/>
      <rect x="${g.L - 5}" y="${y - 1}" width="${g.r * 2 + 10}" height="5" rx="2.5" fill="${a}"/>
      <rect x="${g.L - 5}" y="${y + 1.6}" width="${g.r * 2 + 10}" height="2.4" rx="1.2" fill="${INK}" opacity=".22"/>`;
  },
  swept: (g, a) => `<path d="M${g.L + 2} ${g.top + g.r * 0.72}Q${CX - 4} ${g.top - 8} ${g.R - 2} ${g.top + 8}Q${g.R + 8} ${g.top + g.r} ${g.R + 5} ${g.ey + 16}Q${g.R + 1} ${g.ey + 4} ${g.R - 1} ${g.top + g.r}Q${CX + 4} ${g.top + 6} ${g.L + 2} ${g.top + g.r * 0.72}Z" fill="${INK}"/>
    <circle cx="${g.R - 4}" cy="${g.top + g.r * 0.62}" r="2.8" fill="${a}"/>`,
  pigtails: (g, a) => {
    const y = g.top + g.r * 0.62;
    return `<path d="M${g.L + 2} ${y}q-13-4-14 9q7-1 14-9zM${g.R - 2} ${y}q13-4 14 9q-7-1-14-9z" fill="${INK}"/>
      <circle cx="${g.L + 1}" cy="${y + 0.5}" r="2.6" fill="${a}"/><circle cx="${g.R - 1}" cy="${y + 0.5}" r="2.6" fill="${a}"/>
      <path d="M${CX - 6} ${g.top + 1.5}q6 5 12 0" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`;
  },
  mohawk: (g) => `<path d="M${CX - 10} ${g.top + 3}L${CX - 8} ${g.top - 9}L${CX - 3.5} ${g.top - 1}L${CX} ${g.top - 13}L${CX + 3.5} ${g.top - 1}L${CX + 8} ${g.top - 9}L${CX + 10} ${g.top + 3}Z" fill="${INK}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`,
};

const EXTRA = {
  none: () => '',
  band: () => '',
  bowtie: (g, a) => {
    const y = g.oy - 10;
    return `<path d="M${CX} ${y}l-8-4.5v9zM${CX} ${y}l8-4.5v9z" fill="${a}"/><circle cx="${CX}" cy="${y}" r="2.3" fill="${a}"/>`;
  },
  scarf: (g, a, clip) => `<g clip-path="url(#${clip})"><rect x="${g.L}" y="${g.my + 5}" width="${g.r * 2}" height="6.5" fill="${a}"/></g>
    <rect x="${g.R - 13}" y="${g.my + 8}" width="6.5" height="14" rx="2.5" fill="${a}" transform="rotate(-10 ${g.R - 10} ${g.my + 8})"/>`,
  phones: (g, a) => `<path d="M${g.L - 2} ${g.ey - 4}A${g.r + 2} ${g.r + 5} 0 0 1 ${g.R + 2} ${g.ey - 4}" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    <rect x="${g.L - 6}" y="${g.ey - 9}" width="7" height="16" rx="3.5" fill="${a}"/><rect x="${g.R - 1}" y="${g.ey - 9}" width="7" height="16" rx="3.5" fill="${a}"/>`,
};

function eye(x, g, id, lashes) {
  const R = g.eyeR;
  const lash = lashes
    ? [-2.2, -1.57, -0.94].map((t) => `<path d="M${x + Math.cos(t) * R} ${g.ey + Math.sin(t) * R}L${x + Math.cos(t) * (R + 4)} ${g.ey + Math.sin(t) * (R + 4)}" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`).join('')
    : '';
  return `${lash}
    <circle cx="${x}" cy="${g.ey}" r="${R}" fill="${STEEL_DARK}"/>
    <circle cx="${x}" cy="${g.ey - 0.9}" r="${R - 1.3}" fill="${STEEL}"/>
    <circle cx="${x}" cy="${g.ey}" r="${R - 4}" fill="#fff"/>
    <g class="m-pupil"><circle cx="${x}" cy="${g.ey}" r="${R * 0.37}" fill="#8a5a2b"/><circle cx="${x}" cy="${g.ey}" r="${R * 0.2}" fill="${INK}"/><circle cx="${x + 1.7}" cy="${g.ey - 1.9}" r="1.3" fill="#fff"/></g>
    <clipPath id="${id}"><circle cx="${x}" cy="${g.ey}" r="${R - 4}"/></clipPath>
    <g clip-path="url(#${id})"><rect class="m-lid" x="${x - R}" y="${g.ey - R}" width="${R * 2}" height="${R * 2}" fill="${LID}"/></g>`;
}

const banana = () => `<g class="m-nana-s">
    <path d="M-36-22Q-34-6-14-1Q0 2 14-1Q34-6 36-22L31.5-23Q26-12 10-10Q0-9-10-10Q-26-12-31.5-23Z" fill="#ffbf1f"/>
    <path d="M-33-12Q-24-3-12-1Q0 1.6 12-1Q24-3 33-12Q22-4.5 11-3.4Q0-2.6-11-3.4Q-22-4.5-33-12Z" fill="#e8950a"/>
    <path d="M-27-13.5Q-14-6.6 0-6.2Q14-6.6 27-13.5" fill="none" stroke="#ffe58e" stroke-width="2" stroke-linecap="round"/>
    <rect x="-37.4" y="-26" width="6.4" height="5" rx="1.6" fill="#6b4423" transform="rotate(-12 -34 -23)"/>
    <rect x="31" y="-26" width="6.4" height="5" rx="1.6" fill="#6b4423" transform="rotate(12 34 -23)"/>
    <g class="m-rosette"><circle cx="0" cy="-4.5" r="7.5" fill="#fff"/><circle cx="0" cy="-4.5" r="5.4" fill="#ff8a1f"/><path d="M-1.4-7.2h2.3v6h-2.3z M-2.6-6l1.4-1.2v1.8z" fill="#fff"/></g>
    <g class="m-sparks" fill="#fff"><path class="m-spark" d="M-44-34l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4-4.4-1.6 4.4-1.6z"/><path class="m-spark" d="M43-38l1.3 3.5 3.5 1.3-3.5 1.3-1.3 3.5-1.3-3.5-3.5-1.3 3.5-1.3z"/><path class="m-spark" d="M4-36l1 2.8 2.8 1-2.8 1-1 2.8-1-2.8-2.8-1 2.8-1z"/></g>
  </g>`;

const crown = () => `<g class="m-crown-s">
    <path d="M-11.5 0L-14-11L-6.5-5.5L0-14.5L6.5-5.5L14-11L11.5 0Z" fill="${GOLD}" stroke="${GOLD}" stroke-width="1.6" stroke-linejoin="round"/>
    <rect x="-12.3" y="-2.6" width="24.6" height="4.6" rx="2" fill="${GOLD_DARK}"/>
    <circle cx="0" cy="-14.5" r="2.3" fill="#5ef0c8"/><circle cx="-14" cy="-11" r="1.9" fill="#5ef0c8"/><circle cx="14" cy="-11" r="1.9" fill="#5ef0c8"/>
  </g>`;

/**
 * @param {{look: object, accent: string}} member
 * @param {string} uid уникальный префикс для clipPath (на сцене и в досье - разные)
 * @returns {string} разметка SVG
 */
export function minionSvg(member, uid) {
  const { look, accent } = member;
  const g = geometry(look);
  const rb = g.r * 0.78;
  const body = `M${g.L} ${g.top + g.r}a${g.r} ${g.r} 0 0 1 ${look.w} 0V${BOTTOM - rb}a${g.r} ${rb} 0 0 1 ${-look.w} 0Z`;
  const clip = `${uid}-b`;
  const shoe = look.extra === 'band' ? accent : INK;
  const crownY = ['bun', 'curls', 'mohawk', 'helmet'].includes(look.hair) ? g.top - 3 : g.top + 2.5;
  return `<svg class="minion" viewBox="0 0 ${VIEW.w} ${VIEW.h}" data-mood="smile" aria-hidden="true" focusable="false">
  <defs><clipPath id="${clip}"><path d="${body}"/></clipPath></defs>
  <ellipse class="m-shadow" cx="${CX}" cy="139" rx="${g.r + 6}" ry="3.2" fill="${INK}" opacity=".28"/>
  <g class="m-legs">
    <rect x="${CX - 13}" y="${BOTTOM - 5}" width="8" height="11" fill="${DENIM_DARK}"/><rect x="${CX + 5}" y="${BOTTOM - 5}" width="8" height="11" fill="${DENIM_DARK}"/>
    <path d="M${CX - 19} 139q0-7 9-7q7 0 7 7z M${CX + 3} 139q0-7 7-7q9 0 9 7z" fill="${shoe}"/>
  </g>
  <g class="m-up">
    <path class="m-arm" data-side="l" fill="none" stroke="${SKIN_SHADE}" stroke-width="6.4" stroke-linecap="round"/>
    <path class="m-arm" data-side="r" fill="none" stroke="${SKIN_SHADE}" stroke-width="6.4" stroke-linecap="round"/>
    <g class="m-hand" data-side="l"><circle r="5.4" fill="${INK}"/><circle cx="-3.4" cy="-3.6" r="2.3" fill="${INK}"/><circle cx="3.2" cy="-3.9" r="2.3" fill="${INK}"/></g>
    <g class="m-hand" data-side="r"><circle r="5.4" fill="${INK}"/><circle cx="-3.2" cy="-3.9" r="2.3" fill="${INK}"/><circle cx="3.4" cy="-3.6" r="2.3" fill="${INK}"/></g>
    <path d="${body}" fill="${SKIN_SHADE}"/>
    <g clip-path="url(#${clip})">
      <path d="${body}" fill="${SKIN}" transform="translate(-5 -2)"/>
      <ellipse cx="${CX - g.r * 0.46}" cy="${g.top + g.r * 0.62}" rx="${g.r * 0.17}" ry="${g.r * 0.34}" fill="#fff" opacity=".38" transform="rotate(24 ${CX - g.r * 0.46} ${g.top + g.r * 0.62})"/>
      <rect x="${g.L}" y="${g.ey - 3.6}" width="${look.w}" height="7.2" fill="${INK}"/>
      <rect x="${g.L}" y="${g.oy}" width="${look.w}" height="${BOTTOM - g.oy}" fill="${DENIM}"/>
      <rect x="${CX + g.r * 0.42}" y="${g.oy}" width="${g.r}" height="${BOTTOM - g.oy}" fill="${DENIM_DARK}" opacity=".6"/>
      <path d="M${CX - 10} ${g.oy - 8}L${g.L} ${g.oy - 19}M${CX + 10} ${g.oy - 8}L${g.R} ${g.oy - 19}" stroke="${DENIM}" stroke-width="4.6"/>
    </g>
    <rect x="${CX - 12.5}" y="${g.oy - 10}" width="25" height="14" rx="3" fill="${DENIM}"/>
    <circle cx="${CX - 9.4}" cy="${g.oy - 6.8}" r="1.5" fill="${INK}"/><circle cx="${CX + 9.4}" cy="${g.oy - 6.8}" r="1.5" fill="${INK}"/>
    <rect x="${CX - 6}" y="${g.oy - 3.6}" width="12" height="9" rx="2.6" fill="${DENIM_DARK}"/>
    <circle cx="${CX}" cy="${g.oy + 0.9}" r="2.3" fill="${accent}"/>
    ${EXTRA[look.extra](g, accent, clip)}
    <path class="m-mouth m-mouth--smile" d="M${CX - 8} ${g.my}Q${CX} ${g.my + 7.5} ${CX + 8} ${g.my}" fill="none" stroke="#3b2a22" stroke-width="2.3" stroke-linecap="round"/>
    <g class="m-mouth m-mouth--open"><path d="M${CX - 8.5} ${g.my - 0.5}Q${CX} ${g.my + 13} ${CX + 8.5} ${g.my - 0.5}Z" fill="#5a2330" stroke="#5a2330" stroke-width="1.6" stroke-linejoin="round"/><rect x="${CX - 5.4}" y="${g.my - 0.3}" width="10.8" height="2.6" rx="1" fill="#fff"/></g>
    <path class="m-mouth m-mouth--flat" d="M${CX - 5.5} ${g.my + 2.2}h11" fill="none" stroke="#3b2a22" stroke-width="2.3" stroke-linecap="round"/>
    ${g.eyeXs.map((x, i) => eye(x, g, `${uid}-e${i}`, look.lashes)).join('')}
    ${HAIR[look.hair](g, accent)}
    <g class="m-crown" transform="translate(${CX} ${crownY}) rotate(-7)">${crown()}</g>
    <g class="m-nana" transform="translate(${CX} ${g.top - NANA_BASE.lift})">${banana()}</g>
  </g>
</svg>`;
}

/* Позы рук: координаты кистей в системе SVG и изгиб локтя */
export function armPose(look, pose) {
  const g = geometry(look);
  const down = { lx: g.L - 6, ly: Math.min(g.sy + 23, 131), rx: g.R + 6, ry: Math.min(g.sy + 23, 131), bend: 3 };
  if (pose === 'hold') return { lx: CX - 14, ly: g.top - NANA_BASE.lift - 1, rx: CX + 14, ry: g.top - NANA_BASE.lift - 1, bend: 11 };
  if (pose === 'cheer') return { lx: g.L - 15, ly: g.top + 6, rx: g.R + 15, ry: g.top + 6, bend: -5 };
  if (pose === 'wave') return { ...down, rx: g.R + 17, ry: g.top + 12, bend: 3 };
  return down;
}

/* Перерисовать руки по текущему состоянию позы */
export function drawArms(svg, look, state) {
  const g = geometry(look);
  const sides = [['l', g.L + 3, state.lx, state.ly, -1], ['r', g.R - 3, state.rx, state.ry, 1]];
  for (const [side, sx, hx, hy, dir] of sides) {
    const mx = (sx + hx) / 2 + dir * state.bend;
    const myy = (g.sy + hy) / 2;
    svg.querySelector(`.m-arm[data-side="${side}"]`).setAttribute('d', `M${sx} ${g.sy}Q${mx} ${myy} ${hx} ${hy}`);
    svg.querySelector(`.m-hand[data-side="${side}"]`).setAttribute('transform', `translate(${hx} ${hy})`);
  }
}
