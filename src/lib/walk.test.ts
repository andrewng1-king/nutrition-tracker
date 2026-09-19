import { describe, expect, it } from 'vitest'
import { computeAdjust, DEFAULT_SETTINGS, WALK_KCAL_CAP } from './macros'
import type { AppData, DayLog } from './types'
import { lastWalk, walkBurnKcal, walkLabel } from './walk'

describe('walkBurnKcal', () => {
  it('uses the ACSM walking equation, net of resting', () => {
    // 5 km/h = 83,3 m/phút: 8,33 + 1,8·83,3·0,12 = 26,33 ml/kg/phút
    expect(walkBurnKcal(30, 5, 12, 60)).toBe(237)
  })

  it('burns more on a steeper incline', () => {
    expect(walkBurnKcal(30, 5, 15, 60)).toBeGreaterThan(walkBurnKcal(30, 5, 10, 60))
  })

  it('flat walking still counts', () => {
    expect(walkBurnKcal(30, 5, 0, 60)).toBe(75)
  })

  it('switches to the running equation from 8 km/h', () => {
    // 8 km/h = 133,3 m/phút: 26,67 + 0,9·133,3·0,05 = 32,67
    expect(walkBurnKcal(20, 8, 5, 60)).toBe(196)
  })

  it('returns 0 for empty input', () => {
    expect(walkBurnKcal(0, 5, 12, 60)).toBe(0)
    expect(walkBurnKcal(30, 0, 12, 60)).toBe(0)
  })
})

describe('computeAdjust with a walk', () => {
  const base = { runDay: false, liftDay: true }

  it('adds the walk on top of the gym share', () => {
    const without = computeAdjust(DEFAULT_SETTINGS, base)
    const withWalk = computeAdjust(DEFAULT_SETTINGS, { ...base, walkBurnKcal: 237 })
    expect(withWalk.walk).toBe(237)
    expect(withWalk.total).toBe(without.total + 237)
  })

  it('caps a typo', () => {
    expect(computeAdjust(DEFAULT_SETTINGS, { ...base, walkBurnKcal: 5000 }).walk).toBe(
      WALK_KCAL_CAP,
    )
  })
})

describe('lastWalk', () => {
  const day = (date: string, minutes?: number): DayLog => ({
    date,
    entries: [],
    ...(minutes ? { walk: { minutes, speedKmh: 5, inclinePct: 12, burnKcal: 0 } } : {}),
  })
  const data = {
    days: {
      '2026-09-01': day('2026-09-01', 20),
      '2026-09-03': day('2026-09-03', 35),
      '2026-09-04': day('2026-09-04'),
      '2026-09-06': day('2026-09-06', 40),
    },
  } as unknown as AppData

  it('picks the latest walk before the date', () => {
    expect(lastWalk(data, '2026-09-05')?.minutes).toBe(35)
  })

  it('ignores the same day', () => {
    expect(lastWalk(data, '2026-09-06')?.minutes).toBe(35)
  })

  it('returns undefined with no history', () => {
    expect(lastWalk(data, '2026-09-01')).toBeUndefined()
  })
})

describe('walkLabel', () => {
  it('formats with Vietnamese decimals', () => {
    expect(walkLabel({ minutes: 30, inclinePct: 12.5, speedKmh: 5.2 })).toBe(
      '30 phút · 12,5% · 5,2 km/h',
    )
  })
})
