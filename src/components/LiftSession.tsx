import { useEffect, useMemo, useRef, useState } from 'react'
import { clearDraft, clearDrafts, getDraft, saveDraft, type DraftRow } from '../lib/draft'
import { dayLabel, matchName, n, shortDate, weekday } from '../lib/format'
import { useData, useDrafts } from '../lib/hooks'
import {
  GEAR_LABELS,
  LIFT_KCAL_NOTE,
  e1rm,
  entryVolume,
  isBodyweight,
  kgStepFor,
  lastSetsFor,
  parseKg,
  planFromSession,
  planFromTemplate,
  priorBestE1rm,
  recentSessions,
  setLabel,
  setReps,
  setVolume,
  shortSet,
  suggestDropKg,
  summarize,
  volumeShort,
} from '../lib/lift'
import { dateKey } from '../lib/macros'
import { LIFT_GROUP_LABELS, sessionLabel } from '../lib/muscles'
import {
  doneSets,
  editRowField,
  initialRows,
  isValidSet,
  kgInput,
  pendingIndexes,
  rowToSet,
} from '../lib/setRows'
import {
  addToPlan,
  allExercises,
  clearPlan,
  clearWorkout,
  exerciseMap,
  getDay,
  saveWorkoutTemplate,
  setLiftEntry,
} from '../lib/storage'
import type { AppData, Exercise, LiftEntry, LiftMode, LiftSet, PlanItem } from '../lib/types'
import { ExerciseForm } from './ExerciseForm'
import { FinishSession } from './FinishSession'
import { GroupFilter, NO_FILTER, matchesFilter } from './GroupFilter'
import { IconCheck } from './icons'
import { Page } from './Page'
import { Stat } from './Stat'
import { Stepper } from './Stepper'

type View =
  | { kind: 'session' }
  | { kind: 'pick' }
  | { kind: 'edit'; exerciseId: string }
  | { kind: 'form'; exerciseId?: string }
  | { kind: 'save-template' }

/**
 * Luồng buổi tập, mỗi bước một trang toàn màn hình: buổi tập → chọn bài → nhập
 * set → sửa bài. Nút ‹ lùi đúng một bước, về tới trang buổi tập thì đóng hẳn.
 */
