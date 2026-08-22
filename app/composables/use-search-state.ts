import type { KeywordSearchState } from './use-keyword-search'
import { useKeywordSearch } from './use-keyword-search'

// The header search field and the page's result grid are separate components, but they
// drive one search session: input lives in the header, results render in the page. This
// singleton keeps both on the same composable instance.
let instance: KeywordSearchState | undefined

export function useSearchState(): KeywordSearchState {
  instance ??= useKeywordSearch()
  return instance
}
