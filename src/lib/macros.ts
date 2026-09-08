import type {
  DayLog,
  DayType,
  Entry,
  Food,
  Macros,
  Settings,
  StatusWarning,
  Targets,
} from './types'

/** 1 muỗng cà phê dầu = +5g fat, +45 kcal (spec mục 8) */
export const OIL_TSP_FAT = 5
export const OIL_TSP_KCAL = 45

export const ZERO: Macros = { kcal: 0, protein: 0, fat: 0, carb: 0, addedSugar: 0 }

export const DEFAULT_SETTINGS: Settings = {
  weightKg: 60,
  proteinPerKg: 2.33,
  runDayWeekdays: [2, 0], // Thứ 3 (getDay()===2) và Chủ nhật (0)
  runDayExtraKcal: 475, // giữa dải 350-600
  gymBurnKcal: 200, // tạ 60 phút ở 60kg đốt ~150-250 kcal NET, không phải 500-700
  gymSessionsPerWeek: 4.5, // lịch 4-5 buổi/tuần đã nằm trong TDEE 2600
}

export function macrosFor(food: Food, amount: number, oilTsp = 0): Macros {
  const k = amount / food.servingSize
  return {
    kcal: food.kcal * k + oilTsp * OIL_TSP_KCAL,
    protein: food.protein * k,
    fat: food.fat * k + oilTsp * OIL_TSP_FAT,
    carb: food.carb * k,
    addedSugar: (food.addedSugar ?? 0) * k,
  }
}

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    fat: a.fat + b.fat,
    carb: a.carb + b.carb,
    addedSugar: a.addedSugar + b.addedSugar,
  }
}

export function sumEntries(
  entries: Entry[],
  foodById: (id: string) => Food | undefined,
): Macros {
  let total = ZERO
  for (const e of entries) {
    const food = foodById(e.foodId)
    if (!food) continue
    total = addMacros(total, macrosFor(food, e.amount, e.oilTsp ?? 0))
  }
  return total
}

