import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './macros'
import type { AppData, Exercise, LiftEntry } from './types'
import { mondayOf, pctChange, periodRange, periodTotals, volumeBuckets } from './volume'

const dbRow: Exercise = {
  id: 'db-row',
  name: 'Dumbbell row',
  group: 'back',
  subs: ['back-lat-low', 'back-mid'],
  mode: 'gym',
  gear: 'db',
  perSide: true,
}

const squat: Exercise = {
  id: 'smith-squat',
  name: 'Squat thanh Smith',
  group: 'legs',
  mode: 'gym',
  gear: 'smith',
  perSide: true,
}

const pullUp: Exercise = {
  id: 'pull-up',
  name: 'Pull-Up',
  group: 'back',
  mode: 'calisthenic',
  gear: 'body',
}

const exById = new Map([dbRow, squat, pullUp].map((e) => [e.id, e]))

const entry = (exerciseId: string, kg: number, reps: number): LiftEntry => ({
  id: `e-${exerciseId}`,
  exerciseId,
  ts: 0,
  sets: [{ kg, reps }],
})

function appData(days: Record<string, LiftEntry[]>): AppData {
  return {
    version: 4,
    settings: { ...DEFAULT_SETTINGS },
    customFoods: [],
    customExercises: [],
    days: Object.fromEntries(
      Object.entries(days).map(([date, lifts]) => [date, { date, entries: [], lifts }]),
    ),
    templates: [],
    workoutTemplates: [],
    lastAmounts: {},
    lastCosts: {},
    recent: {},
    restSec: {},
  }
}

// db-row 22×10 mỗi tay = 440, squat 22,5×8 mỗi bên = 360
const data = appData({
  '2026-08-10': [entry('smith-squat', 22.5, 8)],
  '2026-09-03': [entry('db-row', 22, 10)],
  '2026-09-07': [entry('db-row', 22, 10)], // thứ 2 tuần trước
  '2026-09-11': [entry('smith-squat', 22.5, 8)], // thứ 6 tuần trước
  '2026-09-14': [entry('db-row', 22, 10)], // thứ 2 tuần này
  '2026-09-16': [entry('pull-up', 0, 8)], // chỉ có bài calisthenic
})
const gym = { mode: 'gym' as const, bodyKg: 60, today: '2026-09-16' }

describe('mondayOf', () => {
  it('walks back to Monday, Sunday included', () => {
    expect(mondayOf('2026-09-16')).toBe('2026-09-14')
    expect(mondayOf('2026-09-20')).toBe('2026-09-14')
    expect(mondayOf('2026-09-14')).toBe('2026-09-14')
  })
})

describe('periodRange', () => {
  it('compares this week to date with last week to the same weekday', () => {
    expect(periodRange('week', '2026-09-16')).toEqual({
      from: '2026-09-14',
      to: '2026-09-16',
      prev: { from: '2026-09-07', to: '2026-09-09' },
    })
  })

  it('clamps the previous month to its last day', () => {
    expect(periodRange('month', '2026-03-31').prev).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    })
  })

  it('has nothing to compare for all time', () => {
    expect(periodRange('all', '2026-09-16').prev).toBeUndefined()
  })
})

describe('volumeBuckets — tuần này', () => {
  const b = volumeBuckets(data, 'week', exById, gym)

  it('lists every session of last week as ghost, then this week', () => {
    expect(b.map((x) => [x.key, x.label, Boolean(x.ghost)])).toEqual([
      ['2026-09-07', 'T2', true],
      ['2026-09-11', 'T6', true],
      ['2026-09-14', 'T2', false],
    ])
  })

  it('skips a day that only has the other mode', () => {
    expect(b.some((x) => x.key === '2026-09-16')).toBe(false)
  })

  it('splits a two-part exercise evenly between its parts', () => {
    expect(b[0].bySub['back-lat-low']).toBe(220)
    expect(b[0].bySub['back-mid']).toBe(220)
    expect(b[1].bySub['legs:all']).toBe(360)
  })
})

describe('volumeBuckets — tháng này', () => {
  const b = volumeBuckets(data, 'month', exById, gym)

  it('makes one bar per calendar week, counting only days of this month', () => {
    expect(b.map((x) => [x.label, x.total])).toEqual([
      ['1/9', 440],
      ['7/9', 800],
      ['14/9', 440],
    ])
  })
})

describe('volumeBuckets — all time', () => {
  it('makes one bar per month from the first session, year on the first bar', () => {
    const b = volumeBuckets(data, 'all', exById, gym)
    expect(b.map((x) => [x.label, x.total])).toEqual([
      ['Th8/26', 360],
      ['Th9', 1680],
    ])
  })

  it('keeps an empty month in between at zero', () => {
    const gap = appData({
      '2026-06-05': [entry('db-row', 22, 10)],
      '2026-08-05': [entry('db-row', 22, 10)],
    })
    const b = volumeBuckets(gap, 'all', exById, { ...gym, today: '2026-08-20' })
    expect(b.map((x) => x.total)).toEqual([440, 0, 440])
  })
})

describe('periodTotals', () => {
  it('sums this week to date against last week to the same day', () => {
    const t = periodTotals(data, 'week', exById, gym)
    expect(t.current.total).toBe(440)
    // 11/09 (thứ 6) nằm sau mốc thứ 4 của tuần trước — không tính
    expect(t.previous?.total).toBe(440)
  })

  it('sums this month against last month to the same day', () => {
    const t = periodTotals(data, 'month', exById, gym)
    expect(t.current.total).toBe(1680)
    expect(t.current.byGroup.back).toBe(1320)
    expect(t.previous?.total).toBe(360)
  })

  it('keeps gym and calisthenic apart', () => {
    const cal = periodTotals(data, 'week', exById, { ...gym, mode: 'calisthenic' })
    expect(cal.current.total).toBe(480)
    expect(cal.current.sessions).toBe(1)
  })
})

describe('pctChange', () => {
  it('returns null when there is nothing to compare', () => {
    expect(pctChange(100, 0)).toBeNull()
  })

  it('computes the change', () => {
    expect(pctChange(110, 100)).toBeCloseTo(10)
    expect(pctChange(90, 100)).toBeCloseTo(-10)
  })
})
