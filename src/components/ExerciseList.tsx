import { useMemo, useState } from 'react'
import { matchName, n, shortDate } from '../lib/format'
import { useData } from '../lib/hooks'
import {
  GEAR_LABELS,
  LIFT_GROUPS,
  LIFT_GROUP_LABELS,
  isBodyweight,
  lastSetsFor,
  setLabel,
  sparkValues,
} from '../lib/lift'
import { dateKey } from '../lib/macros'
import { allExercises } from '../lib/storage'
import type { Exercise, LiftGroup, LiftMode } from '../lib/types'
import { GROUP_COLOR } from './Strength'

/**
 * Danh sách bài tập của một chế độ. Bấm tên để sửa tên/quy ước kg, bấm sparkline
 * bên phải để xem biểu đồ tiến bộ. Việc nhập set nằm ở LiftSheet.
 */
export function ExerciseList({
  mode,
  onOpen,
  onCreate,
  onProgress,
}: {
  mode: LiftMode
  onOpen: (ex: Exercise) => void
  onCreate: () => void
  onProgress: (ex: Exercise) => void
}) {
  const data = useData()
  const today = dateKey()
  const bodyKg = data.settings.weightKg
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

  const sparks = useMemo(
    () => new Map(list.map((ex) => [ex.id, sparkValues(data, ex, bodyKg)])),
    [list, data, bodyKg],
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
            const values = sparks.get(ex.id) ?? []
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
                {values.length > 0 && (
                  <SparkButton
                    values={values}
                    bodyweight={isBodyweight(ex)}
                    color={GROUP_COLOR[ex.group]}
                    name={ex.name}
                    onClick={() => onProgress(ex)}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

const SW = 40
const SH = 18

/**
 * Nút xem tiến bộ kiêm biểu đồ mini: 6 buổi gần nhất của chỉ số chính và mức
 * chênh giữa buổi đầu và buổi cuối. Lướt danh sách là thấy bài nào đang lên,
 * bài nào đứng yên — không cần mở từng bài.
 */
function SparkButton({
  values,
  bodyweight,
  color,
  name,
  onClick,
}: {
  values: number[]
  bodyweight: boolean
  color: string
  name: string
  onClick: () => void
}) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min
  const points = values.map((v, i) => {
    const x = values.length === 1 ? SW / 2 : 1.5 + (i / (values.length - 1)) * (SW - 3)
    const y = span === 0 ? SH / 2 : SH - 2 - ((v - min) / span) * (SH - 4)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const digits = bodyweight ? 0 : 1
  const delta = Number((values[values.length - 1] - values[0]).toFixed(digits))
  const tone = values.length === 1 || delta === 0 ? 'flat' : delta > 0 ? 'up' : 'down'
  const text =
    values.length === 1
      ? 'mới'
      : delta === 0
        ? '±0'
        : `${delta > 0 ? '+' : '−'}${n(Math.abs(delta), digits)}`
  const unit = bodyweight ? 'rep' : 'kg 1RM'

  return (
    <button
      className="spark-btn"
      data-tone={tone}
      onClick={onClick}
      aria-label={
        values.length === 1
          ? `Xem tiến bộ ${name}: mới tập 1 buổi`
          : `Xem tiến bộ ${name}: ${text} ${unit} qua ${values.length} buổi gần nhất`
      }
    >
      <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`} aria-hidden="true">
        {values.length === 1 ? (
          <circle cx={SW / 2} cy={SH / 2} r="2.4" fill={color} />
        ) : (
          <polyline
            points={points.join(' ')}
            fill="none"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
      <span className="spark-delta num">{text}</span>
    </button>
  )
}
