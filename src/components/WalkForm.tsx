import { useState } from 'react'
import { n } from '../lib/format'
import { useData } from '../lib/hooks'
import { parseKg } from '../lib/lift'
import { kgInput } from '../lib/setRows'
import { getDay, setWalk } from '../lib/storage'
import { DEFAULT_WALK, lastWalk, walkBurnKcal } from '../lib/walk'
import { Stepper } from './Stepper'

/**
 * Nhập buổi đi bộ dốc: ba con số đọc trên màn hình máy chạy. Lần sau điền sẵn số
 * của lần trước — thường chỉ việc bấm Lưu.
 */
export function WalkForm({ date, onDone }: { date: string; onDone: () => void }) {
  const data = useData()
  const existing = getDay(date, data).walk
  const [start] = useState(() => existing ?? lastWalk(data, date) ?? DEFAULT_WALK)
  const [minutes, setMinutes] = useState(kgInput(start.minutes))
  const [incline, setIncline] = useState(kgInput(start.inclinePct))
  const [speed, setSpeed] = useState(kgInput(start.speedKmh))

  const m = parseKg(minutes)
  const i = parseKg(incline)
  const s = parseKg(speed)
  const kcal = walkBurnKcal(m, s, i, data.settings.weightKg)
  const valid = m > 0 && s > 0

  return (
    <>
      <div className="col" style={{ gap: 14 }}>
        <div className="field">
          <span className="field-label">Thời gian</span>
          <Stepper size="lg" value={minutes} step={5} integer unit="phút" label="số phút" onChange={setMinutes} />
        </div>
        <div className="field">
          <span className="field-label">Độ dốc</span>
          <Stepper size="lg" value={incline} step={0.5} unit="%" label="độ dốc" onChange={setIncline} />
        </div>
        <div className="field">
          <span className="field-label">Tốc độ</span>
          <Stepper size="lg" value={speed} step={0.5} unit="km/h" label="tốc độ" onChange={setSpeed} />
        </div>
      </div>

      <div className="card ink">
        <div className="between">
          <span className="muted">Đốt thêm</span>
          <span className="num" style={{ fontSize: 22, fontWeight: 700 }}>
            {valid ? `≈ ${n(kcal)}` : '—'} <span className="dim" style={{ fontSize: 13 }}>kcal</span>
          </span>
        </div>
        <p className="dim" style={{ margin: '8px 0 0' }}>
          Cộng vào target calo của ngày. Đã trừ phần cơ thể tự đốt lúc đứng yên, tính theo{' '}
          {n(data.settings.weightKg)} kg.
        </p>
      </div>

      <button
        className="btn primary full"
        disabled={!valid}
        onClick={() => {
          setWalk(date, { minutes: m, speedKmh: s, inclinePct: Math.max(0, i), burnKcal: kcal })
          onDone()
        }}
      >
        {existing ? 'Lưu thay đổi' : 'Lưu đi bộ dốc'}
      </button>

      {existing && (
        <button
          className="btn danger full"
          onClick={() => {
            setWalk(date, undefined)
            onDone()
          }}
        >
          Xoá đi bộ dốc
        </button>
      )}
    </>
  )
}
