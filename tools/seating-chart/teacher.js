import { call, apiUrl, diagnose } from './api.js';
import {
  DEFAULT_LAYOUT, DEFAULT_CADRES, DEFAULT_TUTORS, MAX_COLUMNS, MAX_ROWS,
  parseLayout, formatLayout, totalRows, seatRow, seatKey, seatLabel, isValidSeat, hasSeat, seatCount,
  pad2, splitList, parseRosterText, formatRosterText, summarize, moveStudent,
} from './core.js';
import { renderMap } from './map.js';
import { loadPhotos, savePhotos, clearPhotos, readPhotoFiles, readRosterPdf, fileToUploadPhoto } from './photos.js';

const $ = id => document.getElementById(id);
const PW_KEY = 'seating-chart:teacher';
const PHOTO_PREF = 'seating-chart:show-photos';

const state = {
  pw: '',
  config: null,
  columns: [],
  classPassword: '',
  roster: [],
  entries: [],
  dirty: new Set(),
  selected: null,
  photos: new Map(), // 這台電腦上的照片（從 PDF 或照片檔匯入）
  serverPhotos: {}, // 學生上傳、存在試算表的照片，優先使用
  preview: null,
};

function setMsg(el, text, cls = '') {
  el.textContent = text;
  el.className = `msg ${cls}`;
}
function store(kind, key, value) {
  try {
    if (value === undefined) return window[kind].getItem(key);
    if (value === null) window[kind].removeItem(key);
    else window[kind].setItem(key, value);
  } catch { /* 瀏覽器不允許儲存 */ }
  return null;
}
const nameOf = no => state.roster.find(s => s.no === no)?.name || `${no}號`;
const entryOf = no => state.entries.find(e => e.no === no);
const photoOf = no => state.serverPhotos[no] || state.photos.get(no);
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'style') node.setAttribute('style', v);
    else node[k] = v;
  }
  for (const c of children) if (c !== null && c !== undefined) node.append(c);
  return node;
}

// ---------- 分頁 ----------

function showTab(name) {
  for (const b of document.querySelectorAll('#tabs button')) b.setAttribute('aria-selected', String(b.dataset.tab === name));
  for (const p of document.querySelectorAll('[data-panel]')) p.hidden = p.dataset.panel !== name;
}
$('tabs').addEventListener('click', e => {
  const b = e.target.closest('button[data-tab]');
  if (b) showTab(b.dataset.tab);
});

// ---------- 載入 ----------

function apply(data) {
  state.config = data.config;
  state.columns = parseLayout(data.config.layout);
  state.classPassword = data.classPassword;
  state.roster = data.roster;
  state.entries = data.entries.map(e => ({ ...e }));
  if (data.photos) state.serverPhotos = data.photos;
  state.dirty.clear();
  state.selected = null;
  updateStatus();
  renderAll();
  fillSettings();
}

function updateStatus() {
  const c = state.config;
  if (!c) return;
  const filled = state.entries.filter(e => state.roster.some(s => s.no === e.no)).length;
  $('status').textContent = `${c.title}｜${c.open ? '開放填寫中' : '目前不開放填寫'}｜已填 ${filled} / ${state.roster.length} 人`;
}

async function login(pw) {
  setMsg($('loginMsg'), '連線中…');
  $('loginBtn').disabled = true;
  try {
    const data = await call('teacher.load', { teacherPassword: pw });
    state.pw = pw;
    store('sessionStorage', PW_KEY, pw);
    $('login').hidden = true;
    $('tabs').hidden = false;
    apply(data);
    showTab(state.roster.length ? 'chart' : 'roster');
    if (!state.roster.length) setMsg($('pdfMsg'), '試算表裡還沒有名單，請先匯入。', 'warn');
  } catch (err) {
    setMsg($('loginMsg'), err.message, 'err');
    store('sessionStorage', PW_KEY, null);
  } finally {
    $('loginBtn').disabled = false;
  }
}

async function refresh() {
  if (state.dirty.size && !confirm('有變更還沒儲存，重新整理會放棄這些變更。確定嗎？')) return;
  setMsg($('chartMsg'), '更新中…');
  try {
    apply(await call('teacher.load', { teacherPassword: state.pw }));
    setMsg($('chartMsg'), '已更新', 'ok');
  } catch (err) {
    setMsg($('chartMsg'), err.message, 'err');
  }
}

