import type { H3Event } from 'h3'
import type { Kind } from '../../db/schema/kind'
import { getRouterParam } from 'h3'
import { z } from 'zod'
import { kindFromSegment } from '../../tmdb/mappers'
import { idParam, mediaSegmentParam } from '../../utils/params'
import { parseOrThrow } from '../../utils/validation'

const statusParamsSchema = z.object({
  kind: mediaSegmentParam,
  id: idParam,
})

export function parseStatusParams(event: H3Event): { kind: Kind, id: number } {
  const { kind, id } = parseOrThrow(statusParamsSchema, {
    kind: getRouterParam(event, 'kind'),
    id: getRouterParam(event, 'id'),
  })
  return { kind: kindFromSegment(kind), id }
}
