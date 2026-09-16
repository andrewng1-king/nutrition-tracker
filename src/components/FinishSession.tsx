import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { clearDrafts, draftStore } from '../lib/draft'
import { n, shortDate, weekday } from '../lib/format'
import { useData } from '../lib/hooks'
import {
  compareWithPrevious,
  entryVolume,
  isBodyweight,
  sessionPrs,
  summarize,
  volumeShort,
} from '../lib/lift'
import {
  GROUP_COLOR,
  LIFT_GROUP_LABELS,
  groupVolumes,
  sessionLabel,
  subColor,
  subKeyLabel,
  type GroupVolume,
} from '../lib/muscles'
import { doneSets, pendingIndexes } from '../lib/setRows'
import { clearPlan, exerciseMap, getDay, setLiftDone, setLiftEntry } from '../lib/storage'
import { flushSync } from '../lib/sync'
import type { LiftGroup, LiftMode } from '../lib/types'
import { Popup } from './Popup'
import { Stat } from './Stat'

/** 'start' = không có gì phải hỏi, dọn dẹp rồi quay luôn */
type Step = 'confirm' | 'start' | 'saving' | 'done'

/** Vòng quay tối thiểu — lưu trên máy xong tức thì, loading nháy một cái trông như lỗi. */
const MIN_SPIN_MS = 700

/**
 * Bấm "Hoàn thành buổi tập": gom nốt set đã điền mà chưa tick, dọn kế hoạch, đẩy
 * lên Supabase (vòng quay chờ đúng lượt đồng bộ đó), rồi hiện dấu tick và tổng
 * kết buổi.
 */
