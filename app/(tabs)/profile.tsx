import { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Share,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
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

export default function ProfileScreen() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<GymSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: prof }, { data: sess }] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('gym_sessions').select('*').eq('profile_id', user.id).order('checked_in_at', { ascending: false }),
      ])
      setProfile(prof)
      setSessions(sess ?? [])
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
    setLoading(false)
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
          router.replace('/')
        },
      },
    ])
  }

  async function handleShare() {
    if (!profile) return
    try {
      await Share.share({
        message: `Check out my GymCrush profile: ${WEB}/u/${profile.slug}`,
        url: `${WEB}/u/${profile.slug}`,
      })
    } catch {}
  }

  if (loading || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    )
  }

  const streak = calcStreak(sessions)
  const sport = SPORTS.find(s => s.id === profile.sport)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Action bar */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(onboarding)/create')}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>✏️ Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>📤 Share</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar + name */}
        <View style={styles.hero}>
          <Avatar photoUrl={profile.photo_url} name={profile.display_name} size={96} />
          <View style={styles.heroInfo}>
            <Text style={styles.name}>{profile.display_name}</Text>
            {profile.is_pro && (
              <View style={styles.proBadge}>
                <Text style={styles.proText}>⚡ Pro</Text>
              </View>
            )}
            {(profile.age || profile.gym_name) ? (
              <Text style={styles.meta}>
                {[profile.age, profile.gym_name].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </View>
        </View>

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
              <View style={styles.orangePill}>
                <Text style={styles.orangePillText}>{sport.emoji} {sport.id}</Text>
              </View>
            )}
            {profile.goal && (
              <View style={styles.orangePill}>
                <Text style={styles.orangePillText}>🎯 {profile.goal}</Text>
              </View>
            )}
            {profile.workout_style && (
              <View style={styles.orangePill}>
                <Text style={styles.orangePillText}>⚡ {profile.workout_style}</Text>
              </View>
            )}
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

        {/* Sign out */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingText: { color: colors.muted, textAlign: 'center', marginTop: 100, fontFamily: F.regular },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 24 },
  actionBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnText: { color: colors.text, fontSize: 13, fontFamily: F.bold },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  heroInfo: { flex: 1, gap: 6 },
  name: {
    fontSize: 26,
    fontFamily: F.extraBold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  proBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,107,0,0.15)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.4)',
  },
  proText: { fontSize: 12, fontFamily: F.bold, color: colors.primary },
  meta: { fontSize: 14, fontFamily: F.regular, color: colors.muted },
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
    marginBottom: spacing.md,
  },
  orangePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,107,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.3)',
  },
  orangePillText: { fontSize: 13, fontFamily: F.semiBold, color: colors.primary },
  section: { marginBottom: spacing.md },
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
  signOutBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  signOutText: {
    fontSize: 16,
    fontFamily: F.bold,
    color: '#FF3D6B',
  },
})
