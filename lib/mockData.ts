import type { Profile, GymSession, Wave } from './types'

/** Stable IDs for mock "current user" */
export const MOCK_USER_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
export const MOCK_PROFILE_ID = '11111111-2222-3333-4444-555555555555'

const createdAt = '2025-01-15T12:00:00.000Z'

export const MOCK_PROFILE: Profile = {
  id: MOCK_PROFILE_ID,
  user_id: MOCK_USER_ID,
  slug: 'ayoub-test',
  display_name: 'Jake Rivera',
  age: 26,
  gender: 'Man',
  gym_name: 'CRWC Iowa City',
  sport: 'Weightlifting',
  workout_style: 'Strength',
  goal: 'Bulk',
  schedule: {
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: false,
    sun: false,
    am: true,
    pm: false,
  },
  bio: '5:30 AM club member, chasing PRs not validation. Probably deadlifting right now.',
  photo_url: null,
  instagram: 'jakerivera',
  is_pro: true,
  wave_count: 47,
  vibe_tags: ['🌅 Morning warrior', '💪 Powerlifter energy'],
  current_goal_text: 'Hit 225lb bench by June',
  email: 'dev@example.com',
  training_experience: '5+ years',
  created_at: createdAt,
}

function isoDaysAgo(days: number, hour = 10) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

/** "X minutes ago" as an ISO string — handy for Here Now freshness states. */
function isoMinutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

/**
 * Realistic mock sessions over the last 90 days:
 * - A current 6-day streak
 * - Occasional double sessions (AM + PM on same day)
 * - Natural gaps (rest days, travel weeks)
 * - Tapered off further back (less frequent ~60–90 days ago)
 */
export function getMockGymSessions(profileId: string): GymSession[] {
  const sessions: GymSession[] = []
  const types = ['Weightlifting', 'Cardio', 'CrossFit', 'HIIT', 'Yoga']
  let id = 0

  const push = (daysAgo: number, hour: number, type?: string) => {
    sessions.push({
      id: `mock-sess-${id++}`,
      profile_id: profileId,
      checked_in_at: isoDaysAgo(daysAgo, hour),
      workout_type: type ?? types[id % types.length],
    })
  }

  // Current streak: days 0–5
  push(0, 7, 'Weightlifting')
  push(1, 7, 'Weightlifting')
  push(2, 6, 'Cardio')
  push(3, 8, 'CrossFit')
  push(4, 7, 'Weightlifting')
  push(5, 8, 'HIIT')

  // Week 2 (days 7–13): 4 days, one double
  push(7, 7, 'Weightlifting')
  push(7, 18, 'Cardio')   // double session
  push(9, 8, 'CrossFit')
  push(11, 7, 'Weightlifting')
  push(12, 9, 'HIIT')

  // Week 3 (days 14–20): 3 days
  push(14, 7, 'Weightlifting')
  push(16, 8, 'Cardio')
  push(18, 7, 'CrossFit')

  // Week 4 (days 21–27): 4 days, one double
  push(21, 7, 'Weightlifting')
  push(22, 7, 'Weightlifting')
  push(24, 18, 'Cardio')
  push(24, 7, 'HIIT')     // double session
  push(26, 8, 'CrossFit')

  // Days 28–41: sporadic (travel-style gap around days 33–36)
  push(28, 7, 'Weightlifting')
  push(29, 8, 'Cardio')
  push(31, 7, 'Weightlifting')
  push(38, 7, 'Weightlifting')
  push(40, 8, 'CrossFit')
  push(41, 9, 'HIIT')

  // Days 42–62: 3× per week average
  push(42, 7, 'Weightlifting')
  push(44, 8, 'Cardio')
  push(46, 7, 'CrossFit')
  push(49, 7, 'Weightlifting')
  push(51, 8, 'HIIT')
  push(53, 7, 'Weightlifting')
  push(56, 8, 'Cardio')
  push(58, 7, 'CrossFit')
  push(60, 9, 'Weightlifting')
  push(62, 7, 'Yoga')

  // Days 63–90: lighter — 2× per week
  push(63, 7, 'Weightlifting')
  push(66, 8, 'Cardio')
  push(70, 7, 'CrossFit')
  push(74, 8, 'Weightlifting')
  push(77, 7, 'HIIT')
  push(81, 9, 'Cardio')
  push(85, 7, 'Weightlifting')
  push(88, 8, 'CrossFit')

  return sessions.sort(
    (a, b) => new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime()
  )
}