export function LiftSession({
  date,
  mode,
  onClose,
  initialExerciseId,
}: {
  date: string
  mode: LiftMode
  onClose: () => void
  /** mở thẳng bảng nhập set của bài này — dùng khi tiếp tục bản nháp */
  initialExerciseId?: string
}) {
  const data = useData()
  const drafts = useDrafts()
  const day = getDay(date, data)
  const bodyKg = data.settings.weightKg
  const exercises = useMemo(
    () => allExercises(data).filter((ex) => ex.mode === mode),
    [data, mode],
  )
  const exById = useMemo(() => exerciseMap(data), [data])
  const [view, setView] = useState<View>(
    initialExerciseId ? { kind: 'edit', exerciseId: initialExerciseId } : { kind: 'session' },
  )
  const [finishing, setFinishing] = useState(false)

  // Trang gym chỉ hiện bài gym, trang calisthenic chỉ hiện bài thể trọng.
  const inMode = (exerciseId: string) => exById.get(exerciseId)?.mode === mode
  const lifts = (day.lifts ?? []).filter((e) => inMode(e.exerciseId))
  const plan = (day.plan ?? []).filter((p) => inMode(p.exerciseId))
  const toSession = () => setView({ kind: 'session' })

  if (view.kind === 'pick') {
    return (
      <Page title="Chọn bài" onBack={toSession}>
        <PickView
          exercises={exercises}
          date={date}
          loggedIds={new Set(lifts.map((e) => e.exerciseId))}
          plannedIds={new Set(plan.map((p) => p.exerciseId))}
          onPick={(id) => setView({ kind: 'edit', exerciseId: id })}
          onCreate={() => setView({ kind: 'form' })}
        />
      </Page>
    )
  }

  if (view.kind === 'form') {
    const back = () =>
      setView(view.exerciseId ? { kind: 'edit', exerciseId: view.exerciseId } : { kind: 'pick' })
    return (
      <Page title={view.exerciseId ? 'Sửa bài tập' : 'Bài tập mới'} onBack={back}>
        <ExerciseForm
          existing={view.exerciseId ? exById.get(view.exerciseId) : undefined}
          defaultGroup={mode === 'calisthenic' ? 'back' : 'chest'}
          mode={mode}
          onDone={(id) => setView({ kind: 'edit', exerciseId: id })}
          onCancel={back}
        />
      </Page>
    )
  }

  if (view.kind === 'edit') {
    const ex = exById.get(view.exerciseId)
    if (!ex) {
      toSession()
      return null
    }
    return (
      <Page title={ex.name} onBack={toSession}>
        <SetEditor
          key={ex.id}
          ex={ex}
          date={date}
          planned={plan.find((p) => p.exerciseId === ex.id)?.sets}
          onDone={toSession}
          onEditExercise={() => setView({ kind: 'form', exerciseId: ex.id })}
        />
      </Page>
    )
  }

  if (view.kind === 'save-template') {
    return (
      <Page title="Lưu thành buổi mẫu" onBack={toSession}>
        <SaveTemplateView
          data={data}
          mode={mode}
          lifts={lifts}
          exById={exById}
          onDone={toSession}
        />
      </Page>
    )
  }

  const total = summarize(lifts, exById, bodyKg)
  const rows = sessionRows(lifts, plan, exById)
  const unlogged = plan.filter((p) => !lifts.some((e) => e.exerciseId === p.exerciseId))
  const fresh = lifts.length === 0 && plan.length === 0
  const title = mode === 'gym' ? 'Buổi tập tạ' : 'Buổi calisthenic'
  const label = sessionLabel(lifts.length > 0 ? lifts : plan, exById)
  // Set đã điền mà chưa tick, nằm trong nháp — vẫn đủ để bấm hoàn thành.
  const pendingSets = Object.values(drafts)
    .filter((d) => d.date === date && inMode(d.exerciseId))
    .reduce((sum, d) => {
      const ex = exById.get(d.exerciseId)
      return sum + (ex ? pendingIndexes(d.rows, isBodyweight(ex)).length : 0)
    }, 0)
  const canFinish = lifts.length > 0 || pendingSets > 0

  return (
    <Page
      title={date === dateKey() ? title : `${title} · ${dayLabel(date)}`}
      onBack={onClose}
      footer={
        canFinish && (
          <button className="btn primary full" onClick={() => setFinishing(true)}>
            Hoàn thành buổi tập
          </button>
        )
      }
    >
      {fresh && <StartSession data={data} date={date} mode={mode} exById={exById} />}

      {lifts.length > 0 && (
        <div className="card ink">
          {label && (
            <h2 className="h2" style={{ marginBottom: 10 }}>
              {label}
            </h2>
          )}
          <div className="grid4" style={{ textAlign: 'center' }}>
            <Stat label="bài" value={n(total.exercises)} />
            <Stat label="set" value={n(total.sets)} />
            <Stat label="rep" value={n(total.reps)} />
            <Stat label="volume" value={volumeShort(total.volume)} unit="kg" />
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="list">
          {rows.map(({ ex, entry, planned }) => {
            const hasDraft = Boolean(drafts[`${date}|${ex.id}`])
            return (
              <button
                key={ex.id}
                className={`list-item${entry ? '' : ' planned'}`}
                onClick={() => setView({ kind: 'edit', exerciseId: ex.id })}
              >
                <span className="grow">
                  <span className="row" style={{ gap: 6 }}>
                    <span className="truncate lift-name">{ex.name}</span>
                    {hasDraft && <span className="badge moderate">nháp</span>}
                    {!entry && <span className="badge est">kế hoạch</span>}
                  </span>
                  <span className="dim num">
                    {entry
                      ? entry.sets.map((s) => shortSet(s)).join('  ·  ')
                      : planLabel(planned ?? [])}
                  </span>
                </span>
                <span className="entry-kcal">
                  {planned ? (
                    <>
                      {entry?.sets.length ?? 0}/{planned.length}
                      <br />
                      <span className="dim">set</span>
                    </>
                  ) : (
                    <>
                      {volumeShort(entry ? entryVolume(ex, entry, bodyKg) : 0)}
                      <br />
                      <span className="dim">kg</span>
                    </>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <button
        className={`btn full${canFinish ? '' : ' primary'}`}
        onClick={() => setView({ kind: 'pick' })}
      >
        + Thêm bài
      </button>

      {unlogged.length > 0 && (
        <button
          className="btn full"
          onClick={() =>
            clearPlan(
              date,
              unlogged.map((p) => p.exerciseId),
            )
          }
        >
          Bỏ {unlogged.length} bài chưa tập khỏi kế hoạch
        </button>
      )}

      {lifts.length > 0 && (
        <button className="btn full" onClick={() => setView({ kind: 'save-template' })}>
          Lưu thành buổi mẫu
        </button>
      )}

      <p className="muted" style={{ margin: 0 }}>
        {LIFT_KCAL_NOTE}
      </p>

      {(lifts.length > 0 || plan.length > 0) && (
        <button
          className="btn danger full"
          onClick={() => {
            const ids = [...lifts.map((e) => e.exerciseId), ...plan.map((p) => p.exerciseId)]
            clearWorkout(date, ids)
            clearDrafts(date, ids)
            onClose()
          }}
        >
          Xoá cả buổi tập
        </button>
      )}

      {finishing && (
        <FinishSession
          date={date}
          mode={mode}
          onCancel={() => setFinishing(false)}
          onDone={onClose}
        />
      )}
    </Page>
  )
}

interface SessionRow {
  ex: Exercise
  entry?: LiftEntry
  planned?: LiftSet[]
}

/**
 * Thứ tự trong buổi: đi theo kế hoạch trước (đúng thứ tự định tập), bài log
 * ngoài kế hoạch nối vào sau theo giờ log.
 */
function sessionRows(
  lifts: LiftEntry[],
  plan: PlanItem[],
  exById: Map<string, Exercise>,
): SessionRow[] {
  const out: SessionRow[] = []
  for (const p of plan) {
    const ex = exById.get(p.exerciseId)
    if (!ex) continue
    out.push({ ex, entry: lifts.find((e) => e.exerciseId === p.exerciseId), planned: p.sets })
  }
  for (const entry of lifts) {
    if (plan.some((p) => p.exerciseId === entry.exerciseId)) continue
    const ex = exById.get(entry.exerciseId)
    if (ex) out.push({ ex, entry })
  }
  return out
}

const planLabel = (sets: LiftSet[]) =>
  sets.map((s) => (s.reps > 0 ? shortSet(s) : '?')).join('  ·  ')

// ---------------- bắt đầu buổi: lặp lại buổi gần đây + buổi mẫu ----------------

function StartSession({
  data,
  date,
  mode,
  exById,
}: {
  data: AppData
  date: string
  mode: LiftMode
  exById: Map<string, Exercise>
}) {
  const recent = recentSessions(data, mode, date, exById)
  const templates = (data.workoutTemplates ?? [])
    .filter((t) => t.mode === mode)
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'))

  return (
    <>
      {recent.length > 0 ? (
        <div className="card start-card col">
          <h3 className="h2">Lặp lại buổi gần đây</h3>
          <p className="muted" style={{ margin: 0 }}>
            Log sẵn bài và set của một buổi cũ, hôm nay chỉ việc tick từng set.
          </p>
          <div className="list">
            {recent.map((s) => {
              const sets = s.entries.reduce((sum, e) => sum + e.sets.length, 0)
              return (
                <div key={s.date} className="list-item compact">
                  <span className="grow">
                    <span className="truncate lift-name" style={{ display: 'block' }}>
                      {sessionLabel(s.entries, exById) || 'Buổi tập'}
                    </span>
                    <span className="dim">
                      {weekday(s.date)} {shortDate(s.date)} · {s.entries.length} bài · {sets} set
                    </span>
                  </span>
                  <button className="btn sm" onClick={() => addToPlan(date, planFromSession(s))}>
                    Log sẵn
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          Chưa có buổi nào trước {dayLabel(date).toLowerCase()} để lặp lại — bấm Thêm bài để
          bắt đầu.
        </p>
      )}

      {templates.length > 0 && (
        <div className="card col">
          <h3 className="h2">Buổi mẫu</h3>
          <div className="list">
            {templates.map((t) => {
              const items = t.items.filter((i) => exById.has(i.exerciseId))
              const sets = items.reduce((sum, i) => sum + i.sets, 0)
              const label = sessionLabel(
                items.map((i) => ({ exerciseId: i.exerciseId, sets: Array(i.sets) })),
                exById,
              )
              return (
                <div key={t.id} className="list-item compact">
                  <span className="grow">
                    <span className="truncate lift-name" style={{ display: 'block' }}>
                      {t.name}
                    </span>
                    <span className="dim">
                      {label ? `${label} · ` : ''}
                      {items.length} bài · {sets} set
                    </span>
                  </span>
                  <button
                    className="btn sm"
                    disabled={items.length === 0}
                    onClick={() => addToPlan(date, planFromTemplate(data, { ...t, items }, date))}
                  >
                    Dùng
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}

// ---------------- lưu buổi mẫu ----------------

function SaveTemplateView({
  data,
  mode,
  lifts,
  exById,
  onDone,
}: {
  data: AppData
  mode: LiftMode
  lifts: LiftEntry[]
  exById: Map<string, Exercise>
  onDone: () => void
}) {
  const existing = (data.workoutTemplates ?? []).filter((t) => t.mode === mode)
  const [name, setName] = useState(() => {
    const base =
      sessionLabel(lifts, exById) || (mode === 'gym' ? 'Buổi tập' : 'Calisthenic')
    const taken = new Set(existing.map((t) => t.name.trim().toLowerCase()))
    const letter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      .split('')
      .find((l) => !taken.has(`${base} ${l}`.toLowerCase()))
    return `${base} ${letter ?? ''}`.trim()
  })
  const items = lifts
    .filter((e) => exById.has(e.exerciseId))
    .map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.length }))
  const clash = existing.find((t) => t.name.trim().toLowerCase() === name.trim().toLowerCase())

  return (
    <>
      <div className="field">
        <label htmlFor="wt-name">Tên buổi mẫu</label>
        <input
          id="wt-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="VD: Ngực · Tay sau A"
          autoFocus
        />
      </div>
      <p className="dim" style={{ margin: 0 }}>
        Mẫu chỉ nhớ bài và số set. Kg và rep lấy lại từ lần tập gần nhất mỗi khi dùng —
        lên tạ rồi thì mẫu vẫn đúng, không phải lưu lại.
      </p>
      <div className="list">
        {items.map((i) => (
          <div key={i.exerciseId} className="list-item compact">
            <span className="grow truncate">{exById.get(i.exerciseId)?.name}</span>
            <span className="dim num">{i.sets} set</span>
          </div>
        ))}
      </div>
      <button
        className="btn primary full"
        disabled={!name.trim() || items.length === 0}
        onClick={() => {
          saveWorkoutTemplate({ id: clash?.id, name: name.trim(), mode, items })
          onDone()
        }}
      >
        {clash ? `Ghi đè mẫu “${clash.name}”` : 'Lưu buổi mẫu'}
      </button>
    </>
  )
}

// ---------------- chọn bài ----------------

function PickView({
  exercises,
  date,
  loggedIds,
  plannedIds,
  onPick,
  onCreate,
}: {
  exercises: Exercise[]
  date: string
  loggedIds: Set<string>
  plannedIds: Set<string>
  onPick: (id: string) => void
  onCreate: () => void
}) {
  const data = useData()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState(NO_FILTER)

  const list = exercises
    .filter((ex) => matchesFilter(ex, filter))
    .filter((ex) => matchName(ex.name, query) || matchName(ex.note ?? '', query))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))

  return (
    <>
      <input
        placeholder="Tìm bài — gõ không dấu cũng được"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      <GroupFilter exercises={exercises} value={filter} onChange={setFilter} />

      {list.length === 0 ? (
        <p className="empty">Không có bài nào khớp.</p>
      ) : (
        <div className="list">
          {list.map((ex) => {
            const last = lastSetsFor(data, ex.id, date)
            const top = last?.sets[0]
            return (
              <button key={ex.id} className="list-item" onClick={() => onPick(ex.id)}>
                <span className="grow">
                  <span className="row" style={{ gap: 6 }}>
                    <span className="truncate lift-name">{ex.name}</span>
                    {loggedIds.has(ex.id) ? (
                      <span className="badge good">đã log</span>
                    ) : (
                      plannedIds.has(ex.id) && <span className="badge est">kế hoạch</span>
                    )}
                  </span>
                  <span className="dim num">
                    {LIFT_GROUP_LABELS[ex.group]} · {GEAR_LABELS[ex.gear]}
                    {top
                      ? ` · lần trước ${setLabel(ex, top)} (${shortDate(last!.date)})`
                      : ' · chưa tập lần nào'}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}

      <button className="btn full" onClick={onCreate}>
        + Tạo bài mới
      </button>
    </>
  )
}

// ---------------- nhập set ----------------

/** Dòng còn chữ chưa tick — thứ sẽ mất nếu app bị tắt mà không có bản nháp. */
const hasUnsaved = (rows: DraftRow[]) =>
  rows.some(
    (r) =>
      !r.done && (r.kg.trim() !== '' || r.reps.trim() !== '' || r.drops.length > 0),
  )

function SetEditor({
  ex,
  date,
  planned,
  onDone,
  onEditExercise,
}: {
  ex: Exercise
  date: string
  planned?: LiftSet[]
  onDone: () => void
  onEditExercise: () => void
}) {
  const data = useData()
  const bodyKg = data.settings.weightKg
  const body = isBodyweight(ex)
  const step = kgStepFor(ex)
  const existing = (getDay(date, data).lifts ?? []).find((e) => e.exerciseId === ex.id)
  const last = useMemo(() => lastSetsFor(data, ex.id, date), [data, ex.id, date])
  const record = useMemo(
    () => priorBestE1rm(data, ex, date, bodyKg),
    [data, ex, date, bodyKg],
  )

  // Có nháp thì mở lại đúng những gì đang gõ dở; không thì dựng từ log / kế hoạch / lần trước.
  const [restored] = useState(() => Boolean(getDraft(date, ex.id)))
  const [rows, setRows] = useState<DraftRow[]>(
    () =>
      getDraft(date, ex.id)?.rows ??
      initialRows(existing?.sets ?? [], planned ?? [], last?.sets ?? []),
  )
  const rowsRef = useRef(rows)
  const touched = useRef(false)
  const [tools, setTools] = useState<number | null>(null)
  const [ask, setAsk] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  /**
   * Mọi thay đổi đi qua đây. Dòng đã tick là dữ liệu thật — sửa số hay bỏ tick
   * thì ghi vào log ngay, không đợi bấm Lưu. Tính từ ref chứ không từ updater
   * của setState: updater phải thuần, StrictMode gọi nó hai lần.
   */
  const change = (fn: (prev: DraftRow[]) => DraftRow[]) => {
    const prev = rowsRef.current
    const next = fn(prev)
    rowsRef.current = next
    touched.current = true
    setHint(null)
    setRows(next)
    const after = doneSets(next, body)
    if (JSON.stringify(after) !== JSON.stringify(doneSets(prev, body))) {
      setLiftEntry(date, ex.id, after)
    }
  }

  useEffect(() => {
    if (!touched.current) return
    if (hasUnsaved(rows)) {
      saveDraft({ date, mode: ex.mode, exerciseId: ex.id, exerciseName: ex.name, rows })
    } else {
      clearDraft(date, ex.id)
    }
  }, [rows, date, ex.id, ex.mode, ex.name])

  const patchRow = (i: number, patch: Partial<DraftRow>) =>
    change((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  // Sửa kg / rep thì các set bên dưới chưa tick, chưa sửa tay tự chép theo.
  const editField = (i: number, field: 'kg' | 'reps', value: string) =>
    change((prev) => editRowField(prev, i, field, value))

  const patchDrop = (i: number, j: number, patch: Partial<DraftRow['drops'][number]>) =>
    change((prev) =>
      prev.map((r, k) =>
        k === i ? { ...r, drops: r.drops.map((d, m) => (m === j ? { ...d, ...patch } : d)) } : r,
      ),
    )

  const addDrop = (i: number) => {
    change((prev) =>
      prev.map((r, k) => {
        if (k !== i) return r
        const src = r.drops[r.drops.length - 1] ?? r
        const kg = suggestDropKg(parseKg(src.kg), step)
        return { ...r, drops: [...r.drops, { kg: kg > 0 ? kgInput(kg) : '', reps: src.reps }] }
      }),
    )
    setTools(null)
  }

  const toggleDone = (i: number) => {
    const r = rowsRef.current[i]
    if (!r.done && !isValidSet(rowToSet(r), body)) {
      setHint(
        body
          ? `Set ${i + 1}: điền số rep trước khi tick.`
          : `Set ${i + 1}: điền mức tạ và số rep trước khi tick.`,
      )
      return
    }
    patchRow(i, { done: !r.done })
  }

  const sets = rows.map(rowToSet).filter((s) => isValidSet(s, body))
  const volume = sets.reduce((sum, s) => sum + setVolume(ex, s, bodyKg), 0)
  const best = sets.reduce((b, s) => Math.max(b, e1rm(ex, s, bodyKg)), 0)
  const isPr = best > 0 && record > 0 && best > record

  const pending = pendingIndexes(rows, body)
  const doneCount = doneSets(rows, body).length

  const finish = () => {
    clearDraft(date, ex.id)
    onDone()
  }

  const tickAllAndFinish = () => {
    change((prev) => prev.map((r, i) => (pending.includes(i) ? { ...r, done: true } : r)))
    finish()
  }

  return (
    <>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        {ex.perSide && <span className="badge run">số ghi là mỗi bên</span>}
        <button className="btn sm" style={{ marginLeft: 'auto' }} onClick={onEditExercise}>
          Sửa bài
        </button>
      </div>

      {ex.note && (
        <p className="dim" style={{ margin: 0 }}>
          {ex.note}
        </p>
      )}

      {restored && (
        <p className="muted" style={{ margin: 0, color: 'var(--fat)' }}>
          Mở lại bản nháp chưa lưu.
        </p>
      )}

      <p className="muted" style={{ margin: 0 }}>
        {last
          ? `Lần trước (${shortDate(last.date)}): ${last.sets.map((s) => shortSet(s)).join(', ')}`
          : 'Chưa có dữ liệu lần trước — buổi này sẽ là mốc gốc.'}
        {record > 0 && ` · kỷ lục 1RM ước tính ${n(record, 1)} kg`}
      </p>

      <div className="set-list">
        <div className="set-row">
          <span />
          <span className="set-head">
            {body ? 'Tải thêm (kg)' : `Mức tạ (${ex.perSide ? 'mỗi bên' : 'kg'})`}
          </span>
          <span className="set-head">Rep</span>
          <span className="set-head" style={{ textAlign: 'center' }}>
            Xong
          </span>
        </div>

        {rows.map((r, i) => (
          <div key={i} className="set-block" data-done={r.done || undefined}>
            <div className="set-row">
              <button
                className="set-index num"
                aria-expanded={tools === i}
                aria-label={`Set ${i + 1}: thêm nấc drop hoặc xoá set`}
                onClick={() => setTools(tools === i ? null : i)}
              >
                {i + 1}
              </button>
              <Stepper
                value={r.kg}
                step={step}
                label={`mức tạ set ${i + 1}`}
                onChange={(v) => editField(i, 'kg', v)}
              />
              <Stepper
                value={r.reps}
                step={1}
                integer
                label={`rep set ${i + 1}`}
                onChange={(v) => editField(i, 'reps', v)}
              />
              <button
                className="set-tick"
                aria-pressed={r.done}
                aria-label={r.done ? `Bỏ tick set ${i + 1}` : `Tick set ${i + 1} là đã xong`}
                onClick={() => toggleDone(i)}
              >
                <IconCheck className="ico" />
              </button>
            </div>

            {r.drops.map((d, j) => (
              <div key={j} className="set-row drop">
                <span className="drop-mark" aria-hidden="true">
                  ↘
                </span>
                <Stepper
                  value={d.kg}
                  step={step}
                  label={`mức tạ nấc drop ${j + 1} của set ${i + 1}`}
                  onChange={(v) => patchDrop(i, j, { kg: v })}
                />
                <Stepper
                  value={d.reps}
                  step={1}
                  integer
                  label={`rep nấc drop ${j + 1} của set ${i + 1}`}
                  onChange={(v) => patchDrop(i, j, { reps: v })}
                />
                <button
                  className="set-del"
                  aria-label={`Xoá nấc drop ${j + 1} của set ${i + 1}`}
                  onClick={() =>
                    change((prev) =>
                      prev.map((row, k) =>
                        k === i ? { ...row, drops: row.drops.filter((_, m) => m !== j) } : row,
                      ),
                    )
                  }
                >
                  ×
                </button>
              </div>
            ))}

            {tools === i && (
              <div className="set-tools">
                <button className="btn sm" onClick={() => addDrop(i)}>
                  ↘ Thêm nấc drop
                </button>
                <button
                  className="btn sm danger"
                  onClick={() => {
                    change((prev) => prev.filter((_, k) => k !== i))
                    setTools(null)
                  }}
                >
                  Xoá set
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {hint && (
        <p className="muted" style={{ margin: 0, color: 'var(--warn)' }}>
          {hint}
        </p>
      )}

      <p className="dim" style={{ margin: 0 }}>
        Tập xong set nào tick set đó — set đã tick vào log ngay. Sửa số một set thì các set
        bên dưới chưa tick tự chép theo. Bấm số thứ tự để thêm nấc dropset hoặc xoá set.
      </p>

      <button
        className="btn full"
        onClick={() =>
          change((prev) => {
            const tail = prev[prev.length - 1]
            // set mới chép mức tạ và rep của set cuối — hiệp sau thường giữ nguyên
            return [
              ...prev,
              { kg: tail?.kg ?? '', reps: tail?.reps ?? '', done: false, drops: [] },
            ]
          })
        }
      >
        + Thêm set
      </button>

      <div className="card ink">
        <div className="grid3" style={{ textAlign: 'center' }}>
          <Stat label="set" value={n(sets.length)} />
          <Stat label="volume" value={volumeShort(volume)} unit="kg" />
          <Stat
            label={body ? 'rep' : '1RM ước tính'}
            value={
              body
                ? n(sets.reduce((sum, s) => sum + setReps(s), 0))
                : best > 0
                  ? n(best, 1)
                  : '—'
            }
            unit={body ? undefined : 'kg'}
          />
        </div>
        {isPr && (
          <p className="muted" style={{ margin: '12px 0 0', color: 'var(--lime)' }}>
            Kỷ lục mới — hơn mức tốt nhất trước đó {n(best - record, 1)} kg.
          </p>
        )}
      </div>

      {ask ? (
        <div className="card col">
          <p className="muted" style={{ margin: 0 }}>
            Còn {pending.length} set đã điền nhưng chưa tick.
          </p>
          <button className="btn primary full" onClick={tickAllAndFinish}>
            Tick hết và lưu {doneCount + pending.length} set
          </button>
          <button className="btn full" onClick={finish}>
            Chỉ giữ {doneCount} set đã tick
          </button>
          <button className="btn full" onClick={() => setAsk(false)}>
            Quay lại
          </button>
        </div>
      ) : (
        <button
          className="btn primary full"
          disabled={doneCount === 0 && pending.length === 0}
          onClick={() => {
            if (pending.length === 0) finish()
            else if (doneCount === 0) tickAllAndFinish()
            else setAsk(true)
          }}
        >
          {doneCount === 0
            ? `Lưu${pending.length > 0 ? ` ${pending.length} set` : ''}`
            : `Xong · ${doneCount} set`}
        </button>
      )}

      {(existing || planned) && (
        <button
          className="btn danger full"
          onClick={() => {
            setLiftEntry(date, ex.id, [])
            clearPlan(date, [ex.id])
            clearDraft(date, ex.id)
            onDone()
          }}
        >
          Bỏ bài này khỏi buổi tập
        </button>
      )}
    </>
  )
}
