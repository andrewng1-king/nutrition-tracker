import { SEED_EXERCISES } from '../data/exercises'
import { lastNDays } from './format'
import { runBurnKcal } from './run'
import { blankData, replaceAll } from './storage'
import type {
  AppData,
  DayLog,
  DayType,
  Entry,
  LiftEntry,
  LiftGroup,
  LiftSet,
  MealSlot,
} from './types'

/**
 * Dữ liệu mẫu cho nút tua vít: dựng lại 7 ngày như thể app đã dùng cả tuần.
 * Mục đích duy nhất là bấm thử các màn hình (tuần, chi tiêu, tiến bộ sức nâng,
 * lịch sử) mà không phải ngồi log tay. Mỗi ngày một kiểu — cùng một con số lặp
 * lại bảy lần thì biểu đồ nào cũng phẳng và chẳng test được gì.
 */

const rnd = () => Math.random()
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)]
const int = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1))
const around = (base: number, spread: number, digits = 0) =>
  Number((base + (rnd() * 2 - 1) * spread).toFixed(digits))
/** làm tròn tiền về bội 500đ cho giống số người dùng thật gõ vào */
const money = (base: number, spread: number) =>
  Math.max(500, Math.round(around(base, spread) / 500) * 500)

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

/** Lấy `count` phần tử khác nhau, thứ tự ngẫu nhiên. */
function sample<T>(xs: readonly T[], count: number): T[] {
  const pool = [...xs]
  const out: T[] = []
  while (out.length < count && pool.length > 0) {
    out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0])
  }
  return out
}

interface FoodPick {
  foodId: string
  /** khoảng khẩu phần, theo servingUnit của món */
  amount: [number, number]
  /** giá trung bình cho khẩu phần giữa dải, VND */
  cost: number
  oil?: [number, number]
}

const BREAKFAST: FoodPick[] = [
  { foodId: 'banh-mi', amount: [1, 1], cost: 15000 },
  { foodId: 'trung-luoc', amount: [2, 3], cost: 6000 },
  { foodId: 'trung-op-la', amount: [2, 2], cost: 7000 },
  { foodId: 'sua-chua-hy-lap', amount: [150, 150], cost: 28000 },
  { foodId: 'khoai-lang', amount: [150, 220], cost: 12000 },
]

/* Khẩu phần cố ý to: target ngày tập là 2.300-2.700 kcal, cơm 150g + ức gà 120g
   chỉ ra ~1.400 kcal/ngày — cả tuần đỏ hết, không thấy được trạng thái "đạt". */
const LUNCH_CARB: FoodPick[] = [
  { foodId: 'com-trang', amount: [220, 340], cost: 8000 },
  { foodId: 'khoai-lang', amount: [250, 380], cost: 12000 },
]

const PROTEIN: FoodPick[] = [
  { foodId: 'uc-ga', amount: [150, 230], cost: 26000, oil: [1, 2] },
  { foodId: 'nac-heo-than', amount: [140, 210], cost: 30000, oil: [1, 2] },
  { foodId: 'ca-basa', amount: [150, 230], cost: 24000, oil: [1, 2] },
  { foodId: 'tom', amount: [130, 200], cost: 45000, oil: [0, 2] },
  { foodId: 'than-bo', amount: [140, 200], cost: 55000, oil: [1, 2] },
  { foodId: 'dau-hu', amount: [150, 250], cost: 12000, oil: [1, 2] },
  { foodId: 'ca-dieu-hong', amount: [160, 240], cost: 35000, oil: [0, 2] },
  { foodId: 'ma-dui-ga', amount: [150, 220], cost: 24000, oil: [1, 2] },
]

const SNACK: FoodPick[] = [
  { foodId: 'whey', amount: [1, 2], cost: 22000 },
  { foodId: 'chuoi', amount: [1, 2], cost: 7000 },
  { foodId: 'hat', amount: [20, 40], cost: 18000 },
  { foodId: 'sua-chua-hy-lap', amount: [150, 150], cost: 28000 },
]

/** Bữa "phá kèo" — một ngày trong tuần, để test cờ cheat meal và cột vượt trần. */
const CHEAT: FoodPick[] = [
  { foodId: 'com-tam-suon-opla', amount: [1, 1], cost: 55000 },
  { foodId: 'jollibee-combo', amount: [1, 1], cost: 135000 },
  { foodId: 'buffet-nuong', amount: [1, 1], cost: 349000 },
]

const DRINK: FoodPick[] = [
  { foodId: 'tra-sua', amount: [1, 1], cost: 45000 },
  { foodId: 'nuoc-ngot', amount: [1, 1], cost: 12000 },
]

