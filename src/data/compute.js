/* Чистые функции: разбор CSV и расчёт двух независимых рейтингов.
   Доля = продления с допродажей / все продления. Средний чек = сумма / число модификаторов. */

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const src = String(text ?? '').replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      rows.push(row); row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ''));
}

/* «9 000,50 ₽» -> 9000.5; пустое или нечисловое -> null */
export function parseNumber(raw) {
  const s = String(raw ?? '').replace(/[\s  ₽]|руб\.?|р\.?$/gi, '').replace(',', '.');
  if (s === '' || !/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

const norm = (s) => String(s ?? '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я]/g, '');

/* «Сысолятина А.» -> участник; сопоставление по фамилии */
export function matchMember(name, roster) {
  const n = norm(name);
  if (!n) return null;
  return roster.find((m) => n.startsWith(norm(m.last))) ?? null;
}

const findCol = (header, patterns, fallback) => {
  const i = header.findIndex((h) => patterns.some((p) => p.test(h.toLowerCase())));
  return i === -1 ? fallback : i;
};

/* Вкладка «Доля допродаж»: дата, ФИО, продлено поставок, из них с допродажей, что продано */
export function readShareRows(rows) {
  if (!rows.length) return [];
  const h = rows[0];
  const col = {
    date: findCol(h, [/дата/], 0),
    name: findCol(h, [/фио/], 1),
    renewals: findCol(h, [/поставок/], 2),
    upsells: findCol(h, [/модификатор.*постав/, /продал/], 3),
    what: findCol(h, [/назван/, /что/], 4),
  };
  return rows.slice(1).map((r) => ({
    date: r[col.date] ?? '',
    name: r[col.name] ?? '',
    renewals: parseNumber(r[col.renewals]),
    upsells: parseNumber(r[col.upsells]),
    what: r[col.what] ?? '',
  })).filter((r) => r.name);
}

/* Вкладка «Средний чек»: одна строка - один проданный модификатор */
export function readCheckRows(rows) {
  if (!rows.length) return [];
  const h = rows[0];
  const col = {
    date: findCol(h, [/дата/], 0),
    name: findCol(h, [/фио/], 1),
    what: findCol(h, [/модификатор/, /назван/], 2),
    sum: findCol(h, [/сумма/, /стоимост/, /цена/], 3),
  };
  return rows.slice(1).map((r) => ({
    date: r[col.date] ?? '',
    name: r[col.name] ?? '',
    what: r[col.what] ?? '',
    sum: parseNumber(r[col.sum]),
  })).filter((r) => r.name);
}

/* Места: одинаковый результат - одинаковое место; без результата места нет */
function rank(members, key) {
  const scored = members.filter((m) => m[key] !== null).sort((a, b) => b[key] - a[key]);
  const places = new Map();
  scored.forEach((m, i) => {
    const prev = scored[i - 1];
    places.set(m.id, prev && prev[key] === m[key] ? places.get(prev.id) : i + 1);
  });
  return places;
}

export function buildStandings(roster, shareRows, checkRows) {
  const base = roster.map((m) => ({
    ...m, renewals: 0, upsells: 0, days: [], mods: [], modSum: 0, issues: [],
  }));
  const byId = new Map(base.map((m) => [m.id, m]));
  const unknown = new Set();

  for (const r of shareRows) {
    const m = matchMember(r.name, roster);
    if (!m) { unknown.add(r.name); continue; }
    const t = byId.get(m.id);
    const renewals = Math.max(0, r.renewals ?? 0);
    let upsells = Math.max(0, r.upsells ?? 0);
    if (upsells > renewals) {
      /* допродаж не может быть больше продлений: доля не превышает 100% */
      t.issues.push(`${r.date}: допродаж больше, чем продлений`);
      upsells = renewals;
    }
    t.renewals += renewals;
    t.upsells += upsells;
    t.days.push({ date: r.date, renewals, upsells, what: r.what });
  }

  for (const r of checkRows) {
    const m = matchMember(r.name, roster);
    if (!m) { unknown.add(r.name); continue; }
    if (r.sum === null || r.sum <= 0) continue; /* строка без суммы - не продажа */
    const t = byId.get(m.id);
    t.mods.push({ date: r.date, what: r.what, sum: r.sum });
    t.modSum += r.sum;
  }

  const members = base.map((m) => ({
    ...m,
    share: m.renewals > 0 ? m.upsells / m.renewals : null,
    check: m.mods.length > 0 ? m.modSum / m.mods.length : null,
  }));

  const sharePlaces = rank(members, 'share');
  const checkPlaces = rank(members, 'check');
  const leaders = (key, places) => members
    .filter((m) => places.get(m.id) === 1 && m[key] > 0)
    .map((m) => m.id);

  return {
    members: members.map((m) => ({
      ...m,
      sharePlace: sharePlaces.get(m.id) ?? null,
      checkPlace: checkPlaces.get(m.id) ?? null,
    })),
    shareLeaders: leaders('share', sharePlaces),
    checkLeaders: leaders('check', checkPlaces),
    maxCheck: Math.max(0, ...members.map((m) => m.check ?? 0)),
    unknown: [...unknown],
  };
}

export const formatPercent = (v) => (v === null ? '-' : `${Math.round(v * 100)}%`);
export const formatMoney = (v) => (v === null ? '-' : `${Math.round(v).toLocaleString('ru-RU').replace(/[  ]/g, ' ')} ₽`);

export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
