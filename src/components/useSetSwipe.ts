import { useRef, useState } from 'react'

/** Ngón tay đi ngang quá chừng này (và nhiều hơn đi dọc) mới tính là lướt. */
const SLOP = 8
/** Bề ngang ô thùng rác lộ ra khi lướt hẳn sang trái. */
export const TRASH_W = 72
/** Kéo quá ô thùng rác được thêm chừng này rồi dừng — cho cảm giác chạm mép. */
const OVERSHOOT = 24

interface Gesture {
  pointerId: number
  index: number
  startX: number
  startY: number
  /** vị trí lúc đặt tay: 0, hoặc −TRASH_W nếu dòng đang mở sẵn */
  base: number
  dx: number
  claimed: boolean
}

/**
 * Lướt một set sang trái để lộ ô thùng rác đỏ, chạm ô đó mới xoá — hai bước nên
 * lướt nhầm giữa hiệp không mất set. Mỗi lúc chỉ mở một dòng.
 *
 * Đặt tay lên nút − / + thì bỏ qua: nút đó đã đổi số ngay lúc chạm. Lướt từ ô số
 * thứ tự vẫn được — `useSetDrag` tự huỷ giữ-để-kéo khi ngón tay đi ngang.
 */
export function useSetSwipe({ onClaim }: { onClaim: () => void }) {
  const [open, setOpen] = useState<number | null>(null)
  const [live, setLive] = useState<{ index: number; dx: number } | null>(null)
  const gesture = useRef<Gesture | null>(null)
  const swallowClick = useRef(false)

  const cancel = () => {
    gesture.current = null
    setLive(null)
  }

  const slideProps = (i: number) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return
      swallowClick.current = false
      if (open !== null && open !== i) setOpen(null)
      if ((e.target as Element).closest('.stepper-btn')) return
      gesture.current = {
        pointerId: e.pointerId,
        index: i,
        startX: e.clientX,
        startY: e.clientY,
        base: open === i ? -TRASH_W : 0,
        dx: open === i ? -TRASH_W : 0,
        claimed: false,
      }
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const g = gesture.current
      if (!g || g.pointerId !== e.pointerId) return
      const dx = e.clientX - g.startX
      const dy = e.clientY - g.startY
      if (!g.claimed) {
        if (Math.abs(dy) > SLOP && Math.abs(dy) >= Math.abs(dx)) {
          gesture.current = null
          return
        }
        if (Math.abs(dx) <= SLOP) return
        g.claimed = true
        onClaim()
        // chuột nhấn xuống ô số là đã focus ô đó — lướt rồi thì thả focus ra
        const focused = document.activeElement
        if (focused instanceof HTMLElement && e.currentTarget.contains(focused)) focused.blur()
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          // con trỏ đã nhả — pointerup sẽ không tới, cancel dọn dẹp
        }
      }
      g.dx = Math.min(0, Math.max(-TRASH_W - OVERSHOOT, g.base + dx))
      setLive({ index: g.index, dx: g.dx })
    },
    onPointerUp: () => {
      const g = gesture.current
      gesture.current = null
      if (!g) return
      if (!g.claimed) {
        // chạm vào dòng đang mở = đóng lại, không bấm trúng gì bên dưới
        if (open === g.index) setOpen(null)
        return
      }
      swallowClick.current = true
      setOpen(g.dx < -TRASH_W / 2 ? g.index : null)
      setLive(null)
    },
    onPointerCancel: cancel,
    onClickCapture: (e: React.MouseEvent) => {
      if (!swallowClick.current) return
      swallowClick.current = false
      e.stopPropagation()
      e.preventDefault()
    },
  })

  /** Dịch ngang của dòng `i`; không lướt, không mở thì không có. */
  const offsetOf = (i: number): number | undefined => {
    if (live?.index === i) return live.dx
    if (open === i) return -TRASH_W
    return undefined
  }

  return {
    slideProps,
    offsetOf,
    /** đang theo ngón tay — tắt transition để dòng bám sát */
    isLive: (i: number) => live?.index === i,
    isOpen: (i: number) => open === i,
    close: () => {
      cancel()
      setOpen(null)
    },
  }
}
