import { useCallback, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Share,
  RefreshControl, useWindowDimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/Avatar'
import ProBadge from '../../components/ProBadge'
import Card from '../../components/Card'
import Heatmap from '../../components/Heatmap'
import { Profile, GymSession } from '../../lib/types'
import { SPORTS } from '../../constants/data'
import { colors, spacing, radius, vibeTagColors, F, lineHeightFor, profileHeroGradient } from '../../constants/theme'
import { DEV_MODE } from '../../lib/devMode'
import { getDevProfile } from '../../lib/devMockProfile'
import { mockGymSessions } from '../../lib/mockData'
import Skeleton, { SkeletonRow } from '../../components/Skeleton'

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
  const { height: windowHeight } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const heroHeight = windowHeight * 0.5
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<GymSession[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      if (DEV_MODE) {
        const prof = await getDevProfile()
        setProfile(prof)
        setSessions(mockGymSessions)
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
        if (!prof) return
        const { data: sess } = await supabase
          .from('gym_sessions')
          .select('*')
          .eq('profile_id', prof.id)
          .order('checked_in_at', { ascending: false })
        setProfile(prof)
        setSessions(sess ?? [])
      }
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
    setLoading(false)
    setRefreshing(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadData(false)
    }, [loadData])
  )

  async function handleSignOut() {
    if (DEV_MODE) {
      Alert.alert('Dev mode', 'Sign out is disabled while DEV_MODE is on.')
      return
    }
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
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Skeleton height={windowHeight * 0.5} borderRadius={0} />
        <View style={{ padding: 20, gap: 14 }}>
          <Skeleton width={120} height={18} borderRadius={6} />
          <Skeleton width="60%" height={14} borderRadius={6} />
          <SkeletonRow gap={10} style={{ marginTop: 4 }}>
            <Skeleton width={80} height={28} borderRadius={14} />
            <Skeleton width={80} height={28} borderRadius={14} />
            <Skeleton width={80} height={28} borderRadius={14} />
          </SkeletonRow>
          <Skeleton height={140} borderRadius={16} style={{ marginTop: 8 }} />
          <Skeleton height={100} borderRadius={16} />
        </View>
      </SafeAreaView>
    )
  }

  const streak = calcStreak(sessions)
  const sport = SPORTS.find(s => s.id === profile.sport)

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Top half: edge-to-edge gradient (under status bar); avatar inset below notch */}
        <View style={[styles.heroSection, { height: heroHeight }]}>
          <LinearGradient
            {...profileHeroGradient}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[styles.heroAvatarBlock, { paddingTop: insets.top }]}>
            <Avatar photoUrl={profile.photo_url} name={profile.display_name} size={120} />
          </View>
        </View>

        <View style={styles.body}>
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

          <View style={styles.identity}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{profile.display_name}</Text>
              {profile.is_pro && <ProBadge />}
            </View>
            {(profile.age != null || profile.gym_name) ? (
              <Text style={styles.meta}>
                {[
                  profile.age != null ? `${profile.age}` : null,
                  profile.gym_name,
                ].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </View>

        {/* Stats pills */}
        <View style={styles.statsPills}>
          <View style={styles.statPill}><Text style={styles.statPillText}>💪 {sessions.length} sessions</Text></View>
          <View style={styles.statPill}><Text style={styles.statPillText}>🔥 {streak} streak</Text></View>
          <View style={styles.statPill}><Text style={styles.statPillText}>👋 {profile.wave_count} waves</Text></View>
        </View>

        {/* Sport (outline) + goal (filled) — web reference */}
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

        {/* Activity heatmap */}
        <Card style={styles.section}>
          <Text style={styles.sectionLabel}>ACTIVITY</Text>
          <View style={{ marginTop: 10 }}>
            <Heatmap sessions={sessions} weeks={13} />
          </View>
        </Card>

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

        {/* Bio — centered copy like web */}
        {profile.bio && (
          <Text style={styles.bioStandalone}>{profile.bio}</Text>
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
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingText: { color: colors.muted, textAlign: 'center', marginTop: 100, fontSize: 16, lineHeight: lineHeightFor(16), fontFamily: F.regular },
  scroll: { paddingBottom: 24 },
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
  body: {
    paddingHorizontal: spacing.xl,
  },
  identity: {
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
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
  actionBtnText: { color: colors.text, fontSize: 13, lineHeight: lineHeightFor(13), fontFamily: F.bold },
  name: {
    fontSize: 24,
    lineHeight: lineHeightFor(24),
    fontFamily: F.extraBold,
    color: colors.text,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  meta: { fontSize: 14, lineHeight: lineHeightFor(14), fontFamily: F.regular, color: colors.muted, textAlign: 'center' },
  statsPills: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statPillText: { fontSize: 12, lineHeight: lineHeightFor(12), fontFamily: F.semiBold, color: colors.muted },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
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
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  section: { marginBottom: spacing.md },
  sectionLabel: {
    fontSize: 11,
    lineHeight: lineHeightFor(11),
    fontFamily: F.bold,
    color: colors.muted,
    letterSpacing: 1,
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
  signOutBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  signOutText: {
    fontSize: 16,
    lineHeight: lineHeightFor(16),
    fontFamily: F.bold,
    color: '#FF3D6B',
  },
})
