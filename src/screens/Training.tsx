import { useEffect, useMemo, useState } from 'react'
import { ExerciseForm } from '../components/ExerciseForm'
import { ExerciseList } from '../components/ExerciseList'
import { IconCheck, IconChevron } from '../components/icons'
import { LiftSession } from '../components/LiftSession'
import { Page } from '../components/Page'
import { ProgressSheet } from '../components/ProgressSheet'
import { RunProgress } from '../components/RunProgress'
import { SessionReview } from '../components/SessionReview'
import { Sheet } from '../components/Sheet'
import { Strength } from '../components/Strength'
import { SubTabs } from '../components/SubTabs'
import type { LiftDraft } from '../lib/draft'
import { dayLabel, n } from '../lib/format'
import { useData } from '../lib/hooks'
import { isSessionLocked, liftDates, summarize, volumeShort } from '../lib/lift'
import { dateKey } from '../lib/macros'
import { sessionLabel } from '../lib/muscles'
import { allExercises, exerciseMap, getDay, setLiftDone } from '../lib/storage'
import type { Exercise, LiftMode } from '../lib/types'

type Sub = LiftMode | 'run'

const SUBS: [Sub, string][] = [
  ['gym', 'Gym'],
  ['calisthenic', 'Calisthenic'],
  ['run', 'Run'],
]

export function Training({
  onOpenDay,
  resume,
  onResumed,
}: {
  onOpenDay: (date: string) => void
  /** bản nháp người dùng vừa chọn "Tiếp tục" lúc mở app */
  resume?: LiftDraft | null
  onResumed?: () => void
}) {
  const [sub, setSub] = useState<Sub>(resume?.mode ?? 'gym')

  useEffect(() => {
    if (resume) setSub(resume.mode)
  }, [resume])

  return (
    <div className="screen">
      <h1 className="h1">Bài tập</h1>
      <SubTabs tabs={SUBS} active={sub} onSelect={setSub} label="Loại bài tập" />
      {sub === 'run' ? (
        <RunProgress onOpenDay={onOpenDay} />
      ) : (
        <LiftModeView
          key={sub}
          mode={sub}
          resume={resume?.mode === sub ? resume : null}
          onResumed={onResumed}
        />
      )}
    </div>
  )
}