/** YYYY-MM-DD in local time — never UTC, a meal logged at 23:00 belongs to that day. */
export function dateKey(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Nhãn ngày. Người dùng chọn tay thì lấy đúng lựa chọn đó; chưa chọn thì suy ra:
 * chạy bộ theo lịch tuần (T3 + CN), tạ khi trong ngày đã có log bài tập.
 */
export function dayTypesFor(
  dateStr: string,
  settings: Settings,
  day?: DayLog,
): DayType[] {
  const raw = rawDayTypes(dateStr, settings, day)
  // Turbo đã là buổi thể trọng của ngày chạy, và ngày Turbo thì không xếp thêm
  // buổi tạ phòng gym. Lọc ở đây để dữ liệu cũ (hoặc dữ liệu mẫu) từng ghi cả
  // hai nhãn vẫn đọc ra đúng một trạng thái.
  return day?.turbo ? raw.filter((t) => t !== 'lift') : raw
}

function rawDayTypes(dateStr: string, settings: Settings, day?: DayLog): DayType[] {
  if (day?.dayTypes) return day.dayTypes

  const out: DayType[] = []
  const runByCalendar = settings.runDayWeekdays.includes(parseDateKey(dateStr).getDay())
  if (day?.isRunDay ?? runByCalendar) out.push('run')
  if ((day?.lifts?.length ?? 0) > 0) out.push('lift')
  return out
}

export function isRunDay(dateStr: string, settings: Settings, day?: DayLog): boolean {
  return dayTypesFor(dateStr, settings, day).includes('run')
}

export function isLiftDay(dateStr: string, settings: Settings, day?: DayLog): boolean {
  return dayTypesFor(dateStr, settings, day).includes('lift')
}

/**
 * Phần kcal của buổi tạ mà TDEE đã tính sẵn, quy về mỗi ngày.
 * TDEE 2600 là trung bình tuần của lịch 4-5 buổi gym, nên buổi tạ nằm sẵn trong đó.
 * Ngày có tập thì cộng phần vượt trên trung bình, ngày nghỉ thì trừ đi phần đã tính dư.
 * Với 200 kcal × 4,5 buổi / 7 ngày: ngày tập +71, ngày không tập −129.
 */
export function gymBaselineKcal(settings: Settings): number {
  return (settings.gymBurnKcal * settings.gymSessionsPerWeek) / 7
}

export interface DayAdjust {
  runDay: boolean
  liftDay: boolean
  /** kcal đốt được từ buổi chạy đã log — thay cho con số mặc định của settings */
  runBurnKcal?: number
}

/** Chi tiết phần calo cộng/trừ, để màn hình giải thích được từng khoản. */
export interface KcalAdjust {
  run: number
  gym: number
  total: number
}

export function computeAdjust(settings: Settings, day: DayAdjust): KcalAdjust {
  const raw = day.runBurnKcal ?? settings.runDayExtraKcal
  // chặn trên để một lần nhập sai quãng đường không thổi target lên gấp đôi
  const run = day.runDay ? Math.max(0, Math.min(raw, 900)) : 0
  const baseline = gymBaselineKcal(settings)
  const gym = Math.round(day.liftDay ? settings.gymBurnKcal - baseline : -baseline)
  return { run, gym, total: run + gym }
}

/**
 * Targets — spec mục 2.
 * Protein scales with bodyweight (giữ ~2.3 g/kg). Phần kcal cộng thêm dồn hết vào
 * carb, không cộng protein. Ngưỡng cảnh báo (fatMin, carbMin, kcalFloor) là số tuyệt
 * đối theo spec mục 6 — không đổi theo loại ngày.
 */
export function computeTargets(settings: Settings, day: DayAdjust): Targets {
  const { total } = computeAdjust(settings, day)
  const extraCarb = Math.round(total / 4)
  return {
    kcalMin: 2250 + total,
    kcalMax: 2350 + total,
    protein: Math.round(settings.weightKg * settings.proteinPerKg),
    fat: 65,
    fatMin: 50,
    // carb không bao giờ tụt dưới sàn cảnh báo, nếu không ngày nghỉ sẽ tự báo động
    carb: Math.max(285 + extraCarb, 200),
    carbMin: 200,
    addedSugarMax: 30,
    kcalFloor: 2000,
  }
}

/**
 * STATUS_RULES — spec mục 6.
 * Trả về theo đúng thứ tự ưu tiên: protein > fat > calo > carb > đường.
 * Mảng rỗng = OK.
 */
export function evaluate(m: Macros, t: Targets): StatusWarning[] {
  const out: StatusWarning[] = []

  if (m.protein < t.protein) {
    out.push({
      key: 'protein',
      level: 'warn',
      message: 'Thiếu protein — gợi ý ức gà / tôm / whey',
      deficit: t.protein - m.protein,
    })
  }
  if (m.fat < t.fatMin) {
    out.push({
      key: 'fat',
      level: 'warn',
      message: 'Fat quá thấp, ảnh hưởng hormone',
      deficit: t.fatMin - m.fat,
    })
  } else if (m.fat > t.fat) {
    out.push({
      key: 'fat',
      level: 'warn',
      message: 'Vượt fat budget',
      deficit: t.fat - m.fat,
    })
  }
  if (m.kcal < t.kcalFloor) {
    out.push({
      key: 'kcal',
      level: 'warn',
      message: 'Ăn quá ít, nguy cơ mất cơ',
      deficit: t.kcalFloor - m.kcal,
    })
  }
  if (m.carb < t.carbMin) {
    out.push({
      key: 'carb',
      level: 'warn',
      message: 'Carb thấp — sẽ đuối khi tập',
      deficit: t.carbMin - m.carb,
    })
  }
  if (m.addedSugar > t.addedSugarMax) {
    out.push({
      key: 'sugar',
      level: 'warn',
      message: 'Đường vượt giới hạn',
      deficit: t.addedSugarMax - m.addedSugar,
    })
  }

  return out
}

export type MacroKey = 'protein' | 'fat' | 'carb'

export interface Suggestion {
  food: Food
  amount: number
  unit: string
  macros: Macros
}

function roundPortion(amount: number, unit: string): number {
  // gram -> số nguyên; đơn vị đếm (quả, muỗng, ổ) -> bội số 0.25
  if (unit === 'g') return Math.round(amount)
  return Math.max(0.25, Math.round(amount * 4) / 4)
}

/**
 * Chỉ gợi ý món thực sự giàu macro đang thiếu: mật độ phải đạt ít nhất 45% của
 * món đậm đặc nhất. Không có ngưỡng này thì "thiếu 200g carb" sẽ ra 10kg đậu hũ.
 */
const DENSITY_GATE = 0.45

/**
 * Portion helper — spec mục 6.
 * Thiếu X gram của một macro -> cần ăn bao nhiêu của các món nhóm `good`.
 * VD: thiếu 30g protein -> 97g ức gà HOẶC 125g tôm HOẶC 1.25 muỗng whey.
 *
 * Xếp hạng theo mật độ macro trên mỗi kcal — bù đủ với ít calo nhất. Ưu tiên trải
 * đều các nhóm thực phẩm để gợi ý không bị toàn cá, nhưng chỉ trong số món đã qua
 * ngưỡng mật độ. `preferIds` (món hay ăn gần đây) được đẩy lên đầu — gợi ý món đã
 * có sẵn trong tủ lạnh mới thực sự dùng được.
 */
export function suggestPortions(
  macro: MacroKey,
  deficit: number,
  foods: Food[],
  limit = 3,
  preferIds: string[] = [],
): Suggestion[] {
  if (deficit <= 0) return []

  const density = (f: Food) => f[macro] / f.kcal
  const pool = foods.filter((f) => f.group === 'good' && f[macro] > 0 && !f.estimate)
  if (pool.length === 0) return []

  const best = Math.max(...pool.map(density))
  const prefer = new Set(preferIds)
  const ranked = pool
    .filter((f) => density(f) >= best * DENSITY_GATE)
    .sort((a, b) => {
      const pref = Number(prefer.has(b.id)) - Number(prefer.has(a.id))
      if (pref !== 0) return pref
      return density(b) - density(a)
    })

  // Một món mỗi nhóm trước, rồi mới lấp đầy bằng phần còn lại nếu chưa đủ.
  const seenCategory = new Set<string>()
  const candidates: Food[] = []
  const rest: Food[] = []
  for (const f of ranked) {
    if (seenCategory.has(f.category)) rest.push(f)
    else {
      seenCategory.add(f.category)
      candidates.push(f)
    }
  }
  const picked = [...candidates, ...rest].slice(0, limit)

  return picked.map((food) => {
    const perUnit = food[macro] / food.servingSize
    const amount = roundPortion(deficit / perUnit, food.servingUnit)
    return { food, amount, unit: food.servingUnit, macros: macrosFor(food, amount) }
  })
}

export function round(n: number, digits = 0): number {
  const p = 10 ** digits
  return Math.round(n * p) / p
}

/** Trung bình các ngày CÓ log — ngày trống không kéo trung bình xuống. */
export function averageMacros(list: Macros[]): Macros {
  const logged = list.filter((m) => m.kcal > 0)
  if (logged.length === 0) return ZERO
  const total = logged.reduce(addMacros, ZERO)
  return {
    kcal: total.kcal / logged.length,
    protein: total.protein / logged.length,
    fat: total.fat / logged.length,
    carb: total.carb / logged.length,
    addedSugar: total.addedSugar / logged.length,
  }
}
