import { defineEventHandler, getQuery, getRouterParam } from 'h3'
import { z } from 'zod'
import { getTmdbClient } from '../../../../tmdb/client'
import { kindFromSegment } from '../../../../tmdb/mappers'
import { idParam, mediaSegmentParam, pageParam } from '../../../../utils/params'
import { parseOrThrow } from '../../../../utils/validation'

const recommendationParamsSchema = z.object({
  kind: mediaSegmentParam,
  id: idParam,
  page: pageParam,
})

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const { kind, id, page } = parseOrThrow(recommendationParamsSchema, {
    kind: getRouterParam(event, 'kind'),
    id: getRouterParam(event, 'id'),
    page: Array.isArray(query.page) ? query.page[0] : query.page,
  })
  return getTmdbClient().recommendations(kindFromSegment(kind), id, page)
})
