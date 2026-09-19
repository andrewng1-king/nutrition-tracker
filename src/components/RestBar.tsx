import { useEffect, useState } from 'react'
import {
  REST_STEP_SEC,
  adjustRest,
  alertRestDone,
  clearRest,
  formatRest,
  markRestAlerted,
  useRest,
} from '../lib/rest'
import { setRestSec } from '../lib/storage'

/** Hết giờ rồi thì thanh còn nháy chừng này rồi tự tắt. */
const LINGER_MS = 12_000

/**
 * Thanh nghỉ giữa set, dính đáy trang buổi tập. Tự chạy lúc tick một set; −/+
 * chỉnh lượt đang chạy và nhớ luôn cho bài đó.
 *
 * Web không báo được khi màn hình đã khoá, nhất là trên iPhone — nên trong lúc
 * đếm thì giữ màn hình sáng (Wake Lock) để liếc là thấy.
 */
export function RestBar() {
  const rest = useRest()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!rest) return
    const tick = () => setNow(Date.now())
    tick()
    const id = setInterval(tick, 250)
    // quay lại app sau khi khoá màn hình: vẽ lại ngay, không đợi nhịp kế
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [rest])

  const left = rest ? rest.endAt - now : 0
  const done = Boolean(rest) && left <= 0

  useEffect(() => {
    if (!rest || !done) return
    if (!rest.alerted) {
      markRestAlerted()
      alertRestDone()
    }
    const t = setTimeout(clearRest, Math.max(0, rest.endAt + LINGER_MS - Date.now()))
    return () => clearTimeout(t)
  }, [rest, done])

  useWakeLock(Boolean(rest) && !done)

  if (!rest) return null

  const adjust = (delta: number) => {
    const total = adjustRest(delta)
    if (total !== null) setRestSec(rest.exerciseId, total)
  }

  if (done) {
    return (
      <button className="rest-bar done" onClick={clearRest} role="status">
        <span className="rest-label">Hết giờ nghỉ</span>
        <span className="rest-done-cta">Vào set tiếp · đóng</span>
      </button>
    )
  }

  const progress = Math.min(1, Math.max(0, left / (rest.total * 1000)))
  return (
    <div className="rest-bar" role="timer" aria-label={`Nghỉ còn ${formatRest(left)}`}>
      <span className="rest-track" aria-hidden="true">
        <span style={{ transform: `scaleX(${progress})` }} />
      </span>
      <span className="rest-label">Nghỉ</span>
      <span className="rest-time num">{formatRest(left)}</span>
      <span className="rest-actions">
        <button className="rest-btn" onClick={() => adjust(-REST_STEP_SEC)}>
          −{REST_STEP_SEC}
        </button>
        <button className="rest-btn" onClick={() => adjust(REST_STEP_SEC)}>
          +{REST_STEP_SEC}
        </button>
        <button className="rest-btn skip" onClick={clearRest}>
          Bỏ qua
        </button>
      </span>
    </div>
  )
}

interface WakeLockSentinelLike {
  release: () => Promise<void>
}

/** Giữ màn hình sáng khi `on`. Trình duyệt không hỗ trợ thì thôi, không báo lỗi. */
function useWakeLock(on: boolean) {
  useEffect(() => {
    const wl = (navigator as unknown as {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> }
    }).wakeLock
    if (!on || !wl) return
    let sentinel: WakeLockSentinelLike | null = null
    let alive = true
    const acquire = () => {
      if (document.visibilityState !== 'visible') return
      wl.request('screen')
        .then((s) => {
          if (!alive) {
            void s.release().catch(() => {})
            return
          }
          void sentinel?.release().catch(() => {})
          sentinel = s
        })
        .catch(() => {})
    }
    acquire()
    // khoá màn hình là mất wake lock — mở lại thì xin lại
    document.addEventListener('visibilitychange', acquire)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', acquire)
      void sentinel?.release().catch(() => {})
    }
  }, [on])
}
