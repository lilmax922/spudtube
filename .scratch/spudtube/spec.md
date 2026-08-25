# SpudTube

Status: ready-for-agent

Supersedes: `.scratch/spudtube-v1/spec.md` (v1 推翻). 本規格以 `CONTEXT.md` + `docs/agents/design-system.md`（Contract）+ `docs/design/prototype.html`（暫定可視化參考，`TEMPORARY REFERENCE ONLY`）+ `docs/agents/code-standard.md` 為收斂輸入。`tailwind.css` 為 token 唯一真相。

## Problem Statement

我看完一部作品就不知道下一部該看什麼。上網只告訴我片子存在，卻不告訴我在我所在 Region 能不能真的串流；逐家點開 Provider 確認很費時；而沒有任何地方記得我已看過什麼、哪些我覺得 AWESOME、哪些想放進 Watchlist。結果「今晚看什麼」的時刻總是結束在更多的分頁，而不是一部好片。

視覺上，若沒有一致的夜空基準與 token 階梯，畫面會以邊框、彩色光暈與文字漸層拼湊層級，最終讓海報與文字退位、介面喧賓奪主。

## Solution

SpudTube 是幫助決策「看什麼」的 web app。訪客落地即見海報網格，可在 Movies / TV Shows（Kind）與多 Genre 之間探索，或用關鍵字橫跨兩種 Kind 同時搜尋；每部 Title 都有詳情頁，呈現海報、背板、簡介、Genre、年份、片長/季集數、預告片、相似推薦，以及「在某個 Region 有哪些 Provider 可看」的 Availability（依訂閱→免費→租借→購買分組，預設為 DetectedRegion）。登入（Google）後可對任意 Title 給出唯一 Rating（AWESOME / GOOD / SUCKS，可改可刪）並以互斥的 WatchStatus 管理 Watchlist 與 Watched，全部集中於 My List 的三個分頁。

視覺上，SpudTube 是一套 dark-only 的夜空系統：畫布近黑，表面以 `background → card → muted → popover` 階梯與陰影分層，不靠邊框與彩色光暈；海報原圖是主要色彩來源，UI 本身去色；字型全站 Outfit（400/500/700/800，中文 fallback Noto Sans TC），僅 metadata 啟用 `tabular-nums`。所有顏色、間距、圓角、陰影的數值唯一寫入 `app/assets/css/tailwind.css`（`:root == .dark`），`docs/agents/design-system.md` 只定義規則與用法，不重抄 `oklch(...)`；`docs/design/prototype.html` 僅作互動理解，最終像素以本規格與後續票證動態收斂為準。

## User Stories

### 零儀式探索（不需登入）

1. As a Visitor, I want to land directly on a browsable poster grid, so that I can start hunting with zero ceremony.
2. As a Visitor, I want to toggle Kind between MOVIE and TV_SHOW while browsing, so that I only see the kind I’m in the mood for.
3. As a Visitor, I want to select multiple Genres and see Titles matching ANY of them (OR), so that broad moods like “thriller or comedy” are one click away.
4. As a Visitor, I want browse results ordered by popularity by default, so that the first screen shows what people actually watch.
5. As a Visitor, I want infinite scroll to append the next page as I reach the bottom, so that I keep browsing without pagination clicks.
6. As a Visitor, I want browse and keyword search to be two separate modes, so that mixed filters never produce confusing half-filtered results.
7. As a Visitor, I want to keyword-search across movies AND TV shows at once, so that I can find a Title even when I’m unsure of its Kind.
8. As a Visitor, I want search results to keep loading on scroll as well, so that long result sets remain browsable.
9. As a Visitor, I want the search overlay to be reachable from the header and dismissible by backdrop/close, so that search never traps me.

### Title 詳情