export function FinishSession({
  date,
  mode,
  onCancel,
  onDone,
}: {
  date: string
  mode: LiftMode
  onCancel: () => void
  /** đóng popup và đóng luôn trang buổi tập */
  onDone: () => void
}) {
  const data = useData()
  const exById = useMemo(() => exerciseMap(data), [data])

  // Chụp lại phần chưa tick lúc mở popup — nháp không đổi trong lúc popup đang mở.
  const [leftover] = useState(() => {
    const drafts = Object.values(draftStore.get()).filter(
      (d) => d.date === date && exById.get(d.exerciseId)?.mode === mode,
    )
    const pendingSets = drafts.reduce((sum, d) => {
      const ex = exById.get(d.exerciseId)
      return sum + (ex ? pendingIndexes(d.rows, isBodyweight(ex)).length : 0)
    }, 0)
    return { drafts, pendingSets }
  })
  const day = getDay(date, data)
  const inMode = (id: string) => exById.get(id)?.mode === mode
  const lifts = (day.lifts ?? []).filter((e) => inMode(e.exerciseId))
  const plan = (day.plan ?? []).filter((p) => inMode(p.exerciseId))
  const unplayed = plan.filter(
    (p) =>
      !lifts.some((e) => e.exerciseId === p.exerciseId) &&
      !leftover.drafts.some((d) => d.exerciseId === p.exerciseId),
  ).length

  const needsConfirm = leftover.pendingSets > 0 || unplayed > 0
  const [step, setStep] = useState<Step>(needsConfirm ? 'confirm' : 'start')
  const [synced, setSynced] = useState<'synced' | 'pending' | 'local'>('local')

  const save = (tickPending: boolean) => {
    if (tickPending) {
      for (const d of leftover.drafts) {
        const ex = exById.get(d.exerciseId)
        if (!ex) continue
        const body = isBodyweight(ex)
        const pending = pendingIndexes(d.rows, body)
        const rows = d.rows.map((r, i) => (pending.includes(i) ? { ...r, done: true } : r))
        setLiftEntry(date, d.exerciseId, doneSets(rows, body))
      }
    }
    // Set đã tick đã nằm trong log từ lúc tick — nháp chỉ còn phần bị bỏ.
    const ids = leftover.drafts.map((d) => d.exerciseId)
    clearDrafts(date, ids)
    // Buổi đã xong thì kế hoạch hết việc: bài chưa tập không còn treo "kế hoạch".
    if (plan.length > 0) clearPlan(date, plan.map((p) => p.exerciseId))
    // Chốt buổi: từ giờ bấm vào chỉ xem tổng kết, muốn sửa phải mở lại có xác nhận.
    setLiftDone(date, mode, true)
    setStep('saving')
  }

  useEffect(() => {
    if (step === 'start') save(false)
    if (step !== 'saving') return
    let alive = true
    const wait = new Promise((resolve) => setTimeout(resolve, MIN_SPIN_MS))
    void Promise.all([flushSync(), wait]).then(([result]) => {
      if (!alive) return
      setSynced(result)
      setStep('done')
    })
    return () => {
      alive = false
    }
  }, [step])

  const close = step === 'done' ? onDone : step === 'confirm' ? onCancel : () => {}

  return (
    <Popup label="Hoàn thành buổi tập" onClose={close}>
      {step === 'confirm' && (
        <>
          <p style={{ margin: 0, textAlign: 'center', fontWeight: 600 }}>Còn phần chưa xong</p>
          <p className="dim" style={{ margin: 0, textAlign: 'center' }}>
            {[
              leftover.pendingSets > 0 && `${leftover.pendingSets} set đã điền nhưng chưa tick.`,
              unplayed > 0 && `${unplayed} bài trong kế hoạch chưa tập — sẽ bỏ khỏi kế hoạch.`,
            ]
              .filter(Boolean)
              .join(' ')}
          </p>
          {leftover.pendingSets > 0 ? (
            <>
              <button className="btn primary full" onClick={() => save(true)}>
                Tick hết và hoàn thành
              </button>
              {lifts.length > 0 && (
                <button className="btn full" onClick={() => save(false)}>
                  Bỏ set chưa tick
                </button>
              )}
            </>
          ) : (
            <button className="btn primary full" onClick={() => save(false)}>
              Hoàn thành
            </button>
          )}
          <button className="btn full" onClick={onCancel}>
            Quay lại
          </button>
        </>
      )}

      {(step === 'start' || step === 'saving') && (
        <>
          <div className="finish-mark" role="status" aria-label="Đang lưu buổi tập">
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="32" r="28" fill="none" stroke="var(--line)" strokeWidth="5" />
              <circle
                className="finish-spin"
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="var(--lime)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="44 132"
              />
            </svg>
          </div>
          <p className="dim" style={{ margin: 0 }}>
            Đang lưu…
          </p>
        </>
      )}

      {step === 'done' && (
        <SessionSummary date={date} mode={mode} heading="Đã lưu buổi tập" synced={synced}>
          <button className="btn primary full" onClick={onDone}>
            Xong
          </button>
        </SessionSummary>
      )}
    </Popup>
  )
}

/**
 * Tổng kết một buổi: dấu tick, số bài/set/rep/volume, so với buổi trước, kỷ lục,
 * volume theo nhóm cơ. Dùng chung cho lúc vừa lưu và lúc mở lại buổi đã chốt —
 * `children` là hàng nút ở cuối.
 */
