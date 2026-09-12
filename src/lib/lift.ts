import { dateKey } from './macros'
import type {
  AppData,
  Exercise,
  LiftEntry,
  LiftGear,
  LiftGroup,
  LiftMode,
  LiftSet,
  PlanItem,
  WorkoutTemplate,
} from './types'

export const LIFT_GROUPS: LiftGroup[] = ['pull', 'push', 'shoulder', 'legs', 'abs']

export const LIFT_GROUP_LABELS: Record<LiftGroup, string> = {
  pull: 'Kéo',
  push: 'Đẩy',
  shoulder: 'Vai',
  legs: 'Chân',
  abs: 'Bụng',
}

export const GEAR_LABELS: Record<LiftGear, string> = {
  stack: 'Máy / cáp',
  db: 'Tạ đơn',
  bar: 'Thanh đòn',
  smith: 'Thanh Smith',
  body: 'Thể trọng',
}

/** Bài thể trọng: tải là chính cơ thể, kg nhập thêm chỉ là phần đeo thêm. */
export function isBodyweight(ex: Exercise): boolean {
  return ex.gear === 'body'
}

/**
 * Buổi tạ KHÔNG cộng nguyên số kcal đốt được vào target.
 * TDEE 2600 trong spec đã gồm 4-5 buổi gym/tuần (activity multiplier), nên cộng
 * cả 200 kcal là tính hai lần và ăn mòn deficit 10-15%. Chỉ phần vượt trung bình
 * tuần được cộng (~+71), còn ngày không tập bị trừ lại phần đã tính dư (~−129) —
 * xem `computeAdjust` trong lib/macros.ts. Cả tuần bù trừ về đúng mốc cũ.
 *
 * Số set và mức tạ ở đây KHÔNG đổi con số calo đó: buổi tạ 60 phút ở 60kg đốt
 * ~150-250 kcal net, chênh lệch giữa các buổi (~±60 kcal) nhỏ hơn sai số ước
 * lượng khẩu phần (±10% của 2300 kcal ≈ ±230 kcal). Chạy bộ là ngoại lệ có lý do:
 * 5km và 10km chênh ~310 kcal, vượt hẳn ngưỡng nhiễu.
 */
export const LIFT_KCAL_NOTE =
  'Số set và mức tạ ở đây không đổi target calo — phần calo của ngày tập đã tính sẵn ở thanh loại ngày. Chỗ này chỉ đo tiến bộ sức nâng.'

/** Số nhập là mỗi bên thì tải thật gấp đôi. */
export function sideFactor(ex: Exercise): number {
  return ex.perSide ? 2 : 1
}

/**
 * kg quy về "tổng hai bên" để so sánh giữa các bài — vẫn là số máy, không phải tải thực.
 * Bài thể trọng: tải là cân nặng cơ thể cộng phần đeo thêm, nếu không mọi set
 * tay không đều ra volume 0 và biểu đồ calisthenic sẽ phẳng lì.
 */
export function effectiveKg(ex: Exercise, kg: number, bodyKg = 0): number {
  if (isBodyweight(ex)) return bodyKg + kg
  return kg * sideFactor(ex)
}

/** Volume một set, cộng cả các nấc dropset. */
export function setVolume(ex: Exercise, s: LiftSet, bodyKg = 0): number {
  const main = effectiveKg(ex, s.kg, bodyKg) * s.reps
  return (s.drops ?? []).reduce((sum, d) => sum + effectiveKg(ex, d.kg, bodyKg) * d.reps, main)
}

export function entryVolume(ex: Exercise, e: LiftEntry, bodyKg = 0): number {
  return e.sets.reduce((sum, s) => sum + setVolume(ex, s, bodyKg), 0)
}

/** Rep của một set, gồm cả rep ở các nấc dropset. */
export function setReps(s: LiftSet): number {
  return (s.drops ?? []).reduce((sum, d) => sum + d.reps, s.reps)
}

export function entryReps(e: LiftEntry): number {
  return e.sets.reduce((sum, s) => sum + setReps(s), 0)
}

export const DEFAULT_KG_STEP = 2.5