10. As a Visitor, I want a detail page per Title showing poster, backdrop, overview, Genres, release year and runtime/season info, so that I can judge whether it’s for me.
11. As a Visitor, I want to play the trailer on the detail page (dialog or inline), so that I can sample it before committing.
12. As a Visitor, I want a recommendations strip on the detail page, so that finishing one Title leads straight to the next candidate.
13. As a Visitor, I want missing artwork to degrade gracefully (e.g. glyph + title), so that the grid never shows a broken image.
14. As a Visitor, I want overviews in DisplayLocale `zh-TW` with automatic `en` fallback, so that untranslated Titles remain readable.
15. As a Visitor, I want a clear “no longer in catalog” treatment when a previously rated/list-referenced Title disappears from TMDB, so that my lists don’t error.

### Availability 與 Region

16. As a Visitor, I want to see which Providers carry a Title in a given Region (Availability), so that I know where it’s actually watchable.
17. As a Visitor, I want Availability grouped as subscription → free → rent → buy, so that I see the cheapest/primary ways first.
18. As a Visitor, I want Provider identity conveyed by icon (not a fixed color block), so that I recognize services without systemic color pollution.
19. As a Visitor, I want Availability to show a region-aware empty state when a Title has zero Providers in my Region, but the Title still appears everywhere else, so that the catalog never silently hides things from me.
20. As a Visitor, I want the Region for Availability to default to DetectedRegion (country inferred from the request IP/platform header), so that the answer is relevant before I touch anything.
21. As a Visitor, I want to switch Region from a curated list (TW, HK, JP, KR, SG, US, GB, CA, AU, DE, FR, IN, BR, MX in that display order), so that I can check where else a Title streams (e.g. before travelling).
22. As a Visitor, I want my chosen Region remembered by this browser only (never in DB, never cross-device), so that I stop re-selecting it every visit without dragging travel experiments to another device.
23. As a Visitor, I want Region to never filter which Titles exist or appear; it only changes which Providers are shown, so that browsing stays stable while Availability is contextual.

### 語言與在地化

24. As a Visitor, I want the interface rendered in `zh-TW` if DetectedRegion is TW and `en` otherwise, so that it reads natively on first visit.
25. As a Visitor, I want a manual language switcher in the header (zh-TW ↔ en, 站內僅此二語) that permanently overrides the geo default for this browser **and immediately re-fetches TMDB catalog data in the chosen language**, so that my choice beats IP guessing forever and titles/overviews/genres stay in the language I’m viewing.
26. As a Visitor, I want language and Region to remain orthogonal — language determines UI + TMDB data language, Region determines Availability only — so that switching language never changes which Providers are listed for a given Region and vice versa.
27. As a Visitor, I want all UI copy to come from locale files and be coverable by tests, so that zh-TW/en stay in sync.

### 帳號

28. As a Visitor, I want to sign in with Google OAuth in one step, so that I don’t create yet another password.
29. As a Visitor, I want browsing, search, detail and Availability to work fully without signing in, so that an account is only needed for private tracking.
30. As a Visitor, I want authenticated paths to be protected server-side (401 when unauthenticated), so that my data can’t be spoofed from the client.
31. As a User, I want to see my account menu (name/avatar, language, my-list entry, sign-out) when signed in, so that I know who I am and where my lists are.

### Rating（與 WatchStatus 獨立）

32. As a User, I want to rate a Title as AWESOME, GOOD, or SUCKS (exactly one of the three), so that I record my verdict in seconds.
33. As a User, I want exactly one Rating per User per Title, so that my history stays unambiguous.
34. As a User, I want to change or delete my Rating later, so that second thoughts are free.
35. As a User, I want to rate a Title regardless of its WatchStatus, so that Rating is never gated by bookkeeping.
36. As a User, I want my Ratings visible only to me, so that opinions stay private.
37. As a User, I want the rating control to reflect the current Rating on detail and on any list that shows it, so that I don’t re-rate blindly.
38. As a Visitor, I want TMDB community popularity/rating signals (if shown) to be clearly distinct from my private Rating, so that I don’t confuse the two systems.

### WatchStatus 與 My List（互斥）

