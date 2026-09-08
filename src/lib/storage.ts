import { SEED_EXERCISES } from '../data/exercises'
import { SEED_FOODS } from '../data/foods'
import { DEFAULT_SETTINGS, dateKey } from './macros'
import type {
  AppData,
  DayLog,
  Entry,
  Exercise,
  DayType,
  Food,
  LiftEntry,
  LiftGroup,
  LiftSet,
  MealSlot,
  Template,
} from './types'

const KEY = 'nutrition-tracker-v1'
const VERSION = 3

function emptyData(): AppData {
  return {
    version: VERSION,
    settings: { ...DEFAULT_SETTINGS },
    customFoods: [],
    customExercises: [],
    days: {},
    templates: [],
    lastAmounts: {},
    lastCosts: {},
    recent: {},
  }
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyData()
    const parsed = JSON.parse(raw) as Partial<AppData>
    return {
      ...emptyData(),
      ...parsed,
      version: VERSION,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    }
  } catch {
    // Corrupt storage must not brick the app — start clean rather than crash.
    return emptyData()
  }
}

let data: AppData = typeof localStorage === 'undefined' ? emptyData() : load()
const listeners = new Set<() => void>()

function commit(next: AppData) {
  data = next
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch (err) {
    console.error('Không lưu được dữ liệu', err)
  }
  listeners.forEach((l) => l())
}

export const store = {
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
  get: () => data,
}

