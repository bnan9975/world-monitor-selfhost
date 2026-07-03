/**
 * Self-host Pro unlock (AGPL "modify-and-run").
 *
 * This is a self-hosted World Monitor build: we run every `/api/*` route on our
 * own infrastructure and supply our own compute + keys, so all "Pro" panels are
 * enabled. The upstream Clerk / Dodo / Convex entitlement stack is intentionally
 * NOT deployed here — there is no hosted backend being freeloaded; every premium
 * route computes locally from free public data sources.
 *
 * Defaults to UNLOCKED. To restore the original upstream paywall behaviour,
 * build with `VITE_WM_LOCK_PRO=1`.
 *
 * Accessed defensively (same pattern as runtime-config.ts) so it type-checks
 * without depending on ambient `import.meta.env` typings.
 */
const _env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};

/** When true, every premium panel is rendered/enabled and treated as unlocked. */
export const SELF_HOST_PRO_UNLOCK = _env.VITE_WM_LOCK_PRO !== '1';

/**
 * Build-time enterprise key. On web builds the runtime-config `WORLDMONITOR_API_KEY`
 * secret is desktop-only, so `premiumFetch` attaches this value as the
 * `X-WorldMonitor-Key` header instead. It MUST match one entry in the server's
 * `WORLDMONITOR_VALID_KEYS` for premium API routes to return data. Optional for
 * local `npm run dev` — the dev server does not enforce the premium gate.
 */
export const SELF_HOST_WM_KEY = _env.VITE_WM_KEY ?? '';
