import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LAYOUT, DEFAULT_CADRES, DEFAULT_TUTORS, parseLayout, formatLayout, totalRows, seatRow, seatCount, isValidSeat,
  splitList, parseRosterText, summarize, moveStudent, matchPdfRoster,
} from '../tools/seating-chart/core.js';
import { loadAppsScript } from './helpers/apps-script-mock.mjs';

test('default layout matches the 7-column classroom with 36 seats', () => {
  const cols = parseLayout(DEFAULT_LAYOUT);
  assert.deepEqual(cols.map(c => c.count), [4, 5, 6, 6, 6, 5, 4]);
  assert.equal(seatCount(cols), 36);
  assert.equal(totalRows(cols), 6);
  assert.equal(seatRow(cols, 1, 1), 2, 'leftmost column starts one row back');
  assert.equal(seatRow(cols, 2, 1), 1);
  assert.equal(seatRow(cols, 3, 6), 6);
  assert.ok(isValidSeat(cols, 7, 4));
  assert.ok(!isValidSeat(cols, 7, 5));
  assert.ok(!isValidSeat(cols, 8, 1));
  assert.equal(formatLayout(cols), DEFAULT_LAYOUT);
  assert.ok(DEFAULT_TUTORS.includes('美術') && DEFAULT_TUTORS.includes('工設'));
});

test('layout parsing rejects bad input', () => {
  assert.deepEqual(parseLayout('3 4/2'), [{ count: 3, start: 1 }, { count: 4, start: 2 }]);
  for (const bad of ['', 'a', '0', '3/0', '10/7', Array(13).fill('2').join(',')]) {
    assert.throws(() => parseLayout(bad), undefined, bad);
  }
});

test('roster text parsing accepts lines, CSV and the PDF run-on format', () => {
  assert.deepEqual(parseRosterText('01 王小明\n2,李小華\n03號 張小美'),
    [{ no: 1, name: '王小明' }, { no: 2, name: '李小華' }, { no: 3, name: '張小美' }]);
  assert.deepEqual(parseRosterText('09號 周小安     11號 黃大同'), [{ no: 9, name: '周小安' }, { no: 11, name: '黃大同' }]);
  assert.deepEqual(splitList('班長、副班長, 班長\n風紀'), ['班長', '副班長', '風紀']);
});

test('summary finds conflicts, unfilled students and duplicated roles', () => {
  const columns = parseLayout(DEFAULT_LAYOUT);
  const roster = [1, 2, 3, 4].map(no => ({ no, name: `S${no}` }));
  const entries = [
    { no: 1, col: 3, pos: 2, cadres: ['班長'], tutors: ['國文'] },
    { no: 2, col: 3, pos: 2, cadres: ['班長', '風紀'], tutors: [] },
    { no: 3, col: 1, pos: 5, cadres: [], tutors: [] },
    { no: 99, col: 4, pos: 1, cadres: ['學藝'], tutors: [] },
  ];
  const s = summarize({ columns, roster, entries, cadres: DEFAULT_CADRES, tutors: DEFAULT_TUTORS });
  assert.deepEqual(s.conflicts, [{ key: '3-2', nos: [1, 2] }]);
  assert.deepEqual(s.unfilled, [4]);
  assert.deepEqual(s.outOfLayout, [3]);
  assert.deepEqual(s.unseated, [3, 4]);
  assert.deepEqual(s.cadreMulti, ['班長']);
  assert.ok(s.cadreEmpty.includes('學藝'), 'students outside the roster are ignored');
  assert.deepEqual(s.tutorHolders.get('國文'), [1]);
});

test('moving a student swaps with a single occupant', () => {
  const columns = parseLayout(DEFAULT_LAYOUT);
  const entries = [
    { no: 1, col: 2, pos: 1, cadres: [], tutors: [] },
    { no: 2, col: 3, pos: 3, cadres: [], tutors: [] },
  ];
  const r = moveStudent(entries, 1, 3, 3, columns);
  assert.deepEqual(r.changed, [1, 2]);
  assert.deepEqual(r.entries.map(e => [e.no, e.col, e.pos]), [[1, 3, 3], [2, 2, 1]]);
  assert.equal(entries[0].col, 2, 'input is not mutated');
  const shared = [...entries, { no: 3, col: 2, pos: 1, cadres: [], tutors: [] }];
  const r3 = moveStudent(shared, 1, 3, 3, columns);
  assert.deepEqual(r3.entries.map(e => [e.no, e.col, e.pos]), [[1, 3, 3], [2, null, null], [3, 2, 1]],
    'leaving a shared seat does not push the other student into it');
  const r2 = moveStudent(entries, 5, 4, 1, columns);
  assert.deepEqual(r2.changed, [5]);
  assert.deepEqual(r2.entries.at(-1), { no: 5, col: 4, pos: 1, cadres: [], tutors: [] });
});

