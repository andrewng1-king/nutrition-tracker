import { describe, expect, it } from 'vitest'
import { SEED_EXERCISES } from '../data/exercises'
import {
  LIFT_SUBS,
  groupVolumes,
  guessGroup,
  normalizeExercise,
  sessionLabel,
  splitBySub,
} from './muscles'
import type { Exercise } from './types'

/** `group` là chuỗi tuỳ ý để dựng được bài lưu từ bản cũ ('pull', 'push'). */
const ex = (patch: Omit<Partial<Exercise>, 'group'> & { id: string; group: string }): Exercise =>
  ({ name: patch.id, mode: 'gym', gear: 'stack', ...patch }) as Exercise

describe('seed exercises', () => {
  it('have unique ids', () => {
    const ids = SEED_EXERCISES.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('only use sub-groups that belong to their own muscle group', () => {
    for (const e of SEED_EXERCISES) {
      for (const s of e.subs ?? []) expect(LIFT_SUBS[e.group]).toContain(s)
    }
  })
})

describe('guessGroup — dữ liệu từ thời nhóm split', () => {
  it('splits old pull exercises into back, biceps and forearm by name', () => {
    expect(guessGroup('Hammer Curl', 'pull')).toBe('biceps')
    expect(guessGroup('Reverse Curl EZ', 'pull')).toBe('forearm')
    expect(guessGroup('Pendlay Row', 'pull')).toBe('back')
    expect(guessGroup('Face Pull', 'pull')).toBe('shoulder')
  })

  it('splits old push exercises into chest, triceps and shoulder by name', () => {
    expect(guessGroup('Skull Crusher', 'push')).toBe('triceps')
    expect(guessGroup('Incline Bench Press', 'push')).toBe('chest')
    expect(guessGroup('Dumbbell Lateral Raise', 'push')).toBe('shoulder')
  })

  it('does not let "leg curl" or "reverse pec deck" fall into arms or chest', () => {
    expect(guessGroup('Seated Leg Curl')).toBe('legs')
    expect(guessGroup('Reverse Pec Deck')).toBe('shoulder')
  })

  it('falls back to the natural group when the name says nothing', () => {
    expect(guessGroup('Máy số 7', 'pull')).toBe('back')
    expect(guessGroup('Máy số 7', 'push')).toBe('chest')
  })

  it('ignores a name match that makes no sense for the old group', () => {
    // bài "push" tên có chữ squat — không tin, về ngực
    expect(guessGroup('Squat Press Machine', 'push')).toBe('chest')
  })
})

describe('normalizeExercise', () => {
  const seed = SEED_EXERCISES.find((e) => e.id === 'rear-pec-deck')!

  it('gives an old seed override the new seed group and subs, keeping the rename', () => {
    const old = ex({ id: 'rear-pec-deck', name: 'Máy bay vai sau', group: 'pull' })
    const out = normalizeExercise(old, seed)
    expect(out.name).toBe('Máy bay vai sau')
    expect(out.group).toBe('shoulder')
    expect(out.subs).toEqual(['shoulder-rear'])
  })

  it('keeps a new-style override as the user set it, even with no subs', () => {
    const mine = ex({ id: 'rear-pec-deck', group: 'back', subs: [] })
    expect(normalizeExercise(mine, seed)).toEqual(mine)
  })

  it('guesses the group of an old custom exercise', () => {
    const old = ex({ id: 'ex-1', name: 'Rope Pushdown', group: 'push' })
    expect(normalizeExercise(old).group).toBe('triceps')
  })

  it('drops subs that do not belong to the group', () => {
    const bad = ex({ id: 'ex-2', group: 'chest', subs: ['chest-upper', 'legs-quads'] })
    expect(normalizeExercise(bad).subs).toEqual(['chest-upper'])
  })

  it('returns the same object when nothing needs fixing', () => {
    const ok = ex({ id: 'ex-3', group: 'legs', subs: ['legs-hams'] })
    expect(normalizeExercise(ok)).toBe(ok)
  })
})

describe('volume by sub-group', () => {
  const press = ex({ id: 'press', group: 'shoulder', subs: ['shoulder-front', 'shoulder-side'] })
  const raise = ex({ id: 'raise', group: 'shoulder', subs: ['shoulder-side'] })
  const curl = ex({ id: 'curl', group: 'biceps' })
  const map = new Map([press, raise, curl].map((e) => [e.id, e]))
  const set = (kg: number, reps: number) => ({ kg, reps })

  it('splits an exercise evenly so the parts add back up', () => {
    expect(splitBySub(press, 300)).toEqual([
      ['shoulder-front', 150],
      ['shoulder-side', 150],
    ])
    expect(splitBySub(curl, 120)).toEqual([['biceps:all', 120]])
  })

  it('sums a session per group, heaviest group first', () => {
    const entries = [
      { id: 'a', exerciseId: 'press', ts: 0, sets: [set(30, 10)] },
      { id: 'b', exerciseId: 'raise', ts: 0, sets: [set(10, 10)] },
      { id: 'c', exerciseId: 'curl', ts: 0, sets: [set(25, 10), set(25, 10)] },
    ]
    const groups = groupVolumes(entries, map, (_, e) =>
      e.sets.reduce((sum, s) => sum + s.kg * s.reps, 0),
    )
    expect(groups.map((g) => g.group)).toEqual(['biceps', 'shoulder'])
    expect(groups[1].volume).toBe(400)
    expect(groups[1].subs).toEqual([
      { key: 'shoulder-front', volume: 150 },
      { key: 'shoulder-side', volume: 250 },
    ])
  })
})

describe('sessionLabel', () => {
  const map = new Map(SEED_EXERCISES.map((e) => [e.id, e]))
  const sets = (count: number) => Array(count)

  it('names the groups with the most sets first', () => {
    const entries = [
      { exerciseId: 'triceps-pushdown', sets: sets(3) },
      { exerciseId: 'db-bench', sets: sets(4) },
    ]
    expect(sessionLabel(entries, map)).toBe('Ngực · Tay sau')
  })

  it('shortens a session of many groups', () => {
    const entries = [
      { exerciseId: 'db-bench', sets: sets(4) },
      { exerciseId: 'triceps-pushdown', sets: sets(3) },
      { exerciseId: 'db-lat-raise', sets: sets(2) },
    ]
    expect(sessionLabel(entries, map)).toBe('Ngực · Tay sau +1')
  })

  it('is empty for an empty session', () => {
    expect(sessionLabel([], map)).toBe('')
  })
})
