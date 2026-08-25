import type { Page, TitleDetail, TitleSummary } from '#server/tmdb/types'

export const MOVIE_DETAIL: TitleDetail = {
  kind: 'MOVIE',
  tmdbId: 419430,
  name: '沙丘',
  posterPath: '/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
  backdropPath: '/jYEW5xZkZk2WTrdbMGAPFuBqbDc.jpg',
  releaseDate: '2021-10-22',
  voteAverage: 7.805,
  overview: '天賦異稟的保羅·亞崔迪…',
  tagline: '超越即將來臨。',
  originalName: 'Dune',
  originalLanguage: 'en',
  status: 'Released',
  genres: [
    { id: 878, name: '科幻' },
    { id: 12, name: '冒險' },
  ],
  runtimeMinutes: 155,
  trailerKey: 'zhTrailerKey',
  budget: 165_000_000,
  revenue: 402_000_000,
  contentRating: 'PG-13',
  cast: [
    { id: 1190668, name: 'Timothée Chalamet', character: 'Paul Atreides', profilePath: '/BE2sdjpgsa2rNTFa66f7upkaxuI.jpg' },
    { id: 69305, name: 'Rebecca Ferguson', character: 'Lady Jessica', profilePath: '/9Cq5OJ2rNQ9HhVdKZJ9hF3S2m.jpg' },
  ],
  crew: [
    { id: 12538, name: 'Denis Villeneuve', job: 'Director', department: 'Directing' },
    { id: 578, name: 'Jon Spaihts', job: 'Writer', department: 'Writing' },
  ],
  keywords: ['based on novel', 'desert', 'space opera'],
  backdrops: ['/iopYFB1b6Bh7FWZh3onQhfhYyVq.jpg', '/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg'],
}

export const MOVIE_DETAIL_NO_TRAILER: TitleDetail = {
  ...MOVIE_DETAIL,
  trailerKey: null,
}

export const TV_DETAIL: TitleDetail = {
  kind: 'TV_SHOW',
  tmdbId: 94605,
  name: '奧術',
  posterPath: '/fqldf2tl8bJQXgaXnA9tw6pbRns.jpg',
  backdropPath: '/6TLvNexZw9mNyTOVTHZOLripeLy.jpg',
  releaseDate: '2021-11-06',
  voteAverage: 8.7,
  overview: '在烏托邦皮爾特沃夫…',
  tagline: null,
  originalName: 'Arcane',
  originalLanguage: 'en',
  status: 'Ended',
  genres: [
    { id: 16, name: '動畫' },
    { id: 10765, name: '科幻與奇幻' },
  ],
  runtimeMinutes: 42,
  trailerKey: null,
  budget: null,
  revenue: null,
  contentRating: 'TV-MA',
  cast: [
    { id: 1226166, name: 'Hailee Steinfeld', character: 'Vi', profilePath: '/bWx6UvLBbW4n1tNHGwbjpqQOZB.jpg' },
  ],
  crew: [],
  keywords: ['steampunk', 'sisters'],
  backdrops: [],
}

export const MOVIE_WITHOUT_ARTWORK: TitleDetail = {
  kind: 'MOVIE',
  tmdbId: 999001,
  name: 'Untranslated Film',
  posterPath: null,
  backdropPath: null,
  releaseDate: '1999-01-01',
  voteAverage: 5.5,
  overview: 'An English overview for an untranslated film.',
  tagline: null,
  originalName: null,
  originalLanguage: null,
  status: null,
  genres: [],
  runtimeMinutes: 90,
  trailerKey: null,
  budget: null,
  revenue: null,
  contentRating: null,
  cast: [],
  crew: [],
  keywords: [],
  backdrops: [],
}

export const RECOMMENDATIONS_PAGE: Page<TitleSummary> = {
  page: 1,
  totalPages: 3,
  totalResults: 55,
  results: [
    {
      kind: 'MOVIE',
      tmdbId: 693134,
      name: '沙丘：第二部',
      posterPath: '/1pdfLUkbDBtcDQNkh0Zkwv6hrvb.jpg',
      backdropPath: '/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
      releaseDate: '2024-02-27',
      voteAverage: 8.12,
    },
    {
      kind: 'TV_SHOW',
      tmdbId: 135431,
      name: '最後生還者',
      posterPath: '/uC6SNHt5DdzDJKRzjUx0OJcA9fi.jpg',
      backdropPath: '/6QR1LRmOsQmIXfcYw7Pg7P0RPBq.jpg',
      releaseDate: '2023-01-15',
      voteAverage: 8.5,
    },
  ],
}
