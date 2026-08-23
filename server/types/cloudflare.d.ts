export interface Hyperdrive {
  connectionString: string
}

declare module 'h3' {
  interface H3EventContext {
    cloudflare?: {
      env?: {
        HYPERDRIVE?: Hyperdrive
        [key: string]: unknown
      }
      HYPERDRIVE?: Hyperdrive
      context?: {
        waitUntil?: (promise: Promise<unknown>) => void
      }
      cf?: unknown
      [key: string]: unknown
    }
  }
}
