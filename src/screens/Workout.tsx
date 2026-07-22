import { useState, useEffect, useRef } from 'react'
import { colors, radius, shadow } from '../design/tokens'
import { Card, SectionHeader, ProgressBar, GhostBtn, EmptyState, ScreenShell } from '../components/shared'

// ─── Rest Timer ───────────────────────────────────────────────────────────────

function RestTimer({ onDone }: { onDone: () => void }) {
  const [seconds, setSeconds] = useState(90)
  const [running, setRunning] = useState(true)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running && seconds > 0) {
      ref.current = setInterval(() => setSeconds((s) => s - 1), 1000)
    } else if (seconds === 0) {
      setRunning(false)
      onDone()
    }
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [running, seconds, onDone])

  const total = 90
  const pct = ((total - seconds) / total) * 100
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(56,189,248,0.1), rgba(56,189,248,0.04))',
      border: `1px solid rgba(56,189,248,0.2)`, borderRadius: radius.xl,
      padding: '20px', textAlign: 'center',
    }}>
      <p style={{ color: colors.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>
        Rest Timer
      </p>
      <p style={{ color: colors.blue, fontSize: 48, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-2px', lineHeight: 1 }}>
        {mins}:{secs.toString().padStart(2, '0')}
      </p>
      <ProgressBar value={pct} max={100} color={colors.blue} height={5} />
      <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'center' }}>
        <button onClick={() => setRunning((r) => !r)} style={{
          background: 'rgba(56,189,248,0.12)', border: `1px solid rgba(56,189,248,0.25)`,
          borderRadius: radius.md, padding: '8px 20px', color: colors.blue,
          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif',
        }}>
          {running ? 'Pause' : 'Resume'}
        </button>
        <button onClick={onDone} style={{
          background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.border}`,
          borderRadius: radius.md, padding: '8px 20px', color: colors.textMuted,
          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif',
        }}>
          Skip
        </button>
      </div>
    </div>
  )
}

// ─── Exercise Row ─────────────────────────────────────────────────────────────

interface Set { weight: number; reps: number; done: boolean }
interface Exercise { id: number; name: string; sets: Set[]; pr?: boolean; note?: string }

function ExerciseRow({ ex, onToggleSet }: { ex: Exercise; onToggleSet: (exId: number, setIdx: number) => void }) {
  const [expanded, setExpanded] = useState(false)
  const doneSets = ex.sets.filter((s) => s.done).length

  return (
    <div style={{
      background: colors.card, borderRadius: radius.lg,
      border: `1px solid ${colors.border}`, overflow: 'hidden',
    }}>
      <button onClick={() => setExpanded((e) => !e)} style={{
        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
        padding: '16px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: doneSets === ex.sets.length ? colors.greenDim : 'rgba(255,255,255,0.05)',
          border: `1px solid ${doneSets === ex.sets.length ? colors.green + '40' : colors.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {doneSets === ex.sets.length
            ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L5.5 10L11.5 4" stroke={colors.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            : <span style={{ fontSize: 14, color: colors.textDim, fontWeight: 700 }}>{doneSets}/{ex.sets.length}</span>
          }
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ color: colors.white, fontSize: 14, fontWeight: 700, margin: 0 }}>{ex.name}</p>
            {ex.pr && (
              <span style={{
                background: colors.goldDim, border: `1px solid ${colors.gold}30`,
                borderRadius: radius.full, padding: '1px 7px', fontSize: 10,
                color: colors.gold, fontWeight: 700,
              }}>PR</span>
            )}
          </div>
          <p style={{ color: colors.textMuted, fontSize: 12, margin: '2px 0 0', fontFamily: 'Inter, sans-serif' }}>
            {ex.sets.length} sets · {ex.sets[0].reps} reps · {ex.sets[0].weight} lbs
          </p>
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={colors.textDim} strokeWidth="1.5" strokeLinecap="round"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${colors.border}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 44px', gap: 0, marginBottom: 8, paddingTop: 12 }}>
            {['Set', 'Weight', 'Reps', ''].map((h) => (
              <span key={h} style={{ color: colors.textDim, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>{h}</span>
            ))}
          </div>
          {ex.sets.map((set, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '40px 1fr 1fr 44px',
              alignItems: 'center', padding: '8px 0',
              borderTop: i > 0 ? `1px solid ${colors.border}` : 'none',
              opacity: set.done ? 0.6 : 1,
              transition: 'opacity 0.2s',
            }}>
              <span style={{ color: colors.textDim, fontSize: 13, fontWeight: 600 }}>{i + 1}</span>
              <span style={{ color: colors.white, fontSize: 14, fontWeight: 700 }}>{set.weight} lbs</span>
              <span style={{ color: colors.white, fontSize: 14, fontWeight: 700 }}>{set.reps}</span>
              <button onClick={() => onToggleSet(ex.id, i)} style={{
                width: 32, height: 32, borderRadius: 9,
                background: set.done ? colors.greenDim : 'rgba(255,255,255,0.05)',
                border: `1px solid ${set.done ? colors.green + '40' : colors.border}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>
                {set.done
                  ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke={colors.green} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  : <div style={{ width: 6, height: 6, borderRadius: '50%', background: colors.textDim }} />
                }
              </button>
            </div>
          ))}
          {ex.note && (
            <p style={{ color: colors.textDim, fontSize: 12, margin: '8px 0 0', fontFamily: 'Inter, sans-serif', fontStyle: 'italic' }}>
              Note: {ex.note}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Workout Template Card ────────────────────────────────────────────────────

function TemplateCard({ name, tags, duration, difficulty, emoji }: {
  name: string; tags: string[]; duration: string; difficulty: string; emoji: string
}) {
  const diffColor = difficulty === 'Hard' ? colors.danger : difficulty === 'Moderate' ? colors.gold : colors.green
  return (
    <div style={{
      background: colors.card, borderRadius: radius.lg, padding: '16px',
      border: `1px solid ${colors.border}`, display: 'flex', gap: 14, alignItems: 'center',
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: 13, background: colors.greenDim,
        border: `1px solid ${colors.green}25`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 22, flexShrink: 0,
      }}>
        {emoji}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ color: colors.white, fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>{name}</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {tags.map((t) => (
            <span key={t} style={{
              background: 'rgba(255,255,255,0.05)', borderRadius: radius.sm,
              padding: '2px 8px', fontSize: 10, color: colors.textMuted, fontWeight: 500,
            }}>{t}</span>
          ))}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ color: colors.textMuted, fontSize: 11, margin: '0 0 3px', fontFamily: 'Inter, sans-serif' }}>{duration}</p>
        <span style={{
          background: `${diffColor}15`, border: `1px solid ${diffColor}30`,
          borderRadius: radius.full, padding: '2px 8px', fontSize: 10,
          color: diffColor, fontWeight: 600,
        }}>{difficulty}</span>
      </div>
    </div>
  )
}

// ─── Workout Screen ───────────────────────────────────────────────────────────

export default function WorkoutScreen() {
  const [tab, setTab] = useState<'today' | 'library'>('today')
  const [showTimer, setShowTimer] = useState(false)
  const [exercises, setExercises] = useState<Exercise[]>([
    { id: 1, name: 'Bench Press', sets: [{ weight: 185, reps: 8, done: true }, { weight: 185, reps: 8, done: true }, { weight: 185, reps: 6, done: false }, { weight: 175, reps: 8, done: false }], pr: true },
    { id: 2, name: 'Barbell Row', sets: [{ weight: 155, reps: 10, done: false }, { weight: 155, reps: 10, done: false }, { weight: 155, reps: 10, done: false }] },
    { id: 3, name: 'Overhead Press', sets: [{ weight: 115, reps: 8, done: false }, { weight: 115, reps: 8, done: false }, { weight: 105, reps: 10, done: false }] },
    { id: 4, name: 'Pull-ups', sets: [{ weight: 0, reps: 10, done: false }, { weight: 0, reps: 9, done: false }, { weight: 0, reps: 8, done: false }], note: 'Focus on full ROM' },
    { id: 5, name: 'Dips', sets: [{ weight: 25, reps: 12, done: false }, { weight: 25, reps: 12, done: false }, { weight: 25, reps: 10, done: false }] },
    { id: 6, name: 'Face Pulls', sets: [{ weight: 50, reps: 15, done: false }, { weight: 50, reps: 15, done: false }, { weight: 50, reps: 15, done: false }] },
  ])

  const totalSets = exercises.reduce((a, e) => a + e.sets.length, 0)
  const doneSets = exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0)
  const progress = Math.round((doneSets / totalSets) * 100)

  function toggleSet(exId: number, setIdx: number) {
    setExercises((prev) => prev.map((e) =>
      e.id === exId
        ? { ...e, sets: e.sets.map((s, i) => i === setIdx ? { ...s, done: !s.done } : s) }
        : e
    ))
    if (!showTimer) setShowTimer(true)
  }

  const templates = [
    { name: 'Push Day', tags: ['Chest', 'Shoulders', 'Triceps'], duration: '50 min', difficulty: 'Moderate', emoji: '💪' },
    { name: 'Pull Day', tags: ['Back', 'Biceps', 'Rear Delts'], duration: '55 min', difficulty: 'Moderate', emoji: '🏋️' },
    { name: 'Leg Day', tags: ['Quads', 'Hamstrings', 'Glutes'], duration: '60 min', difficulty: 'Hard', emoji: '🦵' },
    { name: 'Full Body', tags: ['Compound', 'Balanced'], duration: '45 min', difficulty: 'Moderate', emoji: '⚡' },
    { name: 'Core & Cardio', tags: ['Abs', 'HIIT', 'Endurance'], duration: '30 min', difficulty: 'Easy', emoji: '🔥' },
  ]

  return (
    <ScreenShell>
      {/* Header */}
      <div style={{ padding: '56px 24px 20px', animation: 'fadeUp 0.4s ease both' }}>
        <h1 style={{ color: colors.white, fontSize: 26, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
          Workout
        </h1>
        <p style={{ color: colors.textMuted, fontSize: 13, margin: 0, fontFamily: 'Inter, sans-serif' }}>
          Friday · Upper Body Strength
        </p>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{
          display: 'flex', background: 'rgba(255,255,255,0.04)',
          borderRadius: radius.lg, padding: 4,
        }}>
          {(['today', 'library'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '9px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: tab === t ? colors.card : 'transparent',
              color: tab === t ? colors.white : colors.textDim,
              fontSize: 13, fontWeight: tab === t ? 700 : 500,
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              boxShadow: tab === t ? shadow.card : 'none',
              transition: 'all 0.2s',
            }}>
              {t === 'today' ? "Today's Workout" : 'Library'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {tab === 'today' ? (
          <>
            {/* Progress header */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.04))',
              border: `1px solid ${colors.green}25`, borderRadius: radius.xl, padding: '18px 20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <p style={{ color: colors.white, fontSize: 16, fontWeight: 700, margin: '0 0 2px' }}>
                    Upper Body Strength
                  </p>
                  <p style={{ color: colors.textMuted, fontSize: 12, margin: 0, fontFamily: 'Inter, sans-serif' }}>
                    {doneSets} / {totalSets} sets complete
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: colors.green, fontSize: 22, fontWeight: 800, margin: 0 }}>{progress}%</p>
                  <p style={{ color: colors.textDim, fontSize: 11, margin: '2px 0 0' }}>complete</p>
                </div>
              </div>
              <ProgressBar value={doneSets} max={totalSets} color={colors.green} />
              <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                {[
                  { label: 'Volume', value: '8,420 lbs' },
                  { label: 'Duration', value: '34 min' },
                  { label: 'Exercises', value: '6' },
                ].map((s) => (
                  <div key={s.label}>
                    <p style={{ color: colors.white, fontSize: 13, fontWeight: 700, margin: 0 }}>{s.value}</p>
                    <p style={{ color: colors.textDim, fontSize: 11, margin: '2px 0 0' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {showTimer && <RestTimer onDone={() => setShowTimer(false)} />}

            <SectionHeader title="Exercises" action={
              <GhostBtn label="+ Add" color={colors.green} />
            } />

            {exercises.map((ex) => (
              <ExerciseRow key={ex.id} ex={ex} onToggleSet={toggleSet} />
            ))}

            {/* Finish button */}
            <button style={{
              width: '100%', background: colors.green, borderRadius: radius.lg,
              border: 'none', padding: '15px', color: '#fff',
              fontSize: 15, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'Plus Jakarta Sans, sans-serif', boxShadow: shadow.green,
              letterSpacing: '-0.2px',
            }}>
              {progress === 100 ? '🏆 Finish Workout' : `Finish Workout (${progress}% done)`}
            </button>

            {/* Personal Records */}
            <SectionHeader title="Personal Records" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { lift: 'Bench Press', value: '225 lbs', date: '2 weeks ago' },
                { lift: 'Squat', value: '315 lbs', date: '1 month ago' },
                { lift: 'Deadlift', value: '365 lbs', date: '3 weeks ago' },
                { lift: 'OHP', value: '145 lbs', date: '1 week ago' },
              ].map((pr) => (
                <div key={pr.lift} style={{
                  background: 'linear-gradient(135deg, rgba(251,191,36,0.06), #151E32)',
                  borderRadius: radius.lg, padding: '14px',
                  border: `1px solid ${colors.goldDim}`,
                }}>
                  <p style={{ color: colors.textMuted, fontSize: 11, margin: '0 0 4px' }}>{pr.lift}</p>
                  <p style={{ color: colors.gold, fontSize: 18, fontWeight: 800, margin: '0 0 3px' }}>{pr.value}</p>
                  <p style={{ color: colors.textDim, fontSize: 11, margin: 0, fontFamily: 'Inter, sans-serif' }}>{pr.date}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <SectionHeader title="Workout Library" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {templates.map((t) => (
                <TemplateCard key={t.name} {...t} />
              ))}
            </div>
            <EmptyState
              icon="🏗️"
              title="Build a custom workout"
              body="Create your own routine tailored to your goals and schedule."
              cta="Create Workout"
            />
          </>
        )}
      </div>
    </ScreenShell>
  )
}
