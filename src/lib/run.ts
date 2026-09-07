import type { RunLog } from './types'

/**
 * Chạy bộ đốt xấp xỉ 1.03 kcal cho mỗi kg cân nặng mỗi km, gần như không phụ
 * thuộc pace. Đây là NET (đã trừ chuyển hoá cơ bản) nên cộng thẳng vào ngân sách
 * trong ngày được.
 */
export function runBurnKcal(distanceKm: number, weightKg: number): number {
  return Math.round(distanceKm * weightKg * 1.03)
}

/** giây/km -> "5:55" */
export function formatPace(secPerKm: number): string {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return '—'
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function paceSecPerKm(run: Pick<RunLog, 'distanceKm' | 'durationSec'>): number {
  return run.distanceKm > 0 ? run.durationSec / run.distanceKm : 0
}

/** giây -> "1:00:16" hoặc "48:30" */
export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.round(sec % 60)
  const pad = (x: number) => String(x).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** "48:30" hoặc "1:00:16" hoặc "48" (phút) -> giây */
export function parseDuration(text: string): number {
  const parts = text.trim().split(':').map(Number)
  if (parts.some((p) => Number.isNaN(p))) return 0
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return (parts[0] ?? 0) * 60
}

const EARTH_R = 6371000

function haversine(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_R * Math.asin(Math.sqrt(s))
}

interface Point {
  lat: number
  lon: number
  ele?: number
  time?: number
}

/**
 * Đọc file GPX / TCX xuất từ Strava (Export GPX trên trang activity).
 * Không cần đăng nhập, không gửi dữ liệu đi đâu — parse ngay trên máy.
 */
export function parseTrackFile(xml: string): {
  distanceKm: number
  durationSec: number
  elevationM: number
  points: number
} {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('File không phải GPX/TCX hợp lệ.')

  const points: Point[] = []

  // GPX: <trkpt lat lon><ele/><time/>
  for (const el of Array.from(doc.getElementsByTagName('trkpt'))) {
    const lat = Number(el.getAttribute('lat'))
    const lon = Number(el.getAttribute('lon'))
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue
    const ele = Number(el.getElementsByTagName('ele')[0]?.textContent)
    const time = Date.parse(el.getElementsByTagName('time')[0]?.textContent ?? '')
    points.push({
      lat,
      lon,
      ele: Number.isNaN(ele) ? undefined : ele,
      time: Number.isNaN(time) ? undefined : time,
    })
  }

  // TCX: <Trackpoint><Position><LatitudeDegrees/><LongitudeDegrees/></Position>
  if (points.length === 0) {
    for (const el of Array.from(doc.getElementsByTagName('Trackpoint'))) {
      const lat = Number(el.getElementsByTagName('LatitudeDegrees')[0]?.textContent)
      const lon = Number(el.getElementsByTagName('LongitudeDegrees')[0]?.textContent)
      if (Number.isNaN(lat) || Number.isNaN(lon)) continue
      const ele = Number(el.getElementsByTagName('AltitudeMeters')[0]?.textContent)
      const time = Date.parse(el.getElementsByTagName('Time')[0]?.textContent ?? '')
      points.push({
        lat,
        lon,
        ele: Number.isNaN(ele) ? undefined : ele,
        time: Number.isNaN(time) ? undefined : time,
      })
    }
  }

  if (points.length < 2) throw new Error('File không có dữ liệu toạ độ.')

  let meters = 0
  let gain = 0
  for (let i = 1; i < points.length; i++) {
    meters += haversine(points[i - 1], points[i])
    const prev = points[i - 1].ele
    const cur = points[i].ele
    // bỏ nhiễu GPS dưới 1m, nếu không tổng leo dốc sẽ phồng lên vô lý
    if (prev !== undefined && cur !== undefined && cur - prev > 1) gain += cur - prev
  }

  const times = points.map((p) => p.time).filter((t): t is number => t !== undefined)
  const durationSec =
    times.length >= 2 ? Math.round((Math.max(...times) - Math.min(...times)) / 1000) : 0

  // TCX thường có sẵn DistanceMeters chính xác hơn tổng haversine
  const tcxDistances = Array.from(doc.getElementsByTagName('DistanceMeters'))
    .map((el) => Number(el.textContent))
    .filter((x) => !Number.isNaN(x))
  const distanceM = tcxDistances.length > 0 ? Math.max(...tcxDistances) : meters

  return {
    distanceKm: Number((distanceM / 1000).toFixed(2)),
    durationSec,
    elevationM: Math.round(gain),
    points: points.length,
  }
}
