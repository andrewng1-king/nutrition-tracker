import { MEAL_LABELS, MEAL_ORDER, n, vnd } from '../lib/format'
import type { MealSlot } from '../lib/types'

export const MEAL_COLORS: Record<MealSlot, string> = {
  sang: '#ff6b2c',
  trua: '#2e8bff',
  toi: '#ffb020',
  snack: '#35e08d',
}

const SIZE = 200
const CX = SIZE / 2
const CY = SIZE / 2
/** vành dày, lỗ giữa còn ~48% đường kính ngoài */
const THICK = 46
const R = 65
/** khoảng hở giữa hai cung, radian — đầu cung cắt phẳng nên hở bao nhiêu thấy bấy nhiêu */
const GAP = 0.12
/** cung ngắn nhất còn nhìn ra được, để phần chi tiêu nhỏ không biến mất */
const MIN_ARC = 0.05
const TAU = Math.PI * 2
const START = -Math.PI / 2 // 12 giờ

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
 * Vòng tròn chia theo bữa. Mỗi cung dài theo tỉ lệ tiền của bữa đó trong tổng
 * chi, cách nhau đúng một khoảng hở bằng nhau.
 *
 * Vòng đầy chứ không phải nửa vòng: bốn bữa trên nửa vòng thì cung của bữa nhỏ
 * ngắn hơn cả khoảng hở, nhìn ra chấm chứ không ra tỉ lệ.
 */
export function ExpenseGauge({
  byMeal,
  total,
}: {
  byMeal: Record<MealSlot, number>
  total: number
}) {
  const meals = MEAL_ORDER.filter((m) => byMeal[m] > 0)

  let cursor = START
  const segments = meals.map((meal) => {
    const share = byMeal[meal] / total
    const from = cursor
    const to = cursor + share * TAU
    cursor = to
    return { meal, share, from, to }
  })

  // Một bữa duy nhất: cung dài trọn vòng, `A` không vẽ được cung 360° vì điểm
  // đầu trùng điểm cuối — dùng thẳng hình tròn.
  const single = segments.length === 1

  return (
    <div className="spend">
      <div className="spend-ring">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`Chi tiêu ăn uống: ${vnd(total)}`}
        >
          {single ? (
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke={MEAL_COLORS[segments[0].meal]}
              strokeWidth={THICK}
            />
          ) : (
            segments.map(({ meal, from, to }) => {
              const a = from + GAP / 2
              return (
                <path
                  key={meal}
                  d={arcPath(a, Math.max(a + MIN_ARC, to - GAP / 2))}
                  stroke={MEAL_COLORS[meal]}
                  strokeWidth={THICK}
                  fill="none"
                />
              )
            })
          )}
        </svg>

        <div className="spend-center">
          <span className="spend-cap">Đã chi</span>
          <span className="num spend-total">{vnd(total)}</span>
        </div>
      </div>

      <div className="spend-rows">
        {segments.map(({ meal, share }) => (
          <div key={meal} className="spend-row">
            <i className="spend-dot" style={{ background: MEAL_COLORS[meal] }} />
            <span className="grow">{MEAL_LABELS[meal]}</span>
            <span className="dim num">{vnd(byMeal[meal])}</span>
            <b className="num spend-pct">{n(share * 100)}%</b>
          </div>
        ))}
      </div>
    </div>
  )
}
