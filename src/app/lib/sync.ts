// Ascend — cloud sync
//
// Design: local-first. Every store.ts save() call keeps writing to
// localStorage instantly and synchronously — nothing about the existing UI's
// speed or behavior changes. This module just listens for those saves (via
// the same subscribe() mechanism useAppData() already uses) and pushes a
// fresh snapshot to Supabase in the background, debounced so rapid edits
// don't spam the network. If Supabase is unreachable or misconfigured, this
// fails silently and localStorage keeps working exactly as it always has —
// cloud sync is additive, never a dependency for the app to function.

import { supabase, isSupabaseConfigured } from './supabase'
import {
  getConfig, saveConfig, getJournal, save,
  getMeasurements, saveMeasurements, type Measurement,
  getGoals, saveGoals, getGoalsList, saveGoalsList, type Goal,
  getActivePlan, saveActivePlan, getActiveCustomSession, saveActiveCustomSession,
  getSavedPlanIds, subscribe, type Journal, type Config,
} from './store'

let currentUserId: string | null = null
let pushTimer: ReturnType<typeof setTimeout> | null = null
let unsubscribeLocal: (() => void) | null = null

export function getSyncUserId(): string | null { return currentUserId }

// Call this once on sign-in (with the user's id) and once on sign-out (with null).
export function setSyncUser(userId: string | null) {
  currentUserId = userId
  if (userId && !unsubscribeLocal) {
    unsubscribeLocal = subscribe(schedulePush)
  } else if (!userId && unsubscribeLocal) {
    unsubscribeLocal(); unsubscribeLocal = null
    if (pushTimer) { clearTimeout(pushTimer); pushTimer = null }
  }
}

function schedulePush() {
  if (!currentUserId || !isSupabaseConfigured) return
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushAll().catch(err => console.warn('Cloud sync push failed (local data is unaffected):', err))
  }, 1500)
}

// ─── push: local → Supabase ─────────────────────────────────────────────────

