# Design System

SpudTube 的視覺基準 — **How the project should look and feel**。實作任何 UI 前必讀。Token 唯一撰寫位置為 `app/assets/css/tailwind.css`（`:root` == `.dark`）；本文件定義規則與用法，不重抄數值。`docs/design/prototype.html` 僅為可視化參考的暫定互動稿，不作為設計依據；最終產品實際樣式以本文件與各功能 spec 為準，並隨製作過程透過票證動態調整與收斂。

> Contract, not pixels：以下規則是規格。原型像素皆為暫定，最終樣式以本文件與後續 spec / 票證動態收斂為準。

## Overview

SpudTube 是 dark-only 的夜空系統。畫布為近黑，表面以 `background → card → muted → popover` 的階梯與陰影區分層級，不靠邊框與彩色光暈。

本專案**現階段沒有品牌色、沒有 Logo**。`--primary` 為中性近白，僅作功能性的選中、主行動與 focus ring，不承載品牌識別。語意色只有 `--destructive`，用於真正破壞性操作。海報原圖是畫面中主要的色彩來源，UI 本身保持去色。

**關鍵特徵：**
- **Dark-only** — 無亮色主題，`:root` 直接承載深色值，`.dark` 為等價區塊。未來如需亮色，須以本文件的 dark 階梯為對照另建一套 surface 體系（見 Known Gaps 與 Iteration Guide）。
- **品牌色預留但未啟用** — 現階段不引入高飽和品牌色；`primary` 保持中性，僅作稀缺功能色。未來若啟用單一品牌色，須以 ADR 補齊 `primary / primary-foreground / ring` 的對比與可及性對照，且不得影響 `destructive`。
- **無邊框表面** — 卡片與區塊**不以 1px 邊框作為層級手段**，深度由 surface 階梯與陰影承載；`border / input` 僅用於輸入、彈層與分隔線。
- **內容為主角** — 海報與文字承載視覺，UI 退後；僅禁止對文字的漸層處理，其餘功能性遮罩不在此限。

## Colors

> 來源：`app/assets/css/tailwind.css` `:root`（與 `.dark` 等價）。以 `tailwind.css` 為唯一真相，本文件僅以 `{colors.xxx}` 引用，不重抄 `oklch(...)` 數值。

### Canvas & Surface

| Token | Use |
|---|---|
| `{colors.background}` | 畫布，頁面基底 |
| `{colors.card}` | 一階表面：卡片、區塊（無邊框，靠陰影浮起） |
| `{colors.muted}` | 二階表面：未選中控制、hover 填充 |
| `{colors.popover}` | 彈層 |
| `{colors.secondary}` | 靜默填充 |
| `{colors.accent}` | 點綴填充 |

表面階梯的數值已在 `tailwind.css` 凍結，本文件不重抄；未來調整須以票證單獨驗證，不以原型為依據。

### Functional Accent

| Token | Use |
|---|---|
| `{colors.primary}` | 功能性主色：主行動、選中態、focus ring（現階段為中性近白，非品牌色；品牌插槽見 Overview） |
| `{colors.primary-foreground}` | 主色上的文字 |
| `{colors.ring}` | focus ring，中性灰 |

### Text

| Token | Use |
|---|---|
| `{colors.foreground}` | 主文字 |
| `{colors.muted-foreground}` | 次要文字、meta |

### Semantic & Border

| Token | Use |
|---|---|
| `{colors.destructive}` | 破壞性操作專用（刪除/移除） |
| `{colors.destructive-foreground}` | 其上的文字 |
| `{colors.border}` | 僅用於輸入框、彈層邊框與分隔線；**不用于卡片/區塊邊框** |
| `{colors.input}` | 輸入框邊框（與 `border` 分工，僅用於表單） |

Provider 識別使用 icon，不以固定色塊作為系統色。

## Typography

### Font Family

