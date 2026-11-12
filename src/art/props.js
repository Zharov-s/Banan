/* Игровые предметы и знаки: бананы для платформ, знаки двух номинаций, стрелка «назад». */

const PEEL = '#ffbf1f';
const PEEL_DARK = '#e8950a';
const TIP = '#6b4423';

export const BANANA = `<svg viewBox="0 0 26 14" aria-hidden="true"><path d="M1.5 1.5Q2.5 9 9 11.6Q13 13 17 11.6Q23.5 9 24.5 1.5L22 1Q19.6 6.6 15.8 7.6Q13 8.2 10.2 7.6Q6.4 6.6 4 1Z" fill="${PEEL}"/><path d="M3 5.6Q6 10.4 10 11.4Q13 12.2 16 11.4Q20 10.4 23 5.6Q19 9.4 15.6 10Q13 10.4 10.4 10Q7 9.4 3 5.6Z" fill="${PEEL_DARK}"/><rect x=".6" y=".2" width="3.6" height="2.6" rx=".9" fill="${TIP}"/><rect x="21.8" y=".2" width="3.6" height="2.6" rx=".9" fill="${TIP}"/></svg>`;

/* Связка - пять бананов */
export const BUNCH = `<svg viewBox="0 0 30 26" aria-hidden="true"><rect x="12.4" y="0" width="5.2" height="6" rx="1.6" fill="${TIP}"/><path d="M13 4Q3 6 2 20Q2 24 5 24Q7 14 14 8Z" fill="${PEEL_DARK}"/><path d="M17 4Q27 6 28 20Q28 24 25 24Q23 14 16 8Z" fill="${PEEL_DARK}"/><path d="M13.4 4.6Q7 9 8.4 22.6Q9 25.4 11.6 24.6Q11 14 15 7Z" fill="${PEEL}"/><path d="M16.6 4.6Q23 9 21.6 22.6Q21 25.4 18.4 24.6Q19 14 15 7Z" fill="${PEEL}"/><path d="M15 5Q12.4 12 13.4 23.4Q15 26.4 16.6 23.4Q17.6 12 15 5Z" fill="#ffd45a"/></svg>`;

export const ICON_CROWN = `<svg viewBox="0 0 32 28" aria-hidden="true"><path d="M4.5 22L2 7.5L10 13.5L16 3L22 13.5L30 7.5L27.5 22Z" fill="#ffc93c" stroke="#ffc93c" stroke-width="2" stroke-linejoin="round"/><rect x="3.6" y="19.4" width="24.8" height="5.4" rx="2.4" fill="#f0a012"/><circle cx="16" cy="3.2" r="2.6" fill="#5ef0c8"/><circle cx="2.4" cy="7.6" r="2.1" fill="#5ef0c8"/><circle cx="29.6" cy="7.6" r="2.1" fill="#5ef0c8"/></svg>`;

export const ICON_GOLD = `<svg viewBox="0 0 36 28" aria-hidden="true"><path d="M1.5 3.5Q2.5 17 12 21.6Q18 24 24 21.6Q33.5 17 34.5 3.5L31 2.6Q28 12 22 13.8Q18 14.8 14 13.8Q8 12 5 2.6Z" fill="${PEEL}"/><path d="M3.6 10.6Q8 19 13.6 21Q18 22.4 22.4 21Q28 19 32.4 10.6Q27 17.4 22 18.6Q18 19.4 14 18.6Q9 17.4 3.6 10.6Z" fill="${PEEL_DARK}"/><rect x=".4" y="1" width="5" height="3.6" rx="1.2" fill="${TIP}"/><rect x="30.6" y="1" width="5" height="3.6" rx="1.2" fill="${TIP}"/><circle cx="18" cy="18.4" r="7.6" fill="#fff"/><circle cx="18" cy="18.4" r="5.5" fill="#ff8a1f"/><path d="M16.7 15.4h2.4v6.2h-2.4zM15.4 16.8l1.4-1.4v2z" fill="#fff"/></svg>`;

export const ICON_BACK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* Раскладка кучки: связки по 5 и одиночные бананы, справа и слева от миньона.
   Возвращает не больше 16 предметов: [{ kind, side, col, row }] */
export function pileLayout(count) {
  const bunches = Math.floor(count / 5);
  const singles = count % 5;
  const kinds = [...Array(bunches).fill('bunch'), ...Array(singles).fill('single')].slice(0, 16);
  return kinds.map((kind, i) => {
    const side = i % 2 === 0 ? 1 : -1;
    const n = Math.floor(i / 2);
    return { kind, side, col: n % 2, row: Math.floor(n / 2) };
  });
}
