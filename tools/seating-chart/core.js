// 座位表工具的共用邏輯（瀏覽器與測試共用，不碰 DOM）。
// 座位座標以教師視角計：左邊為第 1 排，每排最靠講桌（最下面）的座位為第 1 個。

export const DEFAULT_LAYOUT = '4/2, 5/1, 6/1, 6/1, 6/1, 5/1, 4/2';
export const DEFAULT_CADRES = ['班長', '副班長', '風紀', '副風紀', '學藝', '副學藝', '衛生', '副衛生', '資源', '副資源',
  '康樂', '資訊', '總務', '設備', '輔導', '圖書', '膳食', '副膳食', '國際事務', '班代表'];
export const DEFAULT_TUTORS = ['國文', '英文', '數學', '歷史', '公民', '物理', '化學', '生物', '音樂', '美術', '體育',
  '家政', '工設', '自然探究'];

export const MAX_COLUMNS = 12;
export const MAX_ROWS = 15;

// 格局字串：每排「座位數/第一個座位在第幾列」，以逗號分隔；省略 /列 表示從第 1 列開始。
export function parseLayout(text) {
  const tokens = String(text ?? '').split(/[,，、\s]+/).filter(Boolean);
  if (!tokens.length) throw new Error('格局不可空白');
  if (tokens.length > MAX_COLUMNS) throw new Error(`最多 ${MAX_COLUMNS} 排`);
  return tokens.map((t, i) => {
    const m = /^(\d+)(?:\/(\d+))?$/.exec(t);
    if (!m) throw new Error(`第 ${i + 1} 排格式錯誤：${t}`);
    const count = Number(m[1]);
    const start = m[2] ? Number(m[2]) : 1;
    if (count < 1 || start < 1 || start + count - 1 > MAX_ROWS) throw new Error(`第 ${i + 1} 排超出範圍：${t}`);
    return { count, start };
  });
}

export function formatLayout(columns) {
  return columns.map(c => `${c.count}/${c.start}`).join(', ');
}

export function totalRows(columns) {
  return Math.max(...columns.map(c => c.start + c.count - 1));
}

export function seatCount(columns) {
  return columns.reduce((s, c) => s + c.count, 0);
}

export function isValidSeat(columns, col, pos) {
  return Number.isInteger(col) && Number.isInteger(pos) && col >= 1 && col <= columns.length &&
    pos >= 1 && pos <= columns[col - 1].count;
}

// 從下往上數的列號（1 = 最靠講桌那一列）。
export function seatRow(columns, col, pos) {
  return columns[col - 1].start + pos - 1;
}

export function seatLabel(col, pos) {
  return `第 ${col} 排第 ${pos} 個`;
}

export function seatKey(col, pos) {
  return `${col}-${pos}`;
}

