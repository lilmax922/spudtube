import { defineEventHandler } from 'h3'
import { getDb } from '../../../db'
import { deleteRating } from '../../../db/queries/rating'
import { requireAuthSession } from '../../../utils/auth'
import { parseRatingParams } from '../params'

export default defineEventHandler(async (event) => {
  const session = await requireAuthSession(event)
  const { kind, id } = parseRatingParams(event)
  await deleteRating(getDb(), session.user.id, kind, id)
  return { label: null }
})
