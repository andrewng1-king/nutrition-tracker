import { useRef, useState } from 'react'
import { n } from '../lib/format'
import { useData, useSync } from '../lib/hooks'
import { LIFT_GROUP_LABELS } from '../lib/lift'
import { computeTargets } from '../lib/macros'
import {
  deleteTemplate,
  deleteWorkoutTemplate,
  downloadBackup,
  importJSON,
  resetAll,
  setSettings,
} from '../lib/storage'
import { sendLoginCode, signOut, syncNow, verifyLoginCode } from '../lib/sync'

const WEEKDAY_OPTIONS = [
  [1, 'T2'],
  [2, 'T3'],
  [3, 'T4'],
  [4, 'T5'],
  [5, 'T6'],
  [6, 'T7'],
  [0, 'CN'],
] as const

export function Settings() {
  const data = useData()
  const sync = useSync()
  const signedIn = Boolean(sync.email)
  const s = data.settings
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)

  const rest = computeTargets(s, { runDay: false, liftDay: false })
  const run = computeTargets(s, { runDay: true, liftDay: false })

  const toggleWeekday = (d: number) => {
    const has = s.runDayWeekdays.includes(d)
    setSettings({
      runDayWeekdays: has
        ? s.runDayWeekdays.filter((x) => x !== d)
        : [...s.runDayWeekdays, d],
    })
  }

  return (
    <div className="screen">
      <h1 className="h1">Cài đặt</h1>

      <section className="card col">
        <h2 className="h2">Mục tiêu</h2>
        <div className="grid2">
          <div className="field">
            <label htmlFor="s-weight">Cân nặng (kg)</label>
            <input
              id="s-weight"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={s.weightKg}
              onChange={(e) => setSettings({ weightKg: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label htmlFor="s-ppk">Protein (g/kg)</label>
            <input
              id="s-ppk"
              type="number"
              inputMode="decimal"
              step="0.05"
              value={s.proteinPerKg}
              onChange={(e) => setSettings({ proteinPerKg: Number(e.target.value) })}
            />
          </div>
        </div>
        <p className="dim" style={{ margin: 0 }}>
          Protein mục tiêu = {n(s.weightKg, 1)} × {n(s.proteinPerKg, 2)} ={' '}
          <b>{rest.protein} g/ngày</b>. Đây là mức trần đã đủ — chỉ tăng khi cân nặng tăng.
          Vượt protein không sao; thiếu fat hoặc carb mới là vấn đề.
        </p>
      </section>

      <section className="card col">
        <h2 className="h2">Ngày chạy bộ</h2>
        <div className="chips">
          {WEEKDAY_OPTIONS.map(([d, label]) => (
            <button
              key={d}
              className="chip"
              aria-pressed={s.runDayWeekdays.includes(d)}
              onClick={() => toggleWeekday(d)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="field">
          <label htmlFor="s-run">Calo cộng thêm ngày chạy (350–600)</label>
          <input
            id="s-run"
            type="number"
            inputMode="numeric"
            step="25"
            value={s.runDayExtraKcal}
            onChange={(e) => setSettings({ runDayExtraKcal: Number(e.target.value) })}
          />
        </div>
        <p className="dim" style={{ margin: 0 }}>
          Cộng hết vào carb, không cộng protein.
        </p>
      </section>

      <section className="card">
        <h2 className="h2" style={{ marginBottom: 10 }}>
          Target đang áp dụng
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr className="dim">
              <th style={{ textAlign: 'left', fontWeight: 500, paddingBottom: 6 }}>Chất</th>
              <th style={{ textAlign: 'right', fontWeight: 500 }}>Ngày thường</th>
              <th style={{ textAlign: 'right', fontWeight: 500 }}>Ngày chạy</th>
            </tr>
          </thead>
          <tbody className="num">
            <TargetRow
              label="Calo"
              a={`${n(rest.kcalMin)}–${n(rest.kcalMax)}`}
              b={`${n(run.kcalMin)}–${n(run.kcalMax)}`}
            />
            <TargetRow label="Protein" a={`${rest.protein} g`} b={`${run.protein} g`} />
            <TargetRow label="Fat" a={`${rest.fat} g`} b={`${run.fat} g`} />
            <TargetRow label="Carb" a={`${rest.carb} g`} b={`${run.carb} g`} />
            <TargetRow
              label="Đường thêm"
              a={`< ${rest.addedSugarMax} g`}
              b={`< ${run.addedSugarMax} g`}
            />
          </tbody>
        </table>
        <p className="dim" style={{ marginBottom: 0 }}>
          Ngưỡng cảnh báo cố định: fat ≥ {rest.fatMin}g, carb ≥ {rest.carbMin}g, calo ≥{' '}
          {n(rest.kcalFloor)} kcal.
        </p>
      </section>

      <section className="card col">
        <h2 className="h2">Mẫu bữa ăn ({data.templates.length})</h2>
        {data.templates.length === 0 ? (
          <p className="empty" style={{ padding: '6px 0' }}>
            Chưa có mẫu nào.
          </p>
        ) : (
          <div className="list">
            {data.templates.map((t) => (
              <div key={t.id} className="list-item">
                <span className="grow truncate">{t.name}</span>
                <button className="btn sm danger" onClick={() => deleteTemplate(t.id)}>
                  Xoá
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card col">
        <h2 className="h2">Buổi tập mẫu ({(data.workoutTemplates ?? []).length})</h2>
        {(data.workoutTemplates ?? []).length === 0 ? (
          <p className="empty" style={{ padding: '6px 0' }}>
            Chưa có buổi mẫu nào. Log xong một buổi tạ, bấm “Lưu thành buổi mẫu”.
          </p>
        ) : (
          <div className="list">
            {(data.workoutTemplates ?? []).map((t) => (
              <div key={t.id} className="list-item">
                <span className="grow">
                  <span className="truncate" style={{ display: 'block' }}>
                    {t.name}
                  </span>
                  <span className="dim">
                    {t.mode === 'gym' ? 'Gym' : 'Calisthenic'}
                    {t.group ? ` · ${LIFT_GROUP_LABELS[t.group]}` : ''} · {t.items.length} bài
                  </span>
                </span>
                <button
                  className="btn sm danger"
                  onClick={() => {
                    if (confirm(`Xoá buổi mẫu “${t.name}”?`)) deleteWorkoutTemplate(t.id)
                  }}
                >
                  Xoá
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <SyncCard />

      <section className="card col">
        <h2 className="h2">Dữ liệu</h2>
        <p className="dim" style={{ margin: 0 }}>
          {signedIn
            ? 'Dữ liệu lưu trên máy và đồng bộ lên Supabase. Vẫn nên tải backup định kỳ.'
            : 'Dữ liệu chỉ nằm trên máy này. Xoá dữ liệu trình duyệt là mất — tải backup định kỳ hoặc đăng nhập đồng bộ ở trên.'}
        </p>
        <button className="btn full" onClick={downloadBackup}>
          Tải file backup (.json)
        </button>
        <button className="btn full" onClick={() => fileRef.current?.click()}>
          Nạp lại từ file backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            const result = importJSON(await file.text())
            setMessage(result.ok ? 'Đã nạp lại dữ liệu từ backup.' : result.error)
            e.target.value = ''
          }}
        />
        {message && (
          <p className="muted" style={{ margin: 0 }}>
            {message}
          </p>
        )}
        <button
          className="btn danger full"
          onClick={() => {
            if (
              confirm(
                signedIn
                  ? 'Xoá toàn bộ dữ liệu (log, món tự thêm, mẫu, số đo) trên máy này VÀ trên tài khoản Supabase? Không khôi phục được.'
                  : 'Xoá toàn bộ dữ liệu (log, món tự thêm, mẫu, số đo)? Không khôi phục được.',
              )
            ) {
              resetAll()
              setMessage('Đã xoá toàn bộ dữ liệu.')
            }
          }}
        >
          Xoá toàn bộ dữ liệu
        </button>
      </section>
    </div>
  )
}

const EMAIL_KEY = 'nutrition-tracker-login-email'

function readEmail(): string {
  try {
    return localStorage.getItem(EMAIL_KEY) ?? ''
  } catch {
    return ''
  }
}

/**
 * Đăng nhập bằng mã gửi qua email, không dùng magic link: trên iPhone, link
 * trong mail mở ra Safari chứ không mở app đã cài lên màn hình chính, nên phiên
 * đăng nhập nằm nhầm chỗ. Gõ mã thì đăng nhập ngay trong app.
 */
function SyncCard() {
  const sync = useSync()
  const [email, setEmail] = useState(readEmail)
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  if (!sync.configured) {
    return (
      <section className="card col">
        <h2 className="h2">Đồng bộ Supabase</h2>
        <p className="dim" style={{ margin: 0 }}>
          Chưa cấu hình. Điền <b>VITE_SUPABASE_URL</b> và <b>VITE_SUPABASE_PUBLISHABLE_KEY</b>{' '}
          rồi build lại — làm theo SUPABASE.md trong mã nguồn.
        </p>
      </section>
    )
  }

  const run = async (task: () => Promise<string | null>, ok?: () => void) => {
    setBusy(true)
    setMessage(null)
    const error = await task()
    setBusy(false)
    if (error) setMessage(error)
    else ok?.()
  }

  if (!sync.email) {
    return (
      <section className="card col">
        <h2 className="h2">Đồng bộ Supabase</h2>
        <p className="dim" style={{ margin: 0 }}>
          Đăng nhập để lưu dữ liệu lên Supabase và dùng trên nhiều máy. App vẫn chạy
          offline như cũ, có mạng thì tự đồng bộ.
        </p>
        <div className="field">
          <label htmlFor="sync-email">Email</label>
          <input
            id="sync-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setSent(false)
            }}
            placeholder="ban@email.com"
          />
        </div>
        {sent && (
          <div className="field">
            <label htmlFor="sync-code">Mã trong email</label>
            <input
              id="sync-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              autoFocus
            />
          </div>
        )}
        {sent ? (
          <>
            <button
              className="btn primary full"
              disabled={busy || code.length < 6}
              onClick={() => run(() => verifyLoginCode(email.trim(), code))}
            >
              {busy ? 'Đang kiểm tra…' : 'Đăng nhập'}
            </button>
            <button
              className="btn full"
              disabled={busy}
              onClick={() => run(() => sendLoginCode(email.trim()))}
            >
              Gửi lại mã
            </button>
          </>
        ) : (
          <button
            className="btn primary full"
            disabled={busy || !/^\S+@\S+\.\S+$/.test(email.trim())}
            onClick={() =>
              run(
                () => sendLoginCode(email.trim()),
                () => {
                  setSent(true)
                  setCode('')
                  try {
                    localStorage.setItem(EMAIL_KEY, email.trim())
                  } catch {
                    // không nhớ được email thì lần sau gõ lại, không sao
                  }
                },
              )
            }
          >
            {busy ? 'Đang gửi…' : 'Gửi mã đăng nhập'}
          </button>
        )}
        {message && (
          <p className="muted" style={{ margin: 0, color: 'var(--warn)' }}>
            {message}
          </p>
        )}
      </section>
    )
  }

  const statusText =
    sync.status === 'syncing'
      ? 'Đang đồng bộ…'
      : sync.status === 'offline'
        ? 'Mất mạng — dữ liệu vẫn lưu trên máy, có mạng lại sẽ tự đẩy lên.'
        : sync.status === 'error'
          ? `Lỗi đồng bộ: ${sync.error ?? 'không rõ'}`
          : sync.pending > 0
            ? `Còn ${sync.pending} mục chờ đẩy lên.`
            : sync.lastSyncAt
              ? `Đã đồng bộ lúc ${new Date(sync.lastSyncAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}.`
              : 'Đã đăng nhập.'

  return (
    <section className="card col">
      <h2 className="h2">Đồng bộ Supabase</h2>
      <p style={{ margin: 0 }}>{sync.email}</p>
      <p
        className="muted"
        style={{ margin: 0, color: sync.status === 'error' ? 'var(--warn)' : undefined }}
      >
        {statusText}
      </p>
      <div className="grid2">
        <button
          className="btn full"
          disabled={sync.status === 'syncing'}
          onClick={() => void syncNow()}
        >
          Đồng bộ ngay
        </button>
        <button className="btn full" onClick={() => void signOut()}>
          Đăng xuất
        </button>
      </div>
      <p className="dim" style={{ margin: 0 }}>
        Đăng xuất chỉ ngắt đồng bộ, dữ liệu trên máy giữ nguyên.
      </p>
    </section>
  )
}

function TargetRow({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <tr style={{ borderTop: '1px solid var(--line)' }}>
      <td style={{ padding: '7px 0' }}>{label}</td>
      <td style={{ textAlign: 'right' }}>{a}</td>
      <td style={{ textAlign: 'right' }}>{b}</td>
    </tr>
  )
}
