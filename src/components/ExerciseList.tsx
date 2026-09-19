import { useMemo, useState } from 'react'
import { matchName, shortDate } from '../lib/format'
import { useData, usePref } from '../lib/hooks'
import { GEAR_LABELS, lastChange, lastSetsFor, setLabel } from '../lib/lift'
import { dateKey } from '../lib/macros'
import { GROUP_COLOR, LIFT_GROUPS, LIFT_GROUP_LABELS } from '../lib/muscles'
import { allExercises } from '../lib/storage'
import type { Exercise, LiftMode } from '../lib/types'
import { Delta } from './Delta'
import { GroupFilter, NO_FILTER, matchesFilter } from './GroupFilter'

/**
 * Danh sách bài tập của một chế độ, nằm trong trang riêng. Bấm tên để sửa
 * tên/quy ước kg, bấm con số % bên phải để xem biểu đồ tiến bộ. Việc nhập set
 * nằm ở LiftSession.
 *
 * Con số % là buổi gần nhất so với buổi trước đó. Một công tắc chung cho cả danh
 * sách chọn đo bằng 1RM ước tính (khoẻ lên chưa) hay volume (làm nhiều việc hơn
 * chưa) — mỗi dòng chỉ một số cho dễ lướt.
 */
export function ExerciseList({
  mode,
  onOpen,
  onProgress,
}: {
  mode: LiftMode
  onOpen: (ex: Exercise) => void
  onProgress: (ex: Exercise) => void
}) {
  const data = useData()
  const today = dateKey()
  const bodyKg = data.settings.weightKg
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState(NO_FILTER)
  const [metric, setMetric] = usePref<'e1rm' | 'volume'>('ex-metric', 'e1rm', ['e1rm', 'volume'])

  const inMode = useMemo(() => allExercises(data).filter((ex) => ex.mode === mode), [data, mode])
  const list = useMemo(
    () =>
      inMode
        .filter((ex) => matchesFilter(ex, filter))
        // khớp cả tên tiếng Anh lẫn ghi chú tiếng Việt, gõ không dấu vẫn ra
        .filter((ex) => matchName(ex.name, query) || matchName(ex.note ?? '', query))
        .sort(
          (a, b) =>
            LIFT_GROUPS.indexOf(a.group) - LIFT_GROUPS.indexOf(b.group) ||
            a.name.localeCompare(b.name, 'en'),
        ),
    [inMode, filter, query],
  )

  const changes = useMemo(
    () => new Map(list.map((ex) => [ex.id, lastChange(data, ex, bodyKg)])),
    [list, data, bodyKg],
  )

  return (
    <>
      <input
        placeholder="Tìm bài — gõ tiếng Anh hoặc tiếng Việt, không dấu cũng được"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <GroupFilter exercises={inMode} value={filter} onChange={setFilter} />

      <div className="between">
        <span className="dim">So với lần tập trước</span>
        <div className="seg sm" style={{ width: 170 }}>
          <button aria-pressed={metric === 'e1rm'} onClick={() => setMetric('e1rm')}>
            1RM
          </button>
          <button aria-pressed={metric === 'volume'} onClick={() => setMetric('volume')}>
            Volume
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="empty">Không có bài nào khớp.</p>
      ) : (
        <div className="list">
          {list.map((ex) => {
            const last = lastSetsFor(data, ex.id, today)
            const top = last?.sets[0]
            const change = changes.get(ex.id)
            return (
              <div key={ex.id} className="list-item ex-row">
                <button className="ex-open" onClick={() => onOpen(ex)}>
                  <i
                    className="swatch"
                    style={{ background: GROUP_COLOR[ex.group] }}
                    aria-hidden="true"
                  />
                  <span className="grow">
                    <span className="truncate lift-name" style={{ display: 'block' }}>
                      {ex.name}
                    </span>
                    <span className="dim num truncate" style={{ display: 'block' }}>
                      {LIFT_GROUP_LABELS[ex.group]} · {GEAR_LABELS[ex.gear]}
                      {top
                        ? ` · lần cuối ${setLabel(ex, top)} (${shortDate(last!.date)})`
                        : ' · chưa tập lần nào'}
                    </span>
                  </span>
                </button>
                {(top || change) && (
                  <button
                    className="ex-delta"
                    onClick={() => onProgress(ex)}
                    aria-label={`Xem tiến bộ ${ex.name}`}
                  >
                    {change ? (
                      <Delta pct={metric === 'e1rm' ? change.e1rm : change.volume} />
                    ) : (
                      <span className="dim">mới</span>
                    )}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
