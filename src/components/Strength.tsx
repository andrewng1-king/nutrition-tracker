import { useMemo, useState } from 'react'
import { n, shortDate } from '../lib/format'
import { useData } from '../lib/hooks'
import { LIFT_GROUPS, LIFT_GROUP_LABELS, liftDates, volumeShort, weeklyVolume } from '../lib/lift'
import { exerciseMap } from '../lib/storage'
import type { AppData, Exercise, LiftGroup, LiftMode } from '../lib/types'

export const GROUP_COLOR: Record<LiftGroup, string> = {
  pull: 'var(--protein)',
  push: 'var(--kcal)',
  shoulder: 'var(--sugar)',
  legs: 'var(--carb)',
  abs: 'var(--fat)',
}

/**
 * Tiến bộ của cả chế độ. Tiến bộ từng bài nằm ở nút sparkline trong danh sách bài
 * (ProgressSheet) — không cần một ô chọn bài riêng ở đây nữa.
 */
export function Strength({ mode }: { mode: LiftMode }) {
  const data = useData()
  const bodyKg = data.settings.weightKg
  const exById = useMemo(() => exerciseMap(data), [data])

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

  return <WeeklyVolume data={data} exById={exById} mode={mode} bodyKg={bodyKg} />
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
