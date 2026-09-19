import { n } from '../lib/format'

/**
 * % thay đổi: ▲ xanh khi tăng, ▼ vàng khi giảm, trắng khi đứng yên. Làm tròn một
 * chữ số — +0,04% đọc là đứng yên chứ không phải "tăng".
 */
export function Delta({ pct, suffix }: { pct: number | null; suffix?: string }) {
  if (pct === null) {
    return <span className="delta num" data-tone="none">—</span>
  }
  const r = Math.round(pct * 10) / 10
  const tone = r > 0 ? 'up' : r < 0 ? 'down' : 'flat'
  return (
    <span className="delta num" data-tone={tone}>
      {r > 0 ? '▲ ' : r < 0 ? '▼ ' : ''}
      {n(Math.abs(r), 1)}%
      {suffix && <small> {suffix}</small>}
    </span>
  )
}
