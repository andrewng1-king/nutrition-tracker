import { describe, expect, it } from 'vitest'
import { SEED_FOODS } from '../data/foods'
import { matchName } from './format'
import {
  DEFAULT_SETTINGS,
  averageMacros,
  computeAdjust,
  computeTargets,
  dayTypesFor,
  evaluate,
  isRunDay,
  macrosFor,
  suggestPortions,
  sumEntries,
} from './macros'
import type { DayLog, Entry, Food, Macros } from './types'

/**
 * Mốc so sánh của các test này là ngày TẬP TẠ — lịch thường ngày của người dùng,
 * cũng là mức 2250-2350 kcal gốc trong spec. Ngày nghỉ và ngày chỉ chạy lệch khỏi
 * mốc đó vì phần calo gym nằm sẵn trong TDEE bị trừ ra.
 */
const LIFT_DAY = { runDay: false, liftDay: true }
const RUN_LIFT_DAY = { runDay: true, liftDay: true }

const byId = (id: string) => SEED_FOODS.find((f) => f.id === id)
const food = (id: string): Food => {
  const f = byId(id)
  if (!f) throw new Error(`missing seed food ${id}`)
  return f
}

const macros = (p: Partial<Macros>): Macros => ({
  kcal: 0,
  protein: 0,
  fat: 0,
  carb: 0,
  addedSugar: 0,
  ...p,
})

describe('macrosFor', () => {
  it('scales per-100g foods by gram amount', () => {
    const m = macrosFor(food('uc-ga'), 150)
    expect(m.kcal).toBeCloseTo(247.5)
    expect(m.protein).toBeCloseTo(46.5)
    expect(m.fat).toBeCloseTo(5.4)
  })

  it('scales per-piece foods by count', () => {
    const m = macrosFor(food('trung-luoc'), 3)
    expect(m.kcal).toBeCloseTo(234)
    expect(m.protein).toBeCloseTo(19.5)
    expect(m.fat).toBeCloseTo(16.5)
  })

  it('adds 5g fat and 45 kcal per teaspoon of oil', () => {
    const plain = macrosFor(food('uc-ga'), 100)
    const oiled = macrosFor(food('uc-ga'), 100, 2)
    expect(oiled.fat - plain.fat).toBeCloseTo(10)
    expect(oiled.kcal - plain.kcal).toBeCloseTo(90)
  })
})

describe('sumEntries', () => {
  it('totals a day and skips entries whose food was deleted', () => {
    const entries: Entry[] = [
      { id: '1', foodId: 'uc-ga', amount: 200, meal: 'trua', ts: 0 },
      { id: '2', foodId: 'com-trang', amount: 250, meal: 'trua', ts: 0 },
      { id: '3', foodId: 'khong-ton-tai', amount: 100, meal: 'toi', ts: 0 },
    ]
    const total = sumEntries(entries, byId)
    expect(total.protein).toBeCloseTo(62 + 6.75)
    expect(total.carb).toBeCloseTo(70)
    expect(total.kcal).toBeCloseTo(330 + 325)
  })
})

