import { defineEventHandler } from 'h3'
import { getDb } from '../../../db'
import { findRating } from '../../../db/queries/rating'
import { requireAuthSession } from '../../../utils/auth'
import { parseMediaParams } from '../../media-params'

export default defineEventHandler(async (event) => {
  const session = await requireAuthSession(event)
  const { kind, id } = parseMediaParams(event)
  const found = await findRating(getDb(event), session.user.id, kind, id)
  return { label: found?.label ?? null }
})
