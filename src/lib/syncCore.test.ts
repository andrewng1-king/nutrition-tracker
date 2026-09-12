import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './macros'
import {
  changedDays,
  hasLocalData,
  mergeFirstSync,
  mergeRemoteDays,
  metaChanged,
  metaOf,
  stableJson,
} from './syncCore'
import type { AppData, DayLog } from './types'

function data(days: Record<string, DayLog> = {}): AppData {
  return {
    version: 4,
    settings: { ...DEFAULT_SETTINGS },
    customFoods: [],
    customExercises: [],
    days,
    templates: [],
    workoutTemplates: [],
    lastAmounts: {},
    lastCosts: {},
    recent: {},
  }
}

const day = (date: string, note?: string): DayLog => ({ date, entries: [], note })

describe('change detection', () => {
  it('lists only the days whose object changed, including removed ones', () => {
    const a = day('2026-09-01')
    const prev = data({ '2026-09-01': a, '2026-09-02': day('2026-09-02') })
    const next = { ...prev, days: { '2026-09-01': a, '2026-09-03': day('2026-09-03') } }
    expect(changedDays(prev, next).sort()).toEqual(['2026-09-02', '2026-09-03'])
  })

  it('notices a settings change but not a day change as meta', () => {
    const prev = data()
    expect(metaChanged(prev, { ...prev, days: { x: day('x') } })).toBe(false)
    expect(metaChanged(prev, { ...prev, settings: { ...prev.settings, weightKg: 61 } })).toBe(true)
  })

  it('never ships the days inside the meta row', () => {
    expect(Object.keys(metaOf(data({ x: day('x') })))).not.toContain('days')
    expect(Object.keys(metaOf(data()))).toContain('workoutTemplates')
  })
})

describe('mergeRemoteDays', () => {
  it('keeps a local edit made after the remote copy', () => {
    const local = { '2026-09-01': day('2026-09-01', 'máy') }
    const out = mergeRemoteDays(
      local,
      [{ date: '2026-09-01', data: day('2026-09-01', 'mạng'), updated_at: 100 }],
      { '2026-09-01': 200 },
    )
    expect(out.days['2026-09-01'].note).toBe('máy')
    expect(out.dirty).toEqual({ '2026-09-01': 200 })
    expect(out.changed).toBe(false)
  })

  it('takes a newer remote copy and drops the pending flag', () => {
    const out = mergeRemoteDays(
      { '2026-09-01': day('2026-09-01', 'máy') },
      [{ date: '2026-09-01', data: day('2026-09-01', 'mạng'), updated_at: 300 }],
      { '2026-09-01': 200 },
    )
    expect(out.days['2026-09-01'].note).toBe('mạng')
    expect(out.dirty).toEqual({})
  })

  it('deletes a day that was removed on another device', () => {
    const out = mergeRemoteDays(
      { '2026-09-01': day('2026-09-01') },
      [{ date: '2026-09-01', data: null, updated_at: 5 }],
      {},
    )
    expect(out.days).toEqual({})
    expect(out.changed).toBe(true)
  })

  it('reports no change when our own push comes back with keys reordered by jsonb', () => {
    const d: DayLog = { date: '2026-09-01', entries: [], note: 'x', weightKg: 60, plan: undefined }
    const echoed = { weightKg: 60, note: 'x', entries: [], date: '2026-09-01' } as DayLog
    const out = mergeRemoteDays({ '2026-09-01': d }, [{ date: d.date, data: echoed, updated_at: 1 }], {})
    expect(out.changed).toBe(false)
    expect(stableJson({ b: 1, a: { d: 2, c: 3 } })).toBe(stableJson({ a: { c: 3, d: 2 }, b: 1 }))
  })
})

describe('mergeFirstSync', () => {
  it('keeps local-only days (flagged for upload) and takes the account copy on overlap', () => {
    const local = data({
      '2026-09-01': day('2026-09-01', 'máy'),
      '2026-09-02': day('2026-09-02', 'chỉ máy có'),
    })
    local.customFoods = [
      { id: 'a', name: 'A', category: 'khac', servingSize: 1, servingUnit: 'phần', kcal: 1, protein: 0, fat: 0, carb: 0 },
    ]
    const remoteMeta = metaOf(data())
    remoteMeta.customFoods = [
      { id: 'b', name: 'B', category: 'khac', servingSize: 1, servingUnit: 'phần', kcal: 2, protein: 0, fat: 0, carb: 0 },
    ]
    const { data: merged, dirtyDays } = mergeFirstSync(
      local,
      remoteMeta,
      [{ date: '2026-09-01', data: day('2026-09-01', 'tài khoản'), updated_at: 1 }],
      999,
    )
    expect(merged.days['2026-09-01'].note).toBe('tài khoản')
    expect(merged.days['2026-09-02'].note).toBe('chỉ máy có')
    expect(dirtyDays).toEqual({ '2026-09-02': 999 })
    expect(merged.customFoods.map((f) => f.id)).toEqual(['b', 'a'])
  })

  it('treats a fresh install as having no data to protect', () => {
    expect(hasLocalData(data())).toBe(false)
    expect(hasLocalData(data({ x: day('x') }))).toBe(true)
  })
})
