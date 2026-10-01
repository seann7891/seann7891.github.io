# 物理選修III 課程維護說明

入口：`/physics-class/physics-iii/`，由 Physics_Class 導入。

## 編排與範圍

依使用者提供的「物理III 波與光」四章十五節 DOCX 主題重新編寫；原始講義不隨網站發布。44 個步驟，每步 2–4 個聚焦概念，依序為理解、預測與操作、概念檢核。每步一題附解析，可返回模擬修正理解。全部四章 44 步皆有逐步控制設定，將非當步變因固定或放在「進一步比較」。這是形成性概念課程，不宣稱涵蓋講義全部例題或取代完整評量。

| 單元 | 名稱 | 步驟 | 模擬 |
|---|---|---:|---|
| 1-1 | 波動與介質 | 4 | travel, speed |
| 1-2 | 週期波 | 2 | travel |
| 1-3 | 反射與透射 | 2 | reflection |
| 1-4 | 疊加與駐波 | 3 | superposition, standingFormation, standing |
| 1-5 | 波前與惠更斯原理 | 2 | wavefront（截面／球面／局部／平面階段）, huygens（同半徑前向子波） |
| 1-6 | 水波的反射、折射、干涉與繞射 | 4 | water（俯視反射、穩定節線與腹線）, refraction（水波專用俯視折射）, diffraction（水波單縫俯視波前） |
| 2-1 | 聲波與疏密 | 3 | sound |
| 2-2 | 管弦樂器與音色 | 3 | pipe, timbre |
| 2-3 | 共振與空氣柱共鳴 | 2 | resonance, resonanceTube |
| 3-1 | 光的反射、折射與色散 | 4 | refraction, apparent, dispersion |
| 3-2 | 全反射 | 2 | refraction, fiber |
| 3-3 | 透鏡成像與應用 | 4 | lens |
| 4-1 | 光的本質與科學模型 | 2 | doubleSlit, em |
| 4-2 | 楊氏雙狹縫干涉 | 3 | doubleSlit |
| 4-3 | 單狹縫繞射 | 4 | diffraction, combined, thinFilm |

## 模型適用條件

- 波動採小振幅線性疊加；水波採俯視波前或節線示意，干涉未加入距離衰減。
- 聲波粒子動作放慢顯示，音色以波形比較，不合成音訊。理想管柱忽略端點修正；共鳴管可切換 e = 0 / 0.009 m，反應及粒子振幅使用有效長度 L + e。
- 折射光線遵守司乃耳定律；光線上的動點僅表示方向，不表示實際光速。視深以司乃耳定律追跡實際折射線及其共線反向延長，另標近軸參考；大斜度光線可能全反射。
- 透鏡採近軸薄透鏡，焦點物距對應無限遠像，並處理虛像的反向延長線。
- 電磁場以各自振幅正規化；E 與 B 同相、互相垂直，並以 E×B 表示傳播方向。
- 干涉與繞射採理想同調、遠場條件；單縫強度使用 sinc²，雙縫有限縫寬乘上包絡。
- 動畫時間為模型時間；各處明示示意比例，不以播放速度推算真實頻率。

## 驗證

`node --test tests/physics-iii.test.mjs` 檢核課程結構、概念上限、波速與邊界能流、折射與全反射、透鏡焦點、管柱諧波及繞射零點；並對所有 44 步驟的時間與控制極值執行繪圖有限值測試；另檢查全部 44 步的控制限制、參數重播保留、靜態模型播放隱藏，以及球面波、干涉、折射、繞射專用圖說。部署前由 GitHub Actions 執行。

2026年10月1日由主代理逐步檢查17個波動模擬的桌面及390px手機載入、讀數與版面；並人工補看核心圖像、驗證作答回饋及進度保存。詳細範圍與限制見 waves-simulator-adjustment-report.md。學習進度只存在 localStorage，沒有帳號、教師後台或跨裝置同步。

編輯內容：`assets/physics-iii/course.json`；畫面流程：`course.mjs`；模型繪圖：`simulations.mjs`；公式：`physics.mjs`。

## 2026-10-01 一致性報告修正驗收

依 physics-iii-simulator-content-review.md 的 P0、P1、P2 修改，未更動單元 ID 或步驟次序，保留 44 步 localStorage 通過紀錄。

- P0：水波單縫以 40 px 波長與同比例縫寬繪製，半角遵循第一暗紋公式，窄於一個波長時註明沒有可達第一暗紋；視深虛線真實反向延長並新增觀察斜度；共鳴管以反應曲線、振幅、學生長度記錄及可隱藏理論位置顯示有效長度；水波反射改為對應俯視圖的正文。
- P1：44 步均限制主控制；聲波曲線對齊粒子的平衡位置，標密／疏中心；波源有一次發送與持續驅動；波峰選畫面內第一個，縱波改標密部且限制最大應變；透鏡畫三條主光線與平行束，光屏落點分散／集中可用來調焦；新增薄膜雙路反射與三色強度；同調、白光、波長比、諧音／泛音及精確臨界角皆有可操作證據。
- P1-6 採報告的縮減選項：聚焦光屏、調焦與放大鏡，視力矯正改為文字補充，沒有新增眼球模型。
- P2：修正報告列出的用字與任務措辭；反射波前用參數裁切保持垂直性；同深水區標籤隨參數更新；色帶依波長換色；移除未使用的水波繞射重複分支與點波源視圖，更新本維護文件。
- §5 範圍取捨：加入單縫亮紋近似與精確值的銜接；面鏡及其他延伸主題屬非錯誤建議，尚未新增，以免本輪擴大課程與新概念量。

