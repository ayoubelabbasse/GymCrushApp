import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/Avatar'
import Card from '../../components/Card'
import GradientButton from '../../components/GradientButton'
import PillTag from '../../components/PillTag'
import { Profile, GymSession } from '../../lib/types'
import { SPORTS } from '../../constants/data'
import { colors, spacing, radius, vibeTagColors, F } from '../../constants/theme'

const WEB = 'https://gymcrush-one.vercel.app'

function isToday(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
}

async function getDeviceId() {
  let id = await AsyncStorage.getItem('gc_device_id')
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    await AsyncStorage.setItem('gc_device_id', id)
  }
  return id
}

interface AthleteCardProps {
  profile: Profile
  checkedInToday: boolean
  onWave: () => void
  waveSent: boolean
}

function AthleteCard({ profile, checkedInToday, onWave, waveSent }: AthleteCardProps) {
  const router = useRouter()
  const sport = profile.sport ? SPORTS.find(s => s.id === profile.sport) : null

  return (
    <TouchableOpacity
      style={styles.cardTouch}
      onPress={() => router.push(`/u/${profile.slug}`)}
      activeOpacity={0.85}
    >
      <Card style={styles.card}>
        <View style={styles.cardCenter}>
          <Avatar photoUrl={profile.photo_url} name={profile.display_name} size={60} />
          {checkedInToday && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>🔥 At gym today</Text>
            </View>
          )}
          <Text style={styles.cardName} numberOfLines={1}>{profile.display_name}</Text>
          {profile.gym_name ? (
            <Text style={styles.cardGym} numberOfLines={1}>{profile.gym_name}</Text>
          ) : null}
        </View>

        {sport && (
          <View style={styles.cardPills}>
            <View style={styles.sportPill}>
              <Text style={styles.sportPillText}>{sport.emoji} {sport.id}</Text>
            </View>
          </View>
        )}

        {profile.vibe_tags && profile.vibe_tags.length > 0 && (
          <View style={styles.vibePills}>
            {profile.vibe_tags.slice(0, 2).map((tag, i) => {
              const c = vibeTagColors[i % vibeTagColors.length]
              return (
                <View key={tag} style={[styles.vibePill, { backgroundColor: c.bg, borderColor: c.border }]}>
                  <Text style={[styles.vibePillText, { color: c.text }]} numberOfLines={1}>{tag}</Text>
                </View>
              )
            })}
          </View>
        )}

        <View style={styles.cardStats}>
          <Text style={styles.cardStatText}>👋 {profile.wave_count}</Text>
        </View>

        <TouchableOpacity
          style={[styles.waveBtn, waveSent && styles.waveBtnSent]}
          onPress={(e) => { e.stopPropagation?.(); onWave() }}
          activeOpacity={0.7}
          disabled={waveSent}
        >
          <Text style={styles.waveBtnText}>{waveSent ? '✅ Waved!' : 'Send Wave 👋'}</Text>
        </TouchableOpacity>
      </Card>
    </TouchableOpacity>
  )
}

