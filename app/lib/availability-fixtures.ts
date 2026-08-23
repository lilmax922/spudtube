import type { Provider, ProviderCatalog } from '#server/tmdb/types'

export const CATCHPLAY_PLUS: Provider = {
  id: 250,
  name: 'CATCHPLAY+',
  logoPath: '/o6B5W5Yb2DwmJwqVjknSxqVtLxJ.jpg',
}

export const NETFLIX: Provider = {
  id: 8,
  name: 'Netflix',
  logoPath: '/t2yyOv40HZeVlLjMcCsANnTv9FW.jpg',
}

export const DISNEY_PLUS: Provider = {
  id: 337,
  name: 'Disney+',
  logoPath: '/7rwgEs15tFyRZVQTIz9FFI9WzkD.jpg',
}

export const APPLE_TV: Provider = {
  id: 350,
  name: 'Apple TV',
  logoPath: '/4KAy34EHvQboEF0Rc9GzVOF9TVv.jpg',
}

export const GOOGLE_PLAY: Provider = {
  id: 2,
  name: 'Google Play Movies',
  logoPath: '/tbEdFQDwx5LEVr8WpSeXQSIirVq.jpg',
}

/** Multi-region catalog: TW subscription-only, US with every group populated. */
export const PROVIDER_CATALOG: ProviderCatalog = {
  TW: {
    link: 'https://www.themoviedb.org/movie/419430/watch?locale=TW',
    groups: {
      subscription: [CATCHPLAY_PLUS, NETFLIX],
      free: [],
      rent: [],
      buy: [],
    },
  },
  US: {
    link: 'https://www.themoviedb.org/movie/419430/watch?locale=US',
    groups: {
      subscription: [NETFLIX],
      free: [APPLE_TV],
      rent: [GOOGLE_PLAY],
      buy: [GOOGLE_PLAY],
    },
  },
}

/** Single-region catalog exercising every group at once. */
export const PROVIDER_CATALOG_MULTI_GROUP: ProviderCatalog = {
  TW: {
    link: null,
    groups: {
      subscription: [NETFLIX, DISNEY_PLUS],
      free: [APPLE_TV],
      rent: [GOOGLE_PLAY],
      buy: [GOOGLE_PLAY],
    },
  },
}

/** Catalog with no TW entry at all — the selected region has zero Providers. */
export const PROVIDER_CATALOG_WITHOUT_TW: ProviderCatalog = {
  US: {
    link: null,
    groups: {
      subscription: [NETFLIX],
      free: [],
      rent: [],
      buy: [],
    },
  },
}
