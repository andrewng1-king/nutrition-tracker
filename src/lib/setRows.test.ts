import { describe, expect, it } from 'vitest'
import type { DraftRow } from './draft'
import { doneSets, initialRows, pendingIndexes, rowFromSet, rowToSet } from './setRows'

const row = (kg: string, reps: string, done = false, drops: DraftRow['drops'] = []): DraftRow => ({
  kg,
  reps,
  done,
  drops,
})

describe('rows ↔ sets', () => {
  it('reads comma decimals and keeps drops that have reps', () => {
    expect(rowToSet(row('22,5', '8', false, [{ kg: '17,5', reps: '6' }, { kg: '10', reps: '' }]))).toEqual({
      kg: 22.5,
      reps: 8,
      drops: [{ kg: 17.5, reps: 6 }],
    })
  })

  it('opens a blank template set as empty inputs instead of "0"', () => {
    expect(rowFromSet({ kg: 0, reps: 0 }, false)).toEqual(row('', ''))
  })

  it('keeps a bare-hands bodyweight set as 0 kg', () => {
    expect(rowFromSet({ kg: 0, reps: 12 }, true)).toEqual(row('0', '12', true))
  })
})

describe('done vs pending', () => {
  const rows = [row('50', '10', true), row('50', '8'), row('', '8'), row('50', '')]

  it('logs only ticked, valid sets', () => {
    expect(doneSets(rows, false)).toEqual([{ kg: 50, reps: 10 }])
  })

  it('finds filled rows still waiting for a tick', () => {
    expect(pendingIndexes(rows, false)).toEqual([1])
  })

  it('treats a bodyweight row without kg as valid', () => {
    expect(pendingIndexes(rows, true)).toEqual([1, 2])
  })
})

describe('initialRows', () => {
  const s = (kg: number, reps: number) => ({ kg, reps })

  it('shows logged sets as ticked and appends the rest of the plan unticked', () => {
    const rows = initialRows([s(50, 10)], [s(50, 10), s(50, 10), s(45, 12)], [])
    expect(rows.map((r) => r.done)).toEqual([true, false, false])
    expect(rows[2]).toEqual(row('45', '12'))
  })

  it('falls back to last session as unticked targets', () => {
    const rows = initialRows([], [], [s(40, 12), s(40, 10)])
    expect(rows).toEqual([row('40', '12'), row('40', '10')])
  })

  it('opens three blank rows for a brand-new exercise', () => {
    expect(initialRows([], [], [])).toHaveLength(3)
  })
})
