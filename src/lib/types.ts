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

/**
 * Nhóm cơ chính của bài. Trước đây là nhóm split (pull/push/…) — dữ liệu cũ còn
 * mang 'pull' / 'push' được quy đổi lúc đọc, xem `normalizeExercise` ở lib/muscles.ts.
 */
export type LiftGroup =
  | 'chest'
  | 'back'
  | 'shoulder'
  | 'biceps'
  | 'triceps'
  | 'forearm'
  | 'legs'
  | 'abs'

/** Nhóm phụ trong một nhóm cơ chính — tiền tố là nhóm chính. */
export type LiftSub =
  | 'chest-upper'
  | 'chest-mid'
  | 'chest-lower'
  | 'back-lat-mid'
  | 'back-lat-low'
  | 'back-mid'
  | 'back-traps'
  | 'back-lower'
  | 'shoulder-front'
  | 'shoulder-side'
  | 'shoulder-rear'
  | 'biceps-long'
  | 'biceps-short'
  | 'biceps-brachialis'
  | 'triceps-long'
  | 'triceps-lateral'
  | 'triceps-medial'
  | 'forearm-flexor'
  | 'forearm-extensor'
  | 'forearm-brachioradialis'
  | 'forearm-grip'
  | 'legs-quads'
  | 'legs-hams'
  | 'legs-glutes'
  | 'legs-calves'
  | 'abs-upper'
  | 'abs-lower'
  | 'abs-obliques'

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
  /**
   * Các phần của nhóm cơ mà bài tác động, đúng theo giải phẫu — bao nhiêu cũng
   * được. Volume của bài chia đều cho từng phần. Rỗng = không tách phần.
   */
  subs?: LiftSub[]
  mode: LiftMode
  gear: LiftGear
  /** true = số nhập là MỖI BÊN (tạ đơn mỗi tay, đĩa mỗi đầu thanh) — volume nhân đôi */
  perSide?: boolean
  /**
   * true = tập lần lượt từng tay/chân, rep ghi là của một bên (bên yếu hơn) —
   * volume nhân đôi, 1RM giữ nguyên. Độc lập với `perSide`: kg vẫn đọc như cũ.
   */
  unilateral?: boolean
  /** true for user-created exercises (editable / deletable) */
  custom?: boolean
  note?: string
  /** bước nhảy của nút −/+ ở ô kg; không có thì 2,5 — máy nấc 5 kg thì đặt 5 */
  kgStep?: number
}

/** Một nấc giảm tạ của dropset: làm liền ngay sau set chính, không nghỉ. */
export interface LiftDrop {
  reps: number
  kg: number
}

export interface LiftSet {
  reps: number
  /** đúng con số người dùng đọc trên tạ/máy — xem `Exercise.perSide` */
  kg: number
  /**
   * Dropset: các nấc sau set chính. Cả chuỗi vẫn tính là MỘT set. Volume cộng mọi
   * nấc, còn top set / 1RM chỉ đọc set chính — nấc sau làm lúc cơ đã mỏi, đưa vào
   * sẽ kéo ước tính sức nâng xuống.
   */
  drops?: LiftDrop[]
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
  /**
   * Kế hoạch buổi tập: bài và set mục tiêu lấy từ lần trước hoặc buổi mẫu. Nằm
   * riêng khỏi `lifts` — set chỉ vào log khi được tick, nên bỏ bài giữa chừng
   * không làm sai volume hay PR.
   */
  plan?: PlanItem[]
  /**
   * Chế độ đã bấm "Hoàn thành buổi tập" trong ngày — buổi đó khoá, bấm vào chỉ
   * xem tổng kết. Ngày đã qua thì tự coi là chốt, không cần cờ này.
   */
  liftDone?: LiftMode[]
  /** nhãn split của bản cũ (pull/push/…) — không dùng nữa, nhãn buổi suy từ bài đã tập */
  liftGroup?: string
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

export interface PlanItem {
  exerciseId: string
  /** set mục tiêu, chép lúc lập kế hoạch */
  sets: LiftSet[]
}

/**
 * Buổi tập mẫu có tên. Chỉ giữ bài và số set — kg/rep lấy lại từ lần tập gần
 * nhất mỗi khi dùng, nên mẫu không bao giờ cũ đi khi đã lên tạ.
 */
export interface WorkoutTemplate {
  id: string
  name: string
  mode: LiftMode
  /** nhãn split của bản cũ — không dùng nữa */
  group?: string
  items: { exerciseId: string; sets: number }[]
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
  workoutTemplates: WorkoutTemplate[]
  /** foodId -> last amount used, powers one-tap defaults */
  lastAmounts: Record<string, number>
  /** foodId -> giá mỗi 1 đơn vị amount (VND), để lần sau điền sẵn tiền */
  lastCosts: Record<string, number>
  /** foodId -> last time logged, powers the "Gần đây" list */
  recent: Record<string, number>
}
