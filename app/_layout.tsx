import { useEffect } from 'react'
import { Text } from 'react-native'
import { Slot, useRouter } from 'expo-router'
import {
  useFonts,
  Syne_400Regular,
  Syne_600SemiBold,
  Syne_700Bold,
  Syne_800ExtraBold,
} from '@expo-google-fonts/syne'
import * as SplashScreen from 'expo-splash-screen'
import { supabase } from '../lib/supabase'

SplashScreen.preventAutoHideAsync()

// Apply Syne as the default font for all Text components globally
// @ts-ignore — React Native Text.defaultProps is valid at runtime
const _Text = Text as any
const _existing = _Text.defaultProps?.style
_Text.defaultProps = _Text.defaultProps ?? {}
_Text.defaultProps.style = [_existing, { fontFamily: 'Syne_400Regular' }]

export default function RootLayout() {
  const router = useRouter()

  const [fontsLoaded, fontError] = useFonts({
    Syne_400Regular,
    Syne_600SemiBold,
    Syne_700Bold,
    Syne_800ExtraBold,
  })

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError])

  useEffect(() => {
    if (!fontsLoaded && !fontError) return

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/')
      } else {
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
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          router.replace('/')
          return
        }
        if (session) {
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
