// ─── Ascend engine ────────────────────────────────────────────────────────────
// All derived numbers on every screen come from here — ported from the original
// app.js so behavior (streaks, discipline score, targets) is identical.

import {
  getJournal, getConfig, getGoals, getMeasurements,
  fmtKey, todayKey, parseKey, daysAgoKey,
  type DayEntry, type Journal, type Meal,
} from './store'

const REST = 'Rest / Active Recovery'

function isWorkoutDay(e?: DayEntry): boolean {
  return !!(e && e.wType !== REST && e.exArr && e.exArr.some(x => x.name))
}

// ─── streaks ─────────────────────────────────────────────────────────────────

export function calcStreak(j: Journal = getJournal()): number {
  let streak = 0
  const check = new Date(); check.setHours(0, 0, 0, 0)
  for (let i = 0; i < 365; i++) {
    const k = fmtKey(check)
    if (isWorkoutDay(j[k])) streak++
    else if (i > 0) break
    check.setDate(check.getDate() - 1)
  }
  return streak
}

export function calcLongestStreak(j: Journal = getJournal()): number {
  const wk = Object.keys(j).filter(k => isWorkoutDay(j[k])).sort()
  if (!wk.length) return 0
  let best = 1, cur = 1
  for (let i = 1; i < wk.length; i++) {
    const diff = (parseKey(wk[i]).getTime() - parseKey(wk[i - 1]).getTime()) / 864e5
    if (diff === 1) { cur++; if (cur > best) best = cur } else cur = 1
  }
  return best
}

// ─── nutrition totals & targets ──────────────────────────────────────────────

export function mealTotals(meals: Meal[] = []): { cal: number; prot: number; carb: number; fat: number } {
  return meals.reduce((a, m) => ({
    cal: a.cal + (m.cal || 0), prot: a.prot + (m.prot || 0),
    carb: a.carb + (m.carb || 0), fat: a.fat + (m.fat || 0),
  }), { cal: 0, prot: 0, carb: 0, fat: 0 })
}

export function getTargets(): { calories: number; protein: number; carbs: number; fats: number; personalized: boolean } {
  const g = getGoals()
  if (g.results) return { ...g.results, personalized: true }
  // Sensible defaults until the user runs the calculator in Profile.
  return { calories: 2400, protein: 150, carbs: 280, fats: 75, personalized: false }
}

// Mifflin-St Jeor + goal adjustment — ported from the vanilla calculator.
export function calcTargets(input: {
  sex: 'male' | 'female'; age: number; heightCm: number
  weightLbs: number; goalWeightLbs: number; activity: number
  goalCode: 'lose_fast' | 'lose' | 'lose_slow' | 'maintain' | 'gain_slow' | 'gain' | 'recomp'
}): { calories: number; protein: number; carbs: number; fats: number; tdee: number; floored: boolean } {
  const wKg = input.weightLbs / 2.20462
  const gwKg = input.goalWeightLbs / 2.20462
  const bmr = input.sex === 'male'
    ? 10 * wKg + 6.25 * input.heightCm - 5 * input.age + 5
    : 10 * wKg + 6.25 * input.heightCm - 5 * input.age - 161
  const tdee = Math.round(bmr * input.activity)
  const adjustments: Record<string, number> = {
    lose_fast: -1000, lose: -500, lose_slow: -250, maintain: 0,
    gain_slow: 150, gain: 250, recomp: -150,
  }
  const adj = adjustments[input.goalCode] ?? 0
  const minCal = input.sex === 'male' ? 1500 : 1200
  const raw = Math.round(tdee + adj)
  const calories = Math.max(minCal, raw)
  // Protein: goal-weight anchored, 0.8–1g/lb band depending on cut vs bulk
  const perLb = input.goalCode.startsWith('lose') || input.goalCode === 'recomp' ? 1.0 : 0.85
  const protein = Math.round((gwKg * 2.20462) * perLb)
  const fats = Math.round((calories * 0.25) / 9)
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fats * 9) / 4))
  return { calories, protein, carbs, fats, tdee, floored: raw < minCal }
}