test('PDF roster matching pairs each label with the photo right above it', () => {
  // 模擬學校照片名冊：照片 64x80，文字基線在照片底部下方約 12pt。
  const items = [];
  const images = [];
  const people = [[1, '王小明'], [2, '李小華'], [7, '陳大文'], [8, '林小英']];
  people.forEach(([no, name], i) => {
    const x = 25 + (i % 2) * 91;
    const y = 638.9 - Math.floor(i / 2) * 114;
    items.push({ str: `${String(no).padStart(2, '0')}號`, x, y }, { str: ' ', x: x + 22, y }, { str: name, x: x + 30, y });
    images.push({ x, y: y + 12.1, w: 64, h: 80 });
  });
  images.reverse();
  items.push({ str: '班級： 312.312', x: 20, y: 738.4 });
  const found = matchPdfRoster(items, images);
  assert.deepEqual(found.map(f => [f.no, f.name]), people);
  assert.deepEqual(found.map(f => f.image), [3, 2, 1, 0]);
});

test('Apps Script backend: setup, roster, config and student submission', () => {
  const gas = loadAppsScript();
  gas.setup();
  assert.ok(gas.sheets.has('設定') && gas.sheets.has('名單') && gas.sheets.has('填寫'));
  assert.deepEqual(gas.get(), { ok: true, service: 'seating-chart' });
  assert.deepEqual(gas.get({ p: JSON.stringify({ action: 'ping' }) }), { ok: true }, 'GET fallback runs the same handler');
  assert.equal(gas.get({ p: '{bad' }).ok, false);

  assert.equal(gas.post({ action: 'teacher.load', teacherPassword: 'wrong' }).error, '教師密碼錯誤');
  assert.equal(gas.post({ action: 'student.load', classPassword: '' }).error, '老師尚未設定班級密碼');

  const t = { teacherPassword: 'teach1234' };
  let r = gas.post({ action: 'teacher.saveRoster', ...t, roster: [{ no: 2, name: '李小華' }, { no: 1, name: '王小明' }] });
  assert.ok(r.ok, r.error);
  assert.deepEqual(r.roster, [{ no: 1, name: '王小明' }, { no: 2, name: '李小華' }]);
  assert.equal(r.config.layout, '4/2, 5/1, 6/1, 6/1, 6/1, 5/1, 4/2');
  assert.equal(r.config.tutors.length, 14);

  r = gas.post({ action: 'teacher.saveConfig', ...t, config: { title: '312班座位表', classPassword: 'abc' } });
  assert.ok(r.ok, r.error);
  assert.equal(r.classPassword, 'abc');
  assert.equal(r.config.open, false);

  const s = { classPassword: 'abc' };
  assert.equal(gas.post({ action: 'student.load', classPassword: 'x' }).error, '班級密碼錯誤');
  r = gas.post({ action: 'student.load', ...s });
  assert.ok(r.ok);
  assert.equal(r.classPassword, undefined, 'students never receive the class password field');
  assert.equal(gas.post({ action: 'student.submit', ...s, no: 1, col: 3, pos: 2 }).error, '目前沒有開放填寫');

  gas.post({ action: 'teacher.saveConfig', ...t, config: { open: true } });
  assert.equal(gas.post({ action: 'student.submit', ...s, no: 1, col: 1, pos: 5 }).error, '座位不存在');
  assert.equal(gas.post({ action: 'student.submit', ...s, no: 1, col: null, pos: null }).error, '請選擇座位');
  assert.equal(gas.post({ action: 'student.submit', ...s, no: 3, col: 1, pos: 1 }).error, '名單裡沒有座號 3');

  r = gas.post({ action: 'student.submit', ...s, no: 1, col: 3, pos: 2, cadres: ['班長', '不存在'], tutors: ['物理'] });
  assert.ok(r.ok, r.error);
  assert.deepEqual(r.entries, [{ no: 1, col: 3, pos: 2, cadres: ['班長'], tutors: ['物理'] }]);
  r = gas.post({ action: 'student.submit', ...s, no: 1, col: 4, pos: 1, cadres: [], tutors: [] });
  assert.deepEqual(r.entries, [{ no: 1, col: 4, pos: 1, cadres: [], tutors: [] }], 'resubmitting replaces the row');

  r = gas.post({ action: 'teacher.saveEntries', ...t, entries: [{ no: 2, col: 4, pos: 1, cadres: ['風紀'], tutors: [] }, { no: 1, col: null, pos: null, cadres: [], tutors: [] }] });
  assert.ok(r.ok, r.error);
  assert.deepEqual(r.entries.map(e => [e.no, e.col, e.pos, e.by]), [[1, null, null, '教師'], [2, 4, 1, '教師']]);
  const rows = gas.sheets.get('填寫').rows();
  assert.deepEqual(rows.map(x => x.slice(0, 6)), [[1, '王小明', '', '', '', ''], [2, '李小華', 4, 1, '風紀', '']]);

  // 學生上傳照片：每人一張，新的覆蓋舊的；學生端只看得到誰有照片
  const jpg = 'data:image/jpeg;base64,' + 'A'.repeat(100);
  const jpg2 = 'data:image/jpeg;base64,' + 'B'.repeat(100);
  assert.ok(gas.post({ action: 'student.submit', ...s, no: 1, col: 3, pos: 1, photo: jpg }).ok);
  r = gas.post({ action: 'student.submit', ...s, no: 1, col: 3, pos: 1, photo: jpg2 });
  assert.deepEqual(r.photoNos, [1]);
  assert.equal(r.photos, undefined, 'students never receive photo data');
  assert.equal(gas.sheets.get('照片').rows().length, 1, 'new photo replaces the old one');
  r = gas.post({ action: 'student.submit', ...s, no: 1, col: 3, pos: 1 });
  assert.deepEqual(r.photoNos, [1], 'submitting without a photo keeps the old one');
  assert.equal(gas.post({ action: 'student.submit', ...s, no: 1, col: 3, pos: 1, photo: 'data:image/png;base64,AAAA' }).error, '照片格式錯誤');
  assert.equal(gas.post({ action: 'student.submit', ...s, no: 1, col: 3, pos: 1, photo: 'data:image/jpeg;base64,' + 'A'.repeat(50000) }).error, '照片太大');
  r = gas.post({ action: 'teacher.load', ...t });
  assert.deepEqual(r.photos, { 1: jpg2 });
  assert.equal(gas.post({ action: 'teacher.saveEntries', ...t, entries: [] }).photos, undefined, 'saves skip the heavy photo payload');
  r = gas.post({ action: 'teacher.savePhoto', ...t, no: 1, photo: null });
  assert.deepEqual(r.photos, {});
  assert.equal(gas.post({ action: 'teacher.savePhoto', ...t, no: 9, photo: jpg }).error, '名單裡沒有座號 9');

  assert.equal(gas.post({ action: 'teacher.saveConfig', ...t, config: { layout: '3, 3', lectern: 4 } }).error, '講桌位置超出排數');
  assert.match(gas.post({ action: 'teacher.saveRoster', ...t, roster: [{ no: 1, name: 'a' }, { no: 1, name: 'b' }] }).error, /座號重複/);
  assert.equal(gas.post({ action: 'nope' }).error, '未知的動作');
});

test('Apps Script refuses teacher actions until the password is changed', () => {
  const gas = loadAppsScript(null);
  gas.setup();
  assert.match(gas.post({ action: 'teacher.load', teacherPassword: '請改成教師密碼' }).error, /尚未設定教師密碼/);
});

test('Apps Script layout parser agrees with the page', () => {
  const gas = loadAppsScript();
  for (const text of [DEFAULT_LAYOUT, '6 6 6', '1/15', '2/3,4']) {
    assert.deepEqual(JSON.parse(JSON.stringify(gas.context.parseLayout_(text))), parseLayout(text));
  }
  for (const bad of ['', '0', '3/14', 'x']) assert.throws(() => gas.context.parseLayout_(bad));
});
