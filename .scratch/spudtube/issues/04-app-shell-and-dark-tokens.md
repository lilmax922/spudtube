# 04: App shell 與 dark-only 視覺地基

**What to build:** 全站唯一的夜空畫布與 token 源就位：`tailwind.css :root == .dark` 為唯一寫入處，Contract 只定義規則；`shadcn-vue reka-nova/neutral/lucide/outfit` 優先，手刻必備 `focus-visible` 與 ≥40px 觸控區。

**Blocked by:** 01

**Status:** ready-for-human

- [x] `app/assets/css/tailwind.css` 凍結階梯 `background→card(0.155)→muted→popover`、`primary` 中性近白僅作主行動/選中/focus ring、`destructive` 唯一語意、`border/input/ring` 依 Contract 限域；`--font-sans: 'Outfit','Noto Sans TC',...`（`400/500/700/800`）與 `components.json: font outfit` 已切，無 `oklch` 重抄、無 `Inter` 殘留，Prototype `Inter` 僅視為暫定
- [x] 表面無邊框：卡片/區塊不以 1px 邊框承載層級，深度由階梯 + `0 4px 12px rgba(0,0,0,.25)`（卡片）/ `0 16px 48px rgba(0,0,0,.55)+1px border`（彈層）/ `0 0 0 2px ring 20%`（focus）與 `blur 10-12px` 承載；`border` 僅用於輸入/彈層/分隔線
- [x] 內容為主角、UI 去色：海報為主要色彩來源，`Provider` 以 icon 識別不以固定色塊；僅禁 `background-clip:text` 文字漸層，功能性黑色遮罩 `rgba(0,0,0,.xx)→transparent` 放行、裝飾性彩色漸層/光暈禁止
- [x] 基礎 shell（header + `AttributionFooter`）渲染 `TMDB/JustWatch` 署名，`pnpm typecheck && pnpm lint --fix && pnpm build` 綠；`shadcn-vue` 產出已更名為 `kebab-case`

> 註：對應 `spudtube-v1 11-design-system-baseline` 已於 `main` 以 PR #17（`aa86a94`）合併為新 Contract；本票為可追溯重述，領票時重點驗證無殘留舊 token。
