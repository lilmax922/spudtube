import type { z } from 'zod'
import { createError } from 'h3'
import { flattenError } from 'zod'

export function parseOrThrow<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
): z.output<Schema> {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request parameters',
      data: { issues: flattenError(result.error) },
    })
  }
  return result.data
}
