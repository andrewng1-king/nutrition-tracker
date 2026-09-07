import { MEAL_LABELS, MEAL_ORDER, vnd } from '../lib/format'
import type { MealSlot } from '../lib/types'

export const MEAL_COLORS: Record<MealSlot, string> = {
  sang: '#c8ff4d',
  trua: '#35d07f',
  toi: '#ffb020',
  snack: '#5f6e5e',
}

const SIZE = 220
const THICK = 20
const R = (SIZE - THICK) / 2
const CX = SIZE / 2
const CY = SIZE / 2
const GAP = 0.035 // radian giữa các cung

function polar(angle: number) {
  return { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) }
}

function arcPath(from: number, to: number) {
  const a = polar(from)
  const b = polar(to)
  const large = to - from > Math.PI ? 1 : 0
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`
}

/**
 * Đồng hồ nửa vòng chia theo bữa — kiểu thẻ Expenses của bản tham chiếu.
 * Mỗi cung dài theo tỉ lệ tiền của bữa đó trong tổng chi của ngày.
 */
export function ExpenseGauge({
  byMeal,
  total,
}: {
  byMeal: Record<MealSlot, number>
  total: number
}) {
  const START = Math.PI // 9 giờ
  const SWEEP = Math.PI // nửa vòng trên
  const meals = MEAL_ORDER.filter((m) => byMeal[m] > 0)

  let cursor = START
  const segments = meals.map((meal) => {
    const share = byMeal[meal] / total
    const from = cursor
    const to = cursor + share * SWEEP
    cursor = to
    return { meal, from, to }
  })

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE / 2 + THICK}`}
          style={{ width: '100%', display: 'block' }}
          role="img"
          aria-label={`Chi tiêu ăn uống: ${vnd(total)}`}
        >
          <path
            d={arcPath(START, START + SWEEP)}
            stroke="var(--surface-3)"
            strokeWidth={THICK}
            strokeLinecap="round"
            fill="none"
          />
          {segments.map(({ meal, from, to }) => (
            <path
              key={meal}
              d={arcPath(from + GAP / 2, Math.max(from + GAP / 2 + 0.01, to - GAP / 2))}
              stroke={MEAL_COLORS[meal]}
              strokeWidth={THICK}
              strokeLinecap="round"
              fill="none"
            />
          ))}
        </svg>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingBottom: 4,
            pointerEvents: 'none',
          }}
        >
          <span className="h2">Đã chi</span>
          <span
            className="num"
            style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em' }}
          >
            {vnd(total)}
          </span>
        </div>
      </div>

      <div className="spend-legend">
        {MEAL_ORDER.map((meal) => (
          <span key={meal} className="spend-tag">
            <i className="swatch" style={{ background: MEAL_COLORS[meal] }} />
            {MEAL_LABELS[meal]}
            <b className="num">{byMeal[meal] > 0 ? vnd(byMeal[meal]) : '—'}</b>
          </span>
        ))}
      </div>
    </div>
  )
}