本機 Node 測試 24 項通過。除原有公式與 44 步時間／滑桿極值外，新增實際繪圖的縫寬比例、共線延長、反射裁切方向、全時間波峰、精確臨界角、管口修正與記錄、薄膜反射相位、主光線交會及波源行為測試。不是僅檢查畫面文案。

瀏覽器逐步驗收：桌面 1280 px 與手機 390 px 各 44 步的載入、預設值、控制項與頁面無橫向溢出；人工查看核心模型（主光線、薄膜、臨界角、共鳴管、視深、聲波對位、水波縫寬），並實際操作精確臨界角、共鳴記錄／理論切換與觀察斜度、同調時間平均、作答回饋與重新載入後進度保存。手機畫布縮放顯示，細小標籤可配合畫布下方文字讀數；尚未做學生學習成效研究。沒有保存本輪影音或截圖暫存檔。

薄膜採兩路等振幅、垂直入射，三色色塊及白光為顯示示意，非實際光譜色彩預測；共鳴反應含有限損耗，非校準聲壓。參考 [OpenStax 薄膜干涉](https://openstax.org/books/university-physics-volume-3/pages/3-4-interference-in-thin-films)、[OpenStax 空氣柱駐波](https://openstax.org/books/university-physics-volume-1/pages/17-4-normal-modes-of-a-standing-sound-wave)。

## 全課程控制規格

主控制最多三項；視角、管口修正等延伸比較預設收合。播放與時間只在有時間變化的模型顯示，靜態光路／強度圖提供參數比較。

| 步驟 | 主控制鍵 | 進一步比較鍵 | 固定／起始條件 |
|---|---|---|---|
| 1-1/1 | — | — | {"f": 1, "v": 2, "shape": "periodic", "mode": "transverse"} |
| 1-1/2 | shape | — | {"shape": "pulse", "f": 1, "v": 2, "mode": "transverse", "source": true} |
| 1-1/3 | mode | — | {"mode": "longitudinal", "shape": "periodic", "f": 1, "v": 2} |
| 1-1/4 | F | mu | {"mu": 0.01} |
| 1-2/1 | — | — | {"timePlot": true, "f": 1, "v": 2, "shape": "periodic", "mode": "transverse"} |
| 1-2/2 | f | — | {"v": 2, "shape": "periodic", "mode": "transverse", "periodCompare": true} |
| 1-3/1 | boundary | — | {"boundary": "fixed"} |
| 1-3/2 | ratio | — | {"boundary": "joint"} |
| 1-4/1 | sign | — | {} |
| 1-4/2 | probe | — | {"probe": 1} |
| 1-4/3 | boundary, mode | L | {"L": 1} |
| 1-5/1 | shape | — | {"shape": "sphere"} |
| 1-5/2 | v | — | {"v": 1} |
| 1-6/1 | angle | — | {"view": "reflection"} |
| 1-6/2 | ratio | angle | {"water": true, "angle": 35, "ratio": 1} |
| 1-6/3 | d, lambda | — | {"view": "interference"} |
| 1-6/4 | a | — | {"water": true} |
| 2-1/1 | yaw | — | {"f": 400, "graph": "displacement", "yaw": 0} |
| 2-1/2 | graph | — | {"yaw": 0} |
| 2-1/3 | temp, f | — | {"yaw": 0} |
| 2-2/1 | graph, yaw | — | {"end": "closed", "yaw": 0} |
| 2-2/2 | end, mode | yaw | {"graph": "displacement", "yaw": 0} |
| 2-2/3 | second, third | — | {} |
| 2-3/1 | r, z | — | {} |
| 2-3/2 | L | f, e | {"f": 400, "e": "0.009", "L": 0.15} |
| 3-1/1 | angle, yaw | — | {"reflectionOnly": true, "n1": 1, "n2": 1, "yaw": 0} |
| 3-1/2 | n2 | angle | {"n1": 1, "n2": 1, "angle": 40, "yaw": 0} |
| 3-1/3 | depth, n | dx | {"dx": 20} |
| 3-1/4 | angle | — | {} |
| 3-2/1 | angle, n1, n2 | — | {"n1": 1.5, "n2": 1, "angle": 35, "criticalButton": true} |
| 3-2/2 | alpha | core, clad | {"core": 1.5, "clad": 1.3} |
| 3-3/1 | type | yaw | {"parallel": true, "yaw": 0} |
| 3-3/2 | p | — | {"type": "convex", "f": 2, "p": 6, "yaw": 0} |
| 3-3/3 | p, f | — | {"type": "convex", "f": 2, "p": 6, "yaw": 0} |
| 3-3/4 | p, screen | f | {"type": "convex", "f": 2, "p": 6, "screen": 4, "yaw": 0, "screenMode": true} |
| 4-1/1 | phase | — | {"phase": 0} |
| 4-1/2 | pol, yaw | — | {} |
| 4-2/1 | phase, coherence | — | {"phase": 0, "coherence": "fixed"} |
| 4-2/2 | lambda, d, L | — | {"phase": 0, "n": 1} |
| 4-2/3 | n, lambda | spectrum | {"phase": 0, "n": 1, "spectrum": "mono"} |
| 4-3/1 | a | lambda, L | {} |
| 4-3/2 | a | lambda, L | {"a": 0.2} |
| 4-3/3 | d, a | lambda | {} |
| 4-3/4 | t | n, halfWave | {} |
