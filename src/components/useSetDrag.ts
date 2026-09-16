import { useEffect, useRef, useState } from 'react'

/** Giữ bao lâu thì dòng được "nhấc" lên — ngắn hơn là chạm nhanh cũng thành kéo. */
const HOLD_MS = 280
/**
 * Ngón tay xê dịch quá chừng này trước khi nhấc = không phải giữ, bỏ. Tính cả
 * chiều ngang: lướt ngang từ ô số là lướt xoá set, không được nhấc dòng lên giữa chừng.
 */
const SLOP = 8

export interface SetDragState {
  from: number
  over: number
  dy: number
}

interface Gesture {
  pointerId: number
  index: number
  startX: number
  startY: number
  lastY: number
  lifted: boolean
  timer?: ReturnType<typeof setTimeout>
  rects?: { top: number; height: number }[]
  gap: number
}

/**
 * Giữ ô số thứ tự của set rồi kéo lên/xuống để đổi chỗ. Chạm nhanh vẫn là click
 * thường (mở công cụ của set) — chỉ giữ đủ lâu mới nhấc dòng lên, nên không lỡ
 * tay kéo nhầm giữa hiệp tập.
 *
 * Trong lúc kéo chỉ dịch hình (transform), dữ liệu đổi đúng một lần lúc thả tay.
 */
export function useSetDrag({
  onLift,
  onMove,
}: {
  /** gọi lúc nhấc dòng — đóng công cụ đang mở để chiều cao các dòng đứng yên */
  onLift: () => void
  onMove: (from: number, to: number) => void
}) {
  const [drag, setDragState] = useState<SetDragState | null>(null)
  // Bản sao để đọc lúc thả tay — gọi onMove trong updater của setState sẽ bị
  // StrictMode chạy hai lần, đổi chỗ hai lần.
  const dragRef = useRef<SetDragState | null>(null)
  const blocks = useRef<(HTMLElement | null)[]>([])
  const gesture = useRef<Gesture | null>(null)
  const swallowClick = useRef(false)

  useEffect(() => () => clearTimeout(gesture.current?.timer), [])

  const setDrag = (next: SetDragState | null) => {
    dragRef.current = next
    setDragState(next)
  }

  const end = (commit: boolean) => {
    const g = gesture.current
    gesture.current = null
    if (!g) return
    clearTimeout(g.timer)
    if (!g.lifted) return
    const d = dragRef.current
    setDrag(null)
    if (commit && d && d.over !== d.from) onMove(d.from, d.over)
  }

  const measure = (g: Gesture) => {
    // ref của dòng đã bị xoá để lại null ở cuối mảng — bỏ đi, chỉ đo dòng đang có
    const els = blocks.current.slice()
    while (els.length > 0 && !els[els.length - 1]) els.pop()
    const rects = els.map((el) => {
      const r = el?.getBoundingClientRect()
      return { top: r?.top ?? 0, height: r?.height ?? 0 }
    })
    g.rects = rects
    g.gap = rects.length > 1 ? rects[1].top - (rects[0].top + rects[0].height) : 0
  }

  const indexProps = (i: number) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return
      swallowClick.current = false
      end(false)
      // Giữ mọi pointermove về ô này kể cả khi ngón tay trượt ra khỏi ô số
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // con trỏ đã nhả trước khi kịp bắt — cử chỉ sẽ tự huỷ ở pointerup
      }
      const g: Gesture = {
        pointerId: e.pointerId,
        index: i,
        startX: e.clientX,
        startY: e.clientY,
        lastY: e.clientY,
        lifted: false,
        gap: 0,
      }
      g.timer = setTimeout(() => {
        g.lifted = true
        g.startY = g.lastY
        swallowClick.current = true
        onLift()
        navigator.vibrate?.(12)
        setDrag({ from: i, over: i, dy: 0 })
      }, HOLD_MS)
      gesture.current = g
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const g = gesture.current
      if (!g || g.pointerId !== e.pointerId) return
      g.lastY = e.clientY
      if (!g.lifted) {
        if (Math.hypot(e.clientX - g.startX, e.clientY - g.startY) > SLOP) end(false)
        return
      }
      // Đo lúc di chuyển đầu tiên chứ không phải lúc nhấc: `onLift` vừa đóng công
      // cụ, phải đợi React vẽ lại thì chiều cao các dòng mới đúng.
      if (!g.rects) measure(g)
      const rects = g.rects!
      const self = rects[g.index]
      const last = rects[rects.length - 1]
      const dy = Math.min(
        Math.max(e.clientY - g.startY, rects[0].top - self.top),
        last.top + last.height - (self.top + self.height),
      )
      // Kéo lên so mép trên, kéo xuống so mép dưới của dòng đang kéo với tâm dòng
      // khác. So bằng tâm dòng kéo thì set có nấc drop (cao gấp mấy lần) không bao
      // giờ xuống được dưới set cuối: dy bị kẹp trước khi tâm nó tới tâm set đó.
      const top = self.top + dy
      const bottom = top + self.height
      let over = g.index
      for (let j = 0; j < rects.length; j++) {
        const mid = rects[j].top + rects[j].height / 2
        if (j < g.index && top <= mid) {
          over = j
          break
        }
        if (j > g.index && bottom >= mid) over = j
      }
      setDrag({ from: g.index, over, dy })
    },
    onPointerUp: () => end(true),
    onPointerCancel: () => end(false),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  })

  /** Dịch dọc của dòng `i` trong lúc kéo; ngoài lúc kéo thì không có. */
  const offsetOf = (i: number): number | undefined => {
    const rects = gesture.current?.rects
    if (!drag) return undefined
    if (i === drag.from) return drag.dy
    if (!rects) return 0
    const shift = rects[drag.from].height + (gesture.current?.gap ?? 0)
    if (drag.from < drag.over && i > drag.from && i <= drag.over) return -shift
    if (drag.over < drag.from && i >= drag.over && i < drag.from) return shift
    return 0
  }

  return {
    drag,
    indexProps,
    offsetOf,
    blockRef: (i: number) => (el: HTMLElement | null) => {
      blocks.current[i] = el
    },
    /** click ngay sau khi kéo (hoặc giữ mà không kéo) không được mở công cụ */
    takeClick: () => {
      const swallow = swallowClick.current
      swallowClick.current = false
      return !swallow
    },
  }
}
