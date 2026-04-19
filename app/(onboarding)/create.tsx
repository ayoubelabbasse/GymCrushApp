import { useEffect, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../lib/supabase'
import GradientButton from '../../components/GradientButton'
import PillTag from '../../components/PillTag'
import {
  SPORTS, WORKOUT_STYLES, GOALS, VIBE_TAGS, TRAINING_EXPERIENCE,
} from '../../constants/data'
import { colors, spacing, radius, vibeTagColors, F, lineHeightFor } from '../../constants/theme'
import { DEV_MODE } from '../../lib/devMode'
import { getDevProfile, saveDevProfile } from '../../lib/devMockProfile'
import type { Profile } from '../../lib/types'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
type Day = typeof DAYS[number]

interface Schedule {
  mon: boolean; tue: boolean; wed: boolean; thu: boolean
  fri: boolean; sat: boolean; sun: boolean; am: boolean; pm: boolean
}

const GENDERS = ['Man', 'Woman', 'Prefer not to say']

function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>
}

function StyledInput({
  value, onChangeText, placeholder, keyboardType, multiline, maxLength,
}: {
  value: string
  onChangeText: (t: string) => void
  placeholder: string
  keyboardType?: 'default' | 'numeric' | 'email-address'
  multiline?: boolean
  maxLength?: number
}) {
  const [focused, setFocused] = useState(false)
  return (
    <TextInput
      style={[styles.input, multiline && styles.inputMulti, focused && styles.inputFocused]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#555"
      keyboardType={keyboardType ?? 'default'}
      multiline={multiline}
      maxLength={maxLength}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      autoCorrect={false}
      autoCapitalize={multiline ? 'sentences' : 'words'}
    />
  )
}

export default function CreateProfileScreen() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [bioLoading, setBioLoading] = useState(false)
  // Edit mode: set when there's already a profile on this account.
  // Controls whether submit is an UPSERT-update vs an INSERT, and the CTA copy.
  const [existingProfileId, setExistingProfileId] = useState<string | null>(null)
  const [existingSlug, setExistingSlug] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoLocalUri, setPhotoLocalUri] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)

  // Step 1
  const [displayName, setDisplayName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [gymName, setGymName] = useState('')
  const [experience, setExperience] = useState('')

  // Step 2
  const [sport, setSport] = useState('')
  const [sportQuery, setSportQuery] = useState('')
  const [workoutStyle, setWorkoutStyle] = useState('')
  const [goal, setGoal] = useState('')
  const [schedule, setSchedule] = useState<Schedule>({
    mon: false, tue: false, wed: false, thu: false,
    fri: false, sat: false, sun: false, am: false, pm: false,
  })

  // Step 3
  const [bio, setBio] = useState('')
  const [vibeTags, setVibeTags] = useState<string[]>([])
  const [instagram, setInstagram] = useState('')

  useEffect(() => { hydrateExistingProfile() }, [])

  async function hydrateExistingProfile() {
    try {
      if (DEV_MODE) {
        const p = await getDevProfile()
        setExistingProfileId(p.id)
        setExistingSlug(p.slug)
        setDisplayName(p.display_name ?? '')
        setAge(p.age != null ? String(p.age) : '')
        setGender(p.gender ?? '')
        setGymName(p.gym_name ?? '')
        setExperience(p.training_experience ?? '')
        setSport(p.sport ?? '')
        setWorkoutStyle(p.workout_style ?? '')
        setGoal(p.goal ?? '')
        if (p.schedule) setSchedule(p.schedule)
        setBio(p.bio ?? '')
        setVibeTags(p.vibe_tags ?? [])
        setInstagram(p.instagram ?? '')
        setPhotoUrl(p.photo_url ?? null)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase
        .from('profiles').select('*').eq('user_id', user.id).maybeSingle()
      if (!p) return
      setExistingProfileId(p.id)
      setExistingSlug(p.slug)
      setDisplayName(p.display_name ?? '')
      setAge(p.age != null ? String(p.age) : '')
      setGender(p.gender ?? '')
      setGymName(p.gym_name ?? '')
      setExperience(p.training_experience ?? '')
      setSport(p.sport ?? '')
      setWorkoutStyle(p.workout_style ?? '')
      setGoal(p.goal ?? '')
      if (p.schedule) setSchedule(p.schedule)
      setBio(p.bio ?? '')
      setVibeTags(p.vibe_tags ?? [])
      setInstagram(p.instagram ?? '')
      setPhotoUrl(p.photo_url ?? null)
    } catch {
      // If hydration fails we just stay in "create" mode — not fatal.
    }
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to upload a profile picture.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    })
    if (result.canceled || !result.assets?.[0]) return
    const uri = result.assets[0].uri
    setPhotoLocalUri(uri)
    if (DEV_MODE) {
      // Preview only — no upload in dev.
      setPhotoUrl(uri)
    }
  }

  async function uploadPhotoIfNeeded(userId: string): Promise<string | null> {
    if (!photoLocalUri) return photoUrl
    setPhotoUploading(true)
    try {
      const res = await fetch(photoLocalUri)
      const blob = await res.blob()
      const ext = (photoLocalUri.split('.').pop() ?? 'jpg').toLowerCase()
      const path = `${userId}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`, upsert: true })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      return data.publicUrl
    } finally {
      setPhotoUploading(false)
    }
  }

  function toggleDay(day: Day) {
    setSchedule(s => ({ ...s, [day]: !s[day] }))
  }

  function toggleVibe(tag: string) {
    setVibeTags(prev => {
      if (prev.includes(tag)) return prev.filter(t => t !== tag)
      if (prev.length >= 4) return prev
      return [...prev, tag]
    })
  }

  async function generateBio() {
    setBioLoading(true)
    try {
      const res = await fetch('https://gymcrush-one.vercel.app/api/generate-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: displayName,
          gym: gymName,
          sport,
          goal,
          experience,
          vibes: vibeTags,
        }),
      })
      const data = await res.json()
      if (data.bio) setBio(data.bio)
      else throw new Error('No bio returned')
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not generate bio')
    }
    setBioLoading(false)
  }

  async function handleSubmit() {
    if (!displayName.trim()) {
      Alert.alert('Required', 'Enter your display name')
      return
    }
    setLoading(true)
    try {
      if (DEV_MODE) {
        const base = await getDevProfile()
        const next: Profile = {
          ...base,
          display_name: displayName.trim(),
          age: age ? parseInt(age, 10) : null,
          gender: gender || null,
          gym_name: gymName.trim() || null,
          training_experience: experience || null,
          sport: sport || null,
          workout_style: workoutStyle || null,
          goal: goal || null,
          schedule,
          bio: bio.trim() || null,
          vibe_tags: vibeTags.length > 0 ? vibeTags : null,
          instagram: instagram.replace('@', '').trim() || null,
          photo_url: photoLocalUri ?? photoUrl,
        }
        await saveDevProfile(next)
        router.replace('/(tabs)')
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const uploadedPhotoUrl = await uploadPhotoIfNeeded(user.id)

      const payload = {
        display_name: displayName.trim(),
        age: age ? parseInt(age, 10) : null,
        gender: gender || null,
        gym_name: gymName.trim() || null,
        training_experience: experience || null,
        sport: sport || null,
        workout_style: workoutStyle || null,
        goal: goal || null,
        schedule,
        bio: bio.trim() || null,
        vibe_tags: vibeTags.length > 0 ? vibeTags : null,
        instagram: instagram.replace('@', '').trim() || null,
        photo_url: uploadedPhotoUrl,
      }

      // Resolve row by `user_id` so we never insert a duplicate if hydration lagged.
      const { data: existingRow, error: selErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (selErr) throw selErr

      if (existingRow?.id) {
        const { error } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', existingRow.id)
          .select('id')
          .single()
        if (error) throw error
      } else {
        const slug =
          displayName.toLowerCase().replace(/[^a-z0-9]/g, '') +
          Math.random().toString(36).slice(2, 6)
        const { error } = await supabase.from('profiles').insert({
          ...payload,
          user_id: user.id,
          slug,
          is_pro: false,
          wave_count: 0,
          email: user.email,
        })
        if (error) throw error
      }

      router.replace('/(tabs)')
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save profile')
    }
    setLoading(false)
  }

  function advance() {
    if (step === 1 && !displayName.trim()) {
      Alert.alert('Required', 'Enter your display name to continue')
      return
    }
    if (step === 2 && !sport) {
      Alert.alert('Required', 'Select your main sport to continue')
      return
    }
    setStep(s => s + 1)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/')
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressRow}>
        {step > 1 ? (
          <TouchableOpacity onPress={() => setStep(s => s - 1)} activeOpacity={0.7} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleSignOut} activeOpacity={0.7} style={styles.backBtn}>
            <Text style={styles.backText}>Sign out</Text>
          </TouchableOpacity>
        )}
        <View style={styles.progressBar}>
          {[1, 2, 3].map(i => (
            <View key={i} style={[styles.progressSegment, i <= step && styles.progressActive]} />
          ))}
        </View>
        <Text style={styles.stepText}>{step} / 3</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && (
            <>
              <Text style={styles.stepTitle}>
                {existingProfileId ? 'Edit your profile' : 'Tell us about you'}
              </Text>
              <Text style={styles.stepSub}>
                {existingProfileId
                  ? 'Update anything you want'
                  : "Let's set up your athlete profile"}
              </Text>

              <SectionLabel text="Profile Photo" />
              <View style={styles.photoRow}>
                <TouchableOpacity
                  onPress={pickPhoto}
                  activeOpacity={0.8}
                  style={styles.photoPickWrap}
                >
                  {photoUrl ? (
                    <Image source={{ uri: photoUrl }} style={styles.photoImg} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Text style={styles.photoPlaceholderEmoji}>📷</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <TouchableOpacity
                    onPress={pickPhoto}
                    activeOpacity={0.7}
                    style={styles.photoBtn}
                    disabled={photoUploading}
                  >
                    <Text style={styles.photoBtnText}>
                      {photoUploading
                        ? 'Uploading…'
                        : photoUrl
                          ? 'Change photo'
                          : 'Upload photo'}
                    </Text>
                  </TouchableOpacity>
                  {photoUrl && !photoUploading && (
                    <TouchableOpacity
                      onPress={() => { setPhotoUrl(null); setPhotoLocalUri(null) }}
                      activeOpacity={0.7}
                      style={styles.photoRemoveBtn}
                    >
                      <Text style={styles.photoRemoveText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <SectionLabel text="Display Name *" />
              <StyledInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="e.g. Alex Johnson"
              />

              <SectionLabel text="Age" />
              <StyledInput
                value={age}
                onChangeText={setAge}
                placeholder="Your age"
                keyboardType="numeric"
              />

              <SectionLabel text="Gender" />
              <View style={styles.pillRow}>
                {GENDERS.map(g => (
                  <PillTag
                    key={g}
                    label={g}
                    active={gender === g}
                    onPress={() => setGender(g === gender ? '' : g)}
                  />
                ))}
              </View>

              <SectionLabel text="Gym" />
              <StyledInput
                value={gymName}
                onChangeText={setGymName}
                placeholder="e.g. CRWC Iowa City"
              />

              <SectionLabel text="Training Experience" />
              <View style={styles.pillGrid}>
                {TRAINING_EXPERIENCE.map(e => (
                  <TouchableOpacity
                    key={e.label}
                    style={[styles.expCard, experience === e.label && styles.expCardActive]}
                    onPress={() => setExperience(experience === e.label ? '' : e.label)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.expEmoji}>{e.emoji}</Text>
                    <Text style={[styles.expLabel, experience === e.label && styles.expLabelActive]}>
                      {e.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.stepTitle}>How do you train?</Text>
              <Text style={styles.stepSub}>Tell us your sport and style</Text>

              <SectionLabel text="Main Sport *" />

              <View style={styles.sportSearchWrap}>
                <Text style={styles.sportSearchIcon}>🔍</Text>
                <TextInput
                  style={styles.sportSearchInput}
                  value={sportQuery}
                  onChangeText={setSportQuery}
                  placeholder="Search sport..."
                  placeholderTextColor="#555"
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                {sportQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSportQuery('')} hitSlop={8}>
                    <Text style={styles.sportSearchClear}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {(() => {
                const q = sportQuery.trim().toLowerCase()
                const filter = (tier: 1 | 2 | 3) =>
                  SPORTS.filter(s =>
                    s.tier === tier &&
                    (!q || s.id.toLowerCase().includes(q))
                  )
                const t1 = filter(1)
                const t2 = filter(2)
                const t3 = filter(3)

                const Grid = ({ items }: { items: typeof SPORTS }) => (
                  <View style={styles.sportGrid}>
                    {items.map(s => {
                      const active = sport === s.id
                      return (
                        <TouchableOpacity
                          key={s.id}
                          style={[styles.sportChip, active && styles.sportChipActive]}
                          onPress={() => setSport(active ? '' : s.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.sportChipEmoji}>{s.emoji}</Text>
                          <Text style={[styles.sportChipLabel, active && styles.sportChipLabelActive]}>
                            {s.id}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                )

                if (q && t1.length + t2.length + t3.length === 0) {
                  return <Text style={styles.sportEmpty}>No sports match “{sportQuery}”.</Text>
                }

                return (
                  <>
                    {t1.length > 0 && (
                      <>
                        <Text style={styles.sportTierLabel}>Popular</Text>
                        <Grid items={t1} />
                      </>
                    )}
                    {t2.length > 0 && (
                      <>
                        <Text style={styles.sportTierLabel}>Team sports</Text>
                        <Grid items={t2} />
                      </>
                    )}
                    {t3.length > 0 && (
                      <>
                        <Text style={styles.sportTierLabel}>More</Text>
                        <Grid items={t3} />
                      </>
                    )}
                  </>
                )
              })()}

              <SectionLabel text="Workout Style" />
              <View style={styles.pillWrap}>
                {WORKOUT_STYLES.map(w => (
                  <PillTag
                    key={w}
                    label={w}
                    active={workoutStyle === w}
                    onPress={() => setWorkoutStyle(workoutStyle === w ? '' : w)}
                  />
                ))}
              </View>

              <SectionLabel text="Goal" />
              <View style={styles.pillWrap}>
                {GOALS.map(g => (
                  <PillTag
                    key={g}
                    label={g}
                    active={goal === g}
                    onPress={() => setGoal(goal === g ? '' : g)}
                  />
                ))}
              </View>

              <SectionLabel text="Training Days" />
              <View style={styles.daysRow}>
                {DAYS.map((d, i) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dayBtn, schedule[d] && styles.dayBtnActive]}
                    onPress={() => toggleDay(d)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayText, schedule[d] && styles.dayTextActive]}>
                      {DAY_LABELS[i]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <SectionLabel text="Preferred Time" />
              <View style={styles.pillRow}>
                {[
                  { label: '🌅 Morning', key: 'am' },
                  { label: '🌙 Evening', key: 'pm' },
                ].map(({ label, key }) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.timeBtn, schedule[key as 'am' | 'pm'] && styles.timeBtnActive]}
                    onPress={() =>
                      setSchedule(s => ({
                        ...s,
                        am: key === 'am' ? !s.am : s.am,
                        pm: key === 'pm' ? !s.pm : s.pm,
                      }))
                    }
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.timeText, schedule[key as 'am' | 'pm'] && styles.timeTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.stepTitle}>Final touches</Text>
              <Text style={styles.stepSub}>Almost there — make it yours</Text>

              <View style={styles.bioHeader}>
                <SectionLabel text="Bio" />
                <TouchableOpacity
                  style={styles.aiBtn}
                  onPress={generateBio}
                  disabled={bioLoading}
                  activeOpacity={0.7}
                >
                  {bioLoading
                    ? <ActivityIndicator size="small" color={colors.primary} />
                    : <Text style={styles.aiBtnText}>✨ AI Generate</Text>
                  }
                </TouchableOpacity>
              </View>
              <StyledInput
                value={bio}
                onChangeText={setBio}
                placeholder="Tell athletes who you are..."
                multiline
                maxLength={160}
              />
              <Text style={styles.charCount}>{bio.length}/160</Text>

              <SectionLabel text="Gym Vibe (pick up to 4)" />
              <View style={styles.pillWrap}>
                {VIBE_TAGS.map((tag, i) => {
                  const colorSet = vibeTagColors[i % vibeTagColors.length]
                  const active = vibeTags.includes(tag)
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.vibePill,
                        active
                          ? { backgroundColor: colorSet.bg, borderColor: colorSet.border }
                          : { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                      onPress={() => toggleVibe(tag)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.vibeText, { color: active ? colorSet.text : colors.muted }]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <SectionLabel text="Instagram (optional)" />
              <StyledInput
                value={instagram}
                onChangeText={setInstagram}
                placeholder="@yourhandle"
              />

              <View style={{ height: spacing.xl }} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.ctaContainer}>
        {step < 3 ? (
          <GradientButton label="Next →" onPress={advance} />
        ) : (
          <GradientButton
            label={existingProfileId ? 'Save changes ✓' : 'Create My Profile 🚀'}
            onPress={handleSubmit}
            loading={loading}
          />
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  backBtn: {
    width: 64,
  },
  backText: {
    color: colors.primary,
    fontSize: 14,
    lineHeight: lineHeightFor(14),
    fontFamily: F.semiBold,
  },
  progressBar: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface2,
  },
  progressActive: {
    backgroundColor: colors.primary,
  },
  stepText: {
    width: 36,
    color: colors.muted,
    fontSize: 13,
    lineHeight: lineHeightFor(13),
    fontFamily: F.semiBold,
    textAlign: 'right',
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 24,
  },
  stepTitle: {
    fontSize: 28,
    lineHeight: lineHeightFor(28),
    fontFamily: F.extraBold,
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 6,
    marginTop: 8,
  },
  stepSub: {
    fontSize: 15,
    lineHeight: lineHeightFor(15),
    fontFamily: F.regular,
    color: colors.muted,
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: 13,
    lineHeight: lineHeightFor(13),
    fontFamily: F.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    height: 52,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 16,
    lineHeight: lineHeightFor(16),
    fontFamily: F.regular,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  inputMulti: {
    height: 100,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  expCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  expCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255,87,34,0.1)',
  },
  expEmoji: { fontSize: 24, lineHeight: lineHeightFor(24) },
  expLabel: {
    fontSize: 13,
    lineHeight: lineHeightFor(13),
    fontFamily: F.semiBold,
    color: colors.muted,
    textAlign: 'center',
  },
  expLabelActive: { color: colors.primary },
  daysRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  dayBtnActive: {
    backgroundColor: 'rgba(255,87,34,0.15)',
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: 11,
    lineHeight: lineHeightFor(11),
    fontFamily: F.bold,
    color: colors.muted,
  },
  dayTextActive: { color: colors.primary },
  timeBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  timeBtnActive: {
    backgroundColor: 'rgba(255,87,34,0.15)',
    borderColor: colors.primary,
  },
  timeText: {
    fontSize: 14,
    lineHeight: lineHeightFor(14),
    fontFamily: F.bold,
    color: colors.muted,
  },
  timeTextActive: { color: colors.primary },
  bioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  aiBtn: {
    backgroundColor: 'rgba(255,87,34,0.12)',
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,87,34,0.3)',
    minWidth: 90,
    alignItems: 'center',
  },
  aiBtnText: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: lineHeightFor(12),
    fontFamily: F.bold,
  },
  charCount: {
    fontSize: 12,
    lineHeight: lineHeightFor(12),
    color: colors.muted,
    textAlign: 'right',
    marginTop: 4,
  },
  vibePill: {
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1.5,
  },
  sportSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    height: 44,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sportSearchIcon: {
    fontSize: 14,
    lineHeight: lineHeightFor(14),
  },
  sportSearchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: lineHeightFor(14),
    fontFamily: F.regular,
    padding: 0,
  },
  sportSearchClear: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: lineHeightFor(14),
    fontFamily: F.bold,
    paddingHorizontal: 4,
  },
  sportTierLabel: {
    fontSize: 11,
    lineHeight: lineHeightFor(11),
    fontFamily: F.bold,
    color: colors.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  sportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.sm,
  },
  sportChip: {
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
  sportChipActive: {
    backgroundColor: 'rgba(255,87,34,0.15)',
    borderColor: colors.primary,
  },
  sportChipEmoji: {
    fontSize: 15,
    lineHeight: lineHeightFor(15),
  },
  sportChipLabel: {
    fontSize: 13,
    lineHeight: lineHeightFor(13),
    fontFamily: F.semiBold,
    color: colors.muted,
  },
  sportChipLabelActive: {
    color: colors.primary,
  },
  sportEmpty: {
    fontSize: 13,
    lineHeight: lineHeightFor(13),
    fontFamily: F.regular,
    color: colors.muted,
    paddingVertical: spacing.md,
    textAlign: 'center',
  },
  vibeText: {
    fontSize: 12,
    lineHeight: lineHeightFor(12),
    fontFamily: F.semiBold,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  photoPickWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoImg: { width: '100%', height: '100%' },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  photoPlaceholderEmoji: { fontSize: 28, lineHeight: 32 },
  photoBtn: {
    backgroundColor: 'rgba(255,87,34,0.12)',
    borderColor: 'rgba(255,87,34,0.4)',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  photoBtnText: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: lineHeightFor(13),
    fontFamily: F.bold,
  },
  photoRemoveBtn: {
    marginTop: 6,
    alignItems: 'center',
    paddingVertical: 4,
  },
  photoRemoveText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: lineHeightFor(12),
    fontFamily: F.semiBold,
  },
  ctaContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
})
