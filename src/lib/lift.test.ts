import { describe, expect, it } from 'vitest'
import {
  bestE1rm,
  e1rm,
  entryReps,
  entryVolume,
  exerciseHistory,
  kgLabel,
  kgStepFor,
  lastSessionFor,
  lastSetsFor,
  planFromTemplate,
  priorBestE1rm,
  reliableE1rm,
  setVolume,
  shortSet,
  stepValue,
  suggestDropKg,
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
    workoutTemplates: [],
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

describe('dropset', () => {
  const drop = { kg: 60, reps: 10, drops: [{ kg: 45, reps: 8 }, { kg: 30, reps: 6 }] }

  it('adds every drop to volume — cả chuỗi là việc thật đã làm', () => {
    expect(setVolume(pulldown, drop)).toBe(600 + 360 + 180)
  })

  it('counts a dropset as one set but every rep', () => {
    const e: LiftEntry = { id: 'x', exerciseId: pulldown.id, ts: 0, sets: [drop] }
    expect(summarize([e], new Map([[pulldown.id, pulldown]])).sets).toBe(1)
    expect(entryReps(e)).toBe(24)
  })

  it('reads only the head set for 1RM — nấc sau đã mỏi, kéo ước tính xuống sai', () => {
    expect(e1rm(pulldown, drop)).toBeCloseTo(80, 5)
  })

  it('doubles per-side drops the same way as the head set', () => {
    expect(setVolume(dbRow, { kg: 20, reps: 10, drops: [{ kg: 14, reps: 8 }] })).toBe(400 + 224)
  })

  it('prints the chain compactly', () => {
    expect(shortSet(drop)).toBe('60×10↘45×8↘30×6')
    expect(shortSet({ kg: 22.5, reps: 8 })).toBe('22,5×8')
  })

  it('suggests the next drop about 20% lighter, rounded down to the plate step', () => {
    expect(suggestDropKg(60, 2.5)).toBe(47.5)
    expect(suggestDropKg(47.5, 2.5)).toBe(37.5)
    expect(suggestDropKg(0, 2.5)).toBe(0)
  })
})

describe('stepValue', () => {
  it('moves one plate step', () => {
    expect(stepValue(47.5, 2.5, 1)).toBe(50)
    expect(stepValue(47.5, 2.5, -1)).toBe(45)
  })

  it('snaps an off-step number to the next plate in the pressed direction', () => {
    expect(stepValue(46, 2.5, 1)).toBe(47.5)
    expect(stepValue(46, 2.5, -1)).toBe(45)
  })

  it('never goes below zero', () => {
    expect(stepValue(1, 2.5, -1)).toBe(0)
    expect(stepValue(0, 1, -1)).toBe(0)
  })

  it('does not leak float noise', () => {
    expect(stepValue(1.25, 1.25, 1)).toBe(2.5)
    expect(stepValue(0.2, 0.1, 1)).toBe(0.3)
  })

  it('uses 2,5 unless the exercise overrides it', () => {
    expect(kgStepFor(pulldown)).toBe(2.5)
    expect(kgStepFor({ ...pulldown, kgStep: 5 })).toBe(5)
  })
})

describe('lastSessionFor', () => {
  const map = new Map([
    [dbRow.id, dbRow],
    [pulldown.id, pulldown],
    [squat.id, squat],
  ])

  it('finds the last session of the same labelled group', () => {
    const data = appData({
      '2026-09-01': [entry('db-row', [[20, 10]]), entry('lat-pulldown', [[55, 10]])],
      '2026-09-03': [entry('smith-squat', [[20, 8]])],
    })
    data.days['2026-09-01'].liftGroup = 'pull'
    data.days['2026-09-03'].liftGroup = 'legs'
    const found = lastSessionFor(data, 'gym', 'pull', '2026-09-05', map)
    expect(found?.date).toBe('2026-09-01')
    expect(found?.entries.map((e) => e.exerciseId)).toEqual(['db-row', 'lat-pulldown'])
  })

  it('falls back to the majority group on days logged before group chips existed', () => {
    const data = appData({
      '2026-09-02': [entry('db-row', [[20, 10]]), entry('lat-pulldown', [[55, 10]])],
    })
    expect(lastSessionFor(data, 'gym', 'pull', '2026-09-05', map)?.date).toBe('2026-09-02')
    expect(lastSessionFor(data, 'gym', 'legs', '2026-09-05', map)).toBeUndefined()
  })

  it('ignores the day being planned', () => {
    const data = appData({ '2026-09-05': [entry('db-row', [[20, 10]])] })
    data.days['2026-09-05'].liftGroup = 'pull'
    expect(lastSessionFor(data, 'gym', 'pull', '2026-09-05', map)).toBeUndefined()
  })
})

describe('planFromTemplate', () => {
  const data = appData({
    '2026-09-01': [entry('db-row', [[20, 10], [22, 8]])],
  })

  it('takes kg/rep from the latest session, repeating the last set to fill the count', () => {
    const plan = planFromTemplate(
      data,
      { id: 't', name: 'Kéo A', mode: 'gym', items: [{ exerciseId: 'db-row', sets: 3 }] },
      '2026-09-05',
    )
    expect(plan[0].sets).toEqual([
      { kg: 20, reps: 10 },
      { kg: 22, reps: 8 },
      { kg: 22, reps: 8 },
    ])
  })

  it('leaves blank sets for an exercise never trained', () => {
    const plan = planFromTemplate(
      data,
      { id: 't', name: 'Kéo A', mode: 'gym', items: [{ exerciseId: 'lat-pulldown', sets: 2 }] },
      '2026-09-05',
    )
    expect(plan[0].sets).toEqual([
      { kg: 0, reps: 0 },
      { kg: 0, reps: 0 },
    ])
  })
})