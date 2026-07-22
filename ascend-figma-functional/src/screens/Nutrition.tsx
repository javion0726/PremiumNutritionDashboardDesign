import { useState, useEffect, useRef } from 'react'
import { colors, radius, shadow } from '../design/tokens'
import { ArcProgress, CircleProgress, ProgressBar, Card, SectionHeader, CoachCard, Badge, ScreenShell } from '../components/shared'
import { useAppData } from '../lib/useAppData'
import { getConfig, getDay, saveDay, todayKey, type Meal } from '../lib/store'
import { getTargets, mealTotals, calcStreak } from '../lib/engine'
import { searchFood, type FoodResult } from '../lib/food'
import { useNav } from '../App'

function pct(v: number, g: number) { return Math.min(Math.round((v / g) * 100), 100) }
function fmt(n: number) { return Math.round(n).toLocaleString() }

// ─── Macro Card ───────────────────────────────────────────────────────────────

function MacroCard({ label, current, goal, unit, color, glow, isProtein = false, personalized = false, index = 0 }: {
  label: string; current: number; goal: number; unit: string
  color: string; glow: string; isProtein?: boolean; personalized?: boolean; index?: number
}) {
  const remaining = Math.max(0, goal - current)
  const p = pct(current, goal)
  return (
    <div style={{
      background: colors.card, borderRadius: 20, padding: '18px 16px',
      border: `1px solid ${colors.border}`, boxShadow: shadow.card,
      position: 'relative', overflow: 'hidden',
      animation: `fadeUp 0.5s ease ${index * 80}ms both`,
    }}>
      <div style={{
        position: 'absolute', top: -30, right: -30, width: 80, height: 80,
        borderRadius: '50%', background: glow, filter: 'blur(24px)', pointerEvents: 'none',
      }} />
      {isProtein && personalized && (
        <div style={{ marginBottom: 10 }}>
          <Badge label="Personalized" color={colors.gold} />
        </div>
      )}
      <p style={{ color: colors.textMuted, fontSize: 12, fontWeight: 500, margin: '0 0 6px', letterSpacing: '0.02em' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 4 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: colors.white, lineHeight: 1 }}>{fmt(current)}</span>
        <span style={{ fontSize: 13, color: colors.textMuted, marginLeft: 2 }}>/ {fmt(goal)}{unit}</span>
      </div>
      <p style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
        <span style={{ color, fontWeight: 600 }}>{fmt(remaining)}{unit}</span> remaining
      </p>
      <ProgressBar value={current} max={goal} color={color} delay={index * 80} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: colors.textDim }}>{p}% complete</span>
        {isProtein && (
          <span style={{ fontSize: 11, color, fontWeight: 600 }}>{p >= 80 ? 'On track ✓' : 'Keep going'}</span>
        )}
      </div>
    </div>
  )
}

// ─── Log Meal Sheet ───────────────────────────────────────────────────────────

const SLOT_TYPES = ['Breakfast', 'Lunch', 'Snack', 'Dinner'] as const

