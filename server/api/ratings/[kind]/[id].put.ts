import { defineEventHandler, readBody } from 'h3'
import { getDb } from '../../../db'
import { upsertRating } from '../../../db/queries/rating'
import { UpdateRatingSchema } from '../../../db/schema/rating'
import { apiValidationError } from '../../../utils/api-validation'
import { requireAuthSession } from '../../../utils/auth'
import { parseRatingParams } from '../params'

const setRatingBodySchema = UpdateRatingSchema.pick({ label: true }).required()

export default defineEventHandler(async (event) => {
  const session = await requireAuthSession(event)
  const { kind, id } = parseRatingParams(event)
  const parsed = setRatingBodySchema.safeParse(await readBody(event))
  if (!parsed.success)
    return apiValidationError(event, parsed.error)
  const saved = await upsertRating(getDb(), session.user.id, { kind, tmdbId: id, label: parsed.data.label })
  return { label: saved.label }
})
