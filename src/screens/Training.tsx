import { useMemo, useState } from 'react'
import { ExerciseForm } from '../components/ExerciseForm'
import { ExerciseList } from '../components/ExerciseList'
import { LiftSheet } from '../components/LiftSheet'
import { RunProgress } from '../components/RunProgress'
import { Sheet } from '../components/Sheet'
import { Strength } from '../components/Strength'
import { SubTabs } from '../components/SubTabs'
import { dayLabel, n } from '../lib/format'
import { useData } from '../lib/hooks'
import { LIFT_GROUP_LABELS, summarize, volumeShort } from '../lib/lift'
import { dateKey } from '../lib/macros'
import { exerciseMap, getDay } from '../lib/storage'
import type { Exercise, LiftMode } from '../lib/types'

type Sub = LiftMode | 'run'

const SUBS: [Sub, string][] = [
  ['gym', 'Gym'],
  ['calisthenic', 'Calisthenic'],
  ['run', 'Run'],
]

export function Training({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const [sub, setSub] = useState<Sub>('gym')

  return (
    <div className="screen">
      <h1 className="h1">Bài tập</h1>
      <SubTabs tabs={SUBS} active={sub} onSelect={setSub} label="Loại bài tập" />
      {sub === 'run' ? <RunProgress onOpenDay={onOpenDay} /> : <LiftModeView mode={sub} />}
    </div>
  )
}

function LiftModeView({ mode }: { mode: LiftMode }) {
  const data = useData()
  const today = dateKey()
  const day = getDay(today, data)
  const exById = useMemo(() => exerciseMap(data), [data])

  const [logging, setLogging] = useState(false)
  const [editing, setEditing] = useState<Exercise | null>(null)
  const [creating, setCreating] = useState(false)

  // Buổi hôm nay chỉ tính phần thuộc đúng chế độ đang xem.
  const todaysLifts = (day.lifts ?? []).filter(
    (e) => exById.get(e.exerciseId)?.mode === mode,
  )
  const summary = summarize(todaysLifts, exById, data.settings.weightKg)

  return (
    <>
      <section className="card">
        <div className="between" style={{ marginBottom: 10 }}>
          <h2 className="h2">
            {dayLabel(today)}
            {day.liftGroup && mode === 'gym' ? ` · ${LIFT_GROUP_LABELS[day.liftGroup]}` : ''}
          </h2>
          {todaysLifts.length > 0 && (
            <span className="dim num">{volumeShort(summary.volume)} kg</span>
          )}
        </div>

        {todaysLifts.length === 0 ? (
          <p className="empty" style={{ padding: '10px 0 14px' }}>
            Hôm nay chưa log buổi nào.
          </p>
        ) : (
          <div className="grid4" style={{ textAlign: 'center', marginBottom: 12 }}>
            <Stat label="bài" value={n(summary.exercises)} />
            <Stat label="set" value={n(summary.sets)} />
            <Stat label="rep" value={n(summary.reps)} />
            <Stat label="volume" value={volumeShort(summary.volume)} />
          </div>
        )}

        <button className="btn primary full" onClick={() => setLogging(true)}>
          {todaysLifts.length === 0 ? 'Log buổi hôm nay' : 'Sửa buổi hôm nay'}
        </button>
      </section>

      <Strength mode={mode} />

      <ExerciseList mode={mode} onOpen={setEditing} onCreate={() => setCreating(true)} />

      {logging && (
        <LiftSheet date={today} mode={mode} onClose={() => setLogging(false)} />
      )}

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
            defaultGroup={editing?.group ?? 'pull'}
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
