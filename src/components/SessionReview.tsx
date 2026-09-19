import { useState } from 'react'
import { dateKey } from '../lib/macros'
import type { LiftMode } from '../lib/types'
import { SessionSummary } from './FinishSession'
import { Popup } from './Popup'

/**
 * Bấm vào một buổi đã chốt: tổng kết của buổi kèm từng bài và các set. Sửa được,
 * nhưng phải qua một bước xác nhận — buổi đã chốt không nên sửa vì lỡ tay.
 */
export function SessionReview({
  date,
  mode,
  onClose,
  onEdit,
}: {
  date: string
  mode: LiftMode
  onClose: () => void
  /** người dùng đã xác nhận mở lại để sửa */
  onEdit: () => void
}) {
  const [confirm, setConfirm] = useState(false)

  return (
    <Popup label="Tổng kết buổi tập" onClose={confirm ? () => setConfirm(false) : onClose}>
      {confirm ? (
        <>
          <p style={{ margin: 0, textAlign: 'center', fontWeight: 600 }}>
            Mở lại buổi này để sửa?
          </p>
          <p className="dim" style={{ margin: 0, textAlign: 'center' }}>
            {date === dateKey()
              ? 'Sửa xong bấm Hoàn thành buổi tập để chốt lại.'
              : 'Buổi của ngày đã qua tự chốt lại ngay khi đóng trang sửa.'}
          </p>
          <button className="btn primary full" onClick={onEdit}>
            Mở để sửa
          </button>
          <button className="btn full" onClick={() => setConfirm(false)}>
            Quay lại
          </button>
        </>
      ) : (
        <SessionSummary date={date} mode={mode} details>
          <button className="btn primary full" onClick={onClose}>
            Đóng
          </button>
          <button className="btn sm" style={{ alignSelf: 'center' }} onClick={() => setConfirm(true)}>
            Sửa buổi này
          </button>
        </SessionSummary>
      )}
    </Popup>
  )
}
