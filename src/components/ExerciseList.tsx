import { useMemo, useState } from 'react'
import { matchName, shortDate } from '../lib/format'
import { useData } from '../lib/hooks'
import {
  GEAR_LABELS,
  LIFT_GROUPS,
  LIFT_GROUP_LABELS,
  lastSetsFor,
  setLabel,
} from '../lib/lift'
import { dateKey } from '../lib/macros'
import { allExercises } from '../lib/storage'
import type { Exercise, LiftGroup, LiftMode } from '../lib/types'
import { GROUP_COLOR } from './Strength'

/**
 * Danh sách bài tập của một chế độ. Chỉ để tra cứu và mở ra sửa tên/quy ước kg —
 * việc nhập set nằm ở LiftSheet, mở từ nút "Log buổi hôm nay".
 */
export function ExerciseList({
  mode,
  onOpen,
  onCreate,
}: {
  mode: LiftMode
  onOpen: (ex: Exercise) => void
  onCreate: () => void
}) {
  const data = useData()
  const today = dateKey()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<LiftGroup | 'all'>('all')

  const list = useMemo(
    () =>
      allExercises(data)
        .filter((ex) => ex.mode === mode)
        .filter((ex) => filter === 'all' || ex.group === filter)
        // khớp cả tên tiếng Anh lẫn ghi chú tiếng Việt, gõ không dấu vẫn ra
        .filter((ex) => matchName(ex.name, query) || matchName(ex.note ?? '', query))
        .sort(
          (a, b) =>
            LIFT_GROUPS.indexOf(a.group) - LIFT_GROUPS.indexOf(b.group) ||
            a.name.localeCompare(b.name, 'en'),
        ),
    [data, mode, filter, query],
  )

  return (
    <section className="card">
      <div className="between" style={{ marginBottom: 10 }}>
        <h2 className="h2">Danh sách bài · {list.length}</h2>
        <button className="btn sm" onClick={onCreate}>
          + Bài mới
        </button>
      </div>

      <input
        placeholder="Tìm bài — gõ tiếng Anh hoặc tiếng Việt, không dấu cũng được"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="chips" style={{ marginTop: 10 }}>
        <button className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
          Tất cả
        </button>
        {LIFT_GROUPS.map((g) => (
          <button key={g} className="chip" aria-pressed={filter === g} onClick={() => setFilter(g)}>
            {LIFT_GROUP_LABELS[g]}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="empty">Không có bài nào khớp.</p>
      ) : (
        <div className="list" style={{ marginTop: 4 }}>
          {list.map((ex) => {
            const last = lastSetsFor(data, ex.id, today)
            const top = last?.sets[0]
            return (
              <button key={ex.id} className="list-item" onClick={() => onOpen(ex)}>
                <i
                  className="swatch"
                  style={{ background: GROUP_COLOR[ex.group], flex: 'none' }}
                  aria-hidden="true"
                />
                <span className="grow">
                  <span className="truncate" style={{ display: 'block', fontWeight: 500 }}>
                    {ex.name}
                  </span>
                  <span className="dim num">
                    {LIFT_GROUP_LABELS[ex.group]} · {GEAR_LABELS[ex.gear]}
                    {top
                      ? ` · lần cuối ${setLabel(ex, top)} (${shortDate(last!.date)})`
                      : ' · chưa tập lần nào'}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
