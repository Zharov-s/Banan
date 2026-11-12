import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCsv, parseNumber, matchMember, readShareRows, readCheckRows, buildStandings,
  formatPercent, formatMoney, plural,
} from '../src/data/compute.js';
import { ROSTER } from '../src/config.js';

const SHARE_CSV = `Дата,ФИО,Всего поставок продлил,"Всего продал
модификаторов в поставку",Что продлил - название модификатора
16.11,Сысолятина А.,5,1,РКЛ
17.11,Якимовских М.,10,3,МКБ
17.11,Деребеев И.,3,3,услуга по ЕПГУ
18.11,Кудрявцев И.,5,0,`;

const standings = (share, check) => buildStandings(ROSTER, readShareRows(parseCsv(share)), readCheckRows(parseCsv(check)));
const get = (s, id) => s.members.find((m) => m.id === id);

test('parseCsv keeps quoted line breaks and commas inside one cell', () => {
  const rows = parseCsv('a,"b\nc","d,e"\n1,2,3\n');
  assert.deepEqual(rows, [['a', 'b\nc', 'd,e'], ['1', '2', '3']]);
});

test('parseNumber reads spaced money and rejects text', () => {
  assert.equal(parseNumber('9 000,50 ₽'), 9000.5);
  assert.equal(parseNumber('3'), 3);
  assert.equal(parseNumber(''), null);
  assert.equal(parseNumber('МКБ'), null);
});

test('matchMember finds a participant by surname with initials', () => {
  assert.equal(matchMember('Сысолятина А.', ROSTER).id, 'sysolyatina');
  assert.equal(matchMember('якимовских  максим', ROSTER).id, 'yakimovskikh');
  assert.equal(matchMember('Иванов И.', ROSTER), null);
});

test('share is upsold renewals divided by all renewals', () => {
  const s = standings(SHARE_CSV, 'Дата,ФИО,Модификатор - название,Сумма');
  assert.equal(get(s, 'derebeev').share, 1);
  assert.equal(get(s, 'yakimovskikh').share, 0.3);
  assert.equal(get(s, 'sysolyatina').share, 0.2);
  assert.equal(get(s, 'kudryavtsev').share, 0);
  assert.deepEqual(s.shareLeaders, ['derebeev']);
});

test('participants without rows have no share, no check and no place', () => {
  const s = standings(SHARE_CSV, 'Дата,ФИО,Модификатор - название,Сумма');
  const m = get(s, 'prodius');
  assert.equal(m.share, null);
  assert.equal(m.check, null);
  assert.equal(m.sharePlace, null);
  assert.deepEqual(s.checkLeaders, []);
});

test('share sums several days before dividing', () => {
  const s = standings('Дата,ФИО,Всего поставок продлил,Всего продал,Что\n1.12,Продиус Р.,4,1,А\n2.12,Продиус Р.,6,3,Б', '');
  assert.equal(get(s, 'prodius').share, 0.4);
  assert.equal(get(s, 'prodius').days.length, 2);
});

test('upsells above renewals are capped and flagged', () => {
  const s = standings('Дата,ФИО,Всего поставок продлил,Всего продал,Что\n1.12,Продиус Р.,2,5,А', '');
  assert.equal(get(s, 'prodius').share, 1);
  assert.equal(get(s, 'prodius').issues.length, 1);
});

test('average check counts every modifier row separately', () => {
  const s = standings(SHARE_CSV, 'Дата,ФИО,Модификатор - название,Сумма\n1.12,Деребеев И.,МКБ,"4 000"\n1.12,Деребеев И.,РКЛ,2000\n1.12,Деребеев И.,ЕПГУ,3000\n2.12,Продиус Р.,МОБ,5000');
  assert.equal(get(s, 'derebeev').check, 3000);
  assert.equal(get(s, 'derebeev').mods.length, 3);
  assert.equal(get(s, 'prodius').check, 5000);
  assert.deepEqual(s.checkLeaders, ['prodius']);
  assert.equal(s.maxCheck, 5000);
});

test('rows with empty or zero sum are not sales', () => {
  const s = standings('', 'Дата,ФИО,Модификатор - название,Сумма\n1.12,Кудрявцев И.,5,0\n1.12,Кудрявцев И.,МКБ,');
  assert.equal(get(s, 'kudryavtsev').check, null);
  assert.deepEqual(s.checkLeaders, []);
});

test('equal results share the lead and the place', () => {
  const s = standings('', 'Дата,ФИО,Модификатор - название,Сумма\n1.12,Якимовских М.,МКБ,3\n1.12,Деребеев И.,РКЛ,3\n1.12,Сысолятина А.,РКЛ,1');
  assert.deepEqual(s.checkLeaders.sort(), ['derebeev', 'yakimovskikh']);
  assert.equal(get(s, 'sysolyatina').checkPlace, 3);
});

test('zero share never leads', () => {
  const s = standings('Дата,ФИО,Всего поставок продлил,Всего продал,Что\n1.12,Кудрявцев И.,5,0,', '');
  assert.deepEqual(s.shareLeaders, []);
  assert.equal(get(s, 'kudryavtsev').sharePlace, 1);
});

test('unknown names are reported, not counted', () => {
  const s = standings('Дата,ФИО,Всего поставок продлил,Всего продал,Что\n1.12,Иванов И.,5,5,', '');
  assert.deepEqual(s.unknown, ['Иванов И.']);
  assert.ok(s.members.every((m) => m.renewals === 0));
});

test('formatters use a plain hyphen for missing values', () => {
  assert.equal(formatPercent(null), '-');
  assert.equal(formatPercent(0.305), '31%');
  assert.equal(formatMoney(3000), '3 000 ₽');
  assert.equal(formatMoney(null), '-');
  assert.equal(plural(1, 'банан', 'банана', 'бананов'), 'банан');
  assert.equal(plural(3, 'банан', 'банана', 'бананов'), 'банана');
  assert.equal(plural(11, 'банан', 'банана', 'бананов'), 'бананов');
});