function entryFrom(
  p: FoodPick,
  meal: MealSlot,
  ts: number,
  opts: { cheat?: boolean; factor?: number } = {},
): Entry {
  const [lo, hi] = p.amount
  // khẩu phần gam làm tròn về bội 10 — không ai cân ra 173g
  const step = hi - lo >= 20 ? 10 : 1
  const raw = lo === hi ? lo : lo + Math.round(int(0, hi - lo) / step) * step
  // `factor` là "độ đói" của cả ngày: ngày ăn nhiều thì mọi món to lên cùng nhau,
  // nhờ vậy cột trên biểu đồ tuần mới có ngày vượt trần, ngày hụt.
  const amount = Math.max(step, Math.round((raw * (opts.factor ?? 1)) / step) * step)
  const mid = (lo + hi) / 2
  const oil = p.oil ? int(p.oil[0], p.oil[1]) : 0
  return {
    id: uid(),
    ts,
    foodId: p.foodId,
    amount,
    meal,
    oilTsp: oil || undefined,
    cheat: opts.cheat || undefined,
    cost: money((p.cost * amount) / mid, p.cost * 0.12),
  }
}

const GYM_GROUPS: LiftGroup[] = ['pull', 'push', 'legs', 'shoulder']

/** Mức tạ hợp lý theo loại thiết bị — số người dùng đọc trên máy, không quy đổi. */
function kgFor(gear: string): number {
  switch (gear) {
    case 'stack':
      return int(4, 12) * 5
    case 'db':
      return int(3, 11) * 2
    case 'bar':
      return int(4, 14) * 5
    case 'smith':
      return int(2, 10) * 5
    default:
      return rnd() < 0.7 ? 0 : int(1, 4) * 5
  }
}

function setsFor(gear: string): LiftSet[] {
  const count = int(3, 4)
  const base = kgFor(gear)
  const reps = gear === 'body' ? int(8, 16) : int(6, 12)
  return Array.from({ length: count }, (_, i) => ({
    // set sau nặng dần hoặc tụt rep — giống buổi tập thật hơn là 4 set y hệt nhau
    kg: gear === 'body' ? base : Math.max(0, base + i * (rnd() < 0.5 ? 0 : 2.5)),
    reps: Math.max(4, reps - (rnd() < 0.45 ? i : 0)),
  }))
}

function liftsFor(mode: 'gym' | 'calisthenic', group: LiftGroup | undefined, ts: number) {
  const pool = SEED_EXERCISES.filter(
    (e) => e.mode === mode && (mode === 'calisthenic' || !group || e.group === group),
  )
  const chosen = sample(pool, mode === 'gym' ? int(4, 6) : int(3, 5))
  return chosen.map<LiftEntry>((ex, i) => ({
    id: uid(),
    exerciseId: ex.id,
    sets: setsFor(ex.gear),
    ts: ts + i,
  }))
}

/** Kịch bản 7 ngày: xen kẽ chạy / gym / calisthenic / nghỉ, không lặp đều đặn. */
type Plan = 'run' | 'run-turbo' | 'gym' | 'calisthenic' | 'rest'

/** Sáu ngày trước hôm nay. Hôm nay luôn là 'run-turbo', xem `seedDemoWeek`. */
const WEEK_PLANS: Plan[] = ['gym', 'run', 'calisthenic', 'gym', 'rest', 'gym']

