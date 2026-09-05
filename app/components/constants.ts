// Second-row keys whose cards use the expandable treatment (horror on Movies,
// obsessed on TV Shows). Every other row renders standard cards.
export const EXPANDABLE_SECTION_KEYS: readonly string[] = ['movie.horror', 'tv.obsessed']

// Rows with fewer usable backdrops than one sparse page fall back to standard cards.
export const MIN_EXPANDABLE_TITLES = 5