export function SessionSummary({
  date,
  mode,
  heading,
  synced,
  children,
}: {
  date: string
  mode: LiftMode
  heading: string
  synced?: 'synced' | 'pending' | 'local'
  children: ReactNode
}) {
  const data = useData()
  const exById = useMemo(() => exerciseMap(data), [data])
  const bodyKg = data.settings.weightKg
  const lifts = (getDay(date, data).lifts ?? []).filter(
    (e) => exById.get(e.exerciseId)?.mode === mode,
  )
  const total = summarize(lifts, exById, bodyKg)
  const compare = compareWithPrevious(data, mode, date, lifts, exById, bodyKg)
  const prs = sessionPrs(data, date, lifts, exById, bodyKg)
  const groups = groupVolumes(lifts, exById, (ex, e) => entryVolume(ex, e, bodyKg))
  const [open, setOpen] = useState<LiftGroup | null>(null)
  const label = sessionLabel(lifts, exById)

  return (
    <>
      <div className="finish-mark">
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <circle
            className="finish-circle"
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="var(--lime)"
            strokeWidth="5"
            transform="rotate(-90 32 32)"
          />
          <path
            className="finish-tick"
            d="m20 33 8 8 16-17"
            fill="none"
            stroke="var(--lime)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p style={{ margin: 0, textAlign: 'center', fontWeight: 600 }}>{heading}</p>
      <p className="dim" style={{ margin: 0, textAlign: 'center' }}>
        {label ? `${label} · ` : ''}
        {weekday(date)} {shortDate(date)}
        {synced === 'pending' && ' · lưu trên máy, sẽ đồng bộ khi có mạng'}
      </p>

      <div className="finish-stats">
        <div className="grid4" style={{ textAlign: 'center' }}>
          <Stat label="bài" value={n(total.exercises)} />
          <Stat label="set" value={n(total.sets)} />
          <Stat label="rep" value={n(total.reps)} />
          <Stat label="volume" value={volumeShort(total.volume)} unit="kg" />
        </div>

        <div className="finish-block">
          <span className="h2">So với buổi trước</span>
          {compare ? (
            <span className="muted">
              <b
                className="num"
                style={{ color: compare.pct >= 0 ? 'var(--lime)' : 'var(--text)' }}
              >
                {compare.pct >= 0 ? '+' : '−'}
                {n(Math.abs(compare.pct))}%
              </b>{' '}
              volume {compare.groups.map((g) => LIFT_GROUP_LABELS[g]).join(' · ')} so với{' '}
              {weekday(compare.date)} {shortDate(compare.date)} ({volumeShort(compare.volume)} kg)
            </span>
          ) : (
            <span className="muted">Chưa có buổi nào cùng nhóm cơ để so.</span>
          )}
        </div>

        {prs.length > 0 && (
          <div className="finish-block">
            <span className="h2">Kỷ lục mới · {prs.length}</span>
            {prs.map((p) => (
              <div key={p.ex.id} className="between" style={{ fontSize: 13 }}>
                <span className="truncate">{p.ex.name}</span>
                <span className="num" style={{ color: 'var(--lime)', whiteSpace: 'nowrap' }}>
                  {n(p.best, 1)} kg · +{n(p.best - p.prior, 1)}
                </span>
              </div>
            ))}
          </div>
        )}

        {groups.length > 0 && (
          <div className="finish-block">
            <span className="h2">Volume theo nhóm cơ</span>
            {groups.map((g) => (
              <GroupRow
                key={g.group}
                g={g}
                max={groups[0].volume}
                open={open === g.group}
                onToggle={() => setOpen(open === g.group ? null : g.group)}
              />
            ))}
          </div>
        )}

        {children}
      </div>
    </>
  )
}

/** Một dòng nhóm cơ: thanh dài theo volume, chia màu theo nhóm phụ. Bấm để xem số từng phần. */
function GroupRow({
  g,
  max,
  open,
  onToggle,
}: {
  g: GroupVolume
  max: number
  open: boolean
  onToggle: () => void
}) {
  const width = max > 0 ? (g.volume / max) * 100 : 0
  return (
    <>
      <button className="group-row" aria-expanded={open} onClick={onToggle}>
        <span className="truncate">{LIFT_GROUP_LABELS[g.group]}</span>
        <span className="group-bar">
          <span style={{ display: 'flex', width: `${width}%` }}>
            {g.subs.map((s) => (
              <i
                key={s.key}
                style={{
                  width: `${(s.volume / g.volume) * 100}%`,
                  background: g.subs.length > 1 ? subColor(g.group, s.key) : GROUP_COLOR[g.group],
                }}
              />
            ))}
          </span>
        </span>
        <span className="num dim">{volumeShort(g.volume)} kg</span>
      </button>
      {open && (
        <div className="group-subs">
          {g.subs.map((s) => (
            <span key={s.key} className="row" style={{ gap: 5 }}>
              <i className="swatch" style={{ background: subColor(g.group, s.key) }} />
              {subKeyLabel(s.key)} {volumeShort(s.volume)}
            </span>
          ))}
        </div>
      )}
    </>
  )
}
