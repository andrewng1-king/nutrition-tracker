import { useEffect, useState } from 'react'
import { seedDemoWeek } from '../lib/demo'
import { dayLabel, lastNDays, shortDate } from '../lib/format'
import { useSync } from '../lib/hooks'
import { resetAll } from '../lib/storage'
import { IconScrewdriver } from './icons'
import { Popup } from './Popup'

/**
 * Nút công cụ để thử app: nạp một tuần dữ liệu giả rồi đi xem các màn hình tổng
 * hợp (tuần, chi tiêu, tiến bộ sức nâng, lịch sử) có chạy đúng không.
 *
 * Nạp mẫu GHI ĐÈ dữ liệu thật, nên luôn hỏi lại một lần trước khi ghi.
 */
export function DevTools({ onSeeded }: { onSeeded?: () => void }) {
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    if (!result) return
    const t = setTimeout(() => setResult(null), 3200)
    return () => clearTimeout(t)
  }, [result])

  return (
    <>
      <button
        className="dev-fab"
        onClick={() => setOpen(true)}
        aria-label="Công cụ thử nghiệm"
        title="Công cụ thử nghiệm"
      >
        <IconScrewdriver className="ico" />
      </button>

      {result && <div className="dev-toast">{result}</div>}

      {open && (
        <DevSheet
          onClose={() => setOpen(false)}
          onSeed={() => {
            const { from, to } = seedDemoWeek()
            setOpen(false)
            setResult(`Đã nạp 7 ngày mẫu: ${shortDate(from)} → ${shortDate(to)}`)
            onSeeded?.()
          }}
          onReset={() => {
            resetAll()
            setOpen(false)
            setResult('Đã xoá sạch dữ liệu.')
            onSeeded?.()
          }}
        />
      )}
    </>
  )
}

function DevSheet({
  onClose,
  onSeed,
  onReset,
}: {
  onClose: () => void
  onSeed: () => void
  onReset: () => void
}) {
  const [confirm, setConfirm] = useState<'seed' | 'reset' | null>(null)
  const range = lastNDays(7)
  // Đang đăng nhập thì mọi thay đổi ở đây đẩy thẳng lên tài khoản thật.
  const synced = useSync().email
    ? ' Đang đăng nhập đồng bộ: dữ liệu trên Supabase cũng bị ghi đè.'
    : ''

  return (
    <Popup label="Công cụ thử nghiệm" onClose={onClose}>
      <IconScrewdriver className="popup-ico neutral" />
      <h2 className="h2">Công cụ thử nghiệm</h2>

      {confirm === null && (
        <>
          <p className="dim" style={{ margin: 0, textAlign: 'center' }}>
            Nạp 7 ngày gần nhất ({shortDate(range[0])} → {dayLabel(range[6])}) với bữa ăn,
            tiền ăn, buổi chạy, buổi gym và calisthenic ngẫu nhiên — mỗi ngày một kiểu, để
            xem các màn tổng hợp chạy ra sao.
          </p>
          <button className="btn primary full" onClick={() => setConfirm('seed')}>
            Nạp 1 tuần dữ liệu mẫu
          </button>
          <button className="btn danger full" onClick={() => setConfirm('reset')}>
            Xoá sạch dữ liệu
          </button>
          <button className="btn full" onClick={onClose}>
            Đóng
          </button>
        </>
      )}

      {confirm === 'seed' && (
        <Confirm
          text={`Dữ liệu mẫu sẽ GHI ĐÈ toàn bộ dữ liệu hiện có (món tự thêm, bài tập tự thêm, mọi ngày đã log). Không hoàn tác được.${synced}`}
          cta="Ghi đè và nạp mẫu"
          onYes={onSeed}
          onNo={() => setConfirm(null)}
        />
      )}

      {confirm === 'reset' && (
        <Confirm
          text={`Xoá toàn bộ dữ liệu và đưa app về trạng thái mới cài. Không hoàn tác được.${synced}`}
          cta="Xoá sạch"
          onYes={onReset}
          onNo={() => setConfirm(null)}
        />
      )}
    </Popup>
  )
}

function Confirm({
  text,
  cta,
  onYes,
  onNo,
}: {
  text: string
  cta: string
  onYes: () => void
  onNo: () => void
}) {
  return (
    <>
      <p className="dim" style={{ margin: 0, textAlign: 'center' }}>
        {text}
      </p>
      <div className="grid2">
        <button className="btn full" onClick={onNo}>
          Huỷ
        </button>
        <button className="btn danger full" onClick={onYes}>
          {cta}
        </button>
      </div>
    </>
  )
}
