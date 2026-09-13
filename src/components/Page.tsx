import type { ReactNode } from 'react'
import { useOverlay } from '../lib/hooks'
import { IconChevron } from './icons'

/**
 * Trang toàn màn hình, che cả thanh tab. Dùng cho luồng buổi tập: giữa hiệp tập
 * cần hết chiều cao cho các dòng set, và không được lỡ tay chạm sang tab khác.
 * Nút ‹ và Escape lùi một bước — `onBack` quyết định lùi về đâu.
 */
export function Page({
  title,
  onBack,
  children,
  footer,
  action,
}: {
  title: string
  onBack: () => void
  children: ReactNode
  /** vùng nút dính đáy trang, không cuộn theo nội dung */
  footer?: ReactNode
  action?: ReactNode
}) {
  useOverlay(onBack)

  return (
    <div className="page" role="dialog" aria-modal="true" aria-label={title}>
      <div className="page-head">
        <button className="page-back" onClick={onBack} aria-label="Quay lại">
          <IconChevron className="ico" />
        </button>
        <strong className="truncate grow">{title}</strong>
        {action}
      </div>
      <div className="page-body">{children}</div>
      {footer && <div className="page-foot">{footer}</div>}
    </div>
  )
}
