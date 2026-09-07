import { useState } from 'react'
import { useData } from '../lib/hooks'
import { GEAR_LABELS, LIFT_GROUPS, LIFT_GROUP_LABELS } from '../lib/lift'
import { deleteExercise, isOverriddenSeedExercise, saveExercise } from '../lib/storage'
import type { Exercise, LiftGear, LiftGroup, LiftMode } from '../lib/types'

const GEARS: LiftGear[] = ['stack', 'db', 'smith', 'bar', 'body']

/** Tạ đơn và thanh Smith mặc định là ghi mỗi bên — đúng cách người dùng đọc số. */
const GEAR_DEFAULT_PER_SIDE: Record<LiftGear, boolean> = {
  stack: false,
  db: true,
  smith: true,
  bar: false,
  body: false,
}

/** Bài thể trọng không có khái niệm "mỗi bên" — tải là chính cơ thể. */
function allowPerSide(gear: LiftGear): boolean {
  return gear !== 'body'
}

export function ExerciseForm({
  existing,
  defaultGroup,
  mode,
  onDone,
  onCancel,
}: {
  existing?: Exercise
  defaultGroup: LiftGroup
  mode: LiftMode
  onDone: (id: string) => void
  onCancel: () => void
}) {
  const data = useData()
  const initialGear: LiftGear = existing?.gear ?? (mode === 'calisthenic' ? 'body' : 'stack')
  const [name, setName] = useState(existing?.name ?? '')
  const [group, setGroup] = useState<LiftGroup>(existing?.group ?? defaultGroup)
  const [gear, setGear] = useState<LiftGear>(initialGear)
  const [perSide, setPerSide] = useState(
    existing?.perSide ?? GEAR_DEFAULT_PER_SIDE[initialGear],
  )

  const canReset = existing ? isOverriddenSeedExercise(existing.id, data) : false
  const effectivePerSide = perSide && allowPerSide(gear)

  return (
    <>
      <div className="field">
        <label htmlFor="ex-name">Tên bài</label>
        <input
          id="ex-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={mode === 'calisthenic' ? 'VD: Archer Pull-Up' : 'VD: Pendlay Row'}
          autoFocus
        />
      </div>
      <p className="dim" style={{ margin: 0 }}>
        Đặt tên tiếng Anh cho khớp chữ in trên máy và dễ tra cứu.
      </p>

      <div className="field">
        <label>Nhóm cơ</label>
        <div className="chips">
          {LIFT_GROUPS.map((g) => (
            <button key={g} className="chip" aria-pressed={group === g} onClick={() => setGroup(g)}>
              {LIFT_GROUP_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Dụng cụ</label>
        <div className="chips">
          {GEARS.map((g) => (
            <button
              key={g}
              className="chip"
              aria-pressed={gear === g}
              onClick={() => {
                setGear(g)
                setPerSide(GEAR_DEFAULT_PER_SIDE[g])
              }}
            >
              {GEAR_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      {allowPerSide(gear) ? (
        <>
          <button
            className="chip"
            aria-pressed={perSide}
            style={{ alignSelf: 'flex-start' }}
            onClick={() => setPerSide((v) => !v)}
          >
            Số nhập là mỗi bên / mỗi tay
          </button>
          <p className="dim" style={{ margin: 0 }}>
            {perSide
              ? 'Nhập 22 nghĩa là 22 kg mỗi bên — volume tính 44 kg mỗi rep.'
              : 'Nhập đúng con số đọc trên máy hoặc trên thanh. Không quy đổi ròng rọc — chỉ cần ghi nhất quán là so sánh được.'}
          </p>
        </>
      ) : (
        <p className="dim" style={{ margin: 0 }}>
          Bài thể trọng: ô kg là tải <b>cộng thêm</b> (đai tạ, tạ kẹp chân). Tay không thì
          để 0 — volume vẫn tính theo cân nặng cơ thể.
        </p>
      )}

      <button
        className="btn primary full"
        disabled={!name.trim()}
        onClick={() => {
          const id = saveExercise({
            id: existing?.id,
            name: name.trim(),
            group,
            mode: existing?.mode ?? mode,
            gear,
            perSide: effectivePerSide || undefined,
            note: existing?.note,
          })
          onDone(id)
        }}
      >
        {existing ? 'Lưu thay đổi' : 'Tạo bài'}
      </button>

      {canReset && existing && (
        <button
          className="btn full"
          onClick={() => {
            deleteExercise(existing.id)
            onDone(existing.id)
          }}
        >
          Khôi phục tên gốc
        </button>
      )}

      {existing?.custom && (
        <button
          className="btn danger full"
          onClick={() => {
            deleteExercise(existing.id)
            onCancel()
          }}
        >
          Xoá bài này
        </button>
      )}

      <button className="btn full" onClick={onCancel}>
        Huỷ
      </button>
    </>
  )
}
