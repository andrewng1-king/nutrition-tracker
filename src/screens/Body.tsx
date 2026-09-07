import { useMemo, useState } from 'react'
import { dayLabel, lastNDays, n, shortDate } from '../lib/format'
import { useData } from '../lib/hooks'
import { dateKey } from '../lib/macros'
import { getDay, setDayField, setSettings } from '../lib/storage'
import type { AppData } from '../lib/types'

interface Point {
  date: string
  value: number
}

function series(data: AppData, field: 'weightKg' | 'waistCm', days: number): Point[] {
  return lastNDays(days)
    .map((date) => ({ date, value: getDay(date, data)[field] }))
    .filter((p): p is Point => typeof p.value === 'number')
}

export function Body() {
  const data = useData()
  const today = dateKey()
  const day = getDay(today, data)

  const [weight, setWeight] = useState(day.weightKg?.toString() ?? '')
  const [waist, setWaist] = useState(day.waistCm?.toString() ?? '')
  const [range, setRange] = useState<30 | 90>(30)

  const weights = useMemo(() => series(data, 'weightKg', range), [data, range])
  const waists = useMemo(() => series(data, 'waistCm', range), [data, range])

  const save = () => {
    const w = weight.trim() === '' ? undefined : Number(weight)
    const c = waist.trim() === '' ? undefined : Number(waist)
    setDayField(today, { weightKg: w, waistCm: c })
    // Target protein bám theo cân nặng (~2.3 g/kg) — cập nhật luôn khi cân.
    if (typeof w === 'number' && w > 0) setSettings({ weightKg: w })
  }

  const dirty =
    weight !== (day.weightKg?.toString() ?? '') || waist !== (day.waistCm?.toString() ?? '')

  return (
    <div className="screen">
      <h1 className="h1">Cơ thể</h1>

      <div className="card">
        <h2 className="h2" style={{ marginBottom: 10 }}>
          Số đo {dayLabel(today).toLowerCase()}
        </h2>
        <div className="grid2">
          <div className="field">
            <label htmlFor="b-weight">Cân nặng (kg)</label>
            <input
              id="b-weight"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="b-waist">Vòng eo (cm)</label>
            <input
              id="b-waist"
              type="number"
              inputMode="decimal"
              step="0.5"
              value={waist}
              onChange={(e) => setWaist(e.target.value)}
            />
          </div>
        </div>
        <button
          className="btn primary full"
          style={{ marginTop: 10 }}
          disabled={!dirty}
          onClick={save}
        >
          Lưu số đo
        </button>
      </div>

      <div className="seg">
        <button aria-pressed={range === 30} onClick={() => setRange(30)}>
          30 ngày
        </button>
        <button aria-pressed={range === 90} onClick={() => setRange(90)}>
          90 ngày
        </button>
      </div>

      <Trend title="Vòng eo" unit="cm" points={waists} color="var(--protein)" digits={1} />
      <Trend title="Cân nặng" unit="kg" points={weights} color="var(--carb)" digits={1} />

      <div className="card">
        <p className="muted" style={{ margin: 0 }}>
          Recomp là quá trình chậm — với body type skinny fat thường 6-12 tháng mới thấy
          rõ. Cân nặng gần như đứng yên là bình thường và không phải dấu hiệu xấu. Đo tiến
          bộ bằng <b>vòng eo</b>, ảnh chụp và mức tạ nâng được (tab <b>Bài tập</b>), đừng
          đo bằng cân.
        </p>
      </div>
    </div>
  )
}

function Trend({
  title,
  unit,
  points,
  color,
  digits,
}: {
  title: string
  unit: string
  points: Point[]
  color: string
  digits: number
}) {
  if (points.length === 0) {
    return (
      <section className="card">
        <h2 className="h2">{title}</h2>
        <p className="empty" style={{ padding: '12px 0 2px' }}>
          Chưa có số đo nào.
        </p>
      </section>
    )
  }

  const first = points[0]
  const last = points[points.length - 1]
  const delta = last.value - first.value
  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const W = 300
  const H = 60

  const coords = points.map((p, i) => {
    const x = points.length === 1 ? W / 2 : (i / (points.length - 1)) * W
    const y = H - ((p.value - min) / span) * H
    return [x, y] as const
  })
  const path = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')

  return (
    <section className="card">
      <div className="between" style={{ marginBottom: 8 }}>
        <h2 className="h2">{title}</h2>
        <span className="num" style={{ fontSize: 15 }}>
          <b>
            {n(last.value, digits)} {unit}
          </b>
          {points.length > 1 && (
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
        aria-label={`${title}: ${n(min, digits)}–${n(max, digits)} ${unit} trong ${points.length} lần đo`}
      >
        <path d={path} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {coords.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill={color} />
        ))}
      </svg>

      <div className="between dim" style={{ marginTop: 4 }}>
        <span>{shortDate(first.date)}</span>
        <span className="num">
          {n(min, digits)}–{n(max, digits)} {unit}
        </span>
        <span>{shortDate(last.date)}</span>
      </div>
    </section>
  )
}