39. As a User, I want to put a Title on my Watchlist (WATCHLISTED), so that I remember what looked promising.
40. As a User, I want to mark a Title as watched (WATCHED), so that it moves out of my to-watch pile.
41. As a User, I want marking a Title WATCHED to automatically remove it from Watchlist (and vice versa: re-watchlisting a WATCHED Title moves it back), so that the two states never contradict each other.
42. As a User, I want exactly one WatchStatus per User per Title: WATCHLISTED, WATCHED, or none; clearing sets none, so that state is unambiguous.
43. As a User, I want one My List page with three tabs — Watchlist, Watched, Rated — so that all my tracking lives in one place.
44. As a User, I want each entry on My List to show current poster and localized name for the Title, so that I recognize entries at a glance.
45. As a User, I want removing a Title from Watchlist/Watched or deleting a Rating to update My List optimistically and be undo-safe, so that list maintenance feels instant.
46. As a User, I want My List tabs to batch-fetch live TMDB details for stored references at read time, so that posters/names stay fresh without a catalog mirror.

### 視覺與互動一致性（基於 Contract）

47. As a Visitor, I want the entire app to be dark-only (no light theme), so that the night-sky canvas feels coherent end-to-end.
48. As a Visitor, I want surfaces to be borderless — cards and sections carry no 1px border — and depth to come from the `background→card→muted→popover` ladder plus shadow/blur, so that the hierarchy is calm, not hairline-noisy.
49. As a Visitor, I want borders to appear only where the Contract allows (input, popover, divider), so that I learn a consistent visual language.
50. As a Visitor, I want `primary` to be a scarce neutral near-white used only for primary action, selected state and focus ring (not brand), so that attention is guided intentionally.
51. As a Visitor, I want destructive styling to appear only on truly destructive actions, so that red means danger.
52. As a Visitor, I want posters to be the primary color source and UI chrome to stay de-saturated, so that content is the hero.
53. As a Visitor, I want title cards to have no border or colored halo (Prime reference, Image1), and card depth to come from surface + `0 4px 12px rgba(0,0,0,.25)` only.
54. As a Visitor, I want popovers/dropdowns to use `popover` surface + 1px `border` + `0 16px 48px rgba(0,0,0,.55)` and focus states to use `0 0 0 2px color-mix(in oklab, ring 20%, transparent)`, so that elevation is predictable.
55. As a Visitor, I want all text to be Outfit (`400` body, `500` buttons/chips, `700` section heading, `800` hero) with `Noto Sans TC` as Chinese fallback and no Mono, so that typography feels like one family.
56. As a Visitor, I want numeric metadata (year, runtime, counts) to be the only place using `tabular-nums`, so that numbers align without affecting prose.
57. As a Visitor, I want hierarchy to come from weight + negative tracking on large titles (e.g. hero), not from color or decoration, with body anchored at ~`14/400/1.7`, so that scale is principled without locking 36/24px.
58. As a Visitor, I want spacing to follow the 4px base scale (xxs 4, xs 8, sm 12, md 16, lg 24, xl 32, xxl 48) with `lg` between groups and `xxl` between sections, so that rhythm is consistent.
59. As a Visitor, I want browse grids to be `repeat(auto-fill, minmax(240px,1fr))` with 16px gap inside a centered 1280px container with 24px side padding, collapsing to 168px on Mobile and 220px on Tablet, so that density adapts gracefully.
60. As a Visitor, I want cards to be `rounded lg 12px`, buttons/chips to be `pill 9999px`, inputs to be `md 8px`, and hero/detail posters to keep `16:9` (cards) / `2:3` (detail) with correct rounding, so that shape language is unified.
61. As a Visitor, I want the only banned gradient to be `background-clip:text` on text; functional black masks for readability (e.g. `linear-gradient(to top, rgba(0,0,0,.62)→transparent)`) are allowed and constrained to `rgba(0,0,0,.xx)` with no brand color, so that legibility never introduces hue.
62. As a Visitor, I want no decorative colored gradients or glows in the background, so that the dark canvas itself is the whitespace.
63. As a Visitor, I want interactive states (hover/loading/empty/error), focus-visible rings and ≥40px touch targets (chips 30px but 40px hit area) to be consistent wherever a `shadcn-vue` component is available (checked first, hand-rolled only with a11y补齐), so that the product feels like one system.
64. As a Visitor, I want header behavior, sticky filter bar, row carousels, search overlay and detail layout to behave as a coherent responsive system (Desktop 1280 / Tablet 880 / Mobile 560, header never collapses to hamburger, grid keeps its columns, popovers stay centered not full-drawer, mobile hides hover cards), so that resizing never breaks the experience.
65. As a Visitor, I want TMDB/JustWatch attribution to be present wherever provider data appears, including the footer, so that licensing is respected.

