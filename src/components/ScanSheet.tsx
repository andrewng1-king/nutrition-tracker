import { useEffect, useMemo, useRef, useState } from 'react'
import { MEAL_LABELS, MEAL_ORDER, guessMeal, n } from '../lib/format'
import { useData } from '../lib/hooks'
import { derivedKcal, parseLabel } from '../lib/label'
import { computeTargets, dayTypesFor, sumEntries } from '../lib/macros'
import { addEntry, foodMap, getDay, saveFood } from '../lib/storage'
import type { Macros, MealSlot } from '../lib/types'
import { decide } from '../lib/verdict'
import { weekSummary } from '../lib/week'
import { IconCamera, IconImage } from './icons'
import { Sheet } from './Sheet'

type Stage = 'capture' | 'reading' | 'review'
type Basis = 'per100' | 'serving'

interface Fields {
  name: string
  basis: Basis
  kcal: number
  protein: number
  fat: number
  carb: number
  sugar: number
  /** gram sẽ ăn (per100) hoặc số khẩu phần (serving) */
  amount: number
  /** đường trên nhãn là đường tự nhiên (sữa, trái cây) -> không tính vào hạn mức */
  naturalSugar: boolean
}

const EMPTY: Fields = {
  name: '',
  basis: 'per100',
  kcal: 0,
  protein: 0,
  fat: 0,
  carb: 0,
  sugar: 0,
  amount: 100,
  naturalSugar: false,
}

/** Thu nhỏ ảnh trước khi OCR — ảnh 12MP làm tesseract chạy rất lâu mà không chính xác hơn. */
async function downscale(file: File, maxSide = 1500): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.92),
  )
}

