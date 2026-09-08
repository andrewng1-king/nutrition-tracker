import { useMemo, useState } from 'react'
import { CATEGORY_LABELS, GROUP_LABELS } from '../data/foods'
import { MEAL_LABELS, MEAL_ORDER, amountLabel, matchName, n } from '../lib/format'
import { useData } from '../lib/hooks'
import { macrosFor } from '../lib/macros'
import { addEntry, allFoods, applyTemplate, suggestedCost } from '../lib/storage'
import type { Food, MealSlot } from '../lib/types'
import { FoodIcon } from './foodIcons'
import { NumberInput } from './NumberInput'
import { Sheet } from './Sheet'

const GRAM_PRESETS = [50, 100, 150, 200, 250]
const PIECE_PRESETS = [1, 2, 3, 4]

interface Props {
  date: string
  defaultMeal: MealSlot
  /** mở thẳng bước nhập số lượng — dùng cho chip gợi ý món bù */
  preset?: { foodId: string; amount: number }
  onClose: () => void
}

export function LogSheet({ date, defaultMeal, preset, onClose }: Props) {
  const data = useData()
  const foods = useMemo(() => allFoods(data), [data])

  const [tab, setTab] = useState<'recent' | 'template' | 'all'>(
    Object.keys(data.recent).length > 0 ? 'recent' : 'all',
  )
  const [query, setQuery] = useState('')
  const [meal, setMeal] = useState<MealSlot>(defaultMeal)
  // Mẫu nhớ bữa của nó, nhưng nếu người dùng đã tự chọn bữa thì tôn trọng lựa chọn đó.
  const [mealTouched, setMealTouched] = useState(false)
  const pickMeal = (m: MealSlot) => {
    setMeal(m)
    setMealTouched(true)
  }
  const [picked, setPicked] = useState<Food | null>(
    () => foods.find((f) => f.id === preset?.foodId) ?? null,
  )

  if (picked) {
    return (
      <AmountStep
        key={picked.id}
        food={picked}
        meal={meal}
        setMeal={pickMeal}
        defaultAmount={
          (picked.id === preset?.foodId ? preset.amount : undefined) ??
          data.lastAmounts[picked.id] ??
          picked.servingSize
        }
        onBack={() => setPicked(null)}
        onConfirm={(amount, oilTsp, cost) => {
          addEntry(date, {
            foodId: picked.id,
            amount,
            meal,
            oilTsp: oilTsp || undefined,
            cost: cost || undefined,
          })
          onClose()
        }}
        onClose={onClose}
      />
    )
  }

  const q = query.trim()
  const matches = q ? foods.filter((f) => matchName(f.name, q)) : foods

  const recentIds = Object.entries(data.recent)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
  const recentFoods = recentIds
    .map((id) => foods.find((f) => f.id === id))
    .filter((f): f is Food => Boolean(f))
    .slice(0, 15)

  const list = q ? matches : tab === 'recent' ? recentFoods : matches

  return (
    <Sheet title="Thêm món" onClose={onClose} size="full">
      <MealPicker meal={meal} setMeal={pickMeal} />

      <input
        autoFocus
        type="search"
        placeholder="Tìm món… (gõ không dấu cũng được)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Tìm món ăn"
      />

      {!q && (
        <div className="seg">
          {(
            [
              ['recent', 'Gần đây'],
              ['template', 'Mẫu'],
              ['all', 'Tất cả'],
            ] as const
          ).map(([key, label]) => (
            <button key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>
      )}

      {!q && tab === 'template' ? (
        <TemplateList
          onApply={(id, templateMeal) => {
            applyTemplate(date, id, mealTouched ? meal : (templateMeal ?? meal))
            onClose()
          }}
        />
      ) : (
        <FoodList foods={list} grouped={!q && tab === 'all'} onPick={setPicked} />
      )}
    </Sheet>
  )
}

function MealPicker({ meal, setMeal }: { meal: MealSlot; setMeal: (m: MealSlot) => void }) {
  return (
    <div className="seg">
      {MEAL_ORDER.map((m) => (
        <button key={m} aria-pressed={meal === m} onClick={() => setMeal(m)}>
          {MEAL_LABELS[m]}
        </button>
      ))}
    </div>
  )
}

function FoodList({
  foods,
  grouped,
  onPick,
}: {
  foods: Food[]
  grouped: boolean
  onPick: (f: Food) => void
}) {
  if (foods.length === 0) {
    return <p className="empty">Không có món nào. Thêm món mới ở tab “Món ăn”.</p>
  }

  if (!grouped) {
    return (
      <div className="list">
        {foods.map((f) => (
          <FoodRow key={f.id} food={f} onPick={onPick} />
        ))}
      </div>
    )
  }

  const categories = [...new Set(foods.map((f) => f.category))]
  return (
    <>
      {categories.map((cat) => (
        <section key={cat} className="col" style={{ gap: 4 }}>
          <h3 className="h2">{CATEGORY_LABELS[cat] ?? cat}</h3>
          <div className="list">
            {foods
              .filter((f) => f.category === cat)
              .map((f) => (
                <FoodRow key={f.id} food={f} onPick={onPick} />
              ))}
          </div>
        </section>
      ))}
    </>
  )
}

function FoodRow({ food, onPick }: { food: Food; onPick: (f: Food) => void }) {
  return (
    <button className="list-item" onClick={() => onPick(food)}>
      <FoodIcon food={food} />
      <span className="grow">
        <span className="row" style={{ gap: 6 }}>
          <span className="truncate">{food.name}</span>
          {food.group && (
            <span className={`badge ${food.group}`}>{GROUP_LABELS[food.group]}</span>
          )}
          {food.estimate && <span className="badge est">ước tính</span>}
        </span>
        <span className="dim num">
          {n(food.kcal)} kcal · P {n(food.protein, 1)} · F {n(food.fat, 1)} · C{' '}
          {n(food.carb, 1)} / {amountLabel(food.servingSize, food.servingUnit)}
        </span>
      </span>
      <span className="dim" aria-hidden="true">
        ›
      </span>
    </button>
  )
}

function TemplateList({
  onApply,
}: {
  onApply: (id: string, meal: MealSlot | undefined) => void
}) {
  const data = useData()
  const foods = useMemo(() => allFoods(data), [data])
  const byId = (id: string) => foods.find((f) => f.id === id)

  if (data.templates.length === 0) {
    return (
      <p className="empty">
        Chưa có mẫu nào. Ở màn “Hôm nay”, log xong một bữa rồi bấm “Lưu thành mẫu”.
      </p>
    )
  }

  return (
    <div className="list">
      {data.templates.map((t) => {
        const kcal = t.items.reduce((sum, item) => {
          const f = byId(item.foodId)
          return f ? sum + macrosFor(f, item.amount, item.oilTsp ?? 0).kcal : sum
        }, 0)
        const names = t.items
          .map((i) => byId(i.foodId)?.name)
          .filter(Boolean)
          .join(', ')
        return (
          <button
            key={t.id}
            className="list-item"
            onClick={() => onApply(t.id, t.meal)}
          >
            <span className="grow">
              <span style={{ fontWeight: 600 }}>{t.name}</span>
              <span className="dim truncate" style={{ display: 'block' }}>
                {names}
              </span>
            </span>
            <span className="entry-kcal">{n(kcal)} kcal</span>
          </button>
        )
      })}
    </div>
  )
}

function AmountStep({
  food,
  meal,
  setMeal,
  defaultAmount,
  onBack,
  onConfirm,
  onClose,
}: {
  food: Food
  meal: MealSlot
  setMeal: (m: MealSlot) => void
  defaultAmount: number
  onBack: () => void
  onConfirm: (amount: number, oilTsp: number, cost: number) => void
  onClose: () => void
}) {
  const isGram = food.servingUnit === 'g'
  const [amount, setAmount] = useState(defaultAmount)
  const [oilTsp, setOilTsp] = useState(0)
  const [cost, setCost] = useState(() => suggestedCost(food.id, defaultAmount))
  const [costEdited, setCostEdited] = useState(false)
  const step = isGram ? 10 : 0.5
  const presets = isGram ? GRAM_PRESETS : PIECE_PRESETS
  const m = macrosFor(food, amount, oilTsp)

  // giá bám theo số lượng cho tới khi người dùng tự gõ tiền
  const setAmountAndCost = (next: number) => {
    setAmount(next)
    if (!costEdited) setCost(suggestedCost(food.id, next))
  }

  return (
    <Sheet
      title={food.name}
      onClose={onClose}
      size="full"
      action={
        <button className="btn sm" onClick={onBack}>
          ‹ Đổi món
        </button>
      }
    >
      <MealPicker meal={meal} setMeal={setMeal} />

      <div className="amount">
        <button
          className="step"
          onClick={() => setAmountAndCost(Math.max(step, Number((amount - step).toFixed(2))))}
          aria-label="Giảm"
        >
          −
        </button>
        <div className="grow">
          <NumberInput
            inputMode="decimal"
            value={amount}
            min={0}
            step={step}
            onChange={setAmountAndCost}
            aria-label={`Số lượng (${food.servingUnit})`}
          />
          <div className="dim" style={{ textAlign: 'center', marginTop: 4 }}>
            {food.servingUnit}
          </div>
        </div>
        <button
          className="step"
          onClick={() => setAmountAndCost(Number((amount + step).toFixed(2)))}
          aria-label="Tăng"
        >
          +
        </button>
      </div>

      <div className="chips">
        {presets.map((p) => (
          <button
            key={p}
            className="chip"
            aria-pressed={amount === p}
            onClick={() => setAmountAndCost(p)}
          >
            {amountLabel(p, food.servingUnit)}
          </button>
        ))}
      </div>

      <div className="field">
        <label htmlFor="log-cost">Giá tiền (₫) — bỏ trống nếu không tính</label>
        <NumberInput
          id="log-cost"
          inputMode="numeric"
          step={1000}
          value={cost}
          blankZero
          placeholder="0"
          onChange={(v) => {
            setCost(v)
            setCostEdited(true)
          }}
        />
      </div>

      {food.id !== 'trung-op-la' && (
        <div className="between">
          <span className="muted">Dầu thêm khi nấu</span>
          <div className="row" style={{ gap: 6 }}>
            <button
              className="btn sm"
              onClick={() => setOilTsp((o) => Math.max(0, o - 1))}
              aria-label="Bớt dầu"
            >
              −
            </button>
            <span className="num" style={{ minWidth: 68, textAlign: 'center' }}>
              {n(oilTsp)} mcf
            </span>
            <button
              className="btn sm"
              onClick={() => setOilTsp((o) => o + 1)}
              aria-label="Thêm dầu"
            >
              +
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="grid4" style={{ textAlign: 'center' }}>
          <Stat label="kcal" value={n(m.kcal)} color="var(--kcal)" />
          <Stat label="protein" value={n(m.protein, 1)} color="var(--protein)" />
          <Stat label="fat" value={n(m.fat, 1)} color="var(--fat)" />
          <Stat label="carb" value={n(m.carb, 1)} color="var(--carb)" />
        </div>
        {food.note && (
          <p className="dim" style={{ margin: '10px 0 0' }}>
            {food.note}
          </p>
        )}
      </div>

      <button
        className="btn primary full sheet-cta"
        onClick={() => onConfirm(amount, oilTsp, cost)}
      >
        Thêm vào bữa {MEAL_LABELS[meal].toLowerCase()}
      </button>
    </Sheet>
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
