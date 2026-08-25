# 01: Data layer foundation（ADR 0004）

**What to build:** 讓後續所有垂直切片都站在同一資料契約上：Drizzle table 為形狀唯一來源，Zod 在定義處以 `drizzle-zod` 衍生，手寫重複被禁止。`server/db/schema/*` 按表聚合（table/relations/衍生 schemas/row types），`#server/db/schema` 為 app 唯一可跨越 server 邊界的匯入。

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `rating` 與 `title_status(nullable)` 以單數 snake_case 建表，`PK(user_id,kind,tmdb_id)`，`status` 互斥語意以單列原地更新為準（見 spec 狀態機），`Better Auth` 四表不在此管線內
- [ ] 每表檔案內 `Insert*Schema/Select*Schema/Update*Schema` 以 `createInsertSchema` 精煉並 `.omit()`，路由/組件內無現場組合；`server/utils/tmdb/schemas.ts` 手寫 TMDB schema 僅止 server，`movie/tv → Kind` 在邊界映射
- [ ] Query 函式 `verb + camelCase`、收已驗證 payload 與顯式 `userId`、一律以 `userId` 限域、寫入以 `.returning()` 回傳；`kebab-case` 檔名、`strict TS` 與 `pnpm typecheck && pnpm lint --fix && pnpm build` 綠
- [ ] 測試：`server/db/queries/*` 直測互斥轉移與跨使用者隔離（S1 替入/S2 真 session 見後票），資料形狀變更自動傳導至表單與路由

> 註：對應 `spudtube-v1 14-data-layer-foundation` 已於 `main` 以 `ready-for-human` 合併；本票為新基線的可追溯重述，領票時以驗證為主。
