import { LIFT_GROUPS, LIFT_GROUP_LABELS, LIFT_SUBS, SUB_LABELS } from '../lib/muscles'
import type { Exercise, LiftGroup, LiftSub } from '../lib/types'

export interface GroupFilterValue {
  group: LiftGroup | 'all'
  sub: LiftSub | 'all'
}

export const NO_FILTER: GroupFilterValue = { group: 'all', sub: 'all' }

export function matchesFilter(ex: Exercise, f: GroupFilterValue): boolean {
  if (f.group !== 'all' && ex.group !== f.group) return false
  return f.sub === 'all' || (ex.subs ?? []).includes(f.sub)
}

/**
 * Hàng chip nhóm cơ, chọn một nhóm thì mở thêm hàng chip nhóm phụ bên dưới.
 * Chỉ hiện nhóm và nhóm phụ có bài trong `exercises` — calisthenic không có bài
 * tay trước thì không bày chip Tay trước bấm vào ra danh sách rỗng.
 */
export function GroupFilter({
  exercises,
  value,
  onChange,
}: {
  exercises: Exercise[]
  value: GroupFilterValue
  onChange: (next: GroupFilterValue) => void
}) {
  const groups = LIFT_GROUPS.filter((g) => exercises.some((ex) => ex.group === g))
  const subs =
    value.group === 'all'
      ? []
      : LIFT_SUBS[value.group].filter((s) =>
          exercises.some((ex) => ex.group === value.group && ex.subs?.includes(s)),
        )

  return (
    <>
      <div className="chips">
        <button
          className="chip"
          aria-pressed={value.group === 'all'}
          onClick={() => onChange({ group: 'all', sub: 'all' })}
        >
          Tất cả
        </button>
        {groups.map((g) => (
          <button
            key={g}
            className="chip"
            aria-pressed={value.group === g}
            onClick={() => onChange({ group: value.group === g ? 'all' : g, sub: 'all' })}
          >
            {LIFT_GROUP_LABELS[g]}
          </button>
        ))}
      </div>

      {subs.length > 0 && (
        <div className="chips sub-chips">
          <button
            className="chip"
            aria-pressed={value.sub === 'all'}
            onClick={() => onChange({ ...value, sub: 'all' })}
          >
            Cả nhóm
          </button>
          {subs.map((s) => (
            <button
              key={s}
              className="chip"
              aria-pressed={value.sub === s}
              onClick={() => onChange({ ...value, sub: value.sub === s ? 'all' : s })}
            >
              {SUB_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
