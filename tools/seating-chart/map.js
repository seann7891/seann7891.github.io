// 學生端教室平面圖（可點選座位）。
import { totalRows, seatRow, seatKey, seatLabel } from './core.js';

// flipped=false：教師視角（講桌在下、第 1 排在左）；true：學生視角（講桌在上、左右相反）。
export function renderMap(el, { columns, lectern, flipped, cells, onPick }) {
  const n = columns.length;
  const rows = totalRows(columns);
  el.innerHTML = '';
  el.style.gridTemplateColumns = `repeat(${n}, minmax(0, 1fr))`;
  const gc = c => (flipped ? n - c + 1 : c);
  const gr = r => (flipped ? r + 2 : rows - r + 1);
  const add = (node, col, row) => {
    node.style.gridColumn = String(col);
    node.style.gridRow = String(row);
    el.appendChild(node);
  };
  columns.forEach((c, i) => {
    const col = i + 1;
    for (let pos = 1; pos <= c.count; pos++) {
      const info = cells(col, pos);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `cell ${info.cls || ''}`;
      b.textContent = info.text || '';
      b.setAttribute('aria-label', `${seatLabel(col, pos)}${info.text ? `：${info.text}` : '：空位'}`);
      b.dataset.key = seatKey(col, pos);
      const tag = document.createElement('span');
      tag.className = 'pos';
      tag.textContent = `${col}-${pos}`;
      b.appendChild(tag);
      b.addEventListener('click', () => onPick(col, pos));
      add(b, gc(col), gr(seatRow(columns, col, pos)));
    }
    const label = document.createElement('div');
    label.className = 'collabel';
    label.textContent = `第${col}排`;
    add(label, gc(col), flipped ? 1 : rows + 2);
  });
  const desk = document.createElement('div');
  desk.className = 'lectern';
  desk.textContent = '講桌';
  add(desk, gc(lectern), flipped ? 2 : rows + 1);
}