function LiftModeView({
  mode,
  resume,
  onResumed,
}: {
  mode: LiftMode
  resume: LiftDraft | null
  onResumed?: () => void
}) {
  const data = useData()
  const today = dateKey()
  const day = getDay(today, data)
  const exById = useMemo(() => exerciseMap(data), [data])

  const [session, setSession] = useState<{ date: string; exerciseId?: string } | null>(null)
  const [review, setReview] = useState<string | null>(null)
  const [browsing, setBrowsing] = useState(false)
  const [editing, setEditing] = useState<Exercise | null>(null)
  const [creating, setCreating] = useState(false)
  const [progress, setProgress] = useState<Exercise | null>(null)
  const exerciseCount = useMemo(
    () => allExercises(data).filter((ex) => ex.mode === mode).length,
    [data, mode],
  )

  // Buổi đã chốt thì bấm vào chỉ xem tổng kết; buổi còn mở thì vào thẳng trang sửa.
  const openDate = (date: string) => {
    if (isSessionLocked(data.days[date], mode, exById, today)) setReview(date)
    else setSession({ date })
  }

  // Nhận bản nháp một lần rồi báo lại cho App — mở thẳng bảng nhập set đang dở.
  useEffect(() => {
    if (!resume) return
    setSession({ date: resume.date, exerciseId: resume.exerciseId })
    onResumed?.()
  }, [resume, onResumed])

  // Buổi hôm nay chỉ tính phần thuộc đúng chế độ đang xem.
  const todaysLifts = (day.lifts ?? []).filter(
    (e) => exById.get(e.exerciseId)?.mode === mode,
  )
  const todaysPlan = (day.plan ?? []).filter((p) => exById.get(p.exerciseId)?.mode === mode)
  const summary = summarize(todaysLifts, exById, data.settings.weightKg)
  const label = sessionLabel(todaysLifts.length > 0 ? todaysLifts : todaysPlan, exById)
  const locked = isSessionLocked(day, mode, exById, today)

  return (
    <>
      <section className="card">
        <div className="between" style={{ marginBottom: 10 }}>
          <h2 className="h2">
            {dayLabel(today)}
            {label ? ` · ${label}` : ''}
          </h2>
          {todaysLifts.length > 0 && (
            <span className="dim num">{volumeShort(summary.volume)} kg</span>
          )}
        </div>

        {todaysLifts.length === 0 ? (
          <p className="empty" style={{ padding: '10px 0 14px' }}>
            {todaysPlan.length > 0
              ? `Đã lên kế hoạch ${todaysPlan.length} bài — mở ra tick từng set.`
              : 'Hôm nay chưa log buổi nào.'}
          </p>
        ) : (
          <div className="grid4" style={{ textAlign: 'center', marginBottom: 12 }}>
            <Stat label="bài" value={n(summary.exercises)} />
            <Stat label="set" value={n(summary.sets)} />
            <Stat label="rep" value={n(summary.reps)} />
            <Stat label="volume" value={volumeShort(summary.volume)} />
          </div>
        )}

        {locked ? (
          <button className="btn full done-cta" onClick={() => setReview(today)}>
            <IconCheck className="ico" />
            Đã hoàn thành · Xem tổng kết
          </button>
        ) : (
          <button className="btn primary full" onClick={() => setSession({ date: today })}>
            {todaysLifts.length > 0 || todaysPlan.length > 0
              ? 'Tiếp tục buổi hôm nay'
              : 'Bắt đầu buổi tập hôm nay'}
          </button>
        )}
      </section>

      <Strength mode={mode} />

      <SessionHistory mode={mode} onOpen={openDate} />

      <button className="card list-link" onClick={() => setBrowsing(true)}>
        <span className="h2">Danh sách bài · {exerciseCount}</span>
        <IconChevron className="ico" />
      </button>

      {browsing && (
        <Page
          title="Danh sách bài"
          onBack={() => setBrowsing(false)}
          action={
            <button className="btn sm" onClick={() => setCreating(true)}>
              + Bài mới
            </button>
          }
        >
          <ExerciseList mode={mode} onOpen={setEditing} onProgress={setProgress} />
        </Page>
      )}

      {review && (
        <SessionReview
          date={review}
          mode={mode}
          onClose={() => setReview(null)}
          onEdit={() => {
            // Hôm nay: bỏ dấu chốt, sửa xong bấm Hoàn thành lại. Ngày đã qua tự chốt lại.
            setLiftDone(review, mode, false)
            setSession({ date: review })
            setReview(null)
          }}
        />
      )}

      {session && (
        <LiftSession
          key={`${session.date}-${session.exerciseId ?? ''}`}
          date={session.date}
          mode={mode}
          initialExerciseId={session.exerciseId}
          onClose={() => setSession(null)}
        />
      )}

      {progress && <ProgressSheet ex={progress} onClose={() => setProgress(null)} />}

      {(editing || creating) && (
        <Sheet
          title={editing ? 'Sửa bài tập' : 'Bài tập mới'}
          onClose={() => {
            setEditing(null)
            setCreating(false)
          }}
        >
          <ExerciseForm
            key={editing?.id ?? 'new'}
            existing={editing ?? undefined}
            defaultGroup={editing?.group ?? (mode === 'calisthenic' ? 'back' : 'chest')}
            mode={mode}
            onDone={() => {
              setEditing(null)
              setCreating(false)
            }}
            onCancel={() => {
              setEditing(null)
              setCreating(false)
            }}
          />
        </Sheet>
      )}
    </>
  )
}

const PAGE = 6

/** Các buổi đã tập, mới nhất trước. Bấm vào để xem tổng kết (buổi đã chốt) hoặc mở sửa tiếp. */
function SessionHistory({ mode, onOpen }: { mode: LiftMode; onOpen: (date: string) => void }) {
  const data = useData()
  const exById = useMemo(() => exerciseMap(data), [data])
  const [limit, setLimit] = useState(PAGE)
  const dates = useMemo(
    () => liftDates(data, mode, exById).reverse(),
    [data, mode, exById],
  )

  if (dates.length === 0) return null

  return (
    <section className="card">
      <h2 className="h2" style={{ marginBottom: 4 }}>
        Các buổi đã tập · {dates.length}
      </h2>
      <div className="list">
        {dates.slice(0, limit).map((date) => {
          const day = data.days[date]
          const entries = (day?.lifts ?? []).filter(
            (e) => exById.get(e.exerciseId)?.mode === mode,
          )
          const s = summarize(entries, exById, data.settings.weightKg)
          const names = entries.flatMap((e) => exById.get(e.exerciseId)?.name ?? [])
          const label = sessionLabel(entries, exById)
          return (
            <button key={date} className="list-item" onClick={() => onOpen(date)}>
              <span className="grow">
                <span className="truncate lift-name" style={{ display: 'block' }}>
                  {dayLabel(date)}
                  {label ? ` · ${label}` : ''}
                  <span className="dim"> · {s.exercises} bài · {s.sets} set</span>
                </span>
                <span className="dim truncate" style={{ display: 'block' }}>
                  {names.join(', ')}
                </span>
              </span>
              <span className="entry-kcal">
                {volumeShort(s.volume)}
                <br />
                <span className="dim">kg</span>
              </span>
            </button>
          )
        })}
      </div>
      {dates.length > limit && (
        <button className="btn sm full" onClick={() => setLimit((l) => l + PAGE * 2)}>
          Xem thêm {Math.min(PAGE * 2, dates.length - limit)} buổi
        </button>
      )}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="num" style={{ fontSize: 18, fontWeight: 700 }}>
        {value}
      </div>
      <div className="dim">{label}</div>
    </div>
  )
}
