import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { draftStore, type DraftMap } from './draft'
import { store } from './storage'
import { syncStore, type SyncState } from './sync'
import type { AppData } from './types'

export function useData(): AppData {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}

export function useDrafts(): DraftMap {
  return useSyncExternalStore(draftStore.subscribe, draftStore.get, draftStore.get)
}

export function useSync(): SyncState {
  return useSyncExternalStore(syncStore.subscribe, syncStore.get, syncStore.get)
}

/**
 * Lựa chọn hiển thị nhớ trên máy này (kiểu biểu đồ, khung thời gian…). Chỉ là
 * tiện lợi: localStorage không đọc được thì dùng mặc định, không báo lỗi.
 */
export function usePref<T extends string>(
  key: string,
  fallback: T,
  allowed: readonly T[],
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(`nt-pref:${key}`)
      return saved && (allowed as readonly string[]).includes(saved) ? (saved as T) : fallback
    } catch {
      return fallback
    }
  })
  const set = (next: T) => {
    setValue(next)
    try {
      localStorage.setItem(`nt-pref:${key}`, next)
    } catch {
      // chế độ riêng tư chặn ghi — lựa chọn chỉ sống trong phiên này
    }
  }
  return [value, set]
}

const overlays: { close: () => void }[] = []

function onOverlayKey(e: KeyboardEvent) {
  if (e.key === 'Escape') overlays[overlays.length - 1]?.close()
}

/**
 * Lớp phủ (sheet, popup, trang buổi tập): khoá cuộn trang nền và Escape để đóng.
 * Giữ một ngăn xếp các lớp đang mở — Escape chỉ đóng lớp trên cùng, và popup
 * nằm trên trang buổi tập đóng trước thì không mở khoá cuộn cho cả trang.
 */
export function useOverlay(onClose: () => void) {
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const entry = { close: () => close.current() }
    if (overlays.length === 0) {
      document.addEventListener('keydown', onOverlayKey)
      document.body.style.overflow = 'hidden'
    }
    overlays.push(entry)
    return () => {
      overlays.splice(overlays.indexOf(entry), 1)
      if (overlays.length === 0) {
        document.removeEventListener('keydown', onOverlayKey)
        document.body.style.overflow = ''
      }
    }
  }, [])
}

/**
 * Bật `true` trong `ms` mỗi khi `on` chuyển từ tắt sang bật — dùng cho hiệu ứng
 * "vừa được cường hoá" của Turbo.
 *
 * Đọc thẳng trạng thái turbo thay vì để nơi bấm nút tự báo: turbo bật được từ
 * thanh loại ngày lẫn thẻ "Buổi chạy", nhét cờ vào từng chỗ là sớm muộn cũng
 * quên một chỗ. Lần render đầu không chạy — mở app vào một ngày turbo không
 * phải là "vừa bật".
 */
export function useBoost(on: boolean, ms = 1100): boolean {
  const [boost, setBoost] = useState(false)
  const prev = useRef(on)

  useEffect(() => {
    const wasOff = !prev.current
    prev.current = on
    if (!on || !wasOff) return
    setBoost(true)
    const t = setTimeout(() => setBoost(false), ms)
    return () => clearTimeout(t)
  }, [on, ms])

  return boost
}