export const mockGymSessions = getMockGymSessions(MOCK_PROFILE_ID)

export const mockWaves: Wave[] = [
  {
    id: 'mock-wave-1',
    profile_id: MOCK_PROFILE_ID,
    sent_at: isoDaysAgo(0, 14),
    viewer_fingerprint: 'fp1',
    message: null,
    sender_profile_id: null,
    is_mutual: false,
  },
  {
    id: 'mock-wave-2',
    profile_id: MOCK_PROFILE_ID,
    sent_at: isoDaysAgo(1, 11),
    viewer_fingerprint: 'fp2',
    message: null,
    sender_profile_id: null,
    is_mutual: false,
  },
  {
    id: 'mock-wave-3',
    profile_id: MOCK_PROFILE_ID,
    sent_at: isoDaysAgo(3, 16),
    viewer_fingerprint: 'fp3',
    message: null,
    sender_profile_id: null,
    is_mutual: false,
  },
]

export const mockProfileViewRows: { id: string }[] = Array.from(
  { length: 12 },
  (_, i) => ({ id: `mock-pv-${i}` })
)

export const MOCK_OTHER_USER_A = '22222222-3333-4444-5555-666666666666'
export const MOCK_OTHER_PROFILE_A_ID = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'

const baseSchedule = {
  mon: false, tue: false, wed: false, thu: false,
  fri: false, sat: false, sun: false, am: false, pm: false,
}

