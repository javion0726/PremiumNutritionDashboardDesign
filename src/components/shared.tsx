import { useState, useEffect, type CSSProperties, type ReactNode } from 'react'
import { colors, radius, shadow } from '../design/tokens'

// ─── Arc Progress (240° sweep) ────────────────────────────────────────────────

export function ArcProgress({
  value, max, size = 220, strokeWidth = 14,
  color = colors.green, trackColor = 'rgba(255,255,255,0.05)', children,
}: {
  value: number; max: number; size?: number; strokeWidth?: number
  color?: string; trackColor?: string; children?: ReactNode
}) {
  const r = (size - strokeWidth) / 2
  const cx = size / 2, cy = size / 2
  const startAngle = -210, endAngle = 30
  const totalAngle = endAngle - startAngle
  const ratio = Math.min(value / max, 1)

  function polarToXY(angleDeg: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }
  function arcPath(from: number, to: number) {
    const s = polarToXY(from), e = polarToXY(to)
    const large = to - from > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
  }

  const [anim, setAnim] = useState(0)
  useEffect(() => { const t = setTimeout(() => setAnim(ratio), 100); return () => clearTimeout(t) }, [ratio])
  const animAngle = startAngle + totalAngle * anim

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        <path d={arcPath(startAngle, endAngle)} fill="none" stroke={trackColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        <path
          d={arcPath(startAngle, anim > 0.01 ? animAngle : startAngle + 0.5)}
          fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          style={{ transition: 'all 1.4s cubic-bezier(0.25,0.46,0.45,0.94)', filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
        {anim > 0.02 && (
          <circle
            cx={polarToXY(animAngle).x} cy={polarToXY(animAngle).y}
            r={strokeWidth / 2 - 1} fill={color}
            style={{ transition: 'all 1.4s cubic-bezier(0.25,0.46,0.45,0.94)', filter: `drop-shadow(0 0 8px ${color})` }}
          />
        )}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Circle Progress ──────────────────────────────────────────────────────────

export function CircleProgress({
  value, max, size = 140, strokeWidth = 10, color = colors.blue, children,
}: {
  value: number; max: number; size?: number; strokeWidth?: number; color?: string; children?: ReactNode
}) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const [offset, setOffset] = useState(circ)
  useEffect(() => {
    const t = setTimeout(() => setOffset(circ * (1 - Math.min(value / max, 1))), 150)
    return () => clearTimeout(t)
  }, [value, max, circ])

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
          strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.25,0.46,0.45,0.94)', filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

export function ProgressBar({
  value, max, color = colors.green, delay = 0, height = 6,
}: {
  value: number; max: number; color?: string; delay?: number; height?: number
}) {
  const [w, setW] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setW(Math.min((value / max) * 100, 100)), 200 + delay)
    return () => clearTimeout(t)
  }, [value, max, delay])

  return (
    <div style={{ height, borderRadius: radius.full, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${w}%`, borderRadius: radius.full, background: color,
        boxShadow: `0 0 8px ${color}60`,
        transition: `width 1.2s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms`,
      }} />
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({
  children, style, glowColor, animDelay = 0,
}: {
  children: ReactNode; style?: CSSProperties; glowColor?: string; animDelay?: number
}) {
  return (
    <div style={{
      background: colors.card, borderRadius: radius.xl,
      border: `1px solid ${colors.border}`, boxShadow: shadow.card,
      position: 'relative', overflow: 'hidden',
      animation: `fadeUp 0.5s ease ${animDelay}ms both`,
      ...style,
    }}>
      {glowColor && (
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 120, height: 120,
          borderRadius: '50%', background: glowColor, filter: 'blur(32px)', pointerEvents: 'none',
        }} />
      )}
      {children}
    </div>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────

export function SectionHeader({ title, action, delay = 0 }: { title: string; action?: ReactNode; delay?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 2, animation: `fadeUp 0.4s ease ${delay}ms both` }}>
      <h2 style={{ color: colors.white, fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: '-0.2px' }}>{title}</h2>
      {action}
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────

export function Badge({ label, color = colors.gold, bg }: { label: string; color?: string; bg?: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: bg ?? `${color}18`, border: `1px solid ${color}30`,
      borderRadius: radius.full, padding: '3px 9px',
      fontSize: 10, fontWeight: 700, color, letterSpacing: '0.06em', textTransform: 'uppercase',
    }}>
      {label}
    </span>
  )
}

// ─── Icon Button ──────────────────────────────────────────────────────────────

export function IconBtn({ icon, color = colors.textMuted, bg = 'rgba(255,255,255,0.05)', size = 40, onClick }: {
  icon: ReactNode; color?: string; bg?: string; size?: number; onClick?: () => void
}) {
  return (
    <button onClick={onClick} style={{
      width: size, height: size, borderRadius: radius.md, background: bg,
      border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center',
      justifyContent: 'center', cursor: 'pointer', color, flexShrink: 0,
    }}>
      {icon}
    </button>
  )
}

// ─── Primary Button ───────────────────────────────────────────────────────────

export function PrimaryBtn({ label, onClick, icon, full = false }: {
  label: string; onClick?: () => void; icon?: ReactNode; full?: boolean
}) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        width: full ? '100%' : 'auto',
        background: pressed ? colors.greenHover : colors.green,
        borderRadius: radius.md, border: 'none', cursor: 'pointer',
        padding: '13px 24px', color: '#fff',
        fontSize: 14, fontWeight: 700, fontFamily: 'Plus Jakarta Sans, sans-serif',
        boxShadow: shadow.green,
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        transition: 'all 0.15s',
      }}
    >
      {icon}{label}
    </button>
  )
}

// ─── Ghost Button ─────────────────────────────────────────────────────────────

export function GhostBtn({ label, onClick, color = colors.green }: {
  label: string; onClick?: () => void; color?: string
}) {
  return (
    <button onClick={onClick} style={{
      background: `${color}12`, border: `1px solid ${color}25`,
      borderRadius: radius.md, padding: '10px 18px',
      color, fontSize: 13, fontWeight: 600,
      fontFamily: 'Plus Jakarta Sans, sans-serif', cursor: 'pointer',
      transition: 'all 0.15s',
    }}>
      {label}
    </button>
  )
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────

export function StatPill({ value, label, color = colors.green }: { value: string; label: string; color?: string }) {
  return (
    <div style={{
      background: colors.card, borderRadius: radius.lg, padding: '14px 16px',
      border: `1px solid ${colors.border}`, textAlign: 'center', flex: 1,
    }}>
      <p style={{ color, fontSize: 22, fontWeight: 800, margin: 0, lineHeight: 1 }}>{value}</p>
      <p style={{ color: colors.textMuted, fontSize: 11, margin: '4px 0 0', fontWeight: 500 }}>{label}</p>
    </div>
  )
}

// ─── Coach Card ───────────────────────────────────────────────────────────────

export function CoachCard({ text, accent, icon, delay = 0 }: {
  text: string; accent: string; icon: ReactNode; delay?: number
}) {
  return (
    <div style={{
      display: 'flex', gap: 14, alignItems: 'flex-start',
      background: colors.card, borderRadius: radius.lg, padding: 16,
      border: `1px solid ${colors.border}`,
      animation: `fadeUp 0.5s ease ${delay}ms both`,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: `${accent}18`,
        border: `1px solid ${accent}30`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <p style={{ fontSize: 13.5, color: '#CBD5E1', lineHeight: 1.6, margin: 0, fontFamily: 'Inter, sans-serif', fontWeight: 400 }}>
        {text}
      </p>
    </div>
  )
}

// ─── Achievement Card ─────────────────────────────────────────────────────────

export function AchievementCard({ icon, title, desc, unlocked = true, delay = 0 }: {
  icon: string; title: string; desc: string; unlocked?: boolean; delay?: number
}) {
  return (
    <div style={{
      background: unlocked
        ? 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(251,191,36,0.04) 100%)'
        : colors.card,
      borderRadius: radius.lg, padding: '16px',
      border: `1px solid ${unlocked ? 'rgba(251,191,36,0.25)' : colors.border}`,
      boxShadow: unlocked ? '0 4px 20px rgba(251,191,36,0.1)' : 'none',
      animation: `fadeUp 0.5s ease ${delay}ms both`,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12, marginBottom: 10,
        background: unlocked ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        filter: unlocked ? 'none' : 'grayscale(1) opacity(0.4)',
      }}>
        {icon}
      </div>
      <p style={{ color: unlocked ? colors.gold : colors.textDim, fontSize: 13, fontWeight: 700, margin: '0 0 3px' }}>{title}</p>
      <p style={{ color: colors.textDim, fontSize: 11, margin: 0, lineHeight: 1.4, fontFamily: 'Inter, sans-serif' }}>{desc}</p>
    </div>
  )
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

export function Skeleton({ width = '100%', height = 16, radius: r = 8 }: { width?: string | number; height?: number; radius?: number }) {
  return (
    <div style={{
      width, height, borderRadius: r,
      background: 'linear-gradient(90deg, #151E32 25%, #1C2740 50%, #151E32 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
    }} />
  )
}

// ─── SVG Line Chart ───────────────────────────────────────────────────────────

export function LineChart({
  data, color = colors.green, height = 80, showDots = true,
}: {
  data: number[]; color?: string; height?: number; showDots?: boolean
}) {
  const width = 300
  const pad = 8
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (width - pad * 2),
    y: pad + ((1 - (v - min) / range) * (height - pad * 2)),
  }))

  // Smooth cubic bezier path
  function smoothPath() {
    if (pts.length < 2) return ''
    let d = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 0; i < pts.length - 1; i++) {
      const cp1x = pts[i].x + (pts[i + 1].x - pts[i].x) * 0.4
      const cp2x = pts[i + 1].x - (pts[i + 1].x - pts[i].x) * 0.4
      d += ` C ${cp1x} ${pts[i].y}, ${cp2x} ${pts[i + 1].y}, ${pts[i + 1].x} ${pts[i + 1].y}`
    }
    return d
  }

  const linePath = smoothPath()
  const areaPath = linePath + ` L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z`
  const gradId = `grad-${color.replace('#', '')}`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height, overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${color}60)` }} />
      {showDots && pts.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={i === pts.length - 1 ? 4 : 2.5}
          fill={i === pts.length - 1 ? color : `${color}80`}
          style={{ filter: i === pts.length - 1 ? `drop-shadow(0 0 4px ${color})` : 'none' }}
        />
      ))}
    </svg>
  )
}

