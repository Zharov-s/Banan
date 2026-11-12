/* Конкурс «Банановый апсейл»: состав, источник данных и константы. */

export const SHEET_ID = '1p5J6hw_fNIT99BXM9UDPEi5cTbDiSwudalQCWgAI4I8';
export const SHEET_TABS = Object.freeze({ share: '0', check: '146212804' });
export const REFRESH_MS = 60_000;
export const PRIZE = 8000;
/* Финал и награждение - 21 декабря (из презентации конкурса). */
export const FINAL = Object.freeze({ month: 11, day: 21 });

/* Участники в порядке презентации. look - внешность миньона, accent - его личный цвет. */
export const ROSTER = Object.freeze([
  { id: 'prodius', last: 'Продиус', first: 'Роман', team: 'Команда Насти', accent: '#ff8a5c',
    look: { w: 50, h: 96, eyes: 1, hair: 'sprout', extra: 'bowtie', lashes: false } },
  { id: 'kudryavtsev', last: 'Кудрявцев', first: 'Илья', team: 'Команда Никиты', accent: '#43d6c2',
    look: { w: 56, h: 84, eyes: 2, hair: 'curls', extra: 'band', lashes: false } },
  { id: 'khobrakova', last: 'Хобракова', first: 'Марьяна', team: 'Команда Никиты', accent: '#ff6fa3',
    look: { w: 60, h: 72, eyes: 2, hair: 'bun', extra: 'none', lashes: true } },
  { id: 'derebeev', last: 'Деребеев', first: 'Иван', team: 'Команда Сергея', accent: '#ffa726',
    look: { w: 64, h: 80, eyes: 1, hair: 'helmet', extra: 'none', lashes: false } },
  { id: 'sysolyatina', last: 'Сысолятина', first: 'Альбина', team: 'Команда Сергея', accent: '#7cc4ff',
    look: { w: 48, h: 100, eyes: 2, hair: 'swept', extra: 'none', lashes: true } },
  { id: 'snigireva', last: 'Снигирева', first: 'Ангелина', team: 'Команда Сергея', accent: '#ff5d5d',
    look: { w: 54, h: 70, eyes: 1, hair: 'pigtails', extra: 'scarf', lashes: true } },
  { id: 'yakimovskikh', last: 'Якимовских', first: 'Максим', team: 'Команда Сергея', accent: '#b7e35a',
    look: { w: 54, h: 88, eyes: 2, hair: 'mohawk', extra: 'phones', lashes: false } },
]);
