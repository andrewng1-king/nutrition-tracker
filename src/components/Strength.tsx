import { Fragment, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { n } from '../lib/format'
import { useData, usePref } from '../lib/hooks'
import { liftDates, volumeShort } from '../lib/lift'
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
import type { LiftGroup, LiftMode } from '../lib/types'
import {
  pctChange,
  periodTotals,
  volumeBuckets,
  type VolBucket,
  type VolPeriod,
  type VolumeAcc,
} from '../lib/volume'
import { Delta } from './Delta'
import { IconChartBar, IconChartCompare, IconChartLine } from './icons'

/**
 * Tiến bộ của cả chế độ. Tiến bộ từng bài nằm ở con số % trong danh sách bài
 * (ProgressSheet) — không cần một ô chọn bài riêng ở đây nữa.
 */
export function Strength({ mode }: { mode: LiftMode }) {
  const data = useData()
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

  return <VolumeCard mode={mode} />
}

type ChartKind = 'bar' | 'line' | 'compare'
type View = 'total' | 'group'

const CHARTS: [ChartKind, string, typeof IconChartBar][] = [
  ['bar', 'Biểu đồ cột', IconChartBar],
  ['line', 'Biểu đồ đường', IconChartLine],
  ['compare', 'So với kỳ trước', IconChartCompare],
]

const PERIODS: [VolPeriod, string][] = [
  ['week', 'Tuần này'],
  ['month', 'Tháng này'],
  ['all', 'All time'],
]

const PREV_LABEL: Record<VolPeriod, string> = {
  week: 'tuần trước',
  month: 'tháng trước',
  all: '',
}

const EMPTY: Record<VolPeriod, string> = {
  week: 'Tuần này và tuần trước chưa có buổi nào.',
  month: 'Tháng này chưa có buổi nào.',
  all: 'Chưa có buổi nào.',
}

interface Series {
  key: string
  label: string
  color: string
  value: (a: VolumeAcc) => number
  /** chuỗi của một nhóm cơ chính — bấm vào để xem riêng nhóm đó */
  group?: LiftGroup
}

/** Tổng quan = một chuỗi lime; nhóm cơ = mỗi nhóm một màu; đang mở một nhóm = các phần của nó. */
function seriesFor(view: View, focus: LiftGroup | null): Series[] {
  if (view === 'total') {
    return [{ key: 'total', label: 'Tổng', color: 'var(--lime-2)', value: (a) => a.total }]
  }
  if (!focus) {
    return LIFT_GROUPS.map((g) => ({
      key: g,
      label: LIFT_GROUP_LABELS[g],
      color: GROUP_COLOR[g],
      value: (a) => a.byGroup[g],
      group: g,
    }))
  }
  const keys: SubKey[] = [...LIFT_SUBS[focus], allKey(focus)]
  return keys.map((key) => ({
    key,
    label: subKeyLabel(key),
    color: subColor(focus, key),
    value: (a) => a.bySub[key] ?? 0,
  }))
}

function VolumeCard({ mode }: { mode: LiftMode }) {
  const data = useData()
  const exById = useMemo(() => exerciseMap(data), [data])
  const bodyKg = data.settings.weightKg
  const [chart, setChart] = usePref<ChartKind>('vol-chart', 'bar', ['bar', 'line', 'compare'])
  const [period, setPeriod] = usePref<VolPeriod>('vol-period', 'week', ['week', 'month', 'all'])
  const [view, setView] = usePref<View>('vol-view', 'total', ['total', 'group'])
  // Bấm một nhóm (ở chú thích hoặc dòng so sánh) để xem riêng nhóm đó theo từng phần.
  const [focus, setFocus] = useState<LiftGroup | null>(null)

  const buckets = useMemo(
    () => volumeBuckets(data, period, exById, { mode, bodyKg }),
    [data, period, exById, mode, bodyKg],
  )
  const totals = useMemo(
    () => periodTotals(data, period, exById, { mode, bodyKg }),
    [data, period, exById, mode, bodyKg],
  )

  const activeFocus = view === 'group' ? focus : null
  const series = seriesFor(view, activeFocus)
  const totalOf = (a: VolumeAcc) => (activeFocus ? a.byGroup[activeFocus] : a.total)
  const current = totalOf(totals.current)
  const previous = totals.previous ? totalOf(totals.previous) : null
  const shown = series
    .filter((s) => s.value(totals.current) > 0 || buckets.some((b) => s.value(b) > 0))
    .sort((a, b) => b.value(totals.current) - a.value(totals.current))
  const empty =
    chart === 'compare'
      ? current === 0 && !previous
      : buckets.every((b) => totalOf(b) === 0)

  return (
    <section className="card vol-card">
      <div className="between">
        <h2 className="h2">
          Volume{activeFocus ? ` · ${LIFT_GROUP_LABELS[activeFocus]}` : ''}
        </h2>
        <div className="chart-switch" role="group" aria-label="Kiểu biểu đồ">
          {CHARTS.map(([kind, label, Icon]) => (
            <button
              key={kind}
              aria-label={label}
              aria-pressed={chart === kind}
              onClick={() => setChart(kind)}
            >
              <Icon className="ico" />
            </button>
          ))}
        </div>
      </div>

      <div className="seg sm">
        {PERIODS.map(([p, label]) => (
          <button key={p} aria-pressed={period === p} onClick={() => setPeriod(p)}>
            {label}
          </button>
        ))}
      </div>

      <div className="vol-head">
        <span className="vol-total num">
          {volumeShort(current)}
          <small> kg</small>
        </span>
        {period === 'all' ? (
          <span className="dim num">{n(totals.current.sessions)} buổi</span>
        ) : previous ? (
          <Delta pct={pctChange(current, previous)} suffix={`so ${PREV_LABEL[period]}`} />
        ) : (
          <span className="dim">{PREV_LABEL[period]} chưa có để so</span>
        )}
      </div>

      {empty ? (
        <p className="empty" style={{ padding: '18px 0 8px' }}>
          {EMPTY[period]}
        </p>
      ) : chart === 'bar' ? (
        <Bars buckets={buckets} series={series} totalOf={totalOf} />
      ) : chart === 'line' ? (
        <Lines buckets={buckets} series={shown} />
      ) : (
        <Compare
          series={series}
          current={totals.current}
          previous={totals.previous}
          period={period}
          onPick={view === 'group' && !activeFocus ? setFocus : undefined}
        />
      )}

      {!empty && chart !== 'compare' && period === 'week' && buckets.some((b) => b.ghost) && (
        <p className="dim vol-note">Cột mờ là các buổi tuần trước.</p>
      )}

      {view === 'group' && (activeFocus || chart !== 'compare') && (
        <div className="spend-legend">
          {activeFocus && (
            <button className="spend-tag" onClick={() => setFocus(null)}>
              ‹ Tất cả nhóm
            </button>
          )}
          {chart !== 'compare' &&
            shown.map((s) => {
              const share = current > 0 ? (s.value(totals.current) / current) * 100 : 0
              const body = (
                <>
                  <i className="swatch" style={{ background: s.color }} />
                  {s.label}
                  <b className="num">{n(share)}%</b>
                </>
              )
              return s.group ? (
                <button
                  key={s.key}
                  className="spend-tag"
                  onClick={() => setFocus(s.group!)}
                  aria-label={`Xem riêng ${s.label}, chiếm ${n(share)}% volume`}
                >
                  {body}
                </button>
              ) : (
                <span key={s.key} className="spend-tag">
                  {body}
                </span>
              )
            })}
        </div>
      )}

      <div className="seg sm">
        <button aria-pressed={view === 'total'} onClick={() => setView('total')}>
          Tổng quan
        </button>
        <button aria-pressed={view === 'group'} onClick={() => setView('group')}>
          Nhóm cơ
        </button>
      </div>
    </section>
  )
}

/** Cột chồng: mỗi cột một buổi / tuần / tháng, cao nhất = kỳ nặng nhất. */
function Bars({
  buckets,
  series,
  totalOf,
}: {
  buckets: VolBucket[]
  series: Series[]
  totalOf: (a: VolumeAcc) => number
}) {
  const max = Math.max(...buckets.map(totalOf), 1)
  const firstCurrent = buckets.findIndex((b) => !b.ghost)
  // Nhiều cột hơn bề ngang thì biểu đồ cuộn ngang — mở ra phải thấy kỳ mới nhất.
  const scroller = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [buckets])
  return (
    <div className="vol-chart" ref={scroller}>
      {buckets.map((b, i) => (
        <Fragment key={b.key}>
          {i === firstCurrent && i > 0 && <span className="vol-split" aria-hidden="true" />}
          <div className="vol-col" data-ghost={b.ghost || undefined}>
            <span className="week-val">{totalOf(b) > 0 ? volumeShort(totalOf(b)) : ''}</span>
            <div className="vol-bar">
              {series.map((s) =>
                s.value(b) > 0 ? (
                  <i
                    key={s.key}
                    style={{ height: `${(s.value(b) / max) * 100}%`, background: s.color }}
                  />
                ) : null,
              )}
            </div>
            <span className="week-day">{b.label}</span>
          </div>
        </Fragment>
      ))}
    </div>
  )
}

