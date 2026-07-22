import { useState } from 'react'
import { colors, radius } from '../design/tokens'
import { LineChart, ProgressBar, Card, SectionHeader, AchievementCard, ScreenShell } from '../components/shared'

// ─── Weight Chart ─────────────────────────────────────────────────────────────

function WeightChart() {
  const [period, setPeriod] = useState<'1M' | '3M' | '6M' | '1Y'>('3M')

  const datasets: Record<string, { data: number[]; labels: string[] }> = {
    '1M': {
      data: [198.4, 197.8, 197.2, 196.9, 196.5, 196.8, 196.2, 195.9, 195.5, 195.2, 195.6, 195.0, 194.8, 194.5, 194.2, 194.6, 194.0, 193.7, 193.5, 193.2, 193.0, 192.8, 192.5, 192.2, 192.0, 191.8, 191.5, 191.2, 191.0, 190.8],
      labels: ['Jun 19', '', '', '', '', 'Jun 24', '', '', '', '', 'Jun 29', '', '', '', '', 'Jul 4', '', '', '', '', 'Jul 9', '', '', '', '', 'Jul 14', '', '', '', 'Jul 19'],
    },
    '3M': {
      data: [204, 202, 200, 199, 198, 197, 196, 195, 194, 193, 192, 191],
      labels: ['Apr', '', '', 'May', '', '', 'Jun', '', '', 'Jul', '', ''],
    },
    '6M': {
      data: [215, 210, 207, 204, 201, 198, 196, 193, 191],
      labels: ['Jan', '', 'Feb', '', 'Mar', '', 'May', '', 'Jul'],
    },
    '1Y': {
      data: [224, 219, 213, 210, 207, 204, 201, 198, 196, 193, 191, 190.8],
      labels: ['Jul\'24', '', 'Sep', '', 'Nov', '', 'Jan', '', 'Mar', '', 'May', 'Jul'],
    },
  }

  const { data, labels } = datasets[period]
  const current = data[data.length - 1]
  const start = data[0]
  const change = (current - start).toFixed(1)
  const isLoss = parseFloat(change) < 0

  return (
    <Card style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <p style={{ color: colors.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>Body Weight</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ color: colors.white, fontSize: 30, fontWeight: 800, letterSpacing: '-1px' }}>{current}</span>
            <span style={{ color: colors.textMuted, fontSize: 14 }}>lbs</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{
            display: 'inline-block', background: isLoss ? colors.greenDim : colors.dangerDim,
            border: `1px solid ${isLoss ? colors.green + '40' : colors.danger + '40'}`,
            borderRadius: radius.full, padding: '4px 10px',
            color: isLoss ? colors.green : colors.danger, fontSize: 13, fontWeight: 700,
          }}>
            {isLoss ? '▼' : '▲'} {Math.abs(parseFloat(change))} lbs
          </span>
          <p style={{ color: colors.textDim, fontSize: 11, margin: '4px 0 0', fontFamily: 'Inter, sans-serif' }}>vs {period} ago</p>
        </div>
      </div>

      <div style={{ margin: '16px 0' }}>
        <LineChart data={data} color={colors.green} height={90} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          {labels.filter(Boolean).slice(0, 5).map((l, i) => (
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

function StrengthProgress() {
  const lifts = [
    { name: 'Bench Press', current: 225, start: 175, unit: 'lbs', data: [175, 185, 195, 200, 205, 215, 220, 225] },
    { name: 'Squat', current: 315, start: 245, unit: 'lbs', data: [245, 260, 270, 280, 290, 300, 310, 315] },
    { name: 'Deadlift', current: 365, start: 275, unit: 'lbs', data: [275, 295, 310, 325, 340, 350, 360, 365] },
    { name: 'OHP', current: 145, start: 105, unit: 'lbs', data: [105, 110, 115, 120, 125, 130, 140, 145] },
  ]

  return (
    <Card style={{ padding: '20px' }}>
      <p style={{ color: colors.white, fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>Strength Progress</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {lifts.map((lift) => {
          const gain = lift.current - lift.start
          const gainPct = Math.round((gain / lift.start) * 100)
          return (
            <div key={lift.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: colors.white, fontSize: 13, fontWeight: 600 }}>{lift.name}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: colors.green, fontSize: 11, fontWeight: 600 }}>+{gain} lbs ({gainPct}%)</span>
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
  // 10 weeks × 7 days
  const weeks = Array.from({ length: 10 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const idx = w * 7 + d
      if (idx > 68) return -1 // future
      return Math.random() > 0.35 ? Math.floor(Math.random() * 3) + 1 : 0
    })
  )
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const intensityColor = (v: number) => {
    if (v === -1) return 'rgba(255,255,255,0.02)'
    if (v === 0) return 'rgba(255,255,255,0.05)'
    if (v === 1) return `${colors.green}40`
    if (v === 2) return `${colors.green}80`
    return colors.green
  }

  return (
    <Card style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ color: colors.white, fontSize: 15, fontWeight: 700, margin: 0 }}>Consistency</p>
        <span style={{ color: colors.green, fontSize: 13, fontWeight: 700 }}>71% active days</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 2 }}>
          {days.map((d, i) => (
            <span key={i} style={{ color: colors.textDim, fontSize: 9, width: 12, lineHeight: '12px', textAlign: 'center' }}>{d}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {weeks.map((week, w) => (
            <div key={w} style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              {week.map((v, d) => (
                <div key={d} style={{
                  height: 12, borderRadius: 3,
                  background: intensityColor(v),
                  boxShadow: v > 0 ? `0 0 4px ${colors.green}20` : 'none',
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

// ─── Milestones ───────────────────────────────────────────────────────────────

function Milestones() {
  const items = [
    { icon: '⚖️', label: 'Lost 10 lbs', date: 'Jun 2', done: true },
    { icon: '🏋️', label: '100 Workouts', date: 'May 18', done: true },
    { icon: '💪', label: 'Bench 2-plate', date: 'Jun 30', done: true },
    { icon: '💧', label: 'Hydration — 30 days', date: 'In progress', done: false, progress: 0.77 },
    { icon: '🔥', label: '30-Day Streak', date: 'In progress', done: false, progress: 0.2 },
    { icon: '⚖️', label: 'Lost 20 lbs total', date: 'Upcoming', done: false, progress: 0.5 },
  ]

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
                <ProgressBar value={m.progress * 100} max={100} color={colors.green} height={4} />
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
  const stats = [
    { label: 'Workouts', value: '5', sub: 'of 6 planned', color: colors.green },
    { label: 'Avg Calories', value: '2,310', sub: 'kcal/day', color: colors.blue },
    { label: 'Protein Avg', value: '142g', sub: 'of 180g goal', color: colors.gold },
    { label: 'Weight Δ', value: '–1.2', sub: 'lbs this week', color: colors.green },
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

// ─── Progress Screen ──────────────────────────────────────────────────────────

export default function ProgressScreen() {
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
          <span style={{ color: colors.textDim, fontSize: 12, fontFamily: 'Inter, sans-serif' }}>12 unlocked</span>
        } />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <AchievementCard icon="🔥" title="7-Day Streak" desc="7 consecutive training days" unlocked delay={0} />
          <AchievementCard icon="💪" title="Bench 2-plate" desc="225 lbs bench press" unlocked delay={60} />
          <AchievementCard icon="💧" title="Hydration Pro" desc="5-day water goal streak" unlocked delay={120} />
          <AchievementCard icon="⚖️" title="First 10 lbs" desc="Lost first 10 lbs" unlocked delay={180} />
          <AchievementCard icon="🏋️" title="Century Club" desc="100 workouts logged" unlocked delay={240} />
          <AchievementCard icon="🥗" title="Macro Master" desc="7-day macro perfection" unlocked={false} delay={300} />
          <AchievementCard icon="🏆" title="PR Week" desc="3 PRs in a single week" unlocked={false} delay={360} />
          <AchievementCard icon="🔥" title="30-Day Streak" desc="30 consecutive days" unlocked={false} delay={420} />
        </div>

        {/* Body stats */}
        <SectionHeader title="Body Measurements" />

        <Card style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              { label: 'Weight', value: '190.8', unit: 'lbs', delta: '–13.2' },
              { label: 'Body Fat', value: '18.4', unit: '%', delta: '–3.1%' },
              { label: 'Muscle', value: '155.6', unit: 'lbs', delta: '+4.8' },
              { label: 'Waist', value: '34.5', unit: 'in', delta: '–2.5' },
              { label: 'Chest', value: '42', unit: 'in', delta: '+0.5' },
              { label: 'Arms', value: '15.2', unit: 'in', delta: '+0.8' },
            ].map((m) => (
              <div key={m.label} style={{ textAlign: 'center' }}>
                <p style={{ color: colors.white, fontSize: 18, fontWeight: 800, margin: 0, lineHeight: 1 }}>
                  {m.value}<span style={{ fontSize: 11, color: colors.textMuted, fontWeight: 400 }}> {m.unit}</span>
                </p>
                <p style={{ color: colors.textMuted, fontSize: 11, margin: '3px 0 3px', fontWeight: 500 }}>{m.label}</p>
                <p style={{ color: colors.green, fontSize: 10, margin: 0, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>{m.delta}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </ScreenShell>
  )
}