function buildDay(date: string, plan: Plan, cheatDay: boolean, weightKg: number): DayLog {
  const ts = new Date(`${date}T07:00:00`).getTime()
  const entries: Entry[] = []
  let clock = ts
  // ±18%: đủ để tuần có ngày chạm trần và ngày hụt, chưa tới mức phi lý
  const appetite = around(1, 0.18, 2)

  const add = (p: FoodPick, meal: MealSlot, cheat?: boolean) => {
    clock += int(20, 90) * 60_000
    entries.push(entryFrom(p, meal, clock, { cheat, factor: appetite }))
  }

  add(pick(BREAKFAST), 'sang')
  if (rnd() < 0.7) add({ foodId: 'chuoi', amount: [1, 2], cost: 7000 }, 'sang')

  add(pick(LUNCH_CARB), 'trua')
  add(pick(PROTEIN), 'trua')

  if (cheatDay) {
    add(pick(CHEAT), 'toi', true)
    if (rnd() < 0.7) add(pick(DRINK), 'toi', true)
  } else {
    add(pick(LUNCH_CARB), 'toi')
    add(pick(PROTEIN), 'toi')
    if (rnd() < 0.6) add({ foodId: 'trung-luoc', amount: [2, 3], cost: 6000 }, 'toi')
  }

  add(pick(SNACK), 'snack')
  if (rnd() < 0.55) add(pick(SNACK), 'snack')

  const day: DayLog = {
    date,
    entries,
    weightKg: Number(weightKg.toFixed(1)),
    waistCm: Number(around(80 - (weightKg < 60 ? 1 : 0), 0.6, 1)),
  }

  const types: DayType[] = []

  if (plan === 'run' || plan === 'run-turbo') {
    types.push('run')
    const distanceKm = Number(around(7, 3, 2))
    const paceSec = int(320, 400)
    day.run = {
      distanceKm,
      durationSec: Math.round(distanceKm * paceSec),
      elevationM: int(5, 90),
      burnKcal: runBurnKcal(distanceKm, weightKg),
      source: 'manual',
    }
  }

  if (plan === 'run-turbo') {
    // Ngày chạy có kèm buổi thể trọng — đúng trường hợp cờ `turbo` sinh ra để
    // đánh dấu. Không gắn thêm nhãn 'lift': ngày Turbo loại trừ buổi tạ.
    day.turbo = true
    day.lifts = liftsFor('calisthenic', undefined, ts + 12 * 3600_000)
  }

  if (plan === 'gym') {
    types.push('lift')
    day.liftGroup = pick(GYM_GROUPS)
    day.lifts = liftsFor('gym', day.liftGroup, ts + 11 * 3600_000)
  }

  if (plan === 'calisthenic') {
    types.push('lift')
    day.lifts = liftsFor('calisthenic', undefined, ts + 11 * 3600_000)
  }

  if (types.length === 0) types.push('rest')

  day.dayTypes = types
  day.isRunDay = types.includes('run')
  day.note = cheatDay ? 'Cheat meal — dữ liệu mẫu' : undefined

  return day
}

/**
 * Nạp 7 ngày gần nhất (tính cả hôm nay) bằng dữ liệu ngẫu nhiên và GHI ĐÈ toàn bộ
 * state cũ. Trả về số ngày đã tạo để màn hình báo lại cho người dùng.
 */
export function seedDemoWeek(): { days: number; from: string; to: string } {
  const dates = lastNDays(7)
  const next: AppData = blankData()

  // cân nặng đi xuống dần từ đầu tuần, có nhiễu ngày-qua-ngày như cân thật
  let weight = 61.5

  // cheat rơi vào một ngày giữa tuần, không phải hôm nay: 4.000 kcal ngay ở màn
  // đầu tiên nhìn như dữ liệu hỏng chứ không như một ngày phá kèo.
  const cheatIndex = int(1, 5)
  // Sáu ngày trước xoay một đoạn ngẫu nhiên (bấm lại nút là ra tuần khác) nhưng
  // vẫn giữ nhịp tập hợp lý. Hôm nay chốt cứng là ngày Turbo để nạp xong nhìn
  // thấy ngay thẻ "Buổi chạy" đã cường hoá, khỏi phải lùi ngày đi tìm.
  const offset = int(0, WEEK_PLANS.length - 1)
  const plans: Plan[] = [
    ...WEEK_PLANS.map((_, i) => WEEK_PLANS[(i + offset) % WEEK_PLANS.length]),
    'run-turbo',
  ]

  dates.forEach((date, i) => {
    weight = weight - 0.12 + (rnd() * 0.5 - 0.25)
    const day = buildDay(date, plans[i], i === cheatIndex, weight)
    next.days[date] = day

    for (const e of day.entries) {
      next.lastAmounts[e.foodId] = e.amount
      next.recent[e.foodId] = e.ts
      if (e.cost && e.amount > 0) next.lastCosts[e.foodId] = e.cost / e.amount
    }
  })

  const lastDay = next.days[dates[dates.length - 1]]
  next.settings = {
    ...next.settings,
    weightKg: lastDay.weightKg ?? next.settings.weightKg,
  }

  // Hai mẫu bữa ăn để tab "Mẫu" trong sheet thêm món không rỗng khi test.
  next.templates = [
    {
      id: uid(),
      name: 'Trưa — cơm + ức gà',
      meal: 'trua',
      items: [
        { foodId: 'com-trang', amount: 200 },
        { foodId: 'uc-ga', amount: 150, oilTsp: 1 },
      ],
    },
    {
      id: uid(),
      name: 'Sáng — trứng + bánh mì',
      meal: 'sang',
      items: [
        { foodId: 'trung-luoc', amount: 2 },
        { foodId: 'banh-mi', amount: 1 },
      ],
    },
  ]

  replaceAll(next)
  return { days: dates.length, from: dates[0], to: dates[dates.length - 1] }
}
