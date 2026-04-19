import { useEffect, useState, useRef, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Share, Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import QRCode from 'react-native-qrcode-svg'
import * as Clipboard from 'expo-clipboard'
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/Avatar'
import StatCard from '../../components/StatCard'
import Card from '../../components/Card'
import Heatmap from '../../components/Heatmap'
import GradientButton from '../../components/GradientButton'
import Skeleton, { SkeletonRow } from '../../components/Skeleton'
import { Profile, GymSession, Wave } from '../../lib/types'
import { CHECKIN_WORKOUT_TYPES, CHECKIN_WORKOUT_META, BADGES } from '../../constants/data'
import { colors, spacing, radius, F, lineHeightFor, gradients } from '../../constants/theme'
import { DEV_MODE } from '../../lib/devMode'
import { getDevProfile } from '../../lib/devMockProfile'
import {
  mockGymSessions,
  mockWaves,
  mockProfileViewRows,
} from '../../lib/mockData'

const WEB = 'https://gymcrush-one.vercel.app'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  if (m > 0) return `${m}m ago`
  return 'just now'
}

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
      streak++
      cursor = ts - 86400000
    } else break
  }
  return streak
}

function isToday(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
}

export default function DashboardScreen() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<GymSession[]>([])
  const [waves, setWaves] = useState<Wave[]>([])
  const [views, setViews] = useState(0)
  const [loading, setLoading] = useState(true)
  const [checkInLoading, setCheckInLoading] = useState(false)
  const shimmerAnim = useRef(new Animated.Value(0)).current
  const ctaScale = useRef(new Animated.Value(1)).current
  const firePulse = useRef(new Animated.Value(1)).current

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (DEV_MODE) {
        const prof = await getDevProfile()
        setProfile(prof)
        setSessions(mockGymSessions)
        setWaves(mockWaves)
        setViews(mockProfileViewRows.length)
      } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setProfile(null)
        setSessions([])
        setWaves([])
        setViews(0)
        return
      }

      // Profile PK (`profiles.id`) is what `gym_sessions.profile_id`, `waves.profile_id`,
      // and `profile_views.profile_id` reference — not `auth.users.id`.
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!prof) {
        setProfile(null)
        setSessions([])
        setWaves([])
        setViews(0)
        return
      }

      const [{ data: sess }, { data: wavesData }, { data: viewsData }] = await Promise.all([
        supabase.from('gym_sessions').select('*').eq('profile_id', prof.id).order('checked_in_at', { ascending: false }),
        supabase.from('waves').select('*').eq('profile_id', prof.id).order('sent_at', { ascending: false }).limit(10),
        supabase.from('profile_views').select('id').eq('profile_id', prof.id)
          .gte('viewed_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      ])

      setProfile(prof)
      setSessions(sess ?? [])
      setWaves(wavesData ?? [])
      setViews(viewsData?.length ?? 0)
      }
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
    setLoading(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadData()
    }, [loadData])
  )

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [shimmerAnim])

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(firePulse, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(firePulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [firePulse])

  /**
   * One-tap check-in. Logs immediately with `workout_type: null` — the user can
   * tag the workout type from the optional picker below. Runs a scale pulse so
   * the transform from CTA → "showed up" card feels physical.
   */
  async function instantCheckIn() {
    if (!profile || checkInLoading) return
    setCheckInLoading(true)

    Animated.sequence([
      Animated.timing(ctaScale, { toValue: 1.05, duration: 120, useNativeDriver: true }),
      Animated.spring(ctaScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start()

    try {
      if (DEV_MODE) {
        setSessions(prev => [
          {
            id: `mock-sess-${Date.now()}`,
            profile_id: profile.id,
            checked_in_at: new Date().toISOString(),
            workout_type: null,
          },
          ...prev,
        ])
        setCheckInLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('gym_sessions')
        .insert({
          profile_id: profile.id,
          workout_type: null,
          checked_in_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (error) throw error
      setSessions(prev => [data as GymSession, ...prev])
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
    setCheckInLoading(false)
  }

  /** Tag today's latest session with a workout type. Optional / idempotent. */
  async function tagTodayWorkout(type: string) {
    if (!profile) return
    const todaySession = sessions.find(s => isToday(s.checked_in_at))
    if (!todaySession) return
    const nextType = todaySession.workout_type === type ? null : type

    setSessions(prev =>
      prev.map(s => (s.id === todaySession.id ? { ...s, workout_type: nextType } : s))
    )

    if (DEV_MODE) return
    try {
      await supabase
        .from('gym_sessions')
        .update({ workout_type: nextType })
        .eq('id', todaySession.id)
    } catch {
      // Best-effort — UI already reflects the change.
    }
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

  async function handleCopy() {
    if (!profile) return
    await Clipboard.setStringAsync(`${WEB}/u/${profile.slug}`)
    Alert.alert('Copied!', 'Profile link copied to clipboard')
  }

  if (loading || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.skeletonWrap}>
          {/* Header row */}
          <SkeletonRow style={{ alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <Skeleton width={48} height={48} borderRadius={24} />
            <Skeleton width="50%" height={20} borderRadius={6} />
          </SkeletonRow>
          {/* Check-in card */}
          <Skeleton height={84} borderRadius={20} style={{ marginBottom: 20 }} />
          {/* Stat cards row */}
          <SkeletonRow gap={10} style={{ marginBottom: 20 }}>
            <Skeleton width="32%" height={72} borderRadius={14} />
            <Skeleton width="32%" height={72} borderRadius={14} />
            <Skeleton width="32%" height={72} borderRadius={14} />
          </SkeletonRow>
          {/* Section label + card */}
          <Skeleton width="40%" height={14} borderRadius={6} style={{ marginBottom: 10 }} />
          <Skeleton height={140} borderRadius={16} style={{ marginBottom: 20 }} />
          {/* Second section */}
          <Skeleton width="40%" height={14} borderRadius={6} style={{ marginBottom: 10 }} />
          <Skeleton height={100} borderRadius={16} />
        </View>
      </SafeAreaView>
    )
  }

  const streak = calcStreak(sessions)
  const checkedInToday = sessions.some(s => isToday(s.checked_in_at))

  const earnedBadges = BADGES.map(b => {
    let earned = false
    if (b.id === 'century_club') earned = sessions.length >= b.threshold
    else if (b.id === 'on_fire') earned = streak >= b.threshold
    else if (b.id === 'popular') earned = profile.wave_count >= b.threshold
    else if (b.id === 'veteran') earned = sessions.length >= b.threshold
    else if (b.id === 'consistent') earned = streak >= b.threshold
    return { ...b, earned }
  })

  const profileUrl = `${WEB}/u/${profile.slug}`

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header — name alone, no "Hey" (match web) */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push(`/u/${profile.slug}`)}>
            <Avatar photoUrl={profile.photo_url} name={profile.display_name} size={48} />
          </TouchableOpacity>
          <Text style={styles.nameTitle} numberOfLines={1}>
            {profile.display_name}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(onboarding)/create')}
            style={styles.editBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.editIcon}>✏️</Text>
          </TouchableOpacity>
        </View>

        {/* One-tap check-in. Before today: gradient CTA. After: morphs into a dark
            "You showed up" card with an orange glow. Stays all day. */}
        {checkedInToday ? (
          <>
            <View style={styles.checkedInWrap}>
              <View style={styles.checkedInCard}>
                <Animated.Text
                  style={[styles.checkedInFire, { transform: [{ scale: firePulse }] }]}
                >
                  🔥
                </Animated.Text>
                <View style={styles.checkedInTextCol}>
                  <Text style={styles.checkedInTitle}>
                    Day {streak} — You showed up.
                  </Text>
                  <Text style={styles.checkedInItalic}>
                    That's what separates you.
                  </Text>
                </View>
                <View style={styles.checkedInStreakCol}>
                  <Text style={styles.checkedInStreakNum}>{streak}</Text>
                  <Text style={styles.checkedInStreakLabel}>day streak</Text>
                </View>
              </View>
              <Text style={styles.checkedInNext}>
                Next check-in available tomorrow
              </Text>
            </View>

            <Text style={styles.trainingLabel}>What are you training?</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.workoutTagRow}
            >
              {CHECKIN_WORKOUT_TYPES.map(w => {
                const meta = CHECKIN_WORKOUT_META[w] ?? { emoji: '🎯', color: colors.primary }
                const todayType = sessions.find(s => isToday(s.checked_in_at))?.workout_type
                const active = todayType === w
                return (
                  <TouchableOpacity
                    key={w}
                    onPress={() => tagTodayWorkout(w)}
                    activeOpacity={0.8}
                    style={[
                      styles.workoutTagPill,
                      active && { borderColor: meta.color, backgroundColor: `${meta.color}22` },
                    ]}
                  >
                    <Text style={styles.workoutTagEmoji}>{meta.emoji}</Text>
                    <Text
                      style={[
                        styles.workoutTagText,
                        active && { color: meta.color },
                      ]}
                      numberOfLines={1}
                    >
                      {w}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </>
        ) : (
          <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
            <TouchableOpacity
              style={styles.checkInTouch}
              onPress={instantCheckIn}
              activeOpacity={0.9}
              disabled={checkInLoading}
            >
              <LinearGradient
                colors={[...gradients.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.checkInGradient}
              >
                <Text style={styles.checkInText}>💪  I'm at the gym</Text>
                <Text style={styles.checkInSub}>🔥 {streak} day streak</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Breathing room between training pills and stat cards when checked in */}
        {checkedInToday ? <View style={styles.afterTrainingGap} /> : null}

        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatCard icon="👁" value={views} label="Views (7d)" color="#60a5fa" />
          <StatCard icon="👋" value={profile.wave_count} label="Total Waves" color={colors.primary} />
        </View>
        <View style={[styles.statsGrid, { marginTop: 10 }]}>
          <StatCard icon="🔥" value={streak} label="Gym Streak" color="#FF3D6B" />
          <StatCard icon="💪" value={sessions.length} label="Total Sessions" color="#34d399" />
        </View>

        {/* Activity heatmap — GitHub-style contribution grid */}
        <Text style={styles.sectionTitle}>Your Activity</Text>
        <Card>
          <Heatmap sessions={sessions} />
        </Card>

        {/* Badges */}
        <Text style={styles.sectionTitle}>Your Badges</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
          {earnedBadges.map(b => {
            const color = b.color ?? colors.primary
            if (!b.earned) {
              return (
                <View key={b.id} style={[styles.badge, styles.badgeLocked]}>
                  <Text style={styles.badgeEmoji}>🔒</Text>
                  <Text style={[styles.badgeName, { opacity: 0.5 }]}>{b.name}</Text>
                  <Text style={[styles.badgeDesc, { opacity: 0.4 }]}>{b.description}</Text>
                </View>
              )
            }
            const shimmerOpacity = shimmerAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.0, 0.35],
            })
            return (
              <View
                key={b.id}
                style={[
                  styles.badge,
                  {
                    backgroundColor: `${color}22`,
                    borderColor: `${color}88`,
                  },
                ]}
              >
                <Animated.View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFillObject,
                    { backgroundColor: color, opacity: shimmerOpacity, borderRadius: radius.lg },
                  ]}
                />
                <Text style={styles.badgeEmoji}>{b.emoji}</Text>
                <Text style={[styles.badgeName, { color: colors.text }]}>{b.name}</Text>
                <Text style={styles.badgeDesc}>{b.description}</Text>
              </View>
            )
          })}
        </ScrollView>

        {/* QR Code */}
        <Card style={styles.qrCard}>
          <Text style={styles.sectionTitle}>Your QR Code</Text>
          <View style={styles.qrCenter}>
            <View style={styles.qrGlow}>
              <View style={styles.qrBox}>
                <QRCode value={profileUrl} size={160} backgroundColor={colors.surface} color={colors.text} />
              </View>
            </View>
          </View>
          <Text style={styles.qrUrl}>{profileUrl}</Text>
          <View style={styles.qrButtons}>
            <TouchableOpacity style={styles.qrBtn} onPress={handleShare} activeOpacity={0.7}>
              <Text style={styles.qrBtnText}>📤 Share Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.qrBtn} onPress={handleCopy} activeOpacity={0.7}>
              <Text style={styles.qrBtnText}>🔗 Copy Link</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Recent Waves */}
        <Text style={styles.sectionTitle}>Recent Waves</Text>
        <Card>
          {waves.length === 0 ? (
            <Text style={styles.emptyText}>No waves yet. Share your QR!</Text>
          ) : (
            waves.slice(0, 5).map(w => (
              <View key={w.id} style={styles.waveRow}>
                <Text style={styles.waveIcon}>👻</Text>
                <Text style={styles.waveName}>Anonymous wave</Text>
                <Text style={styles.waveTime}>{timeAgo(w.sent_at)}</Text>
              </View>
            ))
          )}
        </Card>

        {/* Pro upgrade */}
        {!profile.is_pro && (
          <Card style={styles.proCard}>
            <Text style={styles.proTitle}>⚡ Upgrade to Pro — $5/mo</Text>
            {[
              '👁 See who viewed your profile',
              '💌 Wave messages from matches',
              '🎨 Custom themes',
              '⭐ Pro badge on your profile',
            ].map(item => (
              <Text key={item} style={styles.proBenefit}>{item}</Text>
            ))}
            <View style={{ marginTop: spacing.md }}>
              <GradientButton label="Go Pro ⚡" onPress={() => Alert.alert('Coming soon', `Visit ${WEB}/dashboard`)} />
            </View>
          </Card>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  skeletonWrap: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  nameTitle: {
    flex: 1,
    fontSize: 24,
    lineHeight: lineHeightFor(24),
    fontFamily: F.extraBold,
    color: colors.text,
    letterSpacing: -0.2,
  },
  editBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: { fontSize: 20, lineHeight: lineHeightFor(20) },
  // "I'm at the gym" CTA (not-yet-checked-in state).
  checkInTouch: {
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
    overflow: 'visible',
  },
  checkInGradient: {
    height: 64,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInText: {
    fontSize: 20,
    lineHeight: lineHeightFor(20),
    fontFamily: F.extraBold,
    color: colors.text,
    letterSpacing: 0.3,
  },
  checkInSub: {
    fontSize: 13,
    lineHeight: lineHeightFor(13),
    fontFamily: F.semiBold,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    letterSpacing: 0.3,
  },

  // Morphed state: dark card with an orange glow around it.
  checkedInWrap: {
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 22,
    elevation: 14,
  },
  checkedInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255,87,34,0.55)',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  checkedInFire: {
    fontSize: 36,
    lineHeight: 42,
  },
  checkedInTextCol: {
    flex: 1,
  },
  checkedInTitle: {
    fontSize: 18,
    lineHeight: lineHeightFor(18),
    fontFamily: F.extraBold,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.3,
  },
  checkedInItalic: {
    fontSize: 13,
    lineHeight: lineHeightFor(13),
    fontFamily: F.regular,
    color: colors.muted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  checkedInStreakCol: {
    alignItems: 'center',
    minWidth: 48,
  },
  checkedInStreakNum: {
    fontSize: 32,
    lineHeight: 36,
    fontFamily: F.extraBold,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -1,
  },
  checkedInStreakLabel: {
    fontSize: 9,
    lineHeight: 11,
    fontFamily: F.bold,
    color: colors.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  checkedInNext: {
    fontSize: 11,
    lineHeight: lineHeightFor(11),
    fontFamily: F.regular,
    color: colors.muted,
    marginTop: 8,
    marginLeft: 4,
  },

  // Optional "tag your workout" row below the checked-in card.
  trainingLabel: {
    fontSize: 13,
    lineHeight: lineHeightFor(13),
    fontFamily: F.bold,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  workoutTagRow: {
    gap: 8,
    paddingRight: spacing.xl,
    paddingVertical: 2,
    marginBottom: spacing.md,
  },
  afterTrainingGap: {
    height: spacing.xl,
  },
  workoutTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  workoutTagEmoji: {
    fontSize: 15,
    lineHeight: 18,
  },
  workoutTagText: {
    fontSize: 12,
    lineHeight: lineHeightFor(12),
    fontFamily: F.semiBold,
    color: colors.muted,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: lineHeightFor(18),
    fontFamily: F.extraBold,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    letterSpacing: -0.3,
  },
  badgesScroll: { marginHorizontal: -spacing.xl, paddingHorizontal: spacing.xl },
  badge: {
    width: 130,
    height: 120,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: 14,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  badgeLocked: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    opacity: 0.6,
  },
  badgeEmoji: { fontSize: 30, lineHeight: 36 },
  badgeName: { fontSize: 12, lineHeight: lineHeightFor(12), fontFamily: F.bold, color: colors.text, textAlign: 'center' },
  badgeDesc: { fontSize: 10, lineHeight: lineHeightFor(10), fontFamily: F.regular, color: colors.muted, textAlign: 'center' },
  qrCard: { marginTop: spacing.xl },
  qrCenter: { alignItems: 'center', marginVertical: spacing.lg },
  qrGlow: {
    padding: 4,
    borderRadius: radius.md + 4,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  qrBox: {
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,87,34,0.5)',
  },
  qrUrl: {
    fontSize: 12,
    lineHeight: lineHeightFor(12),
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  qrButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  qrBtn: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  qrBtnText: { color: colors.text, fontSize: 13, lineHeight: lineHeightFor(13), fontFamily: F.semiBold },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  waveIcon: { fontSize: 20, lineHeight: lineHeightFor(20) },
  waveName: { flex: 1, color: colors.text, fontSize: 14, lineHeight: lineHeightFor(14), fontFamily: F.semiBold },
  waveTime: { color: colors.muted, fontSize: 12, lineHeight: lineHeightFor(12), fontFamily: F.regular },
  emptyText: { color: colors.muted, fontSize: 14, lineHeight: lineHeightFor(14), fontFamily: F.regular, textAlign: 'center', paddingVertical: 12 },
  proCard: {
    marginTop: spacing.xl,
    borderColor: 'rgba(255,87,34,0.5)',
    borderWidth: 1.5,
  },
  proTitle: {
    fontSize: 18,
    lineHeight: lineHeightFor(18),
    fontFamily: F.extraBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  proBenefit: {
    fontSize: 14,
    lineHeight: lineHeightFor(14),
    fontFamily: F.regular,
    color: colors.muted,
    paddingVertical: 4,
  },
})
