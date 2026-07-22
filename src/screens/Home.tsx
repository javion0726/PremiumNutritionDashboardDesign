import { useState, useEffect } from 'react'
import { colors, radius, shadow } from '../design/tokens'
import {
  ArcProgress, ProgressBar, LineChart,
  Card, SectionHeader, Badge, CoachCard, AchievementCard, ScreenShell,
} from '../components/shared'

function pct(v: number, g: number) { return Math.min(Math.round((v / g) * 100), 100) }
function fmt(n: number) { return n.toLocaleString() }

// ─── Discipline Score ─────────────────────────────────────────────────────────

function DisciplineScore() {
  const score = 82
  const weeklyAvg = 76
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    let frame: number
    const start = performance.now()
    const animate = (now: number) => {
      const t = Math.min((now - start) / 1400, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setDisplayed(Math.round(ease * score))
      if (t < 1) frame = requestAnimationFrame(animate)
    }
    const timeout = setTimeout(() => { frame = requestAnimationFrame(animate) }, 200)
    return () => { clearTimeout(timeout); cancelAnimationFrame(frame) }
  }, [])

  const scoreColor = score >= 80 ? colors.green : score >= 60 ? colors.gold : colors.danger

  return (
    <Card style={{ padding: '24px' }} glowColor={`${scoreColor}12`}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p style={{ color: colors.textMuted, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>
            Discipline Score
          </p>
          <p style={{ color: colors.textDim, fontSize: 12, margin: 0, fontFamily: 'Inter, sans-serif' }}>
            Your consistency, measured daily
          </p>
        </div>
        <Badge label="Today" color={scoreColor} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        <ArcProgress value={score} max={100} size={150} strokeWidth={12} color={scoreColor} trackColor="rgba(255,255,255,0.05)">
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: colors.white, fontSize: 36, fontWeight: 800, margin: 0, lineHeight: 1, letterSpacing: '-1px' }}>
              {displayed}
            </p>
            <p style={{ color: colors.textMuted, fontSize: 11, margin: '4px 0 0', fontWeight: 500 }}>/ 100</p>
          </div>
        </ArcProgress>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: 'Weekly Avg', value: weeklyAvg, color: colors.blue },
            { label: 'Monthly Best', value: 91, color: colors.gold },
            { label: 'This Month', value: 79, color: colors.green },
          ].map((stat) => (
            <div key={stat.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ color: colors.textMuted, fontSize: 11, fontWeight: 500 }}>{stat.label}</span>
                <span style={{ color: stat.color, fontSize: 12, fontWeight: 700 }}>{stat.value}</span>
              </div>
              <ProgressBar value={stat.value} max={100} color={stat.color} height={4} />
            </div>
          ))}
        </div>
      </div>

      <div style={{
        marginTop: 16, padding: '10px 14px', borderRadius: radius.md,
        background: `${scoreColor}0D`, border: `1px solid ${scoreColor}20`,
      }}>
        <p style={{ color: scoreColor, fontSize: 12.5, margin: 0, fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
          {score >= 80
            ? "Elite consistency. You're in the top 12% of Ascend users this week."
            : "Strong week. One more workout keeps your streak alive."}
        </p>
      </div>
    </Card>
  )
}

// ─── Today's Mission ──────────────────────────────────────────────────────────

