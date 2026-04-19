/**
 * Development bypass: skip auth and use mock data from lib/mockData.ts.
 *
 * Controlled by `EXPO_PUBLIC_DEV_MODE` in `.env`:
 *   - unset or "true" (default)  → DEV_MODE = true   (mock data, no auth)
 *   - "false"                    → DEV_MODE = false  (real Supabase auth)
 *
 * To ship to real users: set `EXPO_PUBLIC_DEV_MODE=false` in `.env` (and in EAS
 * build secrets for production builds).
 */
const raw = process.env.EXPO_PUBLIC_DEV_MODE
export const DEV_MODE = raw == null ? true : raw.toLowerCase() !== 'false'

if (__DEV__) {
  // Clearly log which mode is active so you can tell at a glance in Metro.
  // eslint-disable-next-line no-console
  console.log(
    `[GymCrush] DEV_MODE = ${DEV_MODE ? 'ON (mock data)' : 'OFF (real Supabase)'}`,
  )
}