export function kgStepFor(ex: Exercise): number {
  return ex.kgStep && ex.kgStep > 0 ? ex.kgStep : DEFAULT_KG_STEP
}

/**
 * Bấm −/+ một nấc. Số lẻ so với bước nhảy thì bắt về nấc gần nhất theo chiều
 * bấm: 46 + (bước 2,5) ra 47,5 chứ không ra 48,5 — con số trên máy luôn là bội
 * của nấc tạ. Làm tròn 2 chữ số để 0,1 + 0,2 không lòi ra 0,30000000000000004.
 */
export function stepValue(value: number, step: number, dir: 1 | -1): number {
  const k = value / step
  const next = dir > 0 ? (Math.floor(k + 1e-6) + 1) * step : (Math.ceil(k - 1e-6) - 1) * step
  return Math.max(0, Math.round(next * 100) / 100)
}

/** Kg gợi ý cho nấc drop tiếp theo: giảm ~20%, làm tròn xuống nấc tạ. */
export function suggestDropKg(prevKg: number, step: number): number {
  if (prevKg <= 0) return 0
  const target = prevKg * 0.8
  return Math.max(0, Math.round(Math.floor(target / step + 1e-6) * step * 100) / 100)
}

/** Set nặng nhất; cùng mức tạ thì set nhiều rep hơn thắng. */
export function topSet(e: LiftEntry): LiftSet | undefined {
  return e.sets.reduce<LiftSet | undefined>((best, s) => {
    if (!best) return s
    if (s.kg !== best.kg) return s.kg > best.kg ? s : best
    return s.reps > best.reps ? s : best
  }, undefined)
}

/**
 * 1RM ước tính theo công thức Epley: kg × (1 + reps/30).
 * Dùng để so một set 8 rep với một set 12 rep của cùng bài. Trên ~12 rep công thức
 * thổi số lên khá nhiều, nên `reliableE1rm` đánh dấu những set đó là tham khảo.
 */
export function e1rm(ex: Exercise, s: LiftSet, bodyKg = 0): number {
  if (s.reps <= 0) return 0
  const load = effectiveKg(ex, s.kg, bodyKg)
  if (load <= 0) return 0
  return load * (1 + s.reps / 30)
}

export function reliableE1rm(s: LiftSet): boolean {
  return s.reps > 0 && s.reps <= 12
}

export function bestE1rm(ex: Exercise, e: LiftEntry, bodyKg = 0): number {
  return e.sets.reduce((best, s) => Math.max(best, e1rm(ex, s, bodyKg)), 0)
}

/** "22 kg/bên × 10", hoặc "tay không × 12" cho bài thể trọng */
export function setLabel(ex: Exercise, s: LiftSet): string {
  return `${kgLabel(ex, s.kg)} × ${s.reps}`
}

/** "22 kg/bên" · "55 kg" · "tay không" · "+8 kg" */
export function kgLabel(ex: Exercise, kg: number): string {
  const num = Number(kg.toFixed(2)).toLocaleString('vi-VN')
  if (isBodyweight(ex)) return kg > 0 ? `+${num} kg` : 'tay không'
  return ex.perSide ? `${num} kg/bên` : `${num} kg`
}

export interface SessionSummary {
  exercises: number
  sets: number
  reps: number
  volume: number
}

export function summarize(
  entries: LiftEntry[],
  exById: Map<string, Exercise>,
  bodyKg = 0,
): SessionSummary {
  let sets = 0
  let reps = 0
  let volume = 0
  for (const e of entries) {
    const ex = exById.get(e.exerciseId)
    if (!ex) continue
    sets += e.sets.length
    reps += entryReps(e)
    volume += entryVolume(ex, e, bodyKg)
  }
  return { exercises: entries.length, sets, reps, volume }
}

/** Các ngày có log tạ, cũ -> mới. `mode` lọc riêng gym hoặc calisthenic. */
export function liftDates(
  data: AppData,
  mode?: LiftMode,
  exById?: Map<string, Exercise>,
): string[] {
  return Object.keys(data.days)
    .filter((d) => {
      const lifts = data.days[d]?.lifts ?? []
      if (lifts.length === 0) return false
      if (!mode || !exById) return true
      return lifts.some((e) => exById.get(e.exerciseId)?.mode === mode)
    })
    .sort()
}

