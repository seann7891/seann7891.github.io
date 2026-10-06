/**
 * 座位表工具後端（Google Apps Script，綁定在一份 Google 試算表上）
 *
 * 架設步驟：
 * 1. 新增一份 Google 試算表 → 擴充功能 → Apps Script。
 * 2. 刪掉預設內容，貼上這整份程式碼，把下面的 TEACHER_PASSWORD 改成你的教師密碼。
 * 3. 上方函式選單選 setup → 執行，依指示授權。試算表會出現「設定」「名單」「填寫」三個工作表。
 * 4. 部署 → 新增部署作業 → 類型選「網頁應用程式」：
 *    執行身分「我」，誰可以存取「所有人」→ 部署，複製網頁應用程式網址。
 * 5. 把網址填進網站的 tools/seating-chart/config.js。
 * 之後若修改這份程式碼，要到「管理部署作業」編輯同一個部署並選「新版本」，網址才會維持不變。
 */

const TEACHER_PASSWORD = '請改成教師密碼';

const SHEET_CONFIG = '設定';
const SHEET_ROSTER = '名單';
const SHEET_ENTRIES = '填寫';
const ENTRY_HEADERS = ['座號', '姓名', '排', '個', '幹部', '小老師', '更新時間', '更新者'];
const CONFIG_FIELDS = [
  ['title', '標題', '班級座位表'],
  ['classPassword', '班級密碼', ''],
  ['open', '開放填寫', '否'],
  ['layout', '格局', '4/2, 5/1, 6/1, 6/1, 6/1, 5/1, 4/2'],
  ['lectern', '講桌位置', '4'],
  ['cadres', '幹部', '班長、副班長、風紀、副風紀、學藝、副學藝、衛生、副衛生、資源、副資源、康樂、資訊、總務、設備、輔導、圖書、膳食、副膳食、國際事務、班代表'],
  ['tutors', '小老師', '國文、英文、數學、歷史、公民、物理、化學、生物、音樂、美術、體育、家政、工設、自然探究'],
];

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const config = ensureSheet_(ss, SHEET_CONFIG, ['項目', '值']);
  config.getRange(1, 2, 200, 1).setNumberFormat('@');
  const existing = readConfigRaw_();
  const rows = CONFIG_FIELDS.map(f => [f[1], existing[f[1]] !== undefined ? existing[f[1]] : f[2]]);
  config.getRange(2, 1, rows.length, 2).setValues(rows);
  const roster = ensureSheet_(ss, SHEET_ROSTER, ['座號', '姓名']);
  roster.getRange(1, 2, 500, 1).setNumberFormat('@');
  const entries = ensureSheet_(ss, SHEET_ENTRIES, ENTRY_HEADERS);
  entries.getRange(1, 5, 500, 2).setNumberFormat('@');
  Logger.log('完成。教師密碼' + (teacherPasswordReady_() ? '已設定' : '尚未設定，請修改 TEACHER_PASSWORD'));
}

function doGet() {
  return json_({ ok: true, service: 'seating-chart' });
}

function doPost(e) {
  let result;
  try {
    const req = JSON.parse(e && e.postData ? e.postData.contents : '{}');
    result = handle_(req);
  } catch (err) {
    result = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return json_(result);
}

function handle_(req) {
  switch (req.action) {
    case 'ping':
      return { ok: true };
    case 'student.load':
      checkClass_(req.classPassword);
      return publicState_();
    case 'student.submit':
      checkClass_(req.classPassword);
      return withLock_(() => studentSubmit_(req));
    case 'teacher.load':
      checkTeacher_(req.teacherPassword);
      return teacherState_();
    case 'teacher.saveConfig':
      checkTeacher_(req.teacherPassword);
      return withLock_(() => { saveConfig_(req.config || {}); return teacherState_(); });
    case 'teacher.saveRoster':
      checkTeacher_(req.teacherPassword);
      return withLock_(() => { saveRoster_(req.roster || []); return teacherState_(); });
    case 'teacher.saveEntries':
      checkTeacher_(req.teacherPassword);
      return withLock_(() => { saveEntries_(req.entries || [], req.remove || []); return teacherState_(); });
    default:
      throw new Error('未知的動作');
  }
}

// ---------- 權限 ----------

function teacherPasswordReady_() {
  return typeof TEACHER_PASSWORD === 'string' && TEACHER_PASSWORD.length >= 4 && TEACHER_PASSWORD !== '請改成教師密碼';
}

function checkTeacher_(password) {
  if (!teacherPasswordReady_()) throw new Error('後端尚未設定教師密碼（Apps Script 裡的 TEACHER_PASSWORD）');
  if (String(password || '') !== TEACHER_PASSWORD) {
    Utilities.sleep(1000);
    throw new Error('教師密碼錯誤');
  }
}

function checkClass_(password) {
  const config = readConfig_();
  if (!config.classPassword) throw new Error('老師尚未設定班級密碼');
  if (String(password || '') !== config.classPassword) {
    Utilities.sleep(1000);
    throw new Error('班級密碼錯誤');
  }
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// ---------- 讀取 ----------

function sheet_(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('找不到工作表「' + name + '」，請先在 Apps Script 執行 setup');
  return sh;
}

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  sh.setFrozenRows(1);
  return sh;
}

function rows_(sh, width, display) {
  const last = sh.getLastRow();
  if (last < 2) return [];
  const range = sh.getRange(2, 1, last - 1, width);
  return display ? range.getDisplayValues() : range.getValues();
}

function readConfigRaw_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG);
  const raw = {};
  if (!sh) return raw;
  rows_(sh, 2, true).forEach(r => { if (r[0]) raw[String(r[0]).trim()] = String(r[1]); });
  return raw;
}