function update(fn: (d: AppData) => AppData) {
  commit(fn(data))
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

// ---------------- foods ----------------

export function allFoods(d: AppData = data): Food[] {
  const overridden = new Set(d.customFoods.map((f) => f.id))
  return [...SEED_FOODS.filter((f) => !overridden.has(f.id)), ...d.customFoods]
}

export function foodMap(d: AppData = data): Map<string, Food> {
  return new Map(allFoods(d).map((f) => [f.id, f]))
}

export function saveFood(food: Omit<Food, 'id' | 'custom'> & { id?: string }) {
  const id = food.id ?? `custom-${uid()}`
  update((d) => ({
    ...d,
    customFoods: [
      ...d.customFoods.filter((f) => f.id !== id),
      { ...food, id, custom: true } as Food,
    ],
  }))
  return id
}

export function deleteFood(id: string) {
  update((d) => ({ ...d, customFoods: d.customFoods.filter((f) => f.id !== id) }))
}

/** true nếu id thuộc seed và đang bị custom food ghi đè — cho phép "khôi phục gốc" */
export function isOverriddenSeed(id: string, d: AppData = data): boolean {
  return SEED_FOODS.some((f) => f.id === id) && d.customFoods.some((f) => f.id === id)
}

// ---------------- exercises ----------------

/** Bài có sẵn + bài tự thêm. Bản custom trùng id sẽ ghi đè bài gốc (đổi tên, đổi quy ước kg). */
export function allExercises(d: AppData = data): Exercise[] {
  const overridden = new Set((d.customExercises ?? []).map((e) => e.id))
  return [
    ...SEED_EXERCISES.filter((e) => !overridden.has(e.id)),
    ...(d.customExercises ?? []),
  ]
}

export function exerciseMap(d: AppData = data): Map<string, Exercise> {
  return new Map(allExercises(d).map((e) => [e.id, e]))
}

export function saveExercise(ex: Omit<Exercise, 'id'> & { id?: string }) {
  const id = ex.id ?? `ex-${uid()}`
  const isSeed = SEED_EXERCISES.some((s) => s.id === id)
  update((d) => ({
    ...d,
    customExercises: [
      ...(d.customExercises ?? []).filter((e) => e.id !== id),
      { ...ex, id, custom: !isSeed } as Exercise,
    ],
  }))
  return id
}

/** Bỏ bản ghi đè để bài có sẵn quay về mặc định; bài tự thêm thì xoá hẳn. */
export function deleteExercise(id: string) {
  update((d) => ({
    ...d,
    customExercises: (d.customExercises ?? []).filter((e) => e.id !== id),
  }))
}

export function isOverriddenSeedExercise(id: string, d: AppData = data): boolean {
  return (
    SEED_EXERCISES.some((e) => e.id === id) &&
    (d.customExercises ?? []).some((e) => e.id === id)
  )
}

// ---------------- days & entries ----------------

export function getDay(date: string, d: AppData = data): DayLog {
  return d.days[date] ?? { date, entries: [] }
}

function withDay(d: AppData, date: string, fn: (day: DayLog) => DayLog): AppData {
  const day = d.days[date] ?? { date, entries: [] }
  return { ...d, days: { ...d.days, [date]: fn(day) } }
}

export function addEntry(
  date: string,
  input: {
    foodId: string
    amount: number
    meal: MealSlot
    oilTsp?: number
    cheat?: boolean
    cost?: number
  },
) {
  const entry: Entry = { id: uid(), ts: Date.now(), ...input }
  update((d) => {
    const next = withDay(d, date, (day) => ({ ...day, entries: [...day.entries, entry] }))
    const lastCosts = { ...next.lastCosts }
    // lưu đơn giá theo 1 đơn vị amount để lần sau nhân lại đúng cho khẩu phần khác
    if (input.cost !== undefined && input.cost > 0 && input.amount > 0) {
      lastCosts[input.foodId] = input.cost / input.amount
    }
    return {
      ...next,
      lastAmounts: { ...next.lastAmounts, [input.foodId]: input.amount },
      lastCosts,
      recent: { ...next.recent, [input.foodId]: Date.now() },
    }
  })
  return entry.id
}

/** Giá gợi ý cho `amount` đơn vị của món, dựa trên lần nhập gần nhất. */
export function suggestedCost(foodId: string, amount: number, d: AppData = data): number {
  const unit = d.lastCosts[foodId]
  return unit ? Math.round((unit * amount) / 500) * 500 : 0
}

export function updateEntry(date: string, id: string, patch: Partial<Entry>) {
  update((d) =>
    withDay(d, date, (day) => ({
      ...day,
      entries: day.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),
  )
}

export function removeEntry(date: string, id: string) {
  update((d) =>
    withDay(d, date, (day) => ({ ...day, entries: day.entries.filter((e) => e.id !== id) })),
  )
}

export function setDayField(date: string, patch: Partial<DayLog>) {
  update((d) => withDay(d, date, (day) => ({ ...day, ...patch })))
}

// ---------------- lifts ----------------

/** Bỏ set trống để một bài mở 3 dòng nhưng chỉ tập 2 set không đẻ ra set 0×0. */
function cleanSets(sets: LiftSet[]): LiftSet[] {
  return sets.filter((s) => s.reps > 0 && s.kg >= 0)
}

/**
 * Ghi set cho một bài trong ngày. Sets rỗng = xoá bài khỏi buổi tập.
 * Một bài chỉ có một entry mỗi ngày — tập lại bài đó thì thêm set vào entry cũ.
 */
export function setLiftEntry(date: string, exerciseId: string, sets: LiftSet[]) {
  const clean = cleanSets(sets)
  update((d) =>
    withDay(d, date, (day) => {
      const lifts = day.lifts ?? []
      const existing = lifts.find((e) => e.exerciseId === exerciseId)
      if (clean.length === 0) {
        return { ...day, lifts: lifts.filter((e) => e.exerciseId !== exerciseId) }
      }
      if (existing) {
        return {
          ...day,
          lifts: lifts.map((e) =>
            e.exerciseId === exerciseId ? { ...e, sets: clean } : e,
          ),
        }
      }
      const entry: LiftEntry = { id: uid(), exerciseId, sets: clean, ts: Date.now() }
      return { ...day, lifts: [...lifts, entry], dayTypes: withLift(day.dayTypes) }
    }),
  )
}

/**
 * Log một buổi tập vào ngày đã tự tay đánh dấu "Nghỉ" là mâu thuẫn — sửa nhãn theo
 * việc thực tế đã làm. Ngày chưa chọn tay thì để nguyên: `dayTypesFor` tự suy ra.
 */
function withLift(current?: DayType[]): DayType[] | undefined {
  if (!current) return undefined
  if (current.includes('lift')) return current
  return [...current.filter((t) => t !== 'rest'), 'lift']
}

export function removeLiftEntry(date: string, exerciseId: string) {
  setLiftEntry(date, exerciseId, [])
}

export function setLiftGroup(date: string, group: LiftGroup | undefined) {
  setDayField(date, { liftGroup: group })
}

// ---------------- nhãn ngày ----------------

/**
 * Ghi nhãn ngày. 'rest' loại trừ hai nhãn kia — không thể vừa nghỉ vừa tập.
 * Mảng rỗng = xoá lựa chọn tay, quay về suy diễn theo lịch tuần.
 */
export function setDayTypes(date: string, types: DayType[]) {
  const clean = types.includes('rest') ? (['rest'] as DayType[]) : types
  setDayField(date, {
    dayTypes: clean,
    // `isRunDay` là trường cũ, giữ đồng bộ để dữ liệu backup cũ không lệch
    isRunDay: clean.includes('run'),
    // Turbo là biến thể của ngày chạy — bỏ nhãn chạy thì không còn turbo nữa.
    ...(clean.includes('run') ? {} : { turbo: undefined }),
  })
}

/** Ngày chạy có kèm calisthenic. Chỉ có nghĩa khi ngày đang mang nhãn 'run'. */
export function setTurbo(date: string, on: boolean) {
  setDayField(date, { turbo: on || undefined })
}

export function toggleDayType(date: string, type: DayType, current: DayType[]) {
  const has = current.includes(type)
  if (type === 'rest') {
    setDayTypes(date, has ? [] : ['rest'])
    return
  }
  const next = has
    ? current.filter((t) => t !== type)
    : [...current.filter((t) => t !== 'rest'), type]
  setDayTypes(date, next)
}

export function clearWorkout(date: string) {
  setDayField(date, { lifts: undefined, liftGroup: undefined })
}

// ---------------- templates ----------------

export function saveTemplate(t: Omit<Template, 'id'> & { id?: string }) {
  const id = t.id ?? uid()
  update((d) => ({
    ...d,
    templates: [...d.templates.filter((x) => x.id !== id), { ...t, id }],
  }))
  return id
}

export function deleteTemplate(id: string) {
  update((d) => ({ ...d, templates: d.templates.filter((t) => t.id !== id) }))
}

/** Log toàn bộ template vào một bữa — 1 tap (spec mục 3.4) */
export function applyTemplate(date: string, templateId: string, meal: MealSlot) {
  const t = data.templates.find((x) => x.id === templateId)
  if (!t) return
  const now = Date.now()
  const entries: Entry[] = t.items.map((item, i) => ({
    id: uid(),
    ts: now + i,
    foodId: item.foodId,
    amount: item.amount,
    meal,
    oilTsp: item.oilTsp,
  }))
  update((d) => {
    const next = withDay(d, date, (day) => ({ ...day, entries: [...day.entries, ...entries] }))
    const recent = { ...next.recent }
    const lastAmounts = { ...next.lastAmounts }
    for (const item of t.items) {
      recent[item.foodId] = now
      lastAmounts[item.foodId] = item.amount
    }
    return { ...next, recent, lastAmounts }
  })
  // giá lấy theo lần nhập gần nhất của từng món
  for (const entry of entries) {
    const cost = suggestedCost(entry.foodId, entry.amount)
    if (cost > 0) updateEntry(date, entry.id, { cost })
  }
}

// ---------------- settings ----------------

export function setSettings(patch: Partial<AppData['settings']>) {
  update((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
}

// ---------------- backup ----------------

export function exportJSON(): string {
  return JSON.stringify(data, null, 2)
}

export function importJSON(raw: string): { ok: true } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw) as Partial<AppData>
    if (typeof parsed !== 'object' || parsed === null || !parsed.days) {
      return { ok: false, error: 'File không đúng định dạng backup.' }
    }
    commit({ ...emptyData(), ...parsed, version: VERSION })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: `Không đọc được file: ${(err as Error).message}` }
  }
}

export function downloadBackup() {
  const blob = new Blob([exportJSON()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `nutrition-backup-${dateKey()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function resetAll() {
  commit(emptyData())
}

/**
 * Ghi đè toàn bộ state trong đúng một lần commit. Dùng cho nút nạp dữ liệu mẫu:
 * dựng 7 ngày qua API từng-hành-động sẽ là hơn trăm lần ghi localStorage liên tiếp.
 */
export function replaceAll(next: AppData) {
  commit({ ...emptyData(), ...next, version: VERSION })
}

/** State rỗng để dựng dữ liệu mẫu từ đầu mà không phải nhân bản `emptyData`. */
export function blankData(): AppData {
  return emptyData()
}
