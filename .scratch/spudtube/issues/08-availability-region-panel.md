# 08: Availability 與 Region 面板

**What to build:** 每個詳情頁的 `Availability` 面板：依 `subscription→free→rent→buy` 分組，以 icon 識別 `Provider`，`Region` 預設 `DetectedRegion` 並以 14 選單可切，僅存瀏覽器且永不篩選 `Title`。

**Blocked by:** 02, 04, 07

**Status:** ready-for-agent

- [ ] `useAvailability` 取 `GET /api/catalog/:kind/:id/providers` 的全量 `ProviderCatalog`，`AvailabilityPanel` 依固定分組渲染非空組，`Provider` 徽標取 TMDB CDN `w92` 於 `bg-muted pill`，無 logo 以文字備援；零供應商時顯式 `此區域暫無串流資訊` 且 `Title` 仍於他處可瀏覽
- [ ] `Region` 14 選單（TW HK JP KR SG US GB CA AU DE FR IN BR MX 原序）寫 `spudtube-region` cookie，切換僅更新 `Availability` 不篩 `Title`；`resolveSelectedRegion`（持久勝 → `DetectedRegion` → `TW`）與 `readDetectedCountry` 純函式直測，SSR 經 `language.global` 的 `cf-ipcountry` 橋接
- [ ] 署名：面板與 `AttributionFooter` 同步 `TMDB + JustWatch` Attribution（ADR 0001，logo 來自 TMDB CDN）
- [ ] 測試：`availability-panel.test.ts`（分組序、CDN urls、空狀態、署名、14 選單、持久預設、僅更 `Availability`、loading/error）+ 雙路由頁測（帶 providers 端點）+ `shared/region` 單元測試

> 註：對應 `spudtube-v1 07-availability-region-panel` 雖已於 `main` 合併，但本票標為 **UI/UX 完整重構**：面板分組、`Provider` icon 化、`pill`/`popover` 陰影、空狀態與署名皆須依新 Contract 重做，非僅驗證。