function readConfig_() {
  const raw = readConfigRaw_();
  const c = {};
  CONFIG_FIELDS.forEach(f => { c[f[0]] = raw[f[1]] !== undefined ? raw[f[1]].trim() : f[2]; });
  return {
    title: c.title,
    classPassword: c.classPassword,
    open: c.open === '是',
    layout: c.layout,
    lectern: Number(c.lectern) || 1,
    cadres: splitList_(c.cadres),
    tutors: splitList_(c.tutors),
  };
}

function readRoster_() {
  return rows_(sheet_(SHEET_ROSTER), 2, false)
    .filter(r => Number(r[0]) > 0 && String(r[1]).trim())
    .map(r => ({ no: Number(r[0]), name: String(r[1]).trim() }))
    .sort((a, b) => a.no - b.no);
}

function readEntries_() {
  return rows_(sheet_(SHEET_ENTRIES), ENTRY_HEADERS.length, false)
    .filter(r => Number(r[0]) > 0)
    .map(r => ({
      no: Number(r[0]),
      col: r[2] === '' ? null : Number(r[2]),
      pos: r[3] === '' ? null : Number(r[3]),
      cadres: splitList_(r[4]),
      tutors: splitList_(r[5]),
      updated: r[6] instanceof Date ? r[6].toISOString() : String(r[6] || ''),
      by: String(r[7] || ''),
    }));
}

function publicConfig_(config) {
  return { title: config.title, open: config.open, layout: config.layout, lectern: config.lectern,
    cadres: config.cadres, tutors: config.tutors };
}

function publicState_() {
  return {
    ok: true,
    config: publicConfig_(readConfig_()),
    roster: readRoster_(),
    entries: readEntries_().map(e => ({ no: e.no, col: e.col, pos: e.pos, cadres: e.cadres, tutors: e.tutors })),
  };
}

function teacherState_() {
  const config = readConfig_();
  return { ok: true, config: publicConfig_(config), classPassword: config.classPassword,
    roster: readRoster_(), entries: readEntries_() };
}

// ---------- 寫入 ----------

function studentSubmit_(req) {
  const config = readConfig_();
  if (!config.open) throw new Error('目前沒有開放填寫');
  const roster = readRoster_();
  const entry = cleanEntry_(req, config, roster);
  if (entry.col === null) throw new Error('請選擇座位');
  writeEntries_([entry], [], roster, '學生');
  return publicState_();
}

function saveConfig_(input) {
  const current = readConfig_();
  const next = {
    title: input.title !== undefined ? String(input.title).trim().slice(0, 60) : current.title,
    classPassword: input.classPassword !== undefined ? String(input.classPassword).trim() : current.classPassword,
    open: input.open !== undefined ? !!input.open : current.open,
    layout: input.layout !== undefined ? String(input.layout).trim() : current.layout,
    lectern: input.lectern !== undefined ? Number(input.lectern) : current.lectern,
    cadres: input.cadres !== undefined ? splitList_(input.cadres) : current.cadres,
    tutors: input.tutors !== undefined ? splitList_(input.tutors) : current.tutors,
  };
  const columns = parseLayout_(next.layout);
  if (!(next.lectern >= 1 && next.lectern <= columns.length)) throw new Error('講桌位置超出排數');
  if (next.classPassword.length > 40) throw new Error('班級密碼太長');
  [next.cadres, next.tutors].forEach(list => {
    if (list.length > 60) throw new Error('職位太多');
    list.forEach(r => { if (r.length > 12) throw new Error('職位名稱太長：' + r); });
  });
  const values = {
    title: next.title,
    classPassword: next.classPassword,
    open: next.open ? '是' : '否',
    layout: columns.map(c => c.count + '/' + c.start).join(', '),
    lectern: String(next.lectern),
    cadres: next.cadres.join('、'),
    tutors: next.tutors.join('、'),
  };
  const sh = sheet_(SHEET_CONFIG);
  sh.getRange(2, 1, CONFIG_FIELDS.length, 2).setValues(CONFIG_FIELDS.map(f => [f[1], values[f[0]]]));
}

