import { shiftDate, weekday } from './format'
import { entryVolume, liftDates } from './lift'
import { dateKey, parseDateKey } from './macros'
import { LIFT_GROUPS, splitBySub, type SubKey } from './muscles'
import type { AppData, Exercise, LiftGroup, LiftMode } from './types'

/** Ba khung nhìn của biểu đồ volume. */
export type VolPeriod = 'week' | 'month' | 'all'

export interface VolumeAcc {
  byGroup: Record<LiftGroup, number>
  /** volume từng nhóm phụ — bài nhiều phần thì chia đều, xem `splitBySub` */
  bySub: Partial<Record<SubKey, number>>
  total: number
  sessions: number
}

/** Một cột / một điểm của biểu đồ. */
export interface VolBucket extends VolumeAcc {
  key: string
  /** nhãn trục ngang: "T4" cho buổi, "8/9" cho tuần, "Th9" cho tháng */
  label: string
  /** thuộc tuần trước — vẽ mờ cạnh tuần này để so buổi với buổi */
  ghost?: boolean
}

interface Opts {
  mode: LiftMode
  bodyKg: number
  today?: string
}

function emptyAcc(): VolumeAcc {
  const byGroup = Object.fromEntries(LIFT_GROUPS.map((g) => [g, 0])) as Record<LiftGroup, number>
  return { byGroup, bySub: {}, total: 0, sessions: 0 }
}

/** Cộng một ngày vào `acc`, chỉ các bài thuộc `mode`. */
function addDay(
  acc: VolumeAcc,
  data: AppData,
  date: string,
  exById: Map<string, Exercise>,
  opts: Opts,
) {
  let counted = false
  for (const e of data.days[date]?.lifts ?? []) {
    const ex = exById.get(e.exerciseId)
    if (!ex || ex.mode !== opts.mode) continue
    const v = entryVolume(ex, e, opts.bodyKg)
    acc.byGroup[ex.group] += v
    acc.total += v
    for (const [key, part] of splitBySub(ex, v)) acc.bySub[key] = (acc.bySub[key] ?? 0) + part
    counted = true
  }
  if (counted) acc.sessions += 1
}

function sumRange(
  data: AppData,
  dates: string[],
  from: string,
  to: string,
  exById: Map<string, Exercise>,
  opts: Opts,
): VolumeAcc {
  const acc = emptyAcc()
  for (const d of dates) if (d >= from && d <= to) addDay(acc, data, d, exById, opts)
  return acc
}

export function mondayOf(key: string): string {
  return shiftDate(key, -((parseDateKey(key).getDay() + 6) % 7))
}

const monthStart = (key: string) => `${key.slice(0, 7)}-01`

function lastDayOfMonth(key: string): string {
  const d = parseDateKey(monthStart(key))
  return dateKey(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

/**
 * Khoảng của kỳ hiện tại tính tới hôm nay, và khoảng tương ứng của kỳ trước —
 * cũng chỉ tới cùng thời điểm. So cả tuần trước với tuần này mới tới thứ Tư thì
 * đầu tuần nào cũng báo "tụt".
 */
export function periodRange(
  period: VolPeriod,
  today: string,
): { from: string; to: string; prev?: { from: string; to: string } } {
  if (period === 'week') {
    const from = mondayOf(today)
    return { from, to: today, prev: { from: shiftDate(from, -7), to: shiftDate(today, -7) } }
  }
  if (period === 'month') {
    const from = monthStart(today)
    const prevFrom = monthStart(shiftDate(from, -1))
    const prevLast = lastDayOfMonth(prevFrom)
    const sameDay = `${prevFrom.slice(0, 8)}${today.slice(8)}`
    return { from, to: today, prev: { from: prevFrom, to: sameDay < prevLast ? sameDay : prevLast } }
  }
  return { from: '0000-01-01', to: today }
}

/** Tổng của kỳ hiện tại và của kỳ trước tới cùng thời điểm (all time thì không có kỳ trước). */
export function periodTotals(
  data: AppData,
  period: VolPeriod,
  exById: Map<string, Exercise>,
  opts: Opts,
): { current: VolumeAcc; previous: VolumeAcc | null } {
  const today = opts.today ?? dateKey()
  const dates = liftDates(data, opts.mode, exById)
  const r = periodRange(period, today)
  return {
    current: sumRange(data, dates, r.from, r.to, exById, opts),
    previous: r.prev ? sumRange(data, dates, r.prev.from, r.prev.to, exById, opts) : null,
  }
}

/**
 * Các cột của biểu đồ, cũ -> mới:
 * - tuần: mỗi buổi một cột; các buổi của cả tuần trước đứng trước, đánh dấu `ghost`
 * - tháng: mỗi tuần lịch (thứ 2) một cột, chỉ tính các ngày thuộc tháng này
 * - all time: mỗi tháng một cột, từ tháng có buổi đầu tiên tới tháng này
 */
export function volumeBuckets(
  data: AppData,
  period: VolPeriod,
  exById: Map<string, Exercise>,
  opts: Opts,
): VolBucket[] {
  const today = opts.today ?? dateKey()
  const dates = liftDates(data, opts.mode, exById).filter((d) => d <= today)

  if (period === 'week') {
    const monday = mondayOf(today)
    const prevMonday = shiftDate(monday, -7)
    return dates
      .filter((d) => d >= prevMonday)
      .map((d) => {
        const acc = emptyAcc()
        addDay(acc, data, d, exById, opts)
        return { ...acc, key: d, label: weekday(d), ghost: d < monday || undefined }
      })
      .filter((b) => b.sessions > 0)
  }

  if (period === 'month') {
    const first = monthStart(today)
    const out: VolBucket[] = []
    for (let start = mondayOf(first); start <= today; start = shiftDate(start, 7)) {
      const from = start < first ? first : start
      const end = shiftDate(start, 6)
      const acc = sumRange(data, dates, from, end < today ? end : today, exById, opts)
      const d = parseDateKey(from)
      out.push({ ...acc, key: start, label: `${d.getDate()}/${d.getMonth() + 1}` })
    }
    return out
  }

  const out: VolBucket[] = []
  const firstMonth = monthStart(dates[0] ?? today)
  for (let m = firstMonth; m <= today; m = shiftDate(lastDayOfMonth(m), 1)) {
    const acc = sumRange(data, dates, m, lastDayOfMonth(m), exById, opts)
    const d = parseDateKey(m)
    // năm chỉ ghi ở cột đầu và tháng 1 — đủ biết cột nào sang năm mới
    const year = m === firstMonth || d.getMonth() === 0 ? `/${String(d.getFullYear()).slice(2)}` : ''
    out.push({ ...acc, key: m.slice(0, 7), label: `Th${d.getMonth() + 1}${year}` })
  }
  return out
}

/** % thay đổi, `null` khi kỳ trước bằng 0 — không có gì để so. */
export function pctChange(current: number, previous: number): number | null {
  return previous > 0 ? ((current - previous) / previous) * 100 : null
}