### 系統品質

66. As a Visitor, I want pages to render with SSR (Nuxt on Cloudflare Pages/Workers) and hydrate cleanly, so that first paint is fast and shareable.
67. As a Developer, I want every code change to leave `pnpm typecheck && pnpm lint --fix && pnpm build` green, so that the Definition of Done is enforceable.

## Implementation Decisions

**詞彙與 ADR 約束（必讀）**：全規格使用 `CONTEXT.md` 的典範用語（Title/Kind/Genre/Region/DetectedRegion/Provider/Availability/DisplayLocale/User/Rating/WatchStatus/Watchlist），並遵守已決 ADR：0001 TMDB watch providers over direct JustWatch、0002 Nuxt/Better Auth/Drizzle/Postgres/Cloudflare Workers 鎖定、0003 reference-only storage（無 Title 鏡像）、0004 Drizzle 為唯一來源並以 `drizzle-zod` 衍生 Zod。任何與 ADR 衝突的改動須先以 ADR 覆寫。

**視覺 Contract（decoupled，Contract not pixels）**：
- `docs/agents/design-system.md` 為唯一視覺 Contract，`app/assets/css/tailwind.css`（`:root == .dark`）為 token 唯一寫入處；文件僅以 `{colors.xxx}` / `{spacing.xxx}` / `{rounded.xxx}` 引用，不重抄 `oklch(...)` 數值。`docs/design/prototype.html` 僅為暫定可視化參考（檔頭 `TEMPORARY REFERENCE ONLY`），不作為依據；最終樣式以本規格與各票證動態收斂為準（雙向對稱標註：基準與原型皆已聲明）。
- **Dark-only 凍結**：全站僅深色，無亮色主題。未來如需亮色，須以本 Contract 的 dark 階梯為對照另建一套 surface 體系並以 ADR 記錄（Known Gaps）。
- **品牌色預留但未啟用**：現階段無品牌色、無 Logo；`--primary` 為中性近白，僅作主行動/選中態/focus ring 的稀缺功能色；`--destructive` 為唯一語意色。啟用單一品牌色須以 ADR 補齊 `primary/primary-foreground/ring` 的對比與可及性對照，且不得影響 `destructive`。
- **無邊框表面（Prime Image1 參照）**：卡片與區塊不以 1px 邊框承載層級；深度由 surface 階梯 + 陰影 + 少量 `blur(10-12px)` 承載；`border/input` 僅用於輸入框、彈層與分隔線。卡片陰影 `0 4px 12px rgba(0,0,0,.25)`、彈層 `0 16px 48px rgba(0,0,0,.55)` + 1px `border`，focus 為 `0 0 0 2px color-mix(in oklab, ring 20%, transparent)`。表面數值、圓角、間距、網格、斷點皆為凍結狀態，調整須以單獨票證驗證，不得以原型為依據。
- **內容為主角、UI 去色**：海報原圖是畫面主要色彩來源，UI 本身保持去色；Provider 以 icon 識別，不以固定色塊作為系統色。
- **漸層禁令的精確邊界**：僅禁止對文字的 `background-clip:text` 漸層；為可讀性服務的功能性黑色遮罩（`rgba(0,0,0,.xx) → transparent`，如壓於海報上的底部加深）屬於允許範疇，不得引入品牌色或彩色光暈；裝飾性彩色漸層與光暈背景一律禁止。
- **字型**：全站唯一 Outfit，權重 `400/500/700/800`（`400` 內文、`500` 按鈕/標籤、`700` 區塊標題、`800` 主視覺），`--font-sans: 'Outfit','Noto Sans TC',ui-sans-serif,system-ui,sans-serif`（`tailwind.css` 與 `components.json: font outfit` 已落地）；中文字僅作 fallback，不作第二字族；Mono 不使用。僅 `metadata/price/rating` 等數據文字啟用 `tabular-nums`，其餘不啟用。字階不鎖死 36/24px，同一字族內以 `800→400` 字重落差與負字距建立層級，內文錨點約 `14/400/1.7`。
- **Spacing/Grid/Container/Breakpoints（凍結）**：4px 基數，`xxs 4 · xs 8 · sm 12 · md 16 · lg 24 · xl 32 · xxl 48`；區塊間距 `lg`、大區塊 `xxl`；max content 1280，結果網格 `repeat(auto-fill, minmax(240px,1fr))` gap 16（窄視口 `minmax(168px,1fr)`，Tablet `220px`），容器左右 24 內距；斷點 Desktop 1280 / Tablet 880 / Mobile 560。空白哲學：深色畫布本身就是留白，以表面階梯+陰影+間距區隔。
- **形狀**：`md 8`（輸入/次要控制）、`lg 12`（卡片）、`pill/full 9999`（按鈕/chips/圓形）；海報 `16:9 / 12px`、詳情海報 `2:3 / var(--radius)`，維持比例不裁切。
- **元件原則（非像素合約）**：實作優先查 `shadcn-vue`（`components.json: style reka-nova / baseColor neutral / iconLibrary lucide / font outfit`）再手刻；手刻須補 `focus-visible` 與 ≥40px 觸控區。Buttons（primary/ghost/outline）、Chips/Segments、Cards/Inputs、Navigation/Footer 的結構與 token 綁定以 `design-system.md: Components` 為準，未列出的視覺型式視為未核准，具體像素由各功能 spec 落地。

