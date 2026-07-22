// ─── Ascend data layer ────────────────────────────────────────────────────────
// Single repository over localStorage. Every feature reads/writes through here —
// this is also the seam where Supabase sync will attach later.
//
// Keys keep the original `rj_` prefix so data created by the previous vanilla
// deploy of Ascend survives this rewrite. Schema v2 migrates the old
// {sets,reps,wt} exercise shape into the new per-set rows model.

export type SetRow = { w: number | null; r: number | null; done: boolean }
export type ExEntry = { name: string; sets: SetRow[] }
export type Meal = {
  type: string; name: string
  cal: number; prot: number; carb: number; fat: number
  time?: string // "3:30 PM"
}
export type DayEntry = {
  wType?: string
  exArr?: ExEntry[]
  finished?: boolean
  startedAt?: number
  finishedAt?: number
  mealArr?: Meal[]
  water?: number      // in the unit configured by cfg.waterUnit (oz by default)
  mood?: string
  cSleep?: string
  cSteps?: string
  cNotes?: string
}
export type Journal = Record<string, DayEntry>

export type Config = {
  name: string
  waterUnit: 'oz' | 'cups' | 'liters'
  waterGoal: number
  weightUnit: 'lbs' | 'kg'
  activity: number          // TDEE multiplier
  activityLabel: string
  notifications: Record<string, boolean>
  metricUnits: boolean
  reducedMotion: boolean
}

export type GoalResults = { calories: number; protein: number; carbs: number; fats: number }
export type Goals = {
  results?: GoalResults
  goalWeight?: number
  startWeight?: number
  benchGoal?: number
  streakGoal?: number
  goalCode?: string
}

export type Measurement = {
  date: string; weight?: string; wu?: string; fat?: string
  waist?: string; chest?: string; arms?: string; hips?: string; thighs?: string; mu?: string
}

export const SCHEMA_VERSION = 2

// ─── raw storage ──────────────────────────────────────────────────────────────

export function load<T>(k: string, fallback: T): T {
  try {
    const v = localStorage.getItem(k)
    return v === null ? fallback : (JSON.parse(v) as T)
  } catch { return fallback }
}
// Screens subscribe to data changes via this tiny emitter (see useAppData()).
const listeners = new Set<() => void>()
export function subscribe(fn: () => void): () => void {
  listeners.add(fn); return () => { listeners.delete(fn) }
}
export function save(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* quota/private mode */ }
  listeners.forEach(fn => fn())
}

// ─── date keys (same format as the vanilla app: "YYYY-MM-DD") ────────────────

export function fmtKey(d: Date): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
export function todayKey(): string { return fmtKey(new Date()) }
export function parseKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export function daysAgoKey(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n); return fmtKey(d)
}

// ─── migrations ───────────────────────────────────────────────────────────────

type LegacyEx = { name?: string; sets?: string | number; reps?: string | number; wt?: string | number }
type LegacyMeal = {
  type?: string; food?: string; foodName?: string
  cal?: string | number; prot?: string | number; carb?: string | number; fat?: string | number
}

function num(v: unknown): number | null {
  const n = parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : null
}

function migrateEx(old: LegacyEx): ExEntry | null {
  if (!old?.name) return null
  if (Array.isArray((old as unknown as ExEntry).sets)) return old as unknown as ExEntry // already new shape
  const count = Math.max(1, Math.min(20, parseInt(String(old.sets ?? '')) || 1))
  const w = num(old.wt), r = num(old.reps)
  // Historical entries are treated as completed — they were logged as done.
  return { name: old.name, sets: Array.from({ length: count }, () => ({ w, r, done: true })) }
}

function migrateMeal(old: LegacyMeal): Meal | null {
  if (!old) return null
  return {
    type: old.type || 'Snack',
    name: old.foodName || old.food || '',
    cal: num(old.cal) ?? 0, prot: num(old.prot) ?? 0,
    carb: num(old.carb) ?? 0, fat: num(old.fat) ?? 0,
  }
}

