import { useEffect } from 'react'
import { Slot, useRouter } from 'expo-router'
import { Platform, Text, TextInput } from 'react-native'
import {
  useFonts,
  Syne_400Regular,
  Syne_600SemiBold,
  Syne_700Bold,
  Syne_800ExtraBold,
} from '@expo-google-fonts/syne'
import { Ionicons } from '@expo/vector-icons'
import * as SplashScreen from 'expo-splash-screen'
import { supabase } from '../lib/supabase'
import { DEV_MODE } from '../lib/devMode'

SplashScreen.preventAutoHideAsync()

// Kill Android descender clipping globally: disable extra font padding on every
// Text and TextInput. This removes the need to repeat `includeFontPadding: false`
// in every StyleSheet.create() block.
if (Platform.OS === 'android') {
  const TextAny = Text as any
  TextAny.defaultProps = TextAny.defaultProps || {}
  TextAny.defaultProps.style = [
    { includeFontPadding: false },
    TextAny.defaultProps.style,
  ]

  const TextInputAny = TextInput as any
  TextInputAny.defaultProps = TextInputAny.defaultProps || {}
  TextInputAny.defaultProps.style = [
    { includeFontPadding: false },
    TextInputAny.defaultProps.style,
  ]
}

export default function RootLayout() {
  const router = useRouter()

  const [fontsLoaded, fontError] = useFonts({
    Syne_400Regular,
    Syne_600SemiBold,
    Syne_700Bold,
    Syne_800ExtraBold,
    ...Ionicons.font,
  })

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError])

  useEffect(() => {
    if (!fontsLoaded && !fontError) return

    if (DEV_MODE) {
      router.replace('/(tabs)')
      return
    }

    supabase.auth.getUser().then(async ({ data: { user }, error }) => {
      if (error || !user) {
        await supabase.auth.signOut()
        router.replace('/')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (profile) {
        router.replace('/(tabs)')
      } else {
        router.replace('/(onboarding)/create')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          router.replace('/')
          return
        }
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', session.user.id)
            .maybeSingle()

          if (profile) {
            router.replace('/(tabs)')
          } else {
            router.replace('/(onboarding)/create')
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) return null

  return <Slot />
}
