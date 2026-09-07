import { defineEventHandler } from 'h3'
import { getDb } from '../../../db'
import { findTitleStatus } from '../../../db/queries/title-status'
import { requireAuthSession } from '../../../utils/auth'
import { parseMediaParams } from '../../media-params'

export default defineEventHandler(async (event) => {
  const session = await requireAuthSession(event)
  const { kind, id } = parseMediaParams(event)
  const found = await findTitleStatus(getDb(event), session.user.id, kind, id)
  return { status: found?.status ?? null }
})