describe('computeTargets', () => {
  it('keeps the spec macros for a 60kg body', () => {
    const t = computeTargets(DEFAULT_SETTINGS, LIFT_DAY)
    expect(t.protein).toBe(140)
    expect(t.fat).toBe(65)
  })

  /**
   * 2250-2350 kcal trong spec là trung bình TUẦN, vì TDEE 2600 đã gồm lịch gym
   * 4-5 buổi. Nên không ngày đơn lẻ nào bằng đúng con số đó: ngày tập nhích lên,
   * ngày không tập tụt xuống, và cả tuần phải bù trừ về đúng mốc cũ.
   */
  it('shifts a gym day up and a non-gym day down around the weekly average', () => {
    const gym = computeTargets(DEFAULT_SETTINGS, LIFT_DAY)
    const off = computeTargets(DEFAULT_SETTINGS, { runDay: false, liftDay: false })
    expect(gym.kcalMax).toBeGreaterThan(2350)
    expect(off.kcalMax).toBeLessThan(2350)

    const { gymSessionsPerWeek: sessions } = DEFAULT_SETTINGS
    const weekly = gym.kcalMax * sessions + off.kcalMax * (7 - sessions)
    expect(weekly / 7).toBeCloseTo(2350, 0)
  })

  it('never lets the carb target fall under its own warning floor', () => {
    const off = computeTargets(
      { ...DEFAULT_SETTINGS, gymBurnKcal: 2000 },
      { runDay: false, liftDay: false },
    )
    expect(off.carb).toBeGreaterThanOrEqual(off.carbMin)
  })

  it('adds run-day calories as carb only, never protein', () => {
    const rest = computeTargets(DEFAULT_SETTINGS, LIFT_DAY)
    const run = computeTargets(DEFAULT_SETTINGS, RUN_LIFT_DAY)
    expect(run.protein).toBe(rest.protein)
    expect(run.kcalMin - rest.kcalMin).toBe(DEFAULT_SETTINGS.runDayExtraKcal)
    expect(run.carb - rest.carb).toBe(Math.round(DEFAULT_SETTINGS.runDayExtraKcal / 4))
  })

  it('scales protein with bodyweight at ~2.3 g/kg', () => {
    expect(computeTargets({ ...DEFAULT_SETTINGS, weightKg: 64 }, LIFT_DAY).protein).toBe(149)
  })

  it('keeps warning thresholds absolute on run days', () => {
    const run = computeTargets(DEFAULT_SETTINGS, RUN_LIFT_DAY)
    expect(run.carbMin).toBe(200)
    expect(run.fatMin).toBe(50)
    expect(run.kcalFloor).toBe(2000)
  })
})

describe('isRunDay', () => {
  it('defaults to Thứ 3 and Chủ nhật', () => {
    expect(isRunDay('2026-09-08', DEFAULT_SETTINGS)).toBe(true) // Tuesday
    expect(isRunDay('2026-09-06', DEFAULT_SETTINGS)).toBe(true) // Sunday
    expect(isRunDay('2026-09-07', DEFAULT_SETTINGS)).toBe(false) // Monday
  })

  it('lets an explicit day override the weekday default', () => {
    const day = { date: '2026-09-07', entries: [], isRunDay: true }
    expect(isRunDay('2026-09-07', DEFAULT_SETTINGS, day)).toBe(true)
    const off = { date: '2026-09-08', entries: [], isRunDay: false }
    expect(isRunDay('2026-09-08', DEFAULT_SETTINGS, off)).toBe(false)
  })
})

describe('evaluate — STATUS_RULES', () => {
  const t = computeTargets(DEFAULT_SETTINGS, LIFT_DAY)

  it('returns OK when everything is inside the thresholds', () => {
    const m = macros({ kcal: 2300, protein: 140, fat: 60, carb: 285, addedSugar: 20 })
    expect(evaluate(m, t)).toEqual([])
  })

  it('flags low protein with the remaining deficit', () => {
    const m = macros({ kcal: 2300, protein: 110, fat: 60, carb: 285 })
    const w = evaluate(m, t)
    expect(w[0].key).toBe('protein')
    expect(w[0].deficit).toBeCloseTo(30)
  })

  it('flags fat below 50g and above 65g, never both', () => {
    const low = evaluate(macros({ kcal: 2300, protein: 140, fat: 40, carb: 285 }), t)
    expect(low.map((x) => x.message)).toEqual(['Fat quá thấp, ảnh hưởng hormone'])
    const high = evaluate(macros({ kcal: 2300, protein: 140, fat: 80, carb: 285 }), t)
    expect(high.map((x) => x.message)).toEqual(['Vượt fat budget'])
  })

  it('does not flag calories above the target range', () => {
    const m = macros({ kcal: 2900, protein: 140, fat: 60, carb: 285 })
    expect(evaluate(m, t)).toEqual([])
  })

  it('orders warnings protein > fat > calo > carb > đường', () => {
    const m = macros({ kcal: 900, protein: 40, fat: 20, carb: 90, addedSugar: 60 })
    expect(evaluate(m, t).map((w) => w.key)).toEqual([
      'protein',
      'fat',
      'kcal',
      'carb',
      'sugar',
    ])
  })
})

