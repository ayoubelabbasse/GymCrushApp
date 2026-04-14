import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import GradientButton from '../../components/GradientButton'
import PillTag from '../../components/PillTag'
import Card from '../../components/Card'
import {
  SPORTS, WORKOUT_STYLES, GOALS, VIBE_TAGS, TRAINING_EXPERIENCE,
} from '../../constants/data'
import { colors, spacing, radius, vibeTagColors, F } from '../../constants/theme'

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

  // Step 1
  const [displayName, setDisplayName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [gymName, setGymName] = useState('')
  const [experience, setExperience] = useState('')

  // Step 2
  const [sport, setSport] = useState('')
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const slug =
        displayName.toLowerCase().replace(/[^a-z0-9]/g, '') +
        Math.random().toString(36).slice(2, 6)

      const { error } = await supabase.from('profiles').insert({
        user_id: user.id,
        slug,
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
        is_pro: false,
        wave_count: 0,
        email: user.email,
      })

      if (error) throw error
      router.replace('/(tabs)')
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to create profile')
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressRow}>
        {step > 1 ? (
          <TouchableOpacity onPress={() => setStep(s => s - 1)} activeOpacity={0.7} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
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
              <Text style={styles.stepTitle}>Tell us about you</Text>
              <Text style={styles.stepSub}>Let's set up your athlete profile</Text>

              <SectionLabel text="Display Name *" />
              <StyledInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="How people see you"
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
              <View style={styles.pillWrap}>
                {SPORTS.map(s => (
                  <PillTag
                    key={s.id}
                    label={`${s.emoji} ${s.id}`}
                    active={sport === s.id}
                    onPress={() => setSport(sport === s.id ? '' : s.id)}
                  />
                ))}
              </View>

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
          <GradientButton label="Create My Profile 🚀" onPress={handleSubmit} loading={loading} />
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
    fontFamily: F.semiBold,
    textAlign: 'right',
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontFamily: F.extraBold,
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 6,
    marginTop: 8,
  },
  stepSub: {
    fontSize: 15,
    fontFamily: F.regular,
    color: colors.muted,
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: 13,
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
    backgroundColor: 'rgba(255,107,0,0.1)',
  },
  expEmoji: { fontSize: 24 },
  expLabel: {
    fontSize: 13,
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
    backgroundColor: 'rgba(255,107,0,0.15)',
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: 11,
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
    backgroundColor: 'rgba(255,107,0,0.15)',
    borderColor: colors.primary,
  },
  timeText: {
    fontSize: 14,
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
    backgroundColor: 'rgba(255,107,0,0.12)',
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.3)',
    minWidth: 90,
    alignItems: 'center',
  },
  aiBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontFamily: F.bold,
  },
  charCount: {
    fontSize: 12,
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
  vibeText: {
    fontSize: 12,
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
