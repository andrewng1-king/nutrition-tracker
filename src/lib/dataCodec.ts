import { DEFAULT_SETTINGS, parseDateKey, dateKey } from './macros'
import type { AppData } from './types'
import { SEED_FOODS } from '../data/foods'
import { SEED_EXERCISES } from '../data/exercises'
import { normalizeExercise } from './muscles'
import { historicalWeight } from './historyWeight'

export const DATA_VERSION = 5
type Obj = Record<string, unknown>
type Check = (v: unknown, path: string) => void
const fail = (path: string): never => { throw new Error(`Dữ liệu không hợp lệ: ${path}.`) }
const object = (v: unknown, p: string): Obj => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) fail(p)
  return v as Obj
}
const str: Check = (v, p) => { if (typeof v !== 'string' || !v.trim()) fail(p) }
const text: Check = (v, p) => { if (typeof v !== 'string') fail(p) }
const bool: Check = (v, p) => { if (typeof v !== 'boolean') fail(p) }
const num: Check = (v, p) => { if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) fail(p) }
const positive: Check = (v, p) => { num(v, p); if (v === 0) fail(p) }
const integer: Check = (v, p) => { num(v, p); if (!Number.isInteger(v)) fail(p) }
const oneOf = (...values: unknown[]): Check => (v, p) => { if (!values.includes(v)) fail(p) }
const array = (check: Check): Check => (v, p) => {
  if (!Array.isArray(v)) fail(p)
  ;(v as unknown[]).forEach((item, i) => check(item, `${p}[${i}]`))
}
function fields(v: unknown, p: string, required: Record<string, Check>, optional: Record<string, Check> = {}) {
  const o = object(v, p)
  for (const [key, check] of Object.entries(required)) check(o[key], `${p}.${key}`)
  for (const [key, check] of Object.entries(optional)) if (o[key] !== undefined) check(o[key], `${p}.${key}`)
}
const dayKey: Check = (v, p) => {
  str(v, p)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v as string) || dateKey(parseDateKey(v as string)) !== v) fail(p)
}
const food: Check = (v, p) => fields(v, p, {
  id: str, name: str, category: oneOf('protein', 'trung', 'tinhbot', 'snack', 'anngoai', 'khac'),
  servingSize: positive, servingUnit: str, kcal: num, protein: num, fat: num, carb: num,
}, { addedSugar: num, custom: bool, archived: bool, estimate: bool, note: text, cost: num, group: oneOf('good', 'moderate', 'limit') })
const exercise: Check = (v, p) => fields(v, p, {
  id: str, name: str, group: str, mode: oneOf('gym', 'calisthenic'), gear: oneOf('stack', 'db', 'bar', 'smith', 'body'),
}, { subs: array(str), perSide: bool, unilateral: bool, custom: bool, archived: bool, note: text, kgStep: positive })
const set: Check = (v, p) => fields(v, p, { kg: num, reps: integer }, { drops: array((d, path) => fields(d, path, { kg: num, reps: integer })) })
const meal = oneOf('sang', 'trua', 'toi', 'snack')
const liftMode = oneOf('gym', 'calisthenic')
const entry: Check = (v, p) => fields(v, p, { id: str, foodId: str, amount: positive, meal, ts: num }, {
  food, oilTsp: num, cheat: bool, cost: num,
})
const lift: Check = (v, p) => fields(v, p, { id: str, exerciseId: str, sets: array(set), ts: num }, { exercise, bodyKg: positive })
const day: Check = (v, p) => fields(v, p, { date: dayKey, entries: array(entry) }, {
  lifts: array(lift), plan: array((v, p) => fields(v, p, { exerciseId: str, sets: array(set) })),
  liftDone: array(liftMode), dayTypes: array(oneOf('run', 'lift', 'rest')), isRunDay: bool, turbo: bool,
  weightKg: positive, waistCm: positive, note: text, liftGroup: text,
  run: (v, p) => fields(v, p, { distanceKm: positive, durationSec: num, source: oneOf('manual', 'file') }, { elevationM: num, burnKcal: num, fileName: text }),
  walk: (v, p) => fields(v, p, { minutes: positive, speedKmh: positive, inclinePct: num, burnKcal: num }),
})
const numberRecord: Check = (v, p) => { for (const [k, value] of Object.entries(object(v, p))) num(value, `${p}.${k}`) }

export function createEmptyData(): AppData {
  return { version: DATA_VERSION, settings: { ...DEFAULT_SETTINGS, runDayWeekdays: [...DEFAULT_SETTINGS.runDayWeekdays] },
    customFoods: [], customExercises: [], days: {}, templates: [], workoutTemplates: [], lastAmounts: {}, lastCosts: {}, recent: {}, restSec: {} }
}

/** Một đường đọc chung cho local, backup và remote; chỉ commit khi toàn bộ hợp lệ. */
export function decodeAppData(value: unknown): AppData {
  const o = object(value, 'backup')
  if (o.version !== undefined) {
    integer(o.version, 'version')
    if ((o.version as number) > DATA_VERSION) throw new Error('Backup thuộc phiên bản app mới hơn. Hãy cập nhật app trước.')
  }
  const days = object(o.days, 'days')
  for (const [key, value] of Object.entries(days)) {
    dayKey(key, `days.${key}`); day(value, `days.${key}`)
    if ((value as Obj).date !== key) fail(`days.${key}.date`)
  }
  const defaults = createEmptyData()
  const settings = { ...defaults.settings, ...(o.settings === undefined ? {} : object(o.settings, 'settings')) }
  fields(settings, 'settings', { weightKg: positive, proteinPerKg: positive, runDayExtraKcal: num, gymBurnKcal: num,
    gymSessionsPerWeek: num, runDayWeekdays: array(oneOf(0, 1, 2, 3, 4, 5, 6)) })
  const checks: Record<string, Check> = {
    customFoods: array(food), customExercises: array(exercise),
    templates: array((v, p) => fields(v, p, { id: str, name: str, items: array((v, p) => fields(v, p, { foodId: str, amount: positive }, { oilTsp: num })) }, { meal })),
    workoutTemplates: array((v, p) => fields(v, p, { id: str, name: str, mode: liftMode, items: array((v, p) => fields(v, p, { exerciseId: str, sets: positive })) }, { group: text })),
    lastAmounts: numberRecord, lastCosts: numberRecord, recent: numberRecord, restSec: numberRecord,
  }
  for (const [key, check] of Object.entries(checks)) if (o[key] !== undefined) check(o[key], key)
  const result = { ...defaults, ...o, settings, version: DATA_VERSION } as AppData
  const foods = new Map([...SEED_FOODS, ...result.customFoods].map((f) => [f.id, f]))
  const seeds = new Map(SEED_EXERCISES.map((e) => [e.id, e]))
  const exercises = new Map([...SEED_EXERCISES, ...result.customExercises.map((e) => normalizeExercise(e, seeds.get(e.id)))].map((e) => [e.id, e]))
  result.days = Object.fromEntries(Object.entries(result.days).map(([date, day]) => [date, { ...day,
    entries: day.entries.map((e) => ({ ...e, food: e.food ?? foods.get(e.foodId) })),
    ...(day.lifts ? { lifts: day.lifts.map((e) => ({ ...e,
      exercise: e.exercise ? normalizeExercise(e.exercise, seeds.get(e.exerciseId)) : exercises.get(e.exerciseId),
      bodyKg: e.bodyKg ?? historicalWeight(result, date, settings.weightKg) })) } : {}),
  }]))
  return result
}