export function runMigrations() {
  const v = load<number>('rj_schema', 0)
  if (v >= SCHEMA_VERSION) return
  if (v < 2) {
    const journal = load<Record<string, Record<string, unknown>>>('rj_journal', {})
    const keys = Object.keys(journal)
    if (keys.length) {
      // Safety net: keep the pre-migration journal untouched under a backup key.
      save('rj_journal_prev2', journal)
      const migrated: Journal = {}
      for (const k of keys) {
        const e = journal[k] ?? {}
        const exArr = (Array.isArray(e.exArr) ? (e.exArr as LegacyEx[]) : [])
          .map(migrateEx).filter((x): x is ExEntry => !!x)
        const mealArr = (Array.isArray(e.mealArr) ? (e.mealArr as LegacyMeal[]) : [])
          .map(migrateMeal).filter((x): x is Meal => !!x && (x.name !== '' || x.cal > 0))
        migrated[k] = {
          ...(e as DayEntry),
          exArr, mealArr,
          water: num(e.water) ?? undefined,
          finished: exArr.length > 0 ? true : undefined,
        }
      }
      save('rj_journal', migrated)
    }
  }
  save('rj_schema', SCHEMA_VERSION)
}

// ─── typed accessors ──────────────────────────────────────────────────────────

const DEFAULT_CFG: Config = {
  name: '', waterUnit: 'oz', waterGoal: 64, weightUnit: 'lbs',
  activity: 1.55, activityLabel: 'Moderate',
  notifications: { all: true, workout: true, meal: false, weekly: true },
  metricUnits: false, reducedMotion: false,
}

export function getConfig(): Config {
  const raw = load<Partial<Config> & { waterGoal?: number }>('rj_cfg', {})
  // The vanilla app may have stored waterUnit 'cups' with goal 8 — honor it.
  return { ...DEFAULT_CFG, ...raw, notifications: { ...DEFAULT_CFG.notifications, ...(raw.notifications || {}) } }
}
export function saveConfig(patch: Partial<Config>) {
  save('rj_cfg', { ...getConfig(), ...patch })
}

export function getJournal(): Journal { return load<Journal>('rj_journal', {}) }
export function getDay(k: string): DayEntry { return getJournal()[k] ?? {} }
export function saveDay(k: string, patch: Partial<DayEntry>) {
  const j = getJournal()
  j[k] = { ...(j[k] ?? {}), ...patch }
  save('rj_journal', j)
}

export function getGoals(): Goals { return load<Goals>('rj_goals', {}) }
export function saveGoals(patch: Partial<Goals>) { save('rj_goals', { ...getGoals(), ...patch }) }

export function getMeasurements(): Measurement[] { return load<Measurement[]>('rj_meas', []) }
export function saveMeasurements(m: Measurement[]) { save('rj_meas', m) }

// ─── backup / restore / clear (feature parity with the vanilla app) ──────────

const BACKUP_KEYS = ['rj_journal', 'rj_cfg', 'rj_goals', 'rj_meas', 'rj_checkins', 'rj_templates', 'rj_schedule'] as const

export function exportBackup(): string {
  const data: Record<string, unknown> = { _app: 'ascend', _schema: SCHEMA_VERSION, _exported: new Date().toISOString() }
  for (const k of BACKUP_KEYS) data[k] = load(k, null)
  return JSON.stringify(data, null, 2)
}

export function importBackup(text: string): { ok: boolean; error?: string } {
  try {
    const data = JSON.parse(text)
    if (typeof data !== 'object' || data === null) return { ok: false, error: 'Not a valid backup file' }
    // Accept both the new format and the vanilla app's export ({journal: ...})
    if (data.journal && !data.rj_journal) data.rj_journal = data.journal
    let restored = 0
    for (const k of BACKUP_KEYS) {
      if (data[k] !== undefined && data[k] !== null) { save(k, data[k]); restored++ }
    }
    if (!restored) return { ok: false, error: 'No Ascend data found in this file' }
    // Old-schema backups get migrated on the spot.
    save('rj_schema', typeof data._schema === 'number' ? Math.min(data._schema, SCHEMA_VERSION) : 0)
    runMigrations()
    return { ok: true }
  } catch { return { ok: false, error: 'File could not be read as JSON' } }
}

export function clearAllData() {
  for (const k of [...BACKUP_KEYS, 'rj_schema', 'rj_journal_prev2']) {
    try { localStorage.removeItem(k) } catch { /* noop */ }
  }
}
