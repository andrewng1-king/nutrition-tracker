import type { AppData, WalkLog } from './types'

/** Lần đầu log đi bộ dốc — mức hay gặp trên máy chạy phòng gym. */
export const DEFAULT_WALK = { minutes: 30, speedKmh: 5, inclinePct: 12 }

/**
 * kcal NET của đi bộ dốc theo phương trình ACSM, bỏ phần 3,5 ml/kg/phút chuyển
 * hoá nghỉ — cơ thể đứng yên cũng đốt phần đó, và TDEE đã tính rồi.
 * - đi bộ: VO2 = 0,1·v + 1,8·v·dốc
 * - chạy (từ 8 km/h): VO2 = 0,2·v + 0,9·v·dốc
 * với v tính bằng m/phút, dốc là phân số. 1 lít O2 ≈ 5 kcal.
 */
export function walkBurnKcal(
  minutes: number,
  speedKmh: number,
  inclinePct: number,
  weightKg: number,
): number {
  if (minutes <= 0 || speedKmh <= 0 || weightKg <= 0) return 0
  const v = (speedKmh * 1000) / 60
  const grade = Math.max(0, inclinePct) / 100
  const vo2 = speedKmh >= 8 ? 0.2 * v + 0.9 * v * grade : 0.1 * v + 1.8 * v * grade
  return Math.round((vo2 * weightKg * minutes * 5) / 1000)
}

/** Buổi đi bộ dốc gần nhất trước `date` — điền sẵn cho lần sau. */
export function lastWalk(data: AppData, date: string): WalkLog | undefined {
  const dates = Object.keys(data.days)
    .filter((d) => d < date && data.days[d].walk)
    .sort()
  const last = dates[dates.length - 1]
  return last ? data.days[last].walk : undefined
}

/** "30 phút · 12% · 5 km/h" */
export function walkLabel(w: Pick<WalkLog, 'minutes' | 'speedKmh' | 'inclinePct'>): string {
  const num = (x: number) => Number(x.toFixed(1)).toLocaleString('vi-VN')
  return `${num(w.minutes)} phút · ${num(w.inclinePct)}% · ${num(w.speedKmh)} km/h`
}
