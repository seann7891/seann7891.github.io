# seann7891.github.io

Jekyll + Chirpy 部落格，附 Tools 與 Physics_Playground 兩個獨立區。

## 新增一個模擬器（Physics_Playground）
1. 建 `playground/<slug>/index.html`（純 HTML，**不要**加 front matter）
2. 在 `_data/playground.yml` 的 `apps` 加一筆（title / slug / category / desc / thumb / tags）
3. 在 `changelog` 加一行
4. push

## 新增一個工具（Tools）
1. 建 `tools/<slug>/index.html`
2. 在 `_data/tools.yml` 加一筆
3. push

## 新增分類
改 `_data/playground.yml` 的 `categories`；若要專屬顏色，在 `assets/css/playground.css` 加一個 `--c-<id>` 變數與對應規則。

## 本機預覽
```
bundle
bundle exec jekyll s
```

## 網站與部署
- 網址：https://seann7891.github.io
- GitHub：https://github.com/seann7891/seann7891.github.io
- 使用 Ruby 3.4 與 Jekyll Chirpy 7.6；主分支推送後由 GitHub Actions 建置、檢查內部連結並部署 GitHub Pages。
- Pages 的 Source 使用 GitHub Actions。
- Physics_Playground 導覽與頁面由 `_tabs/playground.md` 統一提供，內容在 `_includes/playground-content.html`。
- Tools／座位表（`tools/seating-chart/`）：學生端 `index.html`、教師端 `teacher.html`。後端是綁在教師 Google 試算表上的 Apps Script（`apps-script.gs`），部署後把網址填進 `config.js`。學生姓名與照片不放進 repo：名單存在試算表，照片只存在教師瀏覽器。架設步驟見教師端「架設說明」。
- `url` 可覆蓋工具或模擬器的預設路徑。
- 未設定公開 email、頭像或留言服務。
