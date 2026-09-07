import { describe, expect, it } from 'vitest'
import {
  bestE1rm,
  e1rm,
  entryVolume,
  exerciseHistory,
  kgLabel,
  lastSetsFor,
  priorBestE1rm,
  reliableE1rm,
  setVolume,
  summarize,
  topSet,
  weeklyVolume,
} from './lift'
import { DEFAULT_SETTINGS } from './macros'
import type { AppData, Exercise, LiftEntry } from './types'

const dbRow: Exercise = {
  id: 'db-row',
  name: 'Dumbbell row',
  group: 'pull',
  mode: 'gym',
  gear: 'db',
  perSide: true,
}

const pulldown: Exercise = {
  id: 'lat-pulldown',
  name: 'Lat pulldown',
  group: 'pull',
  mode: 'gym',
  gear: 'stack',
}

const squat: Exercise = {
  id: 'smith-squat',
  name: 'Squat thanh Smith',
  group: 'legs',
  mode: 'gym',
  gear: 'smith',
  perSide: true,
}

function entry(exerciseId: string, sets: [number, number][]): LiftEntry {
  return {
    id: `e-${exerciseId}`,
    exerciseId,
    ts: 0,
    sets: sets.map(([kg, reps]) => ({ kg, reps })),
  }
}

function appData(days: Record<string, LiftEntry[]>): AppData {
  return {
    version: 2,
    settings: { ...DEFAULT_SETTINGS },
    customFoods: [],
    customExercises: [],
    days: Object.fromEntries(
      Object.entries(days).map(([date, lifts]) => [date, { date, entries: [], lifts }]),
    ),
    templates: [],
    lastAmounts: {},
    lastCosts: {},
    recent: {},
  }
}

describe('volume', () => {
  it('doubles a per-side load — 22kg mỗi tay là 44kg rời sàn mỗi rep', () => {
    expect(setVolume(dbRow, { kg: 22, reps: 10 })).toBe(440)
  })

  it('leaves a stack number alone', () => {
    expect(setVolume(pulldown, { kg: 60, reps: 6 })).toBe(360)
  })

  it('sums every set of an exercise', () => {
    expect(entryVolume(dbRow, entry('db-row', [[22, 10], [20, 10]]))).toBe(840)
  })
})

describe('topSet', () => {
  it('picks the heaviest set', () => {
    expect(topSet(entry('x', [[40, 15], [55, 8]]))).toEqual({ kg: 55, reps: 8 })
  })

  it('breaks a tie on reps', () => {
    expect(topSet(entry('x', [[55, 8], [55, 12]]))).toEqual({ kg: 55, reps: 12 })
  })

  it('returns undefined for an empty entry', () => {
    expect(topSet(entry('x', []))).toBeUndefined()
  })
})

describe('e1rm', () => {
  it('applies Epley on the effective load', () => {
    // 22kg mỗi tay = 44kg, 10 rep -> 44 × (1 + 10/30)
    expect(e1rm(dbRow, { kg: 22, reps: 10 })).toBeCloseTo(58.67, 2)
  })

  it('equals the bar weight at a single rep', () => {
    expect(e1rm(pulldown, { kg: 60, reps: 1 })).toBeCloseTo(62, 2)
  })

  it('is 0 for a set that never happened', () => {
    expect(e1rm(pulldown, { kg: 60, reps: 0 })).toBe(0)
  })

  it('flags high-rep sets as unreliable — Epley thổi số trên 12 rep', () => {
    expect(reliableE1rm({ kg: 8, reps: 12 })).toBe(true)
    expect(reliableE1rm({ kg: 8, reps: 18 })).toBe(false)
  })

  it('takes the best set of the entry', () => {
    expect(bestE1rm(pulldown, entry('lat-pulldown', [[50, 10], [60, 6]]))).toBeCloseTo(72, 2)
  })
})

describe('kgLabel', () => {
  it('marks per-side loads so 22 is never read as the total', () => {
    expect(kgLabel(dbRow, 22)).toBe('22 kg/bên')
    expect(kgLabel(pulldown, 60)).toBe('60 kg')
  })

  it('keeps the comma decimal used on the machine', () => {
    expect(kgLabel(squat, 22.5)).toBe('22,5 kg/bên')
  })
})

describe('summarize', () => {
  it('counts exercises, sets, reps and total volume', () => {
    const map = new Map([
      [dbRow.id, dbRow],
      [pulldown.id, pulldown],
    ])
    const s = summarize(
      [entry('db-row', [[22, 10], [20, 10]]), entry('lat-pulldown', [[60, 6]])],
      map,
    )
    expect(s).toEqual({ exercises: 2, sets: 3, reps: 26, volume: 840 + 360 })
  })

  it('skips an entry whose exercise was deleted rather than crashing', () => {
    expect(summarize([entry('gone', [[10, 10]])], new Map()).volume).toBe(0)
  })
})

