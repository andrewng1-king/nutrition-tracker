import { useMemo, useState } from 'react'
import { n, shortDate, weekday, shiftDate } from '../lib/format'
import { useData } from '../lib/hooks'
import {
  exerciseHistory,
  isBodyweight,
  kgLabel,
  reliableE1rm,
  setLabel,
  shortSet,
  volumeShort,
  type LiftPoint,
} from '../lib/lift'
import { dateKey, parseDateKey } from '../lib/macros'
import type { Exercise } from '../lib/types'
import { Sheet } from './Sheet'
import { GROUP_COLOR } from './Strength'

type MetricKey = 'e1rm' | 'top' | 'volume' | 'reps'

interface Metric {
  key: MetricKey
  chip: string
  title: string
  value: (p: LiftPoint) => number
  format: (v: number) => string
  axis: (v: number) => string
  digits: number
}

/**
 * Bài có tạ: 1RM ước tính là chỉ số chính — so được set 8 rep với set 12 rep.
 * Bài thể trọng: tải gần như cố định nên 1RM vô nghĩa, theo dõi rep set tốt nhất.
 */
function metricsFor(ex: Exercise): Metric[] {
  const volume: Metric = {
    key: 'volume',
    chip: 'Volume',
    title: 'Volume buổi',
    value: (p) => p.volume,
    format: (v) => `${volumeShort(v)} kg`,
    axis: volumeShort,
    digits: 0,
  }
  if (isBodyweight(ex)) {
    return [
      {
        key: 'reps',
        chip: 'Rep',
        title: 'Rep set tốt nhất',
        value: (p) => p.top.reps,
        format: (v) => `${n(v)} rep`,
        axis: (v) => n(v),
        digits: 0,
      },
      volume,
    ]
  }
  return [
    {
      key: 'e1rm',
      chip: '1RM',
      title: '1RM ước tính',
      value: (p) => p.e1rm,
      format: (v) => `${n(v, 1)} kg`,
      axis: (v) => n(v),
      digits: 1,
    },
    {
      key: 'top',
      chip: 'Top set',
      title: 'Mức tạ top set',
      value: (p) => p.top.kg,
      format: (v) => kgLabel(ex, v),
      axis: (v) => n(v, 1),
      digits: 2,
    },
    volume,
  ]
}

type RangeKey = '1m' | '3m' | '6m' | 'all'

const RANGES: [RangeKey, string, number][] = [
  ['1m', '1T', 30],
  ['3m', '3T', 91],
  ['6m', '6T', 182],
  ['all', 'Tất cả', Infinity],
]

const cutoffFor = (days: number) =>
  Number.isFinite(days) ? shiftDate(dateKey(), -days) : ''

