import { useState, useEffect } from 'react'
import { colors, radius, shadow } from '../design/tokens'
import {
  ArcProgress, ProgressBar, LineChart,
  Card, SectionHeader, Badge, CoachCard, AchievementCard, ScreenShell,
} from '../components/shared'
import { useNav } from '../App'
import { useAppData } from '../lib/useAppData'
import { getConfig, getDay, saveDay, todayKey } from '../lib/store'
import {
  computeDisciplineScore, disciplineAverages, calcStreak, mealTotals, getTargets,
  weekActivity, coachInsights, computeAchievements, greeting,
} from '../lib/engine'
import { TO } from '../lib/exercises'

function fmt(n: number) { return n.toLocaleString() }

// ─── Discipline Score ─────────────────────────────────────────────────────────

function DisciplineScore() {
  const { score } = computeDisciplineScore(todayKey())
  const { weeklyAvg, monthlyBest, monthAvg } = disciplineAverages()
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
  }, [score])

  const scoreColor = score >= 80 ? colors.green : score >= 60 ? colors.gold : score > 0 ? colors.danger : colors.textDim
  const insight = score >= 80
    ? 'Elite consistency. Keep this up and the results take care of themselves.'
    : score >= 60
      ? 'Strong day so far. Close out the remaining habits to push higher.'
      : score > 0
        ? 'Every logged habit lifts this score — workout, water, protein, sleep, steps.'
        : 'Log today\u2019s workout, meals, and water — your score builds as you go.'

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
            { label: 'Monthly Best', value: monthlyBest, color: colors.gold },
            { label: 'This Month', value: monthAvg, color: colors.green },
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
          {insight}
        </p>
      </div>
    </Card>
  )
}

// ─── Today's Mission ──────────────────────────────────────────────────────────

