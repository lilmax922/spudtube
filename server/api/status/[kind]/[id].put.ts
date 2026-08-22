import { defineEventHandler, readBody } from 'h3'
import { getDb } from '../../../db'
import { upsertTitleStatus } from '../../../db/queries/title-status'
import { UpdateTitleStatusSchema } from '../../../db/schema/title-status'
import { apiValidationError } from '../../../utils/api-validation'
import { requireAuthSession } from '../../../utils/auth'
import { parseStatusParams } from '../params'

const setStatusBodySchema = UpdateTitleStatusSchema.pick({ status: true }).required()

export default defineEventHandler(async (event) => {
  const session = await requireAuthSession(event)
  const { kind, id } = parseStatusParams(event)
  const parsed = setStatusBodySchema.safeParse(await readBody(event))
  if (!parsed.success)
    return apiValidationError(event, parsed.error)
  const saved = await upsertTitleStatus(getDb(), session.user.id, {
    kind,
    tmdbId: id,
    status: parsed.data.status,
  })
  return { status: saved.status }
})
