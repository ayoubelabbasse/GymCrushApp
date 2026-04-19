import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Profile } from './types'
import { DEV_MODE } from './devMode'
import { MOCK_PROFILE } from './mockData'

const STORAGE_KEY = 'gc_dev_profile_v1'

/**
 * When `EXPO_PUBLIC_DEV_MODE` is on, profile edits are persisted locally so
 * Dashboard / Profile / Discover reflect changes after save (same UX as Supabase).
 */
export async function getDevProfile(): Promise<Profile> {
  if (!DEV_MODE) return MOCK_PROFILE
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return MOCK_PROFILE
    const parsed = JSON.parse(raw) as Partial<Profile>
    return {
      ...MOCK_PROFILE,
      ...parsed,
      id: MOCK_PROFILE.id,
      user_id: MOCK_PROFILE.user_id,
    }
  } catch {
    return MOCK_PROFILE
  }
}

export async function saveDevProfile(p: Profile): Promise<void> {
  if (!DEV_MODE) return
  const stored: Profile = {
    ...p,
    id: MOCK_PROFILE.id,
    user_id: MOCK_PROFILE.user_id,
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
}
