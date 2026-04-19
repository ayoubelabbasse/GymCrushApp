import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, RefreshControl, Animated,
  useWindowDimensions, PanResponder,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/Avatar'
import GradientButton from '../../components/GradientButton'
import { Profile, Schedule } from '../../lib/types'
import { SPORTS } from '../../constants/data'
import { colors, spacing, radius, vibeTagColors, F, lineHeightFor, gradients } from '../../constants/theme'
import { DEV_MODE } from '../../lib/devMode'
import { getDevProfile } from '../../lib/devMockProfile'
import {
  MOCK_USER_ID,
  MOCK_OTHER_PROFILES,
  mockDiscoverSessions,
  MOCK_DISCOVER_STREAKS,
  MOCK_MUTUAL_MATCH_IDS,
} from '../../lib/mockData'

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

// ──────────────────────────────────────────────────────────────────────────
// Live freshness — dot color + "X min/hrs ago" label for Here Now rows.
// ──────────────────────────────────────────────────────────────────────────

type Freshness = { dotColor: string; label: string }
function freshnessFor(iso: string): Freshness {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000))
  if (mins < 30)   return { dotColor: '#34d399',     label: 'just now' }
  if (mins < 120)  return { dotColor: colors.primary, label: `${mins} min ago` }
  const hrs = Math.floor(mins / 60)
  return { dotColor: colors.muted, label: `${hrs} hr${hrs > 1 ? 's' : ''} ago` }
}

/** At most one pill: never show both "competitive" and "will spot" — prefer competitive. */
function pickDiscoverTag(tags: string[] | null): string | null {
  if (!tags?.length) return null
  const isCompetitive = (t: string) => /competitive/i.test(t)
  const isSpot = (t: string) => /will spot you|spot you/i.test(t)
  const competitive = tags.find(isCompetitive)
  const spot = tags.find(isSpot)
  if (competitive && spot) return competitive
  return competitive ?? spot ?? tags[0]
}

// ──────────────────────────────────────────────────────────────────────────
// Shared row primitives.
// ──────────────────────────────────────────────────────────────────────────

function VibePills({ tags }: { tags: string[] | null }) {
  const t = pickDiscoverTag(tags)
  if (!t) return null
  const idx = tags!.indexOf(t)
  const c = vibeTagColors[Math.max(0, idx) % vibeTagColors.length]
  return (
    <View style={styles.vibePills}>
      <View
        style={[styles.vibePill, { backgroundColor: c.bg, borderColor: c.border }]}
      >
        <Text
          style={[styles.vibePillText, { color: c.text }]}
          numberOfLines={1}
        >
          {t}
        </Text>
      </View>
    </View>
  )
}

interface DiscoverWaveButtonProps {
  waved: boolean
  onPress: () => void
}