- **Outfit** — 全站唯一字型，權重 `400/500/700/800`（`400` 內文、`500` 按鈕/標籤、`700` 區塊標題、`800` 主視覺標題）；中文 fallback `Noto Sans TC`，`--font-sans: 'Outfit','Noto Sans TC',ui-sans-serif,system-ui,sans-serif`（見 `tailwind.css` 與 `components.json: font`）。
- 無獨立 display/text 切分；同一語感，僅以字重與字距區分。
- **Mono 不使用**。
- 數字排版：僅 `metadata / price / rating` 等數據性文字啟用 `font-variant-numeric: tabular-nums`（`tnum`），其餘不啟用。

### Hierarchy

基準僅定原則，不鎖死具體 `36px/24px` 像素。具體字級由各功能 spec 在排版時決定，但須遵守以下原則：

- **同一字族貫穿**，僅以 `800 → 400` 的字重落差與負字距建立層級。
- **大標負字距**，內文保持 `0`；區塊標題以字重與間距區分，不依賴顏色或裝飾。
- 內文預設語感為 `14/400/1.7` 級別（以此為錨點微調，不寫死於基準）。

### Note on Font Substitutes

Outfit 為首選（OFL, variable 100-900）；中文字僅作 fallback，不作第二字族。

## Layout

### Spacing System

- **Base unit** 4px。
- **Tokens**：`{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px。
- 區塊間距以 `lg 24px` 為內容組間距，`xxl 48px` 為大區塊間距。
- 控制項高度：按鈕/輸入 38-40px；chips 30px。Touch target ≥ 40px。

### Grid & Container

- **Max content width** 1280px。
- **Grid**：結果網格 `repeat(auto-fill, minmax(240px,1fr))`，gap 16；窄視口縮至 `minmax(168px,1fr)`。
- **Container**：頁面內容置中於 1280 容器，左右各 `24px` 內距。

### Whitespace Philosophy

深色畫布本身就是留白。區塊之間以 **表面階梯 + 陰影 + 間距** 區隔，而非大量空白或邊框。面板內以 `lg 24px` 作為組間距。

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 (canvas) | `background` 無邊框無陰影 | 頁面基底 |
| 1 (surface-1) | `card` 無邊框 + `0 4px 12px rgba(0,0,0,.25)` | 卡片、區塊 |
| 2 (popover) | `popover` + 1px `border` + `0 16px 48px rgba(0,0,0,.55)` | 彈層、下拉 |
| 3 (focus) | `0 0 0 2px color-mix(in oklab, ring 20%, transparent)` | 輸入聚焦 |

深度由 surface 階梯 + 陰影 + 少量 `blur(10-12px)` 承載，不使用彩色陰影。

### Decorative Depth

- **僅禁止對文字的漸層**（`background-clip:text`）。
- 允許為可讀性服務的**功能性黑色遮罩**（如 `linear-gradient(to top, rgba(0,0,0,.62) → transparent)` 壓於海報之上供文字對比），僅限 `rgba(0,0,0, .xx)`，不得引入品牌色或彩色光暈。
- 卡片不得以邊框或彩色光暈製造深度。

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.md}` | 8px | 輸入、次要控制 |
| `{rounded.lg}` | 12px | 卡片 |
| `{rounded.pill}` | 9999px | 按鈕、chips |
| `{rounded.full}` | 9999px | 圓形頭像/指示點 |

卡片統一為 `lg 12px`，按鈕與 chips 統一為 `pill 9999`；不混用 4/6 作為卡片圓角。

### Imagery & Geometry

- **海報** `16:9`，圓角 `12px`。
- **詳情海報** `2:3`，圓角 `var(--radius)`。
- 圖像維持比例不裁切。

## Components

以下為原則性指引，非像素合約。未列出的視覺型式視為未核准；具體像素由各功能 spec 定義，實作優先查 `shadcn-vue`（`reka-nova / neutral / lucide`）再手刻，手刻須補 `focus-visible` 與 ≥40px 觸控區。

### Buttons

- **Primary**：`primary` 背景 + `primary-foreground` 文字 + pill + 40px 高，僅用於主行動。
- **Ghost**：`transparent` + `muted-foreground` 文字，pill，次要行動。
- **Outline**：`transparent` + `input` 邊框 + `foreground` 文字，pill，次要外框。

