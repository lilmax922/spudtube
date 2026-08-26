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
  genre_ids: z.array(z.number()).optional(),
  overview: z.string().default(''),
})

export const rawTvSummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  first_air_date: z.string(),
  vote_average: z.number().nullable(),
  genre_ids: z.array(z.number()).optional(),
  overview: z.string().default(''),
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

export const rawMovieDetailSchema = z.object({
  id: z.number(),
  title: z.string(),
  overview: z.string().default(''),
  tagline: z.string().nullish(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  release_date: z.string().default(''),
  vote_average: z.number().nullable(),
  runtime: z.number().nullable(),
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
})

export const rawTvDetailSchema = rawMovieDetailSchema.extend({
  name: z.string(),
}).omit({ title: true, runtime: true }).extend({
  first_air_date: z.string().default(''),
  episode_run_time: z.array(z.number()).default([]),
})
