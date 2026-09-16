import { describe, expect, it } from 'vitest'
import type { DraftRow } from './draft'
import {
  doneSets,
  editRowField,
  initialRows,
  moveRow,
  pendingIndexes,
  rowFromSet,
  rowToSet,
} from './setRows'

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

describe('editRowField — tự chép xuống', () => {
  const kgs = (rows: DraftRow[]) => rows.map((r) => r.kg)

  it('copies a new weight down to the untouched sets below', () => {
    const rows = editRowField([row('40', '10'), row('40', '10'), row('40', '8')], 0, 'kg', '42,5')
    expect(kgs(rows)).toEqual(['42,5', '42,5', '42,5'])
    // chỉ ô vừa sửa đổi — rep giữ nguyên
    expect(rows.map((r) => r.reps)).toEqual(['10', '10', '8'])
  })

  it('never touches the sets above', () => {
    const rows = editRowField([row('40', '10'), row('40', '10'), row('40', '8')], 1, 'reps', '9')
    expect(rows.map((r) => r.reps)).toEqual(['10', '9', '9'])
  })

  it('stops at a ticked set — đó là số thật đã tập', () => {
    const rows = editRowField(
      [row('40', '10'), row('40', '10', true), row('40', '8')],
      0,
      'kg',
      '45',
    )
    expect(kgs(rows)).toEqual(['45', '40', '40'])
  })

  it('stops at a set whose field was edited by hand, and keeps the sets below it', () => {
    let rows = [row('40', '10'), row('40', '10'), row('40', '10')]
    rows = editRowField(rows, 1, 'kg', '35') // set 2 sửa tay, set 3 theo set 2
    rows = editRowField(rows, 0, 'kg', '45')
    expect(kgs(rows)).toEqual(['45', '35', '35'])
  })

  it('tracks kg and reps separately', () => {
    let rows = [row('40', '10'), row('40', '10')]
    rows = editRowField(rows, 1, 'reps', '8') // set 2 sửa tay rep, kg vẫn theo
    rows = editRowField(rows, 0, 'kg', '45')
    rows = editRowField(rows, 0, 'reps', '12')
    expect(rows[1]).toMatchObject({ kg: '45', reps: '8' })
  })
})

describe('moveRow — kéo đổi chỗ set', () => {
  const rows = [row('20', '10', true), row('22,5', '8'), row('25', '6')]

  it('moves a set down and closes the gap', () => {
    expect(moveRow(rows, 0, 2).map((r) => r.kg)).toEqual(['22,5', '25', '20'])
  })

  it('moves a set up', () => {
    expect(moveRow(rows, 2, 0).map((r) => r.kg)).toEqual(['25', '20', '22,5'])
  })

  it('carries the tick with the row', () => {
    expect(moveRow(rows, 0, 1).map((r) => r.done)).toEqual([false, true, false])
  })

  it('returns the same array for a no-op or out-of-range move', () => {
    expect(moveRow(rows, 1, 1)).toBe(rows)
    expect(moveRow(rows, 0, 3)).toBe(rows)
    expect(moveRow(rows, -1, 0)).toBe(rows)
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
