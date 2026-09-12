import type { Session } from '@supabase/supabase-js'
import { draftStore, type DraftMap } from './draft'
import { blankData, store } from './storage'
import { supabase } from './supabase'
import {
  changedDays,
  hasLocalData,
  mergeFirstSync,
  mergeRemoteDays,
  metaChanged,
  metaOf,
  type MetaData,
  type RemoteDay,
} from './syncCore'

/**
 * Đồng bộ với Supabase theo kiểu local-first: mọi thao tác ghi vào máy trước
 * (chạy được khi phòng gym mất sóng), rồi đẩy lên sau ~1,5 giây. Kéo về khi mở
 * app, khi quay lại app, khi có mạng lại và mỗi 90 giây lúc đang mở.
 */

const META_KEY = 'nutrition-tracker-sync'
const PAGE = 1000
const PUSH_DELAY = 1500
const POLL_MS = 90_000

interface SyncMeta {
  /** tài khoản mà các cờ bên dưới thuộc về — đổi tài khoản là làm lại từ đầu */
  userId?: string
  /** ngày -> lúc sửa trên máy, chờ đẩy lên */
  dirtyDays: Record<string, number>
  metaDirtyAt?: number
  /** updated_at của bản app_state mà máy đang giữ */
  metaSeenAt?: number
  draftDirtyAt?: number
  draftSeenAt?: number
  /** synced_at lớn nhất đã kéo về của bảng days */
  cursor?: string
  lastSyncAt?: number
}

export type SyncStatus = 'off' | 'signed-out' | 'idle' | 'syncing' | 'offline' | 'error'

export interface SyncState {
  configured: boolean
  email?: string
  status: SyncStatus
  error?: string
  lastSyncAt?: number
  /** số ngày + phần cài đặt đang chờ đẩy lên */
  pending: number
  /** lần đầu đăng nhập: máy và tài khoản đều có dữ liệu, chờ người dùng chọn */
  choice?: { remoteDays: number; localDays: number }
}

function loadMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (raw) return { dirtyDays: {}, ...(JSON.parse(raw) as Partial<SyncMeta>) }
  } catch {
    // hỏng thì làm lại từ đầu — tệ nhất là đẩy lại vài ngày
  }
  return { dirtyDays: {} }
}

let meta: SyncMeta = loadMeta()

function saveMeta() {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta))
  } catch (err) {
    console.error('Không lưu được trạng thái đồng bộ', err)
  }
}

const pendingCount = () =>
  Object.keys(meta.dirtyDays).length + (meta.metaDirtyAt ? 1 : 0)

let state: SyncState = {
  configured: Boolean(supabase),
  status: supabase ? 'signed-out' : 'off',
  pending: pendingCount(),
  lastSyncAt: meta.lastSyncAt,
}
const listeners = new Set<() => void>()

function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export const syncStore = {
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
  get: () => state,
}

let userId: string | null = null
let running = false
let again = false
let pushTimer: ReturnType<typeof setTimeout> | undefined
let pollTimer: ReturnType<typeof setInterval> | undefined
let firstSyncData: { meta: RemoteMeta | null; days: RemoteDayRow[] } | null = null

interface RemoteDayRow extends RemoteDay {
  synced_at: string
}

interface RemoteMeta {
  data: MetaData
  updated_at: number
}

function describe(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/expired|invalid/i.test(msg) && /token|otp/i.test(msg)) return 'Mã sai hoặc đã hết hạn.'
  if (/rate limit/i.test(msg)) return 'Gửi mã quá nhiều lần — đợi vài phút rồi thử lại.'
  // Supabase nhận yêu cầu nhưng phía gửi mail hỏng: chưa có SMTP riêng, hoặc email
  // đích không phải thành viên project (dịch vụ mail sẵn có chỉ gửi nội bộ).
  if (/error sending/i.test(msg) && /email|mail/i.test(msg))
    return 'Supabase không gửi được email — xem mục SMTP trong SUPABASE.md.'
  if (/signups? not allowed/i.test(msg)) return 'Email này chưa có tài khoản (đăng ký mới đang tắt).'
  if (/failed to fetch|network/i.test(msg)) return 'Không kết nối được Supabase.'
  return msg
}

// ---------------- đọc / ghi Supabase ----------------

async function fetchDays(after?: string): Promise<RemoteDayRow[]> {
  const out: RemoteDayRow[] = []
  let cursor = after
  for (;;) {
    let query = supabase!
      .from('days')
      .select('date,data,updated_at,synced_at')
      .order('synced_at', { ascending: true })
      .limit(PAGE)
    if (cursor) query = query.gt('synced_at', cursor)
    const { data, error } = await query
    if (error) throw error
    const rows = (data ?? []) as RemoteDayRow[]
    out.push(...rows)
    if (rows.length < PAGE) return out
    cursor = rows[rows.length - 1].synced_at
  }
}

