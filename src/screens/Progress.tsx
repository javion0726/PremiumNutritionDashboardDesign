import { useState } from 'react'
import { colors, radius } from '../design/tokens'
import { LineChart, ProgressBar, Card, SectionHeader, AchievementCard, EmptyState, ScreenShell } from '../components/shared'
import { useAppData } from '../lib/useAppData'
import { getMeasurements, getJournal, daysAgoKey, fmtKey } from '../lib/store'
import {
  calcStreak, calcLongestStreak, computeAchievements, consistencyGrid,
  strengthHistory, bestSets, mealTotals, getTargets, workoutStats, relativeDate,
} from '../lib/engine'

function fmt1(n: number) { return (Math.round(n * 10) / 10).toString() }

// ─── Weight Chart ─────────────────────────────────────────────────────────────

const PERIOD_DAYS = { '1M': 30, '3M': 90, '6M': 182, '1Y': 365 } as const

function WeightChart() {
  const [period, setPeriod] = useState<'1M' | '3M' | '6M' | '1Y'>('3M')
  const meas = getMeasurements()
    .filter(m => m.weight)
    .map(m => ({ date: m.date, weight: parseFloat(m.weight!), wu: m.wu || 'lbs' }))
    .sort((a, b) => a.date.localeCompare(b.date))

  if (meas.length < 2) {
    return (
      <Card style={{ padding: '20px' }}>
        <p style={{ color: colors.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 10px' }}>Body Weight</p>
        <EmptyState icon="⚖️" title="Log your weight to see trends" body="Add at least two weight entries in Profile → Body Measurements to unlock this chart." />
      </Card>
    )
  }

  const cutoff = fmtKey(new Date(Date.now() - PERIOD_DAYS[period] * 864e5))
  const windowed = meas.filter(m => m.date >= cutoff)
  const shown = windowed.length >= 2 ? windowed : meas.slice(-2)
  const data = shown.map(m => m.weight)
  const current = data[data.length - 1]
  const start = data[0]
  const change = (current - start).toFixed(1)
  const isLoss = parseFloat(change) < 0
  const unit = shown[0].wu

  // Sparse labels along the range
  const labelCount = Math.min(5, shown.length)
  const labels = Array.from({ length: labelCount }, (_, i) => {
    const idx = Math.round((i / (labelCount - 1 || 1)) * (shown.length - 1))
    return new Date(shown[idx].date).toLocaleDateString('en-US', { month: 'short', day: shown.length <= 12 ? undefined : 'numeric' })
  })

  return (
    <Card style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <p style={{ color: colors.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>Body Weight</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ color: colors.white, fontSize: 30, fontWeight: 800, letterSpacing: '-1px' }}>{fmt1(current)}</span>
            <span style={{ color: colors.textMuted, fontSize: 14 }}>{unit}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{
            display: 'inline-block', background: isLoss ? colors.greenDim : colors.dangerDim,
            border: `1px solid ${isLoss ? colors.green + '40' : colors.danger + '40'}`,
            borderRadius: radius.full, padding: '4px 10px',
            color: isLoss ? colors.green : colors.danger, fontSize: 13, fontWeight: 700,
          }}>
            {isLoss ? '▼' : '▲'} {Math.abs(parseFloat(change))} {unit}
          </span>
          <p style={{ color: colors.textDim, fontSize: 11, margin: '4px 0 0', fontFamily: 'Inter, sans-serif' }}>vs {period} ago</p>
        </div>
      </div>

      <div style={{ margin: '16px 0' }}>
        <LineChart data={data} color={colors.green} height={90} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          {labels.map((l, i) => (
            <span key={i} style={{ color: colors.textDim, fontSize: 10, fontFamily: 'Inter, sans-serif' }}>{l}</span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {(['1M', '3M', '6M', '1Y'] as const).map((p) => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            flex: 1, padding: '7px', borderRadius: radius.sm, border: 'none', cursor: 'pointer',
            background: period === p ? colors.green : 'rgba(255,255,255,0.05)',
            color: period === p ? '#fff' : colors.textDim,
            fontSize: 12, fontWeight: 600, fontFamily: 'Plus Jakarta Sans, sans-serif',
            transition: 'all 0.2s',
          }}>{p}</button>
        ))}
      </div>
    </Card>
  )
}

// ─── Strength Progress ────────────────────────────────────────────────────────

const TRACKED_LIFTS = ['Bench Press', 'Barbell Squat', 'Deadlift', 'Barbell Overhead Press']
const LIFT_LABEL: Record<string, string> = { 'Bench Press': 'Bench Press', 'Barbell Squat': 'Squat', 'Deadlift': 'Deadlift', 'Barbell Overhead Press': 'OHP' }

function StrengthProgress() {
  const lifts = TRACKED_LIFTS.map(name => {
    const hist = strengthHistory(name)
    if (hist.length < 2) return null
    const current = hist[hist.length - 1].weight
    const start = hist[0].weight
    return { name: LIFT_LABEL[name], current, start, data: hist.map(h => h.weight) }
  }).filter((l): l is NonNullable<typeof l> => !!l)

  if (!lifts.length) {
    return (
      <Card style={{ padding: '20px' }}>
        <p style={{ color: colors.white, fontSize: 15, fontWeight: 700, margin: '0 0 10px' }}>Strength Progress</p>
        <EmptyState icon="🏋️" title="Log lifts to track strength" body="Once you've logged the same exercise on two different days with weight, its progress line appears here." />
      </Card>
    )
  }

  return (
    <Card style={{ padding: '20px' }}>
      <p style={{ color: colors.white, fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>Strength Progress</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {lifts.map((lift) => {
          const gain = lift.current - lift.start
          const gainPct = lift.start ? Math.round((gain / lift.start) * 100) : 0
          return (
            <div key={lift.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: colors.white, fontSize: 13, fontWeight: 600 }}>{lift.name}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: gain >= 0 ? colors.green : colors.danger, fontSize: 11, fontWeight: 600 }}>
                    {gain >= 0 ? '+' : ''}{fmt1(gain)} lbs ({gainPct}%)
                  </span>
                  <span style={{ color: colors.white, fontSize: 14, fontWeight: 800 }}>{lift.current}</span>
                </div>
              </div>
              <div style={{ height: 40 }}>
                <LineChart data={lift.data} color={colors.green} height={40} showDots={false} />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ─── Consistency Heatmap ──────────────────────────────────────────────────────

function ConsistencyHeatmap() {
  const { grid, activePct } = consistencyGrid()
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const intensityColor = (v: number) => {
    if (v === 0) return 'rgba(255,255,255,0.05)'
    if (v === 1) return `${colors.green}40`
    if (v === 2) return `${colors.green}80`
    return colors.green
  }

  return (
    <Card style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ color: colors.white, fontSize: 15, fontWeight: 700, margin: 0 }}>Consistency</p>
        <span style={{ color: colors.green, fontSize: 13, fontWeight: 700 }}>{activePct}% active days</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 2 }}>
          {days.map((d, i) => (
            <span key={i} style={{ color: colors.textDim, fontSize: 9, width: 12, lineHeight: '12px', textAlign: 'center' }}>{d}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {Array.from({ length: 12 }, (_, w) => (
            <div key={w} style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              {grid.map((row, d) => (
                <div key={d} style={{
                  height: 12, borderRadius: 3,
                  background: intensityColor(row[w]),
                  boxShadow: row[w] > 0 ? `0 0 4px ${colors.green}20` : 'none',
                }} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, justifyContent: 'flex-end' }}>
        <span style={{ color: colors.textDim, fontSize: 10 }}>Less</span>
        {[0, 1, 2, 3].map((v) => (
          <div key={v} style={{ width: 10, height: 10, borderRadius: 2, background: intensityColor(v) }} />
        ))}
        <span style={{ color: colors.textDim, fontSize: 10 }}>More</span>
      </div>
    </Card>
  )
}

// ─── Milestones (derived from real streak/weight/workout data) ───────────────

function Milestones() {
  const longest = calcLongestStreak()
  const streak = calcStreak()
  const { total } = workoutStats()
  const meas = getMeasurements().filter(m => m.weight).sort((a, b) => a.date.localeCompare(b.date))
  const lost = meas.length >= 2 ? parseFloat(meas[0].weight!) - Math.min(...meas.map(m => parseFloat(m.weight!))) : 0
  const bench = bestSets().get('Bench Press')?.weight ?? 0

  const items: { icon: string; label: string; date: string; done: boolean; progress?: number }[] = []
  if (lost >= 10) {
    const minWeight = Math.min(...meas.map(m => parseFloat(m.weight!)))
    const hitDate = meas.find(m => parseFloat(m.weight!) === minWeight)?.date ?? meas[meas.length - 1].date
    items.push({ icon: '⚖️', label: 'Lost 10 lbs', date: relativeDate(hitDate), done: true })
  } else if (meas.length) {
    items.push({ icon: '⚖️', label: 'Lose 10 lbs', date: 'In progress', done: false, progress: Math.min(1, lost / 10) })
  }

  items.push(total >= 100
    ? { icon: '🏋️', label: '100 Workouts', date: `${total} logged`, done: true }
    : { icon: '🏋️', label: '100 Workouts', date: 'In progress', done: false, progress: total / 100 })

  items.push(bench >= 225
    ? { icon: '💪', label: 'Bench 2-plate', date: `${bench} lbs`, done: true }
    : { icon: '💪', label: 'Bench 2-plate (225 lbs)', date: 'In progress', done: false, progress: bench / 225 })

  items.push(longest >= 30
    ? { icon: '🔥', label: '30-Day Streak', date: `Best: ${longest} days`, done: true }
    : { icon: '🔥', label: '30-Day Streak', date: streak > 0 ? `${streak} days so far` : 'Start today', done: false, progress: streak / 30 })

  return (
    <Card style={{ padding: '20px' }}>
      <p style={{ color: colors.white, fontSize: 15, fontWeight: 700, margin: '0 0 14px' }}>Milestones</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((m, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: m.done ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${m.done ? 'rgba(251,191,36,0.3)' : colors.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              filter: m.done ? 'none' : 'grayscale(0.7) opacity(0.6)',
            }}>
              {m.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: m.progress != null ? 5 : 0 }}>
                <span style={{ color: m.done ? colors.white : colors.textMuted, fontSize: 13, fontWeight: 600 }}>{m.label}</span>
                <span style={{ color: m.done ? colors.gold : colors.textDim, fontSize: 11, fontFamily: 'Inter, sans-serif' }}>
                  {m.done ? `✓ ${m.date}` : m.date}
                </span>
              </div>
              {m.progress != null && !m.done && (
                <ProgressBar value={Math.max(0, Math.min(1, m.progress)) * 100} max={100} color={colors.green} height={4} />
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── Weekly Report ────────────────────────────────────────────────────────────

function WeeklyReport() {
  const j = getJournal()
  const targets = getTargets()
  const weekKeys = Array.from({ length: 7 }, (_, i) => daysAgoKey(i))
  const workoutsThisWeek = weekKeys.filter(k => j[k]?.exArr?.some(x => x.sets.some(s => s.done))).length
  const calDays = weekKeys.map(k => mealTotals(j[k]?.mealArr).cal).filter(c => c > 0)
  const protDays = weekKeys.map(k => mealTotals(j[k]?.mealArr).prot).filter(p => p > 0)
  const avgCal = calDays.length ? Math.round(calDays.reduce((a, b) => a + b, 0) / calDays.length) : 0
  const avgProt = protDays.length ? Math.round(protDays.reduce((a, b) => a + b, 0) / protDays.length) : 0

  const meas = getMeasurements().filter(m => m.weight && m.date >= daysAgoKey(7)).sort((a, b) => a.date.localeCompare(b.date))
  const weightDelta = meas.length >= 2 ? (parseFloat(meas[meas.length - 1].weight!) - parseFloat(meas[0].weight!)) : null

  const stats = [
    { label: 'Workouts', value: String(workoutsThisWeek), sub: 'this week', color: colors.green },
    { label: 'Avg Calories', value: avgCal ? avgCal.toLocaleString() : '—', sub: avgCal ? 'kcal/day' : 'No meals logged', color: colors.blue },
    { label: 'Protein Avg', value: avgProt ? `${avgProt}g` : '—', sub: avgProt ? `of ${targets.protein}g goal` : 'No meals logged', color: colors.gold },
    { label: 'Weight Δ', value: weightDelta !== null ? (weightDelta >= 0 ? `+${fmt1(weightDelta)}` : fmt1(weightDelta)) : '—', sub: weightDelta !== null ? 'lbs this week' : 'Not enough data', color: colors.green },
  ]

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(56,189,248,0.04))',
      border: `1px solid ${colors.green}20`, borderRadius: radius.xl, padding: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 20 }}>📋</span>
        <p style={{ color: colors.white, fontSize: 15, fontWeight: 700, margin: 0 }}>This Week's Report</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {stats.map((s) => (
          <div key={s.label} style={{
            background: 'rgba(255,255,255,0.03)', borderRadius: radius.md, padding: '12px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ color: s.color, fontSize: 20, fontWeight: 800, margin: '0 0 2px' }}>{s.value}</p>
            <p style={{ color: colors.textMuted, fontSize: 11, margin: '0 0 2px', fontWeight: 600 }}>{s.label}</p>
            <p style={{ color: colors.textDim, fontSize: 11, margin: 0, fontFamily: 'Inter, sans-serif' }}>{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Body Measurements summary ────────────────────────────────────────────────

function BodyMeasurements() {
  const meas = getMeasurements()
  if (!meas.length) {
    return (
      <Card style={{ padding: '20px' }}>
        <EmptyState icon="📏" title="No measurements yet" body="Log your weight and body measurements in Profile to see trends here." />
      </Card>
    )
  }
  const sorted = [...meas].sort((a, b) => a.date.localeCompare(b.date))
  const first = sorted[0], last = sorted[sorted.length - 1]

  function metric(label: string, key: keyof typeof first, unit: string) {
    const lv = last[key], fv = first[key]
    if (!lv) return null
    const delta = fv && lv ? (parseFloat(String(lv)) - parseFloat(String(fv))) : null
    return (
      <div key={label} style={{ textAlign: 'center' }}>
        <p style={{ color: colors.white, fontSize: 18, fontWeight: 800, margin: 0, lineHeight: 1 }}>
          {lv}<span style={{ fontSize: 11, color: colors.textMuted, fontWeight: 400 }}> {unit}</span>
        </p>
        <p style={{ color: colors.textMuted, fontSize: 11, margin: '3px 0 3px', fontWeight: 500 }}>{label}</p>
        {delta !== null && (
          <p style={{ color: delta <= 0 ? colors.green : colors.gold, fontSize: 10, margin: 0, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
            {delta >= 0 ? '+' : ''}{fmt1(delta)}
          </p>
        )}
      </div>
    )
  }

  const cells = [
    metric('Weight', 'weight', last.wu || 'lbs'),
    metric('Body Fat', 'fat', '%'),
    metric('Waist', 'waist', last.mu || 'in'),
    metric('Chest', 'chest', last.mu || 'in'),
    metric('Arms', 'arms', last.mu || 'in'),
    metric('Hips', 'hips', last.mu || 'in'),
  ].filter(Boolean)

  return (
    <Card style={{ padding: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {cells}
      </div>
    </Card>
  )
}

// ─── Progress Screen ──────────────────────────────────────────────────────────

export default function ProgressScreen() {
  useAppData()
  const achievements = computeAchievements()
  const unlockedCount = achievements.filter(a => a.unlocked).length

  return (
    <ScreenShell>
      <div style={{ padding: '56px 24px 20px', animation: 'fadeUp 0.4s ease both' }}>
        <h1 style={{ color: colors.white, fontSize: 26, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
          Progress
        </h1>
        <p style={{ color: colors.textMuted, fontSize: 13, margin: 0, fontFamily: 'Inter, sans-serif' }}>
          Your journey, quantified.
        </p>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <WeeklyReport />
        <WeightChart />
        <StrengthProgress />
        <ConsistencyHeatmap />
        <Milestones />

        <SectionHeader title="Achievements" action={
          <span style={{ color: colors.textDim, fontSize: 12, fontFamily: 'Inter, sans-serif' }}>{unlockedCount} unlocked</span>
        } />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {achievements.map((a, i) => (
            <AchievementCard key={a.id} icon={a.icon} title={a.title} desc={a.desc} unlocked={a.unlocked} delay={i * 60} />
          ))}
        </div>

        <SectionHeader title="Body Measurements" />
        <BodyMeasurements />
      </div>
    </ScreenShell>
  )
}
