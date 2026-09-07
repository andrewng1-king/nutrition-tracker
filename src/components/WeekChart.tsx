import { dayLabel, n, weekday } from '../lib/format'
import { dateKey } from '../lib/macros'
import { LEVEL_COLORS, statusLevel } from '../lib/status'
import type { WeekDayStat } from '../lib/week'

const MIN_H = 14
const MAX_H = 96

/**
 * Cột calo từng ngày trong tuần, kiểu biểu đồ "This week" của bản tham chiếu.
 * Chiều cao theo calo đã ăn, màu theo mức đạt so với target của chính ngày đó —
 * ngày chạy bộ có target cao hơn nên cùng số kcal vẫn có thể thấp hơn về màu.
 */
export function WeekChart({
  stats,
  onSelect,
}: {
  stats: WeekDayStat[]
  onSelect?: (date: string) => void
}) {
  const today = dateKey()
  const peak = Math.max(...stats.map((s) => Math.max(s.kcal, s.target)), 1)

  return (
    <div className="week-chart">
      {stats.map((s) => {
        const height = s.logged ? MIN_H + (s.kcal / peak) * (MAX_H - MIN_H) : MIN_H
        const level = statusLevel(s.kcal, s.target)
        const isToday = s.date === today
        const inner = (
          <>
            <span className="week-val">{s.logged ? n(s.kcal) : '—'}</span>
            <span className="week-bar" style={{ height: MAX_H }}>
              <i
                style={{
                  height,
                  background: s.logged ? LEVEL_COLORS[level] : 'transparent',
                }}
              />
            </span>
            <span className="week-day">{weekday(s.date)}</span>
          </>
        )

        if (!onSelect) {
          return (
            <div key={s.date} className="week-col" data-today={isToday}>
              {inner}
            </div>
          )
        }
        return (
          <button
            key={s.date}
            className="week-col"
            data-today={isToday}
            onClick={() => onSelect(s.date)}
            aria-label={`${dayLabel(s.date)}: ${s.logged ? `${n(s.kcal)} kcal` : 'chưa log'}`}
          >
            {inner}
          </button>
        )
      })}
    </div>
  )
}
