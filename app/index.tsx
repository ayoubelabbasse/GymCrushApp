import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import GCLogo from '../components/GCLogo'
import GradientButton from '../components/GradientButton'
import { colors, spacing, radius, F } from '../constants/theme'

export default function WelcomeScreen() {
  const router = useRouter()

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }} />

      {/* Logo + glow */}
      <View style={styles.logoSection}>
        <View style={styles.glowBehind} />
        <GCLogo size={80} />
        <Text style={styles.appName}>GymCrush</Text>
        <Text style={styles.tagline}>Your gym. Your people.</Text>
      </View>

      <View style={{ flex: 1 }} />

      {/* Bottom section */}
      <View style={styles.bottom}>
        <View style={styles.pill}>
          <View style={styles.pillDot} />
          <Text style={styles.pillText}>
            Join 1,200+ athletes already on GymCrush
          </Text>
        </View>

        <View style={{ height: spacing.xl }} />

        <GradientButton
          label="Get Started — Free →"
          onPress={() => router.push('/(auth)/login')}
        />

        <View style={{ height: spacing.md }} />

        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.8}
        >
          <Text style={styles.signInText}>Sign In</Text>
        </TouchableOpacity>

        <View style={{ height: spacing.lg }} />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  logoSection: {
    alignItems: 'center',
    gap: 16,
  },
  glowBehind: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
    top: -100,
  },
  appName: {
    fontSize: 30,
    fontFamily: F.extraBold,
    color: colors.text,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    fontFamily: F.regular,
    color: colors.muted,
  },
  bottom: {
    width: '100%',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,107,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.3)',
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  pillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  pillText: {
    color: colors.text,
    fontSize: 13,
    fontFamily: F.semiBold,
  },
  signInButton: {
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: '#333333',
  },
  signInText: {
    color: colors.text,
    fontSize: 17,
    fontFamily: F.bold,
    includeFontPadding: false,
  },
})