function saveRoster_(list) {
  if (!Array.isArray(list) || list.length > 200) throw new Error('名單格式錯誤');
  const seen = {};
  const roster = list.map(s => {
    const no = Number(s.no);
    const name = String(s.name || '').trim();
    if (!(Number.isInteger(no) && no >= 1 && no <= 200)) throw new Error('座號錯誤：' + s.no);
    if (!name || name.length > 20) throw new Error('姓名錯誤：' + no);
    if (seen[no]) throw new Error('座號重複：' + no);
    seen[no] = true;
    return { no: no, name: name };
  }).sort((a, b) => a.no - b.no);
  const sh = sheet_(SHEET_ROSTER);
  const last = sh.getLastRow();
  if (last >= 2) sh.getRange(2, 1, last - 1, 2).clearContent();
  if (roster.length) sh.getRange(2, 1, roster.length, 2).setValues(roster.map(s => [s.no, s.name]));
  writeEntries_([], [], roster, '');
}

function saveEntries_(list, remove) {
  const config = readConfig_();
  const roster = readRoster_();
  if (!Array.isArray(list) || list.length > 200) throw new Error('資料格式錯誤');
  const entries = list.map(e => cleanEntry_(e, config, roster));
  writeEntries_(entries, (remove || []).map(Number), roster, '教師');
}

function cleanEntry_(e, config, roster) {
  const no = Number(e.no);
  if (!roster.some(s => s.no === no)) throw new Error('名單裡沒有座號 ' + e.no);
  const columns = parseLayout_(config.layout);
  let col = e.col === null || e.col === undefined || e.col === '' ? null : Number(e.col);
  let pos = e.pos === null || e.pos === undefined || e.pos === '' ? null : Number(e.pos);
  if (col === null || pos === null) {
    col = null;
    pos = null;
  } else if (!(Number.isInteger(col) && Number.isInteger(pos) && col >= 1 && col <= columns.length &&
      pos >= 1 && pos <= columns[col - 1].count)) {
    throw new Error('座位不存在');
  }
  const pick = (value, allowed) => splitList_(value).filter(r => allowed.indexOf(r) >= 0);
  return { no: no, col: col, pos: pos, cadres: pick(e.cadres, config.cadres), tutors: pick(e.tutors, config.tutors) };
}

// 以座號合併後整張重寫；同時把姓名同步成名單上的姓名。
function writeEntries_(updates, remove, roster, by) {
  const sh = sheet_(SHEET_ENTRIES);
  const names = {};
  roster.forEach(s => { names[s.no] = s.name; });
  const rows = rows_(sh, ENTRY_HEADERS.length, false).filter(r => Number(r[0]) > 0);
  const index = {};
  rows.forEach((r, i) => { index[Number(r[0])] = i; });
  const now = new Date();
  updates.forEach(e => {
    const row = [e.no, names[e.no] || '', e.col === null ? '' : e.col, e.pos === null ? '' : e.pos,
      e.cadres.join('、'), e.tutors.join('、'), now, by];
    if (index[e.no] !== undefined) rows[index[e.no]] = row;
    else { index[e.no] = rows.length; rows.push(row); }
  });
  const kept = rows
    .filter(r => remove.indexOf(Number(r[0])) < 0)
    .map(r => { const copy = r.slice(); if (names[Number(r[0])]) copy[1] = names[Number(r[0])]; return copy; })
    .sort((a, b) => Number(a[0]) - Number(b[0]));
  const last = sh.getLastRow();
  if (last >= 2) sh.getRange(2, 1, last - 1, ENTRY_HEADERS.length).clearContent();
  if (kept.length) sh.getRange(2, 1, kept.length, ENTRY_HEADERS.length).setValues(kept);
}

// ---------- 工具 ----------

function splitList_(value) {
  const items = Array.isArray(value) ? value : String(value === undefined || value === null ? '' : value).split(/[、,，;；\s]+/);
  const out = [];
  items.forEach(raw => {
    const v = String(raw).trim();
    if (v && out.indexOf(v) < 0) out.push(v);
  });
  return out;
}

function parseLayout_(text) {
  const tokens = String(text || '').split(/[,，、\s]+/).filter(Boolean);
  if (!tokens.length || tokens.length > 12) throw new Error('格局排數錯誤');
  return tokens.map((t, i) => {
    const m = /^(\d+)(?:\/(\d+))?$/.exec(t);
    if (!m) throw new Error('格局第 ' + (i + 1) + ' 排格式錯誤');
    const count = Number(m[1]);
    const start = m[2] ? Number(m[2]) : 1;
    if (count < 1 || start < 1 || start + count - 1 > 15) throw new Error('格局第 ' + (i + 1) + ' 排超出範圍');
    return { count: count, start: start };
  });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
