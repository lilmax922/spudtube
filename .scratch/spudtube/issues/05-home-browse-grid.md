# 05: Home browse grid（零儀式落地）

**What to build:** 訪客落地即海報網格：`Kind` 與多 `Genre OR` 依 `popularity` 排序，無限滾動不分頁，缺圖優雅降級，卡片依 Contract 無邊框以陰影承載層級。

**Blocked by:** 02, 03, 04

**Status:** ready-for-agent

- [ ] Landing 直達網格無 hero/gate；`KindToggle` 僅 browse 模式生效，切換重取並清空 genre；`GenreChips` 多選以 `with_genres=a|b` 達成 OR，`Clear all` 於 ≥1 選中時出現
- [ ] 無限滾動以 `IntersectionObserver` + `generation` 去競態，`browse-grid` 編排 `TitleCard` / `KindToggle` / `GenreChips`，預設 `popularity` 排序
- [ ] 卡片 `16:9 / 12px / 無邊框 + 0 4px 12px/.25`，`tabular-nums` 僅年份等 metadata，字重依 `Outfit` 階梯，海報 `object-cover hover:scale`，缺圖以 `Clapperboard` glyph + title 降級；空/錯/載入狀態皆 `bg-card` 無額外邊框語意
- [ ] 測試：`TitleCard` / `KindToggle` / `GenreChips` / `BrowseGrid` 組件測試（S3，`useBrowseGrid` 在匯入處 mock）+ `useBrowseGrid/usePagedResults/useInfiniteScroll` 直測；API 層以 fake `S1` 驗證 `discover/genres`

> 註：對應 `spudtube-v1 04-home-browse-grid` 雖已於 `main` 以 PR #9 合併，但本票標為 **UI/UX 完整重構**（依最新指示）：即使功能已做過，視覺與互動仍須依新 Contract（`Outfit`、無邊框陰影、間距/網格凍結值、`pill` 形狀、`tabular-nums`）重做，非僅驗證。
