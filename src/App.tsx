import { useCallback, useState, type ComponentType } from 'react'
import { DevTools } from './components/DevTools'
import { IconCloud, IconLift, IconProfile, IconSettings, IconToday } from './components/icons'
import { Popup } from './components/Popup'
import { BOOT_AT, clearDraftsBefore, draftsBefore, type LiftDraft } from './lib/draft'
import { dayLabel, n } from './lib/format'
import { useDrafts, useSync } from './lib/hooks'
import { dateKey } from './lib/macros'
import { downloadBackup } from './lib/storage'
import { resolveFirstSync } from './lib/sync'
import { Profile } from './screens/Profile'
import { Settings } from './screens/Settings'
import { Today } from './screens/Today'
import { Training } from './screens/Training'

type Tab = 'today' | 'training' | 'profile' | 'settings'

const TABS: [Tab, ComponentType<{ className?: string }>, string][] = [
  ['today', IconToday, 'Hôm nay'],
  ['training', IconLift, 'Bài tập'],
  ['profile', IconProfile, 'Profile'],
  ['settings', IconSettings, 'Cài đặt'],
]

export default function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [date, setDate] = useState(dateKey())
  const [resume, setResume] = useState<LiftDraft | null>(null)
  const [resumeAsked, setResumeAsked] = useState(false)
  const drafts = useDrafts()
  const sync = useSync()
  const clearResume = useCallback(() => setResume(null), [])

  // Nháp ghi từ lần mở app trước (app bị tắt giữa buổi) — hỏi một lần lúc mở.
  const stale = draftsBefore(drafts, BOOT_AT)

  const openDay = (d: string) => {
    setDate(d)
    setTab('today')
  }

  return (
    <div className="app">
      {tab === 'today' && <Today date={date} setDate={setDate} />}
      {tab === 'training' && (
        <Training onOpenDay={openDay} resume={resume} onResumed={clearResume} />
      )}
      {tab === 'profile' && <Profile onOpenDay={openDay} />}
      {tab === 'settings' && <Settings />}

      <DevTools
        onSeeded={() => {
          // Dữ liệu mẫu đổ vào 7 ngày gần nhất — kéo màn hình về hôm nay để thấy ngay.
          setDate(dateKey())
          setTab('today')
        }}
      />

      <nav className="tabbar">
        {TABS.map(([key, Icon, label]) => (
          <button
            key={key}
            aria-current={tab === key ? 'page' : undefined}
            onClick={() => {
              if (key === 'today') setDate(dateKey())
              setTab(key)
            }}
          >
            <Icon className="ico" />
            {label}
          </button>
        ))}
      </nav>

      {sync.choice ? (
        <FirstSyncChoice {...sync.choice} />
      ) : (
        !resumeAsked &&
        stale.length > 0 && (
          <Popup label="Bài đang tập dở" onClose={() => setResumeAsked(true)}>
            <IconLift className="popup-ico neutral" />
            <p style={{ margin: 0, textAlign: 'center', fontWeight: 600 }}>
              Bạn đang tập dở “{stale[0].exerciseName}”, tiếp tục không?
            </p>
            <p className="dim" style={{ margin: 0, textAlign: 'center' }}>
              {dayLabel(stale[0].date)} · nháp lúc {clock(stale[0].updatedAt)}
              {stale.length > 1 ? ` · còn ${stale.length - 1} bài khác đang dở` : ''}
            </p>
            <div className="grid2">
              <button
                className="btn full"
                onClick={() => {
                  clearDraftsBefore(BOOT_AT)
                  setResumeAsked(true)
                }}
              >
                Bỏ nháp
              </button>
              <button
                className="btn primary full"
                onClick={() => {
                  setResume(stale[0])
                  setTab('training')
                  setResumeAsked(true)
                }}
              >
                Tiếp tục
              </button>
            </div>
          </Popup>
        )
      )}
    </div>
  )
}

const clock = (ts: number) =>
  new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

/**
 * Lần đầu đăng nhập trên máy đã có dữ liệu, mà tài khoản cũng đã có dữ liệu.
 * Bắt buộc chọn — tự đoán sai là hoặc mất dữ liệu máy, hoặc trộn dữ liệu mẫu
 * vào tài khoản thật.
 */
function FirstSyncChoice({ remoteDays, localDays }: { remoteDays: number; localDays: number }) {
  return (
    <Popup label="Chọn dữ liệu để đồng bộ" onClose={() => {}}>
      <IconCloud className="popup-ico neutral" />
      <h2 className="h2">Tài khoản đã có dữ liệu</h2>
      <p className="dim" style={{ margin: 0, textAlign: 'center' }}>
        Tài khoản có {n(remoteDays)} ngày đã log, máy này có {n(localDays)} ngày. Chọn cách
        ghép:
      </p>
      <button className="btn primary full" onClick={() => resolveFirstSync('remote')}>
        Dùng dữ liệu tài khoản
      </button>
      <p className="dim" style={{ margin: 0, textAlign: 'center' }}>
        Bỏ dữ liệu trên máy này, lấy nguyên bản trên Supabase.
      </p>
      <button className="btn full" onClick={() => resolveFirstSync('merge')}>
        Gộp cả hai
      </button>
      <p className="dim" style={{ margin: 0, textAlign: 'center' }}>
        Giữ các ngày chỉ máy này có; ngày trùng lấy bản tài khoản.
      </p>
      <button className="btn sm" onClick={downloadBackup}>
        Tải file backup máy này trước
      </button>
    </Popup>
  )
}