**Prototype 的角色與決策擷取**：原型展示了 header 透明→不透明、kind/genre 過濾列、橫向 Rows/網格、搜尋彈層、詳情全幅 hero + 左右 cinemap 遮罩與雙欄（主欄/黏性 Facts）、預告片 dialog、My List 三分頁等互動流，僅作理解動線之用。原型內嵌 Inter 與部份示意文案與基準 Outfit 不一致屬預期（原型不作為依據）。若需將原型的某段狀態機或 schema 編為決策，僅擷取決策核心（如 WatchStatus 狀態機）並註明來自原型，刪去 demo 性質的 markup。

**外部資料（ADR 0001）**：TMDB 為唯一外部來源（含 JustWatch 授權的 Availability）。所有 TMDB 流量走單一 server-side client 模組（typed ops：multi-search、discover by kind/genre/popularity、title detail、providers、recommendations、genre lists，其 `language` 參數跟隨當前觀看語言 `zh-TW/en`，另一語為 fallback），token 僅存於 server env（`TMDB_TOKEN`）。Provider logos 來自 TMDB image CDN；TMDB 與 JustWatch 署名在任何出現 provider 資料之處（包括 footer）皆可見。回應以 `cachedEventHandler` 做 server-side 快取（cache key 含 `language`）：詳情/providers ~24h、search/discover 分鐘級；上游 404 做 ~1h 負快取，使已下架 Title 優雅降級而不重擊 API。

