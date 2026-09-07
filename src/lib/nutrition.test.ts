import { describe, expect, it } from 'vitest'
import { derivedKcal, parseLabel, parseNumber } from './label'
import { DEFAULT_SETTINGS, computeTargets } from './macros'
import type { Macros } from './types'
import { decide } from './verdict'
import { MAX_BANK_PER_DAY, weekDays, weekStart } from './week'
import type { WeekSummary } from './week'

const macros = (p: Partial<Macros>): Macros => ({
  kcal: 0,
  protein: 0,
  fat: 0,
  carb: 0,
  addedSugar: 0,
  ...p,
})

const VN_LABEL = `THÔNG TIN DINH DƯỠNG
Trung bình trong 100g
Năng lượng            1.988 kJ / 475 kcal
Chất béo              24,5 g
Carbohydrate          58,2 g
   Trong đó đường     22,1 g
Chất đạm              6,8 g
Natri                 320 mg`

const EN_LABEL = `Nutrition Facts
Serving size 30 g
Calories 150
Total Fat 8g
Total Carbohydrate 17g
   Sugars 9g
Protein 2g`

describe('parseNumber', () => {
  it('reads Vietnamese decimal commas', () => {
    expect(parseNumber('24,5')).toBe(24.5)
  })

  it('reads dots as thousands separators', () => {
    expect(parseNumber('1.988')).toBe(1988)
  })

  it('still reads plain decimal dots', () => {
    expect(parseNumber('8.5')).toBe(8.5)
  })
})

describe('parseLabel — nhãn tiếng Việt', () => {
  const l = parseLabel(VN_LABEL)

  it('detects the per-100g basis', () => {
    expect(l.basis).toBe('per100')
  })

  it('prefers the kcal figure over the kJ figure', () => {
    expect(l.kcal).toBe(475)
  })

  it('reads every macro line', () => {
    expect(l.fat).toBe(24.5)
    expect(l.carb).toBe(58.2)
    expect(l.protein).toBe(6.8)
    expect(l.sugar).toBe(22.1)
    expect(l.found).toBe(5)
  })

  it('does not mistake sodium for a macro', () => {
    expect(l.carb).not.toBe(320)
    expect(l.protein).not.toBe(320)
  })
})

describe('parseLabel — nhãn tiếng Anh', () => {
  const l = parseLabel(EN_LABEL)

  it('reads the serving size and basis', () => {
    expect(l.basis).toBe('serving')
    expect(l.servingGrams).toBe(30)
  })

  it('reads every macro line', () => {
    expect(l.kcal).toBe(150)
    expect(l.fat).toBe(8)
    expect(l.carb).toBe(17)
    expect(l.sugar).toBe(9)
    expect(l.protein).toBe(2)
  })
})

describe('parseLabel — nhãn OCR đọc dính dòng', () => {
  it('splits carb and sugar out of one merged line', () => {
    const l = parseLabel('Carbohydrate 58,2 g, trong đó đường 22,1 g')
    expect(l.carb).toBe(58.2)
    expect(l.sugar).toBe(22.1)
  })

  it('converts a kJ-only label', () => {
    expect(parseLabel('Năng lượng 837 kJ').kcal).toBe(200)
  })

  it('reports how little it found on a garbage scan', () => {
    const l = parseLabel('###   ????\n~~~~')
    expect(l.found).toBe(0)
    expect(l.kcal).toBeUndefined()
  })
})

describe('derivedKcal', () => {
  it('applies Atwater factors', () => {
    expect(derivedKcal({ protein: 10, fat: 5, carb: 20 })).toBe(165)
  })
})

describe('weekStart', () => {
  it('starts the week on Monday', () => {
    expect(weekStart('2026-09-05')).toBe('2026-08-31') // Sat -> Mon
    expect(weekStart('2026-08-31')).toBe('2026-08-31') // Mon -> itself
    expect(weekStart('2026-09-06')).toBe('2026-08-31') // Sun -> same week
    expect(weekStart('2026-09-07')).toBe('2026-09-07') // next Mon
  })

  it('returns seven consecutive days', () => {
    const d = weekDays('2026-09-05')
    expect(d).toHaveLength(7)
    expect(d[0]).toBe('2026-08-31')
    expect(d[6]).toBe('2026-09-06')
  })
})

