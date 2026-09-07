import { dayView } from './day'
import { dateKey, parseDateKey } from './macros'
import type { AppData } from './types'

/** Tuần bắt đầu từ Thứ 2 (getDay()===1). */
export function weekStart(key: string = dateKey()): string {
  const d = parseDateKey(key)
  const offset = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - offset)
  return dateKey(d)
}

export function weekDays(key: string = dateKey()): string[] {
  const start = parseDateKey(weekStart(key))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return dateKey(d)
  })
}

/**
 * Ngày ăn hụt được "để dành" tối đa bằng đây. Không cho phép một ngày nhịn
 * đói biến thành ngân sách khổng lồ cho hôm sau — spec mục 8 nói rõ không
 * khuyến khích cắt calo sâu.
 */
export const MAX_BANK_PER_DAY = 350

export interface WeekDayStat {
  date: string
  kcal: number
  target: number
  cost: number
  logged: boolean
  runDay: boolean
  cheat: boolean
}

export interface WeekSummary {
  days: string[]
  stats: WeekDayStat[]
  /** tổng trần calo của cả 7 ngày, đã tính ngày chạy bộ */
  budget: number
  /** đã ăn tính tới hiện tại */
  consumed: number
  /** calo để dành được từ những ngày đã log xong (không tính hôm nay) */
  banked: number
  /** tổng tiền ăn trong tuần, VND */
  cost: number
  daysLogged: number
  cheatUsedOn?: string
  cheatAvailable: boolean
}

export function weekSummary(data: AppData, today: string = dateKey()): WeekSummary {
  const days = weekDays(today)
  let budget = 0
  let consumed = 0
  let banked = 0
  let cost = 0
  let daysLogged = 0
  let cheatUsedOn: string | undefined

  const stats: WeekDayStat[] = days.map((date) => {
    const view = dayView(data, date)
    const logged = view.day.entries.length > 0
    const cheat = view.day.entries.some((e) => e.cheat)
    budget += view.targets.kcalMax

    if (logged) {
      consumed += view.totals.kcal
      cost += view.cost
      daysLogged++
      if (cheat) cheatUsedOn = date

      // Chỉ ngày đã khép lại mới tính vào phần để dành — hôm nay còn đang ăn dở.
      if (date < today) {
        banked += Math.min(view.targets.kcalMax - view.totals.kcal, MAX_BANK_PER_DAY)
      }
    }

    return {
      date,
      kcal: view.totals.kcal,
      target: view.targets.kcalMax,
      cost: view.cost,
      logged,
      runDay: view.runDay,
      cheat,
    }
  })

  return {
    days,
    stats,
    budget,
    consumed,
    banked,
    cost,
    daysLogged,
    cheatUsedOn,
    cheatAvailable: !cheatUsedOn,
  }
}
