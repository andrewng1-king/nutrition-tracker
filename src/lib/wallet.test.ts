import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './macros'
import type { AppData, DayLog, Entry } from './types'
import { DAYS_PER_MONTH, dailySeries, walletSummary } from './wallet'

let seq = 0
const pad = (x: number) => String(x).padStart(2, '0')
const entry = (
  foodId: string,
  amount: number,
  meal: Entry['meal'],
  cost?: number,
): Entry => ({ id: `e${seq++}`, foodId, amount, meal, ts: 0, cost })

function makeData(days: DayLog[]): AppData {
  return {
    version: 2,
    settings: { ...DEFAULT_SETTINGS },
    customFoods: [],
    customExercises: [],
    days: Object.fromEntries(days.map((d) => [d.date, d])),
    templates: [],
    lastAmounts: {},
    lastCosts: {},
    recent: {},
  }
}

// 2026-09-05 là Thứ 7; tuần bắt đầu 2026-08-31
const DATA = makeData([
  {
    date: '2026-08-30',
    entries: [entry('uc-ga', 100, 'trua', 20000), entry('com-trang', 100, 'trua', 10000)],
  },
  { date: '2026-09-01', entries: [entry('uc-ga', 200, 'trua', 40000)] },
  { date: '2026-09-03', entries: [entry('tom', 100, 'toi', 50000)] },
  // ngày có ăn nhưng quên nhập tiền — không được tính vào trung bình
  { date: '2026-09-04', entries: [entry('chuoi', 2, 'snack')] },
  { date: '2026-09-05', entries: [entry('whey', 1, 'sang', 25000)] },
])

describe('walletSummary', () => {
  const w = walletSummary(DATA, '2026-09-05')

  it('tổng đúng toàn bộ khoản chi', () => {
    expect(w.total).toBe(145000)
  })

  it('chỉ đếm ngày thực sự có chi tiền', () => {
    expect(w.daysWithSpend).toBe(4)
    expect(w.avgPerDay).toBe(145000 / 4)
  })

  it('bỏ qua ngày có ăn nhưng chưa nhập tiền', () => {
    expect(w.daily.some((d) => d.date === '2026-09-04')).toBe(false)
  })

  it('tách được hôm nay, tuần này, tháng này', () => {
    expect(w.today).toBe(25000)
    expect(w.week).toBe(115000) // 01, 03, 05 — không tính 30/08 tuần trước
    expect(w.month).toBe(115000) // tháng 9
  })

  it('quy đổi trung bình tháng từ trung bình ngày khi chưa đủ tháng trọn', () => {
    expect(w.avgPerMonthEstimate).toBeCloseTo((145000 / 4) * DAYS_PER_MONTH, 0)
  })

  it('đánh dấu tháng đang chạy là partial', () => {
    const sep = w.months.find((m) => m.month === '2026-09')
    expect(sep?.partial).toBe(true)
    expect(w.months.find((m) => m.month === '2026-08')?.partial).toBe(false)
  })

  it('không coi tháng chỉ có vài ngày dữ liệu là tháng đại diện', () => {
    // tháng 8 chỉ có 1 ngày có chi -> không đủ để tính trung bình tháng
    expect(w.months.find((m) => m.month === '2026-08')?.representative).toBe(false)
    expect(w.avgPerMonthActual).toBeUndefined()
  })

  it('chia tiền theo bữa', () => {
    expect(w.byMeal.trua).toBe(70000)
    expect(w.byMeal.toi).toBe(50000)
    expect(w.byMeal.sang).toBe(25000)
    expect(w.byMeal.snack).toBe(0)
  })

  it('xếp hạng món tốn tiền nhất', () => {
    expect(w.topFoods[0].foodId).toBe('uc-ga')
    expect(w.topFoods[0].total).toBe(60000)
    expect(w.topFoods[0].times).toBe(2)
  })

  it('tính được đồng trên mỗi gram protein', () => {
    // 100g + 200g ức gà = 93g P, 100g tôm = 24g P, 1 muỗng whey = 24g P,
    // 100g cơm = 2.7g P  ->  143.7g
    expect(w.costPerProteinG).toBeCloseTo(145000 / 143.7, 0)
  })

  it('tính trung bình tháng thực khi có tháng đủ ngày', () => {
    // tháng 8 đủ 20/31 ngày có chi -> vượt ngưỡng 60%? không; 20/31 = 64.5% -> có
    const days: DayLog[] = []
    for (let d = 1; d <= 20; d++) {
      days.push({
        date: `2026-08-${pad(d)}`,
        entries: [entry('uc-ga', 100, 'trua', 50000)],
      })
    }
    days.push({ date: '2026-09-02', entries: [entry('uc-ga', 100, 'trua', 10000)] })
    const full = walletSummary(makeData(days), '2026-09-05')
    expect(full.months.find((m) => m.month === '2026-08')?.representative).toBe(true)
    expect(full.avgPerMonthActual).toBe(1000000)
  })

  it('trả về rỗng an toàn khi chưa có khoản chi nào', () => {
    const empty = walletSummary(makeData([]), '2026-09-05')
    expect(empty.total).toBe(0)
    expect(empty.avgPerDay).toBe(0)
    expect(empty.costPerProteinG).toBe(0)
    expect(empty.avgPerMonthActual).toBeUndefined()
  })
})

describe('dailySeries', () => {
  const w = walletSummary(DATA, '2026-09-05')

  it('lấp ngày không chi bằng 0 để biểu đồ liền mạch', () => {
    const s = dailySeries(w, 7, '2026-09-05')
    expect(s).toHaveLength(7)
    expect(s[0].date).toBe('2026-08-30')
    expect(s.find((d) => d.date === '2026-09-04')?.total).toBe(0)
    expect(s.find((d) => d.date === '2026-09-05')?.total).toBe(25000)
  })
})