export const MOCK_OTHER_PROFILES: Profile[] = [
  {
    id: MOCK_OTHER_PROFILE_A_ID,
    user_id: MOCK_OTHER_USER_A,
    slug: 'jake-demo',
    display_name: 'Jake Rivera',
    age: 26,
    gender: 'Man',
    gym_name: 'CRWC Iowa City',
    sport: 'Weightlifting',
    workout_style: 'Hypertrophy',
    goal: 'Bulk',
    schedule: { ...baseSchedule, mon: true, wed: true, fri: true, am: true },
    bio: 'PRs every week. Chasing a 500 lb deadlift.',
    photo_url: null,
    instagram: 'jakerivera',
    is_pro: true,
    wave_count: 47,
    vibe_tags: ['🤝 Open to training partners', '🌅 Morning warrior'],
    current_goal_text: '500lb deadlift by summer',
    email: null,
    training_experience: '2-5 years',
    created_at: createdAt,
  },
  {
    id: 'cccccccc-dddd-eeee-ffff-000000000001',
    user_id: '33333333-4444-5555-6666-777777777777',
    slug: 'sam-demo',
    display_name: 'Sam Lee',
    age: 24,
    gender: 'Woman',
    gym_name: 'Planet Fitness',
    sport: 'Running',
    workout_style: 'Cardio',
    goal: 'Maintain',
    schedule: null,
    bio: 'Marathon training. Zone 2 queen.',
    photo_url: null,
    instagram: 'samlee',
    is_pro: false,
    wave_count: 8,
    vibe_tags: ['🎧 Headphones = busy'],
    current_goal_text: null,
    email: null,
    training_experience: '1-2 years',
    created_at: createdAt,
  },
  {
    id: 'cccccccc-dddd-eeee-ffff-000000000002',
    user_id: '44444444-5555-6666-7777-888888888888',
    slug: 'alex-demo',
    display_name: 'Alexandria Washington-Klein',
    age: 29,
    gender: 'Woman',
    gym_name: 'Equinox Midtown',
    sport: 'CrossFit',
    workout_style: 'Athletic',
    goal: 'Performance',
    schedule: { ...baseSchedule, mon: true, tue: true, wed: true, thu: true, sat: true, am: true },
    bio: 'CrossFit 6x/week. Coach by day, competitor on weekends.',
    photo_url: null,
    instagram: 'alexwk',
    is_pro: true,
    wave_count: 124,
    vibe_tags: ['🔥 Competitive', '🌙 Night owl'],
    current_goal_text: 'Regionals qualifier',
    email: null,
    training_experience: '5+ years',
    created_at: createdAt,
  },
  {
    id: 'cccccccc-dddd-eeee-ffff-000000000003',
    user_id: '55555555-6666-7777-8888-999999999999',
    slug: 'marco-demo',
    display_name: 'Marco',
    age: 22,
    gender: 'Man',
    gym_name: 'Gold\'s Gym Venice',
    sport: 'Boxing/MMA',
    workout_style: 'Athletic',
    goal: 'Cut',
    schedule: { ...baseSchedule, tue: true, thu: true, sat: true, pm: true },
    bio: null,
    photo_url: null,
    instagram: 'marco',
    is_pro: false,
    wave_count: 31,
    vibe_tags: ['🔥 Competitive', '🌙 Night owl'],
    current_goal_text: null,
    email: null,
    training_experience: '2-5 years',
    created_at: createdAt,
  },
  {
    id: 'cccccccc-dddd-eeee-ffff-000000000004',
    user_id: '66666666-7777-8888-9999-aaaaaaaaaaaa',
    slug: 'priya-demo',
    display_name: 'Priya Ramanathan',
    age: 31,
    gender: 'Woman',
    gym_name: 'YogaWorks',
    sport: 'Yoga',
    workout_style: 'Wellness',
    goal: 'Just for fun',
    schedule: { ...baseSchedule, mon: true, wed: true, fri: true, sun: true, am: true },
    bio: 'Ashtanga + climbing. Teaching flows on weekends.',
    photo_url: null,
    instagram: 'priyayoga',
    is_pro: true,
    wave_count: 62,
    vibe_tags: ['🧘 Low key vibes', '🔰 Beginner friendly'],
    current_goal_text: 'Handstand hold 60s',
    email: null,
    training_experience: '5+ years',
    created_at: createdAt,
  },
  {
    id: 'cccccccc-dddd-eeee-ffff-000000000005',
    user_id: '77777777-8888-9999-aaaa-bbbbbbbbbbbb',
    slug: 'devon-demo',
    display_name: 'Devon "Big D" Johnson',
    age: 34,
    gender: 'Man',
    gym_name: 'CRWC Iowa City',
    sport: 'Swimming',
    workout_style: 'Cardio',
    goal: 'Maintain',
    schedule: { ...baseSchedule, tue: true, thu: true, sat: true, am: true },
    bio: 'Masters swimmer. Ex-collegiate, still competing at 34.',
    photo_url: null,
    instagram: 'bigdswims',
    is_pro: false,
    wave_count: 19,
    vibe_tags: ['🌅 Morning warrior'],
    current_goal_text: null,
    email: null,
    training_experience: '5+ years',
    created_at: createdAt,
  },
  {
    id: 'cccccccc-dddd-eeee-ffff-000000000006',
    user_id: '88888888-9999-aaaa-bbbb-cccccccccccc',
    slug: 'nia-demo',
    display_name: 'Nia',
    age: 19,
    gender: 'Woman',
    gym_name: 'Rec Center',
    sport: 'Basketball',
    workout_style: 'Athletic',
    goal: 'Performance',
    schedule: { ...baseSchedule, mon: true, tue: true, wed: true, thu: true, fri: true, pm: true },
    bio: 'D1 hopeful. Hoop then lift.',
    photo_url: null,
    instagram: 'nia.hoops',
    is_pro: false,
    wave_count: 5,
    vibe_tags: ['🔥 Competitive'],
    current_goal_text: null,
    email: null,
    training_experience: '1-2 years',
    created_at: createdAt,
  },
  {
    id: 'cccccccc-dddd-eeee-ffff-000000000007',
    user_id: '99999999-aaaa-bbbb-cccc-dddddddddddd',
    slug: 'ben-demo',
    display_name: 'Ben Torres',
    age: 41,
    gender: 'Man',
    gym_name: 'Crunch Fitness',
    sport: 'Climbing',
    workout_style: 'Athletic',
    goal: 'Just for fun',
    schedule: { ...baseSchedule, sat: true, sun: true, am: true },
    bio: 'Weekend warrior — bouldering V6, working V7.',
    photo_url: null,
    instagram: null,
    is_pro: false,
    wave_count: 14,
    vibe_tags: ['🎯 Solo grinder'],
    current_goal_text: null,
    email: null,
    training_experience: '2-5 years',
    created_at: createdAt,
  },

  // ──────────────────────────────────────────────────────────────────
  // 4 athletes at CRWC Iowa City (same gym as MOCK_PROFILE) — active today.
  // These drive the "🔥 Here Now" tab.
  // ──────────────────────────────────────────────────────────────────
  {
    id: 'dddddddd-0000-0000-0000-000000000001',
    user_id: 'dddddddd-aaaa-0000-0000-000000000001',
    slug: 'maya-here',
    display_name: 'Maya Chen',
    age: 24,
    gender: 'Woman',
    gym_name: 'CRWC Iowa City',
    sport: 'Weightlifting',
    workout_style: 'Strength',
    goal: 'Performance',
    schedule: { ...baseSchedule, mon: true, tue: true, wed: true, thu: true, fri: true, am: true },
    bio: 'Powerlifting + matcha. 5 AM club, unapologetic.',
    photo_url: null,
    instagram: 'maya.lifts',
    is_pro: true,
    wave_count: 88,
    vibe_tags: ['🌅 Morning warrior', '💪 Powerlifter energy'],
    current_goal_text: '300lb squat by fall',
    email: null,
    training_experience: '2-5 years',
    created_at: createdAt,
  },
  {
    id: 'dddddddd-0000-0000-0000-000000000002',
    user_id: 'dddddddd-aaaa-0000-0000-000000000002',
    slug: 'tyrese-here',
    display_name: 'Tyrese Morgan',
    age: 28,
    gender: 'Man',
    gym_name: 'CRWC Iowa City',
    sport: 'CrossFit',
    workout_style: 'Athletic',
    goal: 'Performance',
    schedule: { ...baseSchedule, mon: true, wed: true, fri: true, sat: true, pm: true },
    bio: 'Ex-college football. CrossFit lifer. Will absolutely spot you.',
    photo_url: null,
    instagram: 'ty.crossfit',
    is_pro: false,
    wave_count: 43,
    vibe_tags: ['🔥 Competitive', '🌙 Night owl'],
    current_goal_text: 'Sub-5 Fran',
    email: null,
    training_experience: '5+ years',
    created_at: createdAt,
  },
  {
    id: 'dddddddd-0000-0000-0000-000000000003',
    user_id: 'dddddddd-aaaa-0000-0000-000000000003',
    slug: 'sofia-here',
    display_name: 'Sofia Alvarez',
    age: 22,
    gender: 'Woman',
    gym_name: 'CRWC Iowa City',
    sport: 'Running',
    workout_style: 'Cardio',
    goal: 'Performance',
    schedule: { ...baseSchedule, tue: true, thu: true, sat: true, sun: true, am: true },
    bio: 'Training for Chicago. Long runs + tempo work. Not a morning talker.',
    photo_url: null,
    instagram: 'sofia.runs',
    is_pro: false,
    wave_count: 17,
    vibe_tags: ['🎧 Headphones = busy'],
    current_goal_text: 'Sub-3:15 marathon',
    email: null,
    training_experience: '2-5 years',
    created_at: createdAt,
  },
  {
    id: 'dddddddd-0000-0000-0000-000000000004',
    user_id: 'dddddddd-aaaa-0000-0000-000000000004',
    slug: 'owen-here',
    display_name: 'Owen Park',
    age: 30,
    gender: 'Man',
    gym_name: 'CRWC Iowa City',
    sport: 'Weightlifting',
    workout_style: 'Hypertrophy',
    goal: 'Bulk',
    schedule: { ...baseSchedule, mon: true, tue: true, thu: true, fri: true, pm: true },
    bio: 'PPL split. Chasing a real 4-plate bench.',
    photo_url: null,
    instagram: 'owen.lifts',
    is_pro: true,
    wave_count: 56,
    vibe_tags: ['🤝 Open to training partners', '💪 Powerlifter energy'],
    current_goal_text: '405 bench',
    email: null,
    training_experience: '5+ years',
    created_at: createdAt,
  },

  // ──────────────────────────────────────────────────────────────────
  // 4 athletes at other gyms — NOT checked in today. Browse-only in Everyone.
  // ──────────────────────────────────────────────────────────────────
  {
    id: 'eeeeeeee-0000-0000-0000-000000000001',
    user_id: 'eeeeeeee-aaaa-0000-0000-000000000001',
    slug: 'zara-off',
    display_name: 'Zara Williams',
    age: 27,
    gender: 'Woman',
    gym_name: 'LA Fitness Downtown',
    sport: 'Boxing/MMA',
    workout_style: 'Athletic',
    goal: 'Cut',
    schedule: { ...baseSchedule, mon: true, wed: true, fri: true, pm: true },
    bio: 'Amateur boxer. Sparring Tue/Thu. Respect the craft.',
    photo_url: null,
    instagram: 'zarabox',
    is_pro: false,
    wave_count: 29,
    vibe_tags: ['🔥 Competitive', '🌙 Night owl'],
    current_goal_text: null,
    email: null,
    training_experience: '2-5 years',
    created_at: createdAt,
  },
  {
    id: 'eeeeeeee-0000-0000-0000-000000000002',
    user_id: 'eeeeeeee-aaaa-0000-0000-000000000002',
    slug: 'kenji-off',
    display_name: 'Kenji Tanaka',
    age: 35,
    gender: 'Man',
    gym_name: 'Equinox SoMa',
    sport: 'Swimming',
    workout_style: 'Cardio',
    goal: 'Performance',
    schedule: { ...baseSchedule, mon: true, wed: true, fri: true, am: true },
    bio: 'Open-water long course. Dad. Still dropping times.',
    photo_url: null,
    instagram: null,
    is_pro: true,
    wave_count: 71,
    vibe_tags: ['🌅 Morning warrior', '🎯 Solo grinder'],
    current_goal_text: 'Alcatraz swim this summer',
    email: null,
    training_experience: '5+ years',
    created_at: createdAt,
  },
  {
    id: 'eeeeeeee-0000-0000-0000-000000000003',
    user_id: 'eeeeeeee-aaaa-0000-0000-000000000003',
    slug: 'remi-off',
    display_name: 'Remi Dubois-Henderson',
    age: 26,
    gender: 'Nonbinary',
    gym_name: 'Brooklyn Bodyweight Co',
    sport: 'Gymnastics',
    workout_style: 'Athletic',
    goal: 'Performance',
    schedule: { ...baseSchedule, tue: true, thu: true, sat: true, am: true },
    bio: 'Handbalancing, rings, and way too much mobility work.',
    photo_url: null,
    instagram: 'remi.flows',
    is_pro: false,
    wave_count: 22,
    vibe_tags: ['🧘 Low key vibes', '📸 Progress poster'],
    current_goal_text: 'Straddle planche',
    email: null,
    training_experience: '2-5 years',
    created_at: createdAt,
  },
  {
    id: 'eeeeeeee-0000-0000-0000-000000000004',
    user_id: 'eeeeeeee-aaaa-0000-0000-000000000004',
    slug: 'arjun-off',
    display_name: 'Arjun Patel',
    age: 20,
    gender: 'Man',
    gym_name: 'Campus Rec',
    sport: 'Basketball',
    workout_style: 'Athletic',
    goal: 'Performance',
    schedule: { ...baseSchedule, mon: true, tue: true, wed: true, thu: true, fri: true, pm: true },
    bio: 'Intramural champ. Lift + hoop. Looking for pickup runs.',
    photo_url: null,
    instagram: 'arjun.hoops',
    is_pro: false,
    wave_count: 9,
    vibe_tags: ['🤝 Open to training partners', '🔰 Beginner friendly'],
    current_goal_text: null,
    email: null,
    training_experience: '1-2 years',
    created_at: createdAt,
  },
]

