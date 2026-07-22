import { useState } from 'react'
import { colors, radius, shadow } from '../design/tokens'
import { saveConfig, markOnboarded } from '../lib/store'

type Answers = { name: string; goal: string; days: string; waterUnit: 'cups' | 'oz' | 'liters' }

const GOALS = [
  { icon: '🔥', label: 'Lose fat & get leaner', val: 'Lose fat & get leaner' },
  { icon: '💪', label: 'Build muscle & strength', val: 'Build muscle & strength' },
  { icon: '⚡', label: 'Improve fitness & energy', val: 'Improve fitness & energy' },
  { icon: '📅', label: 'Build a consistent routine', val: 'Build a consistent routine' },
]
const DAYS = [
  { label: '2 days — starting easy', val: '2 days' },
  { label: '3 days — balanced', val: '3 days' },
  { label: '4 days — committed', val: '4 days' },
  { label: '5+ days — all in', val: '5+ days' },
]
const WATER = [
  { icon: '☕', label: 'Cups', val: 'cups' as const, goal: 8 },
  { icon: '🥤', label: 'Fluid ounces', val: 'oz' as const, goal: 64 },
  { icon: '💧', label: 'Liters', val: 'liters' as const, goal: 2.5 },
]

function OptionButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', padding: '15px 18px', borderRadius: radius.md,
      background: selected ? colors.greenDim : 'rgba(255,255,255,0.04)',
      border: `1.5px solid ${selected ? colors.green : colors.border}`,
      color: selected ? colors.green : colors.white,
      fontSize: 14.5, fontWeight: 600, cursor: 'pointer',
      fontFamily: 'Plus Jakarta Sans, sans-serif', transition: 'all 0.15s',
      marginBottom: 10,
    }}>
      {children}
    </button>
  )
}

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [a, setA] = useState<Answers>({ name: '', goal: '', days: '', waterUnit: 'oz' })
  const [error, setError] = useState(false)
  const total = 4

  function next() {
    if (step === 0 && !a.name.trim()) { setError(true); return }
    if (step === 1 && !a.goal) { setError(true); return }
    if (step === 2 && !a.days) { setError(true); return }
    setError(false)
    if (step < total - 1) { setStep(step + 1); return }
    // Final step — persist everything and finish.
    const waterCfg = WATER.find(w => w.val === a.waterUnit)!
    saveConfig({ name: a.name.trim(), goal: a.goal, daysPerWeek: a.days, waterUnit: a.waterUnit, waterGoal: waterCfg.goal })
    markOnboarded()
    onDone()
  }
  function back() {
    setError(false)
    if (step > 0) setStep(step - 1)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: colors.bgPrimary, zIndex: 200,
      display: 'flex', flexDirection: 'column', maxWidth: 430, margin: '0 auto',
    }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '54px 24px 0' }}>
        {step > 0 ? (
          <button onClick={back} aria-label="Back" style={{
            background: 'none', border: `1.5px solid ${colors.border}`, borderRadius: '50%',
            width: 40, height: 40, color: colors.textDim, fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>←</button>
        ) : <div style={{ width: 40, height: 40 }} />}
        <div style={{ fontSize: 13, fontWeight: 700, color: colors.textDim }}>{step + 1} / {total}</div>
      </div>

      {/* Progress bar */}
      <div style={{ margin: '16px 24px 0', height: 3, background: colors.card, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', background: colors.green, borderRadius: 2,
          width: `${((step + 1) / total) * 100}%`, transition: 'width 0.3s ease',
          boxShadow: `0 0 8px ${colors.greenGlow}`,
        }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '40px 28px 0', overflowY: 'auto' }}>
        <div style={{
          display: 'inline-flex', width: 32, height: 32, borderRadius: '50%',
          background: colors.greenDim, border: `1px solid ${colors.green}30`,
          alignItems: 'center', justifyContent: 'center', color: colors.green,
          fontSize: 14, fontWeight: 800, marginBottom: 20,
        }}>{step + 1}</div>

        {step === 0 && (
          <>
            <h1 style={{ color: colors.white, fontSize: 30, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px', lineHeight: 1.15 }}>
              What's your<br /><span style={{ color: colors.green }}>name?</span>
            </h1>
            <p style={{ color: colors.textMuted, fontSize: 14, margin: '0 0 28px', fontFamily: 'Inter, sans-serif' }}>
              We'll use it to make the app feel personal.
            </p>
            <input
              autoFocus value={a.name} placeholder="First name" autoComplete="given-name"
              onChange={e => { setA({ ...a, name: e.target.value }); setError(false) }}
              style={{
                width: '100%', boxSizing: 'border-box', fontSize: 26, padding: '12px 0',
                border: 'none', borderBottom: `2px solid ${colors.border}`, background: 'transparent',
                color: colors.white, fontFamily: 'Inter, sans-serif', fontWeight: 700, outline: 'none',
              }}
            />
            {error && <p style={{ color: colors.danger, fontSize: 12.5, marginTop: 8 }}>Please enter your name to continue</p>}
          </>
        )}

        {step === 1 && (
          <>
            <h1 style={{ color: colors.white, fontSize: 28, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px', lineHeight: 1.15 }}>
              What's your<br /><span style={{ color: colors.green }}>main goal?</span>
            </h1>
            <p style={{ color: colors.textMuted, fontSize: 14, margin: '0 0 24px', fontFamily: 'Inter, sans-serif' }}>
              Choose the one that fits best.
            </p>
            {GOALS.map(g => (
              <OptionButton key={g.val} selected={a.goal === g.val} onClick={() => { setA({ ...a, goal: g.val }); setError(false) }}>
                {g.icon} {g.label}
              </OptionButton>
            ))}
            {error && <p style={{ color: colors.danger, fontSize: 12.5, marginTop: 4 }}>Please select a goal to continue</p>}
          </>
        )}

        {step === 2 && (
          <>
            <h1 style={{ color: colors.white, fontSize: 28, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px', lineHeight: 1.15 }}>
              How many<br /><span style={{ color: colors.green }}>days a week?</span>
            </h1>
            <p style={{ color: colors.textMuted, fontSize: 14, margin: '0 0 24px', fontFamily: 'Inter, sans-serif' }}>
              Be honest — consistency beats intensity.
            </p>
            {DAYS.map(d => (
              <OptionButton key={d.val} selected={a.days === d.val} onClick={() => { setA({ ...a, days: d.val }); setError(false) }}>
                {d.label}
              </OptionButton>
            ))}
            {error && <p style={{ color: colors.danger, fontSize: 12.5, marginTop: 4 }}>Please select how many days</p>}
          </>
        )}

        {step === 3 && (
          <>
            <h1 style={{ color: colors.white, fontSize: 28, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px', lineHeight: 1.15 }}>
              How do you<br />track <span style={{ color: colors.green }}>water?</span>
            </h1>
            <p style={{ color: colors.textMuted, fontSize: 14, margin: '0 0 24px', fontFamily: 'Inter, sans-serif' }}>
              Pick what feels natural — you can change this later in Profile.
            </p>
            {WATER.map(w => (
              <OptionButton key={w.val} selected={a.waterUnit === w.val} onClick={() => setA({ ...a, waterUnit: w.val })}>
                {w.icon} {w.label}
              </OptionButton>
            ))}
          </>
        )}
      </div>

      <div style={{ padding: '24px 28px 48px' }}>
        <button onClick={next} style={{
          width: '100%', background: colors.green, border: 'none', borderRadius: radius.md,
          padding: '16px', color: '#fff', fontSize: 15, fontWeight: 800, letterSpacing: '0.02em',
          cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', boxShadow: shadow.green,
        }}>
          {step === total - 1 ? "LET'S GO 🔥" : 'NEXT'}
        </button>
      </div>
    </div>
  )
}
