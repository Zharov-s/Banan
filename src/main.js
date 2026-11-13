/* Банановый апсейл: сборка игры - данные, сцена, досье, звук. */
import { ROSTER, REFRESH_MS, FINAL } from './config.js';
import { loadStandings } from './data/sheets.js';
import { formatMoney, formatPercent, plural } from './data/compute.js';
import { ICON_CROWN, ICON_GOLD } from './art/props.js';
import { createScene } from './scene/scene.js';
import { createLife } from './scene/life.js';
import { createDetail } from './detail/detail.js';
import { createSound } from './sound/engine.js';
import { createMixer } from './sound/mixer.js';

const $ = (s) => document.querySelector(s);
const app = $('[data-app]');
const statusEl = $('[data-status]');

const sound = createSound();
createMixer($('[data-mixer]'), sound);
const life = createLife();

const scene = createScene({
  stage: $('[data-stage]'),
  sound,
  onSelect: (id) => { location.hash = `#/${id}`; },
});
scene.bays.forEach((bay) => life.attach(bay.svg, () => bay.asleep === true));

const detail = createDetail({
  root: $('[data-detail]'),
  app,
  scene,
  life,
  sound,
  onClose: () => { if (location.hash) history.replaceState(null, '', location.pathname + location.search); },
});

/* ---- шапка: знаки номинаций, лидеры, дни до финала ---- */
$('[data-icon="crown"]').innerHTML = ICON_CROWN;
$('[data-icon="gold"]').innerHTML = ICON_GOLD;

function daysToFinal(now = new Date()) {
  const final = new Date(now.getFullYear(), FINAL.month, FINAL.day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((final - today) / 86_400_000);
}

function renderNote() {
  const days = daysToFinal();
  const when = days > 0 ? `до финала ${days}\u00A0${plural(days, 'день', 'дня', 'дней')}` : days === 0 ? 'финал сегодня' : 'финал 21 декабря';
  $('[data-note]').textContent = `2 приза, ${when}`;
}

function renderLeaders(standings) {
  const byId = new Map(standings.members.map((m) => [m.id, m]));
  const show = (kind, ids, format) => {
    const nameEl = $(`[data-leader="${kind}"]`);
    const valueEl = $(`[data-leader-value="${kind}"]`);
    if (ids.length === 0) {
      nameEl.textContent = 'Лидера пока нет';
      valueEl.textContent = '';
      return;
    }
    const leaders = ids.map((id) => byId.get(id));
    nameEl.textContent = leaders.length === 1 ? `${leaders[0].last} ${leaders[0].first}` : leaders.map((m) => m.last).join(', ');
    valueEl.textContent = format(leaders[0][kind]);
  };
  show('share', standings.shareLeaders, formatPercent);
  show('check', standings.checkLeaders, formatMoney);
}

/* ---- фокус на одной номинации ---- */
const nomButtons = [...document.querySelectorAll('[data-nom]')];
nomButtons.forEach((btn) => btn.addEventListener('click', () => {
  const next = btn.getAttribute('aria-pressed') === 'true' ? null : btn.dataset.nom;
  nomButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.nom === next)));
  scene.setFocus(next);
  sound.play('tick');
}));

/* ---- адрес как состояние: #/id открывает досье ---- */
function syncRoute() {
  const id = location.hash.replace(/^#\/?/, '');
  const known = ROSTER.some((m) => m.id === id);
  if (known && !detail.isOpen()) detail.open(id);
  else if (!known && detail.isOpen()) detail.close();
}
addEventListener('hashchange', syncRoute);

/* ---- данные ---- */
let signature = null;
let loading = false;

function showStatus(text) {
  statusEl.hidden = !text;
  statusEl.textContent = text ?? '';
}

async function refresh() {
  if (loading) return;
  loading = true;
  try {
    const { standings, live, signature: next } = await loadStandings();
    showStatus(live ? null : 'Нет связи с таблицей - показаны последние загруженные данные');
    if (next !== signature) {
      const first = signature === null;
      signature = next;
      detail.refresh(standings);
      scene.update(standings, { first });
      renderLeaders(standings);
      if (first) syncRoute();
    }
  } catch {
    showStatus('Не удалось загрузить данные из таблицы. Повторим через минуту');
    if (signature === null) {
      $('[data-leader="share"]').textContent = 'Нет данных';
      $('[data-leader="check"]').textContent = 'Нет данных';
    }
  } finally {
    loading = false;
  }
}

renderNote();
refresh();
setInterval(() => { if (!document.hidden) refresh(); }, REFRESH_MS);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { renderNote(); refresh(); } });