export function ScanSheet({ date, onClose }: { date: string; onClose: () => void }) {
  const data = useData()
  const map = useMemo(() => foodMap(data), [data])
  // Hai ô file riêng: `capture` ép điện thoại mở thẳng camera, không cho vào album.
  // Ô không có `capture` thì iOS/Android mở trình chọn ảnh có sẵn.
  const cameraRef = useRef<HTMLInputElement>(null)
  const albumRef = useRef<HTMLInputElement>(null)

  const [stage, setStage] = useState<Stage>('capture')
  const [preview, setPreview] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [ocrFound, setOcrFound] = useState<number | null>(null)
  const [f, setF] = useState<Fields>(EMPTY)
  const [meal, setMeal] = useState<MealSlot>(guessMeal())

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) =>
    setF((prev) => ({ ...prev, [key]: value }))

  async function handleFile(file: File) {
    setError(null)
    setPreview(URL.createObjectURL(file))
    setStage('reading')
    setProgress(0)
    try {
      const image = await downscale(file)
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker(['vie', 'eng'], undefined, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') setProgress(m.progress)
        },
      })
      const { data: result } = await worker.recognize(image)
      await worker.terminate()

      const parsed = parseLabel(result.text)
      setOcrFound(parsed.found)
      const basis: Basis = parsed.basis === 'serving' ? 'serving' : 'per100'
      setF({
        ...EMPTY,
        basis,
        kcal: parsed.kcal ?? derivedKcal(parsed),
        protein: parsed.protein ?? 0,
        fat: parsed.fat ?? 0,
        carb: parsed.carb ?? 0,
        sugar: parsed.sugar ?? 0,
        amount: basis === 'per100' ? (parsed.servingGrams ?? 100) : 1,
      })
      setStage('review')
    } catch (err) {
      setError(
        `Không đọc được ảnh: ${(err as Error).message}. Nhập tay số liệu bên dưới cũng được.`,
      )
      setOcrFound(0)
      setStage('review')
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  // --- tính toán ---
  const factor = f.basis === 'per100' ? f.amount / 100 : f.amount
  const item: Macros = {
    kcal: f.kcal * factor,
    protein: f.protein * factor,
    fat: f.fat * factor,
    carb: f.carb * factor,
    addedSugar: f.naturalSugar ? 0 : f.sugar * factor,
  }

  const day = getDay(date, data)
  const dayTypes = dayTypesFor(date, data.settings, day)
  const targets = computeTargets(data.settings, {
    runDay: dayTypes.includes('run'),
    liftDay: dayTypes.includes('lift'),
    runBurnKcal: day.run?.burnKcal,
  })
  const today = sumEntries(day.entries, (id) => map.get(id))
  const week = weekSummary(data, date)
  const verdict = decide(item, today, targets, week)

  function log(asCheat: boolean, amountOverride?: number) {
    const amount = amountOverride ?? f.amount
    const foodId = saveFood({
      name: f.name.trim() || 'Món đã chụp nhãn',
      category: 'khac',
      group: 'limit',
      servingSize: f.basis === 'per100' ? 100 : 1,
      servingUnit: f.basis === 'per100' ? 'g' : 'phần',
      kcal: f.kcal,
      protein: f.protein,
      fat: f.fat,
      carb: f.carb,
      addedSugar: f.naturalSugar ? 0 : f.sugar,
      estimate: true,
      note: 'Đọc từ ảnh nhãn dinh dưỡng.',
    })
    addEntry(date, { foodId, amount, meal, cheat: asCheat || undefined })
    onClose()
  }

  return (
    <Sheet title="Quét nhãn dinh dưỡng" onClose={onClose}>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onPick}
      />
      <input ref={albumRef} type="file" accept="image/*" hidden onChange={onPick} />

      {preview && <img className="shot" src={preview} alt="Ảnh nhãn dinh dưỡng" />}

      {stage === 'capture' && (
        <>
          <p className="muted" style={{ margin: 0 }}>
            Chụp bảng “Thông tin dinh dưỡng” trên bao bì, hoặc chọn ảnh đã chụp sẵn trong
            album. App đọc số, đối chiếu với calo còn lại hôm nay, phần calo đã để dành
            trong tuần và cheat meal còn hay hết — rồi nói nên ăn hay không.
          </p>
          <button className="btn primary full" onClick={() => cameraRef.current?.click()}>
            <IconCamera className="ico" />
            Chụp nhãn
          </button>
          <button className="btn full" onClick={() => albumRef.current?.click()}>
            <IconImage className="ico" />
            Chọn ảnh từ album
          </button>
          <button
            className="btn full"
            onClick={() => {
              setOcrFound(null)
              setStage('review')
            }}
          >
            Nhập tay, không chụp
          </button>
          <p className="dim" style={{ margin: 0 }}>
            Lần quét đầu tiên cần mạng để tải bộ nhận dạng chữ (~10MB), sau đó dùng offline
            được.
          </p>
        </>
      )}

      {stage === 'reading' && (
        <div className="card col">
          <strong>Đang đọc nhãn…</strong>
          <div className="progress-line">
            <i style={{ transform: `scaleX(${Math.max(0.04, progress)})` }} />
          </div>
          <span className="dim">{Math.round(progress * 100)}%</span>
        </div>
      )}

      {stage === 'review' && (
        <>
          {error && (
            <p className="muted" style={{ margin: 0, color: 'var(--warn)' }}>
              {error}
            </p>
          )}
          {ocrFound !== null && !error && (
            <p className="dim" style={{ margin: 0 }}>
              {ocrFound >= 4
                ? `Đọc được ${ocrFound}/5 dòng. Kiểm tra lại rồi sửa nếu sai.`
                : `Chỉ đọc được ${ocrFound}/5 dòng — nhãn mờ hoặc chụp nghiêng. Sửa tay bên dưới.`}
            </p>
          )}

          <div className="field">
            <label htmlFor="sc-name">Tên món</label>
            <input
              id="sc-name"
              value={f.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="VD: Bánh quy Cosy"
            />
          </div>

          <div className="seg ghost">
            <button
              aria-pressed={f.basis === 'per100'}
              onClick={() => setF((p) => ({ ...p, basis: 'per100', amount: 100 }))}
            >
              Số liệu / 100g
            </button>
            <button
              aria-pressed={f.basis === 'serving'}
              onClick={() => setF((p) => ({ ...p, basis: 'serving', amount: 1 }))}
            >
              Số liệu / khẩu phần
            </button>
          </div>

          <div className="grid2">
            <NumField
              id="sc-kcal"
              label="Calo (kcal)"
              value={f.kcal}
              onChange={(v) => set('kcal', v)}
            />
            <NumField
              id="sc-protein"
              label="Protein (g)"
              value={f.protein}
              onChange={(v) => set('protein', v)}
            />
            <NumField
              id="sc-fat"
              label="Fat (g)"
              value={f.fat}
              onChange={(v) => set('fat', v)}
            />
            <NumField
              id="sc-carb"
              label="Carb (g)"
              value={f.carb}
              onChange={(v) => set('carb', v)}
            />
          </div>

          <NumField
            id="sc-sugar"
            label="Đường trên nhãn (g)"
            value={f.sugar}
            onChange={(v) => set('sugar', v)}
          />
          <button
            className="btn full"
            aria-pressed={f.naturalSugar}
            onClick={() => set('naturalSugar', !f.naturalSugar)}
            style={
              f.naturalSugar ? { borderColor: 'var(--ok)', color: 'var(--ok)' } : undefined
            }
          >
            {f.naturalSugar
              ? '✓ Đường tự nhiên — không tính vào hạn mức'
              : 'Đánh dấu là đường tự nhiên (sữa, trái cây)'}
          </button>

          <div className="field">
            <label htmlFor="sc-amount">
              {f.basis === 'per100' ? 'Sẽ ăn bao nhiêu gram?' : 'Sẽ ăn mấy khẩu phần?'}
            </label>
            <input
              id="sc-amount"
              type="number"
              inputMode="decimal"
              step={f.basis === 'per100' ? 10 : 0.5}
              value={f.amount}
              onChange={(e) => set('amount', Math.max(0, Number(e.target.value)))}
            />
          </div>

          <div className="card">
            <h3 className="h2" style={{ marginBottom: 8 }}>
              Phần định ăn
            </h3>
            <div className="grid4" style={{ textAlign: 'center' }}>
              <Stat label="kcal" value={n(item.kcal)} color="var(--kcal)" />
              <Stat label="protein" value={n(item.protein, 1)} color="var(--protein)" />
              <Stat label="fat" value={n(item.fat, 1)} color="var(--fat)" />
              <Stat label="carb" value={n(item.carb, 1)} color="var(--carb)" />
            </div>
          </div>

          <div className={`verdict ${verdict.kind}`}>
            <h3>{verdict.title}</h3>
            <ul className="reasons">
              {verdict.reasons.map((r, i) => (
                <li key={i}>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="seg ghost">
            {MEAL_ORDER.map((m) => (
              <button key={m} aria-pressed={meal === m} onClick={() => setMeal(m)}>
                {MEAL_LABELS[m]}
              </button>
            ))}
          </div>

          {verdict.kind === 'skip' && verdict.fitsFraction >= 0.25 && (
            <button
              className="btn full"
              onClick={() => log(false, Number((f.amount * verdict.fitsFraction).toFixed(1)))}
            >
              Log phần vừa đủ ({n(f.amount * verdict.fitsFraction, 1)}{' '}
              {f.basis === 'per100' ? 'g' : 'phần'})
            </button>
          )}

          {verdict.kind === 'cheat' && (
            <button className="btn primary full" onClick={() => log(true)}>
              Log và tính là cheat meal
            </button>
          )}

          <button
            className={`btn full ${verdict.kind === 'eat' ? 'primary' : ''}`}
            onClick={() => log(false)}
            disabled={f.kcal <= 0 || f.amount <= 0}
          >
            Log cả phần này
          </button>

          <div className="grid2">
            <button className="btn full" onClick={() => cameraRef.current?.click()}>
              Chụp lại
            </button>
            <button className="btn full" onClick={() => albumRef.current?.click()}>
              Chọn ảnh khác
            </button>
          </div>
        </>
      )}
    </Sheet>
  )
}

function NumField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step="0.1"
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
      />
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="num" style={{ color, fontSize: 19, fontWeight: 700 }}>
        {value}
      </div>
      <div className="dim">{label}</div>
    </div>
  )
}
