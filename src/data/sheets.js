/* Google Sheets - единственный источник результатов. Читаем две вкладки как CSV. */
import { SHEET_ID, SHEET_TABS, ROSTER } from '../config.js';
import { parseCsv, readShareRows, readCheckRows, buildStandings } from './compute.js';

const CACHE_KEY = 'banan:last-good';
const urls = (gid) => [
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`,
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&gid=${gid}`,
];

async function fetchTab(gid) {
  let lastError = null;
  for (const url of urls(gid)) {
    try {
      const res = await fetch(`${url}&t=${Date.now()}`, { cache: 'no-store', credentials: 'omit' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (/^\s*<(!doctype|html)/i.test(text)) throw new Error('таблица недоступна по ссылке');
      return text;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error('нет ответа');
}

function readCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
    return raw && typeof raw.share === 'string' && typeof raw.check === 'string' ? raw : null;
  } catch {
    return null;
  }
}

function writeCache(raw) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(raw)); } catch { /* хранилище недоступно - работаем без кэша */ }
}

const toStandings = (raw) => buildStandings(
  ROSTER,
  readShareRows(parseCsv(raw.share)),
  readCheckRows(parseCsv(raw.check)),
);

/* Возвращает { standings, live, signature }. Если сеть недоступна - последние загруженные данные. */
export async function loadStandings() {
  try {
    const [share, check] = await Promise.all([fetchTab(SHEET_TABS.share), fetchTab(SHEET_TABS.check)]);
    const raw = { share, check, at: Date.now() };
    writeCache(raw);
    return { standings: toStandings(raw), live: true, signature: `${share}\u0000${check}` };
  } catch (error) {
    const cached = readCache();
    if (!cached) throw error;
    return { standings: toStandings(cached), live: false, signature: `${cached.share}\u0000${cached.check}` };
  }
}
