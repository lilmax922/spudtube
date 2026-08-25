# 09: Google Auth（Better Auth，S2）

**What to build:** 僅 `Google OAuth` 的登入：全站 session 識別、登出清空、mutating 端點以真實 session 守護（S2），憑證永不入庫。

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `better-auth/minimal` + `@better-auth/drizzle-adapter` 綁 `getDb()`，`server/api/auth/[...all].ts` 承載，`server/utils/auth.ts` 匯出 `getAuthSession/requireAuthSession` 為唯一 401 守衛；`server/db/schema/auth.ts` 以 `scripts/generate-auth-schema.mts` 自 live 實例生成並顯式綁 adapter
- [ ] Client `app/lib/auth-client.ts`（`better-auth/vue`）+ `AccountMenu`（props/emits，S3 可測）經 `useSession(useFetch)` 水合，`auth.signIn/auth.signOut` 在地化，憑證僅 `GOOGLE_CLIENT_ID/SECRET/BETTER_AUTH_SECRET/URL` 環境變數
- [ ] 守護：後續 `rating/status` 的 `PUT/DELETE/GET` 未登入回 401，已登入跨重整仍有效，登出全站清空；匿名不以 mock token 冒充
- [ ] 測試：以 `internalAdapter.createSession` 建真 `user/session/account` 列並帶 `better-auth.session_token` 實 cookie 的路由整合測試（`fileParallelism: false` 避免 `TRUNCATE CASCADE` 競態），`AccountMenu` 組件測試

> 註：對應 `spudtube-v1 08-google-auth-better-auth` 已於 `main` 以 PR #6 合併；本票為可追溯重述，領票時重點驗證 `S2` 真 session 路徑。
