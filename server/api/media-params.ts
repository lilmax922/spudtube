import type { H3Event } from 'h3'
import type { Kind } from '../../shared/kind/kind'
import { getRouterParam } from 'h3'
import { z } from 'zod'
import { kindFromSegment } from '../tmdb/mappers'
import { idParam, mediaSegmentParam } from '../utils/params'
import { parseOrThrow } from '../utils/validation'

const mediaParamsSchema = z.object({
  kind: mediaSegmentParam,
  id: idParam,
})

/** Reads the shared [kind]/[id] title route params behind ratings and status routes. */
export function parseMediaParams(event: H3Event): { kind: Kind, id: number } {
  const { kind, id } = parseOrThrow(mediaParamsSchema, {
    kind: getRouterParam(event, 'kind'),
    id: getRouterParam(event, 'id'),
  })
  return { kind: kindFromSegment(kind), id }
}
