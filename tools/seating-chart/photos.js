// 照片只存在這台電腦的瀏覽器（IndexedDB），不會上傳。
import { matchPdfRoster } from './core.js';

const DB_NAME = 'seating-chart';
const STORE = 'photos';
const PHOTO_W = 160;
const PHOTO_H = 200;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
  });
}

export async function loadPhotos() {
  const map = new Map();
  try {
    const db = await openDb();
    await tx(db, 'readonly', store => {
      const req = store.openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (c) { map.set(Number(c.key), c.value); c.continue(); }
      };
    });
    db.close();
  } catch { /* 瀏覽器不允許儲存時就只用記憶體 */ }
  return map;
}

// 回傳 true 表示已存進瀏覽器；false 表示只能暫存在這次開啟的頁面。
export async function savePhotos(map, replace) {
  try {
    const db = await openDb();
    await tx(db, 'readwrite', store => {
      if (replace) store.clear();
      for (const [no, url] of map) store.put(url, no);
    });
    db.close();
    return true;
  } catch {
    return false;
  }
}

export async function clearPhotos() {
  try {
    const db = await openDb();
    await tx(db, 'readwrite', store => store.clear());
    db.close();
  } catch { /* ignore */ }
}

function toPortrait(source, sx, sy, sw, sh) {
  const canvas = document.createElement('canvas');
  canvas.width = PHOTO_W;
  canvas.height = PHOTO_H;
  const ctx = canvas.getContext('2d');
  const scale = Math.max(PHOTO_W / sw, PHOTO_H / sh);
  const w = PHOTO_W / scale;
  const h = PHOTO_H / scale;
  ctx.drawImage(source, sx + (sw - w) / 2, sy + (sh - h) / 2, w, h, 0, 0, PHOTO_W, PHOTO_H);
  return canvas.toDataURL('image/jpeg', 0.85);
}

// 照片檔：檔名裡的第一個數字當作座號，例如 01.jpg、07_陳大文.png。
export async function readPhotoFiles(files) {
  const map = new Map();
  const skipped = [];
  for (const file of files) {
    const m = /(\d{1,3})/.exec(file.name);
    if (!m) { skipped.push(file.name); continue; }
    try {
      const bmp = await createImageBitmap(file);
      map.set(Number(m[1]), toPortrait(bmp, 0, 0, bmp.width, bmp.height));
      bmp.close();
    } catch {
      skipped.push(file.name);
    }
  }
  return { map, skipped };
}

const mul = (a, b) => [
  a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
];

// 學校「導師班級照片名冊」PDF：讀出座號、姓名，並從版面裁出每個人的照片。
export async function readRosterPdf(file) {
  const pdfjs = await import('./lib/pdfjs/pdf.min.js');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('./lib/pdfjs/pdf.worker.min.js', import.meta.url).href;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
  const roster = [];
  const photos = new Map();
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const text = await page.getTextContent();
    const items = text.items.map(it => ({ str: it.str, x: it.transform[4], y: it.transform[5] }));
    const ops = await page.getOperatorList();
    const O = pdfjs.OPS;
    const images = [];
    let ctm = [1, 0, 0, 1, 0, 0];
    const stack = [];
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      if (fn === O.save) stack.push(ctm);
      else if (fn === O.restore) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
      else if (fn === O.transform) ctm = mul(ctm, ops.argsArray[i]);
      else if (fn === O.paintImageXObject || fn === O.paintInlineImageXObject) {
        const [a, , , d, e, f] = ctm;
        images.push({ x: Math.min(e, e + a), y: Math.min(f, f + d), w: Math.abs(a), h: Math.abs(d) });
      }
    }
    const real = images.filter(im => im.w > 20 && im.h > 20);
    const found = matchPdfRoster(items, real);
    if (found.some(f => f.image >= 0)) {
      const viewport = page.getViewport({ scale: 3 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      for (const f of found) {
        if (f.image < 0) continue;
        const im = real[f.image];
        const [x1, y1, x2, y2] = viewport.convertToViewportRectangle([im.x, im.y, im.x + im.w, im.y + im.h]);
        const sx = Math.min(x1, x2);
        const sy = Math.min(y1, y2);
        photos.set(f.no, toPortrait(canvas, sx, sy, Math.abs(x2 - x1), Math.abs(y2 - y1)));
      }
    }
    for (const f of found) if (!roster.some(s => s.no === f.no)) roster.push({ no: f.no, name: f.name });
  }
  roster.sort((a, b) => a.no - b.no);
  return { roster, photos };
}