// ---------- 座位表 ----------

function renderAll() {
  renderSheet();
  renderSide();
  renderRoster();
}

function rolesText(list) {
  return list.join('、');
}

function renderSheet() {
  const { columns, config } = state;
  const showPhotos = $('showPhotos').checked;
  const sum = summarize({ columns, roster: state.roster, entries: state.entries, cadres: config.cadres, tutors: config.tutors });
  state.summary = sum;
  $('sheetTitle').textContent = config.title;
  $('sheet').classList.toggle('with-photos', showPhotos);

  const chart = $('chart');
  chart.innerHTML = '';
  const n = columns.length;
  const rows = totalRows(columns);
  chart.style.gridTemplateColumns = `repeat(${n}, minmax(0, 1fr))`;
  columns.forEach((c, i) => {
    const col = i + 1;
    for (let pos = 1; pos <= c.count; pos++) {
      const nos = sum.seats.get(seatKey(col, pos)) || [];
      const occs = el('div', { class: 'occs', dataset: { label: `${col}-${pos}` } });
      for (const no of nos) {
        const e = sum.byNo.get(no);
        const rl = rolesText(e.cadres);
        const occ = el('div', { class: `occ${state.selected === no ? ' selected' : ''}`, dataset: { no } });
        if (showPhotos) {
          const url = photoOf(no);
          occ.append(url ? el('img', { class: 'ph', src: url, alt: nameOf(no) }) : el('div', { class: 'ph none', textContent: '無照片' }));
        } else if (nos.length > 1) {
          occ.append(el('div', { class: 'nm', textContent: nameOf(no) }));
        }
        occ.append(el('div', { class: `rl${rl.length > 5 ? ' long' : ''}`, textContent: rl }));
        occs.append(occ);
      }
      const label = nos.map(no => `${no} ${nameOf(no)}`).join(' / ');
      const seat = el('div', {
        class: `seat${nos.length ? '' : ' empty'}${nos.length > 1 ? ' conflict' : ''}${state.selected ? ' drop-target' : ''}`,
        dataset: { col, pos },
        title: `${seatLabel(col, pos)}${label ? `：${label}` : ''}`,
        style: `grid-column:${col};grid-row:${rows - seatRow(columns, col, pos) + 1}`,
      }, occs, el('div', { class: `no${nos.length > 1 ? ' multi' : ''}`, textContent: label }));
      chart.append(seat);
    }
  });
  chart.append(el('div', { class: 'lectern-box', textContent: '講桌', style: `grid-column:${config.lectern};grid-row:${rows + 1}` }));

  renderTables(sum);
}

function renderTables(sum) {
  const { cadres, tutors } = state.config;
  const half = Math.ceil(cadres.length / 2);
  const holderCells = role => {
    const nos = sum.cadreHolders.get(role) || [];
    return [el('td', { class: 'n', textContent: nos.join('、') }), el('td', { textContent: nos.map(nameOf).join('、') })];
  };
  const cols = widths => el('colgroup', {}, ...widths.map(w => el('col', { style: `width:${w}%` })));
  const cadreTable = el('table', { class: 'fixed' }, el('caption', { textContent: '幹部' }), cols([16, 8, 26, 16, 8, 26]));
  const tbody = el('tbody');
  for (let i = 0; i < half; i++) {
    const tr = el('tr');
    for (const role of [cadres[i], cadres[i + half]]) {
      if (role === undefined) tr.append(el('td'), el('td'), el('td'));
      else tr.append(el('th', { textContent: role }), ...holderCells(role));
    }
    tbody.append(tr);
  }
  cadreTable.append(tbody);

  const tutorTable = el('table', { class: 'fixed' }, el('caption', { textContent: '小老師' }), cols([20, 80]));
  const tb2 = el('tbody');
  for (const subject of tutors) {
    const nos = sum.tutorHolders.get(subject) || [];
    tb2.append(el('tr', {}, el('th', { textContent: subject }), el('td', { textContent: nos.map(no => `${no} ${nameOf(no)}`).join('　') })));
  }
  tutorTable.append(tb2);
  $('tables').replaceChildren(cadreTable, tutorTable);
}

