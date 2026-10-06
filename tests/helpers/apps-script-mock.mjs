// 在 Node 裡模擬 Google Apps Script（試算表、ContentService 等），用來測試 tools/seating-chart/apps-script.gs。
import fs from 'node:fs';
import vm from 'node:vm';

class Range {
  constructor(sheet, row, col, rows, cols) {
    Object.assign(this, { sheet, row, col, rows, cols });
  }
  getValues() {
    const out = [];
    for (let r = 0; r < this.rows; r++) {
      const line = [];
      for (let c = 0; c < this.cols; c++) line.push(this.sheet.data[this.row - 1 + r]?.[this.col - 1 + c] ?? '');
      out.push(line);
    }
    return out;
  }
  getDisplayValues() {
    return this.getValues().map(r => r.map(v => (v instanceof Date ? v.toISOString() : String(v))));
  }
  setValues(values) {
    if (values.length !== this.rows || values.some(r => r.length !== this.cols)) throw new Error('range size mismatch');
    values.forEach((line, r) => line.forEach((v, c) => {
      const rr = this.row - 1 + r;
      while (this.sheet.data.length <= rr) this.sheet.data.push([]);
      this.sheet.data[rr][this.col - 1 + c] = v;
    }));
    return this;
  }
  clearContent() {
    this.setValues(Array.from({ length: this.rows }, () => Array(this.cols).fill('')));
    return this;
  }
  setNumberFormat() { return this; }
}

class Sheet {
  constructor(name) { this.name = name; this.data = []; }
  getLastRow() {
    for (let r = this.data.length; r > 0; r--) if ((this.data[r - 1] || []).some(v => v !== '' && v !== undefined)) return r;
    return 0;
  }
  getRange(row, col, rows = 1, cols = 1) { return new Range(this, row, col, rows, cols); }
  setFrozenRows() {}
  rows() { return this.data.slice(1, this.getLastRow()); }
}

export function loadAppsScript(teacherPassword = 'teach1234') {
  const url = new URL('../../tools/seating-chart/apps-script.gs', import.meta.url);
  let source = fs.readFileSync(url, 'utf8');
  if (teacherPassword !== null) {
    source = source.replace("const TEACHER_PASSWORD = '請改成教師密碼';", `const TEACHER_PASSWORD = ${JSON.stringify(teacherPassword)};`);
  }
  const sheets = new Map();
  const ss = {
    getSheetByName: name => sheets.get(name) || null,
    insertSheet: name => { const s = new Sheet(name); sheets.set(name, s); return s; },
  };
  const context = vm.createContext({
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    ContentService: {
      createTextOutput: text => ({ text, setMimeType() { return this; } }),
      MimeType: { JSON: 'application/json' },
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: { sleep() {} },
    Logger: { log() {} },
  });
  vm.runInContext(source, context, { filename: 'apps-script.gs' });
  return {
    context,
    sheets,
    setup: () => context.setup(),
    post: body => JSON.parse(context.doPost({ postData: { contents: JSON.stringify(body) } }).text),
    get: () => JSON.parse(context.doGet().text),
  };
}
