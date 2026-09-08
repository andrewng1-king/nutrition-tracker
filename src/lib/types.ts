export type FoodGroup = 'good' | 'moderate' | 'limit'

export type FoodCategory =
  | 'protein'
  | 'trung'
  | 'tinhbot'
  | 'snack'
  | 'anngoai'
  | 'khac'

/**
 * Macro numbers are always stated *per servingSize servingUnit*.
 * Per-100g foods: servingSize 100, servingUnit 'g'.
 * Per-piece foods: servingSize 1, servingUnit 'quả' | 'ổ' | 'muỗng' | 'phần'.
 */
export interface Food {
  id: string
  name: string
  category: FoodCategory
  group?: FoodGroup
  servingSize: number
  servingUnit: string
  kcal: number
  protein: number
  fat: number
  carb: number
  addedSugar?: number
  /** true for user-created foods (editable / deletable) */
  custom?: boolean
  /** wide error bar — món ăn ngoài, ước tính ±10-15% */
  estimate?: boolean
  note?: string
  /** giá tham khảo cho servingSize, VND — điền sẵn khi log */
  cost?: number
}

export type MealSlot = 'sang' | 'trua' | 'toi' | 'snack'

export interface Entry {
  id: string
  foodId: string
  /** in `servingUnit` of the food — grams, or number of pieces */
  amount: number
  meal: MealSlot
  ts: number
  /** teaspoons of oil added while cooking: +5g fat, +45 kcal each */
  oilTsp?: number
  cheat?: boolean
  /** chi phí thực tế của phần này, VND — nhập tay */
  cost?: number
}

export interface RunLog {
  distanceKm: number
  durationSec: number
  elevationM?: number
  /** kcal đốt được, ước tính từ quãng đường và cân nặng */
  burnKcal?: number
  source: 'manual' | 'file'
  fileName?: string
}

export type LiftGroup = 'pull' | 'push' | 'shoulder' | 'legs' | 'abs'

/** Bài tạ ở phòng gym vs bài thể trọng (calisthenic) — hai sub-tab khác nhau. */
export type LiftMode = 'gym' | 'calisthenic'

/**
 * Nhãn ngày, chọn cộng dồn được. 'rest' loại trừ hai cái kia.
 * Quyết định phần calo cộng/trừ vào target, và huy hiệu ở màn Lịch sử.
 */
export type DayType = 'run' | 'lift' | 'rest'

/**
 * Cách đọc con số kg người dùng nhập. Không dùng để quy đổi ra tải "thật" —
 * cáp và máy mỗi hãng một tỉ số ròng rọc, quy đổi chỉ tạo cảm giác chính xác giả.
 * Chỉ cần ghi nhất quán là so sánh được tiến bộ theo thời gian.
 */
export type LiftGear = 'stack' | 'db' | 'bar' | 'smith' | 'body'

export interface Exercise {
  id: string
  /** tên tiếng Anh chuẩn của bài — dễ tra cứu và khớp với tên máy ở phòng gym */
  name: string
  group: LiftGroup
  mode: LiftMode
  gear: LiftGear
  /** true = số nhập là MỖI BÊN (tạ đơn mỗi tay, đĩa mỗi đầu thanh) — volume nhân đôi */
  perSide?: boolean
  /** true for user-created exercises (editable / deletable) */
  custom?: boolean
  note?: string
}

export interface LiftSet {
  reps: number
  /** đúng con số người dùng đọc trên tạ/máy — xem `Exercise.perSide` */
  kg: number
}

export interface LiftEntry {
  id: string
  exerciseId: string
  sets: LiftSet[]
  ts: number
}

export interface DayLog {
  /** YYYY-MM-DD, local time */
  date: string
  entries: Entry[]
  /** overrides the weekday default (T3 + CN are run days) — thay bằng `dayTypes` */
  isRunDay?: boolean
  /** nhãn ngày người dùng tự chọn; không có thì suy ra từ lịch tuần + log thực tế */
  dayTypes?: DayType[]
  run?: RunLog
  /**
   * Ngày chạy có kèm calisthenic — "Turbo". Thuần nhãn hiển thị: phần calo của
   * buổi thể trọng đã nằm trong nhãn `lift`, cộng thêm ở đây là tính hai lần.
   * Tắt nhãn `run` thì cờ này bị xoá theo.
   */
  turbo?: boolean
  /** buổi tạ trong ngày — cố tình KHÔNG cộng kcal vào target, xem lib/lift.ts */
  lifts?: LiftEntry[]
  /** nhãn buổi tập, quyết định danh sách bài gợi ý trước */
  liftGroup?: LiftGroup
  weightKg?: number
  waistCm?: number
  note?: string
}

export interface Template {
  id: string
  name: string
  meal?: MealSlot
  items: { foodId: string; amount: number; oilTsp?: number }[]
}

export interface Macros {
  kcal: number
  protein: number
  fat: number
  carb: number
  addedSugar: number
}

export interface Targets {
  kcalMin: number
  kcalMax: number
  protein: number
  fat: number
  fatMin: number
  carb: number
  carbMin: number
  addedSugarMax: number
  kcalFloor: number
}

export type WarningLevel = 'warn' | 'ok'

export interface StatusWarning {
  key: 'protein' | 'fat' | 'kcal' | 'carb' | 'sugar'
  level: WarningLevel
  message: string
  /** how much of the macro is still missing, if applicable */
  deficit?: number
}

export interface Settings {
  weightKg: number
  /** g protein per kg bodyweight — target auto-scales with weight */
  proteinPerKg: number
  runDayWeekdays: number[]
  runDayExtraKcal: number
  /** kcal NET một buổi tạ ~60 phút đốt được — nhỏ hơn số đồng hồ báo rất nhiều */
  gymBurnKcal: number
  /** số buổi tạ mỗi tuần mà TDEE đã tính sẵn — dùng để khỏi cộng hai lần */
  gymSessionsPerWeek: number
}

export interface AppData {
  version: number
  settings: Settings
  customFoods: Food[]
  /** bài tập tự thêm, hoặc bản ghi đè tên/thiết lập của bài có sẵn */
  customExercises: Exercise[]
  days: Record<string, DayLog>
  templates: Template[]
  /** foodId -> last amount used, powers one-tap defaults */
  lastAmounts: Record<string, number>
  /** foodId -> giá mỗi 1 đơn vị amount (VND), để lần sau điền sẵn tiền */
  lastCosts: Record<string, number>
  /** foodId -> last time logged, powers the "Gần đây" list */
  recent: Record<string, number>
}
