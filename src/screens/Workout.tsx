import { useState, useEffect, useMemo, useRef } from 'react'
import { colors, radius, shadow } from '../design/tokens'
import { SectionHeader, ProgressBar, GhostBtn, EmptyState, ScreenShell } from '../components/shared'
import { useAppData } from '../lib/useAppData'
import { getDay, saveDay, todayKey, type ExEntry, type SetRow } from '../lib/store'
import { bestSets, relativeDate, workoutVolume } from '../lib/engine'
import { EX } from '../lib/exercises'

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

// ─── Exercise Row (persists to today's journal entry) ─────────────────────────

function ExerciseRow({ ex, exIdx, isPR, onChange, onRemove, onSetDone }: {
  ex: ExEntry; exIdx: number; isPR: boolean
  onChange: (exIdx: number, next: ExEntry) => void
  onRemove: (exIdx: number) => void
  onSetDone: () => void
}) {
  const [expanded, setExpanded] = useState(ex.sets.some(s => !s.done))
  const doneSets = ex.sets.filter((s) => s.done).length
  const first = ex.sets[0]

  function updateSet(i: number, patch: Partial<SetRow>) {
    const sets = ex.sets.map((s, idx) => idx === i ? { ...s, ...patch } : s)
    onChange(exIdx, { ...ex, sets })
    if (patch.done === true) onSetDone()
  }
  function addSet() {
    const last = ex.sets[ex.sets.length - 1]
    onChange(exIdx, { ...ex, sets: [...ex.sets, { w: last?.w ?? null, r: last?.r ?? null, done: false }] })
  }
  function removeSet(i: number) {
    if (ex.sets.length <= 1) { onRemove(exIdx); return }
    onChange(exIdx, { ...ex, sets: ex.sets.filter((_, idx) => idx !== i) })
  }

  const numInput: React.CSSProperties = {
    width: '100%', maxWidth: 72, background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${colors.border}`, borderRadius: 8, padding: '6px 8px',
    color: colors.white, fontSize: 14, fontWeight: 700, outline: 'none',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
  }

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
            {isPR && (
              <span style={{
                background: colors.goldDim, border: `1px solid ${colors.gold}30`,
                borderRadius: radius.full, padding: '1px 7px', fontSize: 10,
                color: colors.gold, fontWeight: 700,
              }}>PR</span>
            )}
          </div>
          <p style={{ color: colors.textMuted, fontSize: 12, margin: '2px 0 0', fontFamily: 'Inter, sans-serif' }}>
            {ex.sets.length} set{ex.sets.length === 1 ? '' : 's'}
            {first?.r ? ` · ${first.r} reps` : ''}{first?.w ? ` · ${first.w} lbs` : ''}
          </p>
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={colors.textDim} strokeWidth="1.5" strokeLinecap="round"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${colors.border}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 44px 28px', gap: 8, marginBottom: 8, paddingTop: 12, alignItems: 'center' }}>
            {['Set', 'Weight', 'Reps', '', ''].map((h, i) => (
              <span key={i} style={{ color: colors.textDim, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>{h}</span>
            ))}
          </div>
          {ex.sets.map((set, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '32px 1fr 1fr 44px 28px', gap: 8,
              alignItems: 'center', padding: '6px 0',
              borderTop: i > 0 ? `1px solid ${colors.border}` : 'none',
              opacity: set.done ? 0.65 : 1,
              transition: 'opacity 0.2s',
            }}>
              <span style={{ color: colors.textDim, fontSize: 13, fontWeight: 600 }}>{i + 1}</span>
              <input
                style={numInput} inputMode="decimal" placeholder="lbs"
                value={set.w ?? ''}
                onChange={e => updateSet(i, { w: e.target.value === '' ? null : parseFloat(e.target.value) || 0 })}
              />
              <input
                style={numInput} inputMode="numeric" placeholder="reps"
                value={set.r ?? ''}
                onChange={e => updateSet(i, { r: e.target.value === '' ? null : parseInt(e.target.value) || 0 })}
              />
              <button onClick={() => updateSet(i, { done: !set.done })} style={{
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
              <button onClick={() => removeSet(i)} aria-label="Remove set" style={{
                width: 24, height: 24, borderRadius: 7, background: 'none',
                border: 'none', cursor: 'pointer', color: colors.textDisabled, fontSize: 15,
              }}>×</button>
            </div>
          ))}
          <button onClick={addSet} style={{
            width: '100%', marginTop: 10, padding: '9px', borderRadius: radius.md,
            background: 'rgba(255,255,255,0.04)', border: `1px dashed ${colors.borderHover}`,
            color: colors.textMuted, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
          }}>
            + Add Set
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Exercise Picker (bottom sheet) ───────────────────────────────────────────

function ExercisePicker({ onPick, onClose }: { onPick: (name: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>(Object.keys(EX)[0])
  const cats = Object.keys(EX)
  const list = useMemo(() => {
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      return cats.flatMap(c => EX[c].x.filter(x => x.toLowerCase().includes(q)))
    }
    return EX[cat]?.x ?? []
  }, [query, cat])

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 430, maxHeight: '75vh', overflowY: 'auto',
        background: colors.bgSecondary, borderRadius: `${radius.xl}px ${radius.xl}px 0 0`,
        border: `1px solid ${colors.border}`, padding: '20px 16px 32px',
        animation: 'fadeUp 0.25s ease both',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 16px' }} />
        <p style={{ color: colors.white, fontSize: 17, fontWeight: 700, margin: '0 0 12px' }}>Add Exercise</p>
        <input
          autoFocus placeholder="Search exercises…" value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${colors.border}`, borderRadius: radius.md,
            padding: '11px 14px', color: colors.white, fontSize: 14,
            fontFamily: 'Inter, sans-serif', outline: 'none', marginBottom: 12,
          }}
        />
        {!query.trim() && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, marginBottom: 4 }}>
            {cats.map(c => (
              <button key={c} onClick={() => setCat(c)} style={{
                flexShrink: 0, background: cat === c ? colors.greenDim : 'rgba(255,255,255,0.04)',
                border: `1px solid ${cat === c ? colors.green + '40' : colors.border}`,
                borderRadius: radius.full, padding: '6px 12px',
                color: cat === c ? colors.green : colors.textMuted,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                {EX[c].e} {c}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {list.map(name => (
            <button key={name} onClick={() => onPick(name)} style={{
              textAlign: 'left', background: 'none', border: 'none',
              borderBottom: `1px solid ${colors.border}`, padding: '13px 4px',
              color: colors.white, fontSize: 14, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}>
              {name}
            </button>
          ))}
          {!list.length && (
            <p style={{ color: colors.textDim, fontSize: 13, textAlign: 'center', padding: 24, fontFamily: 'Inter, sans-serif' }}>
              No exercises match "{query}"
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Workout Template Card ────────────────────────────────────────────────────

type Template = { name: string; tags: string[]; exercises: string[]; emoji: string; difficulty: string; wType: string }

const BUILTIN_TEMPLATES: Template[] = [
  { name: 'Push Day', tags: ['Chest', 'Shoulders', 'Triceps'], emoji: '💪', difficulty: 'Moderate', wType: 'Upper Body + Conditioning', exercises: ['Bench Press', 'Incline Dumbbell Press', 'Barbell Overhead Press', 'Lateral Raises', 'Tricep Pushdown', 'Dips'] },
  { name: 'Pull Day', tags: ['Back', 'Biceps', 'Rear Delts'], emoji: '🏋️', difficulty: 'Moderate', wType: 'Upper Body + Conditioning', exercises: ['Barbell Row', 'Lat Pulldown', 'Pull-Ups', 'Face Pulls', 'Barbell Curl', 'Hammer Curl'] },
  { name: 'Leg Day', tags: ['Quads', 'Hamstrings', 'Glutes'], emoji: '🦵', difficulty: 'Hard', wType: 'Lower Body + Core', exercises: ['Barbell Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Walking Lunges', 'Calf Raises'] },
  { name: 'Full Body', tags: ['Compound', 'Balanced'], emoji: '⚡', difficulty: 'Moderate', wType: 'Full Body', exercises: ['Barbell Squat', 'Bench Press', 'Barbell Row', 'Barbell Overhead Press', 'Plank'] },
  { name: 'Core & Cardio', tags: ['Abs', 'HIIT', 'Endurance'], emoji: '🔥', difficulty: 'Easy', wType: 'Full Body', exercises: ['Plank', 'Bicycle Crunches', 'Russian Twists', 'Mountain Climbers', 'Burpees'] },
]

function TemplateCard({ t, onLoad }: { t: Template; onLoad: (t: Template) => void }) {
  const diffColor = t.difficulty === 'Hard' ? colors.danger : t.difficulty === 'Moderate' ? colors.gold : colors.green
  return (
    <button onClick={() => onLoad(t)} style={{
      background: colors.card, borderRadius: radius.lg, padding: '16px', width: '100%',
      border: `1px solid ${colors.border}`, display: 'flex', gap: 14, alignItems: 'center',
      cursor: 'pointer', textAlign: 'left',
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: 13, background: colors.greenDim,
        border: `1px solid ${colors.green}25`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 22, flexShrink: 0,
      }}>
        {t.emoji}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ color: colors.white, fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>{t.name}</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {t.tags.map((tag) => (
            <span key={tag} style={{
              background: 'rgba(255,255,255,0.05)', borderRadius: radius.sm,
              padding: '2px 8px', fontSize: 10, color: colors.textMuted, fontWeight: 500,
            }}>{tag}</span>
          ))}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ color: colors.textMuted, fontSize: 11, margin: '0 0 3px', fontFamily: 'Inter, sans-serif' }}>
          {t.exercises.length} exercises
        </p>
        <span style={{
          background: `${diffColor}15`, border: `1px solid ${diffColor}30`,
          borderRadius: radius.full, padding: '2px 8px', fontSize: 10,
          color: diffColor, fontWeight: 600,
        }}>{t.difficulty}</span>
      </div>
    </button>
  )
}

// ─── Workout Screen ───────────────────────────────────────────────────────────

export default function WorkoutScreen() {
  useAppData()
  const [tab, setTab] = useState<'today' | 'library'>('today')
  const [showTimer, setShowTimer] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [toast, setToast] = useState('')

  const key = todayKey()
  const entry = getDay(key)
  const exercises = entry.exArr ?? []
  const prevBest = useMemo(() => bestSets(), [])

  const totalSets = exercises.reduce((a, e) => a + e.sets.length, 0)
  const doneSets = exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0)
  const progress = totalSets ? Math.round((doneSets / totalSets) * 100) : 0
  const volume = workoutVolume(entry)
  const durationMin = entry.startedAt
    ? Math.max(1, Math.round(((entry.finishedAt ?? Date.now()) - entry.startedAt) / 60000))
    : 0

  function writeExercises(next: ExEntry[]) {
    saveDay(key, { exArr: next, startedAt: entry.startedAt ?? (next.length ? Date.now() : undefined) })
  }
  function changeExercise(i: number, next: ExEntry) {
    writeExercises(exercises.map((e, idx) => idx === i ? next : e))
  }
  function removeExercise(i: number) {
    writeExercises(exercises.filter((_, idx) => idx !== i))
  }
  function addExercise(name: string) {
    setShowPicker(false)
    writeExercises([...exercises, { name, sets: [{ w: null, r: null, done: false }, { w: null, r: null, done: false }, { w: null, r: null, done: false }] }])
  }
  function loadTemplate(t: Template) {
    saveDay(key, {
      wType: t.wType,
      exArr: t.exercises.map(name => ({ name, sets: [{ w: null, r: null, done: false }, { w: null, r: null, done: false }, { w: null, r: null, done: false }] })),
      startedAt: entry.startedAt ?? Date.now(),
    })
    setTab('today')
  }
  function finishWorkout() {
    if (!exercises.length) return
    saveDay(key, { finished: true, finishedAt: Date.now(), wType: entry.wType || 'Full Body' })
    setToast('Workout saved. Streak updated 🔥')
    setTimeout(() => setToast(''), 2500)
  }

  // A live PR badge: today's best done-set for an exercise beats the pre-today best.
  function isTodayPR(ex: ExEntry): boolean {
    const todayMax = Math.max(0, ...ex.sets.filter(s => s.done && s.w).map(s => s.w!))
    const prev = prevBest.get(ex.name)
    return todayMax > 0 && (!prev || (prev.date === key ? true : todayMax > prev.weight))
      && (!prev || prev.date !== key ? todayMax > (prev?.weight ?? 0) : true)
  }

  const prs = [...prevBest.values()].sort((a, b) => b.weight - a.weight).slice(0, 4)
  const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' })

  return (
    <ScreenShell>
      {/* Header */}
      <div style={{ padding: '56px 24px 20px', animation: 'fadeUp 0.4s ease both' }}>
        <h1 style={{ color: colors.white, fontSize: 26, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
          Workout
        </h1>
        <p style={{ color: colors.textMuted, fontSize: 13, margin: 0, fontFamily: 'Inter, sans-serif' }}>
          {weekday}{entry.wType ? ` · ${entry.wType}` : ''}
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
          exercises.length === 0 ? (
            <>
              <EmptyState
                icon="🏔️"
                title="No workout yet today"
                body="Start from a template in the Library, or build your session one exercise at a time."
                cta="+ Add First Exercise"
                onCta={() => setShowPicker(true)}
              />
              {prs.length > 0 && (
                <>
                  <SectionHeader title="Personal Records" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {prs.map((pr) => (
                      <div key={pr.exercise} style={{
                        background: 'linear-gradient(135deg, rgba(251,191,36,0.06), #151E32)',
                        borderRadius: radius.lg, padding: '14px',
                        border: `1px solid ${colors.goldDim}`,
                      }}>
                        <p style={{ color: colors.textMuted, fontSize: 11, margin: '0 0 4px' }}>{pr.exercise}</p>
                        <p style={{ color: colors.gold, fontSize: 18, fontWeight: 800, margin: '0 0 3px' }}>{pr.weight} lbs</p>
                        <p style={{ color: colors.textDim, fontSize: 11, margin: 0, fontFamily: 'Inter, sans-serif' }}>{relativeDate(pr.date)}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {/* Progress header */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.04))',
                border: `1px solid ${colors.green}25`, borderRadius: radius.xl, padding: '18px 20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <p style={{ color: colors.white, fontSize: 16, fontWeight: 700, margin: '0 0 2px' }}>
                      {entry.wType || "Today's Session"}
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
                <ProgressBar value={doneSets} max={Math.max(1, totalSets)} color={colors.green} />
                <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                  {[
                    { label: 'Volume', value: `${volume.toLocaleString()} lbs` },
                    { label: 'Duration', value: durationMin ? `${durationMin} min` : '—' },
                    { label: 'Exercises', value: String(exercises.length) },
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
                <GhostBtn label="+ Add" color={colors.green} onClick={() => setShowPicker(true)} />
              } />

              {exercises.map((ex, i) => (
                <ExerciseRow
                  key={`${ex.name}-${i}`} ex={ex} exIdx={i} isPR={isTodayPR(ex)}
                  onChange={changeExercise} onRemove={removeExercise}
                  onSetDone={() => setShowTimer(true)}
                />
              ))}

              {/* Finish button */}
              <button onClick={finishWorkout} style={{
                width: '100%', background: colors.green, borderRadius: radius.lg,
                border: 'none', padding: '15px', color: '#fff',
                fontSize: 15, fontWeight: 800, cursor: 'pointer',
                fontFamily: 'Plus Jakarta Sans, sans-serif', boxShadow: shadow.green,
                letterSpacing: '-0.2px',
              }}>
                {progress === 100 ? '🏆 Finish Workout' : `Finish Workout (${progress}% done)`}
              </button>

              {/* Personal Records */}
              {prs.length > 0 && (
                <>
                  <SectionHeader title="Personal Records" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {prs.map((pr) => (
                      <div key={pr.exercise} style={{
                        background: 'linear-gradient(135deg, rgba(251,191,36,0.06), #151E32)',
                        borderRadius: radius.lg, padding: '14px',
                        border: `1px solid ${colors.goldDim}`,
                      }}>
                        <p style={{ color: colors.textMuted, fontSize: 11, margin: '0 0 4px' }}>{pr.exercise}</p>
                        <p style={{ color: colors.gold, fontSize: 18, fontWeight: 800, margin: '0 0 3px' }}>{pr.weight} lbs</p>
                        <p style={{ color: colors.textDim, fontSize: 11, margin: 0, fontFamily: 'Inter, sans-serif' }}>{relativeDate(pr.date)}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )
        ) : (
          <>
            <SectionHeader title="Workout Library" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {BUILTIN_TEMPLATES.map((t) => (
                <TemplateCard key={t.name} t={t} onLoad={loadTemplate} />
              ))}
            </div>
            <EmptyState
              icon="🏗️"
              title="Build a custom workout"
              body="Create your own routine one exercise at a time — it saves automatically to today."
              cta="Create Workout"
              onCta={() => { setTab('today'); setShowPicker(true) }}
            />
          </>
        )}
      </div>

      {showPicker && <ExercisePicker onPick={addExercise} onClose={() => setShowPicker(false)} />}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)',
          background: colors.cardElevated, border: `1px solid ${colors.green}40`,
          borderRadius: radius.full, padding: '10px 20px', color: colors.white,
          fontSize: 13, fontWeight: 600, zIndex: 120, boxShadow: shadow.card,
          animation: 'fadeUp 0.25s ease both', whiteSpace: 'nowrap',
        }} role="status">
          {toast}
        </div>
      )}
    </ScreenShell>
  )
}
