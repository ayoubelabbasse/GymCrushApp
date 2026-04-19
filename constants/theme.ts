export const colors = {
  background: '#080808',
  surface: '#111111',
  surface2: '#1a1a1a',
  border: '#222222',
  // Red-leaning orange to match the web app (less pure-orange vibe).
  primary: '#FF5722',
  secondary: '#FF3D6B',
  text: '#FFFFFF',
  muted: '#9a9a9a',
}

/** Vibrant orange → reddish coral (buttons, Pro, Wave — unchanged). */
export const gradients = {
  primary: ['#FF7A1A', '#E93D55'] as const,
}

/**
 * Profile header — red-orange → coral → transparent, top-left to bottom-right.
 * Render over `#000` hero base.
 */
export const profileHeroGradient = {
  colors: [
    'rgba(255, 87, 34, 0.3)',
    'rgba(255, 61, 107, 0.2)',
    'rgba(0, 0, 0, 0)',
  ] as const,
  locations: [0, 0.5, 1] as const,
  start: { x: 0, y: 0 } as const,
  end: { x: 1, y: 1 } as const,
}

/** Initials circle: red-orange → coral diagonal. */
export const profileAvatarCircleGradient = ['#FF5722', '#FF3D6B'] as const

export const vibeTagColors = [
  { bg: 'rgba(255,87,34,0.15)',   text: '#FF5722', border: 'rgba(255,87,34,0.3)'   },
  { bg: 'rgba(255,61,107,0.15)',  text: '#FF3D6B', border: 'rgba(255,61,107,0.3)'  },
  { bg: 'rgba(167,139,250,0.15)', text: '#a78bfa', border: 'rgba(167,139,250,0.3)' },
  { bg: 'rgba(52,211,153,0.15)',  text: '#34d399', border: 'rgba(52,211,153,0.3)'  },
  { bg: 'rgba(251,191,36,0.15)',  text: '#fbbf24', border: 'rgba(251,191,36,0.3)'  },
  { bg: 'rgba(96,165,250,0.15)',  text: '#60a5fa', border: 'rgba(96,165,250,0.3)'  },
]

// Syne font family variants (loaded in app/_layout.tsx)
export const F = {
  regular:   'Syne_400Regular',
  semiBold:  'Syne_600SemiBold',
  bold:      'Syne_700Bold',
  extraBold: 'Syne_800ExtraBold',
}

/**
 * Global text line height: `fontSize × 1.5`.
 * Syne renders tight by default — this extra vertical room stops text from
 * feeling flat on iOS and prevents descender clipping on Android.
 */
export function lineHeightFor(fontSize: number): number {
  return Math.round(fontSize * 1.5)
}

export const typography = {
  hero:  { fontSize: 40, lineHeight: lineHeightFor(40), fontFamily: F.extraBold, letterSpacing: -0.8, fontWeight: '800' as const },
  h1:    { fontSize: 32, lineHeight: lineHeightFor(32), fontFamily: F.extraBold, letterSpacing: -0.5, fontWeight: '800' as const },
  h2:    { fontSize: 24, lineHeight: lineHeightFor(24), fontFamily: F.extraBold, letterSpacing: -0.2, fontWeight: '800' as const },
  h3:    { fontSize: 20, lineHeight: lineHeightFor(20), fontFamily: F.bold,                           fontWeight: '700' as const },
  body:  { fontSize: 16, lineHeight: lineHeightFor(16), fontFamily: F.regular,                        fontWeight: '400' as const },
  small: { fontSize: 13, lineHeight: lineHeightFor(13), fontFamily: F.regular,                        fontWeight: '400' as const },
  label: { fontSize: 12, lineHeight: lineHeightFor(12), fontFamily: F.bold,       letterSpacing: 0.5, fontWeight: '700' as const },
}

export const radius = {
  sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, full: 999,
}

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
}