function renderSide() {
  const sum = state.summary;
  // 還沒有座位
  const tray = $('tray');
  tray.innerHTML = '';
  if (!sum.unseated.length) tray.append(el('span', { class: 'small issue-ok', textContent: '全部都有座位' }));
  for (const no of sum.unseated) {
    tray.append(el('button', {
      type: 'button',
      class: state.selected === no ? 'selected' : '',
      textContent: `${pad2(no)} ${nameOf(no)}${sum.byNo.has(no) ? '' : '（未填）'}`,
      onclick: () => select(state.selected === no ? null : no),
    }));
  }

  // 檢查
  const box = $('issues');
  box.innerHTML = '';
  const item = (cls, title, list) => {
    box.append(el('div', { class: cls, textContent: title }));
    if (list && list.length) box.append(el('ul', {}, ...list.map(t => el('li', { textContent: t }))));
  };
  const filled = state.roster.length - sum.unfilled.length;
  item(sum.unfilled.length ? 'issue-warn' : 'issue-ok', `已填 ${filled} / ${state.roster.length} 人（座位共 ${seatCount(state.columns)} 個）`);
  if (sum.unfilled.length) item('issue-warn', '還沒填：', [sum.unfilled.map(no => `${pad2(no)} ${nameOf(no)}`).join('、')]);
  if (sum.conflicts.length) {
    item('issue-bad', '座位重複：', sum.conflicts.map(c => {
      const [col, pos] = c.key.split('-').map(Number);
      return `${seatLabel(col, pos)}：${c.nos.map(nameOf).join('、')}`;
    }));
  }
  const noSeat = sum.unseated.filter(no => sum.byNo.has(no) && !sum.outOfLayout.includes(no));
  if (noSeat.length) item('issue-warn', '填了但沒有座位：', [noSeat.map(nameOf).join('、')]);
  if (sum.outOfLayout.length) item('issue-bad', '座位不在目前格局內：', [sum.outOfLayout.map(nameOf).join('、')]);
  if (sum.cadreMulti.length) {
    item('issue-bad', '幹部重複：', sum.cadreMulti.map(r => `${r}：${sum.cadreHolders.get(r).map(nameOf).join('、')}`));
  }
  if (sum.cadreEmpty.length) item('issue-warn', '幹部沒人：', [sum.cadreEmpty.join('、')]);
  if (sum.tutorEmpty.length) item('issue-warn', '小老師沒人：', [sum.tutorEmpty.join('、')]);
  if (!sum.conflicts.length && !sum.outOfLayout.length && !sum.cadreMulti.length) item('issue-ok', '座位與幹部都沒有重複');

  // 編輯區
  const no = state.selected;
  $('editorBody').hidden = !no;
  $('editorHint').hidden = !!no;
  if (no) {
    const e = entryOf(no);
    $('selName').textContent = `${pad2(no)} ${nameOf(no)}`;
    $('selSeat').textContent = e && hasSeat(e) && isValidSeat(state.columns, e.col, e.pos)
      ? `目前：${seatLabel(e.col, e.pos)}。點另一個座位可移動或互換。`
      : '目前沒有座位。點座位表上的位置放進去。';
    roleBoxes($('selCadres'), 'cadres', e);
    roleBoxes($('selTutors'), 'tutors', e);
    const url = photoOf(no);
    $('selPhoto').hidden = !url;
    if (url) $('selPhoto').src = url;
    $('selPhotoInfo').textContent = state.serverPhotos[no] ? '照片：學生上傳（存在試算表）'
      : url ? '照片：這台電腦上的照片' : '照片：沒有';
    $('deletePhoto').hidden = !state.serverPhotos[no];
  }

  $('saveEntries').disabled = !state.dirty.size;
  $('saveEntries').textContent = state.dirty.size ? `儲存變更（${state.dirty.size} 人）` : '儲存變更';
}

function roleBoxes(box, field, entry) {
  box.innerHTML = '';
  for (const role of state.config[field]) {
    const input = el('input', { type: 'checkbox', value: role, checked: !!entry?.[field]?.includes(role) });
    input.addEventListener('change', () => {
      const e = ensureEntry(state.selected);
      e[field] = state.config[field].filter(r => r === role ? input.checked : e[field].includes(r));
      markDirty(e.no);
    });
    box.append(el('label', {}, input, ` ${role}`));
  }
}

function ensureEntry(no) {
  let e = entryOf(no);
  if (!e) {
    e = { no, col: null, pos: null, cadres: [], tutors: [] };
    state.entries.push(e);
  }
  return e;
}