function LogMealSheet({ onClose, defaultType }: { onClose: () => void; defaultType?: string }) {
  const [type, setType] = useState<string>(defaultType ?? 'Snack')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodResult[]>([])
  const [searching, setSearching] = useState(false)
  const [failed, setFailed] = useState(false)
  const [picked, setPicked] = useState<FoodResult | null>(null)
  const [grams, setGrams] = useState('100')
  const [manual, setManual] = useState(false)
  const [m, setM] = useState({ name: '', cal: '', prot: '', carb: '', fat: '' })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    const q = query.trim()
    if (q.length < 2) { setResults([]); setSearching(false); return }
    setSearching(true); setFailed(false)
    timer.current = setTimeout(async () => {
      const { items, allFailed } = await searchFood(q)
      setResults(items); setSearching(false); setFailed(allFailed)
    }, 400)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [query])

  function saveMeal(meal: Meal) {
    const key = todayKey()
    const day = getDay(key)
    saveDay(key, { mealArr: [...(day.mealArr ?? []), meal] })
    onClose()
  }
  function savePicked() {
    if (!picked) return
    const g = parseFloat(grams) || 100
    const f = g / 100
    saveMeal({
      type, name: `${picked.name}${picked.brand ? ` · ${picked.brand}` : ''} (${g}g)`,
      cal: Math.round(picked.cal * f), prot: Math.round(picked.prot * f * 10) / 10,
      carb: Math.round(picked.carb * f * 10) / 10, fat: Math.round(picked.fat * f * 10) / 10,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    })
  }
  function saveManual() {
    if (!m.name.trim() && !m.cal) return
    saveMeal({
      type, name: m.name.trim() || 'Meal',
      cal: parseFloat(m.cal) || 0, prot: parseFloat(m.prot) || 0,
      carb: parseFloat(m.carb) || 0, fat: parseFloat(m.fat) || 0,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    })
  }

  const input: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${colors.border}`, borderRadius: radius.md,
    padding: '11px 14px', color: colors.white, fontSize: 14,
    fontFamily: 'Inter, sans-serif', outline: 'none',
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 430, maxHeight: '80vh', overflowY: 'auto',
        background: colors.bgSecondary, borderRadius: `${radius.xl}px ${radius.xl}px 0 0`,
        border: `1px solid ${colors.border}`, padding: '20px 16px 32px',
        animation: 'fadeUp 0.25s ease both',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 16px' }} />
        <p style={{ color: colors.white, fontSize: 17, fontWeight: 700, margin: '0 0 12px' }}>Log Meal</p>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {SLOT_TYPES.map(t => (
            <button key={t} onClick={() => setType(t)} style={{
              flex: 1, background: type === t ? colors.greenDim : 'rgba(255,255,255,0.04)',
              border: `1px solid ${type === t ? colors.green + '40' : colors.border}`,
              borderRadius: radius.full, padding: '7px 0',
              color: type === t ? colors.green : colors.textMuted,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>{t}</button>
          ))}
        </div>

        {!manual ? (
          <>
            <input
              autoFocus placeholder="Search foods (e.g. chicken breast)…" value={query}
              onChange={e => setQuery(e.target.value)} style={{ ...input, marginBottom: 10 }}
            />
            {picked ? (
              <div style={{ background: colors.card, border: `1px solid ${colors.green}30`, borderRadius: radius.lg, padding: 14, marginBottom: 12 }}>
                <p style={{ color: colors.white, fontSize: 13.5, fontWeight: 700, margin: '0 0 2px' }}>{picked.name}{picked.brand ? ` · ${picked.brand}` : ''}</p>
                <p style={{ color: colors.textMuted, fontSize: 11.5, margin: '0 0 10px', fontFamily: 'Inter, sans-serif' }}>
                  {picked.cal} kcal · {picked.prot}g protein · {picked.carb}g carbs · {picked.fat}g fat ({picked.per})
                </p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input style={{ ...input, maxWidth: 90 }} inputMode="numeric" value={grams} onChange={e => setGrams(e.target.value)} />
                  <span style={{ color: colors.textMuted, fontSize: 13 }}>grams</span>
                  <div style={{ flex: 1 }} />
                  <button onClick={savePicked} style={{
                    background: colors.green, border: 'none', borderRadius: radius.md,
                    padding: '10px 20px', color: '#fff', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', boxShadow: shadow.green,
                  }}>Add</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 8, minHeight: 40 }}>
                {searching && <p style={{ color: colors.textDim, fontSize: 13, padding: 12, fontFamily: 'Inter, sans-serif' }}>Searching…</p>}
                {!searching && failed && <p style={{ color: colors.danger, fontSize: 13, padding: 12, fontFamily: 'Inter, sans-serif' }}>Couldn't reach food databases — check your connection or enter manually.</p>}
                {!searching && !failed && query.trim().length >= 2 && !results.length && (
                  <p style={{ color: colors.textDim, fontSize: 13, padding: 12, fontFamily: 'Inter, sans-serif' }}>No results — try a different search or enter manually.</p>
                )}
                {results.map((r, i) => (
                  <button key={i} onClick={() => setPicked(r)} style={{
                    textAlign: 'left', background: 'none', border: 'none',
                    borderBottom: `1px solid ${colors.border}`, padding: '11px 4px', cursor: 'pointer',
                  }}>
                    <p style={{ color: colors.white, fontSize: 13.5, fontWeight: 600, margin: '0 0 2px' }}>
                      {r.name}{r.brand ? <span style={{ color: colors.textDim, fontWeight: 400 }}> · {r.brand}</span> : ''}
                    </p>
                    <p style={{ color: colors.textMuted, fontSize: 11.5, margin: 0, fontFamily: 'Inter, sans-serif' }}>
                      {r.cal} kcal · {r.prot}g protein · {r.carb}g carbs ({r.per})
                    </p>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setManual(true)} style={{
              background: 'none', border: 'none', color: colors.blue, fontSize: 12.5,
              fontWeight: 600, cursor: 'pointer', padding: '6px 0', fontFamily: 'Inter, sans-serif',
            }}>
              Enter manually instead →
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input style={input} placeholder="What did you eat?" value={m.name} onChange={e => setM({ ...m, name: e.target.value })} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={input} inputMode="numeric" placeholder="kcal" value={m.cal} onChange={e => setM({ ...m, cal: e.target.value })} />
              <input style={input} inputMode="numeric" placeholder="protein g" value={m.prot} onChange={e => setM({ ...m, prot: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={input} inputMode="numeric" placeholder="carbs g" value={m.carb} onChange={e => setM({ ...m, carb: e.target.value })} />
              <input style={input} inputMode="numeric" placeholder="fat g" value={m.fat} onChange={e => setM({ ...m, fat: e.target.value })} />
            </div>
            <button onClick={saveManual} style={{
              background: colors.green, border: 'none', borderRadius: radius.md,
              padding: '12px', color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', boxShadow: shadow.green, marginTop: 4,
            }}>Add Meal</button>
            <button onClick={() => setManual(false)} style={{
              background: 'none', border: 'none', color: colors.blue, fontSize: 12.5,
              fontWeight: 600, cursor: 'pointer', padding: '4px 0', fontFamily: 'Inter, sans-serif',
            }}>← Back to search</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Meal Timeline ────────────────────────────────────────────────────────────

function MealTimeline({ onLog }: { onLog: (type?: string) => void }) {
  const day = getDay(todayKey())
  const meals = day.mealArr ?? []
  const slots = SLOT_TYPES.map(name => {
    const logged = meals.filter(mm => (mm.type === name) || (name === 'Snack' && !SLOT_TYPES.includes(mm.type as typeof SLOT_TYPES[number])))
    return {
      name,
      kcal: Math.round(logged.reduce((a, mm) => a + (mm.cal || 0), 0)),
      items: logged.map(mm => mm.name || 'Logged item'),
      time: logged[0]?.time,
      logged: logged.length > 0,
    }
  })

  function removeMeal(itemName: string) {
    const key = todayKey()
    const d = getDay(key)
    const idx = (d.mealArr ?? []).findIndex(mm => mm.name === itemName)
    if (idx >= 0) saveDay(key, { mealArr: d.mealArr!.filter((_, i) => i !== idx) })
  }

  return (
    <Card style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ color: colors.white, fontSize: 15, fontWeight: 700, margin: 0 }}>Meal Timeline</p>
        <button onClick={() => onLog()} style={{
          background: colors.greenDim, border: `1px solid ${colors.green}30`,
          borderRadius: radius.md, padding: '6px 12px', color: colors.green,
          fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif',
        }}>
          + Log Meal
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {slots.map((meal, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: i < slots.length - 1 ? 16 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                background: meal.logged ? colors.green : 'rgba(255,255,255,0.1)',
                boxShadow: meal.logged ? `0 0 8px ${colors.greenGlow}` : 'none',
              }} />
              {i < slots.length - 1 && (
                <div style={{ width: 1, flex: 1, background: colors.border, marginTop: 4 }} />
              )}
            </div>
            <div style={{ flex: 1, paddingBottom: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div>
                  <p style={{ color: colors.white, fontSize: 13, fontWeight: 700, margin: '0 0 1px' }}>{meal.name}</p>
                  <p style={{ color: colors.textDim, fontSize: 11, margin: 0, fontFamily: 'Inter, sans-serif' }}>
                    {meal.logged ? (meal.time ?? 'Logged') : 'Not yet logged'}
                  </p>
                </div>
                {meal.logged
                  ? <span style={{ color: colors.green, fontSize: 12, fontWeight: 700 }}>{meal.kcal} kcal</span>
                  : <button onClick={() => onLog(meal.name)} style={{
                      background: 'none', border: 'none', color: colors.textDim, fontSize: 12,
                      fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', padding: 0,
                    }}>+ Add</button>
                }
              </div>
              {meal.logged && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {meal.items.map((item, j) => (
                    <p key={j} style={{ color: colors.textMuted, fontSize: 12, margin: 0, fontFamily: 'Inter, sans-serif' }}>
                      · {item}
                      <button onClick={() => removeMeal(item)} aria-label={`Remove ${item}`} style={{
                        background: 'none', border: 'none', color: colors.textDisabled,
                        fontSize: 12, cursor: 'pointer', padding: '0 4px',
                      }}>×</button>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── Food Search shortcut card (replaces the mock barcode scanner) ────────────

function FoodSearchCard({ onOpen }: { onOpen: () => void }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(56,189,248,0.02))',
      border: `1px solid rgba(56,189,248,0.2)`, borderRadius: radius.xl,
      padding: '20px', display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14, background: 'rgba(56,189,248,0.12)',
        border: `1px solid rgba(56,189,248,0.25)`, display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
      }}>
        🔍
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ color: colors.white, fontSize: 14, fontWeight: 700, margin: '0 0 3px' }}>Food Search</p>
        <p style={{ color: colors.textMuted, fontSize: 12, margin: 0, fontFamily: 'Inter, sans-serif' }}>
          Search 300k+ foods from USDA & Open Food Facts
        </p>
      </div>
      <button onClick={onOpen} style={{
        background: 'rgba(56,189,248,0.12)', border: `1px solid rgba(56,189,248,0.25)`,
        borderRadius: radius.md, padding: '8px 14px', color: colors.blue,
        fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif',
        flexShrink: 0,
      }}>
        Open
      </button>
    </div>
  )
}

// ─── Nutrition Screen ─────────────────────────────────────────────────────────

export default function NutritionScreen() {
  useAppData()
  const nav = useNav()
  const [sheet, setSheet] = useState<{ open: boolean; type?: string }>({ open: false })

  const cfg = getConfig()
  const targets = getTargets()
  const day = getDay(todayKey())
  const totals = mealTotals(day.mealArr)
  const caloriesRemaining = Math.max(0, targets.calories - totals.cal)
  const water = day.water ?? 0
  const waterGoal = cfg.waterGoal || 64
  const streak = calcStreak()

  const macros = [
    { label: 'Calories', current: totals.cal, goal: targets.calories, unit: 'kcal', color: colors.green, glow: 'rgba(34,197,94,0.15)' },
    { label: 'Protein', current: totals.prot, goal: targets.protein, unit: 'g', color: colors.gold, glow: 'rgba(251,191,36,0.15)', isProtein: true },
    { label: 'Carbohydrates', current: totals.carb, goal: targets.carbs, unit: 'g', color: colors.blue, glow: 'rgba(56,189,248,0.15)' },
    { label: 'Fat', current: totals.fat, goal: targets.fats, unit: 'g', color: colors.violet, glow: 'rgba(167,139,250,0.15)' },
  ]
  const macrosHit = macros.filter(m => m.current >= m.goal * 0.9 && m.current <= (m.label === 'Calories' ? m.goal * 1.05 : Infinity)).length

  const insights: { text: string; accent: string; icon: string }[] = []
  const protLeft = Math.max(0, targets.protein - Math.round(totals.prot))
  if (protLeft > 0 && totals.prot > 0) insights.push({ text: `You're ${protLeft}g away from today's protein goal. A post-workout shake gets you there.`, accent: colors.gold, icon: '🎯' })
  if (totals.cal === 0) insights.push({ text: 'Nothing logged yet today. Log your first meal and every number on this screen comes alive.', accent: colors.blue, icon: '💡' })
  if (water >= waterGoal) insights.push({ text: 'Water goal hit — hydration done for the day. 💧', accent: colors.green, icon: '🏆' })
  else if (water > 0) insights.push({ text: `${waterGoal - water} ${cfg.waterUnit} of water to go. Keep the bottle close.`, accent: colors.blue, icon: '💧' })
  if (!targets.personalized) insights.push({ text: 'These targets are defaults. Run the calculator in Profile to personalize calories and macros to your body and goal.', accent: colors.violet, icon: '🧬' })

  return (
    <ScreenShell>
      {/* Header */}
      <div style={{
        padding: '56px 24px 20px',
        background: 'linear-gradient(180deg, rgba(34,197,94,0.06) 0%, transparent 100%)',
        animation: 'fadeUp 0.4s ease both',
      }}>
        <p style={{ color: colors.textMuted, fontSize: 13, margin: '0 0 4px', fontWeight: 500 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 style={{ color: colors.white, fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
          Today's Nutrition
        </h1>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Calories Hero */}
        <div style={{
          background: colors.card, borderRadius: 24, padding: '28px 24px',
          border: `1px solid ${colors.border}`, boxShadow: shadow.hero,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          position: 'relative', overflow: 'hidden',
          animation: 'fadeUp 0.4s ease 0.05s both',
        }}>
          <div style={{
            position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
            width: 240, height: 240, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <ArcProgress value={totals.cal} max={targets.calories} size={210} strokeWidth={13} color={colors.green}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: colors.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 4px' }}>Remaining</p>
              <p style={{ color: colors.white, fontSize: 44, fontWeight: 800, lineHeight: 1, margin: 0, letterSpacing: '-1px' }}>{fmt(caloriesRemaining)}</p>
              <p style={{ color: colors.green, fontSize: 13, fontWeight: 600, margin: '4px 0 0' }}>Calories</p>
            </div>
          </ArcProgress>
          <div style={{ display: 'flex', gap: 32, marginTop: 8, justifyContent: 'center' }}>
            {[
              { label: 'Goal', value: fmt(targets.calories), color: colors.textMuted },
              { label: 'Consumed', value: fmt(totals.cal), color: colors.green },
              { label: 'Meals', value: String((day.mealArr ?? []).length), color: colors.gold },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <p style={{ color: s.color, fontSize: 16, fontWeight: 700, margin: 0 }}>{s.value}</p>
                <p style={{ color: colors.textDisabled, fontSize: 11, margin: '2px 0 0' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <FoodSearchCard onOpen={() => setSheet({ open: true })} />

        <SectionHeader title="Daily Targets" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {macros.map((m, i) => <MacroCard key={m.label} {...m} personalized={targets.personalized} index={i} />)}
        </div>

        {/* Targets context */}
        <div style={{
          background: colors.card, borderRadius: radius.lg, padding: '14px 16px',
          border: `1px solid ${colors.goldDim}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ color: colors.textMuted, fontSize: 12, margin: '0 0 3px', fontFamily: 'Inter, sans-serif' }}>
              {targets.personalized
                ? <>Based on <span style={{ color: colors.gold, fontWeight: 600 }}>your calculator results</span></>
                : <>Using <span style={{ color: colors.gold, fontWeight: 600 }}>default targets</span></>}
            </p>
            <button onClick={() => nav('profile')} style={{ color: colors.blue, fontSize: 12, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif' }}>
              {targets.personalized ? 'Recalculate in Profile →' : 'Personalize in Profile →'}
            </button>
          </div>
          <span style={{ fontSize: 20 }}>🧬</span>
        </div>

        <MealTimeline onLog={(type) => setSheet({ open: true, type })} />

        <SectionHeader title="Hydration" />

        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
            <CircleProgress value={water} max={waterGoal} size={110} strokeWidth={9} color={colors.blue}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: 20, fontWeight: 800, color: colors.white, lineHeight: 1 }}>{water}</span>
                <span style={{ fontSize: 10, color: colors.textMuted, fontWeight: 500 }}>{cfg.waterUnit}</span>
              </div>
            </CircleProgress>
            <div style={{ flex: 1 }}>
              <p style={{ color: colors.white, fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Today's Water</p>
              <p style={{ color: colors.textMuted, fontSize: 12, margin: '0 0 10px', fontFamily: 'Inter, sans-serif' }}>
                {water} of {waterGoal} {cfg.waterUnit} · {pct(water, waterGoal)}%
              </p>
              <p style={{ color: colors.textDim, fontSize: 12, margin: 0, fontFamily: 'Inter, sans-serif' }}>
                {Math.max(0, waterGoal - water)} {cfg.waterUnit} remaining
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(cfg.waterUnit === 'oz' ? [8, 16, 24] : cfg.waterUnit === 'cups' ? [1, 2, 3] : [0.25, 0.5, 0.75]).map((amt) => (
              <button key={amt} onClick={() => saveDay(todayKey(), { water: Math.round(Math.min(water + amt, waterGoal * 1.5) * 100) / 100 })} style={{
                flex: 1, background: 'rgba(56,189,248,0.08)', border: `1px solid rgba(56,189,248,0.2)`,
                borderRadius: radius.md, padding: '10px 0', color: colors.blue,
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif',
                transition: 'all 0.15s',
              }}>
                +{amt} {cfg.waterUnit}
              </button>
            ))}
          </div>
        </Card>

        <SectionHeader title="Nutrition Insights" action={
          <span style={{ color: colors.textDim, fontSize: 11, fontFamily: 'Inter, sans-serif' }}>From your data</span>
        } />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {insights.slice(0, 4).map((c, i) => (
            <CoachCard key={i} text={c.text} accent={c.accent} icon={<span style={{ fontSize: 16 }}>{c.icon}</span>} delay={i * 60} />
          ))}
        </div>

        {/* Summary */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.04))',
          border: `1px solid ${colors.green}25`, borderRadius: radius.xl, padding: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>📊</span>
            <p style={{ color: colors.white, fontSize: 15, fontWeight: 700, margin: 0 }}>Today's Summary</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Kcal Left', value: fmt(caloriesRemaining) },
              { label: 'Macros Hit', value: `${macrosHit}/4` },
              { label: 'Streak', value: `${streak} day${streak === 1 ? '' : 's'}` },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <p style={{ color: colors.green, fontSize: 20, fontWeight: 800, margin: 0 }}>{s.value}</p>
                <p style={{ color: colors.textMuted, fontSize: 11, margin: '2px 0 0', fontFamily: 'Inter, sans-serif' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {sheet.open && <LogMealSheet defaultType={sheet.type} onClose={() => setSheet({ open: false })} />}
    </ScreenShell>
  )
}