export function hasSeat(entry) {
  return entry && Number.isInteger(entry.col) && Number.isInteger(entry.pos);
}

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function splitList(value) {
  const items = Array.isArray(value) ? value : String(value ?? '').split(/[、,，;；\s]+/);
  const out = [];
  for (const raw of items) {
    const v = String(raw).trim();
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

// 解析「座號 姓名」文字，可接受：每行一筆、CSV、或「01號 王小明 02號 李小華」連在一起。
export function parseRosterText(text) {
  const re = /(\d{1,3})\s*號?[\s,，、:：\t]*([^\s\d,，、:：;；號]{1,12})/g;
  const map = new Map();
  for (const m of String(text ?? '').matchAll(re)) {
    const no = Number(m[1]);
    if (no >= 1 && no <= 200 && !map.has(no)) map.set(no, m[2]);
  }
  return [...map].map(([no, name]) => ({ no, name })).sort((a, b) => a.no - b.no);
}

export function formatRosterText(roster) {
  return roster.map(s => `${pad2(s.no)} ${s.name}`).join('\n');
}

// 整理填寫結果：座位佔用、衝突、未填、職位分配與問題清單。
export function summarize({ columns, roster, entries, cadres, tutors }) {
  const names = new Map(roster.map(s => [s.no, s.name]));
  const byNo = new Map();
  for (const e of entries) if (names.has(e.no)) byNo.set(e.no, e);

  const seats = new Map();
  const unseated = [];
  for (const s of roster) {
    const e = byNo.get(s.no);
    if (e && hasSeat(e) && isValidSeat(columns, e.col, e.pos)) {
      const k = seatKey(e.col, e.pos);
      if (!seats.has(k)) seats.set(k, []);
      seats.get(k).push(s.no);
    } else {
      unseated.push(s.no);
    }
  }
  const conflicts = [...seats].filter(([, nos]) => nos.length > 1).map(([key, nos]) => ({ key, nos }));
  const unfilled = roster.filter(s => !byNo.has(s.no)).map(s => s.no);
  const outOfLayout = [...byNo.values()].filter(e => hasSeat(e) && !isValidSeat(columns, e.col, e.pos)).map(e => e.no);

  const holders = (list, field) => {
    const m = new Map(list.map(r => [r, []]));
    for (const s of roster) {
      const e = byNo.get(s.no);
      if (!e) continue;
      for (const r of e[field] || []) if (m.has(r)) m.get(r).push(s.no);
    }
    return m;
  };
  const cadreHolders = holders(cadres, 'cadres');
  const tutorHolders = holders(tutors, 'tutors');

  return {
    names,
    byNo,
    seats,
    conflicts,
    unfilled,
    unseated,
    outOfLayout,
    cadreHolders,
    tutorHolders,
    cadreEmpty: cadres.filter(r => cadreHolders.get(r).length === 0),
    cadreMulti: cadres.filter(r => cadreHolders.get(r).length > 1),
    tutorEmpty: tutors.filter(r => tutorHolders.get(r).length === 0),
  };
}

// 教師端移動座位：把 no 移到 (col,pos)。若該位置剛好只有另一位學生：
// 原座位只有自己時兩人交換；原座位是重複座位（或沒有座位）時，對方改為沒有座位，避免製造新的重複。
export function moveStudent(entries, no, col, pos, columns) {
  const list = entries.map(e => ({ ...e }));
  let me = list.find(e => e.no === no);
  if (!me) {
    me = { no, col: null, pos: null, cadres: [], tutors: [] };
    list.push(me);
  }
  const others = list.filter(e => e.no !== no && e.col === col && e.pos === pos);
  const changed = [no];
  if (others.length === 1) {
    const alone = hasSeat(me) && isValidSeat(columns, me.col, me.pos) &&
      !list.some(e => e.no !== no && e.col === me.col && e.pos === me.pos);
    const from = alone ? [me.col, me.pos] : [null, null];
    others[0].col = from[0];
    others[0].pos = from[1];
    changed.push(others[0].no);
  }
  me.col = col;
  me.pos = pos;
  return { entries: list, changed };
}

// 從 PDF 文字與圖片位置找出名單與對應照片。
// items: [{str, x, y}]（PDF 座標，y 向上）；images: [{x, y, w, h}]。
export function matchPdfRoster(items, images) {
  const lines = new Map();
  for (const it of items) {
    if (!String(it.str).trim()) continue;
    const y = Math.round(it.y);
    if (!lines.has(y)) lines.set(y, []);
    lines.get(y).push(it);
  }
  const found = [];
  for (const [y, list] of lines) {
    list.sort((a, b) => a.x - b.x);
    for (let i = 0; i < list.length; i++) {
      const m = /^(\d{1,3})號\s*(\S*)$/.exec(list[i].str.trim());
      if (!m) continue;
      let name = m[2];
      if (!name && list[i + 1] && !/號$/.test(list[i + 1].str.trim())) name = list[i + 1].str.trim();
      if (!name) continue;
      found.push({ no: Number(m[1]), name, x: list[i].x, y });
    }
  }
  const used = new Set();
  const result = [];
  for (const f of found.sort((a, b) => a.no - b.no)) {
    if (result.some(r => r.no === f.no)) continue;
    let best = -1;
    let bestD = Infinity;
    images.forEach((im, idx) => {
      if (used.has(idx)) return;
      const gap = im.y - f.y; // 照片底部到文字基線
      const dx = Math.abs(im.x - f.x);
      if (gap < -2 || gap > 40 || dx > Math.max(20, im.w)) return;
      const d = dx + gap;
      if (d < bestD) { bestD = d; best = idx; }
    });
    if (best >= 0) used.add(best);
    result.push({ no: f.no, name: f.name, image: best });
  }
  return result;
}
