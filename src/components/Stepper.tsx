import { useEffect, useRef } from 'react'
import { parseKg, stepValue } from '../lib/lift'
import { kgInput } from '../lib/setRows'

const HOLD_DELAY = 380
const HOLD_EVERY = 85

/**
 * Ô số kẹp giữa hai nút − / +. Nhấn giữ thì chạy liên tục.
 *
 * Bấm bằng `pointerdown` chứ không đợi `click`: giữa hiệp tập, nhấn là phải nhảy
 * số ngay, không trễ 300ms, và `preventDefault` giữ bàn phím không bật lên vì ô
 * nhập bị cướp focus. Bấm bằng bàn phím (Enter/Space) sinh `click` có
 * `detail === 0` — chỉ nhánh đó mới xử lý trong `onClick`, tránh nhảy hai nấc.
 */
export function Stepper({
  value,
  onChange,
  step,
  label,
  integer,
}: {
  value: string
  onChange: (value: string) => void
  step: number
  label: string
  /** ô rep: chỉ số nguyên, bàn phím số không có dấu phẩy */
  integer?: boolean
}) {
  const valueRef = useRef(value)
  valueRef.current = value
  const timers = useRef<{ delay?: ReturnType<typeof setTimeout>; every?: ReturnType<typeof setInterval> }>({})

  const stop = () => {
    clearTimeout(timers.current.delay)
    clearInterval(timers.current.every)
  }
  useEffect(() => stop, [])

  const bump = (dir: 1 | -1) => {
    const next = stepValue(parseKg(valueRef.current), step, dir)
    const text = integer ? String(Math.round(next)) : kgInput(next)
    valueRef.current = text
    onChange(text)
  }

  const holdProps = (dir: 1 | -1) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return
      e.preventDefault()
      bump(dir)
      stop()
      timers.current.delay = setTimeout(() => {
        timers.current.every = setInterval(() => bump(dir), HOLD_EVERY)
      }, HOLD_DELAY)
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onClick: (e: React.MouseEvent) => {
      if (e.detail === 0) bump(dir)
    },
  })

  return (
    <div className="stepper">
      <button
        type="button"
        className="stepper-btn"
        aria-label={`Giảm ${label}`}
        {...holdProps(-1)}
      >
        −
      </button>
      <input
        inputMode={integer ? 'numeric' : 'decimal'}
        placeholder="0"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className="stepper-btn"
        aria-label={`Tăng ${label}`}
        {...holdProps(1)}
      >
        +
      </button>
    </div>
  )
}
