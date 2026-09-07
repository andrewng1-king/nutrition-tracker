import { n } from './format'
import { addMacros } from './macros'
import type { Macros, Targets } from './types'
import type { WeekSummary } from './week'

export type VerdictKind = 'eat' | 'careful' | 'cheat' | 'skip'

export interface Verdict {
  kind: VerdictKind
  title: string
  reasons: string[]
  /** phần khẩu phần ăn được mà vẫn trong mọi hạn mức, 0-1 */
  fitsFraction: number
}

/** Món to cỡ này mới đáng đốt cheat meal của cả tuần. */
const CHEAT_WORTH_KCAL = 500
/** Vượt dưới mức này thì bù bằng bữa nhẹ hôm sau là xong, chưa cần cheat. */
const SMALL_OVERSHOOT = 250
/** Vượt hạn mức ít hơn 20% khẩu phần thì coi là ăn gần đủ, chỉ nhắc chứ không chặn. */
const MOSTLY_FITS = 0.8

/**
 * Ăn được bao nhiêu phần mà vẫn trong MỌI hạn mức — calo (kể cả phần để dành
 * trong tuần), trần fat, và hạn mức đường. Hạn mức nào chật nhất thì hạn mức đó
 * quyết định.
 */
function limitingFraction(item: Macros, today: Macros, targets: Targets, bank: number) {
  const fracs = [
    { room: targets.kcalMax + bank - today.kcal, need: item.kcal },
    { room: targets.fat - today.fat, need: item.fat },
    { room: targets.addedSugarMax - today.addedSugar, need: item.addedSugar },
  ]
    .filter((x) => x.need > 0)
    .map((x) => x.room / x.need)

  if (fracs.length === 0) return 1
  return Math.max(0, Math.min(1, Math.min(...fracs)))
}

/**
 * Nên ăn hay không — dựa trên chỗ còn lại của HÔM NAY, phần calo đã để dành
 * trong TUẦN, và cheat meal còn hay hết.
 *
 * Nguyên tắc bám theo spec: fat có trần cứng và đường có hạn mức cứng, calo dư
 * của tuần KHÔNG mua được quyền vượt hai cái đó. Không bao giờ khuyên nhịn để
 * bù — chỉ khuyên ăn ít hơn hoặc để hôm khác.
 */
export function decide(
  item: Macros,
  today: Macros,
  targets: Targets,
  week: WeekSummary,
): Verdict {
  const after = addMacros(today, item)
  const overflow = after.kcal - targets.kcalMax
  const bank = Math.max(0, week.banked)
  const fatOver = after.fat - targets.fat
  const sugarOver = after.addedSugar - targets.addedSugarMax
  const proteinShort = targets.protein - today.protein
  const fitsFraction = limitingFraction(item, today, targets, bank)

  const reasons: string[] = [
    overflow <= 0
      ? `Sau khi ăn: ${n(after.kcal)} kcal, vẫn dưới trần ${n(targets.kcalMax)}.`
      : `Sau khi ăn: ${n(after.kcal)} kcal, vượt trần ${n(overflow)} kcal.`,
  ]

  if (item.protein >= 10) {
    reasons.push(
      proteinShort > 0
        ? `Bù được ${n(item.protein, 1)}g protein — đang thiếu ${n(proteinShort, 1)}g.`
        : `Thêm ${n(item.protein, 1)}g protein, hôm nay đã đủ rồi.`,
    )
  }
  if (fatOver > 0) reasons.push(`Fat lên ${n(after.fat, 1)}g, vượt trần ${n(fatOver, 1)}g.`)
  if (sugarOver > 0) {
    reasons.push(`Đường thêm vào lên ${n(after.addedSugar, 1)}g, quá hạn ${n(sugarOver, 1)}g.`)
  }
  if (bank > 0) reasons.push(`Tuần này đã để dành được ${n(bank)} kcal.`)
  else if (week.daysLogged > 0) {
    reasons.push(`Tuần này chưa dư calo để bù — đã ăn ${n(week.consumed)} kcal.`)
  }
  reasons.push(
    week.cheatAvailable ? 'Cheat meal tuần này còn nguyên.' : 'Cheat meal tuần này đã dùng rồi.',
  )

  const breach =
    fatOver > 0 && sugarOver > 0
      ? 'quá cả fat lẫn đường'
      : fatOver > 0
        ? 'vượt trần fat'
        : sugarOver > 0
          ? 'quá hạn đường'
          : null

  const partial = (title: string, extra: string): Verdict => ({
    kind: 'skip',
    title,
    reasons: [...reasons, extra],
    fitsFraction,
  })

  // --- trần fat / hạn mức đường: calo dư của tuần không bù được ---
  if (breach && fitsFraction < MOSTLY_FITS) {
    return partial(
      fitsFraction >= 0.25 ? 'Ăn một phần thôi' : 'Để hôm khác',
      `Ăn hết thì ${breach}. Chỉ nên ăn khoảng ${Math.round(fitsFraction * 100)}% khẩu phần.`,
    )
  }

  // --- calo ---
  if (overflow <= 0) {
    if (breach) {
      return { kind: 'careful', title: `Ăn được, nhưng ${breach}`, reasons, fitsFraction }
    }
    return { kind: 'eat', title: 'Ăn thoải mái', reasons, fitsFraction }
  }

  if (overflow <= bank) {
    return {
      kind: 'careful',
      title: breach ? `Ăn được, nhưng ${breach}` : 'Ăn được — tuần vẫn cân',
      reasons: [
        ...reasons,
        `Lấy ${n(overflow)} kcal từ phần để dành, tuần vẫn đúng kế hoạch.`,
      ],
      fitsFraction,
    }
  }

  if (week.cheatAvailable && item.kcal >= CHEAT_WORTH_KCAL) {
    return {
      kind: 'cheat',
      title: 'Tính là cheat meal',
      reasons: [
        ...reasons,
        `Món ${n(item.kcal)} kcal đủ to để dùng cheat meal — log kèm dấu cheat thì streak không đứt.`,
      ],
      fitsFraction,
    }
  }

  if (overflow - bank <= SMALL_OVERSHOOT && !breach) {
    return {
      kind: 'careful',
      title: 'Ăn được, bù lại sau',
      reasons: [
        ...reasons,
        `Vượt ${n(overflow - bank)} kcal — bữa tối nhẹ hơn hoặc thêm buổi chạy là hoà.`,
      ],
      fitsFraction,
    }
  }

  const room = targets.kcalMax + bank - today.kcal
  return partial(
    fitsFraction >= 0.25 ? 'Ăn một phần thôi' : 'Để hôm khác',
    fitsFraction >= 0.25
      ? `Chỗ còn lại chỉ đủ ${Math.round(fitsFraction * 100)}% khẩu phần (${n(room)} kcal).`
      : `Chỉ còn ${n(Math.max(0, room))} kcal — không đủ chỗ cho món này.`,
  )
}
