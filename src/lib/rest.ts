import { useSyncExternalStore } from 'react'
import type { AppData } from './types'

export const DEFAULT_REST_SEC = 90
export const REST_STEP_SEC = 15
export const MIN_REST_SEC = 15
export const MAX_REST_SEC = 600
/** Hết giờ quá lâu mà vẫn còn nằm đó (app bị tắt giữa chừng) thì bỏ luôn, khỏi báo. */
const STALE_MS = 5 * 60_000

/**
 * Đồng hồ nghỉ giữa set. Lưu mốc kết thúc chứ không đếm lùi từng giây: điện
 * thoại tắt màn hình hay chuyển app thì setInterval bị treo, mở lại vẫn phải
 * đúng giờ. Ghi xuống localStorage để lỡ tải lại trang vẫn còn.
 */
export interface RestTimer {
  exerciseId: string
  /** ms */
  endAt: number
  /** tổng số giây định nghỉ — vẽ thanh tiến độ, và là số nhớ lại cho bài này */
  total: number
  /** đã rung/bíp báo hết giờ — màn hình vẽ lại không báo thêm lần nữa */
  alerted?: boolean
}

const KEY = 'nutrition-tracker-rest'

function load(): RestTimer | null {
  try {
    const raw = localStorage.getItem(KEY)
    const t = raw ? (JSON.parse(raw) as RestTimer) : null
    return t && Date.now() - t.endAt < STALE_MS ? t : null
  } catch {
    return null
  }
}

let timer: RestTimer | null = typeof localStorage === 'undefined' ? null : load()
const listeners = new Set<() => void>()

function set(next: RestTimer | null) {
  timer = next
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next))
    else localStorage.removeItem(KEY)
  } catch {
    // hết chỗ lưu thì đồng hồ vẫn chạy trong phiên này
  }
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export const restStore = { subscribe, get: () => timer }

export function useRest(): RestTimer | null {
  return useSyncExternalStore(subscribe, restStore.get, restStore.get)
}

export const clampRest = (sec: number) =>
  Math.min(MAX_REST_SEC, Math.max(MIN_REST_SEC, Math.round(sec)))

export function restSecFor(data: AppData, exerciseId: string): number {
  return clampRest(data.restSec?.[exerciseId] ?? DEFAULT_REST_SEC)
}

export function startRest(exerciseId: string, sec: number, now = Date.now()) {
  const total = clampRest(sec)
  set({ exerciseId, endAt: now + total * 1000, total })
}

/**
 * Thêm / bớt giây cho lượt nghỉ đang chạy. Trả về tổng mới để nhớ cho bài —
 * bớt quá phần còn lại thì hết giờ ngay chứ không âm.
 */
export function adjustRest(deltaSec: number, now = Date.now()): number | null {
  if (!timer) return null
  const total = clampRest(timer.total + deltaSec)
  const endAt = Math.max(now, timer.endAt + (total - timer.total) * 1000)
  set({ ...timer, total, endAt, alerted: endAt > now ? false : timer.alerted })
  return total
}

export function markRestAlerted() {
  if (timer && !timer.alerted) set({ ...timer, alerted: true })
}

export function clearRest() {
  if (timer) set(null)
}

// ---------------- báo hết giờ ----------------

let audio: AudioContext | null = null

/**
 * Tạo/mở khoá AudioContext. Phải gọi trong lúc người dùng vừa chạm (bấm tick):
 * iOS chỉ cho phát âm thanh từ một context đã được mở trong cử chỉ của người dùng.
 */
export function primeAudio() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    audio ??= new Ctx()
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    // không có âm thanh thì còn rung và nháy màn hình
  }
}

/** Ba tiếng bíp ngắn + rung. iPhone không rung được từ web — chỉ có tiếng. */
export function alertRestDone() {
  try {
    navigator.vibrate?.([220, 120, 220, 120, 320])
  } catch {
    // trình duyệt chặn rung khi trang chưa từng được chạm
  }
  if (!audio) return
  try {
    const t0 = audio.currentTime
    for (let i = 0; i < 3; i++) {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      const at = t0 + i * 0.28
      osc.frequency.value = i === 2 ? 1175 : 880
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.2)
      osc.connect(gain).connect(audio.destination)
      osc.start(at)
      osc.stop(at + 0.22)
    }
  } catch {
    // context đã bị đóng
  }
}

/** "1:05" */
export function formatRest(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}
