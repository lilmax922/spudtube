# 07: Title detail core（識別、預告、推薦）

**What to build:** 雙路由 `/movie/[id]` 與 `/tv/[id]` 的詳情頁：識別區塊、預告片、推薦列；以 Contract 的字重/字距與形狀系統分層，缺席與下架優雅降級。

**Blocked by:** 02, 03, 04

**Status:** ready-for-agent

- [ ] 識別區塊：poster `2:3 / var(--radius)`、backdrop、overview（`zh-TW → en` fallback via `translations`）、Genres/年份/runtime 或季集數、`tagline`，字階以 `Outfit 800→400` + 大標負字距分層（內文錨點 `14/400/1.7` 不鎖 36/24px），`tabular-nums` 僅數據文字
- [ ] 預告片：`TitleTrailer` 僅於含官方 YouTube Trailer（`zh` 優先 `en`）時嵌入，無則乾淨消失；推薦列 `GET /api/catalog/:kind/:id/recommendations` 驅動，卡片 `Title→Title` 跳轉
- [ ] 韌性：`title(kind,id)` 上游 404 → `null`（負快取 1h），`useTitleDetail` 映射 400 → `title-not-found` 不崩潰；路由級測試以 fake `S1` 驅動、手寫 TMDB payload 僅 server-only
- [ ] 測試：`title-identity-block/title-trailer/recommendations-strip/title-not-found` 組件測試 + 雙路由整合測試（`createFakeTransport`），共用 `title-detail-fixtures`

> 註：對應 `spudtube-v1 06-title-detail-core` 雖已於 `main` 以 PR #7 合併，但本票標為 **UI/UX 完整重構**：識別區塊、預告片、推薦列皆須依新 Contract（`Outfit` 字階、`2:3/var(--radius)`、表面階梯陰影）重做，非僅驗證；並與 03 連動支援語言切換後的 TMDB 重取。