export async function pushAll(): Promise<void> {
  if (!supabase || !currentUserId) return
  const uid = currentUserId
  const cfg = getConfig()
  const journal = getJournal()
  const meas = getMeasurements()
  const goals = getGoals()
  const goalsList = getGoalsList()
  const activePlan = getActivePlan()
  const activeCustom = getActiveCustomSession()
  const savedPlanIds = getSavedPlanIds()
  const now = new Date().toISOString()

  await supabase.from('profiles').upsert({
    id: uid, name: cfg.name, water_unit: cfg.waterUnit, water_goal: cfg.waterGoal,
    weight_unit: cfg.weightUnit, activity: cfg.activity, activity_label: cfg.activityLabel,
    notifications: cfg.notifications, metric_units: cfg.metricUnits, reduced_motion: cfg.reducedMotion,
    goal: cfg.goal ?? null, days_per_week: cfg.daysPerWeek ?? null, height_cm: cfg.heightCm ?? null,
    dob: cfg.dob ?? null, rest_timer_seconds: cfg.restTimerSeconds ?? null, updated_at: now,
  })

  const journalRows = Object.entries(journal).map(([date, data]) => ({ user_id: uid, date, data, updated_at: now }))
  if (journalRows.length) await supabase.from('journal').upsert(journalRows, { onConflict: 'user_id,date' })

  // Measurements have no stable id in the local model — replace-all keeps
  // this correct without needing to invent one retroactively.
  await supabase.from('measurements').delete().eq('user_id', uid)
  if (meas.length) {
    await supabase.from('measurements').insert(meas.map(m => ({
      user_id: uid, date: m.date, weight: m.weight ?? null, wu: m.wu ?? null, fat: m.fat ?? null,
      waist: m.waist ?? null, chest: m.chest ?? null, arms: m.arms ?? null,
      hips: m.hips ?? null, thighs: m.thighs ?? null, mu: m.mu ?? null,
    })))
  }

  await supabase.from('goals_calc').upsert({
    user_id: uid, results: goals.results ?? null, goal_weight: goals.goalWeight ?? null,
    start_weight: goals.startWeight ?? null, bench_goal: goals.benchGoal ?? null,
    streak_goal: goals.streakGoal ?? null, goal_code: goals.goalCode ?? null, updated_at: now,
  })

  // goals_list: delete-then-insert, same pattern as measurements above.
  // Upsert alone was the bug here — it only ever adds/updates rows, so a
  // goal deleted locally never got removed from Supabase, meaning the next
  // sync-pull (which happens on every app open) brought the "deleted" goal
  // right back. Deleting everything for this user first and re-inserting
  // exactly what's local now makes deletions actually stick.
  await supabase.from('goals_list').delete().eq('user_id', uid)
  if (goalsList.length) {
    await supabase.from('goals_list').insert(goalsList.map(g => ({
      id: g.id, user_id: uid, title: g.title, category: g.category, unit: g.unit, dir: g.dir,
      start: g.start, target: g.target, current: g.current, deadline: g.deadline ?? null,
      color: g.color, linked_metric: g.linkedMetric, linked_exercise: g.linkedExercise ?? null,
      completed: g.completed ?? false, created_at: g.createdAt,
    })))
  }

  if (activePlan) {
    await supabase.from('active_plan').upsert({
      user_id: uid, plan_id: activePlan.planId, current_week: activePlan.currentWeek,
      current_day_idx: activePlan.currentDayIdx, start_date: activePlan.startDate, updated_at: now,
    })
  } else {
    await supabase.from('active_plan').delete().eq('user_id', uid)
  }

  if (activeCustom) {
    await supabase.from('active_custom').upsert({
      user_id: uid, exercises: activeCustom.exercises, started_at: activeCustom.startedAt, updated_at: now,
    })
  } else {
    await supabase.from('active_custom').delete().eq('user_id', uid)
  }

  await supabase.from('saved_plans').delete().eq('user_id', uid)
  if (savedPlanIds.length) {
    await supabase.from('saved_plans').insert(savedPlanIds.map(id => ({ user_id: uid, plan_id: id })))
  }
}

// ─── pull: Supabase → local ─────────────────────────────────────────────────

