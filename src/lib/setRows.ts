import type { DraftDrop, DraftRow } from './draft'
import { parseKg } from './lift'
import type { LiftSet } from './types'

/** Điền lại ô nhập theo kiểu số Việt Nam — parseKg đọc lại được cả , và . */
export const kgInput = (kg: number) => String(kg).replace('.', ',')

export const BLANK_ROW: DraftRow = { kg: '', reps: '', done: false, drops: [] }

/** Set mục tiêu 0×0 (bài chưa tập bao giờ trong buổi mẫu) mở ra thành ô trống. */
export function rowFromSet(s: LiftSet, done: boolean): DraftRow {
  const empty = s.kg === 0 && s.reps === 0
  return {
    kg: empty ? '' : kgInput(s.kg),
    reps: s.reps > 0 ? String(s.reps) : '',
    done,
    drops: (s.drops ?? []).map((d) => ({ kg: kgInput(d.kg), reps: String(d.reps) })),
  }
}

export function rowToSet(r: DraftRow): LiftSet {
  const drops = r.drops
    .map((d: DraftDrop) => ({ reps: Math.round(parseKg(d.reps)), kg: parseKg(d.kg) }))
    .filter((d) => d.reps > 0)
  const set: LiftSet = { reps: Math.round(parseKg(r.reps)), kg: parseKg(r.kg) }
  return drops.length > 0 ? { ...set, drops } : set
}

/** Bài thể trọng hợp lệ với kg = 0 (tay không); bài có tạ thì phải có mức tạ. */
export function isValidSet(s: LiftSet, bodyweight: boolean): boolean {
  return s.reps > 0 && (bodyweight || s.kg > 0)
}

/** Những set đang nằm trong log: dòng đã tick và điền hợp lệ. */
export function doneSets(rows: DraftRow[], bodyweight: boolean): LiftSet[] {
  return rows
    .filter((r) => r.done)
    .map(rowToSet)
    .filter((s) => isValidSet(s, bodyweight))
}

/** Chỉ số các dòng chưa tick nhưng đã điền đủ để lưu. */
export function pendingIndexes(rows: DraftRow[], bodyweight: boolean): number[] {
  return rows.flatMap((r, i) => (!r.done && isValidSet(rowToSet(r), bodyweight) ? [i] : []))
}

/**
 * Dòng mở ra lúc vào bảng nhập set, theo thứ tự ưu tiên:
 * 1. set đã log hôm đó (đã tick), nối thêm phần kế hoạch chưa làm;
 * 2. kế hoạch của ngày (chưa tick);
 * 3. set của lần tập trước (chưa tick) — nhìn là biết mục tiêu;
 * 4. ba dòng trống cho bài mới tinh.
 */
export function initialRows(
  logged: LiftSet[],
  planned: LiftSet[],
  last: LiftSet[],
): DraftRow[] {
  if (logged.length > 0 || planned.length > 0) {
    const count = Math.max(logged.length, planned.length)
    return Array.from({ length: count }, (_, i) =>
      i < logged.length ? rowFromSet(logged[i], true) : rowFromSet(planned[i], false),
    )
  }
  if (last.length > 0) return last.map((s) => rowFromSet(s, false))
  return [BLANK_ROW, BLANK_ROW, BLANK_ROW]
}
