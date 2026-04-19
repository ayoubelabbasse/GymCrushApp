import { useCallback, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ScrollView, Share, useWindowDimensions,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/Avatar'
import ProBadge from '../../components/ProBadge'
import Card from '../../components/Card'
import { Profile } from '../../lib/types'
import { SPORTS } from '../../constants/data'
import { colors, spacing, radius, vibeTagColors, F, lineHeightFor, profileHeroGradient, gradients } from '../../constants/theme'
import { DEV_MODE } from '../../lib/devMode'
import { getDevProfile } from '../../lib/devMockProfile'
import {
  MOCK_USER_ID,
  MOCK_OTHER_PROFILES,
} from '../../lib/mockData'

const WEB = 'https://gymcrush-one.vercel.app'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

async function getDeviceId() {
  let id = await AsyncStorage.getItem('gc_device_id')
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    await AsyncStorage.setItem('gc_device_id', id)
  }
  return id
}

export default function PublicProfileScreen() {
  const { height: windowHeight } = useWindowDimensions()
  const heroHeight = windowHeight * 0.5
  const insets = useSafeAreaInsets()
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [waveSent, setWaveSent] = useState(false)
  const [gymMatch, setGymMatch] = useState(false)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      if (DEV_MODE) {
        setCurrentUserId(MOCK_USER_ID)
        const mine = await getDevProfile()
        if (slug === mine.slug) {
          setProfile(mine)
        } else {
          const other = MOCK_OTHER_PROFILES.find(p => p.slug === slug)
          if (other) {
            setProfile(other)
          } else {
            Alert.alert('Not found', 'Profile not found')
            setProfile(null)
          }
        }
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)

      const { data: prof, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()

      if (error) throw error
      if (!prof) { Alert.alert('Not found', 'Profile not found'); return }
      setProfile(prof)

      // Record view
      if (user && user.id !== prof.user_id) {
        await supabase.from('profile_views').insert({
          profile_id: prof.id,
          viewer_user_id: user.id,
          viewed_at: new Date().toISOString(),
        }).then(() => {})
      }
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
    setLoading(false)
  }, [slug])

  useFocusEffect(
    useCallback(() => {
      void loadProfile()
    }, [loadProfile])
  )

  async function handleWave() {
    if (!profile) return
    try {
      if (DEV_MODE) {
        setWaveSent(true)
        return
      }
      const deviceId = await getDeviceId()
      const res = await fetch(`${WEB}/api/wave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profile.id, viewer_fingerprint: deviceId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send wave')
      setWaveSent(true)
      if (data.is_mutual) setGymMatch(true)
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not send wave')
    }
  }

  async function handleShare() {
    if (!profile) return
    try {
      await Share.share({
        message: `Check out ${profile.display_name} on GymCrush: ${WEB}/u/${profile.slug}`,
        url: `${WEB}/u/${profile.slug}`,
      })
    } catch {}
  }

  if (loading || !profile) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Text style={styles.loadingText}>{loading ? 'Loading...' : 'Profile not found'}</Text>
      </SafeAreaView>
    )
  }

  const sport = SPORTS.find(s => s.id === profile.sport)
  const isOwnProfile = currentUserId !== null && profile.user_id === currentUserId

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >
        {/* Top half: warm hero gradient + avatar; back floats over hero so the band is full 50% */}
        <View style={[styles.heroSection, { height: heroHeight }]}>
          <LinearGradient
            {...profileHeroGradient}
            style={StyleSheet.absoluteFillObject}
          />
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backOverHero, { top: insets.top + 8 }]}
            activeOpacity={0.7}
            hitSlop={12}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={[styles.heroAvatarBlock, { paddingTop: insets.top }]}>
            <Avatar photoUrl={profile.photo_url} name={profile.display_name} size={120} />
          </View>
        </View>

        {/* Profile info — matches web reference */}
        <View style={styles.profileInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.displayName}>{profile.display_name}</Text>
            {profile.is_pro && <ProBadge />}
          </View>

          {(profile.age != null || profile.gym_name) ? (
            <Text style={styles.metaText}>
              {[
                profile.age != null ? `${profile.age}` : null,
                profile.gym_name,
              ].filter(Boolean).join(' · ')}
            </Text>
          ) : null}

          {(sport || profile.goal || profile.workout_style) && (
            <View style={styles.pillsRow}>
              {sport && (
                <View style={styles.tagOutline}>
                  <Text style={styles.tagOutlineText}>{sport.id}</Text>
                </View>
              )}
              {profile.goal && (
                <View style={styles.tagFilled}>
                  <Text style={styles.tagFilledText}>{profile.goal}</Text>
                </View>
              )}
              {profile.workout_style && (
                <View style={styles.tagFilled}>
                  <Text style={styles.tagFilledText}>{profile.workout_style}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {profile.bio ? (
          <Text style={styles.bioStandalone}>{profile.bio}</Text>
        ) : null}

        {/* Footer: waves stat + Wave / Share (reference layout) */}
        <View style={styles.profileFooter}>
          <Text style={styles.footerStat}>🔥 {profile.wave_count} waves</Text>
          {isOwnProfile ? (
            <TouchableOpacity onPress={handleShare} activeOpacity={0.88} style={styles.footerCtaTouch}>
              <LinearGradient
                colors={[...gradients.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.footerCta}
              >
                <Text style={styles.footerCtaText}>📤 Share</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : waveSent ? (
            <View style={styles.wavedCompact}>
              <Text style={styles.wavedCompactText}>✅ Waved</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={handleWave} activeOpacity={0.88} style={styles.footerCtaTouch}>
              <LinearGradient
                colors={[...gradients.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.footerCta}
              >
                <Text style={styles.footerCtaText}>👋 Wave</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Gym Match card */}
        {gymMatch && (
          <View style={styles.gymMatch}>
            <Text style={styles.gymMatchText}>🎯 Gym Match!</Text>
            <Text style={styles.gymMatchSub}>You both waved at each other!</Text>
          </View>
        )}

        {/* Vibe tags */}
        {profile.vibe_tags && profile.vibe_tags.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionLabel}>GYM VIBE</Text>
            <View style={styles.vibePills}>
              {profile.vibe_tags.map((tag, i) => {
                const c = vibeTagColors[i % vibeTagColors.length]
                return (
                  <View key={tag} style={[styles.vibePill, { backgroundColor: c.bg, borderColor: c.border }]}>
                    <Text style={[styles.vibePillText, { color: c.text }]}>{tag}</Text>
                  </View>
                )
              })}
            </View>
          </Card>
        )}

        {/* Current goal */}
        {profile.current_goal_text && (
          <Card style={{ ...styles.section, ...styles.goalCard }}>
            <Text style={styles.goalLabel}>🏆 CURRENT GOAL</Text>
            <Text style={styles.goalText}>{profile.current_goal_text}</Text>
          </Card>
        )}

        {/* Training schedule */}
        {profile.schedule && (
          <Card style={styles.section}>
            <Text style={styles.sectionLabel}>TRAINING SCHEDULE</Text>
            <View style={styles.daysRow}>
              {DAYS.map((d, i) => {
                const active = profile.schedule![d]
                return (
                  <View key={d} style={[styles.dayBtn, active && styles.dayBtnActive]}>
                    <Text style={[styles.dayText, active && styles.dayTextActive]}>
                      {DAY_LABELS[i]}
                    </Text>
                  </View>
                )
              })}
            </View>
            {(profile.schedule.am || profile.schedule.pm) && (
              <Text style={styles.timeText}>
                {profile.schedule.am ? '🌅 Morning' : '🌙 Evening'}
              </Text>
            )}
          </Card>
        )}

        {/* Instagram */}
        {profile.instagram && (
          <Card style={styles.section}>
            <Text style={styles.instaText}>📷 @{profile.instagram}</Text>
          </Card>
        )}

        {/* Banner for non-users */}
        {!currentUserId && (
          <Card style={styles.banner}>
            <Text style={styles.bannerTitle}>Want your own GymCrush profile?</Text>
            <Text style={styles.bannerSub}>Free QR code. Stick it on your bottle.</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')} activeOpacity={0.7}>
              <Text style={styles.bannerLink}>Create yours →</Text>
            </TouchableOpacity>
          </Card>
        )}

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingText: { color: colors.muted, textAlign: 'center', marginTop: 100, fontSize: 16, lineHeight: lineHeightFor(16), fontFamily: F.regular },
  scroll: { paddingBottom: 24 },
  backOverHero: {
    position: 'absolute',
    left: spacing.xl,
    zIndex: 10,
    paddingVertical: 4,
  },
  backText: { color: colors.primary, fontSize: 15, lineHeight: lineHeightFor(15), fontFamily: F.semiBold },
  heroSection: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  heroAvatarBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: 6,
  },
  displayName: {
    fontSize: 24,
    lineHeight: lineHeightFor(24),
    fontFamily: F.extraBold,
    color: colors.text,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  metaText: { fontSize: 14, lineHeight: lineHeightFor(14), fontFamily: F.regular, color: colors.muted, marginBottom: spacing.sm, textAlign: 'center' },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 0,
    justifyContent: 'center',
  },
  tagOutline: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  tagOutlineText: {
    fontSize: 13,
    lineHeight: lineHeightFor(13),
    fontFamily: F.semiBold,
    color: colors.primary,
  },
  tagFilled: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  tagFilledText: {
    fontSize: 13,
    lineHeight: lineHeightFor(13),
    fontFamily: F.semiBold,
    color: colors.muted,
  },
  bioStandalone: {
    fontSize: 15,
    lineHeight: lineHeightFor(15),
    fontFamily: F.regular,
    color: colors.text,
    textAlign: 'center',
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  profileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  footerStat: {
    fontSize: 15,
    lineHeight: lineHeightFor(15),
    fontFamily: F.semiBold,
    color: colors.text,
  },
  /** Rounded-rect radius — matches Discover card Wave button (`radius.md` = 12). */
  footerCtaTouch: { borderRadius: radius.md, overflow: 'hidden' },
  footerCta: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerCtaText: {
    color: '#fff',
    fontSize: 13,
    lineHeight: lineHeightFor(13),
    fontFamily: F.semiBold,
    fontWeight: '600',
  },
  wavedCompact: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.md,
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.35)',
  },
  wavedCompactText: {
    fontSize: 14,
    lineHeight: lineHeightFor(14),
    fontFamily: F.bold,
    color: '#34d399',
  },
  gymMatch: {
    marginHorizontal: spacing.xl,
    backgroundColor: 'rgba(255,61,107,0.12)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,61,107,0.4)',
    marginBottom: spacing.md,
  },
  gymMatchText: { fontSize: 22, lineHeight: lineHeightFor(22), fontFamily: F.extraBold, color: '#FF3D6B' },
  gymMatchSub: { fontSize: 14, lineHeight: lineHeightFor(14), fontFamily: F.regular, color: colors.muted, marginTop: 4 },
  section: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 11,
    lineHeight: lineHeightFor(11),
    fontFamily: F.bold,
    color: colors.muted,
    letterSpacing: 1,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  vibePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vibePill: {
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1.5,
  },
  vibePillText: { fontSize: 12, lineHeight: lineHeightFor(12), fontFamily: F.semiBold },
  goalCard: {
    backgroundColor: 'rgba(255,87,34,0.08)',
    borderColor: 'rgba(255,87,34,0.4)',
  },
  goalLabel: {
    fontSize: 11,
    lineHeight: lineHeightFor(11),
    fontFamily: F.bold,
    color: colors.primary,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  goalText: { fontSize: 15, fontFamily: F.regular, color: colors.text, lineHeight: lineHeightFor(15) },
  bioText: { fontSize: 15, fontFamily: F.regular, color: colors.text, lineHeight: lineHeightFor(15) },
  daysRow: { flexDirection: 'row', gap: 4, marginBottom: spacing.sm },
  dayBtn: {
    flex: 1,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayBtnActive: {
    backgroundColor: 'rgba(255,87,34,0.15)',
    borderColor: colors.primary,
  },
  dayText: { fontSize: 10, lineHeight: lineHeightFor(10), fontFamily: F.bold, color: colors.muted },
  dayTextActive: { color: colors.primary },
  timeText: { fontSize: 13, lineHeight: lineHeightFor(13), fontFamily: F.regular, color: colors.muted },
  instaText: { fontSize: 14, lineHeight: lineHeightFor(14), fontFamily: F.semiBold, color: colors.text },
  banner: {
    marginHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  bannerTitle: { fontSize: 16, lineHeight: lineHeightFor(16), fontFamily: F.extraBold, color: colors.text },
  bannerSub: { fontSize: 13, lineHeight: lineHeightFor(13), fontFamily: F.regular, color: colors.muted },
  bannerLink: { fontSize: 14, lineHeight: lineHeightFor(14), fontFamily: F.bold, color: colors.primary },
})
