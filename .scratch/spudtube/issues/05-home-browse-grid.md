# 05: Home browse grid（零儀式落地）

**What to build:** 訪客落地即海報網格：`Kind` 與多 `Genre OR` 依 `popularity` 排序，無限滾動不分頁，缺圖優雅降級，卡片依 Contract 無邊框以陰影承載層級。

**Blocked by:** 02, 03, 04

**Status:** ready-for-human

- [x] Landing 直達網格無 hero/gate；`KindToggle` 僅 browse 模式生效，切換重取並清空 genre；`GenreChips` 多選以 `with_genres=a|b` 達成 OR，`Clear all` 於 ≥1 選中時出現
- [x] 無限滾動以 `IntersectionObserver` + `generation` 去競態，`browse-grid` 編排 `TitleCard` / `KindToggle` / `GenreChips`，預設 `popularity` 排序
- [x] 卡片 `16:9 / 12px / 無邊框 + 0 4px 12px/.25`，`tabular-nums` 僅年份等 metadata，字重依 `Outfit` 階梯，海報 `object-cover hover:scale`，缺圖以 `Clapperboard` glyph + title 降級；空/錯/載入狀態皆 `bg-card` 無額外邊框語意
- [x] 測試：`TitleCard` / `KindToggle` / `GenreChips` / `BrowseGrid` 組件測試（S3，`useBrowseGrid` 在匯入處 mock）+ `useBrowseGrid/usePagedResults/useInfiniteScroll` 直測；API 層以 fake `S1` 驗證 `discover/genres`

**2026-08-25 水平 carousel（Prime Video 對齊）追加：**
- [x] 新增 `usePrimeCarousel`（`itemWidth 240 / gap 16 / peek 0.25 → 60px`）與 `prime-carousel.vue` 通用橫向輪播，狀態 `atStart / atMid / atEnd / single` 以 `scrollLeft/clientWidth/scrollWidth + threshold` 判定，`peekWidth = round(itemWidth*0.25)`，`visibleCount/scrollAmount` 以 peek 計算頁滾動量
- [x] `atStart`：左側貼齊 viewport（`padding 0`），右側完整可見 item 貼齊右緣並在右緣額外露出 1/4（`gap+peek` 自然裁切，page scroll 保證）；`atEnd` 鏡像；`atMid` 左右各露 1/4，中間完整顯示。箭頭 `prev/next` 僅在非邊界時顯現（`isAtStart/isAtEnd`），`scroll-snap: x mandatory` + `snap-start` 保證卡片對齊
- [x] `recommendations-strip` 已改用 `PrimeCarousel`，卡片統一 `16:9 / 12px / shadow[0_4_12/.25] / hover:scale`，缺圖 `Clapperboard` + `@error` 降級；`browse-grid` 網格 `240→220→168` 響應、skeleton `aspect-[16/9] bg-card`，`title-card` 年份 `tabular-nums`
- [x] 測試：`use-prime-carousel` 純函數（`calculatePeekWidth/getCarouselState/getVisibleCount/getScrollAmount`）+ `prime-carousel` 組件（slot、atStart/single 箭頭隱藏、peek data attr、scrollBy）補齊，`pnpm test 48/48 281/281` 綠、`typecheck/lint/build` 綠

> 註：對應 `spudtube-v1 04-home-browse-grid` 雖已於 `main` 以 PR #9 合併，但本票標為 **UI/UX 完整重構**（依最新指示）：即使功能已做過，視覺與互動仍須依新 Contract（`Outfit`、無邊框陰影、間距/網格凍結值、`pill` 形狀、`tabular-nums`）重做，非僅驗證。