describe('suggestPortions', () => {
  it('reproduces the spec amounts for a 30g protein shortfall', () => {
    // spec: thiếu 30g protein -> 97g ức gà HOẶC 125g tôm HOẶC 1.25 muỗng whey
    const amount = (id: string) =>
      suggestPortions('protein', 30, SEED_FOODS, 1, [id])[0].amount
    expect(amount('uc-ga')).toBe(97)
    expect(amount('tom')).toBe(125)
    expect(amount('whey')).toBeCloseTo(1.25)
  })

  it('spreads suggestions across categories before repeating one', () => {
    const s = suggestPortions('protein', 30, SEED_FOODS)
    expect(s).toHaveLength(3)
    const cats = s.map((x) => x.food.category)
    // hai gợi ý đầu phải khác nhóm; gợi ý thứ ba mới được lặp lại nhóm
    expect(cats[0]).not.toBe(cats[1])
  })

  it('rejects foods that are a poor source of the missing macro', () => {
    const forFat = suggestPortions('fat', 38, SEED_FOODS, 5).map((x) => x.food.id)
    expect(forFat).not.toContain('uc-ga') // 3.6g fat / 165 kcal
    const forCarb = suggestPortions('carb', 200, SEED_FOODS, 5).map((x) => x.food.id)
    expect(forCarb).not.toContain('dau-hu')
    expect(forCarb).not.toContain('sua-chua-hy-lap')
    expect(forCarb.length).toBeGreaterThan(0)
  })

  it('does not let a recently eaten food override the density gate', () => {
    const s = suggestPortions('fat', 38, SEED_FOODS, 3, ['uc-ga'])
    expect(s.map((x) => x.food.id)).not.toContain('uc-ga')
  })

  it('puts recently eaten foods first', () => {
    const s = suggestPortions('protein', 30, SEED_FOODS, 3, ['uc-ga'])
    expect(s[0].food.id).toBe('uc-ga')
    expect(s[0].amount).toBe(97)
  })

  it('only suggests foods from the `good` group', () => {
    const s = suggestPortions('protein', 40, SEED_FOODS, 10)
    expect(s.every((x) => x.food.group === 'good')).toBe(true)
  })

  it('never suggests wide-error-bar estimates', () => {
    const s = suggestPortions('carb', 100, SEED_FOODS, 20)
    expect(s.every((x) => !x.food.estimate)).toBe(true)
  })

  it('returns nothing when there is no deficit', () => {
    expect(suggestPortions('protein', 0, SEED_FOODS)).toEqual([])
    expect(suggestPortions('protein', -15, SEED_FOODS)).toEqual([])
  })

  it('rounds counted units to quarters and grams to whole numbers', () => {
    const s = suggestPortions('protein', 30, SEED_FOODS, 10)
    for (const x of s) {
      if (x.unit === 'g') expect(Number.isInteger(x.amount)).toBe(true)
      else expect((x.amount * 4) % 1).toBe(0)
    }
  })
})

describe('matchName', () => {
  it('matches without diacritics', () => {
    expect(matchName('Ức gà / Lườn gà', 'uc ga')).toBe(true)
    expect(matchName('Đậu hũ', 'dau hu')).toBe(true)
  })

  it('matches tokens that are not adjacent', () => {
    expect(matchName('Trứng gà luộc', 'trung luoc')).toBe(true)
    expect(matchName('Sữa chua Hy Lạp không đường', 'sua duong')).toBe(true)
  })

  it('requires every token to be present', () => {
    expect(matchName('Trứng gà luộc', 'trung chien')).toBe(false)
  })

  it('treats an empty query as matching everything', () => {
    expect(matchName('Cơm trắng (đã nấu)', '  ')).toBe(true)
  })
})