/** Per-profile streaks so Discover cards can show `🔥 X`. Keys are mock profile IDs. */
export const MOCK_DISCOVER_STREAKS: Record<string, number> = {
  [MOCK_OTHER_PROFILE_A_ID]:                   12,
  'cccccccc-dddd-eeee-ffff-000000000001':       4,
  'cccccccc-dddd-eeee-ffff-000000000002':      38,
  'cccccccc-dddd-eeee-ffff-000000000003':       0,
  'cccccccc-dddd-eeee-ffff-000000000004':      21,
  'cccccccc-dddd-eeee-ffff-000000000005':       7,
  'cccccccc-dddd-eeee-ffff-000000000006':       2,
  'cccccccc-dddd-eeee-ffff-000000000007':       0,
  // CRWC "here now" crew
  'dddddddd-0000-0000-0000-000000000001':      23,
  'dddddddd-0000-0000-0000-000000000002':       9,
  'dddddddd-0000-0000-0000-000000000003':      31,
  'dddddddd-0000-0000-0000-000000000004':      14,
  // Off-gym (Everyone only)
  'eeeeeeee-0000-0000-0000-000000000001':       6,
  'eeeeeeee-0000-0000-0000-000000000002':      44,
  'eeeeeeee-0000-0000-0000-000000000003':       0,
  'eeeeeeee-0000-0000-0000-000000000004':       3,
}