// ─── discipline score (identical weights to the vanilla app) ─────────────────

export type DisciplinePart = { label: string; pts: number; max: number; note: string }

export function computeDisciplineScore(k: string, j: Journal = getJournal()): {
  score: number; parts: DisciplinePart[]; hasData: boolean
} {
  const e = j[k]
  const cfg = getConfig()
  const parts: DisciplinePart[] = []
  let earned = 0, possible = 0

  possible += 25
  if (isWorkoutDay(e)) { earned += 25; parts.push({ label: 'Workout', pts: 25, max: 25, note: 'Logged' }) }
  else parts.push({ label: 'Workout', pts: 0, max: 25, note: e?.wType === REST ? 'Rest day' : 'Not logged' })

  possible += 20
  if (e?.cSleep) {
    const s = parseFloat(e.cSleep)
    const pts = Math.max(0, Math.min(20, Math.round(20 - Math.abs(s - 8) * 4)))
    earned += pts; parts.push({ label: 'Sleep', pts, max: 20, note: `${s}h logged` })
  } else parts.push({ label: 'Sleep', pts: 0, max: 20, note: 'Not logged' })

  possible += 20
  if (e?.water) {
    const goal = cfg.waterGoal || 64
    const pts = Math.max(0, Math.min(20, Math.round((20 * e.water) / goal)))
    earned += pts; parts.push({ label: 'Water', pts, max: 20, note: `${e.water} / ${goal}` })
  } else parts.push({ label: 'Water', pts: 0, max: 20, note: 'Not logged' })

  possible += 15
  if (e?.cSteps) {
    const pts = Math.max(0, Math.min(15, Math.round((15 * Number(e.cSteps)) / 8000)))
    earned += pts; parts.push({ label: 'Steps', pts, max: 15, note: `${Number(e.cSteps).toLocaleString()} / 8,000` })
  } else parts.push({ label: 'Steps', pts: 0, max: 15, note: 'Not logged' })

  const proteinTarget = getTargets().protein
  possible += 20
  if (e?.mealArr?.length) {
    const tot = mealTotals(e.mealArr).prot
    const pts = Math.max(0, Math.min(20, Math.round((20 * tot) / proteinTarget)))
    earned += pts; parts.push({ label: 'Protein', pts, max: 20, note: `${Math.round(tot)}g / ${proteinTarget}g` })
  } else parts.push({ label: 'Protein', pts: 0, max: 20, note: 'Not logged' })

  return { score: possible ? Math.round((earned / possible) * 100) : 0, parts, hasData: !!e }
}

export function disciplineAverages(j: Journal = getJournal()): { weeklyAvg: number; monthlyBest: number; monthAvg: number } {
  const last = (n: number) => Array.from({ length: n }, (_, i) => computeDisciplineScore(daysAgoKey(i), j).score)
  const week = last(7), month = last(30)
  const avg = (a: number[]) => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0
  return { weeklyAvg: avg(week), monthlyBest: Math.max(0, ...month), monthAvg: avg(month) }
}

// ─── weekly activity (Mon-Sun of the current week) ───────────────────────────

export function weekActivity(j: Journal = getJournal()): { days: { label: string; key: string; done: boolean; isToday: boolean }[]; count: number; scores: number[] } {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const days = labels.map((label, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i)
    const key = fmtKey(d)
    return { label, key, done: isWorkoutDay(j[key]), isToday: key === todayKey() }
  })
  const scores = days.map(d => computeDisciplineScore(d.key, j).score)
  return { days, count: days.filter(d => d.done).length, scores }
}

// ─── personal records ────────────────────────────────────────────────────────

export type PR = { exercise: string; weight: number; date: string }

export function bestSets(j: Journal = getJournal()): Map<string, PR> {
  const best = new Map<string, PR>()
  for (const k of Object.keys(j).sort()) {
    for (const ex of j[k]?.exArr ?? []) {
      for (const s of ex.sets ?? []) {
        if (s.done && s.w && (!best.has(ex.name) || s.w > best.get(ex.name)!.weight)) {
          best.set(ex.name, { exercise: ex.name, weight: s.w, date: k })
        }
      }
    }
  }
  return best
}

