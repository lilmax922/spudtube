# 10: Rating CRUD（與 WatchStatus 獨立）

**What to build:** 每 `User×Title` 恰一 `Rating(AWESOME|GOOD|SUCKS)`：可建可改可刪，私有且獨立於 `WatchStatus`，control 在詳情與清單同步當前值。

**Blocked by:** 01, 07, 09

**Status:** ready-for-agent

- [ ] `rating` 表 `PK(user_id,kind,tmdb_id)` 單列在位改寫（`onConflictDoUpdate`），`PUT` 以衍生 `Rating` schema 經 `apiValidationError` 回 `400 { issues }` 後才進業務，`DELETE` 清除；`GET` 僅登入時觸發，跨 `Title` 導航以 `watch(id)` 同步重置並保留顯示值於短暫失敗時
- [ ] Client `useTitleRating` 樂觀 `label/pending/set/clear` 帶 `pending` 互斥與 `generation` 去競態，`RatingTrio`（38px 觸發 + 40px 三選 `Star/ThumbsUp/ThumbsDown`、覆疊於觸發正中無懸停死角、`<Transition> pop-in`、500ms `Tooltip`、`aria-pressed`、未登入經 `signInRequested` 導 Google）經 `TitleIdentityBlock` 繫入 `title-detail-page.vue`
- [ ] 私有性與隔離：`A` 看不見改不掉刪不掉 `B` 的 `Rating`，列於 `Rated` 時僅己可見；社群熱度與私有 `Rating` 視覺區分，`destructive` 僅破壞性操作
- [ ] 測試：Queries 直測單列改寫/清/跨使用者/僅列 live；路由整合測 `201/200/401/400/cross-user`；`useTitleRating` 含登出重置/樂觀回滾/pending 守衛/id 切換；`RatingTrio` S3 含未登入閘控與 `40px` 觸控

> 註：對應 `spudtube-v1 09-rating-crud` 已於 `main` 合併；本票保留以確保與 Contract 的 `pill/primary/focus` 一致。
