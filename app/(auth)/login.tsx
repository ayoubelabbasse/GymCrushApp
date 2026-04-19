import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '../../lib/supabase'
import { getAuthCallbackUrl } from '../../lib/oauthRedirect'
import GCLogo from '../../components/GCLogo'
import GradientButton from '../../components/GradientButton'
import { colors, spacing, radius, F, lineHeightFor } from '../../constants/theme'

WebBrowser.maybeCompleteAuthSession()

// ─── OAuth helpers (Google only — kept intact) ──────────────────────────────

function getCodeFromUrl(url: string): string | null {
  try {
    const u = new URL(url)
    return u.searchParams.get('code') ?? new URLSearchParams(u.hash?.replace(/^#/, '')).get('code')
  } catch { return null }
}

function getTokensFromUrl(url: string): { access_token: string; refresh_token: string } | null {
  try {
    const hash = new URL(url).hash?.replace(/^#/, '')
    if (!hash) return null
    const p = new URLSearchParams(hash)
    const access_token = p.get('access_token')
    const refresh_token = p.get('refresh_token')
    if (access_token && refresh_token) return { access_token, refresh_token }
  } catch {}
  return null
}

// ─── Screen ──────────────────────────────────────────────────────────────────

type Step = 'email' | 'code'

export default function LoginScreen() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [focused, setFocused] = useState<'email' | 'code' | null>(null)

  // ── Step 1: send sign-in email ────────────────────────────────────────────

  async function handleSendCode() {
    const trimmed = email.trim()
    if (!trimmed) {
      Alert.alert('Enter your email', 'Please enter your email address.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: getAuthCallbackUrl(),
      },
    })
    setLoading(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      setStep('code')
    }
  }

  // ── Step 2: verify 6-digit code ───────────────────────────────────────────

  async function handleVerifyCode() {
    const trimmed = code.trim()
    if (trimmed.length < 6) {
      Alert.alert('Enter the code', 'Please enter the full code from your email.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: trimmed,
      type: 'email',
    })
    setLoading(false)
    if (error) {
      Alert.alert('Incorrect code', 'That code is wrong or has expired. Try again or resend.')
    }
    // On success _layout.tsx onAuthStateChange handles routing automatically.
  }

  // ── Google OAuth (secondary) ───────────────────────────────────────────────

  async function handleGoogle() {
    setGoogleLoading(true)
    const redirectTo = getAuthCallbackUrl()
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      })
      if (error) { Alert.alert('Error', error.message); return }
      if (!data?.url) return

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
      if (result.type !== 'success' || !result.url) return

      const oauthCode = getCodeFromUrl(result.url)
      if (oauthCode) {
        const { error: err } = await supabase.auth.exchangeCodeForSession(oauthCode)
        if (err) Alert.alert('Error', err.message)
        return
      }

      const tokens = getTokensFromUrl(result.url)
      if (tokens) {
        const { error: err } = await supabase.auth.setSession(tokens)
        if (err) Alert.alert('Error', err.message)
        return
      }

      Alert.alert('Sign-in failed', 'Try again.')
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Google sign in failed')
    } finally {
      setGoogleLoading(false)
    }
  }

  // ── Code entry screen (step 2) ────────────────────────────────────────────

  if (step === 'code') {
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
            <TouchableOpacity
              style={styles.backRow}
              onPress={() => { setStep('email'); setCode('') }}
              activeOpacity={0.7}
            >
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>

            <View style={{ height: spacing.xl }} />
            <View style={styles.logoRow}><GCLogo size={52} /></View>

            <Text style={styles.heading}>Check your email</Text>
            <Text style={styles.sub}>
              {'We sent a sign-in code to\n'}
              <Text style={styles.emailHighlight}>{email.trim()}</Text>
            </Text>

            <View style={{ height: spacing.xl }} />

            <Text style={styles.inputLabel}>Sign-in code</Text>
            <TextInput
              style={[styles.codeInput, focused === 'code' && styles.codeInputFocused]}
              value={code}
              onChangeText={t => setCode(t.replace(/[^0-9]/g, '').slice(0, 8))}
              placeholder="00000000"
              placeholderTextColor="#444"
              keyboardType="number-pad"
              maxLength={8}
              autoFocus
              onFocus={() => setFocused('code')}
              onBlur={() => setFocused(null)}
              onSubmitEditing={handleVerifyCode}
              returnKeyType="done"
            />

            <View style={{ height: spacing.lg }} />

            <GradientButton
              label={loading ? 'Verifying…' : 'Verify →'}
              onPress={handleVerifyCode}
              loading={loading}
            />

            <TouchableOpacity
              style={styles.resendRow}
              onPress={() => { setCode(''); handleSendCode() }}
              activeOpacity={0.7}
            >
              <Text style={styles.resendText}>Resend code</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  // ── Email entry screen (step 1) ────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, styles.scrollGrow]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ height: spacing.xxl }} />

          <View style={styles.logoRow}>
            <GCLogo size={64} />
          </View>

          <Text style={styles.heading}>Sign in to GymCrush</Text>
          <Text style={styles.sub}>Enter your email to receive a sign-in code</Text>

          <View style={{ height: spacing.xl }} />

          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={[styles.input, focused === 'email' && styles.inputFocused]}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#555"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
            onSubmitEditing={handleSendCode}
            returnKeyType="done"
          />

          <View style={{ height: spacing.lg }} />

          <GradientButton
            label={loading ? 'Sending…' : 'Send Code →'}
            onPress={handleSendCode}
            loading={loading}
          />

          {/* Push Google option to the bottom */}
          <View style={{ flex: 1, minHeight: spacing.xxl * 2 }} />

          <TouchableOpacity
            style={styles.googleRow}
            onPress={handleGoogle}
            disabled={googleLoading}
            activeOpacity={0.6}
          >
            <Text style={styles.googleText}>
              {googleLoading ? 'Opening Google…' : 'Or continue with Google'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 16 },
  scrollGrow: { flexGrow: 1 },

  logoRow: { alignItems: 'center', marginBottom: spacing.lg },

  heading: {
    fontSize: 30,
    lineHeight: lineHeightFor(30),
    fontFamily: F.extraBold,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -1,
  },
  sub: {
    fontSize: 15,
    lineHeight: lineHeightFor(15),
    fontFamily: F.regular,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  emailHighlight: {
    color: colors.primary,
    fontFamily: F.bold,
  },

  inputLabel: {
    fontSize: 14,
    lineHeight: lineHeightFor(14),
    fontFamily: F.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    height: 52,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 16,
    lineHeight: lineHeightFor(16),
    fontFamily: F.regular,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  inputFocused: { borderColor: colors.primary },

  // Code input — large, centred digits
  codeInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    height: 72,
    paddingHorizontal: 20,
    color: colors.text,
    fontSize: 32,
    lineHeight: lineHeightFor(32),
    fontFamily: F.extraBold,
    borderWidth: 1.5,
    borderColor: colors.border,
    letterSpacing: 14,
    textAlign: 'center',
  },
  codeInputFocused: { borderColor: colors.primary },

  // Google — small, muted, at the bottom
  googleRow: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  googleText: {
    fontSize: 13,
    lineHeight: lineHeightFor(13),
    fontFamily: F.regular,
    color: colors.muted,
    textDecorationLine: 'underline',
  },

  // Back link (code step)
  backRow: {
    paddingTop: spacing.md,
  },
  backText: {
    fontSize: 14,
    lineHeight: lineHeightFor(14),
    fontFamily: F.semiBold,
    color: colors.primary,
  },

  // Resend link (code step)
  resendRow: {
    alignSelf: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  resendText: {
    fontSize: 13,
    lineHeight: lineHeightFor(13),
    fontFamily: F.regular,
    color: colors.muted,
    textDecorationLine: 'underline',
  },
})
