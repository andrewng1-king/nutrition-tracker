import { useEffect, useState } from 'react'
import { n } from '../lib/format'
import { useData } from '../lib/hooks'
import { computeAdjust, dayTypesFor } from '../lib/macros'
import { getDay, setTurbo, toggleDayType } from '../lib/storage'
import type { DayType } from '../lib/types'
import { IconFlame, IconLift, IconShoe, IconTurbo } from './icons'
import { Popup } from './Popup'

const OPTIONS: [DayType, string, typeof IconShoe, string][] = [
  ['run', 'Chạy bộ', IconShoe, 'var(--protein)'],
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

  const runOn = types.includes('run')
  const turbo = runOn && Boolean(day.turbo)
  const [asking, setAsking] = useState(false)
  // Chỉ chạy hiệu ứng "cường hoá" ngay lúc bật, không chạy lại mỗi lần render lại.
  const [justBoosted, setJustBoosted] = useState(false)

  useEffect(() => {
    if (!justBoosted) return
    const t = setTimeout(() => setJustBoosted(false), 1100)
    return () => clearTimeout(t)
  }, [justBoosted])

  const parts: string[] = []
  if (adjust.run > 0) parts.push(`chạy +${n(adjust.run)}`)
  parts.push(`${adjust.gym >= 0 ? '+' : '−'}${n(Math.abs(adjust.gym))} phần gym`)

  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="daybar" role="group" aria-label="Loại ngày">
        {OPTIONS.map(([key, label, Icon, color]) => {
          const on = types.includes(key)
          const isTurbo = key === 'run' && turbo
          const RowIcon = isTurbo ? IconTurbo : Icon
          return (
            <button
              key={key}
              aria-pressed={on}
              data-turbo={isTurbo || undefined}
              data-boost={isTurbo && justBoosted ? 'true' : undefined}
              style={
                on
                  ? ({ '--tint': isTurbo ? 'var(--turbo)' : color } as React.CSSProperties)
                  : undefined
              }
              onClick={() => {
                // Bật ngày chạy thì hỏi luôn có kèm calisthenic không — hỏi sau
                // thì phải tắt/bật lại nhãn, thêm hai lần chạm cho một câu hỏi.
                if (key === 'run' && !on) {
                  setAsking(true)
                  return
                }
                toggleDayType(date, key, types)
              }}
            >
              <RowIcon className="ico" />
              <span className="daybar-label">{isTurbo ? 'Turbo' : label}</span>
            </button>
          )
        })}
      </div>

      {turbo && (
        <div className="turbo-note" data-boost={justBoosted ? 'true' : undefined}>
          <IconTurbo className="ico" />
          <span>
            <b>Turbo</b> — chạy bộ + calisthenic trong cùng một ngày.
          </span>
        </div>
      )}

      <p className="dim" style={{ margin: 0 }}>
        Target {adjust.total >= 0 ? '+' : '−'}
        {n(Math.abs(adjust.total))} kcal ({parts.join(', ')}). Lịch gym 4-5 buổi/tuần đã
        nằm trong TDEE, nên ngày tập chỉ cộng phần vượt trung bình còn ngày không tập thì
        trừ lại.
      </p>

      {asking && (
        <CalisthenicPrompt
          onPick={(withCalisthenic) => {
            setAsking(false)
            toggleDayType(date, 'run', types)
            if (withCalisthenic) {
              setTurbo(date, true)
              setJustBoosted(true)
            }
          }}
          onCancel={() => setAsking(false)}
        />
      )}
    </div>
  )
}

/** Popup nhỏ, chỉ một câu hỏi — không dùng bottom sheet cho một lựa chọn hai nhánh. */
function CalisthenicPrompt({
  onPick,
  onCancel,
}: {
  onPick: (withCalisthenic: boolean) => void
  onCancel: () => void
}) {
  return (
    <Popup label="Có tập calisthenic không?" onClose={onCancel}>
      <IconTurbo className="popup-ico" />
      <h2 className="h2" style={{ textAlign: 'center' }}>
        Có tập calisthenic không?
      </h2>
      <p className="dim" style={{ margin: 0, textAlign: 'center' }}>
        Chạy bộ kèm buổi thể trọng sẽ được đánh dấu <b>Turbo</b>. Chỉ là nhãn hiển thị,
        không đổi target calo — phần calo của buổi tập nằm ở nhãn “Tập tạ”.
      </p>
      <div className="grid2" style={{ marginTop: 4 }}>
        <button className="btn full" onClick={() => onPick(false)}>
          Không
        </button>
        <button className="btn primary full" onClick={() => onPick(true)}>
          Có
        </button>
      </div>
    </Popup>
  )
}
