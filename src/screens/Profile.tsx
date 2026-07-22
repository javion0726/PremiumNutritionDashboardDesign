import { useRef, useState } from 'react'
import { colors, radius, shadow } from '../design/tokens'
import { ProgressBar, Card, ScreenShell } from '../components/shared'
import { useAppData } from '../lib/useAppData'
import {
  getConfig, saveConfig, getGoals, saveGoals, getMeasurements,
  exportBackup, importBackup, clearAllData, parseKey,
} from '../lib/store'
import { calcStreak, workoutStats, bestSets, getTargets, calcTargets, mealTotals } from '../lib/engine'
import { getJournal, daysAgoKey } from '../lib/store'

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 44, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
      background: on ? colors.green : 'rgba(255,255,255,0.1)',
      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      boxShadow: on ? `0 0 12px ${colors.greenGlow}` : 'none',
    }}>
      <div style={{
        position: 'absolute', top: 3, left: on ? 21 : 3,
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </button>
  )
}

// ─── Setting Row ──────────────────────────────────────────────────────────────

function SettingRow({ icon, label, value, hasToggle, toggleOn, onToggle, danger, sub, onClick }: {
  icon: string; label: string; value?: string; hasToggle?: boolean
  toggleOn?: boolean; onToggle?: (v: boolean) => void; danger?: boolean; sub?: string
  onClick?: () => void
}) {
  const Row = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0',
      borderBottom: `1px solid ${colors.border}`,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
        background: danger ? colors.dangerDim : 'rgba(255,255,255,0.05)',
        border: `1px solid ${danger ? colors.danger + '30' : colors.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ color: danger ? colors.danger : colors.white, fontSize: 14, fontWeight: 600, margin: 0 }}>{label}</p>
        {sub && <p style={{ color: colors.textDim, fontSize: 12, margin: '2px 0 0', fontFamily: 'Inter, sans-serif' }}>{sub}</p>}
      </div>
      {hasToggle && onToggle != null
        ? <Toggle on={toggleOn ?? false} onChange={onToggle} />
        : value
          ? <span style={{ color: colors.textDim, fontSize: 13, fontFamily: 'Inter, sans-serif' }}>{value}</span>
          : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={colors.textDim} strokeWidth="1.5" strokeLinecap="round">
              <path d="M6 4l4 4-4 4" />
            </svg>
          )
      }
    </div>
  )
  if (onClick && !hasToggle) {
    return (
      <button onClick={onClick} style={{ display: 'block', width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
        {Row}
      </button>
    )
  }
  return Row
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({ icon, title, target, current, unit, color, onEdit }: {
  icon: string; title: string; target: number; current: number; unit: string; color: string; onEdit: () => void
}) {
  const p = target ? Math.min(Math.round((current / target) * 100), 100) : 0
  return (
    <button onClick={onEdit} style={{
      background: colors.card, borderRadius: radius.lg, padding: '14px',
      border: `1px solid ${colors.border}`, cursor: 'pointer', textAlign: 'left', width: '100%',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <p style={{ color: colors.white, fontSize: 13, fontWeight: 700, margin: 0 }}>{title}</p>
      </div>
      <p style={{ color, fontSize: 18, fontWeight: 800, margin: '0 0 4px' }}>
        {current} <span style={{ fontSize: 12, fontWeight: 500, color: colors.textMuted }}>/ {target || '—'} {unit}</span>
      </p>
      <ProgressBar value={current} max={Math.max(1, target)} color={color} height={4} />
      <p style={{ color: colors.textDim, fontSize: 11, margin: '6px 0 0', fontFamily: 'Inter, sans-serif' }}>
        {target ? `${p}% to goal` : 'Tap to set a target'}
      </p>
    </button>
  )
}

// ─── Sheets ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)',
  border: `1px solid rgba(255,255,255,0.05)`, borderRadius: 14,
  padding: '11px 14px', color: '#F8FAFC', fontSize: 14,
  fontFamily: 'Inter, sans-serif', outline: 'none',
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 430, maxHeight: '85vh', overflowY: 'auto',
        background: colors.bgSecondary, borderRadius: `${radius.xl}px ${radius.xl}px 0 0`,
        border: `1px solid ${colors.border}`, padding: '20px 16px 32px',
        animation: 'fadeUp 0.25s ease both',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 16px' }} />
        <p style={{ color: colors.white, fontSize: 17, fontWeight: 700, margin: '0 0 12px' }}>{title}</p>
        {children}
      </div>
    </div>
  )
}

function GreenBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', background: colors.green, border: 'none', borderRadius: radius.md,
      padding: '12px', color: '#fff', fontSize: 14, fontWeight: 700,
      cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', boxShadow: shadow.green, marginTop: 8,
    }}>{label}</button>
  )
}

function EditNumberSheet({ title, placeholder, initial, onSave, onClose }: {
  title: string; placeholder: string; initial: string
  onSave: (v: number) => void; onClose: () => void
}) {
  const [v, setV] = useState(initial)
  return (
    <Sheet title={title} onClose={onClose}>
      <input style={inputStyle} inputMode="decimal" placeholder={placeholder} value={v} onChange={e => setV(e.target.value)} autoFocus />
      <GreenBtn label="Save" onClick={() => { const n = parseFloat(v); if (!isNaN(n) && n > 0) onSave(n); onClose() }} />
    </Sheet>
  )
}

function EditNameSheet({ onClose }: { onClose: () => void }) {
  const [v, setV] = useState(getConfig().name)
  return (
    <Sheet title="Your Name" onClose={onClose}>
      <input style={inputStyle} placeholder="What should we call you?" value={v} onChange={e => setV(e.target.value)} autoFocus maxLength={30} />
      <GreenBtn label="Save" onClick={() => { saveConfig({ name: v.trim() }); onClose() }} />
    </Sheet>
  )
}

function CalculatorSheet({ onClose }: { onClose: () => void }) {
  const cfg = getConfig()
  const [f, setF] = useState({ sex: 'male' as 'male' | 'female', age: '', heightCm: '', weight: '', goalWeight: '', goalCode: 'lose' as Parameters<typeof calcTargets>[0]['goalCode'] })
  const [result, setResult] = useState<ReturnType<typeof calcTargets> | null>(null)

  function run() {
    const age = parseFloat(f.age), h = parseFloat(f.heightCm), w = parseFloat(f.weight), gw = parseFloat(f.goalWeight) || w
    if (!age || !h || !w || age < 13 || age > 100 || h < 100 || h > 250) return
    const wLbs = cfg.weightUnit === 'kg' ? w * 2.20462 : w
    const gwLbs = cfg.weightUnit === 'kg' ? gw * 2.20462 : gw
    const r = calcTargets({ sex: f.sex, age, heightCm: h, weightLbs: wLbs, goalWeightLbs: gwLbs, activity: cfg.activity, goalCode: f.goalCode })
    setResult(r)
    saveGoals({ results: { calories: r.calories, protein: r.protein, carbs: r.carbs, fats: r.fats }, goalWeight: gwLbs, goalCode: f.goalCode })
  }

  const goals: { code: typeof f.goalCode; label: string }[] = [
    { code: 'lose_fast', label: 'Lose fast' }, { code: 'lose', label: 'Lose' },
    { code: 'lose_slow', label: 'Lose slow' }, { code: 'maintain', label: 'Maintain' },
    { code: 'recomp', label: 'Recomp' }, { code: 'gain_slow', label: 'Lean gain' }, { code: 'gain', label: 'Gain' },
  ]

  return (
    <Sheet title="Calorie & Macro Calculator" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['male', 'female'] as const).map(s => (
            <button key={s} onClick={() => setF({ ...f, sex: s })} style={{
              flex: 1, padding: '10px', borderRadius: radius.full, border: `1px solid ${f.sex === s ? colors.green + '40' : colors.border}`,
              background: f.sex === s ? colors.greenDim : 'rgba(255,255,255,0.04)',
              color: f.sex === s ? colors.green : colors.textMuted, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>{s === 'male' ? 'Male' : 'Female'}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={inputStyle} inputMode="numeric" placeholder="Age" value={f.age} onChange={e => setF({ ...f, age: e.target.value })} />
          <input style={inputStyle} inputMode="numeric" placeholder="Height (cm)" value={f.heightCm} onChange={e => setF({ ...f, heightCm: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={inputStyle} inputMode="decimal" placeholder={`Weight (${cfg.weightUnit})`} value={f.weight} onChange={e => setF({ ...f, weight: e.target.value })} />
          <input style={inputStyle} inputMode="decimal" placeholder={`Goal weight (${cfg.weightUnit})`} value={f.goalWeight} onChange={e => setF({ ...f, goalWeight: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {goals.map(g => (
            <button key={g.code} onClick={() => setF({ ...f, goalCode: g.code })} style={{
              padding: '7px 12px', borderRadius: radius.full, border: `1px solid ${f.goalCode === g.code ? colors.green + '40' : colors.border}`,
              background: f.goalCode === g.code ? colors.greenDim : 'rgba(255,255,255,0.04)',
              color: f.goalCode === g.code ? colors.green : colors.textDim, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>{g.label}</button>
          ))}
        </div>
        <p style={{ color: colors.textDim, fontSize: 11.5, margin: '2px 0 0', fontFamily: 'Inter, sans-serif' }}>
          Activity level "{cfg.activityLabel}" is applied from your Profile selection above.
        </p>
        <GreenBtn label="Calculate & Save Targets" onClick={run} />
        {result && (
          <div style={{ background: colors.card, border: `1px solid ${colors.green}30`, borderRadius: radius.lg, padding: 16, marginTop: 4 }}>
            <p style={{ color: colors.green, fontSize: 14, fontWeight: 700, margin: '0 0 8px' }}>Saved — your Nutrition targets now use these:</p>
            <p style={{ color: colors.white, fontSize: 13.5, margin: 0, fontFamily: 'Inter, sans-serif', lineHeight: 1.7 }}>
              {result.calories.toLocaleString()} kcal · {result.protein}g protein · {result.carbs}g carbs · {result.fats}g fat
              <br /><span style={{ color: colors.textDim, fontSize: 12 }}>TDEE ≈ {result.tdee.toLocaleString()} kcal{result.floored ? ' · floored at the safe minimum' : ''}</span>
            </p>
          </div>
        )}
      </div>
    </Sheet>
  )
}

// ─── Ascend Pro (honest placeholder — no fake subscription state) ─────────────

function SubscriptionCard() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1C2740 0%, #151E32 100%)',
      border: `1px solid ${colors.gold}30`, borderRadius: radius.xl, padding: '20px',
      boxShadow: `0 4px 24px rgba(251,191,36,0.1)`, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -40, right: -40, width: 120, height: 120,
        borderRadius: '50%', background: 'rgba(251,191,36,0.08)', filter: 'blur(32px)', pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>⚡</span>
            <p style={{ color: colors.gold, fontSize: 14, fontWeight: 800, margin: 0, letterSpacing: '-0.2px' }}>
              Ascend Pro
            </p>
          </div>
          <p style={{ color: colors.textMuted, fontSize: 13, margin: 0, fontFamily: 'Inter, sans-serif' }}>
            AI coaching · Advanced analytics<br />Cloud sync · Priority support
          </p>
        </div>
        <div style={{
          background: colors.goldDim, border: `1px solid ${colors.gold}40`,
          borderRadius: radius.full, padding: '4px 10px',
          color: colors.gold, fontSize: 11, fontWeight: 700, flexShrink: 0,
        }}>
          Coming soon
        </div>
      </div>
    </div>
  )
}

// ─── Profile Screen ───────────────────────────────────────────────────────────

const ACTIVITY_LEVELS = [
  { label: 'Sedentary', mult: 1.2 },
  { label: 'Lightly Active', mult: 1.375 },
  { label: 'Moderate', mult: 1.55 },
  { label: 'Very Active', mult: 1.725 },
  { label: 'Athlete', mult: 1.9 },
]

export default function ProfileScreen() {
  useAppData()
  const fileRef = useRef<HTMLInputElement>(null)
  const [sheet, setSheet] = useState<'none' | 'name' | 'calc' | 'goalWeight' | 'bench' | 'streak'>('none')
  const [msg, setMsg] = useState('')

  const cfg = getConfig()
  const goals = getGoals()
  const targets = getTargets()
  const streak = calcStreak()
  const { total: workoutCount, firstDate } = workoutStats()
  const meas = getMeasurements().filter(m => m.weight).sort((a, b) => a.date.localeCompare(b.date))
  const currentWeight = meas.length ? parseFloat(meas[meas.length - 1].weight!) : 0
  const lbsLost = meas.length >= 2 ? Math.max(0, parseFloat(meas[0].weight!) - currentWeight) : 0
  const bench = bestSets().get('Bench Press')?.weight ?? 0

  // weekly protein consumed
  const j = getJournal()
  let weekProt = 0
  for (let i = 0; i < 7; i++) weekProt += mealTotals(j[daysAgoKey(i)]?.mealArr).prot
  weekProt = Math.round(weekProt)

  const name = cfg.name?.trim() || 'Ascend Athlete'
  const since = firstDate
    ? parseKey(firstDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '—'

  function notify(m: string) { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  function doExport() {
    const blob = new Blob([exportBackup()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ascend-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    notify('Backup downloaded ✓')
  }
  function doRestore(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const r = importBackup(String(reader.result))
      notify(r.ok ? 'Data restored ✓' : `Restore failed: ${r.error}`)
    }
    reader.readAsText(file)
  }
  function doClear() {
    if (window.confirm('Delete ALL Ascend data on this device? This cannot be undone. Export a backup first if you want to keep it.')) {
      clearAllData()
      notify('All data cleared')
    }
  }

  function setNotif(key: string, v: boolean) {
    saveConfig({ notifications: { ...cfg.notifications, [key]: v } })
  }

  return (
    <ScreenShell>
      {/* Hero */}
      <div style={{
        padding: '56px 24px 28px',
        background: 'linear-gradient(180deg, rgba(34,197,94,0.07) 0%, transparent 100%)',
        animation: 'fadeUp 0.4s ease both',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 72, height: 72, borderRadius: 22,
              background: 'linear-gradient(135deg, #22C55E, #16A34A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: shadow.green, fontSize: 30, color: '#fff', fontWeight: 800,
            }}>
              {name[0].toUpperCase()}
            </div>
          </div>
          <div>
            <button onClick={() => setSheet('name')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
              <h1 style={{ color: colors.white, fontSize: 22, fontWeight: 800, margin: '0 0 3px', letterSpacing: '-0.3px' }}>
                {name}
              </h1>
              <p style={{ color: colors.textMuted, fontSize: 13, margin: '0 0 6px', fontFamily: 'Inter, sans-serif' }}>
                Tap to edit your name
              </p>
            </button>
            {streak > 0 && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: colors.goldDim, border: `1px solid ${colors.gold}30`,
                borderRadius: radius.full, padding: '3px 10px',
              }}>
                <span style={{ color: colors.gold, fontSize: 11, fontWeight: 700 }}>{streak}-day streak 🔥</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Workouts', value: String(workoutCount) },
            { label: 'Since', value: since },
            { label: `${cfg.weightUnit} Lost`, value: lbsLost ? lbsLost.toFixed(1) : '—' },
          ].map((s) => (
            <div key={s.label} style={{
              flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: radius.md,
              padding: '12px 8px', textAlign: 'center', border: `1px solid ${colors.border}`,
            }}>
              <p style={{ color: colors.white, fontSize: 17, fontWeight: 800, margin: '0 0 2px' }}>{s.value}</p>
              <p style={{ color: colors.textDim, fontSize: 10, margin: 0, fontWeight: 500 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SubscriptionCard />

        {/* Goals */}
        <p style={{ color: colors.white, fontSize: 17, fontWeight: 700, margin: '4px 0 0' }}>Your Goals</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <GoalCard icon="⚖️" title="Goal Weight" target={goals.goalWeight ?? 0} current={currentWeight} unit={cfg.weightUnit} color={colors.green} onEdit={() => setSheet('goalWeight')} />
          <GoalCard icon="💪" title="Bench Press" target={goals.benchGoal ?? 0} current={bench} unit="lbs" color={colors.gold} onEdit={() => setSheet('bench')} />
          <GoalCard icon="🔥" title="Streak Goal" target={goals.streakGoal ?? 0} current={streak} unit="days" color={colors.blue} onEdit={() => setSheet('streak')} />
          <GoalCard icon="🥩" title="Weekly Protein" target={targets.protein * 7} current={weekProt} unit="g" color={colors.gold} onEdit={() => setSheet('calc')} />
        </div>

        {/* Calculator */}
        <SettingRowCard>
          <SettingRow icon="🧬" label="Calorie & Macro Calculator" sub={targets.personalized ? 'Targets personalized ✓ — tap to recalculate' : 'Personalize your daily targets'} onClick={() => setSheet('calc')} />
        </SettingRowCard>

        {/* Activity */}
        <p style={{ color: colors.white, fontSize: 17, fontWeight: 700, margin: '4px 0 0' }}>Activity Level</p>
        <Card style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ACTIVITY_LEVELS.map((level) => (
              <button key={level.label} onClick={() => saveConfig({ activity: level.mult, activityLabel: level.label })} style={{
                padding: '8px 14px', borderRadius: radius.full, border: 'none', cursor: 'pointer',
                background: level.label === cfg.activityLabel ? colors.green : 'rgba(255,255,255,0.05)',
                color: level.label === cfg.activityLabel ? '#fff' : colors.textDim,
                fontSize: 12, fontWeight: 600, fontFamily: 'Plus Jakarta Sans, sans-serif',
                transition: 'all 0.15s',
              }}>
                {level.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Notifications */}
        <p style={{ color: colors.white, fontSize: 17, fontWeight: 700, margin: '4px 0 0' }}>Notifications</p>
        <Card style={{ padding: '0 20px' }}>
          <SettingRow icon="🔔" label="All Notifications" sub="In-app reminders (push coming soon)" hasToggle toggleOn={cfg.notifications.all} onToggle={v => setNotif('all', v)} />
          <SettingRow icon="🏋️" label="Workout Reminders" hasToggle toggleOn={cfg.notifications.workout} onToggle={v => setNotif('workout', v)} />
          <SettingRow icon="🍽️" label="Meal Reminders" hasToggle toggleOn={cfg.notifications.meal} onToggle={v => setNotif('meal', v)} />
          <SettingRow icon="📊" label="Weekly Report" hasToggle toggleOn={cfg.notifications.weekly} onToggle={v => setNotif('weekly', v)} />
        </Card>

        {/* Preferences */}
        <p style={{ color: colors.white, fontSize: 17, fontWeight: 700, margin: '4px 0 0' }}>Preferences</p>
        <Card style={{ padding: '0 20px' }}>
          <SettingRow icon="🌙" label="Dark Mode" value="Always on" sub="Light theme coming in a future update" />
          <SettingRow icon="📏" label="Metric Units (kg)" hasToggle toggleOn={cfg.weightUnit === 'kg'} onToggle={v => saveConfig({ weightUnit: v ? 'kg' : 'lbs', metricUnits: v })} />
          <SettingRow icon="♿" label="Reduced Motion" hasToggle toggleOn={cfg.reducedMotion} onToggle={v => {
            saveConfig({ reducedMotion: v })
            document.documentElement.classList.toggle('reduced-motion', v)
          }} />
        </Card>

        {/* Connected */}
        <p style={{ color: colors.white, fontSize: 17, fontWeight: 700, margin: '4px 0 0' }}>Connected Devices</p>
        <Card style={{ padding: '0 20px' }}>
          <SettingRow icon="❤️" label="Apple Health" sub="Coming soon" value="—" />
          <SettingRow icon="⌚" label="Apple Watch" sub="Coming soon" value="—" />
          <SettingRow icon="📡" label="Garmin" sub="Coming soon" value="—" />
        </Card>

        {/* Data */}
        <p style={{ color: colors.white, fontSize: 17, fontWeight: 700, margin: '4px 0 0' }}>Your Data</p>
        <Card style={{ padding: '0 20px' }}>
          <SettingRow icon="📤" label="Export Backup" sub="Download your full history as JSON" onClick={doExport} />
          <SettingRow icon="📥" label="Restore Backup" sub="Import a previously exported file" onClick={() => fileRef.current?.click()} />
          <SettingRow icon="🔒" label="Privacy" value="Local-only" sub="All data stays on this device" />
          <SettingRow icon="🗑️" label="Clear All Data" danger onClick={doClear} />
        </Card>
        <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) doRestore(f); e.target.value = '' }} />

        {/* Version */}
        <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: colors.greenDim, borderRadius: radius.full,
            padding: '6px 16px', marginBottom: 8,
          }}>
            <span style={{ color: colors.green, fontSize: 14, fontWeight: 800 }}>Ascend</span>
          </div>
          <p style={{ color: colors.textDim, fontSize: 12, margin: 0, fontFamily: 'Inter, sans-serif' }}>
            Version 2.0.0 · Build 2026.07
          </p>
        </div>
      </div>

      {sheet === 'name' && <EditNameSheet onClose={() => setSheet('none')} />}
      {sheet === 'calc' && <CalculatorSheet onClose={() => setSheet('none')} />}
      {sheet === 'goalWeight' && <EditNumberSheet title="Goal Weight" placeholder={`Target weight (${cfg.weightUnit})`} initial={goals.goalWeight ? String(goals.goalWeight) : ''} onSave={v => saveGoals({ goalWeight: v })} onClose={() => setSheet('none')} />}
      {sheet === 'bench' && <EditNumberSheet title="Bench Press Goal" placeholder="Target bench (lbs)" initial={goals.benchGoal ? String(goals.benchGoal) : ''} onSave={v => saveGoals({ benchGoal: v })} onClose={() => setSheet('none')} />}
      {sheet === 'streak' && <EditNumberSheet title="Streak Goal" placeholder="Target streak (days)" initial={goals.streakGoal ? String(goals.streakGoal) : ''} onSave={v => saveGoals({ streakGoal: Math.round(v) })} onClose={() => setSheet('none')} />}

      {msg && (
        <div style={{
          position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)',
          background: colors.cardElevated, border: `1px solid ${colors.green}40`,
          borderRadius: radius.full, padding: '10px 20px', color: colors.white,
          fontSize: 13, fontWeight: 600, zIndex: 120, boxShadow: shadow.card,
          animation: 'fadeUp 0.25s ease both', whiteSpace: 'nowrap',
        }} role="status">
          {msg}
        </div>
      )}
    </ScreenShell>
  )
}

function SettingRowCard({ children }: { children: React.ReactNode }) {
  return <Card style={{ padding: '0 20px' }}>{children}</Card>
}
