import { API_URL } from './config.js';

// 測試用：允許以 ?api= 指定 Apps Script 或本機網址，其他網址一律忽略。
function resolveApiUrl() {
  try {
    const override = new URLSearchParams(location.search).get('api');
    if (override && /^(https:\/\/script\.google\.com\/macros\/s\/|http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/)/.test(override)) {
      return override;
    }
  } catch { /* ignore */ }
  return API_URL;
}

export const apiUrl = resolveApiUrl();

const NO_ACCESS = '連不上後端。請用無痕視窗打開 Apps Script 網址：如果要求登入 Google，代表部署的「誰可以存取」不是「所有人」'
  + '（例如選成「所有已登入 Google 帳戶的使用者」），要改成「所有人」並部署新版本。';

// 先用 POST；瀏覽器擋下時改用 GET（資料放在 ?p=），兩者後端都接受。
let transport = 'post';

function send(body, method) {
  if (method === 'get') {
    const sep = apiUrl.includes('?') ? '&' : '?';
    return fetch(`${apiUrl}${sep}p=${encodeURIComponent(body)}&t=${Date.now()}`, { redirect: 'follow', cache: 'no-store' });
  }
  // 不設 Content-Type（預設 text/plain），避免瀏覽器先送 CORS 預檢，Apps Script 不支援預檢。
  return fetch(apiUrl, { method: 'POST', body, redirect: 'follow', cache: 'no-store' });
}

async function parse(res, action) {
  if (!res.ok) throw new Error(`後端回應錯誤（HTTP ${res.status}）`);
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('後端回應的不是資料（可能是 Google 登入頁），請確認部署的「誰可以存取」是「所有人」');
  }
  if (data.service === 'seating-chart' && action !== 'ping') {
    throw new Error('後端程式碼是舊版，請把最新的 apps-script.gs 貼進 Apps Script，並在「管理部署作業」部署新版本');
  }
  if (!data.ok) throw new Error(data.error || '發生錯誤');
  return data;
}

export async function call(action, payload = {}) {
  if (!apiUrl) throw new Error('這個工具還沒接上後端（config.js 的 API_URL 是空的）');
  const body = JSON.stringify({ action, ...payload });
  let res;
  try {
    res = await send(body, transport);
  } catch {
    if (transport === 'get') throw new Error(NO_ACCESS);
    try {
      res = await send(body, 'get');
      transport = 'get';
    } catch {
      throw new Error(NO_ACCESS);
    }
  }
  return parse(res, action);
}

// 逐項檢查連線，回傳可讀的結果（給「測試連線」用）。
export async function diagnose() {
  const lines = [];
  const probe = async (label, fn) => {
    try {
      const res = await fn();
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch { /* not json */ }
      if (data && data.ok) lines.push(`✓ ${label}：正常`);
      else if (data) lines.push(`✗ ${label}：${data.error || text.slice(0, 80)}`);
      else lines.push(`✗ ${label}：回應不是資料（可能是 Google 登入頁）`);
      return !!(data && data.ok);
    } catch (err) {
      lines.push(`✗ ${label}：瀏覽器無法連線（${err.message}）`);
      return false;
    }
  };
  const ok1 = await probe('GET 連線', () => fetch(`${apiUrl}${apiUrl.includes('?') ? '&' : '?'}t=${Date.now()}`, { cache: 'no-store' }));
  const ok2 = await probe('POST 連線', () => send(JSON.stringify({ action: 'ping' }), 'post'));
  const ok3 = await probe('GET 備援', () => send(JSON.stringify({ action: 'ping' }), 'get'));
  lines.push(`網站離線快取（Service Worker）：${navigator.serviceWorker?.controller ? '有' : '無'}`);
  if (!ok1 && !ok2 && !ok3) lines.push(NO_ACCESS);
  else if (!ok2 && ok3) lines.push('POST 被擋，會自動改用 GET，可以正常使用。');
  else if (!ok2 && !ok3) lines.push('後端程式碼可能是舊版：請貼上最新的 apps-script.gs 並部署新版本。');
  return { ok: ok2 || ok3, text: lines.join('\n') };
}
