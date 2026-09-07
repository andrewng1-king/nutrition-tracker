import { n } from './format'
import { suggestPortions, type MacroKey, type Suggestion } from './macros'
import type { Food, Macros, StatusWarning, Targets } from './types'

export type Level = 1 | 2 | 3 | 4

export const LEVEL_COLORS: Record<Level, string> = {
  1: 'var(--level-1)', // đỏ — còn thiếu nhiều
  2: 'var(--level-2)', // cam
  3: 'var(--level-3)', // vàng
  4: 'var(--level-4)', // xanh — đạt
}

interface LevelOpts {
  /** target là mức trần chứ không phải mức cần đạt */
  ceiling?: boolean
  /** sàn tối thiểu — fat có cả sàn lẫn trần */
  floor?: number
}

/**
 * Thang màu đỏ → cam → vàng → xanh.
 * Chỉ số cần ĐẠT (protein, carb, calo): càng gần target càng xanh.
 * Chỉ số có TRẦN (fat, đường): vượt trần là đỏ, sát trần là vàng, còn lại xanh.
 * Fat có thêm sàn — dưới sàn thì chấm theo mức độ hụt so với sàn.
 */
export function statusLevel(value: number, target: number, opts: LevelOpts = {}): Level {
  if (opts.ceiling) {
    if (value > target) return 1
    if (opts.floor !== undefined && value < opts.floor) {
      const p = opts.floor > 0 ? value / opts.floor : 1
      return p < 0.5 ? 1 : p < 0.8 ? 2 : 3
    }
    // chỉ chuyển vàng khi thật sự sát trần, nếu không fat 58/65 (hoàn toàn ổn)
    // lúc nào cũng vàng và cảnh báo mất hết ý nghĩa
    if (target > 0 && value >= target * 0.92) return 3
    return 4
  }
  const p = target > 0 ? value / target : 1
  if (p < 0.4) return 1
  if (p < 0.7) return 2
  if (p < 0.9) return 3
  return 4
}

export type NoticeKey = 'protein' | 'fat' | 'kcal' | 'carb' | 'sugar'

export interface MacroNotice {
  key: NoticeKey
  title: string
  /** thiếu / vượt bao nhiêu */
  gap: string
  suggestions: Suggestion[]
  /** không ăn đủ thì sao — vì sao chỉ số này đáng quan tâm */
  risk: string
  advice?: string
}

/** Hậu quả thật, gắn với mục tiêu recomp — không phải câu cảnh báo chung chung. */
const RISKS: Record<string, string> = {
  protein:
    'Thiếu protein thì cơ thể lấy chính cơ ra bù trong lúc đang thâm hụt calo. Tập nặng nhưng cơ không lên, recomp đứng yên — đây là chỉ số quan trọng nhất trong ngày.',
  fatLow:
    'Fat dưới 50g kéo testosterone và hormone sinh dục xuống. Hệ quả thấy được: phục hồi chậm giữa các buổi tập, ngủ kém, tâm trạng đi xuống.',
  fatHigh:
    'Fat 9 kcal/g nên vượt trần là calo vọt lên rất nhanh mà không no thêm bao nhiêu. Thâm hụt biến mất, mỡ bụng đứng yên.',
  carb: 'Carb thấp thì glycogen cạn. Buổi gym tối và buổi chạy sẽ đuối sớm, nâng nhẹ hơn bình thường — mất luôn tín hiệu giữ cơ.',
  kcal: 'Ăn dưới 2000 kcal khi vẫn tập nặng thì cơ thể cắt cơ trước khi cắt mỡ. Thâm hụt đang để nhẹ có chủ đích, đừng cắt sâu thêm.',
  sugar:
    'Đường vượt hạn mức làm đường huyết lên xuống mạnh, đói sớm hơn và dễ ăn vặt thêm vào buổi tối — chỗ thâm hụt cả ngày mất ở đó.',
}

/**
 * Ghi chú cho từng vòng đang báo đỏ: thiếu bao nhiêu, ăn gì bù, và không bù thì sao.
 */
export function buildNotice(
  warning: StatusWarning,
  macros: Macros,
  targets: Targets,
  foods: Food[],
  preferIds: string[] = [],
): MacroNotice {
  const deficit = warning.deficit ?? 0
  const suggest = (macro: MacroKey) => suggestPortions(macro, deficit, foods, 3, preferIds)

  switch (warning.key) {
    case 'protein':
      return {
        key: 'protein',
        title: 'Thiếu protein',
        gap: `Còn thiếu ${n(deficit, 1)}g — mới đạt ${n(macros.protein, 1)}/${n(targets.protein)}g.`,
        suggestions: suggest('protein'),
        risk: RISKS.protein,
      }

    case 'fat': {
      const tooLow = macros.fat < targets.fatMin
      if (tooLow) {
        return {
          key: 'fat',
          title: 'Fat quá thấp',
          gap: `Còn thiếu ${n(deficit, 1)}g để chạm sàn ${n(targets.fatMin)}g.`,
          suggestions: suggest('fat'),
          risk: RISKS.fatLow,
        }
      }
      return {
        key: 'fat',
        title: 'Vượt trần fat',
        gap: `Đang ${n(macros.fat, 1)}g, quá trần ${n(macros.fat - targets.fat, 1)}g.`,
        suggestions: [],
        risk: RISKS.fatHigh,
        advice:
          'Bữa còn lại bỏ dầu chiên, đổi sang ức gà / tôm / cá trắng luộc hoặc nồi chiên không dầu.',
      }
    }

    case 'carb':
      return {
        key: 'carb',
        title: 'Carb thấp',
        gap: `Còn thiếu ${n(deficit, 1)}g — mới đạt ${n(macros.carb, 1)}/${n(targets.carb)}g.`,
        suggestions: suggest('carb'),
        risk: RISKS.carb,
      }

    case 'kcal':
      return {
        key: 'kcal',
        title: 'Ăn quá ít',
        gap: `Mới ${n(macros.kcal)} kcal, dưới sàn ${n(targets.kcalFloor)} kcal.`,
        suggestions: suggestPortions('carb', Math.round(deficit / 4), foods, 3, preferIds),
        risk: RISKS.kcal,
      }

    case 'sugar':
      return {
        key: 'sugar',
        title: 'Đường vượt hạn mức',
        gap: `Đang ${n(macros.addedSugar, 1)}g, quá hạn ${n(macros.addedSugar - targets.addedSugarMax, 1)}g.`,
        suggestions: [],
        risk: RISKS.sugar,
        advice: 'Phần còn lại của ngày chuyển sang nước lọc và trái cây nguyên miếng.',
      }
  }
}
