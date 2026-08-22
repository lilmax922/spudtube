import type { H3Event } from 'h3'
import type { ZodError } from 'zod'
import { setResponseStatus } from 'h3'
import { flattenError } from 'zod'

// The one error contract for rejected payloads: HTTP 400 with `{ issues }`.
export interface ApiValidationError {
  issues: {
    formErrors: string[]
    fieldErrors: Partial<Record<string, string[]>>
  }
}

export function apiValidationError(event: H3Event, error: ZodError): ApiValidationError {
  setResponseStatus(event, 400)
  const { fieldErrors, formErrors } = flattenError(error)
  return { issues: { fieldErrors, formErrors } }
}
