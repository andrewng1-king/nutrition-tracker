import { useEffect, type ReactNode } from 'react'

/**
 * Hộp thoại nhỏ giữa màn hình cho những câu hỏi một dòng. Khác `Sheet` ở chỗ
 * không trượt từ đáy lên và không chiếm hết chiều ngang — bottom sheet cho một
 * nút Có/Không là quá nặng tay.
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="backdrop center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="popup" role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  )
}
