import type { AppData } from './types'
export function historicalWeight(data: AppData, date: string, fallback: number): number {
  const measured = Object.keys(data.days).filter((key) => key <= date && (data.days[key].weightKg ?? 0) > 0).sort().at(-1)
  return measured ? data.days[measured].weightKg! : fallback
}
