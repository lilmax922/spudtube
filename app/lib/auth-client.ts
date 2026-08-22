import { createAuthClient } from 'better-auth/vue'

// Client-side auth surface. App components call useSession/signIn/signOut from here;
// the server instance lives in server/auth.ts and is never imported into app code.
export const authClient = createAuthClient()

export const { signIn, signOut, useSession } = authClient
