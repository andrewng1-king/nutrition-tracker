import { useState } from 'react'
import { MEAL_LABELS, MEAL_ORDER, n } from '../lib/format'
import { macrosFor } from '../lib/macros'
import { removeEntry, updateEntry } from '../lib/storage'
import type { Entry, Food, MealSlot } from '../lib/types'
import { Sheet } from './Sheet'

interface Props {
  date: string
  entry: Entry
  food: Food
  onClose: () => void
}

export function EntrySheet({ date, entry, food, onClose }: Props) {
  const [amount, setAmount] = useState(entry.amount)
  const [oilTsp, setOilTsp] = useState(entry.oilTsp ?? 0)
  const [meal, setMeal] = useState<MealSlot>(entry.meal)
  const [cheat, setCheat] = useState(Boolean(entry.cheat))
  const [cost, setCost] = useState(entry.cost ?? 0)
  const step = food.servingUnit === 'g' ? 10 : 0.5
  const m = macrosFor(food, amount, oilTsp)

  const save = () => {
    updateEntry(date, entry.id, {
      amount,
      oilTsp: oilTsp || undefined,
      meal,
      cheat,
      cost: cost || undefined,
    })
    onClose()
  }

  return (
    <Sheet title={food.name} onClose={onClose}>
      <div className="seg">
        {MEAL_ORDER.map((x) => (
          <button key={x} aria-pressed={meal === x} onClick={() => setMeal(x)}>
            {MEAL_LABELS[x]}
          </button>
        ))}
      </div>

      <div className="amount">
        <button
          className="step"
          onClick={() => setAmount((a) => Math.max(step, Number((a - step).toFixed(2))))}
          aria-label="Giảm"
        >
          −
        </button>
        <div className="grow">
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            min={0}
            step={step}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            aria-label={`Số lượng (${food.servingUnit})`}
          />
          <div className="dim" style={{ textAlign: 'center', marginTop: 4 }}>
            {food.servingUnit}
          </div>
        </div>
        <button
          className="step"
          onClick={() => setAmount((a) => Number((a + step).toFixed(2)))}
          aria-label="Tăng"
        >
          +
        </button>
      </div>

      <div className="between">
        <span className="muted">Dầu thêm khi nấu</span>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn sm" onClick={() => setOilTsp((o) => Math.max(0, o - 1))}>
            −
          </button>
          <span className="num" style={{ minWidth: 68, textAlign: 'center' }}>
            {n(oilTsp)} mcf
          </span>
          <button className="btn sm" onClick={() => setOilTsp((o) => o + 1)}>
            +
          </button>
        </div>
      </div>

      <div className="field">
        <label htmlFor="entry-cost">Giá tiền (₫)</label>
        <input
          id="entry-cost"
          type="number"
          inputMode="numeric"
          step="1000"
          value={cost || ''}
          placeholder="0"
          onChange={(e) => setCost(Math.max(0, Number(e.target.value)))}
        />
      </div>

      <button
        className="btn full"
        aria-pressed={cheat}
        onClick={() => setCheat((c) => !c)}
        style={cheat ? { borderColor: 'var(--kcal)', color: 'var(--kcal)' } : undefined}
      >
        {cheat ? '★ Đã đánh dấu cheat meal' : 'Đánh dấu là cheat meal'}
      </button>

      <p className="dim" style={{ margin: 0 }}>
        {n(m.kcal)} kcal · P {n(m.protein, 1)} · F {n(m.fat, 1)} · C {n(m.carb, 1)}
      </p>

      <button className="btn primary full" onClick={save}>
        Lưu
      </button>
      <button
        className="btn danger full"
        onClick={() => {
          removeEntry(date, entry.id)
          onClose()
        }}
      >
        Xoá món này
      </button>
    </Sheet>
  )
}