export function prEvents(j: Journal = getJournal()): PR[] {
  const running = new Map<string, number>()
  const events: PR[] = []
  for (const k of Object.keys(j).sort()) {
    for (const ex of j[k]?.exArr ?? []) {
      const dayMax = Math.max(0, ...(ex.sets ?? []).filter(s => s.done && s.w).map(s => s.w!))
      if (dayMax > (running.get(ex.name) ?? 0)) {
        if (running.has(ex.name)) events.push({ exercise: ex.name, weight: dayMax, date: k })
        running.set(ex.name, dayMax)
      }
    }
  }
  return events
}

export function strengthHistory(exercise: string, j: Journal = getJournal()): { date: string; weight: number }[] {
  const out: { date: string; weight: number }[] = []
  for (const k of Object.keys(j).sort()) {
    for (const ex of j[k]?.exArr ?? []) {
      if (ex.name !== exercise) continue
      const dayMax = Math.max(0, ...(ex.sets ?? []).filter(s => s.done && s.w).map(s => s.w!))
      if (dayMax > 0) out.push({ date: k, weight: dayMax })
    }
  }
  return out
}

export function relativeDate(k: string): string {
  const days = Math.round((parseKey(todayKey()).getTime() - parseKey(k).getTime()) / 864e5)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.round(days / 7)} week${Math.round(days / 7) > 1 ? 's' : ''} ago`
  return `${Math.round(days / 30)} month${Math.round(days / 30) > 1 ? 's' : ''} ago`
}

// ─── consistency heat map (last 12 weeks, Mon-Sun rows) ──────────────────────

export function consistencyGrid(j: Journal = getJournal()): { grid: number[][]; activePct: number } {
  // grid[row=weekday 0..6][col=week 0..11], value 0..3 intensity
  const now = new Date()
  const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const grid: number[][] = Array.from({ length: 7 }, () => Array(12).fill(0))
  let active = 0, total = 0
  for (let col = 0; col < 12; col++) {
    for (let row = 0; row < 7; row++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() - (11 - col) * 7 + row)
      if (d > now) continue
      total++
      const e = j[fmtKey(d)]
      const s = computeDisciplineScore(fmtKey(d), j).score
      const v = isWorkoutDay(e) ? 3 : s >= 50 ? 2 : s > 0 ? 1 : 0
      grid[row][col] = v
      if (v >= 2) active++
    }
  }
  return { grid, activePct: total ? Math.round((active / total) * 100) : 0 }
}

// ─── achievements (computed from real data) ──────────────────────────────────

export type Achievement = { id: string; icon: string; title: string; desc: string; unlocked: boolean }

export function computeAchievements(j: Journal = getJournal()): Achievement[] {
  const cfg = getConfig()
  const longest = calcLongestStreak(j)
  const workoutCount = Object.keys(j).filter(k => isWorkoutDay(j[k])).length
  const best = bestSets(j)
  const bench = best.get('Bench Press')?.weight ?? 0

  // consecutive days hitting water goal
  let waterStreak = 0
  for (let i = 0; i < 60; i++) {
    const e = j[daysAgoKey(i)]
    if (e?.water && e.water >= (cfg.waterGoal || 64)) waterStreak++
    else if (i > 0) break
  }
  // consecutive days hitting protein target
  const target = getTargets().protein
  let proteinStreak = 0
  for (let i = 0; i < 60; i++) {
    const e = j[daysAgoKey(i)]
    if (e?.mealArr?.length && mealTotals(e.mealArr).prot >= target) proteinStreak++
    else if (i > 0) break
  }
  // PRs in the last 7 days
  const weekAgo = daysAgoKey(7)
  const recentPRs = prEvents(j).filter(p => p.date >= weekAgo).length
  // weight lost
  const meas = getMeasurements().filter(m => m.weight).sort((a, b) => a.date.localeCompare(b.date))
  const lost = meas.length >= 2 ? parseFloat(meas[0].weight!) - Math.min(...meas.map(m => parseFloat(m.weight!))) : 0

  return [
    { id: 'streak7', icon: '🔥', title: '7-Day Streak', desc: '7 consecutive training days', unlocked: longest >= 7 },
    { id: 'bench2', icon: '💪', title: 'Bench 2-plate', desc: '225 lbs bench press', unlocked: bench >= 225 },
    { id: 'hydration', icon: '💧', title: 'Hydration Pro', desc: '5-day water goal streak', unlocked: waterStreak >= 5 },
    { id: 'lost10', icon: '⚖️', title: 'First 10 lbs', desc: 'Lost first 10 lbs', unlocked: lost >= 10 },
    { id: 'century', icon: '🏅', title: 'Century Club', desc: '100 workouts logged', unlocked: workoutCount >= 100 },
    { id: 'macro', icon: '🥗', title: 'Macro Master', desc: '7-day protein-goal streak', unlocked: proteinStreak >= 7 },
    { id: 'prweek', icon: '🏆', title: 'PR Week', desc: '3 PRs in a single week', unlocked: recentPRs >= 3 },
    { id: 'streak30', icon: '🌙', title: '30-Day Streak', desc: '30 consecutive days', unlocked: longest >= 30 },
  ]
}

// ─── coach insights (rule-based on real data — no fake AI claims) ────────────

export function coachInsights(j: Journal = getJournal()): { text: string; accent: 'green' | 'gold' | 'blue' | 'violet' }[] {
  const out: { text: string; accent: 'green' | 'gold' | 'blue' | 'violet' }[] = []
  const today = j[todayKey()] ?? {}
  const targets = getTargets()
  const protLeft = Math.max(0, targets.protein - Math.round(mealTotals(today.mealArr).prot))
  if (protLeft > 0 && protLeft < targets.protein) {
    out.push({ text: `You're ${protLeft}g away from your protein goal. A quick shake now keeps your gains on track.`, accent: 'gold' })
  }
  const wa = weekActivity(j)
  const longest = calcLongestStreak(j)
  const streak = calcStreak(j)
  if (streak > 0 && longest > streak && longest - streak <= 2) {
    out.push({ text: `You've hit ${wa.count} workout${wa.count === 1 ? '' : 's'} this week — ${longest - streak} more day${longest - streak === 1 ? '' : 's'} and you match your personal best streak.`, accent: 'green' })
  } else if (wa.count > 0) {
    out.push({ text: `${wa.count} workout${wa.count === 1 ? '' : 's'} logged this week. Keep stacking the days.`, accent: 'green' })
  }
  const d = disciplineAverages(j)
  const prev = Array.from({ length: 30 }, (_, i) => computeDisciplineScore(daysAgoKey(i + 30), j).score)
  const prevAvg = prev.length ? Math.round(prev.reduce((a, b) => a + b, 0) / prev.length) : 0
  if (prevAvg > 0 && d.monthAvg > prevAvg) {
    const up = Math.round(((d.monthAvg - prevAvg) / prevAvg) * 100)
    out.push({ text: `Your consistency has improved ${up}% over the last 30 days. The discipline is compounding.`, accent: 'violet' })
  }
  if (!out.length) out.push({ text: 'Log your first workout and meals today — every insight on this screen is computed from your real data.', accent: 'blue' })
  return out.slice(0, 3)
}

// ─── misc ────────────────────────────────────────────────────────────────────

export function greeting(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export function workoutVolume(e?: DayEntry): number {
  let v = 0
  for (const ex of e?.exArr ?? []) for (const s of ex.sets ?? []) if (s.done && s.w && s.r) v += s.w * s.r
  return Math.round(v)
}

export function workoutStats(j: Journal = getJournal()): { total: number; firstDate: string | null } {
  const keys = Object.keys(j).filter(k => isWorkoutDay(j[k])).sort()
  return { total: keys.length, firstDate: keys[0] ?? null }
}
