import { MEAL_ORDER } from './format'
import { dateKey, macrosFor, parseDateKey } from './macros'
import { foodMap } from './storage'
import type { AppData, MealSlot } from './types'
import { weekDays } from './week'

/** Số ngày trung bình mỗi tháng — dùng để quy đổi trung bình ngày ra tháng. */
export const DAYS_PER_MONTH = 30.44

export interface DaySpend {
  date: string
  total: number
}

/**
 * Tháng phải được theo dõi ít nhất chừng này mới đại diện cho một tháng đầy đủ.
 * Tháng đầu tiên thường bắt đầu giữa chừng (VD từ 27/07) — gộp nó vào trung bình
 * tháng sẽ kéo con số xuống rất sai.
 */
export const MONTH_COVERAGE = 0.6

export interface MonthSpend {
  /** YYYY-MM */
  month: string
  total: number
  /** số ngày có chi trong tháng đó */
  days: number
  /** tháng đang chạy, chưa hết */
  partial: boolean
  /** đủ ngày để đại diện cho một tháng đầy đủ hay không */
  representative: boolean
}

function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export interface TopFood {
  foodId: string
  name: string
  total: number
  times: number
}

export interface WalletSummary {
  total: number
  today: number
  week: number
  month: number
  /** số ngày CÓ chi tiền, không phải số ngày có log */
  daysWithSpend: number
  firstDate?: string
  lastDate?: string
  avgPerDay: number
  /** ước tính từ trung bình ngày, dùng khi chưa đủ một tháng dữ liệu */
  avgPerMonthEstimate: number
  /** trung bình các tháng đã trọn vẹn; undefined khi chưa có tháng nào đủ */
  avgPerMonthActual?: number
  byMeal: Record<MealSlot, number>
  months: MonthSpend[]
  daily: DaySpend[]
  topFoods: TopFood[]
  /** đồng cho mỗi gram protein — chỉ số đáng theo dõi nhất với mục tiêu recomp */
  costPerProteinG: number
  costPer1000Kcal: number
}

const emptyByMeal = (): Record<MealSlot, number> =>
  MEAL_ORDER.reduce((acc, m) => ({ ...acc, [m]: 0 }), {} as Record<MealSlot, number>)

/**
 * Tổng hợp chi tiêu ăn uống từ toàn bộ lịch sử.
 * Trung bình chỉ chia cho những ngày THỰC SỰ có chi tiền — ngày quên nhập tiền
 * mà vẫn chia vào sẽ kéo trung bình xuống thành con số vô nghĩa.
 */
export function walletSummary(data: AppData, today: string = dateKey()): WalletSummary {
  const map = foodMap(data)
  const byMeal = emptyByMeal()
  const monthTotals = new Map<string, { total: number; days: number }>()
  const perFood = new Map<string, { total: number; times: number }>()
  const daily: DaySpend[] = []

  let total = 0
  let proteinG = 0
  let kcal = 0
  let daysWithSpend = 0

  const dates = Object.keys(data.days).sort()

  for (const date of dates) {
    const day = data.days[date]
    let dayTotal = 0

    for (const entry of day.entries) {
      const cost = entry.cost ?? 0
      if (cost <= 0) continue
      dayTotal += cost
      byMeal[entry.meal] += cost

      const food = map.get(entry.foodId)
      if (food) {
        const m = macrosFor(food, entry.amount, entry.oilTsp ?? 0)
        proteinG += m.protein
        kcal += m.kcal
        const prev = perFood.get(entry.foodId) ?? { total: 0, times: 0 }
        perFood.set(entry.foodId, { total: prev.total + cost, times: prev.times + 1 })
      }
    }

    if (dayTotal <= 0) continue
    daysWithSpend++
    total += dayTotal
    daily.push({ date, total: dayTotal })

    const month = date.slice(0, 7)
    const prev = monthTotals.get(month) ?? { total: 0, days: 0 }
    monthTotals.set(month, { total: prev.total + dayTotal, days: prev.days + 1 })
  }

  const currentMonth = today.slice(0, 7)
  const months: MonthSpend[] = [...monthTotals.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({
      ...v,
      month,
      partial: month === currentMonth,
      representative:
        month !== currentMonth && v.days >= daysInMonth(month) * MONTH_COVERAGE,
    }))

  const complete = months.filter((m) => m.representative)
  const avgPerDay = daysWithSpend > 0 ? total / daysWithSpend : 0

  const weekSet = new Set(weekDays(today))
  const week = daily.filter((d) => weekSet.has(d.date)).reduce((s, d) => s + d.total, 0)

  const topFoods: TopFood[] = [...perFood.entries()]
    .map(([foodId, v]) => ({
      foodId,
      name: map.get(foodId)?.name ?? '—',
      total: v.total,
      times: v.times,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)

  return {
    total,
    today: daily.find((d) => d.date === today)?.total ?? 0,
    week,
    month: monthTotals.get(currentMonth)?.total ?? 0,
    daysWithSpend,
    firstDate: daily[0]?.date,
    lastDate: daily[daily.length - 1]?.date,
    avgPerDay,
    avgPerMonthEstimate: avgPerDay * DAYS_PER_MONTH,
    avgPerMonthActual:
      complete.length > 0
        ? complete.reduce((s, m) => s + m.total, 0) / complete.length
        : undefined,
    byMeal,
    months,
    daily,
    topFoods,
    costPerProteinG: proteinG > 0 ? total / proteinG : 0,
    costPer1000Kcal: kcal > 0 ? (total / kcal) * 1000 : 0,
  }
}

/** N ngày gần nhất kèm số tiền, kể cả ngày không chi (để vẽ biểu đồ liên tục). */
export function dailySeries(
  summary: WalletSummary,
  count: number,
  end: string = dateKey(),
): DaySpend[] {
  const byDate = new Map(summary.daily.map((d) => [d.date, d.total]))
  const base = parseDateKey(end)
  const out: DaySpend[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(base.getDate() - i)
    const key = dateKey(d)
    out.push({ date: key, total: byDate.get(key) ?? 0 })
  }
  return out
}
