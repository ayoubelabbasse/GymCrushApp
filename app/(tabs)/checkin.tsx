import { useEffect, useState, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Animated, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import GradientButton from '../../components/GradientButton'
import Card from '../../components/Card'
import { GymSession } from '../../lib/types'
import { CHECKIN_WORKOUT_TYPES } from '../../constants/data'
import { colors, spacing, radius, F } from '../../constants/theme'

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
  const [selectedType, setSelectedType] = useState('')
  const [checkInLoading, setCheckInLoading] = useState(false)
  const [profileId, setProfileId] = useState<string | null>(null)
  const successAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(1)).current

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
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
        .limit(20)

      setSessions(sess ?? [])
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
    setLoading(false)
  }

  async function handleCheckIn() {
    if (!selectedType) {
      Alert.alert('Select type', 'Pick a workout type first')
      return
    }
    if (!profileId) return

    setCheckInLoading(true)
    try {
      const { error } = await supabase.from('gym_sessions').insert({
        profile_id: profileId,
        workout_type: selectedType,
        checked_in_at: new Date().toISOString(),
      })
      if (error) throw error

      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1.1, useNativeDriver: true, friction: 3 }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 3 }),
      ]).start()

      Animated.sequence([
        Animated.timing(successAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.delay(3000),
        Animated.timing(successAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start()

      setSelectedType('')
      await loadData()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
    setCheckInLoading(false)
  }

  const checkedInToday = sessions.some(s => isToday(s.checked_in_at))
  const streak = calcStreak(sessions)
  const recent = sessions.slice(0, 7)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>ARE YOU AT{'\n'}THE GYM?</Text>
          <Animated.Text style={[styles.streakText, { transform: [{ scale: scaleAnim }] }]}>
            🔥 {streak} day streak
          </Animated.Text>
        </View>

        {/* Success banner */}
        <Animated.View style={[styles.successBanner, { opacity: successAnim }]}>
          <Text style={styles.successText}>🎉 Session logged! Keep crushing it!</Text>
        </Animated.View>

        {checkedInToday ? (
          <Card style={styles.doneCard}>
            <Text style={styles.doneEmoji}>✅</Text>
            <Text style={styles.doneTitle}>Already logged today!</Text>
            <Text style={styles.doneSub}>Come back tomorrow to keep your streak 🔥</Text>
          </Card>
        ) : (
          <>
            {/* Workout type selection */}
            <Text style={styles.pickLabel}>What are you training?</Text>
            <View style={styles.workoutGrid}>
              {CHECKIN_WORKOUT_TYPES.map(w => (
                <TouchableOpacity
                  key={w}
                  style={[styles.workoutBtn, selectedType === w && styles.workoutBtnActive]}
                  onPress={() => setSelectedType(selectedType === w ? '' : w)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.workoutText, selectedType === w && styles.workoutTextActive]}>
                    {w}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Big CTA */}
            <TouchableOpacity
              style={[
                styles.bigBtn,
                !selectedType && styles.bigBtnDisabled,
              ]}
              onPress={handleCheckIn}
              disabled={checkInLoading || !selectedType}
              activeOpacity={0.85}
            >
              {checkInLoading ? (
                <Text style={styles.bigBtnText}>Logging...</Text>
              ) : (
                <Text style={styles.bigBtnText}>I'M HERE 💪</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Recent sessions */}
        {recent.length > 0 && (
          <>
            <Text style={styles.recentTitle}>Recent Sessions</Text>
            <Card>
              {recent.map((s, i) => (
                <View key={s.id} style={[styles.sessionRow, i < recent.length - 1 && styles.sessionDivider]}>
                  <View>
                    <Text style={styles.sessionType}>{s.workout_type ?? 'Session'}</Text>
                    <Text style={styles.sessionTime}>{timeAgo(s.checked_in_at)}</Text>
                  </View>
                  {isToday(s.checked_in_at) && (
                    <View style={styles.todayBadge}>
                      <Text style={styles.todayBadgeText}>Today</Text>
                    </View>
                  )}
                </View>
              ))}
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
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 24 },
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  heroTitle: {
    fontSize: 44,
    fontFamily: F.extraBold,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -2,
    lineHeight: 52,
    marginBottom: spacing.md,
  },
  streakText: {
    fontSize: 22,
    fontFamily: F.extraBold,
    color: colors.primary,
  },
  successBanner: {
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.3)',
  },
  successText: {
    color: '#34d399',
    fontWeight: '700',
    fontSize: 14,
  },
  doneCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    backgroundColor: 'rgba(52,211,153,0.08)',
    borderColor: 'rgba(52,211,153,0.3)',
  },
  doneEmoji: { fontSize: 48 },
  doneTitle: {
    fontSize: 22,
    fontFamily: F.extraBold,
    color: '#34d399',
  },
  doneSub: {
    fontSize: 14,
    fontFamily: F.regular,
    color: colors.muted,
    textAlign: 'center',
  },
  pickLabel: {
    fontSize: 16,
    fontFamily: F.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  workoutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  workoutBtn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  workoutBtnActive: {
    backgroundColor: 'rgba(255,107,0,0.15)',
    borderColor: colors.primary,
  },
  workoutText: { fontSize: 14, fontFamily: F.bold, color: colors.muted },
  workoutTextActive: { color: colors.primary },
  bigBtn: {
    height: 72,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  bigBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  bigBtnText: {
    fontSize: 22,
    fontFamily: F.extraBold,
    color: colors.text,
    letterSpacing: 1,
  },
  recentTitle: {
    fontSize: 18,
    fontFamily: F.extraBold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  sessionRow: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sessionType: { fontSize: 15, fontFamily: F.bold, color: colors.text },
  sessionTime: { fontSize: 12, fontFamily: F.regular, color: colors.muted, marginTop: 2 },
  todayBadge: {
    backgroundColor: 'rgba(52,211,153,0.15)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.3)',
  },
  todayBadgeText: { fontSize: 11, color: '#34d399', fontWeight: '700' },
})