describe('decide', () => {
  // Ngày tập tạ — lịch thường ngày của người dùng.
  const targets = computeTargets(DEFAULT_SETTINGS, { runDay: false, liftDay: true })
  const week = (over: Partial<WeekSummary> = {}): WeekSummary => ({
    days: weekDays('2026-09-05'),
    stats: [],
    budget: 16450,
    consumed: 9000,
    banked: 0,
    cost: 0,
    daysLogged: 4,
    cheatAvailable: true,
    ...over,
  })

  it('says eat when the item fits inside today', () => {
    const v = decide(macros({ kcal: 200, protein: 20 }), macros({ kcal: 1500 }), targets, week())
    expect(v.kind).toBe('eat')
  })

  it('warns when it only just tips over the fat ceiling', () => {
    const v = decide(
      macros({ kcal: 200, fat: 16 }),
      macros({ kcal: 1500, fat: 52 }),
      targets,
      week(),
    )
    expect(v.kind).toBe('careful')
    expect(v.title).toContain('vượt trần fat')
  })

  it('warns when it only just tips over the sugar limit', () => {
    const v = decide(
      macros({ kcal: 150, addedSugar: 22 }),
      macros({ kcal: 1500, addedSugar: 10 }),
      targets,
      week(),
    )
    expect(v.kind).toBe('careful')
    expect(v.title).toContain('quá hạn đường')
  })

  it('spends banked calories when the week has room', () => {
    const v = decide(
      macros({ kcal: 400 }),
      macros({ kcal: 2200 }),
      targets,
      week({ banked: 600 }),
    )
    expect(v.kind).toBe('careful')
    expect(v.reasons.join(' ')).toContain('để dành')
  })

  it('does not let banked calories buy a big fat-ceiling breach', () => {
    // 250g bánh quy: calo vừa phần để dành, nhưng fat vượt trần 35g
    const v = decide(
      macros({ kcal: 1187, protein: 17, fat: 61, carb: 145, addedSugar: 55 }),
      macros({ kcal: 1377, protein: 113, fat: 38, carb: 134 }),
      targets,
      week({ banked: 1244 }),
    )
    expect(v.kind).toBe('skip')
    expect(v.reasons.join(' ')).toContain('quá cả fat lẫn đường')
    expect(v.fitsFraction).toBeLessThan(0.8)
  })

  it('caps the portion by whichever limit is tightest', () => {
    // calo còn rộng, nhưng đường chỉ còn chỗ cho 1/4 khẩu phần
    const v = decide(
      macros({ kcal: 300, addedSugar: 40 }),
      macros({ kcal: 1000, addedSugar: 20 }),
      targets,
      week(),
    )
    expect(v.kind).toBe('skip')
    expect(v.fitsFraction).toBeCloseTo(10 / 40, 2)
  })

  it('calls a big overshoot a cheat meal when one is available', () => {
    const v = decide(macros({ kcal: 1080 }), macros({ kcal: 2000 }), targets, week())
    expect(v.kind).toBe('cheat')
  })

  it('does not spend a cheat meal that is already used', () => {
    const v = decide(
      macros({ kcal: 1080 }),
      macros({ kcal: 2000 }),
      targets,
      week({ cheatAvailable: false, cheatUsedOn: '2026-09-02' }),
    )
    expect(v.kind).toBe('skip')
    expect(v.reasons.join(' ')).toContain('đã dùng rồi')
  })

  it('does not burn a cheat meal on a small snack', () => {
    const v = decide(macros({ kcal: 220 }), macros({ kcal: 2300 }), targets, week())
    expect(v.kind).toBe('careful')
  })

  it('suggests a partial portion when there is only some room left', () => {
    const v = decide(macros({ kcal: 900 }), macros({ kcal: 2000 }), targets, week({
      cheatAvailable: false,
    }))
    expect(v.kind).toBe('skip')
    expect(v.fitsFraction).toBeCloseTo((targets.kcalMax - 2000) / 900, 2)
  })

  it('leaves no room at all once the day is well over', () => {
    const v = decide(
      macros({ kcal: 600 }),
      macros({ kcal: 2900 }),
      targets,
      week({ cheatAvailable: false }),
    )
    expect(v.kind).toBe('skip')
    expect(v.fitsFraction).toBe(0)
    expect(v.title).toBe('Để hôm khác')
  })

  it('never treats an overspent week as available budget', () => {
    const v = decide(
      macros({ kcal: 500 }),
      macros({ kcal: 2300 }),
      targets,
      week({ banked: -1200, cheatAvailable: false }),
    )
    expect(v.kind).toBe('skip')
  })

  it('mentions the protein it contributes while protein is short', () => {
    const v = decide(
      macros({ kcal: 200, protein: 24 }),
      macros({ kcal: 1200, protein: 60 }),
      targets,
      week(),
    )
    expect(v.reasons.join(' ')).toContain('đang thiếu')
  })

  it('caps how much a single starved day can bank', () => {
    expect(MAX_BANK_PER_DAY).toBe(350)
  })
})