export interface LiftPoint {
  date: string
  entry: LiftEntry
  top: LiftSet
  e1rm: number
  volume: number
}

/** Lịch sử một bài, cũ -> mới. Ngày nào tập bài đó nhiều lần thì gộp lại. */
export function exerciseHistory(
  data: AppData,
  ex: Exercise,
  end?: string,
  bodyKg = 0,
): LiftPoint[] {
  const out: LiftPoint[] = []
  for (const date of liftDates(data)) {
    if (end && date > end) continue
    const entries = (data.days[date]?.lifts ?? []).filter((e) => e.exerciseId === ex.id)
    if (entries.length === 0) continue
    const merged: LiftEntry = {
      ...entries[0],
      sets: entries.flatMap((e) => e.sets),
    }
    const top = topSet(merged)
    if (!top) continue
    out.push({
      date,
      entry: merged,
      top,
      e1rm: bestE1rm(ex, merged, bodyKg),
      volume: entryVolume(ex, merged, bodyKg),
    })
  }
  return out
}

/** Lần tập gần nhất của bài, trước `before` — dùng để điền sẵn set lần này. */
export function lastSetsFor(
  data: AppData,
  exerciseId: string,
  before: string,
): { date: string; sets: LiftSet[] } | undefined {
  const dates = liftDates(data).filter((d) => d < before)
  for (let i = dates.length - 1; i >= 0; i--) {
    const date = dates[i]
    const sets = (data.days[date]?.lifts ?? [])
      .filter((e) => e.exerciseId === exerciseId)
      .flatMap((e) => e.sets)
    if (sets.length > 0) return { date, sets }
  }
  return undefined
}

/** Kỷ lục e1RM trước ngày đang xét — để gắn nhãn PR. */
export function priorBestE1rm(
  data: AppData,
  ex: Exercise,
  before: string,
  bodyKg = 0,
): number {
  return exerciseHistory(data, ex, undefined, bodyKg)
    .filter((p) => p.date < before)
    .reduce((best, p) => Math.max(best, p.e1rm), 0)
}

export interface WeekVolume {
  /** ngày đầu tuần (thứ 2), YYYY-MM-DD */
  start: string
  byGroup: Record<LiftGroup, number>
  total: number
  sessions: number
}

const p2 = (x: number) => String(x).padStart(2, '0')

function fmt(d: Date): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}

function mondayOf(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  // getDay(): CN=0 -> lùi 6 ngày; T2=1 -> lùi 0
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return fmt(date)
}

/**
 * Volume theo tuần cho `weeks` tuần lịch gần nhất, cũ -> mới.
 * Đếm theo tuần chứa `end` rồi lùi lại, KHÔNG theo cửa sổ `weeks × 7` ngày —
 * cửa sổ ngày sẽ chạm sang tuần thứ N+1 mỗi khi `end` rơi vào đầu tuần.
 */
export function weeklyVolume(
  data: AppData,
  weeks: number,
  exById: Map<string, Exercise>,
  end?: string,
  opts: { mode?: LiftMode; bodyKg?: number } = {},
): WeekVolume[] {
  const zero = (): Record<LiftGroup, number> =>
    ({ pull: 0, push: 0, shoulder: 0, legs: 0, abs: 0 })

  const last = mondayOf(end ?? dateKey())
  const [ly, lm, ld] = last.split('-').map(Number)
  const buckets = new Map<string, WeekVolume>()
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(ly, lm - 1, ld - i * 7)
    const start = fmt(d)
    buckets.set(start, { start, byGroup: zero(), total: 0, sessions: 0 })
  }

  for (const date of liftDates(data)) {
    const start = mondayOf(date)
    const bucket = buckets.get(start)
    if (!bucket) continue
    bucket.sessions += 1
    for (const e of data.days[date]?.lifts ?? []) {
      const ex = exById.get(e.exerciseId)
      if (!ex) continue
      if (opts.mode && ex.mode !== opts.mode) continue
      const v = entryVolume(ex, e, opts.bodyKg ?? 0)
      bucket.byGroup[ex.group] += v
      bucket.total += v
    }
  }

  return [...buckets.values()].sort((a, b) => a.start.localeCompare(b.start))
}

