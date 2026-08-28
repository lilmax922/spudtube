# 11: WatchStatus 與 My List（互斥狀態機）

**What to build:** 詳情頁的 `WatchStatus` 切換與單頁三 tab `My List`：`WATCHLISTED ↔ WATCHED` 互斥單列、批次以 live TMDB 組裝、被下架者優雅降級，未登入以 302 守護。

**Blocked by:** 01, 07, 09

**Status:** ready-for-human

- [x] `title_status` 單列 nullable `status(WATCHLISTED|WATCHED|null)`，`upsertTitleStatus/clearTitleStatus(findTitleStatuses)` 以 `onConflictDoUpdate` 實現狀態機 `none→WATCHLISTED→WATCHED→none`（`WATCHED` 覆寫 `WATCHLISTED`、再加入移回、清除設 `NULL` 留列），`findTitleStatuses` 僅回 live 列依 `updatedAt` 倒序
```ts
// 來自原型與 CONTEXT.md 的決策精煉（已刪 markup）
type WatchStatus = 'WATCHLISTED' | 'WATCHED' | null
```
- [x] `GET /api/my-list` 回 `{watchlist,watched,rated}`，每筆 `{kind,tmdbId,title}` 中 `title` 以 `Promise.all` 對去重 `Title` 批次取 live `summary`（`rated` 倒序），`null` 表下架或瞬時上游錯，整表不 500；路由含 `PUT/GET/DELETE /api/status/[kind]/[id]` 的 `401/400/cross-user` 守衛
- [x] Client `useTitleStatus`（樂觀 `status/pending/set/clear`、僅登入觸發 `GET`、`watch(id)` 重取、失敗保留顯示值）+ `TitleStatusToggle`（`Bookmark/CircleCheck 38px` 以單 `ACTIONS` 配置驅動）+ `MyList` 三 tab（`Watchlist/Watched/Rated`）以 `#server` 共用 `MyList/MyListEntry` 型別，列項 `poster + name + year` 連結至詳情，下架列為 muted 降級列不破表
- [x] 守護：`/my-list` 以 `app/middleware/my-list.ts` 對匿名 `302 → /`（端點永不被匿名呼叫），詳情切換仍以 `signInRequested` 導 Google；header `My List` 僅登入可見，登出回 `/`
- [x] 測試：queries 5（在位轉換/清留列/跨使用者/僅 live 列）、status 路由 7、`/my-list` 5（含批次去重與降級）、`useTitleStatus` 9（含 id 切換與 keep-on-failure）、`TitleStatusToggle` 7、`title-identity-block` 3 轉發、`my-list` 4（tabs/live/degraded）、middleware 2

> 註：對應 `spudtube-v1 10-watchstatus-my-list` 雖已於 `main` 合併，但本票標為 **UI/UX 完整重構**：`My List` 三 tab、`TitleStatusToggle`、`MyList` 列項的無邊框/陰影/`pill`/`Outfit` 與空/降級態皆須依新 Contract 重做，非僅驗證；資料層語意不變但視覺全面重構。
