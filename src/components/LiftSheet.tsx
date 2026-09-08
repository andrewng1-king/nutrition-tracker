import { useMemo, useState } from 'react'
import { matchName, n, shortDate } from '../lib/format'
import { useData } from '../lib/hooks'
import {
  GEAR_LABELS,
  LIFT_GROUPS,
  LIFT_GROUP_LABELS,
  LIFT_KCAL_NOTE,
  e1rm,
  entryVolume,
  isBodyweight,
  lastSetsFor,
  setVolume,
  parseKg,
  priorBestE1rm,
  setLabel,
  shortSet,
  summarize,
  volumeShort,
} from '../lib/lift'
import {
  allExercises,
  clearWorkout,
  exerciseMap,
  getDay,
  setLiftEntry,
  setLiftGroup,
} from '../lib/storage'
import type { Exercise, LiftGroup, LiftMode, LiftSet } from '../lib/types'
import { ExerciseForm } from './ExerciseForm'
import { Sheet } from './Sheet'

type View =
  | { kind: 'session' }
  | { kind: 'pick' }
  | { kind: 'edit'; exerciseId: string }
  | { kind: 'form'; exerciseId?: string }

export function LiftSheet({
  date,
  mode,
  onClose,
}: {
  date: string
  mode: LiftMode
  onClose: () => void
}) {
  const data = useData()
  const day = getDay(date, data)
  const bodyKg = data.settings.weightKg
  const exercises = useMemo(
    () => allExercises(data).filter((ex) => ex.mode === mode),
    [data, mode],
  )
  const exById = useMemo(() => exerciseMap(data), [data])
  const [view, setView] = useState<View>({ kind: 'session' })

  const lifts = day.lifts ?? []
  const group = day.liftGroup

  if (view.kind === 'pick') {
    return (
      <Sheet
        title="Chọn bài"
        onClose={() => setView({ kind: 'session' })}
        size="full"
      >
        <PickView
          exercises={exercises}
          group={group}
          date={date}
          loggedIds={new Set(lifts.map((e) => e.exerciseId))}
          onPick={(id) => setView({ kind: 'edit', exerciseId: id })}
          onCreate={() => setView({ kind: 'form' })}
        />
      </Sheet>
    )
  }

  if (view.kind === 'form') {
    return (
      <Sheet
        title={view.exerciseId ? 'Sửa bài tập' : 'Bài tập mới'}
        onClose={() => setView({ kind: 'session' })}
      >
        <ExerciseForm
          existing={view.exerciseId ? exById.get(view.exerciseId) : undefined}
          defaultGroup={group ?? 'pull'}
          mode={mode}
          onDone={(id) => setView({ kind: 'edit', exerciseId: id })}
          onCancel={() =>
            setView(
              view.exerciseId
                ? { kind: 'edit', exerciseId: view.exerciseId }
                : { kind: 'pick' },
            )
          }
        />
      </Sheet>
    )
  }

  if (view.kind === 'edit') {
    const ex = exById.get(view.exerciseId)
    if (!ex) {
      setView({ kind: 'session' })
      return null
    }
    return (
      <Sheet title={ex.name} onClose={() => setView({ kind: 'session' })}>
        <SetEditor
          key={ex.id}
          ex={ex}
          date={date}
          onDone={() => setView({ kind: 'session' })}
          onEditExercise={() => setView({ kind: 'form', exerciseId: ex.id })}
        />
      </Sheet>
    )
  }

  const total = summarize(lifts, exById, bodyKg)

  return (
    <Sheet title={mode === 'gym' ? 'Buổi tập tạ' : 'Buổi calisthenic'} onClose={onClose}>
      <div className="field">
        <label>Nhóm buổi tập</label>
        <div className="chips">
          {LIFT_GROUPS.map((g) => (
            <button
              key={g}
              className="chip"
              aria-pressed={group === g}
              onClick={() => setLiftGroup(date, group === g ? undefined : g)}
            >
              {LIFT_GROUP_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      {lifts.length > 0 && (
        <div className="card ink">
          <div className="grid4" style={{ textAlign: 'center' }}>
            <Stat label="bài" value={n(total.exercises)} />
            <Stat label="set" value={n(total.sets)} />
            <Stat label="rep" value={n(total.reps)} />
            <Stat label="volume" value={volumeShort(total.volume)} unit="kg" />
          </div>
        </div>
      )}

      {lifts.length === 0 ? (
        <p className="empty">Chưa có bài nào. Bấm “Thêm bài” để bắt đầu.</p>
      ) : (
        <div className="list">
          {lifts.map((entry) => {
            const ex = exById.get(entry.exerciseId)
            if (!ex) return null
            return (
              <button
                key={entry.id}
                className="list-item"
                onClick={() => setView({ kind: 'edit', exerciseId: ex.id })}
              >
                <span className="grow">
                  <span className="truncate" style={{ display: 'block', fontWeight: 500 }}>
                    {ex.name}
                  </span>
                  <span className="dim num">
                    {entry.sets.map((s) => shortSet(s)).join('  ·  ')}
                  </span>
                </span>
                <span className="entry-kcal">
                  {volumeShort(entryVolume(ex, entry, bodyKg))}
                  <br />
                  <span className="dim">kg</span>
                </span>
              </button>
            )
          })}
        </div>
      )}

      <button className="btn primary full" onClick={() => setView({ kind: 'pick' })}>
        + Thêm bài
      </button>

      <p className="muted" style={{ margin: 0 }}>
        {LIFT_KCAL_NOTE}
      </p>

      {lifts.length > 0 && (
        <button
          className="btn danger full"
          onClick={() => {
            clearWorkout(date)
            onClose()
          }}
        >
          Xoá cả buổi tập
        </button>
      )}
    </Sheet>
  )
}

// ---------------- chọn bài ----------------

function PickView({
  exercises,
  group,
  date,
  loggedIds,
  onPick,
  onCreate,
}: {
  exercises: Exercise[]
  group?: LiftGroup
  date: string
  loggedIds: Set<string>
  onPick: (id: string) => void
  onCreate: () => void
}) {
  const data = useData()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<LiftGroup | 'all'>(group ?? 'all')

  const list = exercises
    .filter((ex) => filter === 'all' || ex.group === filter)
    .filter((ex) => matchName(ex.name, query))
    // bài của nhóm buổi tập lên trước, rồi theo tên
    .sort((a, b) => {
      const g = Number(b.group === group) - Number(a.group === group)
      return g !== 0 ? g : a.name.localeCompare(b.name, 'vi')
    })

  return (
    <>
      <input
        placeholder="Tìm bài — gõ không dấu cũng được"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      <div className="chips">
        <button className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
          Tất cả
        </button>
        {LIFT_GROUPS.map((g) => (
          <button
            key={g}
            className="chip"
            aria-pressed={filter === g}
            onClick={() => setFilter(g)}
          >
            {LIFT_GROUP_LABELS[g]}
          </button>
        ))}
      </div>

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
                    <span className="truncate" style={{ fontWeight: 500 }}>
                      {ex.name}
                    </span>
                    {loggedIds.has(ex.id) && <span className="badge good">đã log</span>}
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

interface Row {
  reps: string
  kg: string
}

const BLANK: Row = { reps: '', kg: '' }

/** Điền lại ô nhập theo kiểu số Việt Nam — parseKg đọc lại được cả , và . */
const kgInput = (kg: number) => String(kg).replace('.', ',')

function SetEditor({
  ex,
  date,
  onDone,
  onEditExercise,
}: {
  ex: Exercise
  date: string
  onDone: () => void
  onEditExercise: () => void
}) {
  const data = useData()
  const bodyKg = data.settings.weightKg
  const body = isBodyweight(ex)
  const existing = (getDay(date, data).lifts ?? []).find((e) => e.exerciseId === ex.id)
  const last = useMemo(() => lastSetsFor(data, ex.id, date), [data, ex.id, date])
  const record = useMemo(
    () => priorBestE1rm(data, ex, date, bodyKg),
    [data, ex, date, bodyKg],
  )

  // Đã log hôm nay -> sửa đúng set đó. Chưa log -> mở sẵn set của lần trước
  // (ông ghi top set, còn set nhẹ hơn), mặc định 3 dòng cho buổi mới tinh.
  const [rows, setRows] = useState<Row[]>(() => {
    const source = existing?.sets ?? last?.sets
    if (source && source.length > 0) {
      return source.map((s) => ({ reps: String(s.reps), kg: kgInput(s.kg) }))
    }
    return [BLANK, BLANK, BLANK]
  })

  // Bài thể trọng hợp lệ với kg = 0 (tay không); bài có tạ thì phải có mức tạ.
  const sets: LiftSet[] = rows
    .map((r) => ({ reps: Math.round(parseKg(r.reps)), kg: parseKg(r.kg) }))
    .filter((s) => s.reps > 0 && (body || s.kg > 0))

  const volume = sets.reduce((sum, s) => sum + setVolume(ex, s, bodyKg), 0)
  const best = sets.reduce((b, s) => Math.max(b, e1rm(ex, s, bodyKg)), 0)
  const isPr = best > 0 && record > 0 && best > record

  const patch = (i: number, key: keyof Row, value: string) =>
    setRows((prev) => prev.map((r, j) => (i === j ? { ...r, [key]: value } : r)))

  return (
    <>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        <span className="badge est">{LIFT_GROUP_LABELS[ex.group]}</span>
        <span className="badge est">{GEAR_LABELS[ex.gear]}</span>
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

      <p className="muted" style={{ margin: 0 }}>
        {last
          ? `Lần trước (${shortDate(last.date)}): ${last.sets.map((s) => shortSet(s)).join(', ')}`
          : 'Chưa có dữ liệu lần trước — buổi này sẽ là mốc gốc.'}
        {record > 0 && ` · kỷ lục 1RM ước tính ${n(record, 1)} kg`}
      </p>

      <div className="set-grid">
        <span />
        <span className="set-head">
          {body ? 'Tải thêm (kg)' : `Mức tạ (${ex.perSide ? 'mỗi bên' : 'kg'})`}
        </span>
        <span className="set-head">Rep</span>
        <span />
        {rows.map((r, i) => (
          <SetRow
            key={i}
            index={i}
            row={r}
            onChange={(key, value) => patch(i, key, value)}
            onRemove={() => setRows((prev) => prev.filter((_, j) => j !== i))}
          />
        ))}
      </div>

      <button className="btn full" onClick={() => setRows((prev) => [...prev, BLANK])}>
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
                ? n(sets.reduce((sum, s) => sum + s.reps, 0))
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

      <button
        className="btn primary full"
        disabled={sets.length === 0}
        onClick={() => {
          setLiftEntry(date, ex.id, sets)
          onDone()
        }}
      >
        Lưu {sets.length > 0 ? `${sets.length} set` : ''}
      </button>

      {existing && (
        <button
          className="btn danger full"
          onClick={() => {
            setLiftEntry(date, ex.id, [])
            onDone()
          }}
        >
          Bỏ bài này khỏi buổi tập
        </button>
      )}
    </>
  )
}

function SetRow({
  index,
  row,
  onChange,
  onRemove,
}: {
  index: number
  row: Row
  onChange: (key: keyof Row, value: string) => void
  onRemove: () => void
}) {
  return (
    <>
      <span className="set-index num">{index + 1}</span>
      <input
        inputMode="decimal"
        placeholder="0"
        aria-label={`Mức tạ set ${index + 1}`}
        value={row.kg}
        onChange={(e) => onChange('kg', e.target.value)}
      />
      <input
        inputMode="numeric"
        placeholder="0"
        aria-label={`Số rep set ${index + 1}`}
        value={row.reps}
        onChange={(e) => onChange('reps', e.target.value)}
      />
      <button className="set-del" onClick={onRemove} aria-label={`Xoá set ${index + 1}`}>
        ×
      </button>
    </>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <div className="num" style={{ fontSize: 20, fontWeight: 700 }}>
        {value}
        {unit && <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.65 }}> {unit}</span>}
      </div>
      <div className="dim">{label}</div>
    </div>
  )
}
