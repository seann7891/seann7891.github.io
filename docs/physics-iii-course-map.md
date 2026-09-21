# 物理選修III 課程維護說明

入口：`/physics-class/physics-iii/`，由 Physics_Class 導入。

## 編排與範圍

依使用者提供的「物理III 波與光」四章十五節 DOCX 主題重新編寫；原始講義不隨網站發布。44 個步驟，每步 2–4 個聚焦概念，依序為理解、預測與操作、概念檢核。每步一題附解析，可返回模擬修正理解。這是形成性概念課程，不宣稱涵蓋講義全部例題或取代完整評量。

| 單元 | 名稱 | 步驟 | 模擬 |
|---|---|---:|---|
| 1-1 | 波動與介質 | 4 | travel, speed |
| 1-2 | 週期波 | 2 | travel |
| 1-3 | 反射與透射 | 2 | reflection |
| 1-4 | 疊加與駐波 | 3 | superposition, standing |
| 1-5 | 波前與惠更斯原理 | 2 | wavefront, huygens |
| 1-6 | 水波的反射、折射、干涉與繞射 | 4 | water, refraction, diffraction |
| 2-1 | 聲波與疏密 | 3 | sound |
| 2-2 | 管弦樂器與音色 | 3 | pipe, timbre |
| 2-3 | 共振與空氣柱共鳴 | 2 | resonance, resonanceTube |
| 3-1 | 光的反射、折射與色散 | 4 | refraction, apparent, dispersion |
| 3-2 | 全反射 | 2 | refraction, fiber |
| 3-3 | 透鏡成像與應用 | 4 | lens |
| 4-1 | 光的本質與科學模型 | 2 | doubleSlit, em |
| 4-2 | 楊氏雙狹縫干涉 | 3 | doubleSlit |
| 4-3 | 單狹縫繞射 | 4 | diffraction, combined, doubleSlit |

## 模型適用條件

- 波動採小振幅線性疊加；水面是教學高度圖，干涉未加入距離衰減。
- 聲波粒子動作放慢顯示，音色以波形比較，不合成音訊。理想管柱忽略端點修正；共鳴步驟另說明有效長度。
- 折射光線遵守司乃耳定律；光線上的動點僅表示方向，不表示實際光速。視深採近軸近似。
- 透鏡採近軸薄透鏡，焦點物距對應無限遠像，並處理虛像的反向延長線。
- 電磁場以各自振幅正規化；E 與 B 同相、互相垂直，並以 E×B 表示傳播方向。
- 干涉與繞射採理想同調、遠場條件；單縫強度使用 sinc²，雙縫有限縫寬乘上包絡。
- 動畫時間為模型時間；各處明示示意比例，不以播放速度推算真實頻率。

## 驗證

`node --test tests/physics-iii.test.mjs` 檢核課程結構、概念上限、波速與邊界能流、折射與全反射、透鏡焦點、管柱諧波及繞射零點；並對所有 44 步驟的時間與控制極值執行繪圖有限值測試。部署前由 GitHub Actions 執行。

已在瀏覽器人工核對閱讀→操作→作答、錯誤回饋、正確後下一步、重新整理進度，以及桌面和 390px 手機版面。學習進度只存在 localStorage，沒有帳號、教師後台或跨裝置同步。

編輯內容：`assets/physics-iii/course.json`；畫面流程：`course.mjs`；模型繪圖：`simulations.mjs`；公式：`physics.mjs`。
