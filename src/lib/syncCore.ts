import type { AppData, DayLog } from './types'

/**
 * Phần logic thuần của đồng bộ — không đụng mạng, để test được.
 *
 * Mô hình: máy là nguồn chính (local-first). Mỗi ngày là một dòng trên Supabase,
 * phần còn lại (cài đặt, món tự thêm, bài tự thêm, mẫu) gộp thành một dòng
 * `app_state`. Xung đột giải theo từng ngày: bản sửa sau cùng thắng.
 */

type MetaKey = Exclude<keyof AppData, 'version' | 'days'>

// Record<MetaKey, true> bắt TypeScript báo lỗi khi AppData có trường mới mà quên
// khai ở đây — quên là trường đó âm thầm không bao giờ được đồng bộ.
const META_FIELDS: Record<MetaKey, true> = {
  settings: true,
  customFoods: true,
  customExercises: true,
  templates: true,
  workoutTemplates: true,
  lastAmounts: true,
  lastCosts: true,
  recent: true,
}

export const META_KEYS = Object.keys(META_FIELDS) as MetaKey[]

export type MetaData = Pick<AppData, MetaKey>

export function metaOf(d: AppData): MetaData {
  return Object.fromEntries(META_KEYS.map((k) => [k, d[k]])) as MetaData
}

/** Store luôn ghi bất biến, nên so tham chiếu là đủ biết phần nào vừa đổi. */
export function metaChanged(prev: AppData, next: AppData): boolean {
  return META_KEYS.some((k) => prev[k] !== next[k])
}

export function changedDays(prev: AppData, next: AppData): string[] {
  const keys = new Set([...Object.keys(prev.days), ...Object.keys(next.days)])
  return [...keys].filter((k) => prev.days[k] !== next.days[k])
}

/**
 * JSON với khoá sắp xếp. jsonb của Postgres tự đổi thứ tự khoá, nên bản vừa đẩy
 * lên kéo về so bằng JSON.stringify thường sẽ luôn "khác" dù nội dung y hệt.
 */
export function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v as Record<string, unknown>).sort(([a], [b]) =>
            a < b ? -1 : a > b ? 1 : 0,
          ),
        )
      : v,
  )
}

export interface RemoteDay {
  date: string
  /** null = ngày đã bị xoá trên máy khác */
  data: DayLog | null
  /** ms, giờ của máy đã sửa */
  updated_at: number
}

/**
 * Ghép các ngày vừa kéo về vào dữ liệu trên máy.
 * - Ngày đang chờ đẩy lên và sửa SAU bản trên mạng: giữ bản máy, lát nữa đẩy lên.
 * - Còn lại: bản trên mạng thắng, bỏ cờ chờ đẩy.
 */
export function mergeRemoteDays(
  days: Record<string, DayLog>,
  rows: RemoteDay[],
  dirty: Record<string, number>,
): { days: Record<string, DayLog>; dirty: Record<string, number>; changed: boolean } {
  const out = { ...days }
  const nextDirty = { ...dirty }
  let changed = false
  for (const row of rows) {
    const localTs = nextDirty[row.date]
    if (localTs !== undefined && localTs > row.updated_at) continue
    delete nextDirty[row.date]
    if (row.data === null) {
      if (row.date in out) {
        delete out[row.date]
        changed = true
      }
      continue
    }
    if (stableJson(out[row.date]) !== stableJson(row.data)) {
      out[row.date] = row.data
      changed = true
    }
  }
  return { days: out, dirty: nextDirty, changed }
}

function unionById<T extends { id: string }>(remote: T[], local: T[]): T[] {
  const have = new Set(remote.map((x) => x.id))
  return [...remote, ...local.filter((x) => !have.has(x.id))]
}

/**
 * Lần đầu đăng nhập trên một máy đã có dữ liệu, và tài khoản cũng đã có dữ liệu,
 * người dùng chọn "Gộp": ngày trùng lấy bản tài khoản, ngày chỉ máy này có thì
 * giữ và đánh dấu để đẩy lên. Món/bài/mẫu gộp theo id, trùng id lấy bản tài khoản.
 */
export function mergeFirstSync(
  local: AppData,
  remoteMeta: MetaData | null,
  remoteDays: RemoteDay[],
  now: number,
): { data: AppData; dirtyDays: Record<string, number> } {
  const days: Record<string, DayLog> = {}
  for (const row of remoteDays) if (row.data) days[row.date] = row.data
  const dirtyDays: Record<string, number> = {}
  for (const [date, day] of Object.entries(local.days)) {
    if (date in days) continue
    days[date] = day
    dirtyDays[date] = now
  }
  const r = remoteMeta ?? metaOf(local)
  const data: AppData = {
    ...local,
    ...r,
    customFoods: unionById(r.customFoods ?? [], local.customFoods),
    customExercises: unionById(r.customExercises ?? [], local.customExercises),
    templates: unionById(r.templates ?? [], local.templates),
    workoutTemplates: unionById(r.workoutTemplates ?? [], local.workoutTemplates ?? []),
    lastAmounts: { ...local.lastAmounts, ...r.lastAmounts },
    lastCosts: { ...local.lastCosts, ...r.lastCosts },
    recent: { ...local.recent, ...r.recent },
    days,
  }
  return { data, dirtyDays }
}

/** Máy có dữ liệu thật chưa — quyết định có phải hỏi "dùng bản nào" không. */
export function hasLocalData(d: AppData): boolean {
  return (
    Object.keys(d.days).length > 0 ||
    d.customFoods.length > 0 ||
    d.customExercises.length > 0 ||
    d.templates.length > 0 ||
    (d.workoutTemplates ?? []).length > 0
  )
}