**儲存（ADR 0003）**：DB 僅存參照，無 `titles` 鏡像。Better Auth 四表（`user/session/account/verification`）之外：
- `rating`：`user_id, kind, tmdb_id, label (AWESOME|GOOD|SUCKS), timestamps`，PK `(user_id,kind,tmdb_id)`，一 Rating per User per Title；標籤為典範，數字僅作展示排序。
- `title_status`：`user_id, kind, tmdb_id, status (WATCHLISTED|WATCHED nullable), timestamps`，同 PK；`NULL` 表無狀態，清除狀態設 `NULL` 而非刪列。

狀態機（每 User×Title 恰一狀態）：`none → WATCHLISTED → WATCHED → none`，在同一列上原地更新 — 設 `WATCHED` 覆寫 `WATCHLISTED`，已看再加入 Watchlist 則移回，清除設 `NULL`。命名沿用 code-standard：單數 snake_case 表與欄，FK 為 `<table>_id`。與原型 `watchlist/watched Set` 可共存的示意不同，正規語意以 CONTEXT.md 的互斥定義為準：
```ts
// 來自原型與 CONTEXT.md 的決策精煉：互斥 WatchStatus（決策核心，markup 已刪）
// none -> WATCHLISTED -> WATCHED -> none，按 CONTEXT.md 覆寫語意
type WatchStatus = 'WATCHLISTED' | 'WATCHED' | null
```

**資料層衍生（ADR 0004）**：Drizzle table 為形狀唯一來源；所有 runtime Zod 以 `drizzle-zod` 於定義處衍生（`createInsertSchema` 精煉並 `.omit()`），路由/組件內禁止現場組合。`server/db/` 下按表分檔聚合（table/relations/衍生 schemas/row types），`server/db/index.ts` 為 client 入口，`#server/db/schema` barrel 為 app 唯一可跨越 server 邊界的匯入（pg-core 無依賴，安全）。Query 函式皆 `verb + camelCase`、收已驗證 payload 與顯式 `userId`、一律以 `userId` 限域、寫入以 `.returning()` 回傳。`server/utils/tmdb/schemas.ts` 的手寫 Zod 僅止於 server，TMDB 的 `movie/tv` 在邊界映射為典範 `Kind`。Better Auth 表不在此管線內。

**驗證與錯誤合約**：client→server 寫入與 TMDB payload 皆在邊界以 Zod 解析；手寫 TMDB schema 僅 server-only。驗證失敗回 `400 { issues }`，由單一 helper 以 `z.flattenError` 產出並以共用 `ApiValidationError` 型別描述。Client 表單以 `vee-validate + zodResolver` 綁定與 server 同一 schema 物件。錯誤文案以 DisplayLocale 在地化。

**Auth**：Better Auth + Google OAuth 唯一 provider。Mutating 端點（rating/status CRUD）需有效 session，其餘公開。無 email/password、無其他 provider。

**DB 環境**：本地 Docker Postgres（compose、volume、healthcheck）；正式環境 Supabase Postgres 經由 transaction pooler + Cloudflare Hyperdrive 綁定；兩者僅連線配置不同。Suite 需本地 Postgres 啟動（`DATABASE_URL` 指向容器）。

**Region**：`DetectedRegion` 來自平台注入的 country header（Cloudflare/Workers），作為已選 Region 的初始值。已選 Region 僅存於瀏覽器（localStorage/cookie），永不寫 DB、永不跨裝置；永不篩選 Title，僅改變 Availability 顯示。選擇器為固定 14 個（TW, HK, JP, KR, SG, US, GB, CA, AU, DE, FR, IN, BR, MX，展示即此順序），結構預留擴充。

**語言（zh-TW/en 雙語，切換即重取 TMDB）**：`@nuxtjs/i18n`，lazy locales `zh-TW/en`（本站僅此二語）。預設沿用與 DetectedRegion 同一 country 信號（TW→zh-TW，其餘→en）；`LanguageSwitcher` 為「切換觀看語言」而非僅切 `locale` — 手動切換 `zh-TW ↔ en` 後永久覆寫 geo 預設並同時重取 TMDB 目錄資料：後續 `search/discover/detail/providers/recommendations/genres/overview` 皆以當前語言的 `language` 參數請求（當前 `zh-TW` 則 `en` 為 fallback，反之亦然），SSR 的 `html lang` 與 TMDB 語言一致。語言與 `Region` 正交，語言不影響 `Availability` 的 `Region` 選擇。

