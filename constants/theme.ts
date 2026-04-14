export const colors = {
  background: '#080808',
  surface: '#111111',
  surface2: '#1a1a1a',
  border: '#222222',
  primary: '#FF6B00',
  secondary: '#FF3D6B',
  text: '#FFFFFF',
  muted: '#888888',
}

export const gradients = {
  primary: ['#FF6B00', '#FF3D6B'] as const,
}

export const vibeTagColors = [
  { bg: 'rgba(255,107,0,0.15)',   text: '#FF6B00', border: 'rgba(255,107,0,0.3)'   },
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

export const typography = {
  hero:  { fontSize: 40, fontFamily: F.extraBold, letterSpacing: -1.5, fontWeight: '800' as const },
  h1:    { fontSize: 32, fontFamily: F.extraBold, letterSpacing: -1,   fontWeight: '800' as const },
  h2:    { fontSize: 24, fontFamily: F.extraBold, letterSpacing: -0.5, fontWeight: '800' as const },
  h3:    { fontSize: 20, fontFamily: F.bold,                           fontWeight: '700' as const },
  body:  { fontSize: 16, fontFamily: F.regular,                        fontWeight: '400' as const },
  small: { fontSize: 13, fontFamily: F.regular,                        fontWeight: '400' as const },
  label: { fontSize: 12, fontFamily: F.bold,       letterSpacing: 0.5, fontWeight: '700' as const },
}

export const radius = {
  sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, full: 999,
}

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
}
