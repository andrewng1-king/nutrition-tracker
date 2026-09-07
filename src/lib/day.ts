import { computeTargets, dayTypesFor, sumEntries } from './macros'
import { foodMap, getDay } from './storage'
import type { AppData, DayLog, Macros, Targets } from './types'

export interface DayView {
  date: string
  day: DayLog
  runDay: boolean
  liftDay: boolean
  restDay: boolean
  targets: Targets
  totals: Macros
  /** tổng tiền đã chi cho ngày đó, VND */
  cost: number
}

/**
 * Một chỗ duy nhất ghép ngày + target + tổng macro. Target ngày chạy bộ ưu tiên
 * lượng kcal đốt thật từ buổi chạy đã log, không có thì dùng số mặc định.
 */
export function dayView(data: AppData, date: string): DayView {
  const day = getDay(date, data)
  const types = dayTypesFor(date, data.settings, day)
  const runDay = types.includes('run')
  const liftDay = types.includes('lift')
  const map = foodMap(data)
  return {
    date,
    day,
    runDay,
    liftDay,
    restDay: types.includes('rest'),
    targets: computeTargets(data.settings, {
      runDay,
      liftDay,
      runBurnKcal: day.run?.burnKcal,
    }),
    totals: sumEntries(day.entries, (id) => map.get(id)),
    cost: day.entries.reduce((sum, e) => sum + (e.cost ?? 0), 0),
  }
}
