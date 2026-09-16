import { useMemo, useState } from 'react'
import { n, shortDate } from '../lib/format'
import { useData } from '../lib/hooks'
import { liftDates, volumeShort, weeklyVolume, type WeekVolume } from '../lib/lift'
import {
  GROUP_COLOR,
  LIFT_GROUPS,
  LIFT_GROUP_LABELS,
  LIFT_SUBS,
  allKey,
  subColor,
  subKeyLabel,
  type SubKey,
} from '../lib/muscles'
import { exerciseMap } from '../lib/storage'
import type { AppData, Exercise, LiftGroup, LiftMode } from '../lib/types'

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
          Chưa có buổi nào được log. Bấm <b>Bắt đầu buổi tập hôm nay</b> ở trên để bắt đầu.
        </p>
      </section>
    )
  }

  return <WeeklyVolume data={data} exById={exById} mode={mode} bodyKg={bodyKg} />
}

interface Segment {
  key: string
  label: string
  color: string
  value: (w: WeekVolume) => number
}

/** Các khúc của một cột: tất cả nhóm cơ, hoặc các nhóm phụ của nhóm đang mở. */
function segmentsFor(focus: LiftGroup | null): Segment[] {
  if (!focus) {
    return LIFT_GROUPS.map((g) => ({
      key: g,
      label: LIFT_GROUP_LABELS[g],
      color: GROUP_COLOR[g],
      value: (w) => w.byGroup[g],
    }))
  }
  const keys: SubKey[] = [...LIFT_SUBS[focus], allKey(focus)]
  return keys.map((key) => ({
    key,
    label: subKeyLabel(key),
    color: subColor(focus, key),
    value: (w) => w.bySub[key] ?? 0,
  }))
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
  // Bấm một nhóm ở chú thích để tách cột theo nhóm phụ của nhóm đó.
  const [focus, setFocus] = useState<LiftGroup | null>(null)
  const rows = useMemo(
    () => weeklyVolume(data, weeks, exById, undefined, { mode, bodyKg }),
    [data, weeks, exById, mode, bodyKg],
  )
  const segments = segmentsFor(focus)
  const totalOf = (w: WeekVolume) => (focus ? w.byGroup[focus] : w.total)
  const max = Math.max(...rows.map(totalOf), 1)
  const active = segments.filter((s) => rows.some((r) => s.value(r) > 0))
  const groups = LIFT_GROUPS.filter((g) => rows.some((r) => r.byGroup[g] > 0))
  const last = rows[rows.length - 1]
  const prev = rows[rows.length - 2]
  const lastTotal = last ? totalOf(last) : 0
  const prevTotal = prev ? totalOf(prev) : 0

  return (
    <section className="card">
      <div className="between" style={{ marginBottom: 10 }}>
        <h2 className="h2">
          Volume theo tuần{focus ? ` · ${LIFT_GROUP_LABELS[focus]}` : ''}
        </h2>
        <span className="dim num">
          {volumeShort(lastTotal)} kg
          {prevTotal > 0 && (
            <>
              {'  '}
              {lastTotal >= prevTotal ? '+' : ''}
              {n(((lastTotal - prevTotal) / prevTotal) * 100)}%
            </>
          )}
        </span>
      </div>

      <div className="vol-chart">
        {rows.map((r) => (
          <div key={r.start} className="vol-col">
            <span className="week-val">{totalOf(r) > 0 ? volumeShort(totalOf(r)) : ''}</span>
            <div className="vol-bar">
              {segments.map((s) =>
                s.value(r) > 0 ? (
                  <i
                    key={s.key}
                    style={{ height: `${(s.value(r) / max) * 100}%`, background: s.color }}
                  />
                ) : null,
              )}
            </div>
            <span className="week-day">{shortDate(r.start)}</span>
          </div>
        ))}
      </div>

      {focus ? (
        <div className="spend-legend">
          <button className="spend-tag" onClick={() => setFocus(null)}>
            ‹ Tất cả nhóm
          </button>
          {active.map((s) => (
            <span key={s.key} className="spend-tag">
              <i className="swatch" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      ) : (
        groups.length > 0 && (
          <div className="spend-legend">
            {groups.map((g) => (
              <button
                key={g}
                className="spend-tag"
                onClick={() => setFocus(g)}
                aria-label={`Xem ${LIFT_GROUP_LABELS[g]} theo nhóm phụ`}
              >
                <i className="swatch" style={{ background: GROUP_COLOR[g] }} />
                {LIFT_GROUP_LABELS[g]}
              </button>
            ))}
          </div>
        )
      )}
      {!focus && groups.length > 0 && (
        <p className="dim" style={{ margin: '8px 0 0' }}>
          Bấm một nhóm để xem volume chia theo từng phần cơ.
        </p>
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
