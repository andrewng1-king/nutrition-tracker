import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useOverlay } from '../lib/hooks'

/**
 * Hộp thoại nhỏ giữa màn hình cho những câu hỏi một dòng. Khác `Sheet` ở chỗ
 * không trượt từ đáy lên và không chiếm hết chiều ngang — bottom sheet cho một
 * nút Có/Không là quá nặng tay.
 *
 * Gắn thẳng vào `body` (portal): nằm trong vùng cuộn của trang buổi tập thì vuốt
 * trên nền mờ sẽ cuộn luôn trang phía sau, vì cử chỉ cuộn truyền ngược lên vùng
 * cuộn gần nhất trong cây DOM.
 */
export function Popup({
  label,
  onClose,
  children,
}: {
  label: string
  onClose: () => void
  children: ReactNode
}) {
  useOverlay(onClose)

  return createPortal(
    <div
      className="backdrop center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="popup" role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>,
    document.body,
  )
}