**路由與 UX**：
- 獨立路由 `/movie/[id]` 與 `/tv/[id]`。
- Home 落地即網格：Kind toggle 僅在 browse 模式生效；關鍵字模式走 TMDB multi-search 橫跨兩 Kind；Genres 以 OR（`with_genres=18|10765`）串接；預設 popularity 排序；無限滾動驅動分頁。
- My List 單頁三 tab（Watchlist/Watched/Rated）；Rated 以已存參照批次請求 TMDB 詳情即時組裝。
- 詳情頁組成：識別區塊（backdrop/poster/overview/genres/year/runtime）、預告片、Availability 面板（含 Region 切換）、User actions（rating trio + status toggle）、推薦列（TMDB recommendations  verbatim）；不含 cast。
- 原型的 hero 輪播/橫向 Rows/懸浮展開卡/搜尋彈層等僅作暫定視覺參考，最終互動與斷點行為以 `design-system.md: Responsive Behavior` 與本規格故事 64 為準：header 恆可見不折漢堡、網格保持欄數僅縮卡寬、彈層窄視口仍置中、Mobile 隱藏 hover 卡、觸控目標 ≥40px。

**UI 技術棧**：`shadcn-vue`（`reka-nova`）+ Tailwind CSS（shadcn 的硬依賴，不用 UnoCSS）+ pnpm。`components/ui/**` 的 PascalCase 產出須更名為 kebab-case 並修正相對匯入。所有慣例（kebab 檔名、禁用 auto-imports、`@antfu/eslint-config` 為唯一 formatter — `single quotes/no semi/2-space/dangling commas/sorted imports/interface over type`、strict TS、`<script setup lang="ts>`、`shallowRef` 優先）皆依 `code-standard.md`，DoD 為每任務結束 `pnpm typecheck && pnpm lint --fix && pnpm build` 皆綠（`pnpm test` 為品質門檻，見 Testing Decisions）。Token 唯一撰寫位置 `tailwind.css`，元件 token 一律以 `{colors.*}`/`{spacing.*}` 引用。

**Hosting**：Nuxt SSR on Cloudflare Pages/Workers；`main` 推送自動部署；`nitro.preset: cloudflare_pages`；`wrangler.jsonc: HYPERDRIVE + smart placement & observability`。

## Testing Decisions

什麼是好測試：只測外部可觀察行為（路由回什麼、組件畫出什麼/發出什麼），不測內部呼叫圖。若重構迫使測試重寫，表示測試瞄錯了。

**切縫（已與持有者確認，沿用 v1）**：
- **S1 — TMDB client 模組（唯一新增縫）**：所有 TMDB 互動必經此模組；server-side 測試在其上替入 fake。Mappers、快取行為、Availability 分組、路由邏輯皆對 fake 演練；外部世界僅此一替換點。
- **S2 — Better Auth 本身（現有）**：需登入路徑的測試經由 Drizzle fixtures / Better Auth API 建立 User 與 session，並帶真實 session cookie；不手刻 token、不 mock auth 層。
- **S3 — Vue 組件邊界（現有慣例）**：組件收 props 發 emits；data composables 在其匯入處以模組 mock 替換；斷言止於渲染輸出與發出事件。

**Tokens 不另開縫**：`tailwind.css` 的視覺 token 以渲染斷言與視覺對照驗證，不 mock CSS。

