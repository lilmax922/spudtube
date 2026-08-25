# 06: Keyword search mode（與 browse 正交）

**What to build:** 與 browse 互斥的關鍵字模式：單一查詢橫跨 `MOVIE` 與 `TV_SHOW` 回混合 `Kind`、結果標 `Kind`、同為無限滾動，搜尋彈層可達可關。

**Blocked by:** 02, 03, 04

**Status:** ready-for-agent

- [ ] `useKeywordSearch` 走 `GET /api/catalog/search`（TMDB `multi-search`，`media_type → Kind` 映射），`TitleCard showKind` 於搜尋結果顯示霜狀 `MOVIE/TV` badge，browse 卡片不標
- [ ] 模式互斥：進入 search 隱藏 `KindToggle/GenreChips/Clear all` 並清 genre，空查詢或 `clearable` X 回 browse；搜尋彈層經 header 可達、以 backdrop/close 可關不陷阱
- [ ] 分頁：沿用同一 sentinel，`mode === 'search'` 分派至 `searchLoadMore`，以 `searchedQuery`（最後提交值）驅動，非即時輸入；`No results for "{query}"` / `search.error/loading` 在地化且 `aria-busy` 正確
- [ ] 測試：`useKeywordSearch`（首頁/空查詢重置/append/錯/競態丟棄）+ `SearchField` + `TitleCard badge` + `BrowseGrid` 模式切換（S3 mock `useBrowseGrid`）

> 註：對應 `spudtube-v1 05-keyword-search-mode` 雖已於 `main` 合併，但本票標為 **UI/UX 完整重構**：搜尋彈層、輸入/彈層陰影、`pill`/`md8` 形狀、空/錯狀態皆須依新 Contract 重做，非僅驗證。
