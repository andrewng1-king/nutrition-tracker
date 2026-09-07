import { dateKey, parseDateKey } from './macros'
import type { MealSlot } from './types'

export const MEAL_LABELS: Record<MealSlot, string> = {
  sang: 'Sáng',
  trua: 'Trưa',
  toi: 'Tối',
  snack: 'Snack',
}

export const MEAL_ORDER: MealSlot[] = ['sang', 'trua', 'toi', 'snack']

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

/** Bữa mặc định theo giờ — bớt 1 tap khi log lúc đang ăn. */
export function guessMeal(d: Date = new Date()): MealSlot {
  const h = d.getHours()
  if (h < 10) return 'sang'
  if (h < 15) return 'trua'
  if (h < 21) return 'toi'
  return 'snack'
}

/** Bỏ số 0 thừa: 46.5 -> "46,5", 46.0 -> "46" */
export function n(value: number, digits = 0): string {
  const r = Number(value.toFixed(digits))
  return r.toLocaleString('vi-VN', { maximumFractionDigits: digits })
}

/** 45000 -> "45.000 ₫". Tiền ăn hàng ngày nên không hiện số lẻ. */
export function vnd(value: number): string {
  return `${Math.round(value).toLocaleString('vi-VN')} ₫`
}

/** 45000 -> "45k", 1250000 -> "1,25tr" — cho chỗ chật như nhãn biểu đồ. */
export function vndShort(value: number): string {
  const v = Math.round(value)
  if (v >= 1_000_000) return `${n(v / 1_000_000, 2)}tr`
  if (v >= 1000) return `${n(v / 1000)}k`
  return String(v)
}

export function amountLabel(amount: number, unit: string): string {
  return unit === 'g' ? `${n(amount)}g` : `${n(amount, 2)} ${unit}`
}

/** Bỏ dấu để gõ "uc ga" vẫn ra "Ức gà" — không ai bật bộ gõ khi đang ăn. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd') // đ không tách dấu khi NFD
}

/**
 * Khớp theo từng từ, không cần liền nhau: "trung luoc" vẫn ra "Trứng gà luộc".
 * Query rỗng -> khớp tất cả.
 */
export function matchName(name: string, query: string): boolean {
  const tokens = norm(query).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return true
  const hay = norm(name)
  return tokens.every((t) => hay.includes(t))
}

export function weekday(key: string): string {
  return WEEKDAYS[parseDateKey(key).getDay()]
}

export function shortDate(key: string): string {
  const d = parseDateKey(key)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}`
}

export function dayLabel(key: string): string {
  const today = dateKey()
  if (key === today) return 'Hôm nay'
  const y = new Date()
  y.setDate(y.getDate() - 1)
  if (key === dateKey(y)) return 'Hôm qua'
  return `${weekday(key)} ${shortDate(key)}`
}

/** N ngày gần nhất, cũ -> mới, kết thúc ở `end`. */
export function lastNDays(count: number, end: string = dateKey()): string[] {
  const base = parseDateKey(end)
  const out: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(base.getDate() - i)
    out.push(dateKey(d))
  }
  return out
}

export function shiftDate(key: string, days: number): string {
  const d = parseDateKey(key)
  d.setDate(d.getDate() + days)
  return dateKey(d)
}
