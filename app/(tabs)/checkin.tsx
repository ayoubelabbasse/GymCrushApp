import { useEffect, useState, useRef, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Animated, ScrollView,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../../lib/supabase'
import Card from '../../components/Card'
import Heatmap from '../../components/Heatmap'
import { GymSession } from '../../lib/types'
import { CHECKIN_WORKOUT_TYPES, CHECKIN_WORKOUT_META } from '../../constants/data'
import { colors, spacing, radius, F, lineHeightFor, gradients } from '../../constants/theme'
import { DEV_MODE } from '../../lib/devMode'
import { getDevProfile } from '../../lib/devMockProfile'
import { mockGymSessions } from '../../lib/mockData'
import Skeleton, { SkeletonRow } from '../../components/Skeleton'

function isToday(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (d > 0) return `${d} day${d > 1 ? 's' : ''} ago`
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
      streak++; cursor = ts - 86400000
    } else break
  }
  return streak
}

export default function CheckInScreen() {
  const [sessions, setSessions] = useState<GymSession[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [checkInLoading, setCheckInLoading] = useState(false)
  const [profileId, setProfileId] = useState<string | null>(null)
  const ctaScale = useRef(new Animated.Value(1)).current
  const firePulse = useRef(new Animated.Value(1)).current

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

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      if (DEV_MODE) {
        const prof = await getDevProfile()
        setProfileId(prof.id)
        setSessions(mockGymSessions.slice(0, 30))
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: prof } = await supabase
          .from('profiles').select('id').eq('user_id', user.id).maybeSingle()
        if (!prof) return
        setProfileId(prof.id)

        const { data: sess } = await supabase
          .from('gym_sessions')
          .select('*')
          .eq('profile_id', prof.id)
          .order('checked_in_at', { ascending: false })
          .limit(30)

        setSessions(sess ?? [])
      }
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
    setLoading(false)
    setRefreshing(false)
  }, [])

  useFocusEffect(useCallback(() => { loadData() }, [loadData]))

  /** One-tap check-in — no picker, `workout_type: null`. Can be tagged after. */
  async function instantCheckIn() {
    if (!profileId || checkInLoading) return
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
            profile_id: profileId,
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
          profile_id: profileId,
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

  /** Tag today's latest session with a workout type. Tap the active one again to clear. */
  async function tagTodayWorkout(type: string) {
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
      // best-effort
    }
  }

  const checkedInToday = sessions.some(s => isToday(s.checked_in_at))
  const streak = calcStreak(sessions)
  const todayType = sessions.find(s => isToday(s.checked_in_at))?.workout_type ?? null
  const recent = sessions.slice(0, 8)

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.skeletonWrap}>
          <SkeletonRow style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Skeleton width="55%" height={22} borderRadius={6} />
            <Skeleton width={64} height={28} borderRadius={14} />
          </SkeletonRow>
          <Skeleton height={80} borderRadius={20} style={{ marginTop: 24 }} />
          <Skeleton height={18} width="40%" borderRadius={6} style={{ marginTop: 28 }} />
          <Skeleton height={120} borderRadius={16} style={{ marginTop: 12 }} />
          <Skeleton height={18} width="40%" borderRadius={6} style={{ marginTop: 24 }} />
          <Skeleton height={160} borderRadius={16} style={{ marginTop: 12 }} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Compact header: date + streak badge */}
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.heroDate}>
              {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            <Text style={styles.heroSub}>
              {checkedInToday ? 'You showed up today.' : 'Hit the gym today?'}
            </Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakBadgeNum}>{streak}</Text>
            <Text style={styles.streakBadgeFire}>🔥</Text>
          </View>
        </View>

        {checkedInToday ? (
          <>
            {/* Showed-up card — mirrors the dashboard after-check-in state. */}
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

            {/* Optional workout tagging (can change anytime today). */}
            <Text style={styles.workoutTagSectionLabel}>Tag today's workout</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagRow}
            >
              {CHECKIN_WORKOUT_TYPES.map(w => {
                const meta = CHECKIN_WORKOUT_META[w] ?? { emoji: '🎯', color: colors.primary }
                const active = todayType === w
                return (
                  <TouchableOpacity
                    key={w}
                    onPress={() => tagTodayWorkout(w)}
                    activeOpacity={0.8}
                    style={[
                      styles.tagPill,
                      active && { borderColor: meta.color, backgroundColor: `${meta.color}22` },
                    ]}
                  >
                    <Text style={styles.tagEmoji}>{meta.emoji}</Text>
                    <Text
                      style={[styles.tagText, active && { color: meta.color }]}
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
              onPress={instantCheckIn}
              disabled={checkInLoading}
              activeOpacity={0.9}
              style={styles.hereBtnTouch}
            >
              <LinearGradient
                colors={[...gradients.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hereBtnGradient}
              >
                <Text style={styles.hereBtnText}>
                  {checkInLoading ? 'LOGGING…' : "I'M HERE 💪"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Activity grid */}
        <Text style={styles.sectionTitle}>This month</Text>
        <Card>
          <Heatmap sessions={sessions} weeks={5} />
        </Card>

        {/* Recent sessions */}
        {recent.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent sessions</Text>
            <Card>
              {recent.map((s, i) => {
                const key = s.workout_type ?? 'Other'
                const meta = CHECKIN_WORKOUT_META[key] ?? {
                  emoji: '🎯',
                  color: colors.muted,
                }
                return (
                  <View
                    key={s.id}
                    style={[styles.sessionRow, i < recent.length - 1 && styles.sessionDivider]}
                  >
                    <View style={[styles.sessionDot, { backgroundColor: meta.color }]} />
                    <Text style={styles.sessionEmoji}>{meta.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sessionType}>
                        {s.workout_type ?? 'Untagged'}
                      </Text>
                      <Text style={styles.sessionTime}>
                        {timeAgo(s.checked_in_at)}
                      </Text>
                    </View>
                  </View>
                )
              })}
            </Card>
          </>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  skeletonWrap: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: 0,
  },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 24 },

  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  heroDate: {
    fontSize: 16,
    lineHeight: lineHeightFor(16),
    fontFamily: F.extraBold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: 13,
    lineHeight: lineHeightFor(13),
    fontFamily: F.regular,
    color: colors.muted,
    marginTop: 3,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,87,34,0.12)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,87,34,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
  },
  streakBadgeNum: {
    fontSize: 18,
    lineHeight: lineHeightFor(18),
    fontFamily: F.extraBold,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  streakBadgeFire: {
    fontSize: 16,
    lineHeight: 20,
  },

  // Giant "I'M HERE 💪" button when not yet checked in.
  hereBtnTouch: {
    height: 80,
    borderRadius: 20,
    overflow: 'visible',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 16,
    marginBottom: spacing.xl,
  },
  hereBtnGradient: {
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hereBtnText: {
    fontSize: 24,
    lineHeight: lineHeightFor(24),
    fontFamily: F.extraBold,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 1.5,
  },

  // Checked-in card (same vocabulary as dashboard).
  checkedInWrap: {
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  checkedInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255,87,34,0.55)',
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 14,
  },
  checkedInFire: {
    fontSize: 40,
    lineHeight: 46,
  },
  checkedInTextCol: { flex: 1 },
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
    minWidth: 52,
  },
  checkedInStreakNum: {
    fontSize: 34,
    lineHeight: 38,
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
    marginTop: 10,
    marginLeft: 4,
  },

  workoutTagSectionLabel: {
    fontSize: 14,
    lineHeight: lineHeightFor(14),
    fontFamily: F.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  tagRow: {
    gap: 8,
    paddingRight: spacing.xl,
    paddingVertical: 2,
    marginBottom: spacing.md,
  },
  tagPill: {
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
  tagEmoji: { fontSize: 15, lineHeight: 18 },
  tagText: {
    fontSize: 12,
    lineHeight: lineHeightFor(12),
    fontFamily: F.semiBold,
    color: colors.muted,
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

  sessionRow: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sessionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sessionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  sessionEmoji: {
    fontSize: 18,
    lineHeight: 22,
    marginRight: 2,
  },
  sessionType: {
    fontSize: 15,
    lineHeight: lineHeightFor(15),
    fontFamily: F.bold,
    color: colors.text,
  },
  sessionTime: {
    fontSize: 12,
    lineHeight: lineHeightFor(12),
    fontFamily: F.regular,
    color: colors.muted,
    marginTop: 2,
  },
})
