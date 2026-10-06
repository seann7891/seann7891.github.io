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

export async function call(action, payload = {}) {
  if (!apiUrl) throw new Error('這個工具還沒接上後端（config.js 的 API_URL 是空的）');
  let res;
  try {
    // 不設 Content-Type（預設 text/plain），避免瀏覽器先送 CORS 預檢，Apps Script 不支援預檢。
    res = await fetch(apiUrl, { method: 'POST', body: JSON.stringify({ action, ...payload }), redirect: 'follow' });
  } catch {
    throw new Error('連不上後端，請檢查網路，或確認 Apps Script 部署時「誰可以存取」選「所有人」');
  }
  if (!res.ok) throw new Error(`後端回應錯誤（HTTP ${res.status}）`);
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('後端回應格式不對，請確認 Apps Script 部署時「誰可以存取」選「所有人」');
  }
  if (!data.ok) throw new Error(data.error || '發生錯誤');
  return data;
}