function TodaysMission() {
  return (
    <Card style={{ padding: '20px' }} glowColor={colors.greenDim} animDelay={60}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <p style={{ color: colors.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>
            Today's Mission
          </p>
          <h3 style={{ color: colors.white, fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
            Upper Body Strength
          </h3>
          <p style={{ color: colors.textMuted, fontSize: 12.5, margin: '4px 0 0', fontFamily: 'Inter, sans-serif' }}>
            6 exercises · ~52 min · Moderate
          </p>
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 13, background: colors.greenDim,
          border: `1px solid ${colors.green}30`, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 20, flexShrink: 0,
        }}>
          💪
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['Bench Press', 'Rows', 'OHP', '+3'].map((ex, i) => (
          <span key={i} style={{
            background: 'rgba(255,255,255,0.05)', borderRadius: radius.sm,
            padding: '4px 10px', fontSize: 11, color: colors.textMuted, fontWeight: 500,
          }}>
            {ex}
          </span>
        ))}
      </div>

      <button style={{
        width: '100%', background: colors.green, borderRadius: radius.md,
        border: 'none', padding: '13px', color: '#fff',
        fontSize: 14, fontWeight: 700, cursor: 'pointer',
        fontFamily: 'Plus Jakarta Sans, sans-serif', boxShadow: shadow.green,
        letterSpacing: '-0.1px',
      }}>
        Start Workout →
      </button>
    </Card>
  )
}

// ─── Quick Stats Row ──────────────────────────────────────────────────────────

function QuickStats() {
  const stats = [
    { label: 'Kcal Left', value: '2,495', color: colors.green, icon: '🔥' },
    { label: 'Protein', value: '92g', color: colors.gold, icon: '🥩' },
    { label: 'Streak', value: '6d', color: colors.blue, icon: '⚡' },
  ]
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {stats.map((s, i) => (
        <div key={s.label} style={{
          flex: 1, background: colors.card, borderRadius: radius.lg,
          padding: '14px 10px', border: `1px solid ${colors.border}`,
          textAlign: 'center',
          animation: `fadeUp 0.5s ease ${80 + i * 60}ms both`,
        }}>
          <span style={{ fontSize: 18, display: 'block', marginBottom: 4 }}>{s.icon}</span>
          <p style={{ color: s.color, fontSize: 17, fontWeight: 800, margin: 0, lineHeight: 1 }}>{s.value}</p>
          <p style={{ color: colors.textDim, fontSize: 10, margin: '4px 0 0', fontWeight: 500 }}>{s.label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Recovery Status ──────────────────────────────────────────────────────────

function RecoveryCard() {
  const score = 74
  return (
    <Card style={{ padding: '18px 20px' }} animDelay={100}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(56,189,248,0.12)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 16,
          }}>
            🌙
          </div>
          <div>
            <p style={{ color: colors.white, fontSize: 14, fontWeight: 700, margin: 0 }}>Recovery Status</p>
            <p style={{ color: colors.textMuted, fontSize: 11, margin: 0, fontFamily: 'Inter, sans-serif' }}>7h 20min sleep · HRV 58ms</p>
          </div>
        </div>
        <div style={{
          background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)',
          borderRadius: radius.full, padding: '4px 12px',
          color: colors.blue, fontSize: 12, fontWeight: 700,
        }}>
          {score}%
        </div>
      </div>
      <ProgressBar value={score} max={100} color={colors.blue} height={5} />
      <p style={{ color: colors.textDim, fontSize: 12, margin: '10px 0 0', fontFamily: 'Inter, sans-serif' }}>
        Good recovery. Your body is ready for a hard session.
      </p>
    </Card>
  )
}

// ─── Weekly Activity ──────────────────────────────────────────────────────────

function WeeklyActivity() {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const values = [85, 92, 0, 78, 88, 45, 0]
  const today = 4

  return (
    <Card style={{ padding: '20px' }} animDelay={120}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ color: colors.white, fontSize: 15, fontWeight: 700, margin: 0 }}>Weekly Activity</p>
        <span style={{ color: colors.textDim, fontSize: 12, fontFamily: 'Inter, sans-serif' }}>5 / 7 days</span>
      </div>

      <LineChart data={[60, 85, 92, 30, 78, 88, 45]} color={colors.green} height={72} />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
        {days.map((d, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: values[i] > 0
                ? (i === today ? colors.green : `${colors.green}30`)
                : 'rgba(255,255,255,0.04)',
              border: i === today ? `1px solid ${colors.green}` : '1px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {values[i] > 0 && (
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <path d="M2 5.5L4 7.5L8 3" stroke={i === today ? '#fff' : colors.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              )}
            </div>
            <span style={{ color: i === today ? colors.white : colors.textDim, fontSize: 10, fontWeight: i === today ? 700 : 400 }}>{d}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── Daily Check-in ───────────────────────────────────────────────────────────

function DailyCheckin() {
  const [selected, setSelected] = useState<number | null>(null)
  const moods = [
    { emoji: '😴', label: 'Tired' },
    { emoji: '😐', label: 'Okay' },
    { emoji: '🙂', label: 'Good' },
    { emoji: '💪', label: 'Strong' },
    { emoji: '🔥', label: 'Beast' },
  ]

  return (
    <Card style={{ padding: '18px 20px' }} animDelay={140}>
      <p style={{ color: colors.white, fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>Daily Check-in</p>
      <p style={{ color: colors.textMuted, fontSize: 12, margin: '0 0 14px', fontFamily: 'Inter, sans-serif' }}>
        How are you feeling today?
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        {moods.map((m, i) => (
          <button key={i} onClick={() => setSelected(i)} style={{
            flex: 1, background: selected === i ? colors.greenDim : 'rgba(255,255,255,0.04)',
            border: `1px solid ${selected === i ? colors.green + '50' : colors.border}`,
            borderRadius: radius.md, padding: '10px 4px', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: 20 }}>{m.emoji}</span>
            <span style={{ fontSize: 10, color: selected === i ? colors.green : colors.textDim, fontWeight: 500 }}>
              {m.label}
            </span>
          </button>
        ))}
      </div>
    </Card>
  )
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <ScreenShell>
      {/* Header */}
      <div style={{
        padding: '56px 24px 20px',
        background: 'linear-gradient(180deg, rgba(34,197,94,0.07) 0%, transparent 100%)',
        animation: 'fadeUp 0.4s ease both',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ color: colors.textMuted, fontSize: 12, fontWeight: 500, margin: '0 0 4px' }}>{today}</p>
            <h1 style={{ color: colors.white, fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.5px', lineHeight: 1.15 }}>
              Good morning,<br /><span style={{ color: colors.green }}>Marcus.</span>
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button style={{
              width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${colors.border}`, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', position: 'relative',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth="2" strokeLinecap="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span style={{
                position: 'absolute', top: 8, right: 8, width: 7, height: 7,
                borderRadius: '50%', background: colors.green, border: '1.5px solid #0B1220',
              }} />
            </button>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #22C55E, #16A34A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: shadow.green, flexShrink: 0,
            }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>M</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <DisciplineScore />
        <TodaysMission />
        <QuickStats />
        <RecoveryCard />
        <WeeklyActivity />

        <SectionHeader title="AI Coach" action={
          <span style={{ color: colors.textDim, fontSize: 12, fontFamily: 'Inter, sans-serif' }}>Powered by Ascend</span>
        } delay={160} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { text: "You're 88g away from your protein goal. A quick shake now keeps your gains on track.", accent: colors.gold, icon: '🎯' },
            { text: "You've hit 5 workouts this week — one more and you match your personal best streak.", accent: colors.green, icon: '🔥' },
            { text: "Your consistency has improved 18% over the last 30 days. The discipline is compounding.", accent: colors.blue, icon: '📈' },
          ].map((c, i) => (
            <CoachCard key={i} text={c.text} accent={c.accent} icon={<span style={{ fontSize: 16 }}>{c.icon}</span>} delay={200 + i * 60} />
          ))}
        </div>

        <SectionHeader title="Recent Achievements" delay={320} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <AchievementCard icon="🔥" title="7-Day Streak" desc="Trained 7 consecutive days" unlocked delay={340} />
          <AchievementCard icon="💧" title="Hydration Hero" desc="Hit water goal 5 days straight" unlocked delay={400} />
          <AchievementCard icon="🏆" title="PR Crusher" desc="3 personal records in one week" unlocked={false} delay={460} />
          <AchievementCard icon="🥗" title="Clean Fueled" desc="Hit all macros for 7 days" unlocked={false} delay={520} />
        </div>

        <DailyCheckin />
      </div>
    </ScreenShell>
  )
}
