import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
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

const overlays: { close: () => void; element: HTMLDivElement }[] = []
const inertBefore = new Map<HTMLElement, boolean>()
let overflowBefore = ''
const focusables = (element: HTMLElement) => [...element.querySelectorAll<HTMLElement>(
  'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
)].filter((el) => !el.closest('[hidden], [inert]') && el.getClientRects().length > 0)
function focusOverlay() {
  const top = overlays.at(-1)?.element
  if (top && !top.contains(document.activeElement)) (focusables(top)[0] ?? top).focus()
}
function updateInert() {
  for (const [element, wasInert] of inertBefore) element.inert = wasInert
  inertBefore.clear()
  let branch: HTMLElement | undefined = overlays.at(-1)?.element
  while (branch && branch !== document.body) {
    for (const sibling of [...(branch.parentElement?.children ?? [])]) {
      if (sibling === branch || !(sibling instanceof HTMLElement)) continue
      inertBefore.set(sibling, sibling.inert)
      sibling.inert = true
    }
    branch = branch.parentElement ?? undefined
  }
}

function onOverlayKey(e: KeyboardEvent) {
  const top = overlays.at(-1)
  if (!top) return
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); top.close(); return }
  if (e.key !== 'Tab') return
  const controls = focusables(top.element)
  const current = controls.indexOf(document.activeElement as HTMLElement)
  if (!controls.length) { e.preventDefault(); top.element.focus(); return }
  if (current < 0 || (e.shiftKey && current === 0) || (!e.shiftKey && current === controls.length - 1)) {
    e.preventDefault()
    controls[e.shiftKey ? controls.length - 1 : 0].focus()
  }
}

/**
 * Lớp phủ (sheet, popup, trang buổi tập): khoá cuộn trang nền và Escape để đóng.
 * Giữ một ngăn xếp các lớp đang mở — Escape chỉ đóng lớp trên cùng, và popup
 * nằm trên trang buổi tập đóng trước thì không mở khoá cuộn cho cả trang.
 */
export function useOverlay(onClose: () => void) {
  const element = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose

  useLayoutEffect(() => {
    if (!element.current) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const entry = { close: () => close.current(), element: element.current }
    if (overlays.length === 0) {
      document.addEventListener('keydown', onOverlayKey)
      document.addEventListener('focusin', focusOverlay)
      overflowBefore = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    overlays.push(entry)
    // Layout effects của con chạy trước cha khi cả hai mở cùng một lượt render.
    overlays.sort((a, b) => a.element.contains(b.element) ? -1 : b.element.contains(a.element) ? 1 : 0)
    updateInert()
    focusOverlay()
    return () => {
      const wasTop = overlays.at(-1) === entry
      overlays.splice(overlays.indexOf(entry), 1)
      updateInert()
      if (overlays.length === 0) {
        document.removeEventListener('keydown', onOverlayKey)
        document.removeEventListener('focusin', focusOverlay)
        document.body.style.overflow = overflowBefore
      }
      if (wasTop && previousFocus?.isConnected) previousFocus.focus()
      focusOverlay()
    }
  }, [])
  return element
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