/**
 * Real-time-ish sessions for Discover "Here Now".
 * Staggered across today so the UI can render green/orange/gray dots
 * (just-now / X min ago / X hrs ago) + ordering by recency.
 */
export const mockDiscoverSessions: { profile_id: string; checked_in_at: string }[] = [
  // CRWC Iowa City — same gym as current user. Ordered newest first.
  { profile_id: 'dddddddd-0000-0000-0000-000000000001', checked_in_at: isoMinutesAgo(8)   }, // just now
  { profile_id: 'dddddddd-0000-0000-0000-000000000002', checked_in_at: isoMinutesAgo(22)  }, // just now
  { profile_id: 'dddddddd-0000-0000-0000-000000000003', checked_in_at: isoMinutesAgo(47)  }, // min ago
  { profile_id: MOCK_OTHER_PROFILE_A_ID,                 checked_in_at: isoMinutesAgo(95)  }, // min ago
  { profile_id: 'cccccccc-dddd-eeee-ffff-000000000005',  checked_in_at: isoMinutesAgo(180) }, // hrs ago (Devon)
  { profile_id: 'dddddddd-0000-0000-0000-000000000004',  checked_in_at: isoMinutesAgo(260) }, // hrs ago

  // Other gyms — still "today" but different gym, so Here Now filter hides them.
  { profile_id: 'cccccccc-dddd-eeee-ffff-000000000002',  checked_in_at: isoMinutesAgo(60)  }, // Alex @ Equinox
  { profile_id: 'cccccccc-dddd-eeee-ffff-000000000004',  checked_in_at: isoMinutesAgo(120) }, // Priya @ YogaWorks
  { profile_id: 'cccccccc-dddd-eeee-ffff-000000000001',  checked_in_at: isoMinutesAgo(200) }, // Sam @ Planet Fitness
]

/** Profile IDs we've gym-matched with (we sent a wave, they waved back). */
export const MOCK_MUTUAL_MATCH_IDS: Set<string> = new Set([
  'dddddddd-0000-0000-0000-000000000002', // Tyrese
  'cccccccc-dddd-eeee-ffff-000000000002', // Alex
])
