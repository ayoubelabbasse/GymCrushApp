import { useEffect, useState, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Share, Modal, Animated, Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import QRCode from 'react-native-qrcode-svg'
import * as Clipboard from 'expo-clipboard'
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/Avatar'
import StatCard from '../../components/StatCard'
import Card from '../../components/Card'
import GradientButton from '../../components/GradientButton'
import { Profile, GymSession, Wave } from '../../lib/types'
import { CHECKIN_WORKOUT_TYPES, BADGES } from '../../constants/data'
import { colors, spacing, radius, F } from '../../constants/theme'

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
  const [checkInModal, setCheckInModal] = useState(false)
  const [selectedWorkout, setSelectedWorkout] = useState('')
  const [checkInLoading, setCheckInLoading] = useState(false)
  const successAnim = useRef(new Animated.Value(0)).current

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: prof }, { data: sess }, { data: wavesData }, { data: viewsData }] =
        await Promise.all([
          supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
          supabase.from('gym_sessions').select('*').eq('profile_id', user.id).order('checked_in_at', { ascending: false }),
          supabase.from('waves').select('*').eq('profile_id', user.id).order('sent_at', { ascending: false }).limit(10),
          supabase.from('profile_views').select('id').eq('profile_id', user.id)
            .gte('viewed_at', new Date(Date.now() - 7 * 86400000).toISOString()),
        ])

      setProfile(prof)
      setSessions(sess ?? [])
      setWaves(wavesData ?? [])
      setViews(viewsData?.length ?? 0)
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
    setLoading(false)
  }

  async function handleCheckIn() {
    if (!selectedWorkout) {
      Alert.alert('Select workout', 'Pick a workout type first')
      return
    }
    if (!profile) return
    setCheckInLoading(true)
    try {
      const { error } = await supabase.from('gym_sessions').insert({
        profile_id: profile.id,
        workout_type: selectedWorkout,
        checked_in_at: new Date().toISOString(),
      })
      if (error) throw error

      setCheckInModal(false)
      setSelectedWorkout('')
      Animated.sequence([
        Animated.timing(successAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(successAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start()
      await loadData()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
    setCheckInLoading(false)
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
        <Text style={styles.loading}>Loading...</Text>
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push(`/u/${profile.slug}`)}>
            <Avatar photoUrl={profile.photo_url} name={profile.display_name} size={44} />
          </TouchableOpacity>
          <Text style={styles.greeting}>Hey {profile.display_name} 👋</Text>
          <TouchableOpacity
            onPress={() => router.push('/(onboarding)/create')}
            style={styles.editBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.editIcon}>✏️</Text>
          </TouchableOpacity>
        </View>

        {/* Check-in button */}
        <TouchableOpacity
          style={[styles.checkInBtn, checkedInToday && styles.checkInBtnDone]}
          onPress={() => !checkedInToday && setCheckInModal(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.checkInText}>
            {checkedInToday ? '✅ Checked in today!' : '💪 I\'m at the gym'}
          </Text>
        </TouchableOpacity>

        {/* Success toast */}
        <Animated.View style={[styles.successToast, { opacity: successAnim }]}>
          <Text style={styles.successToastText}>🎉 Session logged! Keep it up!</Text>
        </Animated.View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatCard icon="👁" value={views} label="Views (7d)" color="#60a5fa" />
          <StatCard icon="👋" value={profile.wave_count} label="Total Waves" color={colors.primary} />
        </View>
        <View style={[styles.statsGrid, { marginTop: 10 }]}>
          <StatCard icon="🔥" value={streak} label="Gym Streak" color="#FF3D6B" />
          <StatCard icon="💪" value={sessions.length} label="Total Sessions" color="#34d399" />
        </View>

        {/* Badges */}
        <Text style={styles.sectionTitle}>Your Badges</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
          {earnedBadges.map(b => (
            <View
              key={b.id}
              style={[styles.badge, b.earned ? styles.badgeEarned : styles.badgeLocked]}
            >
              <Text style={styles.badgeEmoji}>{b.earned ? b.emoji : '🔒'}</Text>
              <Text style={[styles.badgeName, !b.earned && { opacity: 0.5 }]}>{b.name}</Text>
              <Text style={[styles.badgeDesc, !b.earned && { opacity: 0.4 }]}>{b.description}</Text>
            </View>
          ))}
        </ScrollView>

        {/* QR Code */}
        <Card style={styles.qrCard}>
          <Text style={styles.sectionTitle}>Your QR Code</Text>
          <View style={styles.qrCenter}>
            <View style={styles.qrBox}>
              <QRCode value={profileUrl} size={160} backgroundColor={colors.surface} color={colors.text} />
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

      {/* Check-in modal */}
      <Modal visible={checkInModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setCheckInModal(false)}
          activeOpacity={1}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>What are you training?</Text>
            <View style={styles.workoutGrid}>
              {CHECKIN_WORKOUT_TYPES.map(w => (
                <TouchableOpacity
                  key={w}
                  style={[styles.workoutPill, selectedWorkout === w && styles.workoutPillActive]}
                  onPress={() => setSelectedWorkout(w)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.workoutText, selectedWorkout === w && styles.workoutTextActive]}>
                    {w}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <GradientButton
              label="Log Session 💪"
              onPress={handleCheckIn}
              loading={checkInLoading}
              disabled={!selectedWorkout}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { color: colors.muted, textAlign: 'center', marginTop: 100, fontSize: 16, fontFamily: F.regular },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  greeting: {
    flex: 1,
    fontSize: 20,
    fontFamily: F.extraBold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  editBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: { fontSize: 20 },
  checkInBtn: {
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  checkInBtnDone: {
    backgroundColor: '#1a2e1a',
    shadowColor: '#34d399',
  },
  checkInText: {
    fontSize: 20,
    fontFamily: F.extraBold,
    color: colors.text,
  },
  successToast: {
    backgroundColor: '#1a2e1a',
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#34d399',
  },
  successToastText: {
    color: '#34d399',
    fontWeight: '700',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: F.extraBold,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    letterSpacing: -0.3,
  },
  badgesScroll: { marginHorizontal: -spacing.xl, paddingHorizontal: spacing.xl },
  badge: {
    width: 120,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 14,
    marginRight: 10,
    alignItems: 'center',
    gap: 4,
  },
  badgeEarned: {
    backgroundColor: 'rgba(255,107,0,0.12)',
    borderColor: 'rgba(255,107,0,0.4)',
  },
  badgeLocked: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    opacity: 0.6,
  },
  badgeEmoji: { fontSize: 28 },
  badgeName: { fontSize: 12, fontFamily: F.bold, color: colors.text, textAlign: 'center' },
  badgeDesc: { fontSize: 10, fontFamily: F.regular, color: colors.muted, textAlign: 'center' },
  qrCard: { marginTop: spacing.xl },
  qrCenter: { alignItems: 'center', marginVertical: spacing.lg },
  qrBox: {
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qrUrl: {
    fontSize: 12,
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
  qrBtnText: { color: colors.text, fontSize: 13, fontFamily: F.semiBold },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  waveIcon: { fontSize: 20 },
  waveName: { flex: 1, color: colors.text, fontSize: 14, fontFamily: F.semiBold },
  waveTime: { color: colors.muted, fontSize: 12, fontFamily: F.regular },
  emptyText: { color: colors.muted, fontSize: 14, fontFamily: F.regular, textAlign: 'center', paddingVertical: 12 },
  proCard: {
    marginTop: spacing.xl,
    borderColor: 'rgba(255,107,0,0.5)',
    borderWidth: 1.5,
  },
  proTitle: {
    fontSize: 18,
    fontFamily: F.extraBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  proBenefit: {
    fontSize: 14,
    fontFamily: F.regular,
    color: colors.muted,
    paddingVertical: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: F.extraBold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  workoutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  workoutPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  workoutPillActive: {
    backgroundColor: 'rgba(255,107,0,0.15)',
    borderColor: colors.primary,
  },
  workoutText: { color: colors.muted, fontSize: 14, fontFamily: F.semiBold },
  workoutTextActive: { color: colors.primary },
})