const LW = 320
const LH = 120

/**
 * Đường xu hướng, mỗi chuỗi một đường. Phần tuần trước vẽ nét đứt, mờ. SVG giữ
 * đúng tỉ lệ (không kéo giãn) nên điểm nằm giữa đúng cột nhãn bên dưới.
 */
function Lines({ buckets, series }: { buckets: VolBucket[]; series: Series[] }) {
  const count = buckets.length
  const max = Math.max(...series.flatMap((s) => buckets.map((b) => s.value(b))), 1)
  const x = (i: number) => (i + 0.5) * (LW / count)
  const y = (v: number) => 8 + (1 - v / max) * (LH - 16)
  const firstCurrent = buckets.findIndex((b) => !b.ghost)
  const split = firstCurrent < 0 ? count - 1 : firstCurrent

  return (
    <div className="vol-lines">
      <svg viewBox={`0 0 ${LW} ${LH}`} role="img" aria-label="Biểu đồ đường volume">
        <line x1="0" y1={LH - 0.5} x2={LW} y2={LH - 0.5} stroke="var(--line)" />
        {series.map((s) => {
          const pts = buckets.map((b, i) => `${x(i).toFixed(1)},${y(s.value(b)).toFixed(1)}`)
          return (
            <g key={s.key} stroke={s.color} fill={s.color}>
              {split > 0 && (
                <polyline
                  points={pts.slice(0, split + 1).join(' ')}
                  fill="none"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  opacity="0.4"
                />
              )}
              {firstCurrent >= 0 && (
                <polyline
                  points={pts.slice(firstCurrent).join(' ')}
                  fill="none"
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
              {buckets.map((b, i) => (
                <circle
                  key={b.key}
                  cx={x(i)}
                  cy={y(s.value(b))}
                  r={i === count - 1 ? 3.6 : 2.6}
                  stroke="none"
                  opacity={b.ghost ? 0.4 : 1}
                />
              ))}
            </g>
          )
        })}
      </svg>
      <div className="vol-xlabels">
        {buckets.map((b) => (
          <span key={b.key} data-ghost={b.ghost || undefined}>
            {b.label}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Mỗi nhóm một dòng: thanh đậm là kỳ này, thanh mờ là kỳ trước tới cùng thời
 * điểm. All time không có kỳ trước — thay bằng % nhóm đó chiếm trong tổng.
 */
function Compare({
  series,
  current,
  previous,
  period,
  onPick,
}: {
  series: Series[]
  current: VolumeAcc
  previous: VolumeAcc | null
  period: VolPeriod
  onPick?: (g: LiftGroup) => void
}) {
  const rows = series
    .map((s) => ({ s, cur: s.value(current), prev: previous ? s.value(previous) : null }))
    .filter((r) => r.cur > 0 || (r.prev ?? 0) > 0)
    .sort((a, b) => b.cur - a.cur || (b.prev ?? 0) - (a.prev ?? 0))
  const max = Math.max(...rows.flatMap((r) => [r.cur, r.prev ?? 0]), 1)
  const sum = rows.reduce((t, r) => t + r.cur, 0)

  return (
    <div className="cmp-chart">
      {rows.map(({ s, cur, prev }) => {
        const inner = (
          <>
            <span className="cmp-label">
              <i className="swatch" style={{ background: s.color }} />
              <span className="truncate">{s.label}</span>
            </span>
            <span className="cmp-bars">
              <i style={{ width: `${(cur / max) * 100}%`, background: s.color }} />
              {prev !== null && (
                <i className="prev" style={{ width: `${(prev / max) * 100}%`, background: s.color }} />
              )}
            </span>
            <span className="cmp-val">
              <span className="num">{volumeShort(cur)}</span>
              {prev !== null ? (
                <Delta pct={pctChange(cur, prev)} />
              ) : (
                <span className="dim num">{n(sum > 0 ? (cur / sum) * 100 : 0)}%</span>
              )}
            </span>
          </>
        )
        return onPick && s.group ? (
          <button key={s.key} className="cmp-row" onClick={() => onPick(s.group!)}>
            {inner}
          </button>
        ) : (
          <div key={s.key} className="cmp-row">
            {inner}
          </div>
        )
      })}
      {previous && (
        <p className="dim vol-note">Thanh mờ là {PREV_LABEL[period]}, tính tới cùng thời điểm.</p>
      )}
    </div>
  )
}