function markDirty(...nos) {
  for (const no of nos) state.dirty.add(no);
  renderSheet();
  renderSide();
}

function select(no) {
  state.selected = no;
  renderSheet();
  renderSide();
}

$('chart').addEventListener('click', e => {
  const occ = e.target.closest('.occ');
  const seat = e.target.closest('.seat');
  if (!seat) return;
  const col = Number(seat.dataset.col);
  const pos = Number(seat.dataset.pos);
  const sel = state.selected;
  if (!sel) {
    if (occ) select(Number(occ.dataset.no));
    return;
  }
  const mine = entryOf(sel);
  if (mine && mine.col === col && mine.pos === pos) {
    select(occ && Number(occ.dataset.no) !== sel ? Number(occ.dataset.no) : null);
    return;
  }
  const { entries, changed } = moveStudent(state.entries, sel, col, pos, state.columns);
  state.entries = entries;
  state.selected = null;
  markDirty(...changed);
});

$('unseat').addEventListener('click', () => {
  const e = ensureEntry(state.selected);
  e.col = null;
  e.pos = null;
  markDirty(e.no);
});
$('deselect').addEventListener('click', () => select(null));

async function savePhoto(no, photo) {
  setMsg($('chartMsg'), '照片儲存中…');
  try {
    const data = await call('teacher.savePhoto', { teacherPassword: state.pw, no, photo });
    // 保留尚未儲存的座位變更
    state.serverPhotos = data.photos || {};
    renderSheet();
    renderSide();
    renderRoster();
    setMsg($('chartMsg'), '照片已儲存', 'ok');
  } catch (err) {
    setMsg($('chartMsg'), err.message, 'err');
  }
}
$('replacePhoto').addEventListener('change', async e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file || !state.selected) return;
  try {
    await savePhoto(state.selected, await fileToUploadPhoto(file));
  } catch (err) {
    setMsg($('chartMsg'), err.message, 'err');
  }
});
$('deletePhoto').addEventListener('click', () => {
  if (state.selected && confirm(`刪除 ${nameOf(state.selected)} 上傳的照片？`)) savePhoto(state.selected, null);
});

$('saveEntries').addEventListener('click', async () => {
  const list = [...state.dirty].map(no => entryOf(no)).filter(Boolean)
    .map(e => ({ no: e.no, col: e.col, pos: e.pos, cadres: e.cadres, tutors: e.tutors }));
  setMsg($('chartMsg'), '儲存中…');
  $('saveEntries').disabled = true;
  try {
    apply(await call('teacher.saveEntries', { teacherPassword: state.pw, entries: list }));
    setMsg($('chartMsg'), '已儲存', 'ok');
  } catch (err) {
    setMsg($('chartMsg'), err.message, 'err');
    $('saveEntries').disabled = false;
  }
});

$('refresh').addEventListener('click', refresh);
$('showPhotos').addEventListener('change', () => {
  store('localStorage', PHOTO_PREF, $('showPhotos').checked ? '1' : '0');
  renderSheet();
});
$('print').addEventListener('click', () => {
  if (state.selected) select(null);
  window.print();
});
window.addEventListener('beforeunload', e => {
  if (state.dirty.size) e.preventDefault();
});

// ---------- 名單與照片 ----------

function photoFigure(no, name, url) {
  return el('figure', {},
    url ? el('img', { src: url, alt: name }) : el('div', { class: 'noimg' }),
    el('figcaption', { textContent: `${pad2(no)} ${name}` }));
}

function renderRoster() {
  const uploaded = state.roster.filter(s => state.serverPhotos[s.no]).length;
  const local = state.roster.filter(s => !state.serverPhotos[s.no] && state.photos.has(s.no)).length;
  $('rosterInfo').textContent = state.roster.length
    ? `共 ${state.roster.length} 人：${uploaded} 人用學生上傳的照片，${local} 人用這台電腦上的照片，${state.roster.length - uploaded - local} 人沒有照片。`
    : '還沒有名單。';
  $('rosterGrid').replaceChildren(...state.roster.map(s => photoFigure(s.no, s.name, photoOf(s.no))));
  if (!$('rosterText').value) $('rosterText').value = formatRosterText(state.roster);
}

