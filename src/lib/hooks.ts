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
