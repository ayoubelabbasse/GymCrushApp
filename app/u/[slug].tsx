import { useEffect, useState } from 'react'
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Alert, ScrollView, Share,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/Avatar'
import Card from '../../components/Card'
import GradientButton from '../../components/GradientButton'
import { Profile, GymSession } from '../../lib/types'
import { SPORTS } from '../../constants/data'
import { colors, spacing, radius, vibeTagColors, F } from '../../constants/theme'

const WEB = 'https://gymcrush-one.vercel.app'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function calcStreak(sessions: GymSession[]) {
  if (!sessions.length) return 0
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const unique = [...new Set(
    sessions.map(s => {
      const d = new Date(s.checked_in_at); d.setHours(0, 0, 0, 0); return d.getTime()
    })
  )].sort((a, b) => b - a)
  let streak = 0
  let cursor = today.getTime()
  for (const ts of unique) {
    if (ts === cursor || ts === cursor - 86400000) {
      streak++; cursor = ts - 86400000
    } else break
  }
  return streak
}

async function getDeviceId() {
  let id = await AsyncStorage.getItem('gc_device_id')
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    await AsyncStorage.setItem('gc_device_id', id)
  }
  return id
}

export default function PublicProfileScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<GymSession[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [waveSent, setWaveSent] = useState(false)
  const [gymMatch, setGymMatch] = useState(false)

  useEffect(() => { loadProfile() }, [slug])

  async function loadProfile() {
    setLoading(true)
    try {
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

      const { data: sess } = await supabase
        .from('gym_sessions')
        .select('*')
        .eq('profile_id', prof.id)
        .order('checked_in_at', { ascending: false })
        .limit(50)

      setSessions(sess ?? [])

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
  }

  async function handleWave() {
    if (!profile) return
    try {
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
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>{loading ? 'Loading...' : 'Profile not found'}</Text>
      </SafeAreaView>
    )
  }

  const streak = calcStreak(sessions)
  const sport = SPORTS.find(s => s.id === profile.sport)
  const isOwnProfile = currentUserId !== null && profile.user_id === currentUserId

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Hero header */}
        <View style={styles.hero}>
          {profile.photo_url ? (
            <>
              <Image source={{ uri: profile.photo_url }} style={styles.heroImage} />
              <View style={styles.heroOverlay} />
            </>
          ) : (
            <LinearGradient
              colors={['#1a0a00', colors.background]}
              style={styles.heroGradient}
            />
          )}
          <View style={styles.heroContent}>
            <Avatar photoUrl={profile.photo_url} name={profile.display_name} size={96} />
          </View>
        </View>

        {/* Profile info */}
        <View style={styles.profileInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.displayName}>{profile.display_name}</Text>
            {profile.is_pro && (
              <View style={styles.proBadge}>
                <Text style={styles.proText}>⚡ Pro</Text>
              </View>
            )}
          </View>

          {(profile.age || profile.gym_name) ? (
            <Text style={styles.metaText}>
              {[profile.age ? `${profile.age}yo` : null, profile.gym_name]
                .filter(Boolean).join(' · ')}
            </Text>
          ) : null}

          {/* Stats pills */}
          <View style={styles.statsPills}>
            <View style={styles.statPill}><Text style={styles.statPillText}>💪 {sessions.length} sessions</Text></View>
            <View style={styles.statPill}><Text style={styles.statPillText}>🔥 {streak} streak</Text></View>
            <View style={styles.statPill}><Text style={styles.statPillText}>👋 {profile.wave_count} waves</Text></View>
          </View>

          {/* Sport / goal / style */}
          {(sport || profile.goal || profile.workout_style) && (
            <View style={styles.pillsRow}>
              {sport && (
                <View style={styles.sportPill}>
                  <Text style={styles.sportPillText}>{sport.emoji} {sport.id}</Text>
                </View>
              )}
              {profile.goal && (
                <View style={styles.sportPill}>
                  <Text style={styles.sportPillText}>🎯 {profile.goal}</Text>
                </View>
              )}
              {profile.workout_style && (
                <View style={styles.sportPill}>
                  <Text style={styles.sportPillText}>⚡ {profile.workout_style}</Text>
                </View>
              )}
            </View>
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

        {/* Bio */}
        {profile.bio && (
          <Card style={styles.section}>
            <Text style={styles.sectionLabel}>BIO</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
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

        {/* Wave count */}
        <Text style={styles.waveCount}>
          🔥 {profile.wave_count} people waved at {profile.display_name}
        </Text>

        {/* CTA */}
        <View style={styles.ctaSection}>
          {isOwnProfile ? (
            <GradientButton label="📤 Share Your Profile" onPress={handleShare} />
          ) : waveSent ? (
            <View style={styles.wavedBtn}>
              <Text style={styles.wavedText}>✅ Waved!</Text>
            </View>
          ) : (
            <GradientButton label="👋 Send a Wave" onPress={handleWave} />
          )}
        </View>

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
  loadingText: { color: colors.muted, textAlign: 'center', marginTop: 100, fontFamily: F.regular },
  scroll: { paddingBottom: 24 },
  backBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backText: { color: colors.primary, fontSize: 15, fontFamily: F.semiBold },
  hero: {
    height: 200,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: spacing.lg,
    overflow: 'hidden',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'cover',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    alignItems: 'center',
  },
  profileInfo: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 6,
  },
  displayName: {
    fontSize: 30,
    fontFamily: F.extraBold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  proBadge: {
    backgroundColor: 'rgba(255,107,0,0.15)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.4)',
  },
  proText: { fontSize: 12, fontFamily: F.bold, color: colors.primary },
  metaText: { fontSize: 14, fontFamily: F.regular, color: colors.muted, marginBottom: spacing.md },
  statsPills: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  statPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statPillText: { fontSize: 12, fontFamily: F.semiBold, color: colors.muted },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.sm,
  },
  sportPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,107,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.3)',
  },
  sportPillText: { fontSize: 13, fontFamily: F.semiBold, color: colors.primary },
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
  gymMatchText: { fontSize: 22, fontFamily: F.extraBold, color: '#FF3D6B' },
  gymMatchSub: { fontSize: 14, fontFamily: F.regular, color: colors.muted, marginTop: 4 },
  section: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 11,
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
  vibePillText: { fontSize: 12, fontFamily: F.semiBold },
  goalCard: {
    backgroundColor: 'rgba(255,107,0,0.08)',
    borderColor: 'rgba(255,107,0,0.4)',
  },
  goalLabel: {
    fontSize: 11,
    fontFamily: F.bold,
    color: colors.primary,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  goalText: { fontSize: 15, fontFamily: F.regular, color: colors.text, lineHeight: 22 },
  bioText: { fontSize: 15, fontFamily: F.regular, color: colors.text, lineHeight: 22 },
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
    backgroundColor: 'rgba(255,107,0,0.15)',
    borderColor: colors.primary,
  },
  dayText: { fontSize: 10, fontFamily: F.bold, color: colors.muted },
  dayTextActive: { color: colors.primary },
  timeText: { fontSize: 13, fontFamily: F.regular, color: colors.muted },
  instaText: { fontSize: 14, fontFamily: F.semiBold, color: colors.text },
  waveCount: {
    textAlign: 'center',
    fontFamily: F.regular,
    color: colors.muted,
    fontSize: 14,
    marginVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  ctaSection: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  wavedBtn: {
    height: 56,
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.3)',
  },
  wavedText: { fontSize: 17, fontFamily: F.bold, color: '#34d399' },
  banner: {
    marginHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  bannerTitle: { fontSize: 16, fontFamily: F.extraBold, color: colors.text },
  bannerSub: { fontSize: 13, fontFamily: F.regular, color: colors.muted },
  bannerLink: { fontSize: 14, fontFamily: F.bold, color: colors.primary },
})
