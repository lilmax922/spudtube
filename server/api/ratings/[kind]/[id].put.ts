import { defineEventHandler, readBody } from 'h3'
import { getDb } from '../../../db'
import { upsertRating } from '../../../db/queries/rating'
import { UpdateRatingBodySchema } from '../../../db/schema/rating'
import { apiValidationError } from '../../../utils/api-validation'
import { requireAuthSession } from '../../../utils/auth'
import { parseRatingParams } from '../params'

export default defineEventHandler(async (event) => {
  const session = await requireAuthSession(event)
  const { kind, id } = parseRatingParams(event)
  const parsed = UpdateRatingBodySchema.safeParse(await readBody(event))
  if (!parsed.success)
    return apiValidationError(event, parsed.error)
  const saved = await upsertRating(getDb(event), session.user.id, { kind, tmdbId: id, label: parsed.data.label })
  return { label: saved.label }
})