async function fetchMeta(): Promise<RemoteMeta | null> {
  const { data, error } = await supabase!
    .from('app_state')
    .select('data,updated_at')
    .maybeSingle()
  if (error) throw error
  return (data as RemoteMeta | null) ?? null
}

async function fetchDrafts(): Promise<{ data: DraftMap | null; updated_at: number } | null> {
  const { data, error } = await supabase!.from('drafts').select('data,updated_at').maybeSingle()
  if (error) throw error
  return data ?? null
}

async function pull() {
  const rows = await fetchDays(meta.cursor)
  if (rows.length > 0) {
    const merged = mergeRemoteDays(store.get().days, rows, meta.dirtyDays)
    meta.dirtyDays = merged.dirty
    if (merged.changed) store.applyRemote((d) => ({ ...d, days: merged.days }))
    meta.cursor = rows[rows.length - 1].synced_at
  }

  const remoteMeta = await fetchMeta()
  if (
    remoteMeta &&
    remoteMeta.updated_at > (meta.metaSeenAt ?? 0) &&
    !(meta.metaDirtyAt && meta.metaDirtyAt > remoteMeta.updated_at)
  ) {
    store.applyRemote((d) => ({ ...d, ...remoteMeta.data }))
    meta.metaSeenAt = remoteMeta.updated_at
    meta.metaDirtyAt = undefined
  }

  const remoteDrafts = await fetchDrafts()
  if (
    remoteDrafts &&
    remoteDrafts.updated_at > (meta.draftSeenAt ?? 0) &&
    !(meta.draftDirtyAt && meta.draftDirtyAt > remoteDrafts.updated_at)
  ) {
    draftStore.applyRemote(remoteDrafts.data)
    meta.draftSeenAt = remoteDrafts.updated_at
    meta.draftDirtyAt = undefined
  }
  saveMeta()
}

async function push() {
  const uid = userId!
  const entries = Object.entries(meta.dirtyDays)
  for (let i = 0; i < entries.length; i += 500) {
    const chunk = entries.slice(i, i + 500)
    const days = store.get().days
    const { error } = await supabase!.from('days').upsert(
      chunk.map(([date, ts]) => ({
        user_id: uid,
        date,
        data: days[date] ?? null,
        updated_at: ts,
      })),
      { onConflict: 'user_id,date' },
    )
    if (error) throw error
    // Sửa tiếp trong lúc đang đẩy thì mốc giờ đã đổi — giữ cờ để đẩy lượt sau.
    for (const [date, ts] of chunk) if (meta.dirtyDays[date] === ts) delete meta.dirtyDays[date]
    saveMeta()
  }

  if (meta.metaDirtyAt) {
    const ts = meta.metaDirtyAt
    const { error } = await supabase!
      .from('app_state')
      .upsert({ user_id: uid, data: metaOf(store.get()), updated_at: ts })
    if (error) throw error
    meta.metaSeenAt = Math.max(meta.metaSeenAt ?? 0, ts)
    if (meta.metaDirtyAt === ts) meta.metaDirtyAt = undefined
    saveMeta()
  }

  if (meta.draftDirtyAt) {
    const ts = meta.draftDirtyAt
    const drafts = draftStore.get()
    const { error } = await supabase!.from('drafts').upsert({
      user_id: uid,
      data: Object.keys(drafts).length > 0 ? drafts : null,
      updated_at: ts,
    })
    if (error) throw error
    meta.draftSeenAt = Math.max(meta.draftSeenAt ?? 0, ts)
    if (meta.draftDirtyAt === ts) meta.draftDirtyAt = undefined
    saveMeta()
  }
}

const lastCursor = (rows: RemoteDayRow[]) =>
  rows.length > 0 ? rows[rows.length - 1].synced_at : undefined

/**
 * Lần đầu tài khoản này đồng bộ trên máy này. Trả về false khi phải chờ người
 * dùng chọn giữa dữ liệu máy và dữ liệu tài khoản.
 */
async function firstSync(uid: string): Promise<boolean> {
  const [remoteMeta, remoteDays] = await Promise.all([fetchMeta(), fetchDays()])
  const local = store.get()
  const now = Date.now()

  if (!remoteMeta && remoteDays.length === 0) {
    // Tài khoản mới tinh: đẩy toàn bộ máy này lên.
    meta = {
      userId: uid,
      dirtyDays: Object.fromEntries(Object.keys(local.days).map((d) => [d, now])),
      metaDirtyAt: now,
      draftDirtyAt: Object.keys(draftStore.get()).length > 0 ? now : undefined,
    }
    saveMeta()
    return true
  }

  if (!hasLocalData(local)) {
    adoptRemote(uid, remoteMeta, remoteDays)
    return true
  }

  firstSyncData = { meta: remoteMeta, days: remoteDays }
  setState({
    choice: {
      remoteDays: remoteDays.filter((r) => r.data).length,
      localDays: Object.keys(local.days).length,
    },
  })
  return false
}

