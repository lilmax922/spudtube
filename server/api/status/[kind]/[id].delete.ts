import { defineEventHandler } from 'h3'
import { getDb } from '../../../db'
import { clearTitleStatus } from '../../../db/queries/title-status'
import { requireAuthSession } from '../../../utils/auth'
import { parseStatusParams } from '../params'

export default defineEventHandler(async (event) => {
  const session = await requireAuthSession(event)
  const { kind, id } = parseStatusParams(event)
  await clearTitleStatus(getDb(event), session.user.id, kind, id)
  return { status: null }
})
