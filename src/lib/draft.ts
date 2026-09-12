import type { LiftMode } from './types'

/**
 * Bản nháp ô nhập set. Chuỗi thô, đúng thứ người dùng đang gõ ("22,"), để mở
 * lại là thấy y nguyên — không phải con số đã parse.
 */
export interface DraftDrop {
  kg: string
  reps: string
}

export interface DraftRow {
  kg: string
  reps: string
  /** đã tick = đã nằm trong log */
  done: boolean
  drops: DraftDrop[]
}

export interface LiftDraft {
  date: string
  mode: LiftMode
  exerciseId: string
  /** chép tên lúc lưu — bài có bị xoá thì câu hỏi "tập dở" vẫn đọc được */
  exerciseName: string
  rows: DraftRow[]
  updatedAt: number
}

export type DraftMap = Record<string, LiftDraft>

const KEY = 'nutrition-tracker-drafts'

/**
 * Mốc mở app lần này. Chỉ nháp cũ hơn mốc này mới đáng hỏi "tiếp tục không" —
 * nháp vừa ghi trong phiên đang chạy là của chính màn hình người dùng đang cầm.
 */
export const BOOT_AT = Date.now()

const draftKey = (date: string, exerciseId: string) => `${date}|${exerciseId}`

function load(): DraftMap {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as DraftMap) : {}
  } catch {
    return {}
  }
}

let drafts: DraftMap = typeof localStorage === 'undefined' ? {} : load()
const listeners = new Set<() => void>()
const changeListeners = new Set<(origin: 'local' | 'remote') => void>()

function set(next: DraftMap, origin: 'local' | 'remote') {
  drafts = next
  try {
    localStorage.setItem(KEY, JSON.stringify(drafts))
  } catch (err) {
    console.error('Không lưu được bản nháp', err)
  }
  changeListeners.forEach((l) => l(origin))
  listeners.forEach((l) => l())
}

export const draftStore = {
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
  get: () => drafts,
  onChange(l: (origin: 'local' | 'remote') => void) {
    changeListeners.add(l)
    return () => changeListeners.delete(l)
  },
  /** Nháp kéo từ Supabase về thay nguyên bộ — không đẩy ngược lên. */
  applyRemote(next: DraftMap | null) {
    set(next ?? {}, 'remote')
  },
}

export function getDraft(date: string, exerciseId: string): LiftDraft | undefined {
  return drafts[draftKey(date, exerciseId)]
}

export function saveDraft(d: Omit<LiftDraft, 'updatedAt'>) {
  set({ ...drafts, [draftKey(d.date, d.exerciseId)]: { ...d, updatedAt: Date.now() } }, 'local')
}

export function clearDraft(date: string, exerciseId: string) {
  const key = draftKey(date, exerciseId)
  if (!(key in drafts)) return
  const next = { ...drafts }
  delete next[key]
  set(next, 'local')
}

/** Bỏ nháp của nhiều bài trong một ngày — dùng khi xoá cả buổi tập. */
export function clearDrafts(date: string, exerciseIds: string[]) {
  const keys = new Set(exerciseIds.map((id) => draftKey(date, id)))
  const next = Object.fromEntries(Object.entries(drafts).filter(([k]) => !keys.has(k)))
  if (Object.keys(next).length !== Object.keys(drafts).length) set(next, 'local')
}

/** Bỏ mọi nháp ghi trước `before` — nút "Bỏ" ở câu hỏi lúc mở app. */
export function clearDraftsBefore(before: number) {
  const next = Object.fromEntries(
    Object.entries(drafts).filter(([, d]) => d.updatedAt >= before),
  )
  if (Object.keys(next).length !== Object.keys(drafts).length) set(next, 'local')
}

/** Các nháp ghi trước `before`, mới nhất trước. */
export function draftsBefore(map: DraftMap, before: number): LiftDraft[] {
  return Object.values(map)
    .filter((d) => d.updatedAt < before)
    .sort((a, b) => b.updatedAt - a.updatedAt)
}
