import { createURL } from 'expo-linking'

/**
 * OAuth + magic-link return URL for this dev session (Expo Go: exp://…/--/auth/callback).
 * Must be allowlisted in Supabase → Authentication → URL Configuration → Redirect URLs,
 * or Supabase sends the browser to your Site URL (e.g. gymcrush-one.vercel.app) instead.
 */
export function getAuthCallbackUrl(): string {
  return createURL('auth/callback')
}
