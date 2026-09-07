import { norm } from './format'

export interface ParsedLabel {
  /** số liệu trên nhãn tính theo 100g hay theo 1 khẩu phần */
  basis: 'per100' | 'serving' | 'unknown'
  servingGrams?: number
  kcal?: number
  protein?: number
  fat?: number
  carb?: number
  /** nhãn ghi tổng đường, chưa tách đường thêm vào */
  sugar?: number
  /** số trường đọc được (0-5) — dùng để cảnh báo khi OCR đọc kém */
  found: number
}

const KEYS = {
  kcal: ['nang luong', 'energy', 'calories', 'calorie', 'calo', 'kcal'],
  protein: ['chat dam', 'protein', 'dam'],
  fat: ['chat beo', 'total fat', 'lipid', 'fat', 'beo'],
  carb: ['carbohydrate', 'cacbohydrat', 'cabohydrat', 'glucid', 'tinh bot', 'carb'],
  sugar: ['duong bo sung', 'added sugar', 'trong do duong', 'sugars', 'sugar', 'duong'],
}

/**
 * "1.321" -> 1321 (dấu chấm phân nhóm nghìn kiểu VN)
 * "3,5"   -> 3.5  (dấu phẩy thập phân kiểu VN)
 * "3.5"   -> 3.5
 */
export function parseNumber(raw: string): number {
  const s = raw.trim()
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, ''))
  return Number(s.replace(',', '.'))
}

const NUM = /(\d+(?:[.,]\d+)?)/g

function numbersIn(line: string): number[] {
  return [...line.matchAll(NUM)].map((m) => parseNumber(m[1])).filter((x) => !Number.isNaN(x))
}

/**
 * Năng lượng hay ghi cả kJ lẫn kcal ("450 kJ / 108 kcal").
 * Ưu tiên số đứng ngay trước "kcal"; nếu chỉ có kJ thì quy đổi.
 */
function readEnergy(line: string): number | undefined {
  const kcal = line.match(/(\d+(?:[.,]\d+)?)\s*k\s*cal/)
  if (kcal) return parseNumber(kcal[1])
  const kj = line.match(/(\d+(?:[.,]\d+)?)\s*kj/)
  if (kj) return Math.round(parseNumber(kj[1]) / 4.184)
  const nums = numbersIn(line)
  return nums.length > 0 ? nums[0] : undefined
}

/**
 * Đọc bảng thành phần dinh dưỡng từ text OCR.
 * Cố tình dễ dãi: OCR sai là chuyện thường, người dùng sẽ sửa lại ở bước xác nhận.
 */
export function parseLabel(text: string): ParsedLabel {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const out: ParsedLabel = { basis: 'unknown', found: 0 }
  const flat = norm(lines.join(' '))

  if (/(tren|per|\/)\s*100\s*(g|ml)/.test(flat) || /100\s*(g|ml)/.test(flat)) {
    out.basis = 'per100'
  }

  const serving = flat.match(/(?:khau phan|serving size|moi khau phan)[^\d]{0,12}(\d+(?:[.,]\d+)?)\s*(g|ml)/)
  if (serving) {
    out.servingGrams = parseNumber(serving[1])
    if (out.basis === 'unknown') out.basis = 'serving'
  }

  // Keyword dài đứng trước keyword ngắn ("trong do duong" trước "duong"), nếu không
  // "đường" sẽ khớp nhầm. Luôn lấy số ĐỨNG SAU keyword, nên một dòng gộp kiểu
  // "Carbohydrate 58,2g, trong đó đường 22,1g" vẫn tách đúng cả hai giá trị.
  const pick = (field: keyof typeof KEYS): number | undefined => {
    for (const key of KEYS[field]) {
      for (const line of lines) {
        // Cắt trên chuỗi ĐÃ chuẩn hoá: bỏ dấu làm đổi độ dài chuỗi, dùng index
        // của chuỗi chuẩn hoá để cắt chuỗi gốc sẽ lệch vị trí.
        const normed = norm(line)
        const at = normed.indexOf(key)
        if (at === -1) continue
        const tail = normed.slice(at + key.length)
        const value = field === 'kcal' ? readEnergy(tail) : numbersIn(tail)[0]
        if (value !== undefined) return value
      }
    }
    return undefined
  }

  out.sugar = pick('sugar')
  out.carb = pick('carb')
  out.protein = pick('protein')
  out.fat = pick('fat')
  out.kcal = pick('kcal')

  out.found = [out.kcal, out.protein, out.fat, out.carb, out.sugar].filter(
    (v) => v !== undefined,
  ).length

  return out
}

/** Năng lượng suy ra từ macro (Atwater) — dùng khi OCR đọc trượt dòng năng lượng. */
export function derivedKcal(l: Pick<ParsedLabel, 'protein' | 'fat' | 'carb'>): number {
  return Math.round((l.protein ?? 0) * 4 + (l.fat ?? 0) * 9 + (l.carb ?? 0) * 4)
}
