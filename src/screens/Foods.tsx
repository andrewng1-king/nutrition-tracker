import { useMemo, useState } from 'react'
import { Sheet } from '../components/Sheet'
import { FoodIcon } from '../components/foodIcons'
import { CATEGORY_LABELS, GROUP_LABELS } from '../data/foods'
import { amountLabel, matchName, n } from '../lib/format'
import { useData } from '../lib/hooks'
import { allFoods, deleteFood, isOverriddenSeed, saveFood } from '../lib/storage'
import type { Food, FoodCategory, FoodGroup } from '../lib/types'

const CATEGORIES: FoodCategory[] = ['protein', 'trung', 'tinhbot', 'snack', 'anngoai', 'khac']
const GROUPS: FoodGroup[] = ['good', 'moderate', 'limit']

export function Foods() {
  const data = useData()
  const foods = useMemo(() => allFoods(data), [data])
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Food | 'new' | null>(null)

  const q = query.trim()
  const list = q ? foods.filter((f) => matchName(f.name, q)) : foods
  const categories = CATEGORIES.filter((c) => list.some((f) => f.category === c))

  return (
    <div className="screen">
      <div className="between">
        <h1 className="h1">Món ăn</h1>
        <button className="btn sm primary" onClick={() => setEditing('new')}>
          + Món mới
        </button>
      </div>

      <input
        type="search"
        placeholder="Tìm món…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Tìm món ăn"
      />

      <p className="dim" style={{ margin: 0 }}>
        Số liệu tính theo thực phẩm đã nấu chín, không thêm dầu. Dầu thêm khi nấu được
        cộng riêng lúc log (1 muỗng cà phê = +5g fat, +45 kcal).
      </p>

      {list.length === 0 && <p className="empty">Không tìm thấy món nào.</p>}

      {categories.map((cat) => (
        <section key={cat} className="card">
          <h2 className="h2" style={{ marginBottom: 4 }}>
            {CATEGORY_LABELS[cat]}
          </h2>
          <div className="list">
            {list
              .filter((f) => f.category === cat)
              .map((f) => (
                <button key={f.id} className="entry" onClick={() => setEditing(f)}>
                  <FoodIcon food={f} />
                  <span className="grow">
                    <span className="row" style={{ gap: 6 }}>
                      <span className="truncate">{f.name}</span>
                      {f.group && (
                        <span className={`badge ${f.group}`}>{GROUP_LABELS[f.group]}</span>
                      )}
                      {f.custom && (
                        <span className="badge est">
                          {isOverriddenSeed(f.id, data) ? 'đã sửa' : 'tự thêm'}
                        </span>
                      )}
                    </span>
                    <span className="dim num">
                      P {n(f.protein, 1)} · F {n(f.fat, 1)} · C {n(f.carb, 1)}
                      {f.addedSugar ? ` · đường ${n(f.addedSugar, 1)}` : ''} /{' '}
                      {amountLabel(f.servingSize, f.servingUnit)}
                    </span>
                  </span>
                  <span className="entry-kcal">{n(f.kcal)}</span>
                </button>
              ))}
          </div>
        </section>
      ))}

      {editing && (
        <FoodForm
          food={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function FoodForm({ food, onClose }: { food: Food | null; onClose: () => void }) {
  const data = useData()
  const [f, setF] = useState<Omit<Food, 'id' | 'custom'>>(
    food ?? {
      name: '',
      category: 'protein',
      group: 'good',
      servingSize: 100,
      servingUnit: 'g',
      kcal: 0,
      protein: 0,
      fat: 0,
      carb: 0,
    },
  )

  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) =>
    setF((prev) => ({ ...prev, [key]: value }))

  const num = (key: 'servingSize' | 'kcal' | 'protein' | 'fat' | 'carb' | 'addedSugar') => ({
    type: 'number' as const,
    inputMode: 'decimal' as const,
    value: f[key] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      set(key, Number(e.target.value) as never),
  })

  // Đề xuất kcal từ macro (4/9/4) — Atwater, để không phải tự nhẩm.
  const derivedKcal = Math.round(f.protein * 4 + f.fat * 9 + f.carb * 4)
  const kcalOff = f.kcal > 0 && Math.abs(f.kcal - derivedKcal) > Math.max(20, f.kcal * 0.15)

  const overridden = food ? isOverriddenSeed(food.id, data) : false

  return (
    <Sheet title={food ? 'Sửa món' : 'Món mới'} onClose={onClose}>
      <div className="field">
        <label htmlFor="f-name">Tên món</label>
        <input
          id="f-name"
          value={f.name}
          onChange={(e) => set('name', e.target.value)}
          autoFocus={!food}
        />
      </div>

      <div className="grid2">
        <div className="field">
          <label htmlFor="f-cat">Nhóm thực phẩm</label>
          <select
            id="f-cat"
            value={f.category}
            onChange={(e) => set('category', e.target.value as FoodCategory)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-group">Xếp loại</label>
          <select
            id="f-group"
            value={f.group ?? ''}
            onChange={(e) => set('group', (e.target.value || undefined) as FoodGroup)}
          >
            <option value="">—</option>
            {GROUPS.map((g) => (
              <option key={g} value={g}>
                {GROUP_LABELS[g]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid2">
        <div className="field">
          <label htmlFor="f-size">Khẩu phần</label>
          <input id="f-size" {...num('servingSize')} />
        </div>
        <div className="field">
          <label htmlFor="f-unit">Đơn vị</label>
          <input
            id="f-unit"
            value={f.servingUnit}
            onChange={(e) => set('servingUnit', e.target.value)}
            placeholder="g / quả / muỗng"
          />
        </div>
      </div>

      <p className="dim" style={{ margin: 0 }}>
        Các số dưới đây tính cho {n(f.servingSize)} {f.servingUnit}.
      </p>

      <div className="grid2">
        <div className="field">
          <label htmlFor="f-kcal">Calo (kcal)</label>
          <input id="f-kcal" {...num('kcal')} />
        </div>
        <div className="field">
          <label htmlFor="f-protein">Protein (g)</label>
          <input id="f-protein" {...num('protein')} />
        </div>
        <div className="field">
          <label htmlFor="f-fat">Fat (g)</label>
          <input id="f-fat" {...num('fat')} />
        </div>
        <div className="field">
          <label htmlFor="f-carb">Carb (g)</label>
          <input id="f-carb" {...num('carb')} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="f-sugar">Đường thêm vào (g) — bỏ trống nếu không có</label>
        <input id="f-sugar" {...num('addedSugar')} />
      </div>

      <div className="row" style={{ gap: 12 }}>
        <FoodIcon food={{ id: food?.id ?? '', name: f.name, category: f.category }} />
        <p className="dim" style={{ margin: 0 }}>
          Icon lấy tự động theo tên món và nhóm thực phẩm — không cần thêm ảnh.
        </p>
      </div>

      {(f.kcal === 0 || kcalOff) && derivedKcal > 0 && (
        <button className="btn full" onClick={() => set('kcal', derivedKcal)}>
          {f.kcal === 0
            ? `Dùng ${derivedKcal} kcal (tính từ macro)`
            : `Macro cho ra ${derivedKcal} kcal — dùng số này?`}
        </button>
      )}

      <button
        className="btn primary full"
        disabled={!f.name.trim() || f.servingSize <= 0}
        onClick={() => {
          saveFood({ ...f, name: f.name.trim(), id: food?.id })
          onClose()
        }}
      >
        Lưu
      </button>

      {food?.custom && (
        <button
          className="btn danger full"
          onClick={() => {
            deleteFood(food.id)
            onClose()
          }}
        >
          {overridden ? 'Khôi phục số liệu gốc' : 'Xoá món này'}
        </button>
      )}

      {overridden && (
        <p className="dim" style={{ margin: 0 }}>
          Món này thuộc bảng gốc và đang bị bạn ghi đè. Xoá để quay lại số liệu gốc.
        </p>
      )}
    </Sheet>
  )
}
