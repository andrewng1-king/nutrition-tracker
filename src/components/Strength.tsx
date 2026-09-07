import { useMemo, useState } from 'react'
import { n, shortDate } from '../lib/format'
import { useData } from '../lib/hooks'
import {
  LIFT_GROUPS,
  LIFT_GROUP_LABELS,
  exerciseHistory,
  isBodyweight,
  liftDates,
  reliableE1rm,
  setLabel,
  volumeShort,
  weeklyVolume,
} from '../lib/lift'
import { allExercises, exerciseMap } from '../lib/storage'
import type { AppData, Exercise, LiftGroup, LiftMode } from '../lib/types'

export const GROUP_COLOR: Record<LiftGroup, string> = {
  pull: 'var(--protein)',
  push: 'var(--kcal)',
  shoulder: 'var(--sugar)',
  legs: 'var(--carb)',
  abs: 'var(--fat)',
}

export function Strength({ mode }: { mode: LiftMode }) {
  const data = useData()
  const bodyKg = data.settings.weightKg
  const exById = useMemo(() => exerciseMap(data), [data])
  const trained = useMemo(
    () =>
      allExercises(data)
        .filter((ex) => ex.mode === mode)
        .filter((ex) => exerciseHistory(data, ex, undefined, bodyKg).length > 0)
        .sort((a, b) => a.name.localeCompare(b.name, 'en')),
    [data, mode, bodyKg],
  )

  if (liftDates(data, mode, exById).length === 0) {
    return (
      <section className="card">
        <h2 className="h2">Tiến bộ</h2>
        <p className="empty" style={{ padding: '16px 0 2px' }}>
          Chưa có buổi nào được log. Bấm <b>Log buổi hôm nay</b> ở trên để bắt đầu.
        </p>
      </section>
    )
  }

  return (
    <>
      <WeeklyVolume data={data} exById={exById} mode={mode} bodyKg={bodyKg} />
      {trained.length > 0 && (
        <ExerciseProgress data={data} trained={trained} bodyKg={bodyKg} />
      )}
    </>
  )
}

function WeeklyVolume({
  data,
  exById,
  mode,
  bodyKg,
}: {
  data: AppData
  exById: Map<string, Exercise>
  mode: LiftMode
  bodyKg: number
}) {
  const [weeks, setWeeks] = useState<8 | 16>(8)
  const rows = useMemo(
    () => weeklyVolume(data, weeks, exById, undefined, { mode, bodyKg }),
    [data, weeks, exById, mode, bodyKg],
  )
  const max = Math.max(...rows.map((r) => r.total), 1)
  const active = LIFT_GROUPS.filter((g) => rows.some((r) => r.byGroup[g] > 0))
  const last = rows[rows.length - 1]
  const prev = rows[rows.length - 2]

  return (
    <section className="card">
      <div className="between" style={{ marginBottom: 10 }}>
        <h2 className="h2">Volume theo tuần</h2>
        <span className="dim num">
          {volumeShort(last?.total ?? 0)} kg
          {prev && prev.total > 0 && last && (
            <>
              {'  '}
              {last.total >= prev.total ? '+' : ''}
              {n(((last.total - prev.total) / prev.total) * 100)}%
            </>
          )}
        </span>
      </div>

      <div className="vol-chart">
        {rows.map((r) => (
          <div key={r.start} className="vol-col">
            <span className="week-val">{r.total > 0 ? volumeShort(r.total) : ''}</span>
            <div className="vol-bar">
              {LIFT_GROUPS.map((g) =>
                r.byGroup[g] > 0 ? (
                  <i
                    key={g}
                    style={{
                      height: `${(r.byGroup[g] / max) * 100}%`,
                      background: GROUP_COLOR[g],
                    }}
                  />
                ) : null,
              )}
            </div>
            <span className="week-day">{shortDate(r.start)}</span>
          </div>
        ))}
      </div>

      {active.length > 0 && (
        <div className="spend-legend">
          {active.map((g) => (
            <span key={g} className="spend-tag">
              <i className="swatch" style={{ background: GROUP_COLOR[g] }} />
              {LIFT_GROUP_LABELS[g]}
            </span>
          ))}
        </div>
      )}

      <div className="seg" style={{ marginTop: 12 }}>
        <button aria-pressed={weeks === 8} onClick={() => setWeeks(8)}>
          8 tuần
        </button>
        <button aria-pressed={weeks === 16} onClick={() => setWeeks(16)}>
          16 tuần
        </button>
      </div>
    </section>
  )
}

