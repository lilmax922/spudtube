import { defineEventHandler, toWebRequest } from 'h3'
import { auth } from '../../auth'

// Better Auth catch-all: /api/auth/** (sign-in, callback, session, sign-out).
export default defineEventHandler((event) => {
  return auth.handler(toWebRequest(event))
})