### Chips & Segments

- `chip`：`30px` 高、`pill`、`500` 字重、`muted-foreground` 文字；選中為 `primary` 實心（無邊框）。
- `seg`：`muted` 背景、`3px` 內距、`pill` 容器，內按鈕 `30px`，選中為 `primary`。

### Cards & Inputs

- **Card**：`card` 背景 + 無邊框 + `12px` 圓角 + 內距（深度由陰影承載，不用 `border`）。
- **Input**：`card` 背景 + `1px input` 邊框 + `8px` 圓角 + 內距；focus 為 `2px ring 20%` 外框。

### Navigation & Footer

- **Top nav**：置於 1280 容器內，次要導覽以 `muted-foreground` 文字為主。
- **Footer**：`card` 背景 + `border-top`（分隔線例外），單欄置中，僅文字與連結。

## Do's and Don'ts

### Do

- 以 `background` 為錨點表面，階梯與陰影承載層級；`border` 僅用於輸入/彈層/分隔線。
- 僅在功能語意使用 `primary`：主行動、選中態、focus ring；視為稀缺資源。
- 以表面階梯建立層級，不跳級。
- 同一 Outfit 字族內以字重與字距分層；數據文字啟用 `tabular-nums`。
- 卡片用 `12px`、按鈕與 chips 用 `pill 9999`。
- 優先查 `shadcn-vue` 再手刻；手刻須補 `focus-visible` 與 ≥40px 觸控區。

### Don't

- 不交付亮色主題；不以系統深淺切換覆蓋 `:root`。
- 不引入品牌色或第二強調色（現階段）；品牌色僅能以 ADR 啟用單一插槽，不得影響 `destructive`。
- 不對文字使用 `background-clip:text` 漸層。
- 不為卡片添加邊框、彩色光暈或大面積彩色陰影。
- 不將 CTA 做成 4px 小圓角。
- 不以 `#000000` 純黑作畫布。
- 不添加裝飾性彩色漸層與光暈背景（功能性黑色遮罩除外）。
- 不用固定色塊表示 Provider，改用 icon。

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Desktop | 1280px | 預設 |
| Tablet | 880px | 單欄化（若有雙欄）、卡片 `240→220` |
| Mobile | 560px | 卡片 `168`、`pgrid minmax(168,1fr)`、hover 卡隱藏 |

### Touch Targets

- 按鈕/輸入 ≥ 40px。
- Chips 30px，觸控視口仍保持 ≥ 40px 點擊區。

### Collapsing Strategy

- **Header**：保持可見，不折疊為漢堡；僅文字縮減。
- **Grid**：維持網格，僅卡寬縮小。
- **彈層**：窄視口仍置中，不轉全屏抽屜。

### Image Behavior

- 海報與劇照皆 `16:9`，維持比例不裁切。

## Iteration Guide

1. 一次只聚焦一個 `components:` token 命名的元件。
2. 引入區塊前先決定其所在的表面階級（canvas/card/popover）。
3. 內文預設語感為 `body 14/400/1.7` 級別。
4. 實作後跑 `pnpm lint --fix && pnpm typecheck && pnpm build`（見 `docs/agents/code-standard.md`）。
5. 新增變體時以獨立條目記錄，避免堆疊條件。
6. 視 `primary` 為稀缺資源：主行動、選中、focus。
7. 以「實際資料」驗證，而非空狀態。

## Known Gaps

- 亮色主題未設計；如需加入，須以本文件的 dark token 為對照重建一套 surface 階梯。
- 品牌色插槽已預留但未啟用；啟用須以 ADR 補齊 `primary / primary-foreground / ring` 對比與可及性對照。
- `tailwind.css` 的 `background/card/muted/popover` 數值已凍結，調整須以票證單獨驗證。
- `shadcn-vue`（`components.json: style reka-nova / baseColor neutral / iconLibrary lucide / font outfit`）為元件優先來源；未涵蓋時才手刻。