describe('exerciseHistory', () => {
  const data = appData({
    '2026-09-01': [entry('db-row', [[20, 10]])],
    '2026-09-04': [entry('db-row', [[22, 10]]), entry('lat-pulldown', [[60, 6]])],
  })

  it('returns one point per day, oldest first', () => {
    const points = exerciseHistory(data, dbRow)
    expect(points.map((p) => p.date)).toEqual(['2026-09-01', '2026-09-04'])
    expect(points[1].top).toEqual({ kg: 22, reps: 10 })
  })

  it('ignores days after the end date', () => {
    expect(exerciseHistory(data, dbRow, '2026-09-02')).toHaveLength(1)
  })

  it('finds the previous session to prefill from', () => {
    expect(lastSetsFor(data, 'db-row', '2026-09-04')).toEqual({
      date: '2026-09-01',
      sets: [{ kg: 20, reps: 10 }],
    })
  })

  it('has no previous session on the first ever day', () => {
    expect(lastSetsFor(data, 'db-row', '2026-09-01')).toBeUndefined()
  })

  it('reports the record set before today, so a PR is only new ground', () => {
    // 20kg mỗi tay × 10 = 40 × (1 + 1/3) = 53,33
    expect(priorBestE1rm(data, dbRow, '2026-09-04')).toBeCloseTo(53.33, 2)
    expect(priorBestE1rm(data, dbRow, '2026-09-01')).toBe(0)
  })
})

describe('weeklyVolume', () => {
  it('buckets sessions into Mon–Sun weeks and splits volume by muscle group', () => {
    // 2026-09-04 là thứ 6, 2026-09-07 là thứ 2 tuần sau
    const data = appData({
      '2026-09-04': [entry('db-row', [[22, 10]])],
      '2026-09-07': [entry('smith-squat', [[22.5, 8]])],
    })
    const map = new Map([
      [dbRow.id, dbRow],
      [squat.id, squat],
    ])
    const weeks = weeklyVolume(data, 2, map, '2026-09-07')
    expect(weeks).toHaveLength(2)
    expect(weeks[0].start).toBe('2026-08-31')
    expect(weeks[0].byGroup.pull).toBe(440)
    expect(weeks[1].start).toBe('2026-09-07')
    expect(weeks[1].byGroup.legs).toBe(360)
    expect(weeks[1].sessions).toBe(1)
  })

  it('leaves a week with no training at zero instead of dropping it', () => {
    const weeks = weeklyVolume(appData({}), 3, new Map(), '2026-09-07')
    expect(weeks).toHaveLength(3)
    expect(weeks.every((w) => w.total === 0 && w.sessions === 0)).toBe(true)
  })
})

const pullUp: Exercise = {
  id: 'pull-up',
  name: 'Pull-Up',
  group: 'pull',
  mode: 'calisthenic',
  gear: 'body',
}

describe('bodyweight exercises', () => {
  it('counts the body as the load so a bare-hands set is not volume 0', () => {
    expect(setVolume(pullUp, { kg: 0, reps: 8 }, 60)).toBe(480)
  })

  it('adds a weight belt on top of bodyweight', () => {
    expect(setVolume(pullUp, { kg: 10, reps: 5 }, 60)).toBe(350)
  })

  it('never doubles a bodyweight load — perSide does not apply', () => {
    const odd: Exercise = { ...pullUp, perSide: true }
    expect(setVolume(odd, { kg: 0, reps: 10 }, 60)).toBe(600)
  })

  it('labels bare-hands and added load differently', () => {
    expect(kgLabel(pullUp, 0)).toBe('tay không')
    expect(kgLabel(pullUp, 7.5)).toBe('+7,5 kg')
  })

  it('splits weekly volume by mode so gym and calisthenic do not mix', () => {
    const data = appData({
      '2026-09-07': [entry('db-row', [[22, 10]]), entry('pull-up', [[0, 8]])],
    })
    const map = new Map([
      [dbRow.id, dbRow],
      [pullUp.id, pullUp],
    ])
    const gym = weeklyVolume(data, 1, map, '2026-09-07', { mode: 'gym', bodyKg: 60 })
    const cal = weeklyVolume(data, 1, map, '2026-09-07', {
      mode: 'calisthenic',
      bodyKg: 60,
    })
    expect(gym[0].total).toBe(440)
    expect(cal[0].total).toBe(480)
  })
})