// ─── Bottom Navigation ────────────────────────────────────────────────────────

const NAV_ICONS = {
  home: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  workout: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h2m12 0h2M6 12V8m0 8v-4m12-4v4m0 4v-4M8 6h8M8 18h8" />
    </svg>
  ),
  nutrition: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  ),
  progress: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  profile: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
}

type TabId = 'home' | 'workout' | 'nutrition' | 'progress' | 'profile'

export function BottomNav({ active, onChange }: { active: TabId; onChange: (tab: TabId) => void }) {
  const tabs: { id: TabId; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'workout', label: 'Workout' },
    { id: 'nutrition', label: 'Nutrition' },
    { id: 'progress', label: 'Progress' },
    { id: 'profile', label: 'Profile' },
  ]

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 430,
      background: 'rgba(11,18,32,0.88)',
      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      borderTop: `1px solid ${colors.divider}`,
      paddingBottom: 24, paddingTop: 10, zIndex: 50,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        {tabs.map((tab) => {
          const isActive = tab.id === active
          return (
            <button key={tab.id} onClick={() => onChange(tab.id)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px 10px',
              color: isActive ? colors.green : colors.textDisabled,
              transition: 'color 0.2s',
            }}>
              <div style={{ filter: isActive ? `drop-shadow(0 0 6px ${colors.greenGlow})` : 'none', transition: 'filter 0.2s' }}>
                {NAV_ICONS[tab.id]}
              </div>
              <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400, letterSpacing: '0.02em' }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Screen Shell ─────────────────────────────────────────────────────────────

export function ScreenShell({ children, padBottom = true }: { children: ReactNode; padBottom?: boolean }) {
  return (
    <div style={{
      width: '100%', maxWidth: 430, margin: '0 auto',
      overflowY: 'auto', paddingBottom: padBottom ? 100 : 0,
      minHeight: '100vh',
    }}>
      {children}
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, body, cta, onCta }: {
  icon: string; title: string; body: string; cta?: string; onCta?: () => void
}) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 32px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <p style={{ color: colors.white, fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>{title}</p>
      <p style={{ color: colors.textMuted, fontSize: 14, margin: '0 0 24px', lineHeight: 1.6, fontFamily: 'Inter, sans-serif' }}>{body}</p>
      {cta && <PrimaryBtn label={cta} onClick={onCta} />}
    </div>
  )
}