function ExerciseProgress({
  data,
  trained,
  bodyKg,
}: {
  data: AppData
  trained: Exercise[]
  bodyKg: number
}) {
  const [id, setId] = useState('')
  // Bài đang chọn có thể bị xoá/đổi tên giữa chừng — rơi về bài đầu danh sách.
  const ex = trained.find((e) => e.id === id) ?? trained[0]
  const history = useMemo(
    () => exerciseHistory(data, ex, undefined, bodyKg),
    [data, ex, bodyKg],
  )

  if (history.length === 0) return null

  // Bài thể trọng: tải gần như cố định nên 1RM vô nghĩa — theo dõi số rep set nặng nhất.
  const body = isBodyweight(ex)
  const metric = (p: (typeof history)[number]) => (body ? p.top.reps : p.e1rm)
  const unit = body ? 'rep' : 'kg'
  const digits = body ? 0 : 1
  const title = body ? 'Rep set tốt nhất' : '1RM ước tính'

  const first = history[0]
  const last = history[history.length - 1]
  const values = history.map(metric)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const W = 300
  const H = 60
  const coords = history.map((p, i) => {
    const x = history.length === 1 ? W / 2 : (i / (history.length - 1)) * W
    const y = H - ((metric(p) - min) / span) * H
    return [x, y] as const
  })
  const path = coords
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ')
  const delta = metric(last) - metric(first)
  const shaky = !body && history.some((p) => !reliableE1rm(p.top))

  return (
    <section className="card">
      <h2 className="h2" style={{ marginBottom: 10 }}>
        Tiến bộ từng bài
      </h2>

      <select value={ex.id} onChange={(e) => setId(e.target.value)} aria-label="Chọn bài tập">
        {trained.map((e) => (
          <option key={e.id} value={e.id}>
            {LIFT_GROUP_LABELS[e.group]} — {e.name}
          </option>
        ))}
      </select>

      <div className="between" style={{ margin: '14px 0 6px' }}>
        <span className="dim">{title}</span>
        <span className="num" style={{ fontSize: 15 }}>
          <b>
            {n(metric(last), digits)} {unit}
          </b>
          {history.length > 1 && (
            <span className="dim">
              {'  '}
              {delta >= 0 ? '+' : ''}
              {n(delta, digits)} từ {shortDate(first.date)}
            </span>
          )}
        </span>
      </div>

      <svg
        className="spark"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${ex.name}: ${title.toLowerCase()} ${n(min, digits)}–${n(max, digits)} ${unit} qua ${history.length} buổi`}
      >
        <path
          d={path}
          fill="none"
          stroke={GROUP_COLOR[ex.group]}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        {coords.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill={GROUP_COLOR[ex.group]} />
        ))}
      </svg>

      <div className="list" style={{ marginTop: 8 }}>
        {[...history]
          .reverse()
          .slice(0, 6)
          .map((p) => (
            <div key={p.date} className="list-item">
              <span className="dim" style={{ width: 46, flex: 'none' }}>
                {shortDate(p.date)}
              </span>
              <span className="grow num truncate">{setLabel(ex, p.top)}</span>
              <span className="dim num">
                {p.entry.sets.length} set · {volumeShort(p.volume)} kg
              </span>
            </div>
          ))}
      </div>

      {shaky && (
        <p className="dim" style={{ margin: '10px 0 0' }}>
          Có set trên 12 rep — công thức 1RM (Epley) thổi số ở vùng rep cao, nên đọc
          đường này theo xu hướng chứ đừng bám con số tuyệt đối.
        </p>
      )}
      {body && (
        <p className="dim" style={{ margin: '10px 0 0' }}>
          Volume bài thể trọng tính theo cân nặng cơ thể ({n(bodyKg, 1)} kg) cộng phần đeo
          thêm — đổi cân nặng ở tab Profile sẽ đổi theo.
        </p>
      )}
    </section>
  )
}
