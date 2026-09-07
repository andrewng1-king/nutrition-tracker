import { n } from '../lib/format'
import { useData } from '../lib/hooks'
import { computeAdjust, dayTypesFor } from '../lib/macros'
import { getDay, toggleDayType } from '../lib/storage'
import type { DayType } from '../lib/types'
import { IconFlame, IconLift, IconRun } from './icons'

const OPTIONS: [DayType, string, typeof IconRun, string][] = [
  ['run', 'Chạy bộ', IconRun, 'var(--protein)'],
  ['lift', 'Tập tạ', IconLift, 'var(--carb)'],
  ['rest', 'Nghỉ', IconFlame, 'var(--muted)'],
]

/**
 * Nhãn ngày, bấm cộng dồn được. "Nghỉ" loại trừ hai cái kia.
 * Đây là chỗ duy nhất người dùng chỉnh phần calo cộng/trừ của ngày, nên bên dưới
 * ghi rõ từng khoản thay vì chỉ đưa ra một con số tổng.
 */
export function DayTypeBar({ date }: { date: string }) {
  const data = useData()
  const day = getDay(date, data)
  const types = dayTypesFor(date, data.settings, day)
  const adjust = computeAdjust(data.settings, {
    runDay: types.includes('run'),
    liftDay: types.includes('lift'),
    runBurnKcal: day.run?.burnKcal,
  })

  const parts: string[] = []
  if (adjust.run > 0) parts.push(`chạy +${n(adjust.run)}`)
  parts.push(`${adjust.gym >= 0 ? '+' : '−'}${n(Math.abs(adjust.gym))} phần gym`)

  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="daybar" role="group" aria-label="Loại ngày">
        {OPTIONS.map(([key, label, Icon, color]) => {
          const on = types.includes(key)
          return (
            <button
              key={key}
              aria-pressed={on}
              style={on ? ({ '--tint': color } as React.CSSProperties) : undefined}
              onClick={() => toggleDayType(date, key, types)}
            >
              <Icon className="ico" />
              {label}
            </button>
          )
        })}
      </div>
      <p className="dim" style={{ margin: 0 }}>
        Target {adjust.total >= 0 ? '+' : '−'}
        {n(Math.abs(adjust.total))} kcal ({parts.join(', ')}). Lịch gym 4-5 buổi/tuần đã
        nằm trong TDEE, nên ngày tập chỉ cộng phần vượt trung bình còn ngày không tập thì
        trừ lại.
      </p>
    </div>
  )
}
