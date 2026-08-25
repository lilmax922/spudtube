import { z } from 'zod'

export const rawListPageSchema = z.object({
  page: z.number(),
  total_pages: z.number(),
  total_results: z.number(),
  results: z.array(z.unknown()),
})

export const rawMovieSummarySchema = z.object({
  id: z.number(),
  title: z.string(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  release_date: z.string(),
  vote_average: z.number().nullable(),
})

export const rawTvSummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  first_air_date: z.string(),
  vote_average: z.number().nullable(),
})

export const rawGenreSchema = z.object({
  id: z.number(),
  name: z.string(),
})

export const rawProviderEntrySchema = z.object({
  provider_id: z.number(),
  provider_name: z.string(),
  logo_path: z.string().nullable(),
})

export const rawRegionAvailabilitySchema = z.object({
  link: z.string().nullish(),
  flatrate: z.array(rawProviderEntrySchema).optional(),
  free: z.array(rawProviderEntrySchema).optional(),
  rent: z.array(rawProviderEntrySchema).optional(),
  buy: z.array(rawProviderEntrySchema).optional(),
})

export const rawProviderCatalogSchema = z.object({
  results: z.record(z.string(), rawRegionAvailabilitySchema),
})

export const rawGenreListSchema = z.object({
  genres: z.array(rawGenreSchema),
})

const rawVideoSchema = z.object({
  key: z.string(),
  site: z.string(),
  type: z.string(),
  official: z.boolean().optional(),
  iso_639_1: z.string().nullish(),
})

const rawCastMemberSchema = z.object({
  id: z.number(),
  name: z.string(),
  character: z.string().nullish(),
  profile_path: z.string().nullable(),
  order: z.number(),
})

const rawCrewMemberSchema = z.object({
  id: z.number(),
  name: z.string(),
  job: z.string(),
  department: z.string().nullish(),
})

const rawCreditsSchema = z.object({
  cast: z.array(rawCastMemberSchema).default([]),
  crew: z.array(rawCrewMemberSchema).default([]),
})

const rawKeywordSchema = z.object({
  id: z.number(),
  name: z.string(),
})

const rawKeywordsSchema = z.object({
  keywords: z.array(rawKeywordSchema).optional(),
  results: z.array(rawKeywordSchema).optional(),
})

const rawImageSchema = z.object({
  file_path: z.string(),
  aspect_ratio: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
})

const rawImagesSchema = z.object({
  backdrops: z.array(rawImageSchema).default([]),
})

const rawReleaseDateEntrySchema = z.object({
  certification: z.string(),
  iso_639_1: z.string().optional(),
  type: z.number().optional(),
})

const rawReleaseDateCountrySchema = z.object({
  iso_3166_1: z.string(),
  release_dates: z.array(rawReleaseDateEntrySchema).default([]),
})

const rawReleaseDatesSchema = z.object({
  results: z.array(rawReleaseDateCountrySchema).default([]),
})

const rawContentRatingEntrySchema = z.object({
  iso_3166_1: z.string(),
  rating: z.string(),
})

const rawContentRatingsSchema = z.object({
  results: z.array(rawContentRatingEntrySchema).default([]),
})

export const rawMovieDetailSchema = z.object({
  id: z.number(),
  title: z.string(),
  original_title: z.string().optional(),
  original_language: z.string().optional(),
  status: z.string().nullish(),
  overview: z.string().default(''),
  tagline: z.string().nullish(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  release_date: z.string().default(''),
  vote_average: z.number().nullable(),
  runtime: z.number().nullable(),
  budget: z.number().optional(),
  revenue: z.number().optional(),
  genres: z.array(rawGenreSchema),
  videos: z.object({ results: z.array(rawVideoSchema) }).optional(),
  translations: z
    .object({
      translations: z.array(
        z.object({
          iso_639_1: z.string(),
          iso_3166_1: z.string(),
          data: z.object({
            overview: z.string().default(''),
            tagline: z.string().nullish(),
          }),
        }),
      ),
    })
    .optional(),
  credits: rawCreditsSchema.optional(),
  keywords: rawKeywordsSchema.optional(),
  images: rawImagesSchema.optional(),
  release_dates: rawReleaseDatesSchema.optional(),
})

export const rawTvDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  original_name: z.string().optional(),
  original_language: z.string().optional(),
  status: z.string().nullish(),
  overview: z.string().default(''),
  tagline: z.string().nullish(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  first_air_date: z.string().default(''),
  vote_average: z.number().nullable(),
  episode_run_time: z.array(z.number()).default([]),
  genres: z.array(rawGenreSchema),
  videos: z.object({ results: z.array(rawVideoSchema) }).optional(),
  translations: z
    .object({
      translations: z.array(
        z.object({
          iso_639_1: z.string(),
          iso_3166_1: z.string(),
          data: z.object({
            overview: z.string().default(''),
            tagline: z.string().nullish(),
          }),
        }),
      ),
    })
    .optional(),
  credits: rawCreditsSchema.optional(),
  keywords: rawKeywordsSchema.optional(),
  images: rawImagesSchema.optional(),
  content_ratings: rawContentRatingsSchema.optional(),
})
