import { useEffect, type ReactNode } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  action?: ReactNode
  /**
   * 'full' khoá chiều cao ở 92dvh thay vì co theo nội dung. Dùng cho sheet có ô
   * tìm kiếm: danh sách lọc dần làm sheet tụt xuống, bàn phím bật lên là che mất
   * chính ô đang gõ. Chiều cao cố định thì ô tìm kiếm đứng yên một chỗ.
   */
  size?: 'auto' | 'full'
}

export function Sheet({ title, onClose, children, action, size = 'auto' }: Props) {
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
      className="backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`sheet${size === 'full' ? ' sheet-full' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="sheet-head">
          <strong className="truncate">{title}</strong>
          <div className="row">
            {action}
            <button className="btn sm" onClick={onClose} aria-label="Đóng">
              Đóng
            </button>
          </div>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}
