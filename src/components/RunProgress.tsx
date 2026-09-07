import { useMemo, useState } from 'react'
import { n, shortDate } from '../lib/format'
import { useData } from '../lib/hooks'
import { formatDuration, formatPace, paceSecPerKm } from '../lib/run'
import type { AppData, RunLog } from '../lib/types'

interface RunPoint {
  date: string
  run: RunLog
  paceSec: number
}

function runPoints(data: AppData): RunPoint[] {
  return Object.keys(data.days)
    .sort()
    .flatMap((date) => {
      const run = data.days[date]?.run
      if (!run || run.distanceKm <= 0) return []
      return [{ date, run, paceSec: paceSecPerKm(run) }]
    })
}

export function RunProgress({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const data = useData()
  const points = useMemo(() => runPoints(data), [data])
  const [metric, setMetric] = useState<'pace' | 'distance'>('pace')

  if (points.length === 0) {
    return (
      <section className="card">
        <h2 className="h2">Chạy bộ</h2>
        <p className="empty" style={{ padding: '16px 0 2px' }}>
          Chưa log buổi chạy nào. Vào tab <b>Hôm nay</b>, bật <b>Chạy bộ</b> trên thanh loại
          ngày rồi nhập số liệu — gõ tay hoặc nạp file GPX xuất từ Strava.
        </p>
      </section>
    )
  }

  const totalKm = points.reduce((sum, p) => sum + p.run.distanceKm, 0)
  const totalKcal = points.reduce((sum, p) => sum + (p.run.burnKcal ?? 0), 0)
  // Pace chỉ có nghĩa khi buổi chạy có bấm giờ — buổi nhập tay thiếu giờ bị loại.
  const timed = points.filter((p) => p.paceSec > 0)
  const bestPace = timed.length > 0 ? Math.min(...timed.map((p) => p.paceSec)) : 0
  const longest = Math.max(...points.map((p) => p.run.distanceKm))

  return (
    <>
      <section className="card">
        <h2 className="h2" style={{ marginBottom: 12 }}>
          Tổng cộng · {points.length} buổi
        </h2>
        <div className="grid4" style={{ textAlign: 'center' }}>
          <Stat label="km" value={n(totalKm, 1)} />
          <Stat label="dài nhất" value={n(longest, 1)} />
          <Stat label="pace tốt nhất" value={bestPace > 0 ? formatPace(bestPace) : '—'} />
          <Stat label="kcal đốt" value={n(totalKcal)} />
        </div>
      </section>

      <Trend points={points} metric={metric} onMetric={setMetric} />

      <section className="card">
        <h2 className="h2" style={{ marginBottom: 6 }}>
          Từng buổi
        </h2>
        <div className="list">
          {[...points].reverse().map((p) => (
            <button key={p.date} className="list-item" onClick={() => onOpenDay(p.date)}>
              <span className="dim" style={{ width: 46, flex: 'none' }}>
                {shortDate(p.date)}
              </span>
              <span className="grow num">
                <b>{n(p.run.distanceKm, 2)} km</b>
                <span className="dim">
                  {'  '}
                  {p.paceSec > 0 ? `${formatPace(p.paceSec)}/km` : 'chưa có giờ'}
                  {p.run.durationSec > 0 ? ` · ${formatDuration(p.run.durationSec)}` : ''}
                </span>
              </span>
              <span className="entry-kcal">{n(p.run.burnKcal ?? 0)}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  )
}

function Trend({
  points,
  metric,
  onMetric,
}: {
  points: RunPoint[]
  metric: 'pace' | 'distance'
  onMetric: (m: 'pace' | 'distance') => void
}) {
  const series =
    metric === 'pace' ? points.filter((p) => p.paceSec > 0) : points
  const value = (p: RunPoint) => (metric === 'pace' ? p.paceSec : p.run.distanceKm)

  const body = () => {
    if (series.length < 2) {
      return (
        <p className="empty" style={{ padding: '14px 0 2px' }}>
          Cần ít nhất 2 buổi {metric === 'pace' ? 'có bấm giờ ' : ''}để vẽ xu hướng.
        </p>
      )
    }

    const values = series.map(value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = max - min || 1
    const W = 300
    const H = 60
    // Pace thấp = nhanh, nên lật trục để đường đi lên luôn nghĩa là tiến bộ.
    const norm = (v: number) => (metric === 'pace' ? (max - v) / span : (v - min) / span)
    const coords = series.map((p, i) => {
      const x = (i / (series.length - 1)) * W
      return [x, H - norm(value(p)) * H] as const
    })
    const path = coords
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
      .join(' ')
    const fmt = (v: number) => (metric === 'pace' ? `${formatPace(v)}/km` : `${n(v, 2)} km`)
    const first = series[0]
    const lastPoint = series[series.length - 1]

    return (
      <>
        <div className="between" style={{ margin: '4px 0 6px' }}>
          <span className="dim">{shortDate(first.date)}</span>
          <span className="num" style={{ fontSize: 15 }}>
            <b>{fmt(value(lastPoint))}</b>
          </span>
        </div>
        <svg
          className="spark"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`${metric === 'pace' ? 'Pace' : 'Quãng đường'}: ${fmt(min)}–${fmt(max)} qua ${series.length} buổi. Đường đi lên là tiến bộ.`}
        >
          <path
            d={path}
            fill="none"
            stroke="var(--protein)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          {coords.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.5" fill="var(--protein)" />
          ))}
        </svg>
        <p className="dim" style={{ margin: '4px 0 0' }}>
          {fmt(min)} – {fmt(max)} · đường đi lên = tiến bộ
        </p>
      </>
    )
  }

  return (
    <section className="card">
      <div className="seg" style={{ marginBottom: 12 }}>
        <button aria-pressed={metric === 'pace'} onClick={() => onMetric('pace')}>
          Pace
        </button>
        <button aria-pressed={metric === 'distance'} onClick={() => onMetric('distance')}>
          Quãng đường
        </button>
      </div>
      {body()}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="num" style={{ fontSize: 18, fontWeight: 700 }}>
        {value}
      </div>
      <div className="dim">{label}</div>
    </div>
  )
}