export async function pullAll(userId: string): Promise<void> {
  if (!supabase) return

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (profile) {
    const patch: Partial<Config> = {
      name: profile.name ?? '', waterUnit: profile.water_unit, waterGoal: profile.water_goal,
      weightUnit: profile.weight_unit, activity: profile.activity, activityLabel: profile.activity_label,
      notifications: profile.notifications, metricUnits: profile.metric_units, reducedMotion: profile.reduced_motion,
      goal: profile.goal ?? undefined, daysPerWeek: profile.days_per_week ?? undefined,
      heightCm: profile.height_cm ?? undefined, dob: profile.dob ?? undefined,
      restTimerSeconds: profile.rest_timer_seconds ?? undefined,
      memberSince: profile.member_since ?? undefined,
    }
    saveConfig(patch)
  }

  const { data: journalRows } = await supabase.from('journal').select('date,data').eq('user_id', userId)
  if (journalRows && journalRows.length) {
    const journal: Journal = {}
    for (const r of journalRows) journal[r.date as string] = r.data
    save('rj_journal', journal)
  }

  const { data: measRows } = await supabase.from('measurements').select('*').eq('user_id', userId)
  if (measRows) {
    const meas: Measurement[] = measRows.map(r => ({
      date: r.date, weight: r.weight ?? undefined, wu: r.wu ?? undefined, fat: r.fat ?? undefined,
      waist: r.waist ?? undefined, chest: r.chest ?? undefined, arms: r.arms ?? undefined,
      hips: r.hips ?? undefined, thighs: r.thighs ?? undefined, mu: r.mu ?? undefined,
    }))
    saveMeasurements(meas)
  }

  const { data: goalsCalc } = await supabase.from('goals_calc').select('*').eq('user_id', userId).maybeSingle()
  if (goalsCalc) {
    saveGoals({
      results: goalsCalc.results ?? undefined, goalWeight: goalsCalc.goal_weight ?? undefined,
      startWeight: goalsCalc.start_weight ?? undefined, benchGoal: goalsCalc.bench_goal ?? undefined,
      streakGoal: goalsCalc.streak_goal ?? undefined, goalCode: goalsCalc.goal_code ?? undefined,
    })
  }

  const { data: goalsListRows } = await supabase.from('goals_list').select('*').eq('user_id', userId)
  if (goalsListRows) {
    const goalsList: Goal[] = goalsListRows.map(r => ({
      id: r.id, title: r.title, category: r.category, unit: r.unit, dir: r.dir,
      start: r.start, target: r.target, current: r.current, deadline: r.deadline ?? undefined,
      color: r.color, linkedMetric: r.linked_metric, linkedExercise: r.linked_exercise ?? undefined,
      completed: r.completed ?? false, createdAt: r.created_at,
    }))
    saveGoalsList(goalsList)
  }

  const { data: activePlanRow } = await supabase.from('active_plan').select('*').eq('user_id', userId).maybeSingle()
  saveActivePlan(activePlanRow ? {
    planId: activePlanRow.plan_id, currentWeek: activePlanRow.current_week,
    currentDayIdx: activePlanRow.current_day_idx, startDate: activePlanRow.start_date,
  } : null)

  const { data: activeCustomRow } = await supabase.from('active_custom').select('*').eq('user_id', userId).maybeSingle()
  saveActiveCustomSession(activeCustomRow ? {
    exercises: activeCustomRow.exercises, startedAt: activeCustomRow.started_at,
  } : null)

  const { data: savedPlanRows } = await supabase.from('saved_plans').select('plan_id').eq('user_id', userId)
  if (savedPlanRows) save('rj_saved_plans', savedPlanRows.map(r => r.plan_id))
}

// ─── one-time local-data adoption on first login ───────────────────────────
// Runs once per account. If this is a brand new account with no remote data
// yet and this device has local data, that local data becomes the account's
// data. If the account already has remote data (e.g. signing in on a second
// device), the remote data wins and gets pulled down instead — it should
// never be silently overwritten by whatever happens to be on this device.

// Runs on every login. The FIRST time an account is ever used anywhere, this
// decides whether to adopt this device's local data into the (empty) account
// or pull down existing cloud data (if this account was already set up on
// another device first). After that one-time decision, every subsequent
// login — on this device or any other — simply pulls the latest cloud state,
// which is what actually keeps multiple devices in sync. The earlier version
// of this function stopped doing anything at all once the one-time flag was
// set, which is why a second device never received data from the first.
export async function adoptLocalDataIfNeeded(userId: string): Promise<'adopted' | 'pulled' | 'skipped'> {
  if (!supabase) return 'skipped'

  const { data: status } = await supabase.from('migration_status').select('*').eq('user_id', userId).maybeSingle()

  if (status?.local_data_adopted) {
    // Established account — always sync the latest cloud state down on login.
    await pullAll(userId)
    return 'pulled'
  }

  // First login ever for this account, anywhere.
  const { data: existingJournal } = await supabase.from('journal').select('date').eq('user_id', userId).limit(1)
  const hasRemoteData = !!(existingJournal && existingJournal.length)
  const hasLocalData = Object.keys(getJournal()).length > 0

  if (hasRemoteData) {
    await pullAll(userId)
    await supabase.from('migration_status').upsert({ user_id: userId, local_data_adopted: true, adopted_at: new Date().toISOString() })
    return 'pulled'
  }
  if (hasLocalData) {
    setSyncUser(userId)
    await pushAll()
    await supabase.from('migration_status').upsert({ user_id: userId, local_data_adopted: true, adopted_at: new Date().toISOString() })
    return 'adopted'
  }
  await supabase.from('migration_status').upsert({ user_id: userId, local_data_adopted: true, adopted_at: new Date().toISOString() })
  return 'skipped'
}