/** Same gradient Wave + compact "Waved" as public profile (`u/[slug]`). */
function DiscoverWaveButton({ waved, onPress }: DiscoverWaveButtonProps) {
  const scale = useRef(new Animated.Value(1)).current
  const prev = useRef(waved)
  useEffect(() => {
    if (!prev.current && waved) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.15, friction: 4, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1,    friction: 4, useNativeDriver: true }),
      ]).start()
    }
    prev.current = waved
  }, [waved, scale])

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      {waved ? (
        <View style={styles.discoverWavedCompact}>
          <Text style={styles.discoverWavedCompactText}>✅ Waved</Text>
        </View>
      ) : (
        <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.discoverWaveTouch}>
          <LinearGradient
            colors={[...gradients.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.discoverWaveGradient}
          >
            <Text style={styles.discoverWaveText}>👋 Wave</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </Animated.View>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// HERE NOW row — avatar + live dot + name + time-ago + vibes + wave.
// ──────────────────────────────────────────────────────────────────────────

interface HereRowProps {
  profile: Profile
  checkedInAt: string
  waved: boolean
  mutual: boolean
  onWave: () => void
}

function HereRow({ profile, checkedInAt, waved, mutual, onWave }: HereRowProps) {
  const router = useRouter()
  const { dotColor, label } = freshnessFor(checkedInAt)

  return (
    <TouchableOpacity
      onPress={() => router.push(`/u/${profile.slug}`)}
      activeOpacity={0.7}
      style={styles.hereRow}
    >
      {/* Avatar + live dot */}
      <View style={styles.hereAvatarWrap}>
        <Avatar photoUrl={profile.photo_url} name={profile.display_name} size={48} />
        <View style={[styles.hereLiveDot, { backgroundColor: dotColor }]} />
      </View>

      {/* Content */}
      <View style={styles.hereMid}>
        <View style={styles.hereTopRow}>
          <Text style={styles.hereName} numberOfLines={1}>
            {profile.display_name}
            {mutual ? '  ⚡' : ''}
          </Text>
          <Text style={styles.hereTime}>{label}</Text>
        </View>
        <Text style={styles.hereSport} numberOfLines={1}>
          {[profile.sport, profile.gym_name].filter(Boolean).join(' · ') || 'At the gym'}
        </Text>
        <VibePills tags={profile.vibe_tags} />
      </View>

      {/* Wave */}
      <DiscoverWaveButton waved={waved} onPress={onWave} />
    </TouchableOpacity>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// EVERYONE row — tap to open profile, SWIPE RIGHT to send a wave.
// ──────────────────────────────────────────────────────────────────────────

interface EveryoneRowProps {
  profile: Profile
  streak: number
  waved: boolean
  mutual: boolean
  onWave: () => void
}

function EveryoneRow({ profile, streak, waved, mutual, onWave }: EveryoneRowProps) {
  const router = useRouter()
  const sport = profile.sport ? SPORTS.find(s => s.id === profile.sport) : null
  const translateX = useRef(new Animated.Value(0)).current
  const firedThisDrag = useRef(false)

  // Right-swipe to wave. Only claim horizontal drags so vertical scrolling works.
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5 && gs.dx > 0,
      onPanResponderGrant: () => { firedThisDrag.current = false },
      onPanResponderMove: (_, gs) => {
        if (waved) return
        const x = Math.max(0, Math.min(gs.dx, 140))
        translateX.setValue(x)
        if (!firedThisDrag.current && x >= 100) {
          firedThisDrag.current = true
          onWave()
        }
      },
      onPanResponderRelease: () => {
        Animated.spring(translateX, {
          toValue: 0,
          friction: 6,
          useNativeDriver: true,
        }).start()
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          friction: 6,
          useNativeDriver: true,
        }).start()
      },
    })
  ).current

  const hintOpacity = translateX.interpolate({
    inputRange: [0, 60, 100],
    outputRange: [0, 0.6, 1],
    extrapolate: 'clamp',
  })

  return (
    <View style={styles.everyoneRowWrap}>
      {/* Swipe hint behind the row — fades in as the user drags right. */}
      <Animated.View style={[styles.swipeHint, { opacity: hintOpacity }]}>
        <Text style={styles.swipeHintText}>👋  Wave sent</Text>
      </Animated.View>

      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...pan.panHandlers}
      >
        <TouchableOpacity
          onPress={() => router.push(`/u/${profile.slug}`)}
          activeOpacity={0.7}
          style={styles.everyoneRow}
        >
          <Avatar photoUrl={profile.photo_url} name={profile.display_name} size={48} />

          <View style={styles.everyoneMid}>
            <View style={styles.everyoneNameRow}>
              <Text style={styles.everyoneName} numberOfLines={1}>
                {profile.display_name}
              </Text>
              {mutual && <Text style={styles.everyoneMutual}>⚡</Text>}
            </View>
            <Text style={styles.everyoneGym} numberOfLines={1}>
              {profile.gym_name ?? 'No gym'}
            </Text>
          </View>

          <View style={styles.everyoneRight}>
            {sport && (
              <View style={styles.sportPill}>
                <Text style={styles.sportPillText} numberOfLines={1}>
                  {sport.emoji} {sport.id}
                </Text>
              </View>
            )}
            {streak > 0 && (
              <Text style={styles.streakLittle}>🔥 {streak}</Text>
            )}
            {waved && (
              <Text style={styles.wavedInline}>✅ Waved</Text>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Screen.
// ──────────────────────────────────────────────────────────────────────────

type TabKey = 'here' | 'everyone'

export default function DiscoverScreen() {
  const router = useRouter()
  const { width } = useWindowDimensions()

  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [sessions, setSessions] = useState<{ profile_id: string; checked_in_at: string }[]>([])
  const [streaks, setStreaks] = useState<Record<string, number>>({})
  const [mutualIds, setMutualIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [sportFilter, setSportFilter] = useState('')
  const [wavesSent, setWavesSent] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<TabKey>('here')
  const slide = useRef(new Animated.Value(0)).current

  function switchTab(next: TabKey) {
    if (next === tab) return
    setTab(next)
    Animated.timing(slide, {
      toValue: next === 'here' ? 0 : 1,
      duration: 260,
      useNativeDriver: true,
    }).start()
  }

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      if (DEV_MODE) {
        const me = await getDevProfile()
        setUserProfile(me)
        setProfiles(MOCK_OTHER_PROFILES)
        setSessions(mockDiscoverSessions)
        setStreaks(MOCK_DISCOVER_STREAKS)
        setMutualIds(MOCK_MUTUAL_MATCH_IDS)
      } else {
        const { data: { user } } = await supabase.auth.getUser()

        // Current user's profile (for gym / sport / schedule matching).
        const { data: me } = user
          ? await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', user.id)
              .maybeSingle()
          : { data: null as Profile | null }

        setUserProfile(me ?? null)

        const [{ data: profs }, { data: sess }] = await Promise.all([
          supabase.from('profiles').select('*').order('created_at', { ascending: false }),
          supabase
            .from('gym_sessions')
            .select('profile_id, checked_in_at')
            .gte('checked_in_at', new Date(Date.now() - 86400000).toISOString()),
        ])

        setProfiles((profs ?? []).filter(p => p.user_id !== user?.id))
        setSessions(sess ?? [])
        // Streaks + mutual matches are computed server-side elsewhere; leave empty
        // here for now so the list still renders.
        setStreaks({})
        setMutualIds(new Set())
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

  async function sendWave(profile: Profile) {
    if (wavesSent.has(profile.id)) return
    try {
      if (DEV_MODE) {
        setWavesSent(prev => new Set([...prev, profile.id]))
        return
      }
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

  // ──────────────────────────────────────────────
  // Derived: today's sessions, Here Now list, etc.
  // ──────────────────────────────────────────────

  const userCheckedInToday = useMemo(() => {
    if (!userProfile) return false
    return sessions.some(
      s => s.profile_id === userProfile.id && isToday(s.checked_in_at)
    )
  }, [sessions, userProfile])

  const checkinAt = useMemo(() => {
    // Latest check-in-today time per profile.
    const m = new Map<string, string>()
    for (const s of sessions) {
      if (!isToday(s.checked_in_at)) continue
      const prev = m.get(s.profile_id)
      if (!prev || new Date(s.checked_in_at) > new Date(prev)) {
        m.set(s.profile_id, s.checked_in_at)
      }
    }
    return m
  }, [sessions])

  const userGym = userProfile?.gym_name ?? null

  const hereNow = useMemo(() => {
    return profiles
      .filter(p => checkinAt.has(p.id))
      .sort((a, b) => {
        // Same gym as current user floats to top
        const aGym = userGym && a.gym_name === userGym ? 1 : 0
        const bGym = userGym && b.gym_name === userGym ? 1 : 0
        if (bGym !== aGym) return bGym - aGym
        return new Date(checkinAt.get(b.id)!).getTime() - new Date(checkinAt.get(a.id)!).getTime()
      })
  }, [profiles, userGym, checkinAt])

  const filteredEveryone = useMemo(() => {
    return profiles.filter(p => {
      if (sportFilter && p.sport !== sportFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!p.display_name.toLowerCase().includes(q) &&
          !(p.gym_name ?? '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [profiles, sportFilter, search])

  // Suggested = matches on sport / schedule / gym, ranked.
  const suggested = useMemo(() => {
    if (!userProfile) return []
    const mySched = userProfile.schedule
    const myDayKeys = mySched
      ? (Object.keys(mySched) as (keyof Schedule)[]).filter(
          k => ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(k) && mySched[k]
        )
      : []

    const scored = profiles
      .filter(p => !search && !sportFilter)
      .map(p => {
        let score = 0
        if (p.sport && p.sport === userProfile.sport) score += 3
        if (p.gym_name && p.gym_name === userProfile.gym_name) score += 2
        if (p.schedule && myDayKeys.some(k => p.schedule![k])) score += 1
        return { p, score }
      })
      .filter(x => x.score >= 3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(x => x.p)

    return scored
  }, [profiles, userProfile, search, sportFilter])

  const translateX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -width],
  })
  const underlineX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  })

  // ──────────────────────────────────────────────
  // Render.
  // ──────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Who's Here</Text>
        <Text style={styles.subtitle}>
          {hereNow.length} athletes at your gym today
        </Text>
        {userGym && <Text style={styles.gymText}>{userGym}</Text>}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          onPress={() => switchTab('here')}
          activeOpacity={0.7}
          style={styles.tabBtn}
        >
          <Text style={[styles.tabLabel, tab === 'here' && styles.tabLabelActive]}>
            🔥 Here Now
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => switchTab('everyone')}
          activeOpacity={0.7}
          style={styles.tabBtn}
        >
          <Text style={[styles.tabLabel, tab === 'everyone' && styles.tabLabelActive]}>
            🌍 Everyone
          </Text>
        </TouchableOpacity>

        {/* Moving underline */}
        <Animated.View
          style={[
            styles.tabUnderline,
            {
              width: width / 2 - spacing.xl * 2,
              transform: [
                {
                  translateX: underlineX.interpolate({
                    inputRange: [0, 1],
                    outputRange: [spacing.xl, width / 2 + spacing.xl],
                  }),
                },
              ],
            },
          ]}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <View style={styles.pageWrap}>
          <Animated.View
            style={{
              flexDirection: 'row',
              width: width * 2,
              flex: 1,
              transform: [{ translateX }],
            }}
          >
            {/* HERE NOW */}
            <View style={{ width }}>
              {hereNow.length === 0 ? (
                <ScrollView
                  contentContainerStyle={styles.emptyWrap}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={() => loadData(true)}
                      tintColor={colors.primary}
                    />
                  }
                >
                  <Text style={styles.emptyEmoji}>🏋️</Text>
                  <Text style={styles.emptyTitle}>
                    {userCheckedInToday
                      ? 'You\'re here! No one else has checked in yet'
                      : 'Nobody has checked in yet today'}
                  </Text>
                  <Text style={styles.emptySub}>
                    {userCheckedInToday ? 'Check back soon' : 'Be the first one today'}
                  </Text>
                  {!userCheckedInToday && (
                    <View style={{ alignSelf: 'stretch', paddingHorizontal: 40 }}>
                      <GradientButton
                        label="Check In Now"
                        onPress={() => router.push('/(tabs)/checkin')}
                      />
                    </View>
                  )}
                </ScrollView>
              ) : (
                <ScrollView
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={() => loadData(true)}
                      tintColor={colors.primary}
                    />
                  }
                >
                  {hereNow.map(p => (
                    <HereRow
                      key={p.id}
                      profile={p}
                      checkedInAt={checkinAt.get(p.id)!}
                      waved={wavesSent.has(p.id)}
                      mutual={mutualIds.has(p.id)}
                      onWave={() => sendWave(p)}
                    />
                  ))}
                </ScrollView>
              )}
            </View>

            {/* EVERYONE */}
            <View style={{ width }}>
              <ScrollView
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => loadData(true)}
                    tintColor={colors.primary}
                  />
                }
              >
                {/* Search */}
                <View style={styles.searchContainer}>
                  <Text style={styles.searchIcon}>🔍</Text>
                  <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search by name or gym…"
                    placeholderTextColor="#555"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Sport filter */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterRow}
                >
                  <TouchableOpacity
                    style={[styles.filterPill, !sportFilter && styles.filterPillActive]}
                    onPress={() => setSportFilter('')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterText, !sportFilter && styles.filterTextActive]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  {SPORTS.map(s => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.filterPill, sportFilter === s.id && styles.filterPillActive]}
                      onPress={() => setSportFilter(sportFilter === s.id ? '' : s.id)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[styles.filterText, sportFilter === s.id && styles.filterTextActive]}
                      >
                        {s.emoji} {s.id}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Suggested for you */}
                {suggested.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>🎯 Suggested For You</Text>
                    {suggested.map(p => (
                      <EveryoneRow
                        key={`sugg-${p.id}`}
                        profile={p}
                        streak={streaks[p.id] ?? 0}
                        waved={wavesSent.has(p.id)}
                        mutual={mutualIds.has(p.id)}
                        onWave={() => sendWave(p)}
                      />
                    ))}
                    <View style={{ height: spacing.md }} />
                  </>
                )}

                {/* All athletes */}
                <Text style={styles.sectionTitle}>
                  {filteredEveryone.length} athlete{filteredEveryone.length === 1 ? '' : 's'}
                </Text>
                {filteredEveryone.length === 0 ? (
                  <Text style={styles.emptyText}>
                    No athletes match. Try a different filter.
                  </Text>
                ) : (
                  filteredEveryone.map(p => (
                    <EveryoneRow
                      key={p.id}
                      profile={p}
                      streak={streaks[p.id] ?? 0}
                      waved={wavesSent.has(p.id)}
                      mutual={mutualIds.has(p.id)}
                      onWave={() => sendWave(p)}
                    />
                  ))
                )}

              </ScrollView>
            </View>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 32,
    lineHeight: lineHeightFor(32),
    fontFamily: F.extraBold,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: lineHeightFor(15),
    fontFamily: F.bold,
    color: colors.primary,
    marginTop: 4,
  },
  gymText: {
    fontSize: 12,
    lineHeight: lineHeightFor(12),
    fontFamily: F.regular,
    color: colors.muted,
    marginTop: 2,
    letterSpacing: 0.2,
  },

  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    marginTop: 6,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    position: 'relative',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 14,
    lineHeight: lineHeightFor(14),
    fontFamily: F.bold,
    color: colors.muted,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: colors.text,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },

  loadingContainer: { paddingTop: 60, alignItems: 'center' },
  pageWrap: { flex: 1, overflow: 'hidden' },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
  },

  // HERE NOW rows — live activity feed.
  hereRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  hereAvatarWrap: {
    position: 'relative',
    width: 48,
    height: 48,
  },
  hereLiveDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    position: 'absolute',
    bottom: 0,
    right: 0,
    zIndex: 2,
    borderWidth: 2,
    borderColor: colors.background,
  },
  hereMid: { flex: 1, minWidth: 0, gap: 2 },
  hereTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  hereName: {
    fontSize: 15,
    lineHeight: lineHeightFor(15),
    fontFamily: F.extraBold,
    fontWeight: '800',
    color: colors.text,
    flexShrink: 1,
  },
  hereTime: {
    fontSize: 12,
    lineHeight: lineHeightFor(12),
    fontFamily: F.regular,
    color: colors.primary,
    flexShrink: 0,
  },
  hereSport: {
    fontSize: 13,
    lineHeight: lineHeightFor(13),
    fontFamily: F.regular,
    color: colors.muted,
  },

  // Vibe pills (small).
  vibePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  vibePill: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  vibePillText: {
    fontSize: 10,
    lineHeight: lineHeightFor(10),
    fontFamily: F.semiBold,
  },

  /** Profile-style Wave CTA (matches `u/[slug].tsx`). */
  discoverWaveTouch: { borderRadius: radius.md, overflow: 'hidden' },
  discoverWaveGradient: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoverWaveText: {
    color: '#fff',
    fontSize: 13,
    lineHeight: lineHeightFor(13),
    fontFamily: F.semiBold,
    fontWeight: '600',
  },
  discoverWavedCompact: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.md,
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.35)',
  },
  discoverWavedCompactText: {
    fontSize: 13,
    lineHeight: lineHeightFor(13),
    fontFamily: F.semiBold,
    color: '#34d399',
  },

  // EVERYONE rows.
  everyoneRowWrap: {
    position: 'relative',
    backgroundColor: colors.background,
  },
  swipeHint: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(52,211,153,0.12)',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  swipeHintText: {
    fontSize: 14,
    lineHeight: lineHeightFor(14),
    fontFamily: F.bold,
    color: '#34d399',
  },
  everyoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
    backgroundColor: colors.background,
  },
  everyoneMid: { flex: 1, gap: 2 },
  everyoneNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  everyoneMutual: { fontSize: 13, lineHeight: 16, color: colors.primary },
  everyoneName: {
    fontSize: 15,
    lineHeight: lineHeightFor(15),
    fontFamily: F.extraBold,
    fontWeight: '800',
    color: colors.text,
    flexShrink: 1,
  },
  everyoneGym: {
    fontSize: 12,
    lineHeight: lineHeightFor(12),
    fontFamily: F.regular,
    color: colors.muted,
  },
  everyoneRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  sportPill: {
    backgroundColor: 'rgba(255,87,34,0.12)',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,87,34,0.3)',
  },
  sportPillText: {
    fontSize: 10,
    lineHeight: lineHeightFor(10),
    color: colors.primary,
    fontFamily: F.semiBold,
  },
  streakLittle: {
    fontSize: 11,
    lineHeight: lineHeightFor(11),
    fontFamily: F.bold,
    color: colors.primary,
  },
  wavedInline: {
    fontSize: 10,
    lineHeight: lineHeightFor(10),
    fontFamily: F.bold,
    color: '#34d399',
  },

  // Everyone: search + filter + sections.
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    height: 46,
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  searchIcon: { fontSize: 15, lineHeight: lineHeightFor(15) },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: lineHeightFor(15),
  },
  filterRow: {
    gap: 8,
    paddingRight: spacing.xl,
    paddingVertical: 2,
    marginBottom: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: 'rgba(255,87,34,0.15)',
    borderColor: colors.primary,
  },
  filterText: { fontSize: 12, lineHeight: lineHeightFor(12), fontFamily: F.semiBold, color: colors.muted },
  filterTextActive: { color: colors.primary },

  sectionTitle: {
    fontSize: 14,
    lineHeight: lineHeightFor(14),
    fontFamily: F.extraBold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: 6,
    letterSpacing: -0.2,
  },

  emptyWrap: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyEmoji: { fontSize: 64, lineHeight: 76 },
  emptyTitle: {
    fontSize: 18,
    lineHeight: lineHeightFor(18),
    fontFamily: F.extraBold,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  emptySub: {
    fontSize: 14,
    lineHeight: lineHeightFor(14),
    fontFamily: F.regular,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyText: {
    color: colors.muted,
    textAlign: 'center',
    paddingTop: 24,
    fontSize: 14,
    lineHeight: lineHeightFor(14),
  },
})

