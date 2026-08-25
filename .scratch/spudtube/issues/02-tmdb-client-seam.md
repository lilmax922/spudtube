# 02: TMDB client seam（S1 唯一新增縫）

**What to build:** 所有 TMDB 互動必經單一 client 模組，測試以 fake 演練、正式環境以 `TMDB_TOKEN`（僅 server env）走真實傳輸；外部世界僅此一替換點。

**Blocked by:** 01

**Status:** ready-for-human

- [x] `server/tmdb/client.ts` 提供 typed ops：`searchMulti`、`discover(kind,{genreIds,page})`、`title(kind,id) → null on 404`、`watchProviders(kind,id)`、`recommendations`、`genres`，皆經手寫 Zod 在邊界解析，`movie/tv` 映射為典範 `Kind`
- [x] `cachedEventHandler` 分層快取：`detail/providers/genres ~24h`、`search/discover/recommendations 分鐘級`、`404 負快取 ~1h`（優雅降級不重擊上游），傳輸失敗不快取
- [x] 語言 `zh-TW` 為主帶 `en` fallback（`translations/videos`），trailer 擇優；Provider logos 取 TMDB CDN，token 永不外洩至 client bundle；`language` 依 `TW/CN → zh-TW` 其餘 `en` 自動偵測（`shared/i18n/locale.ts:29` + `server/utils/locale.ts:6` `getRequestLocale`），`spudtube-locale` cookie 永久覆寫 geo
- [x] 測試：`server/tmdb/*` 以 `createFakeTransport` 覆蓋 URL/params/Bearer、映射輸出、TTL 與 `now` 注入的過期；`server/api/catalog/*` 以 `createRouter` 走真實 request→response 邊界對 fake 客戶端驗證（`cf-ipcountry`/`cookie` auto-detect 覆蓋）

> 註：對應 `spudtube-v1 03-tmdb-client-seam` 已於 `main` 合併；本票保留全景以利後票以 `S1` 為唯一縫。