function adoptRemote(uid: string, remoteMeta: RemoteMeta | null, remoteDays: RemoteDayRow[]) {
  const days = Object.fromEntries(
    remoteDays.flatMap((r) => (r.data ? [[r.date, r.data] as const] : [])),
  )
  store.applyRemote(() => ({ ...blankData(), ...(remoteMeta?.data ?? {}), days }))
  meta = {
    userId: uid,
    dirtyDays: {},
    metaSeenAt: remoteMeta?.updated_at,
    cursor: lastCursor(remoteDays),
  }
  saveMeta()
}

/** Người dùng trả lời câu hỏi lần đầu đăng nhập. */
export function resolveFirstSync(kind: 'remote' | 'merge') {
  const pendingData = firstSyncData
  const uid = userId
  if (!pendingData || !uid) return
  firstSyncData = null
  if (kind === 'remote') {
    adoptRemote(uid, pendingData.meta, pendingData.days)
  } else {
    const now = Date.now()
    const merged = mergeFirstSync(store.get(), pendingData.meta?.data ?? null, pendingData.days, now)
    store.applyRemote(() => merged.data)
    meta = {
      userId: uid,
      dirtyDays: merged.dirtyDays,
      metaDirtyAt: now,
      metaSeenAt: pendingData.meta?.updated_at,
      // gộp thì nháp đang dở trên máy này cũng được giữ, không để bản tài khoản đè
      draftDirtyAt: Object.keys(draftStore.get()).length > 0 ? now : undefined,
      cursor: lastCursor(pendingData.days),
    }
    saveMeta()
  }
  setState({ choice: undefined, pending: pendingCount() })
  void syncNow()
}

export async function syncNow(): Promise<void> {
  if (!supabase || !userId || state.choice) return
  if (running) {
    again = true
    return
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setState({ status: 'offline' })
    return
  }
  running = true
  setState({ status: 'syncing', error: undefined })
  try {
    if (meta.userId !== userId) {
      const ready = await firstSync(userId)
      if (!ready) {
        setState({ status: 'idle' })
        return
      }
    }
    await pull()
    await push()
    meta.lastSyncAt = Date.now()
    saveMeta()
    setState({ status: 'idle', lastSyncAt: meta.lastSyncAt, pending: pendingCount() })
  } catch (err) {
    setState({
      status: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error',
      error: describe(err),
      pending: pendingCount(),
    })
  } finally {
    running = false
    if (again) {
      again = false
      void syncNow()
    }
  }
}

function schedulePush() {
  if (!userId) return
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => void syncNow(), PUSH_DELAY)
}

function handleSession(session: Session | null) {
  const next = session?.user.id ?? null
  if (next === userId) return
  userId = next
  clearInterval(pollTimer)
  if (!session) {
    firstSyncData = null
    setState({ status: 'signed-out', email: undefined, choice: undefined, error: undefined })
    return
  }
  setState({ status: 'idle', email: session.user.email ?? undefined })
  pollTimer = setInterval(() => {
    if (document.visibilityState === 'visible') void syncNow()
  }, POLL_MS)
  void syncNow()
}

let started = false

/** Gọi một lần lúc khởi động app. Không cấu hình Supabase thì không làm gì. */
export function initSync() {
  if (!supabase || started) return
  started = true

  store.onCommit((prev, next, origin) => {
    if (origin === 'remote') return
    const now = Date.now()
    for (const date of changedDays(prev, next)) meta.dirtyDays[date] = now
    if (metaChanged(prev, next)) meta.metaDirtyAt = now
    saveMeta()
    setState({ pending: pendingCount() })
    schedulePush()
  })

  draftStore.onChange((origin) => {
    if (origin === 'remote') return
    meta.draftDirtyAt = Date.now()
    saveMeta()
    schedulePush()
  })

  // Không gọi hàm supabase khác ngay trong callback này — thư viện đang giữ khoá
  // phiên đăng nhập, gọi lồng vào là treo. Đẩy sang lượt event loop sau.
  supabase.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => handleSession(session), 0)
  })

  window.addEventListener('online', () => void syncNow())
  document.addEventListener('visibilitychange', () => {
    // Ẩn app: đẩy ngay, vì điện thoại có thể giết app bất cứ lúc nào sau đó.
    // Hiện lại: kéo về xem máy khác có sửa gì không.
    void syncNow()
  })
}

// ---------------- đăng nhập bằng mã email ----------------

export async function sendLoginCode(email: string): Promise<string | null> {
  if (!supabase) return 'Chưa cấu hình Supabase.'
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })
  return error ? describe(error) : null
}

export async function verifyLoginCode(email: string, token: string): Promise<string | null> {
  if (!supabase) return 'Chưa cấu hình Supabase.'
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  return error ? describe(error) : null
}

/** Đăng xuất chỉ ngắt đồng bộ — dữ liệu trên máy giữ nguyên. */
export async function signOut() {
  await syncNow()
  await supabase?.auth.signOut()
}