function showPreview(roster, photos, source) {
  state.preview = { roster, photos };
  $('preview').hidden = false;
  setMsg($('useMsg'), '');
  const removed = state.roster.filter(s => !roster.some(r => r.no === s.no));
  const info = [`${source}：${roster.length} 人`];
  if (photos) info.push(`${photos.size} 張照片`);
  if (removed.length && state.roster.length) info.push(`目前名單裡有 ${removed.length} 人不在這份名單中`);
  $('previewInfo').textContent = info.join('，');
  $('previewGrid').replaceChildren(...roster.map(s => photoFigure(s.no, s.name, state.serverPhotos[s.no] || photos?.get(s.no) || state.photos.get(s.no))));
  $('preview').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

$('pdfFile').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  setMsg($('pdfMsg'), '讀取 PDF 中…');
  try {
    const { roster, photos } = await readRosterPdf(file);
    if (!roster.length) throw new Error('沒有在 PDF 裡找到「座號號 姓名」格式的名單');
    setMsg($('pdfMsg'), '');
    showPreview(roster, photos, 'PDF');
  } catch (err) {
    setMsg($('pdfMsg'), `讀取失敗：${err.message}`, 'err');
  }
  e.target.value = '';
});

$('parseText').addEventListener('click', () => {
  const roster = parseRosterText($('rosterText').value);
  if (!roster.length) return setMsg($('useMsg'), '沒有解析到名單', 'err');
  showPreview(roster, null, '手動輸入');
});

$('cancelPreview').addEventListener('click', () => {
  state.preview = null;
  $('preview').hidden = true;
});

$('useRoster').addEventListener('click', async () => {
  const { roster, photos } = state.preview;
  setMsg($('useMsg'), '儲存中…');
  $('useRoster').disabled = true;
  try {
    const data = await call('teacher.saveRoster', { teacherPassword: state.pw, roster });
    let note = '';
    if (photos && photos.size) {
      state.photos = new Map(photos);
      note = (await savePhotos(photos, true)) ? '，照片已存在這台電腦' : '，但這個瀏覽器不允許儲存照片，關掉頁面後要重新匯入';
    }
    $('rosterText').value = formatRosterText(roster);
    apply(data);
    state.preview = null;
    $('preview').hidden = true;
    setMsg($('pdfMsg'), `名單已存到試算表${note}。`, 'ok');
  } catch (err) {
    setMsg($('useMsg'), err.message, 'err');
  } finally {
    $('useRoster').disabled = false;
  }
});

$('photoFiles').addEventListener('change', async e => {
  const { map, skipped } = await readPhotoFiles([...e.target.files]);
  for (const [no, url] of map) state.photos.set(no, url);
  const saved = await savePhotos(map, false);
  setMsg($('photoMsg'), `加入 ${map.size} 張照片${skipped.length ? `，略過：${skipped.join('、')}` : ''}${saved ? '' : '（這個瀏覽器不允許儲存，關掉頁面後會消失）'}`, map.size ? 'ok' : 'warn');
  e.target.value = '';
  renderRoster();
  renderSheet();
});

$('clearPhotos').addEventListener('click', async () => {
  if (!confirm('確定清除這台電腦上的所有照片？')) return;
  await clearPhotos();
  state.photos = new Map();
  setMsg($('photoMsg'), '已清除', 'ok');
  renderRoster();
  renderSheet();
});

// ---------- 設定 ----------

let draftColumns = [];

function fillSettings() {
  const c = state.config;
  $('setTitle').value = c.title;
  $('setClassPw').value = state.classPassword;
  $('setOpen').checked = c.open;
  draftColumns = state.columns.map(x => ({ ...x }));
  $('setCadres').value = c.cadres.join('、');
  $('setTutors').value = c.tutors.join('、');
  drawLayoutEditor(c.lectern);
}

function drawLayoutEditor(lectern) {
  $('setCols').value = draftColumns.length;
  const box = $('layoutCols');
  box.innerHTML = '';
  draftColumns.forEach((c, i) => {
    const count = el('input', { type: 'number', min: 1, max: MAX_ROWS, value: c.count });
    const start = el('input', { type: 'number', min: 1, max: MAX_ROWS, value: c.start });
    const update = () => {
      c.count = Math.max(1, Number(count.value) || 1);
      c.start = Math.max(1, Number(start.value) || 1);
      drawLayoutPreview();
    };
    count.addEventListener('input', update);
    start.addEventListener('input', update);
    box.append(el('label', {}, `第${i + 1}排 `, count, ' 個，從第 ', start, ' 列開始'));
  });
  const sel = $('setLectern');
  sel.innerHTML = '';
  draftColumns.forEach((_, i) => sel.append(el('option', { value: i + 1, textContent: i + 1 })));
  sel.value = String(Math.min(lectern || 1, draftColumns.length));
  drawLayoutPreview();
}

