import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as WebBrowser from 'expo-web-browser'
import { makeRedirectUri } from 'expo-auth-session'
import { supabase } from '../../lib/supabase'
import GCLogo from '../../components/GCLogo'
import GradientButton from '../../components/GradientButton'
import { colors, spacing, radius, F } from '../../constants/theme'

WebBrowser.maybeCompleteAuthSession()

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [focused, setFocused] = useState(false)

  async function handleMagicLink() {
    if (!email.trim()) {
      Alert.alert('Enter your email', 'Please enter your email address.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: makeRedirectUri({ scheme: 'gymcrush', path: 'auth/callback' }),
      },
    })
    setLoading(false)
    if (error) Alert.alert('Error', error.message)
    else setSent(true)
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    try {
      const redirectUrl = makeRedirectUri({ scheme: 'gymcrush', path: 'auth/callback' })
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      })
      if (error) { Alert.alert('Error', error.message); return }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl)
        if (result.type === 'success' && result.url) {
          const url = new URL(result.url)
          const code = url.searchParams.get('code')
          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
            if (exchangeError) Alert.alert('Error', exchangeError.message)
          }
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Google sign in failed')
    }
    setGoogleLoading(false)
  }

  if (sent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successBox}>
          <Text style={styles.mailEmoji}>📬</Text>
          <Text style={styles.successTitle}>Check your email!</Text>
          <Text style={styles.successSub}>We sent a magic link to</Text>
          <Text style={styles.successEmail}>{email}</Text>
          <Text style={styles.successHint}>
            Tap the link — it will open the app automatically
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => setSent(false)}>
            <Text style={styles.retryText}>Try a different email</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ height: spacing.xxxl }} />

          <View style={styles.logoRow}>
            <GCLogo size={64} />
          </View>

          <Text style={styles.heading}>Welcome back 👋</Text>
          <Text style={styles.sub}>Sign in to access your GymCrush profile</Text>

          <View style={{ height: 40 }} />

          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogle}
            disabled={googleLoading}
            activeOpacity={0.85}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleText}>
              {googleLoading ? 'Opening Google...' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with email</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.inputLabel}>Email address</Text>
          <TextInput
            style={[styles.input, focused && styles.inputFocused]}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#555"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />

          <View style={{ height: spacing.md }} />

          <GradientButton
            label="Send Magic Link ✨"
            onPress={handleMagicLink}
            loading={loading}
          />

          <Text style={styles.hint}>No password needed. Check your inbox after tapping.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  logoRow: { alignItems: 'center', marginBottom: spacing.xl },
  heading: {
    fontSize: 32,
    fontFamily: F.extraBold,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -1,
  },
  sub: {
    fontSize: 15,
    fontFamily: F.regular,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    height: 54,
    gap: 10,
  },
  googleIcon: { fontSize: 18, fontFamily: F.extraBold, color: '#4285F4' },
  googleText: { fontSize: 16, fontFamily: F.bold, color: '#111111' },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
    gap: spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 12, fontFamily: F.semiBold, color: colors.muted },
  inputLabel: { fontSize: 14, fontFamily: F.bold, color: colors.text, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    height: 52,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 16,
    fontFamily: F.regular,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  inputFocused: { borderColor: colors.primary },
  hint: { fontSize: 13, fontFamily: F.regular, color: colors.muted, textAlign: 'center', marginTop: spacing.md },
  successBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  mailEmoji: { fontSize: 64 },
  successTitle: { fontSize: 28, fontFamily: F.extraBold, color: colors.text, letterSpacing: -0.5 },
  successSub: { fontSize: 15, fontFamily: F.regular, color: colors.muted },
  successEmail: { fontSize: 16, fontFamily: F.bold, color: colors.primary },
  successHint: { fontSize: 14, fontFamily: F.regular, color: colors.muted, textAlign: 'center' },
  retryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: { color: colors.text, fontFamily: F.semiBold, fontSize: 14 },
})
