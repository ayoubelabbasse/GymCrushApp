export interface Profile {
  id: string
  user_id: string
  slug: string
  display_name: string
  age: number | null
  gender: string | null
  gym_name: string | null
  sport: string | null
  workout_style: string | null
  goal: string | null
  schedule: Schedule | null
  bio: string | null
  photo_url: string | null
  instagram: string | null
  is_pro: boolean
  wave_count: number
  vibe_tags: string[] | null
  current_goal_text: string | null
  email: string | null
  training_experience: string | null
  created_at: string
}

export interface Schedule {
  mon: boolean; tue: boolean; wed: boolean
  thu: boolean; fri: boolean; sat: boolean
  sun: boolean; am: boolean;  pm: boolean
}

export interface GymSession {
  id: string
  profile_id: string
  checked_in_at: string
  workout_type: string | null
}

export interface Wave {
  id: string
  profile_id: string
  sent_at: string
  viewer_fingerprint: string
  message: string | null
  sender_profile_id: string | null
  is_mutual: boolean
}

export interface GymStats {
  streak: number
  totalSessions: number
  lastSessionAt: string | null
}
