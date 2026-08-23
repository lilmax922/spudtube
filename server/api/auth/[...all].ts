import { defineEventHandler, toWebRequest } from 'h3'
import { getAuth } from '../../auth'

// Better Auth catch-all: /api/auth/** (sign-in, callback, session, sign-out).
export default defineEventHandler((event) => {
  return getAuth(event).handler(toWebRequest(event))
})
