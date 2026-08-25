# 13: Production deploy

**What to build:** 推 `main` 即部署：`Nuxt SSR` 於 Cloudflare Pages/Workers，`Supabase` 經 `Hyperdrive` 的 pooler 到達，`TMDB` 與 `Google OAuth` 活線可驗，署名完整。

**Blocked by:** 01, 09

**Status:** ready-for-agent

- [ ] `nuxt.config.ts: nitro.preset cloudflare_pages`、`wrangler.jsonc: HYPERDRIVE + smart placement & observability`、`npx wrangler types` 產型、`HYPERDRIVE` 綁定經 `getDb()` 注入；`DATABASE_URL` 本地直連、正式環境走 pooler + Hyperdrive，兩者僅連線配置不同
- [ ] `scripts/production-wizard.mjs` 覆蓋人工作業：TMDB v4 Bearer、Supabase pooler URL、`wrangler hyperdrive create`、GCP `GOOGLE_CLIENT_ID/SECRET` 與 localhost/正式域的 `authorized JS origins / redirect URIs`、`BETTER_AUTH_SECRET/URL` 平台密鑰、`pnpm db:migrate`（含 `BETTER_AUTH_URL` 臨時直連 pooler）、`.dev.vars` 本地 Pages 預覽
- [ ] 上線驗證：live TMDB（search/discover/detail/providers/recommendations/genre）、Google 往返（`user/session/account` 落庫、重整留 session、登出清）、`Availability` 經 Hyperdrive 可讀、footer 與面板署名（`TMDB + JustWatch`，logo 取 TMDB CDN）
- [ ] 品質閘：`pnpm typecheck && pnpm lint --fix && pnpm build && pnpm test` 綠，`main` 推送自動部署

> 註：對應 `spudtube-v1 13-production-deploy` 已於 `main` 以 PR #15 合併並於 `5a1a54e` 標 `ready-for-human`；本票為新基線的可追溯重述，領票時以 wizard 與活線驗證為主。
