/** Lỗi ghi phải hiển thị cho người dùng; giữ bản mới nhất để thử lại. */
let errors: Record<string, string> = {}
const pending = new Map<string, string | null>()
const listeners = new Set<() => void>()
function notify(key: string, message?: string) {
  const next = { ...errors }
  if (message) next[key] = message
  else delete next[key]
  errors = next
  listeners.forEach((l) => l())
}
export function persist(key: string, value: string | null, retryOnFailure = true): boolean {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
    pending.delete(key)
    notify(key)
    return true
  } catch {
    if (retryOnFailure) {
      pending.set(key, value)
      notify(key, 'Chưa lưu được trên máy. Đừng đóng app; hãy thử lại hoặc tải backup.')
    }
    return false
  }
}
export function reportReadError(key: string) {
  notify(key, 'Dữ liệu trên máy không đọc được. Bản gốc được giữ nguyên; hãy nhập backup hợp lệ trong Cài đặt.')
}
export function clearReadError(key: string) { notify(key) }
export function retryPersistence() { for (const [key, value] of [...pending]) persist(key, value) }
export const persistenceStore = {
  get: () => errors,
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } },
}