describe('averageMacros', () => {
  it('ignores days with nothing logged', () => {
    const avg = averageMacros([
      macros({ kcal: 2000, protein: 100 }),
      macros({}),
      macros({ kcal: 2400, protein: 140 }),
    ])
    expect(avg.kcal).toBe(2200)
    expect(avg.protein).toBe(120)
  })

  it('returns zeros for an empty week', () => {
    expect(averageMacros([]).kcal).toBe(0)
  })
})

describe('dayTypesFor', () => {
  const day = (over: Partial<DayLog> = {}): DayLog => ({
    date: '2026-09-07',
    entries: [],
    ...over,
  })

  it('takes the explicit choice over anything derived', () => {
    // 2026-09-08 là thứ 3, mặc định là ngày chạy — lựa chọn tay phải thắng
    expect(dayTypesFor('2026-09-08', DEFAULT_SETTINGS, day({ dayTypes: ['rest'] }))).toEqual(
      ['rest'],
    )
  })

  it('falls back to the weekly run calendar when nothing was chosen', () => {
    expect(dayTypesFor('2026-09-08', DEFAULT_SETTINGS)).toEqual(['run'])
    expect(dayTypesFor('2026-09-07', DEFAULT_SETTINGS)).toEqual([])
  })

  it('infers a lift day from a logged workout', () => {
    const withLift = day({
      lifts: [{ id: 'a', exerciseId: 'db-row', ts: 0, sets: [{ kg: 22, reps: 10 }] }],
    })
    expect(dayTypesFor('2026-09-07', DEFAULT_SETTINGS, withLift)).toEqual(['lift'])
  })
})

describe('computeAdjust', () => {
  it('adds only the part of a gym session that beats the weekly average', () => {
    const a = computeAdjust(DEFAULT_SETTINGS, { runDay: false, liftDay: true })
    // 200 kcal buổi − (200 × 4,5 / 7) đã nằm trong TDEE
    expect(a.gym).toBe(71)
    expect(a.run).toBe(0)
  })

  it('takes back the gym allowance on a day with no session', () => {
    expect(computeAdjust(DEFAULT_SETTINGS, { runDay: false, liftDay: false }).gym).toBe(-129)
  })

  it('stacks a run on top of the gym adjustment', () => {
    const a = computeAdjust(DEFAULT_SETTINGS, {
      runDay: true,
      liftDay: true,
      runBurnKcal: 400,
    })
    expect(a.total).toBe(400 + 71)
  })

  it('averages out to zero across a normal training week', () => {
    const { gymSessionsPerWeek: s } = DEFAULT_SETTINGS
    const on = computeAdjust(DEFAULT_SETTINGS, { runDay: false, liftDay: true }).gym
    const off = computeAdjust(DEFAULT_SETTINGS, { runDay: false, liftDay: false }).gym
    expect((on * s + off * (7 - s)) / 7).toBeCloseTo(0, 0)
  })
})

describe('nhãn ngày và buổi tập không mâu thuẫn nhau', () => {
  it('một buổi tập đã log thì ngày không còn được tính là nghỉ', () => {
    // storage.setLiftEntry sửa nhãn khi ghi; ở đây chốt luật đọc: nghỉ là nghỉ,
    // nhưng nghỉ + tạ cùng lúc thì không bao giờ được sinh ra từ suy diễn.
    const derived = dayTypesFor('2026-09-07', DEFAULT_SETTINGS, {
      date: '2026-09-07',
      entries: [],
      lifts: [{ id: 'a', exerciseId: 'x', ts: 0, sets: [{ kg: 20, reps: 8 }] }],
    })
    expect(derived).not.toContain('rest')
    expect(derived).toContain('lift')
  })
})
