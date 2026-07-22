import { useState, useEffect } from 'react'
import { colors, radius, shadow } from '../design/tokens'
import { ArcProgress, CircleProgress, ProgressBar, Card, SectionHeader, CoachCard, Badge, ScreenShell } from '../components/shared'

function pct(v: number, g: number) { return Math.min(Math.round((v / g) * 100), 100) }
function fmt(n: number) { return n.toLocaleString() }

// ─── Macro Card ───────────────────────────────────────────────────────────────

function MacroCard({ label, current, goal, unit, color, glow, isProtein = false, index = 0 }: {
  label: string; current: number; goal: number; unit: string
  color: string; glow: string; isProtein?: boolean; index?: number
}) {
  const remaining = goal - current
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
      {isProtein && (
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

// ─── Meal Timeline ────────────────────────────────────────────────────────────

function MealTimeline() {
  const meals = [
    { time: '7:30 AM', name: 'Breakfast', kcal: 0, items: ['No meals logged yet'], logged: false },
    { time: '12:00 PM', name: 'Lunch', kcal: 0, items: ['No meals logged yet'], logged: false },
    { time: '3:30 PM', name: 'Snack', kcal: 257, items: ['Greek Yogurt (150g)', 'Banana (1 medium)', 'Almonds (28g)'], logged: true },
    { time: '7:00 PM', name: 'Dinner', kcal: 0, items: ['Not yet logged'], logged: false },
  ]
  return (
    <Card style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ color: colors.white, fontSize: 15, fontWeight: 700, margin: 0 }}>Meal Timeline</p>
        <button style={{
          background: colors.greenDim, border: `1px solid ${colors.green}30`,
          borderRadius: radius.md, padding: '6px 12px', color: colors.green,
          fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif',
        }}>
          + Log Meal
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {meals.map((meal, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: i < meals.length - 1 ? 16 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                background: meal.logged ? colors.green : 'rgba(255,255,255,0.1)',
                boxShadow: meal.logged ? `0 0 8px ${colors.greenGlow}` : 'none',
              }} />
              {i < meals.length - 1 && (
                <div style={{ width: 1, flex: 1, background: colors.border, marginTop: 4 }} />
              )}
            </div>
            <div style={{ flex: 1, paddingBottom: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div>
                  <p style={{ color: colors.white, fontSize: 13, fontWeight: 700, margin: '0 0 1px' }}>{meal.name}</p>
                  <p style={{ color: colors.textDim, fontSize: 11, margin: 0, fontFamily: 'Inter, sans-serif' }}>{meal.time}</p>
                </div>
                {meal.logged && (
                  <span style={{ color: colors.green, fontSize: 12, fontWeight: 700 }}>{meal.kcal} kcal</span>
                )}
              </div>
              {meal.logged && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {meal.items.map((item, j) => (
                    <p key={j} style={{ color: colors.textMuted, fontSize: 12, margin: 0, fontFamily: 'Inter, sans-serif' }}>· {item}</p>
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

// ─── Barcode Scanner Placeholder ──────────────────────────────────────────────

function BarcodeScanner() {
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
        📷
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ color: colors.white, fontSize: 14, fontWeight: 700, margin: '0 0 3px' }}>Barcode Scanner</p>
        <p style={{ color: colors.textMuted, fontSize: 12, margin: 0, fontFamily: 'Inter, sans-serif' }}>
          Scan any food label to instantly log nutrition
        </p>
      </div>
      <button style={{
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
  const caloriesGoal = 2752
  const caloriesConsumed = 257
  const caloriesRemaining = caloriesGoal - caloriesConsumed
  const [waterOz, setWaterOz] = useState(52)
  const waterGoal = 96

  const macros = [
    { label: 'Calories', current: caloriesConsumed, goal: caloriesGoal, unit: 'kcal', color: colors.green, glow: 'rgba(34,197,94,0.15)' },
    { label: 'Protein', current: 92, goal: 180, unit: 'g', color: colors.gold, glow: 'rgba(251,191,36,0.15)', isProtein: true },
    { label: 'Carbohydrates', current: 28, goal: 310, unit: 'g', color: colors.blue, glow: 'rgba(56,189,248,0.15)' },
    { label: 'Fat', current: 11, goal: 85, unit: 'g', color: colors.violet, glow: 'rgba(167,139,250,0.15)' },
  ]

  const micronutrients = [
    { label: 'Sodium', value: '842', unit: 'mg', goal: '2300 mg', pctVal: 37, color: colors.blue },
    { label: 'Sugar', value: '8', unit: 'g', goal: '36 g', pctVal: 22, color: '#F472B6' },
    { label: 'Potassium', value: '1,240', unit: 'mg', goal: '3500 mg', pctVal: 35, color: colors.violet },
    { label: 'Cals Burned', value: '487', unit: 'kcal', goal: 'Active', pctVal: 68, color: colors.green },
  ]

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
          <ArcProgress value={caloriesConsumed} max={caloriesGoal} size={210} strokeWidth={13} color={colors.green}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: colors.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 4px' }}>Remaining</p>
              <p style={{ color: colors.white, fontSize: 44, fontWeight: 800, lineHeight: 1, margin: 0, letterSpacing: '-1px' }}>{fmt(caloriesRemaining)}</p>
              <p style={{ color: colors.green, fontSize: 13, fontWeight: 600, margin: '4px 0 0' }}>Calories</p>
            </div>
          </ArcProgress>
          <div style={{ display: 'flex', gap: 32, marginTop: 8, justifyContent: 'center' }}>
            {[
              { label: 'Goal', value: fmt(caloriesGoal), color: colors.textMuted },
              { label: 'Consumed', value: fmt(caloriesConsumed), color: colors.green },
              { label: 'Burned', value: '487', color: colors.gold },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <p style={{ color: s.color, fontSize: 16, fontWeight: 700, margin: 0 }}>{s.value}</p>
                <p style={{ color: colors.textDisabled, fontSize: 11, margin: '2px 0 0' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <BarcodeScanner />

        <SectionHeader title="Daily Targets" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {macros.map((m, i) => <MacroCard key={m.label} {...m} index={i} />)}
        </div>

        {/* Protein context */}
        <div style={{
          background: colors.card, borderRadius: radius.lg, padding: '14px 16px',
          border: `1px solid ${colors.goldDim}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ color: colors.textMuted, fontSize: 12, margin: '0 0 3px', fontFamily: 'Inter, sans-serif' }}>
              Based on <span style={{ color: colors.gold, fontWeight: 600 }}>Weight Loss</span> · <span style={{ color: colors.gold, fontWeight: 600 }}>Strength Training</span>
            </p>
            <button style={{ color: colors.blue, fontSize: 12, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif' }}>
              How was this calculated? →
            </button>
          </div>
          <span style={{ fontSize: 20 }}>🧬</span>
        </div>

        <MealTimeline />

        <SectionHeader title="Hydration" />

        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
            <CircleProgress value={waterOz} max={waterGoal} size={110} strokeWidth={9} color={colors.blue}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: 20, fontWeight: 800, color: colors.white, lineHeight: 1 }}>{waterOz}</span>
                <span style={{ fontSize: 10, color: colors.textMuted, fontWeight: 500 }}>oz</span>
              </div>
            </CircleProgress>
            <div style={{ flex: 1 }}>
              <p style={{ color: colors.white, fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Today's Water</p>
              <p style={{ color: colors.textMuted, fontSize: 12, margin: '0 0 10px', fontFamily: 'Inter, sans-serif' }}>
                {waterOz} of {waterGoal} oz · {pct(waterOz, waterGoal)}%
              </p>
              <p style={{ color: colors.textDim, fontSize: 12, margin: 0, fontFamily: 'Inter, sans-serif' }}>
                {waterGoal - waterOz} oz remaining
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[8, 16, 24].map((oz) => (
              <button key={oz} onClick={() => setWaterOz((p) => Math.min(p + oz, waterGoal))} style={{
                flex: 1, background: 'rgba(56,189,248,0.08)', border: `1px solid rgba(56,189,248,0.2)`,
                borderRadius: radius.md, padding: '10px 0', color: colors.blue,
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif',
                transition: 'all 0.15s',
              }}>
                +{oz} oz
              </button>
            ))}
          </div>
        </Card>

        <SectionHeader title="Fiber" />

        <Card style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
            <div>
              <p style={{ color: colors.textMuted, fontSize: 12, fontWeight: 500, margin: '0 0 4px' }}>Daily Fiber</p>
              <p style={{ color: colors.white, fontSize: 22, fontWeight: 800, margin: 0 }}>
                12 <span style={{ fontSize: 14, color: colors.textMuted, fontWeight: 500 }}>/ 35 g</span>
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: colors.green, fontSize: 13, fontWeight: 600, margin: '0 0 2px' }}>23 g remaining</p>
              <p style={{ color: colors.textDim, fontSize: 11, margin: 0 }}>{pct(12, 35)}% complete</p>
            </div>
          </div>
          <ProgressBar value={12} max={35} color={colors.green} delay={300} />
          <p style={{ color: colors.textDim, fontSize: 12, margin: '12px 0 0', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>
            Add leafy greens, legumes, or whole grains to hit your target.
          </p>
        </Card>

        <SectionHeader title="Micronutrients" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {micronutrients.map((m, i) => (
            <div key={m.label} style={{
              background: colors.card, borderRadius: radius.lg, padding: '14px',
              border: `1px solid ${colors.border}`,
              animation: `fadeUp 0.5s ease ${i * 60}ms both`,
            }}>
              <p style={{ color: colors.textMuted, fontSize: 11, fontWeight: 500, margin: '0 0 6px' }}>{m.label}</p>
              <p style={{ color: colors.white, fontSize: 18, fontWeight: 800, margin: '0 0 1px' }}>
                {m.value}<span style={{ fontSize: 11, color: colors.textMuted, fontWeight: 400, marginLeft: 2 }}>{m.unit}</span>
              </p>
              <p style={{ color: colors.textDim, fontSize: 11, margin: '0 0 10px', fontFamily: 'Inter, sans-serif' }}>of {m.goal}</p>
              <ProgressBar value={m.pctVal} max={100} color={m.color} delay={i * 60} />
            </div>
          ))}
        </div>

        <SectionHeader title="Nutrition Insights" action={
          <span style={{ color: colors.textDim, fontSize: 11, fontFamily: 'Inter, sans-serif' }}>Ascend AI</span>
        } />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { text: "You're only 88g away from today's protein goal. A post-workout shake now gets you there.", accent: colors.gold, icon: '🎯' },
            { text: "Your protein intake has improved 18% this week. Consistency is compounding — keep it up.", accent: colors.green, icon: '📈' },
            { text: "You tend to hit your calorie target but fall short on fiber. Add leafy greens at dinner.", accent: colors.blue, icon: '💡' },
            { text: "Solid week. You've hit your macros 5 of 6 days — that's the discipline that builds results.", accent: colors.green, icon: '🏆' },
          ].map((c, i) => (
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
              { label: 'Net Calories', value: `${fmt(caloriesRemaining - 487)}` },
              { label: 'Macros Hit', value: '1/4' },
              { label: 'Streak', value: '6 days' },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <p style={{ color: colors.green, fontSize: 20, fontWeight: 800, margin: 0 }}>{s.value}</p>
                <p style={{ color: colors.textMuted, fontSize: 11, margin: '2px 0 0', fontFamily: 'Inter, sans-serif' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScreenShell>
  )
}
