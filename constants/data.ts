export type SportTier = 1 | 2 | 3
export type Sport = { id: string; emoji: string; tier: SportTier }

export const SPORTS: Sport[] = [
  { id: 'Weightlifting',        emoji: '🏋️', tier: 1 },
  { id: 'Running',              emoji: '🏃', tier: 1 },
  { id: 'Cycling',              emoji: '🚴', tier: 1 },
  { id: 'Swimming',             emoji: '🏊', tier: 1 },
  { id: 'CrossFit',             emoji: '⚡', tier: 1 },
  { id: 'Yoga',                 emoji: '🧘', tier: 1 },
  { id: 'Boxing/MMA',           emoji: '🥊', tier: 1 },

  { id: 'Basketball',           emoji: '🏀', tier: 2 },
  { id: 'Soccer',               emoji: '⚽', tier: 2 },
  { id: 'Tennis',               emoji: '🎾', tier: 2 },
  { id: 'Football',             emoji: '🏈', tier: 2 },
  { id: 'Baseball',             emoji: '⚾', tier: 2 },
  { id: 'Volleyball',           emoji: '🏐', tier: 2 },
  { id: 'Hockey',               emoji: '🏒', tier: 2 },
  { id: 'Rugby',                emoji: '🏉', tier: 2 },

  { id: 'Climbing',             emoji: '🧗', tier: 3 },
  { id: 'Gymnastics',           emoji: '🤸', tier: 3 },
  { id: 'Cycling (Road)',       emoji: '🚴', tier: 3 },
  { id: 'Skateboarding',        emoji: '🛹', tier: 3 },
  { id: 'Surfing',              emoji: '🏄', tier: 3 },
  { id: 'Skiing/Snowboarding',  emoji: '🎿', tier: 3 },
  { id: 'Martial Arts',         emoji: '🥋', tier: 3 },
  { id: 'Golf',                 emoji: '🏌️', tier: 3 },
  { id: 'Archery',              emoji: '🎯', tier: 3 },
  { id: 'Wrestling',            emoji: '🤼', tier: 3 },
  { id: 'Rowing',               emoji: '🚣', tier: 3 },
  { id: 'Triathlon',            emoji: '🏊', tier: 3 },
  { id: 'Mixed/Everything',     emoji: '🔀', tier: 3 },
]

export const WORKOUT_STYLES = [
  'Strength', 'Cardio', 'Hypertrophy', 'Athletic', 'Wellness',
]

export const GOALS = [
  'Bulk', 'Cut', 'Maintain', 'Performance', 'Just for fun',
]

export const VIBE_TAGS = [
  '🗣️ Come talk to me',
  '🎧 Headphones = busy',
  '🤝 Open to training partners',
  '🎯 Solo grinder',
  '🌅 Morning warrior',
  '🌙 Night owl',
  '🏋️ Will spot you',
  '🔰 Beginner friendly',
  '📸 Progress poster',
  '💪 Powerlifter energy',
  '🧘 Low key vibes',
  '🔥 Competitive',
]

export const TRAINING_EXPERIENCE = [
  { label: 'Just started', emoji: '🌱' },
  { label: '1-2 years',    emoji: '📅' },
  { label: '2-5 years',    emoji: '💪' },
  { label: '5+ years',     emoji: '🏆' },
]

export const CHECKIN_WORKOUT_TYPES = [
  'Weightlifting', 'Cardio', 'CrossFit',
  'Swimming', 'Basketball', 'Climbing', 'Yoga', 'Other',
]

/** Emoji + accent color for each check-in type (session list dot + card accent). */
export const CHECKIN_WORKOUT_META: Record<
  string,
  { emoji: string; color: string }
> = {
  Weightlifting: { emoji: '🏋️', color: '#FF5722' },
  Cardio:        { emoji: '🏃', color: '#60a5fa' },
  CrossFit:      { emoji: '⚡',  color: '#FF3D6B' },
  Swimming:      { emoji: '🏊', color: '#2dd4bf' },
  Basketball:    { emoji: '🏀', color: '#fbbf24' },
  Climbing:      { emoji: '🧗', color: '#a78bfa' },
  Yoga:          { emoji: '🧘', color: '#34d399' },
  Other:         { emoji: '🎯', color: '#888888' },
}

export const BADGES = [
  { id: 'early_bird',    emoji: '🌅', name: 'Early Bird',    description: '10+ morning sessions before 10am', threshold: 10,  color: '#fbbf24' },
  { id: 'century_club',  emoji: '💯', name: 'Century Club',  description: '100+ total sessions',              threshold: 100, color: '#60a5fa' },
  { id: 'on_fire',       emoji: '🔥', name: 'On Fire',       description: '30+ day streak',                   threshold: 30,  color: '#FF5722' },
  { id: 'social_lifter', emoji: '🤝', name: 'Social Lifter', description: '5+ gym matches',                   threshold: 5,   color: '#34d399' },
  { id: 'consistent',    emoji: '⚡', name: 'Consistent',    description: 'Sessions 8 weeks in a row',        threshold: 8,   color: '#a78bfa' },
  { id: 'veteran',       emoji: '🏆', name: 'Veteran',       description: '365+ lifetime sessions',           threshold: 365, color: '#FF3D6B' },
  { id: 'popular',       emoji: '👋', name: 'Popular',       description: '50+ waves received',               threshold: 50,  color: '#FF5722' },
]
