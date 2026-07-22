// Ascend Design System — Tokens

export const colors = {
  bgPrimary: '#0B1220',
  bgSecondary: '#111827',
  card: '#151E32',
  cardHover: '#1B2740',
  cardElevated: '#1C2740',

  green: '#22C55E',
  greenHover: '#16A34A',
  greenDim: 'rgba(34,197,94,0.12)',
  greenGlow: 'rgba(34,197,94,0.25)',

  gold: '#FBBF24',
  goldDim: 'rgba(251,191,36,0.12)',
  goldGlow: 'rgba(251,191,36,0.25)',

  blue: '#38BDF8',
  blueDim: 'rgba(56,189,248,0.12)',
  blueGlow: 'rgba(56,189,248,0.25)',

  violet: '#A78BFA',
  violetDim: 'rgba(167,139,250,0.12)',
  violetGlow: 'rgba(167,139,250,0.25)',

  white: '#F8FAFC',
  textMuted: '#94A3B8',
  textDim: '#64748B',
  textDisabled: '#475569',

  danger: '#EF4444',
  dangerDim: 'rgba(239,68,68,0.12)',
  dangerGlow: 'rgba(239,68,68,0.25)',

  divider: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.05)',
  borderHover: 'rgba(255,255,255,0.1)',
} as const

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
  full: 999,
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

export const shadow = {
  card: '0 4px 24px rgba(0,0,0,0.35)',
  hero: '0 8px 40px rgba(0,0,0,0.45)',
  green: '0 4px 20px rgba(34,197,94,0.25)',
  gold: '0 4px 20px rgba(251,191,36,0.2)',
} as const

export const typography = {
  display: { fontSize: 44, fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1 },
  h1: { fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.1 },
  h2: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px' },
  h3: { fontSize: 17, fontWeight: 700, letterSpacing: '-0.2px' },
  label: { fontSize: 13, fontWeight: 600, letterSpacing: '0.02em' },
  caption: { fontSize: 11, fontWeight: 500, letterSpacing: '0.04em' },
  body: { fontSize: 14, fontWeight: 400, lineHeight: 1.6 },
  mono: { fontSize: 13, fontWeight: 600, fontFamily: 'Inter, monospace' },
} as const
