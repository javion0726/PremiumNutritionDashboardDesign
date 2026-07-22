import { useState } from 'react'
import { colors, radius, shadow } from '../design/tokens'
import { ProgressBar, Card, ScreenShell } from '../components/shared'

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

function SettingRow({ icon, label, value, hasToggle, toggleOn, onToggle, danger, sub }: {
  icon: string; label: string; value?: string; hasToggle?: boolean
  toggleOn?: boolean; onToggle?: (v: boolean) => void; danger?: boolean; sub?: string
}) {
  return (
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
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({ icon, title, target, current, unit, color }: {
  icon: string; title: string; target: number; current: number; unit: string; color: string
}) {
  const p = Math.min(Math.round((current / target) * 100), 100)
  return (
    <div style={{
      background: colors.card, borderRadius: radius.lg, padding: '14px',
      border: `1px solid ${colors.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <p style={{ color: colors.white, fontSize: 13, fontWeight: 700, margin: 0 }}>{title}</p>
      </div>
      <p style={{ color: color, fontSize: 18, fontWeight: 800, margin: '0 0 4px' }}>
        {current} <span style={{ fontSize: 12, fontWeight: 500, color: colors.textMuted }}>/ {target} {unit}</span>
      </p>
      <ProgressBar value={current} max={target} color={color} height={4} />
      <p style={{ color: colors.textDim, fontSize: 11, margin: '6px 0 0', fontFamily: 'Inter, sans-serif' }}>{p}% to goal</p>
    </div>
  )
}

// ─── Subscription Card ────────────────────────────────────────────────────────

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>⚡</span>
            <p style={{ color: colors.gold, fontSize: 14, fontWeight: 800, margin: 0, letterSpacing: '-0.2px' }}>
              Ascend Pro
            </p>
          </div>
          <p style={{ color: colors.textMuted, fontSize: 13, margin: 0, fontFamily: 'Inter, sans-serif' }}>
            AI coaching · Advanced analytics<br />Unlimited logging · Priority support
          </p>
        </div>
        <div style={{
          background: colors.goldDim, border: `1px solid ${colors.gold}40`,
          borderRadius: radius.full, padding: '4px 10px',
          color: colors.gold, fontSize: 11, fontWeight: 700, flexShrink: 0,
        }}>
          Active
        </div>
      </div>
      <div style={{
        background: 'rgba(251,191,36,0.06)', borderRadius: radius.md, padding: '10px 14px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <p style={{ color: colors.textMuted, fontSize: 12, margin: 0, fontFamily: 'Inter, sans-serif' }}>
          Renews Aug 19, 2026
        </p>
        <p style={{ color: colors.gold, fontSize: 13, fontWeight: 700, margin: 0 }}>$9.99 / mo</p>
      </div>
    </div>
  )
}

// ─── Profile Screen ───────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const [settings, setSettings] = useState({
    notifications: true,
    workoutReminders: true,
    mealReminders: false,
    weeklyReport: true,
    darkMode: true,
    metricUnits: false,
    healthKit: true,
    reducedMotion: false,
  })

  function toggle(key: keyof typeof settings) {
    setSettings((s) => ({ ...s, [key]: !s[key] }))
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
              boxShadow: shadow.green, fontSize: 30,
            }}>
              M
            </div>
            <div style={{
              position: 'absolute', bottom: -2, right: -2, width: 20, height: 20,
              borderRadius: '50%', background: colors.gold,
              border: '2px solid #0B1220', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 10,
            }}>
              ⚡
            </div>
          </div>
          <div>
            <h1 style={{ color: colors.white, fontSize: 22, fontWeight: 800, margin: '0 0 3px', letterSpacing: '-0.3px' }}>
              Marcus Reid
            </h1>
            <p style={{ color: colors.textMuted, fontSize: 13, margin: '0 0 6px', fontFamily: 'Inter, sans-serif' }}>
              marcus@email.com
            </p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: colors.goldDim, border: `1px solid ${colors.gold}30`,
              borderRadius: radius.full, padding: '3px 10px',
            }}>
              <span style={{ color: colors.gold, fontSize: 11, fontWeight: 700 }}>Ascend Pro · 6-day streak 🔥</span>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Workouts', value: '148' },
            { label: 'Since', value: 'Jan 2025' },
            { label: 'lbs Lost', value: '13.2' },
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
          <GoalCard icon="⚖️" title="Goal Weight" target={180} current={190.8} unit="lbs" color={colors.green} />
          <GoalCard icon="💪" title="Bench Press" target={275} current={225} unit="lbs" color={colors.gold} />
          <GoalCard icon="🔥" title="Streak Goal" target={30} current={6} unit="days" color={colors.blue} />
          <GoalCard icon="🥩" title="Weekly Protein" target={1260} current={644} unit="g" color={colors.gold} />
        </div>

        {/* Activity */}
        <p style={{ color: colors.white, fontSize: 17, fontWeight: 700, margin: '4px 0 0' }}>Activity Level</p>
        <Card style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Sedentary', 'Lightly Active', 'Moderate', 'Very Active', 'Athlete'].map((level) => (
              <button key={level} style={{
                padding: '8px 14px', borderRadius: radius.full, border: 'none', cursor: 'pointer',
                background: level === 'Very Active' ? colors.green : 'rgba(255,255,255,0.05)',
                color: level === 'Very Active' ? '#fff' : colors.textDim,
                fontSize: 12, fontWeight: 600, fontFamily: 'Plus Jakarta Sans, sans-serif',
                transition: 'all 0.15s',
              }}>
                {level}
              </button>
            ))}
          </div>
        </Card>

        {/* Notifications */}
        <p style={{ color: colors.white, fontSize: 17, fontWeight: 700, margin: '4px 0 0' }}>Notifications</p>
        <Card style={{ padding: '0 20px' }}>
          <SettingRow icon="🔔" label="All Notifications" hasToggle toggleOn={settings.notifications} onToggle={() => toggle('notifications')} />
          <SettingRow icon="🏋️" label="Workout Reminders" sub="Daily at 6:00 AM" hasToggle toggleOn={settings.workoutReminders} onToggle={() => toggle('workoutReminders')} />
          <SettingRow icon="🍽️" label="Meal Reminders" hasToggle toggleOn={settings.mealReminders} onToggle={() => toggle('mealReminders')} />
          <SettingRow icon="📊" label="Weekly Report" sub="Every Sunday" hasToggle toggleOn={settings.weeklyReport} onToggle={() => toggle('weeklyReport')} />
        </Card>

        {/* Preferences */}
        <p style={{ color: colors.white, fontSize: 17, fontWeight: 700, margin: '4px 0 0' }}>Preferences</p>
        <Card style={{ padding: '0 20px' }}>
          <SettingRow icon="🌙" label="Dark Mode" hasToggle toggleOn={settings.darkMode} onToggle={() => toggle('darkMode')} />
          <SettingRow icon="📏" label="Metric Units" hasToggle toggleOn={settings.metricUnits} onToggle={() => toggle('metricUnits')} />
          <SettingRow icon="♿" label="Reduced Motion" hasToggle toggleOn={settings.reducedMotion} onToggle={() => toggle('reducedMotion')} />
          <SettingRow icon="🎨" label="Theme" value="System Dark" />
        </Card>

        {/* Connected */}
        <p style={{ color: colors.white, fontSize: 17, fontWeight: 700, margin: '4px 0 0' }}>Connected Devices</p>
        <Card style={{ padding: '0 20px' }}>
          <SettingRow icon="❤️" label="Apple Health" hasToggle toggleOn={settings.healthKit} onToggle={() => toggle('healthKit')} />
          <SettingRow icon="⌚" label="Apple Watch" sub="Series 9 · Connected" value="Active" />
          <SettingRow icon="📡" label="Garmin" sub="Not connected" />
          <SettingRow icon="💙" label="Fitbit" sub="Not connected" />
        </Card>

        {/* Account */}
        <p style={{ color: colors.white, fontSize: 17, fontWeight: 700, margin: '4px 0 0' }}>Account</p>
        <Card style={{ padding: '0 20px' }}>
          <SettingRow icon="👤" label="Edit Profile" />
          <SettingRow icon="🔒" label="Privacy" />
          <SettingRow icon="📤" label="Export Data" sub="Download your full history" />
          <SettingRow icon="☁️" label="Backup & Restore" value="Auto" />
          <SettingRow icon="🗑️" label="Delete Account" danger />
        </Card>

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
            Version 1.0.0 · Build 2026.07
          </p>
        </div>
      </div>
    </ScreenShell>
  )
}
