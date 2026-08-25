# 12: Visual polish 與 responsive 系統收斂（全站 UI/UX 重構的最終收口）

**What to build:** 功能已成的整站，依新 Contract **完整重構**為同一產品：間距/網格/容器/斷點凍結值、形狀與字階、海拔與邊界、互動與可及性、header/filter/網格/彈層/Mobile 的響應行為皆須重做並可驗證。

**Blocked by:** 04, 05, 06, 07, 08, 10, 11

**Status:** ready-for-agent

- [ ] 間距/網格/容器：`xxs4/xs8/sm12/md16/lg24/xl32/xxl48`，群組距 `lg` 大區塊距 `xxl`，網格 `repeat(auto-fill,minmax(240px,1fr)) gap16` 內置中 `1280` 容器左右 `24`，`Tablet 880→220px / Mobile 560→168px` 密度自適應；空白由深色畫布 + 階梯陰影承載
- [ ] 形狀/字階：卡片 `lg 12`、按鈕/chips `pill 9999`、輸入 `md 8`、海報 `16:9/12` 詳情 `2:3/var(--radius)`；`Outfit 400/500/700/800` 單字族，`tabular-nums` 僅 metadata，內文錨點 `14/400/1.7`、大標負字距，不鎖 36/24px
- [ ] 海拔/邊界：卡片 `0 4px 12px/.25` 無邊框，彈層 `popover + 1px border + 0 16px 48px/.55`，focus `0 0 0 2px ring 20%`；僅禁 `background-clip:text`，功能性黑色遮罩 `rgba(0,0,0,.xx)` 放行，無裝飾性彩色漸層/光暈、無卡片色暈
- [ ] 互動/可及性/響應：`shadcn-vue` 優先、手刻補 `focus-visible` 與 ≥40px 觸控（chips 30px 但 40px 命中區）；hover/loading/empty/error 一致；`primary` 稀缺僅主行動/選中/focus；header 恆可見不折漢堡、網格恆網格僅縮卡寬、彈層窄視口置中非全屏抽屜、Mobile 隱藏 hover 卡（對應 prototype 暫定行為的最終定版）

> 註：此為 `spudtube-v1 12-visual-polish-pass`（唯一仍 `ready-for-agent`）的 Contract 新版，承接 PR #17 的 `tailwind.css/components.json` 與本規格故事 47-64 的可驗收綁定；領票時以 side-by-side 視覺對照 + 互動態逐屏驗證為準。
