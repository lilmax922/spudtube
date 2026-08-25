# 03: 語言切換（zh-TW/en）與 Region 正交

**What to build:** 站內僅 `zh-TW` / `en` 雙語，`LanguageSwitcher` 是「切換觀看語言」而非僅切 `locale`：切換時 UI 文案與 TMDB 目錄資料語言一同更新；`Region` 僅改 `Availability` 永不篩選 `Title`，兩者皆僅存瀏覽器且正交。

**Blocked by:** 01, 02

**Status:** ready-for-human

- [x] `@nuxtjs/i18n` lazy `zh-TW/en` 雙語（`strategy: no_prefix`，`fallbackLocale: en`），`countryToLocale` / `countryToRegion` / `resolveSelectedRegion` / `resolveDisplayLocale` 純函式直測，`DetectedRegion` 來自平台 `cf-ipcountry` header 經 `useState` 同步 SSR/水合；本站僅此二語，無其他語言
- [x] `Region` 固表 `TW,HK,JP,KR,SG,US,GB,CA,AU,DE,FR,IN,BR,MX`（展示即此順序）以 cookie `spudtube-region` 持久化，僅瀏覽器、永不寫 DB、永不跨裝置、永不篩選 `Title`
- [x] 語言切換語意（本票修正點）：`LanguageSwitcher` 切換 `zh-TW ↔ en` 時同時 (1) 以 `setLocale` + 顯式 `spudtube-locale` cookie 持久化並永久勝過 geo，所有 UI 文案走 locale 檔，與 (2) **同步更新 TMDB 目錄資料語言** — 後續 `search/discover/detail/providers/recommendations/genres/overview` 皆以當前語言的 `language` 參數重取（`zh-TW` 帶 `en` fallback 反之亦然），SSR 的 `html lang` 與 TMDB 語言一致；`DisplayLocale` 與 `Region` 正交，語言不影響 `Availability` 的 `Region` 選擇
- [x] 測試：`shared/i18n` 與 `shared/region` 單元測試、middleware 與 `LanguageSwitcher` 組件測試覆蓋持久抄寫、覆寫語意與**切換後 TMDB 重取**，SSR 檢查 `html lang`、cookie 橋接與 `language` 參數

> 註：對應 `spudtube-v1 02-i18n-foundation` 已於 `main` 合併；本票依最新定義修正為「觀看語言切換（含 TMDB）」，非僅 `locale`，實作時需重構語言→資料流。