**分層**：
- 純邏輯直測匯出介面：WatchStatus 互斥轉移、Availability 分組/排序（subscription→free→rent→buy）、country→locale 映射、Genre OR 語意。
- Nitro 路由整合層：真實本地 Docker Postgres + 假 S1；覆蓋 discover/search/detail/providers/recommendations/availability、rating/status CRUD 的鑑權與互斥語意、My List 的批次組裝與下架降級。
- 組件層：happy-dom via `@nuxt/test-utils`；`TitleCard`、`KindToggle`、`GenreChips`、`BrowseGrid`、`TitleDetail`、`AvailabilityPanel`、`RatingTrio`、`TitleStatusToggle`、`LanguageSwitcher`、`AttributionFooter` 等；共用 `title-detail-fixtures` 與 `availability-fixtures`。

**Prior art**：綠地起步，沿用 v1 已建立的 tiers 與 fixtures。首批票應補齊 `fake TMDB payloads` 與 `session fixtures` helper，使後續測試低成本。既有測試沿用 `describe/it`、colocated `foo.test.ts`、網路僅在 S1/S3 mock、operations 需本地 Postgres up（`DATABASE_URL` 指向容器）。

**操作期望**：`pnpm test` 需本地 Postgres；CI 需 `TMDB_TOKEN` 的 fake/secrets 不得外洩；所有新增測試皆須通過 `typecheck/lint/build` 閘門。

## Out of Scope

- 任何直接 JustWatch 整合
- Cast/crew 列表、人物頁
- Season/episode 細粒度 — Title 為整部作品
- 公開或社群化的評分、聚合、profile
- Region / DisplayLocale 的跨裝置同步
- 年份/日期篩選、popularity 以外的進階排序
- Storybook；瀏覽器級 E2E（首版部署後再議）
- 額外 OAuth provider、email/password
- zh-TW/en 以外的語言
- 個人化推薦演算（推薦即 TMDB recommendations verbatim）
- 亮色主題（dark-only 凍結）
- 品牌色與 Logo（預留插槽未啟用，未經 ADR 不得引入）
- 文字 `background-clip:text` 漸層、裝飾性彩色漸層/光暈、卡片邊框/彩色陰影、Provider 固定色塊
- 管理後台、分析、通知

## Further Notes

人工前置（建議以 `scripts/production-wizard.mjs` 走 wizard）：取得 TMDB API read token；建立 GCP OAuth client 並加入 localhost 與正式域的 redirect URIs；建 Supabase 專案並複製 pooled connection string；本地啟動 Docker。

Catalog drift：reference-only 儲存的後果 — 已參照的 Title 若被 TMDB 移除，須優雅降級（如 My List 的「no longer in catalog」）而非報錯。

詞彙與決策索引：`CONTEXT.md` 為用語權威；`docs/adr/0001-0004` 記錄資料源、stack、儲存、資料層之 why；`docs/agents/design-system.md` 為視覺權威；`docs/design/prototype.html`（含 `TEMPORARY REFERENCE ONLY` 檔頭）僅作動線理解。`docs/adr/0005` 為預期空號（design-system 脫鉤後未續編），後續 ADR 自 0005 續編。

DoD 重申：任何改動程式碼的任務，僅在 `pnpm typecheck && pnpm lint --fix && pnpm build`（含 `pnpm test` 品質門檻）皆綠時視為完成；`tailwind.css` 為 token 唯一真相，元件優先 `shadcn-vue` 再手刻，手刻必補 `focus-visible` 與 ≥40px 觸控區。

## Comments

2026-08-25: 由 `docs/design-system-decoupled` 分支的 Contract（Q1-Q15 定版：Contract 瘦身/雙軌/dark-only 凍結/品牌插槽/去色/無邊框/僅禁文字漸層/Outfit/凍結表面/圓角陰影/間距網格斷點）收斂，取代 v1 規格；明確 WatchStatus 互斥、Rating 獨立、Region 僅影響 Availability、Provider icon 化等用語邊界，以及卡片無邊框/僅禁文字漸層/Outfit 全站等視覺規則如何以 `{colors.*}`/`{spacing.*}` token 落地；縫沿用 v1 三縫並獲持有者確認。