export default function DiscoverScreen() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [sessions, setSessions] = useState<{ profile_id: string; checked_in_at: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sportFilter, setSportFilter] = useState('')
  const [wavesSent, setWavesSent] = useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)

      const [{ data: profs }, { data: sess }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('gym_sessions').select('profile_id, checked_in_at')
          .gte('checked_in_at', new Date(Date.now() - 86400000).toISOString()),
      ])

      setProfiles((profs ?? []).filter(p => p.user_id !== user?.id))
      setSessions(sess ?? [])
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
    setLoading(false)
  }

  async function sendWave(profile: Profile) {
    try {
      const deviceId = await getDeviceId()
      const res = await fetch(`${WEB}/api/wave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profile.id, viewer_fingerprint: deviceId }),
      })
      if (!res.ok) throw new Error('Failed to send wave')
      setWavesSent(prev => new Set([...prev, profile.id]))
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not send wave')
    }
  }

  const checkedInIds = new Set(
    sessions.filter(s => isToday(s.checked_in_at)).map(s => s.profile_id)
  )

  const filtered = profiles.filter(p => {
    if (sportFilter && p.sport !== sportFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!p.display_name.toLowerCase().includes(q) &&
        !(p.gym_name ?? '').toLowerCase().includes(q)) return false
    }
    return true
  })

  const activeToday = filtered.filter(p => checkedInIds.has(p.id)).length

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        {/* Sticky header + filters */}
        <View style={styles.stickyHeader}>
          <Text style={styles.title}>🏋️ Discover Athletes</Text>
          <Text style={styles.subtitle}>Find people who train like you.</Text>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or gym..."
              placeholderTextColor="#555"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Sport filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterPill, !sportFilter && styles.filterPillActive]}
              onPress={() => setSportFilter('')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, !sportFilter && styles.filterTextActive]}>All</Text>
            </TouchableOpacity>
            {SPORTS.map(s => (
              <TouchableOpacity
                key={s.id}
                style={[styles.filterPill, sportFilter === s.id && styles.filterPillActive]}
                onPress={() => setSportFilter(sportFilter === s.id ? '' : s.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, sportFilter === s.id && styles.filterTextActive]}>
                  {s.emoji} {s.id}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.countText}>
            {filtered.length} athletes found · {activeToday} active today
          </Text>
        </View>

        {/* Grid */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : filtered.length === 0 ? (
          <Text style={styles.emptyText}>No athletes found. Try different filters.</Text>
        ) : (
          <View style={styles.grid}>
            {filtered.map(p => (
              <AthleteCard
                key={p.id}
                profile={p}
                checkedInToday={checkedInIds.has(p.id)}
                onWave={() => sendWave(p)}
                waveSent={wavesSent.has(p.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 24 },
  stickyHeader: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontFamily: F.extraBold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: F.regular,
    color: colors.muted,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    height: 48,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  filterScroll: { marginBottom: spacing.sm },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: 'rgba(255,107,0,0.15)',
    borderColor: colors.primary,
  },
  filterText: { fontSize: 13, fontFamily: F.semiBold, color: colors.muted },
  filterTextActive: { color: colors.primary },
  countText: {
    fontSize: 12,
    fontFamily: F.regular,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  loadingContainer: { paddingTop: 60, alignItems: 'center' },
  emptyText: {
    color: colors.muted,
    textAlign: 'center',
    paddingTop: 40,
    fontSize: 14,
    paddingHorizontal: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xl,
    gap: 12,
  },
  cardTouch: { width: '47%' },
  card: { padding: 12 },
  cardCenter: { alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  activeBadge: {
    backgroundColor: 'rgba(255,107,0,0.15)',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.3)',
  },
  activeBadgeText: { fontSize: 10, color: colors.primary, fontFamily: F.bold },
  cardName: {
    fontSize: 14,
    fontFamily: F.extraBold,
    color: colors.text,
    textAlign: 'center',
  },
  cardGym: { fontSize: 11, fontFamily: F.regular, color: colors.muted, textAlign: 'center' },
  cardPills: { marginBottom: 6 },
  sportPill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,107,0,0.12)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.3)',
  },
  sportPillText: { fontSize: 11, color: colors.primary, fontFamily: F.semiBold },
  vibePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
    justifyContent: 'center',
  },
  vibePill: {
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
  },
  vibePillText: { fontSize: 9, fontFamily: F.semiBold },
  cardStats: { flexDirection: 'row', gap: spacing.sm, marginBottom: 8, justifyContent: 'center' },
  cardStatText: { fontSize: 11, fontFamily: F.regular, color: colors.muted },
  waveBtn: {
    height: 34,
    backgroundColor: 'rgba(255,107,0,0.12)',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.3)',
  },
  waveBtnSent: {
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderColor: 'rgba(52,211,153,0.3)',
  },
  waveBtnText: { fontSize: 12, fontFamily: F.bold, color: colors.primary },
})