function TodaysMission() {
  const nav = useNav()
  const today = getDay(todayKey())
  const started = !!(today.exArr && today.exArr.length)

  // If a workout is in progress, show it; otherwise suggest a session type.
  const title = started ? (today.wType || 'Today\u2019s Workout') : suggestType()
  const exNames = started ? today.exArr!.map(x => x.name) : []
  const chips = started
    ? [...exNames.slice(0, 3), ...(exNames.length > 3 ? [`+${exNames.length - 3}`] : [])]
    : ['Pick exercises', 'Log sets', 'Track PRs']
  const doneSets = started ? today.exArr!.reduce((a, x) => a + x.sets.filter(s => s.done).length, 0) : 0
  const totalSets = started ? today.exArr!.reduce((a, x) => a + x.sets.length, 0) : 0
  const sub = started
    ? `${exNames.length} exercise${exNames.length === 1 ? '' : 's'} · ${doneSets}/${totalSets} sets done`
    : 'Build today\u2019s session in the Workout tab'

  function suggestType() {
    // Rotate through workout types by weekday for a simple default suggestion.
    const types = Object.keys(TO)
    return types[new Date().getDay() % types.length] || 'Full Body'
  }

  return (
    <Card style={{ padding: '20px' }} glowColor={colors.greenDim} animDelay={60}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <p style={{ color: colors.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>
            Today's Mission
          </p>
          <h3 style={{ color: colors.white, fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
            {title}
          </h3>
          <p style={{ color: colors.textMuted, fontSize: 12.5, margin: '4px 0 0', fontFamily: 'Inter, sans-serif' }}>
            {sub}
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

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {chips.map((ex, i) => (
          <span key={i} style={{
            background: 'rgba(255,255,255,0.05)', borderRadius: radius.sm,
            padding: '4px 10px', fontSize: 11, color: colors.textMuted, fontWeight: 500,
          }}>
            {ex}
          </span>
        ))}
      </div>

      <button onClick={() => nav('workout')} style={{
        width: '100%', background: colors.green, borderRadius: radius.md,
        border: 'none', padding: '13px', color: '#fff',
        fontSize: 14, fontWeight: 700, cursor: 'pointer',
        fontFamily: 'Plus Jakarta Sans, sans-serif', boxShadow: shadow.green,
        letterSpacing: '-0.1px',
      }}>
        {started ? 'Continue Workout →' : 'Start Workout →'}
      </button>
    </Card>
  )
}

// ─── Quick Stats Row ──────────────────────────────────────────────────────────

function QuickStats() {
  const today = getDay(todayKey())
  const targets = getTargets()
  const totals = mealTotals(today.mealArr)
  const kcalLeft = Math.max(0, targets.calories - Math.round(totals.cal))
  const streak = calcStreak()
  const stats = [
    { label: 'Kcal Left', value: fmt(kcalLeft), color: colors.green, icon: '🔥' },
    { label: 'Protein', value: `${Math.round(totals.prot)}g`, color: colors.gold, icon: '🥩' },
    { label: 'Streak', value: `${streak}d`, color: colors.blue, icon: '⚡' },
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
// Rule-based readiness from what's logged today — no wearable data is invented.

function RecoveryCard() {
  const cfg = getConfig()
  const e = getDay(todayKey())
  let score = 70
  const notes: string[] = []
  if (e.cSleep) {
    const s = parseFloat(e.cSleep)
    notes.push(`${s}h sleep`)
    if (s >= 7.5) score += 20; else if (s >= 6.5) score += 8; else score -= 15
  }
  if (e.mood === 'Tired') { score -= 10; notes.push('feeling tired') }
  else if (e.mood === 'Strong' || e.mood === 'Beast') { score += 8 }
  if (e.water && cfg.waterGoal && e.water >= cfg.waterGoal * 0.5) score += 5
  score = Math.max(10, Math.min(98, score))
  const hasInputs = !!(e.cSleep || e.mood)
  const msg = !hasInputs
    ? 'Log sleep and mood in your check-in to compute readiness.'
    : score >= 75 ? 'Good recovery. Your body is ready for a hard session.'
      : score >= 55 ? 'Moderate recovery. Train, but keep intensity in check.'
        : 'Low recovery signals. Consider a lighter session or rest.'

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
            <p style={{ color: colors.textMuted, fontSize: 11, margin: 0, fontFamily: 'Inter, sans-serif' }}>
              {hasInputs ? notes.join(' · ') : 'Based on your daily check-in'}
            </p>
          </div>
        </div>
        <div style={{
          background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)',
          borderRadius: radius.full, padding: '4px 12px',
          color: colors.blue, fontSize: 12, fontWeight: 700,
        }}>
          {hasInputs ? `${score}%` : '—'}
        </div>
      </div>
      <ProgressBar value={hasInputs ? score : 0} max={100} color={colors.blue} height={5} />
      <p style={{ color: colors.textDim, fontSize: 12, margin: '10px 0 0', fontFamily: 'Inter, sans-serif' }}>
        {msg}
      </p>
    </Card>
  )
}

// ─── Weekly Activity ──────────────────────────────────────────────────────────

function WeeklyActivity() {
  const wa = weekActivity()

  return (
    <Card style={{ padding: '20px' }} animDelay={120}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ color: colors.white, fontSize: 15, fontWeight: 700, margin: 0 }}>Weekly Activity</p>
        <span style={{ color: colors.textDim, fontSize: 12, fontFamily: 'Inter, sans-serif' }}>{wa.count} / 7 days</span>
      </div>

      <LineChart data={wa.scores.some(s => s > 0) ? wa.scores : [0, 0, 0, 0, 0, 0, 0]} color={colors.green} height={72} />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
        {wa.days.map((d, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: d.done
                ? (d.isToday ? colors.green : `${colors.green}30`)
                : 'rgba(255,255,255,0.04)',
              border: d.isToday ? `1px solid ${colors.green}` : '1px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {d.done && (
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <path d="M2 5.5L4 7.5L8 3" stroke={d.isToday ? '#fff' : colors.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              )}
            </div>
            <span style={{ color: d.isToday ? colors.white : colors.textDim, fontSize: 10, fontWeight: d.isToday ? 700 : 400 }}>{d.label}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── Daily Check-in ───────────────────────────────────────────────────────────

function DailyCheckin() {
  const today = getDay(todayKey())
  const moods = [
    { emoji: '😴', label: 'Tired' },
    { emoji: '😐', label: 'Okay' },
    { emoji: '🙂', label: 'Good' },
    { emoji: '💪', label: 'Strong' },
    { emoji: '🔥', label: 'Beast' },
  ]
  const selected = moods.findIndex(m => m.label === today.mood)
  const [sleep, setSleep] = useState(today.cSleep ?? '')
  const [steps, setSteps] = useState(today.cSteps ?? '')

  const inputStyle: React.CSSProperties = {
    flex: 1, background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.border}`,
    borderRadius: radius.md, padding: '10px 12px', color: colors.white,
    fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none', minWidth: 0,
  }

  return (
    <Card style={{ padding: '18px 20px' }} animDelay={140}>
      <p style={{ color: colors.white, fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>Daily Check-in</p>
      <p style={{ color: colors.textMuted, fontSize: 12, margin: '0 0 14px', fontFamily: 'Inter, sans-serif' }}>
        How are you feeling today?
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        {moods.map((m, i) => (
          <button key={i} onClick={() => saveDay(todayKey(), { mood: m.label })} style={{
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
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          style={inputStyle} inputMode="decimal" placeholder="Sleep (hrs)"
          value={sleep} onChange={e => setSleep(e.target.value)}
          onBlur={() => saveDay(todayKey(), { cSleep: sleep })}
        />
        <input
          style={inputStyle} inputMode="numeric" placeholder="Steps"
          value={steps} onChange={e => setSteps(e.target.value)}
          onBlur={() => saveDay(todayKey(), { cSteps: steps })}
        />
      </div>
    </Card>
  )
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

const ACCENTS = { green: colors.green, gold: colors.gold, blue: colors.blue, violet: colors.violet }
const ACCENT_ICONS = { green: '🔥', gold: '🎯', blue: '💡', violet: '📈' }

export default function HomeScreen() {
  useAppData()
  const cfg = getConfig()
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const name = cfg.name?.trim() || ''
  const insights = coachInsights()
  const achievements = computeAchievements()
  const topAchievements = [...achievements].sort((a, b) => Number(b.unlocked) - Number(a.unlocked)).slice(0, 4)

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
              {greeting()},{name ? <><br /><span style={{ color: colors.green }}>{name}.</span></> : ''}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #22C55E, #16A34A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: shadow.green, flexShrink: 0,
            }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{(name[0] || 'A').toUpperCase()}</span>
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

        <SectionHeader title="Coach Insights" action={
          <span style={{ color: colors.textDim, fontSize: 12, fontFamily: 'Inter, sans-serif' }}>From your data</span>
        } delay={160} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {insights.map((c, i) => (
            <CoachCard key={i} text={c.text} accent={ACCENTS[c.accent]} icon={<span style={{ fontSize: 16 }}>{ACCENT_ICONS[c.accent]}</span>} delay={200 + i * 60} />
          ))}
        </div>

        <SectionHeader title="Recent Achievements" delay={320} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {topAchievements.map((a, i) => (
            <AchievementCard key={a.id} icon={a.icon} title={a.title} desc={a.desc} unlocked={a.unlocked} delay={340 + i * 60} />
          ))}
        </div>

        <DailyCheckin />
      </div>
    </ScreenShell>
  )
}
