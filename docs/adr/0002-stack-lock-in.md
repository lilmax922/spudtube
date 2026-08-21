# Stack lock-in: Nuxt, Better Auth, Drizzle, Postgres, Cloudflare Workers

Full-stack choices carrying quarter-level swap costs. Nuxt (Vue) for the app framework, rendered on Cloudflare Pages/Workers, with shadcn-vue over Tailwind CSS as the component layer (components are vendored into the repo, not a versioned dependency) and pnpm as package manager. Better Auth as the sole auth layer with Google as the only OAuth provider. Drizzle ORM against Postgres: a Dockerized Postgres locally (learning exercise) and Supabase Postgres in production, reached from Workers through a Cloudflare Hyperdrive binding wrapping the Supabase transaction pooler URL. Local dev connects straight to the Docker container; both environments differ only by `DATABASE_URL`.

## Considered Options

- **Supabase Auth** (rejected): would have removed Better Auth, but the goal is learning self-managed auth wiring.
- **Raw TCP Postgres from Workers** (rejected): Cloudflare Workers cannot open raw TCP; Hyperdrive + pooler is the supported path.
- **VPS deployment** (rejected): loses edge-native IP geolocation headers used for DetectedRegion.