/**
 * "22,5" và "22.5" đều ra 22.5 — máy nào cũng in dấu phẩy, bàn phím số nào cũng
 * gõ dấu chấm. Chuỗi rỗng hoặc rác trả về 0 chứ không NaN.
 */
export function parseKg(text: string): number {
  const v = Number(text.trim().replace(',', '.'))
  return Number.isFinite(v) && v >= 0 ? v : 0
}

/** 12340 -> "12,3k" — volume là số to, nhãn biểu đồ không cần đủ chữ số. */
export function volumeShort(kg: number): string {
  if (kg >= 1000) return `${Number((kg / 1000).toFixed(1)).toLocaleString('vi-VN')}k`
  return String(Math.round(kg))
}

/** "22,5×8", dropset thành "22,5×8↘17,5×6" — gọn cho danh sách set. */
export function shortSet(s: LiftSet): string {
  const part = (kg: number, reps: number) =>
    `${Number(kg.toFixed(2)).toLocaleString('vi-VN')}×${reps}`
  return [part(s.kg, s.reps), ...(s.drops ?? []).map((d) => part(d.kg, d.reps))].join('↘')
}

// ---------------- bắt đầu buổi: lần trước, buổi mẫu, kế hoạch ----------------

export interface PastSession {
  date: string
  entries: LiftEntry[]
}

/**
 * Buổi gần nhất trước `before` của đúng nhóm và chế độ đang tập. Ngày có gắn
 * nhãn nhóm thì khớp theo nhãn; ngày cũ chưa có nhãn thì khớp khi quá nửa số
 * bài thuộc nhóm đó — dữ liệu trước khi có chip nhóm vẫn gợi ý được.
 */
export function lastSessionFor(
  data: AppData,
  mode: LiftMode,
  group: LiftGroup,
  before: string,
  exById: Map<string, Exercise>,
): PastSession | undefined {
  const dates = liftDates(data).filter((d) => d < before)
  for (let i = dates.length - 1; i >= 0; i--) {
    const day = data.days[dates[i]]
    const entries = (day?.lifts ?? []).filter((e) => exById.get(e.exerciseId)?.mode === mode)
    if (entries.length === 0) continue
    const matches = day.liftGroup
      ? day.liftGroup === group
      : entries.filter((e) => exById.get(e.exerciseId)?.group === group).length * 2 >
        entries.length
    if (matches) return { date: dates[i], entries }
  }
  return undefined
}

/** Kế hoạch chép nguyên set của một buổi cũ. */
export function planFromSession(session: PastSession): PlanItem[] {
  return session.entries.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets }))
}

/**
 * Kế hoạch từ buổi mẫu: đủ số set của mẫu, kg/rep lấy từ lần tập gần nhất.
 * Mẫu nhiều set hơn lần trước thì lặp lại set cuối; bài chưa tập bao giờ thì
 * để set trống cho người dùng tự điền.
 */
export function planFromTemplate(
  data: AppData,
  template: WorkoutTemplate,
  date: string,
): PlanItem[] {
  return template.items.map((item) => {
    const last = lastSetsFor(data, item.exerciseId, date)?.sets ?? []
    const sets: LiftSet[] = Array.from({ length: Math.max(1, item.sets) }, (_, i) => {
      const src = last[Math.min(i, last.length - 1)]
      return src ? { ...src } : { kg: 0, reps: 0 }
    })
    return { exerciseId: item.exerciseId, sets }
  })
}

/** Điểm cho sparkline ở danh sách bài: `count` buổi gần nhất của chỉ số chính. */
export function sparkValues(
  data: AppData,
  ex: Exercise,
  bodyKg: number,
  count = 6,
): number[] {
  return exerciseHistory(data, ex, undefined, bodyKg)
    .slice(-count)
    .map((p) => (isBodyweight(ex) ? p.top.reps : p.e1rm))
}
