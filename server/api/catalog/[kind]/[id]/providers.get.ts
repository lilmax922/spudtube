import { defineEventHandler, getRouterParam } from 'h3'
import { z } from 'zod'
import { getTmdbClient } from '../../../../tmdb/client'
import { kindFromSegment } from '../../../../tmdb/mappers'
import { idParam, mediaSegmentParam } from '../../../../utils/params'
import { parseOrThrow } from '../../../../utils/validation'

const providerParamsSchema = z.object({
  kind: mediaSegmentParam,
  id: idParam,
})

export default defineEventHandler((event) => {
  const { kind, id } = parseOrThrow(providerParamsSchema, {
    kind: getRouterParam(event, 'kind'),
    id: getRouterParam(event, 'id'),
  })
  return getTmdbClient().watchProviders(kindFromSegment(kind), id)
})