export function ProgressSheet({ ex, onClose }: { ex: Exercise; onClose: () => void }) {
  const data = useData()
  const bodyKg = data.settings.weightKg
  const history = useMemo(
    () => exerciseHistory(data, ex, undefined, bodyKg),
    [data, ex, bodyKg],
  )
  const metrics = metricsFor(ex)
  const [metricKey, setMetricKey] = useState<MetricKey>(metrics[0].key)
  const metric = metrics.find((m) => m.key === metricKey) ?? metrics[0]

  // Mặc định 3 tháng; ít hơn 2 buổi trong 3 tháng thì mở hết, không vẽ một chấm lẻ.
  const [range, setRange] = useState<RangeKey>(() =>
    history.filter((p) => p.date >= cutoffFor(91)).length >= 2 ? '3m' : 'all',
  )
  const cutoff = cutoffFor(RANGES.find(([k]) => k === range)![2])

  // Kỷ lục tính trên cả lịch sử, không chỉ trong khung đang xem — đổi khung không
  // được biến một buổi bình thường thành "kỷ lục".
  const prFlags = useMemo(() => {
    let best = -Infinity
    return history.map((p, i) => {
      const v = metric.value(p)
      const isPr = i > 0 && v > best + 1e-9
      best = Math.max(best, v)
      return isPr
    })
  }, [history, metric])

  const shown = history
    .map((p, i) => ({ p, pr: prFlags[i] }))
    .filter(({ p }) => p.date >= cutoff)

  const [picked, setPicked] = useState<string | null>(null)
  const selected = shown.find(({ p }) => p.date === picked) ?? shown[shown.length - 1]

  if (history.length === 0) {
    return (
      <Sheet title={ex.name} onClose={onClose}>
        <p className="empty">Chưa tập bài này lần nào.</p>
      </Sheet>
    )
  }

  const values = shown.map(({ p }) => metric.value(p))
  const first = values[0]
  const latest = values[values.length - 1]
  const delta = latest - first
  const shaky = metric.key === 'e1rm' && shown.some(({ p }) => !reliableE1rm(p.top))
  const color = GROUP_COLOR[ex.group]

  return (
    <Sheet title={ex.name} onClose={onClose}>
      <div className="seg ghost">
        {metrics.map((m) => (
          <button key={m.key} aria-pressed={m.key === metric.key} onClick={() => setMetricKey(m.key)}>
            {m.chip}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="empty">Không có buổi nào trong khoảng này.</p>
      ) : (
        <>
          <div>
            <span className="dim">{metric.title}</span>
            <div className="row" style={{ alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span className="num progress-value">{metric.format(latest)}</span>
              {shown.length > 1 && (
                <span
                  className="num"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: delta > 0 ? 'var(--ok)' : delta < 0 ? 'var(--level-2)' : 'var(--dim)',
                  }}
                >
                  {delta >= 0 ? '+' : '−'}
                  {metric.key === 'volume'
                    ? volumeShort(Math.abs(delta))
                    : n(Math.abs(delta), metric.digits)}{' '}
                  từ {shortDate(shown[0].p.date)}
                </span>
              )}
            </div>
          </div>

          <Chart
            dates={shown.map(({ p }) => p.date)}
            values={values}
            pr={shown.map(({ pr }) => pr)}
            selected={shown.indexOf(selected)}
            onSelect={(i) => setPicked(shown[i].p.date)}
            color={color}
            axis={metric.axis}
            label={`${ex.name}: ${metric.title.toLowerCase()} qua ${shown.length} buổi`}
          />

          <div className="row" style={{ gap: 14, flexWrap: 'wrap' }}>
            <span className="dim row" style={{ gap: 6 }}>
              <i className="swatch" style={{ background: color }} /> mỗi buổi
            </span>
            <span className="dim row" style={{ gap: 6 }}>
              <i className="swatch pr-swatch" /> kỷ lục mới
            </span>
          </div>
        </>
      )}

      <div className="seg">
        {RANGES.map(([key, label]) => (
          <button key={key} aria-pressed={range === key} onClick={() => setRange(key)}>
            {label}
          </button>
        ))}
      </div>

      {selected && (
        <div className="card ink col">
          <div className="between">
            <span className="h2">
              {weekday(selected.p.date)} {shortDate(selected.p.date)}
            </span>
            {selected.pr && <span className="badge good">kỷ lục mới</span>}
          </div>
          <span className="num progress-value">{metric.format(metric.value(selected.p))}</span>
          <span className="dim num">
            {selected.p.entry.sets.map((s) => shortSet(s)).join('  ·  ')}
          </span>
          <div className="grid3" style={{ textAlign: 'center' }}>
            <MiniStat label="set" value={n(selected.p.entry.sets.length)} />
            <MiniStat label="volume" value={`${volumeShort(selected.p.volume)}`} />
            <MiniStat
              label={isBodyweight(ex) ? 'top set' : '1RM'}
              value={isBodyweight(ex) ? setLabel(ex, selected.p.top) : n(selected.p.e1rm, 1)}
            />
          </div>
        </div>
      )}

      <div className="list">
        {[...shown].reverse().map(({ p, pr }) => (
          <button
            key={p.date}
            className="list-item"
            aria-pressed={p.date === selected?.p.date}
            onClick={() => setPicked(p.date)}
          >
            <span className="dim" style={{ width: 62, flex: 'none' }}>
              {weekday(p.date)} {shortDate(p.date)}
            </span>
            <span className="grow num truncate">
              {setLabel(ex, p.top)}
              {pr && <span className="pr-dot" aria-label="kỷ lục" />}
            </span>
            <span className="dim num">
              {p.entry.sets.length} set · {volumeShort(p.volume)} kg
            </span>
          </button>
        ))}
      </div>

      {shaky && (
        <p className="dim" style={{ margin: 0 }}>
          Có set trên 12 rep — công thức 1RM (Epley) thổi số ở vùng rep cao, nên đọc đường
          này theo xu hướng chứ đừng bám con số tuyệt đối.
        </p>
      )}
      {isBodyweight(ex) && metric.key === 'volume' && (
        <p className="dim" style={{ margin: 0 }}>
          Volume bài thể trọng tính theo cân nặng cơ thể ({n(bodyKg, 1)} kg) cộng phần đeo
          thêm — đổi cân nặng ở tab Profile sẽ đổi theo.
        </p>
      )}
    </Sheet>
  )
}

const W = 320
const H = 176
const PAD = { l: 36, r: 12, t: 14, b: 24 }

/**
 * Đường theo thời gian thật (không chia đều theo buổi): nghỉ hai tuần thì thấy
 * khoảng trống hai tuần. Chạm hoặc kéo ngang trên biểu đồ để chọn buổi gần nhất.
 */
function Chart({
  dates,
  values,
  pr,
  selected,
  onSelect,
  color,
  axis,
  label,
}: {
  dates: string[]
  values: number[]
  pr: boolean[]
  selected: number
  onSelect: (i: number) => void
  color: string
  axis: (v: number) => string
  label: string
}) {
  const times = dates.map((d) => parseDateKey(d).getTime())
  const t0 = times[0]
  const t1 = times[times.length - 1]
  const x = (i: number) =>
    t1 === t0
      ? PAD.l + (W - PAD.l - PAD.r) / 2
      : PAD.l + ((times[i] - t0) / (t1 - t0)) * (W - PAD.l - PAD.r)

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min
  const pad = span > 0 ? span * 0.14 : Math.max(1, Math.abs(max) * 0.06)
  const lo = Math.max(0, min - pad)
  const hi = max + pad
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b)

  const ticks = span > 0 ? [min, (min + max) / 2, max] : [max]
  const path = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(' ')

  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    let best = 0
    for (let i = 1; i < values.length; i++) {
      if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i
    }
    onSelect(best)
  }

  return (
    <svg
      className="progress-chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={label}
      onPointerDown={pick}
      onPointerMove={(e) => {
        if (e.buttons > 0) pick(e)
      }}
    >
      {ticks.map((t, i) => (
        <g key={i}>
          <line className="grid" x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
          <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end">
            {axis(t)}
          </text>
        </g>
      ))}

      {selected >= 0 && (
        <line
          className="guide"
          x1={x(selected)}
          x2={x(selected)}
          y1={PAD.t - 4}
          y2={H - PAD.b}
        />
      )}

      {values.length > 1 && (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {values.map((v, i) => (
        <g key={dates[i]}>
          {pr[i] && <circle className="pr-ring" cx={x(i)} cy={y(v)} r="6.5" />}
          <circle
            cx={x(i)}
            cy={y(v)}
            r={i === selected ? 5 : 3.2}
            fill={color}
            className={i === selected ? 'dot-selected' : undefined}
          />
        </g>
      ))}

      <text x={PAD.l} y={H - 6} textAnchor="start">
        {shortDate(dates[0])}
      </text>
      {dates.length > 1 && (
        <text x={W - PAD.r} y={H - 6} textAnchor="end">
          {shortDate(dates[dates.length - 1])}
        </text>
      )}
    </svg>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="num" style={{ fontSize: 16, fontWeight: 700 }}>
        {value}
      </div>
      <div className="dim">{label}</div>
    </div>
  )
}