function drawLayoutPreview() {
  const box = $('layoutPreview');
  let cols;
  try {
    cols = parseLayout(formatLayout(draftColumns));
  } catch (err) {
    box.replaceChildren(el('p', { class: 'msg err', textContent: err.message }));
    return;
  }
  renderMap(box, {
    columns: cols,
    lectern: Number($('setLectern').value) || 1,
    flipped: false,
    cells: () => ({}),
    onPick: () => {},
  });
  box.append(el('p', { class: 'small muted', style: 'grid-column:1/-1', textContent: `共 ${seatCount(cols)} 個座位，名單 ${state.roster.length} 人` }));
}

$('setCols').addEventListener('input', () => {
  const n = Math.min(MAX_COLUMNS, Math.max(1, Number($('setCols').value) || 1));
  while (draftColumns.length < n) draftColumns.push({ count: 6, start: 1 });
  draftColumns.length = n;
  drawLayoutEditor(Number($('setLectern').value));
});
$('setLectern').addEventListener('change', drawLayoutPreview);

$('resetDefaults').addEventListener('click', () => {
  draftColumns = parseLayout(DEFAULT_LAYOUT);
  $('setCadres').value = DEFAULT_CADRES.join('、');
  $('setTutors').value = DEFAULT_TUTORS.join('、');
  drawLayoutEditor(4);
});

$('settingsForm').addEventListener('submit', async e => {
  e.preventDefault();
  let layout;
  try {
    layout = formatLayout(parseLayout(formatLayout(draftColumns)));
  } catch (err) {
    return setMsg($('settingsMsg'), err.message, 'err');
  }
  const config = {
    title: $('setTitle').value.trim(),
    classPassword: $('setClassPw').value.trim(),
    open: $('setOpen').checked,
    layout,
    lectern: Number($('setLectern').value),
    cadres: splitList($('setCadres').value),
    tutors: splitList($('setTutors').value),
  };
  if (config.open && !config.classPassword) return setMsg($('settingsMsg'), '開放填寫前要先設定班級密碼', 'err');
  if (state.dirty.size && !confirm('座位表有變更還沒儲存，儲存設定會放棄那些變更。確定嗎？')) return;
  setMsg($('settingsMsg'), '儲存中…');
  try {
    apply(await call('teacher.saveConfig', { teacherPassword: state.pw, config }));
    setMsg($('settingsMsg'), '已儲存', 'ok');
  } catch (err) {
    setMsg($('settingsMsg'), err.message, 'err');
  }
});

// ---------- 架設 ----------

$('apiInfo').textContent = apiUrl ? `後端網址：${apiUrl}` : '還沒設定後端網址（config.js 的 API_URL 是空的），請照下面步驟架設。';
$('ping').addEventListener('click', async () => {
  setMsg($('pingMsg'), '測試中…');
  const r = await diagnose();
  setMsg($('pingMsg'), r.text, r.ok ? 'ok' : 'err');
});
$('copyCode').addEventListener('click', async () => {
  try {
    const text = await (await fetch('apps-script.gs')).text();
    await navigator.clipboard.writeText(text);
    setMsg($('copyMsg'), '已複製', 'ok');
  } catch {
    setMsg($('copyMsg'), '無法複製，請改用下載', 'err');
  }
});

// ---------- 啟動 ----------

$('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  login($('teacherPw').value);
});

(async () => {
  $('showPhotos').checked = store('localStorage', PHOTO_PREF) !== '0';
  state.photos = await loadPhotos();
  if (!apiUrl) {
    $('status').textContent = '尚未接上後端';
    $('tabs').hidden = true;
    showTab('setup');
    return;
  }
  $('tabs').hidden = true;
  for (const p of document.querySelectorAll('[data-panel]')) p.hidden = true;
  $('login').hidden = false;
  const saved = store('sessionStorage', PW_KEY);
  if (saved) {
    $('teacherPw').value = saved;
    login(saved);
  }
})();
