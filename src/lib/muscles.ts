import type { Exercise, LiftEntry, LiftGroup, LiftSub } from './types'

/** Thứ tự hiển thị: thân trên trước, tay, rồi chân và bụng. */
export const LIFT_GROUPS: LiftGroup[] = [
  'chest',
  'back',
  'shoulder',
  'biceps',
  'triceps',
  'forearm',
  'legs',
  'abs',
]

export const LIFT_GROUP_LABELS: Record<LiftGroup, string> = {
  chest: 'Ngực',
  back: 'Lưng',
  shoulder: 'Vai',
  biceps: 'Tay trước',
  triceps: 'Tay sau',
  forearm: 'Cẳng tay',
  legs: 'Chân',
  abs: 'Bụng',
}

export const GROUP_COLOR: Record<LiftGroup, string> = {
  chest: 'var(--kcal)',
  back: 'var(--protein)',
  shoulder: 'var(--sugar)',
  biceps: 'var(--m-biceps)',
  triceps: 'var(--m-triceps)',
  forearm: 'var(--m-forearm)',
  legs: 'var(--carb)',
  abs: 'var(--fat)',
}

/**
 * Nhóm phụ theo giải phẫu. Lưng tách xô giữa / xô dưới cho khớp hai mode của
 * máy low row; bụng dùng cách gọi quen ở phòng gym (trên / dưới) dù về giải phẫu
 * cơ bụng thẳng là một khối.
 */
export const LIFT_SUBS: Record<LiftGroup, LiftSub[]> = {
  chest: ['chest-upper', 'chest-mid', 'chest-lower'],
  back: ['back-lat-mid', 'back-lat-low', 'back-mid', 'back-traps', 'back-lower'],
  shoulder: ['shoulder-front', 'shoulder-side', 'shoulder-rear'],
  biceps: ['biceps-long', 'biceps-short', 'biceps-brachialis'],
  triceps: ['triceps-long', 'triceps-lateral', 'triceps-medial'],
  forearm: ['forearm-flexor', 'forearm-extensor', 'forearm-brachioradialis', 'forearm-grip'],
  legs: ['legs-quads', 'legs-hams', 'legs-glutes', 'legs-calves'],
  abs: ['abs-upper', 'abs-lower', 'abs-obliques'],
}

export const SUB_LABELS: Record<LiftSub, string> = {
  'chest-upper': 'Ngực trên',
  'chest-mid': 'Ngực giữa',
  'chest-lower': 'Ngực dưới',
  'back-lat-mid': 'Xô giữa',
  'back-lat-low': 'Xô dưới',
  'back-mid': 'Lưng giữa',
  'back-traps': 'Cầu vai',
  'back-lower': 'Lưng dưới',
  'shoulder-front': 'Vai trước',
  'shoulder-side': 'Vai giữa',
  'shoulder-rear': 'Vai sau',
  'biceps-long': 'Đầu dài',
  'biceps-short': 'Đầu ngắn',
  'biceps-brachialis': 'Cơ cánh tay',
  'triceps-long': 'Đầu dài',
  'triceps-lateral': 'Đầu ngoài',
  'triceps-medial': 'Đầu trong',
  'forearm-flexor': 'Gập cổ tay',
  'forearm-extensor': 'Duỗi cổ tay',
  'forearm-brachioradialis': 'Cánh tay quay',
  'forearm-grip': 'Cầm nắm',
  'legs-quads': 'Đùi trước',
  'legs-hams': 'Đùi sau',
  'legs-glutes': 'Mông',
  'legs-calves': 'Bắp chân',
  'abs-upper': 'Bụng trên',
  'abs-lower': 'Bụng dưới',
  'abs-obliques': 'Liên sườn',
}

/** Khoá gom phần volume của bài không tách nhóm phụ. */
export type SubKey = LiftSub | `${LiftGroup}:all`

export const allKey = (g: LiftGroup): SubKey => `${g}:all`

export function subKeyLabel(key: SubKey): string {
  return key.endsWith(':all') ? 'Chưa tách phần' : SUB_LABELS[key as LiftSub]
}

/**
 * Màu của nhóm phụ thứ `i`: cùng tông nhóm chính, nhạt dần. Phần "chưa tách"
 * luôn xám để không lẫn với phần nào.
 */
export function subColor(group: LiftGroup, key: SubKey): string {
  if (key.endsWith(':all')) return 'var(--dim)'
  const i = LIFT_SUBS[group].indexOf(key as LiftSub)
  const pct = [100, 70, 48, 32, 22][Math.max(0, i)] ?? 22
  return `color-mix(in srgb, ${GROUP_COLOR[group]} ${pct}%, var(--surface-3))`
}

export const isLiftGroup = (g: unknown): g is LiftGroup =>
  typeof g === 'string' && (LIFT_GROUPS as string[]).includes(g)

// ---------------- dữ liệu bản cũ ----------------

/**
 * Đoán nhóm cơ theo tên bài, theo thứ tự ưu tiên — "leg curl" phải ra chân trước
 * khi luật "curl" kịp bắt nó thành tay trước, "reverse pec deck" ra vai sau trước
 * khi luật "pec" bắt thành ngực.
 */
const NAME_RULES: [LiftGroup, RegExp][] = [
  ['legs', /leg (curl|extension|press)|squat|lunge|calf|glute|hamstring|nordic|hip thrust|chân|đùi|mông/],
  ['abs', /crunch|plank|sit-?up|leg raise|ab wheel|rollout|bụng/],
  ['forearm', /wrist|forearm|farmer|grip|dead hang|reverse curl|cẳng tay/],
  ['shoulder', /rear delt|reverse (pec|fly)|face pull|lateral raise|shoulder|delt|upright row|vai/],
  ['triceps', /tricep|pushdown|push-down|skull|jm press|kickback|tay sau/],
  ['biceps', /curl|bicep|tay trước/],
  ['back', /row|pulldown|pull-?up|chin-?up|\blats?\b|back extension|shrug|lưng|xô/],
  ['chest', /chest|bench|fly|pec|push-?up|\bdips?\b|ngực/],
]

/** Nhóm cơ hợp lý cho từng nhóm split cũ — đoán ra ngoài tập này thì không tin. */
const LEGACY: Record<string, { fallback: LiftGroup; plausible: LiftGroup[] }> = {
  pull: { fallback: 'back', plausible: ['back', 'biceps', 'forearm', 'shoulder'] },
  push: { fallback: 'chest', plausible: ['chest', 'triceps', 'shoulder'] },
}

export function guessGroup(name: string, legacy?: string): LiftGroup {
  const text = name.toLowerCase()
  const hit = NAME_RULES.find(([, re]) => re.test(text))?.[0]
  const rule = legacy ? LEGACY[legacy] : undefined
  if (rule) return hit && rule.plausible.includes(hit) ? hit : rule.fallback
  return hit ?? 'chest'
}

/**
 * Đưa một bài tự lưu (bài tự tạo, hoặc bản ghi đè bài có sẵn) về dạng nhóm cơ.
 * Chạy mỗi lần đọc, nên backup cũ và dữ liệu Supabase từ máy chưa cập nhật đều
 * vào được mà không cần bước chuyển đổi riêng.
 *
 * Bản ghi đè bài có sẵn mà chưa có trường `subs` là bản lưu từ thời nhóm split —
 * lấy nhóm cơ và nhóm phụ theo bài gốc, vì lựa chọn nhóm cũ không còn nghĩa.
 */
export function normalizeExercise(ex: Exercise, seed?: Exercise): Exercise {
  if (seed && ex.subs === undefined) {
    return { ...ex, group: seed.group, subs: seed.subs }
  }
  const group = isLiftGroup(ex.group) ? ex.group : guessGroup(ex.name, ex.group)
  const valid = new Set<string>(LIFT_SUBS[group])
  const subs = (ex.subs ?? []).filter((s) => valid.has(s))
  if (group === ex.group && subs.length === (ex.subs ?? []).length) return ex
  return { ...ex, group, subs }
}

// ---------------- volume theo nhóm ----------------

/** Chia volume của một bài cho các nhóm phụ — tổng các phần bằng đúng volume bài. */
export function splitBySub(ex: Exercise, volume: number): [SubKey, number][] {
  const subs = ex.subs ?? []
  if (subs.length === 0) return [[allKey(ex.group), volume]]
  return subs.map((s) => [s, volume / subs.length])
}

export interface GroupVolume {
  group: LiftGroup
  volume: number
  sets: number
  /** theo thứ tự nhóm phụ chuẩn, phần "chưa tách" cuối cùng */
  subs: { key: SubKey; volume: number }[]
}

/** Volume và số set theo nhóm cơ của một buổi, nặng nhất trước. */
export function groupVolumes(
  entries: LiftEntry[],
  exById: Map<string, Exercise>,
  volumeOf: (ex: Exercise, e: LiftEntry) => number,
): GroupVolume[] {
  const byGroup = new Map<LiftGroup, { volume: number; sets: number; subs: Map<SubKey, number> }>()
  for (const e of entries) {
    const ex = exById.get(e.exerciseId)
    if (!ex) continue
    const v = volumeOf(ex, e)
    const g = byGroup.get(ex.group) ?? { volume: 0, sets: 0, subs: new Map() }
    g.volume += v
    g.sets += e.sets.length
    for (const [key, part] of splitBySub(ex, v)) g.subs.set(key, (g.subs.get(key) ?? 0) + part)
    byGroup.set(ex.group, g)
  }
  return [...byGroup.entries()]
    .map(([group, g]) => ({
      group,
      volume: g.volume,
      sets: g.sets,
      subs: [...LIFT_SUBS[group], allKey(group)]
        .filter((key) => (g.subs.get(key) ?? 0) > 0)
        .map((key) => ({ key, volume: g.subs.get(key)! })),
    }))
    .sort((a, b) => b.volume - a.volume || b.sets - a.sets)
}

/** Nhóm cơ có mặt trong buổi, nhiều set nhất trước. */
export function sessionGroups(entries: { exerciseId: string; sets: unknown[] }[], exById: Map<string, Exercise>): LiftGroup[] {
  const sets = new Map<LiftGroup, number>()
  for (const e of entries) {
    const ex = exById.get(e.exerciseId)
    if (ex) sets.set(ex.group, (sets.get(ex.group) ?? 0) + Math.max(1, e.sets.length))
  }
  return [...sets.entries()]
    .sort((a, b) => b[1] - a[1] || LIFT_GROUPS.indexOf(a[0]) - LIFT_GROUPS.indexOf(b[0]))
    .map(([g]) => g)
}

/** "Ngực · Tay sau", nhiều hơn hai nhóm thì "Ngực · Tay sau +1". Buổi trống ra "". */
export function sessionLabel(
  entries: { exerciseId: string; sets: unknown[] }[],
  exById: Map<string, Exercise>,
): string {
  const groups = sessionGroups(entries, exById)
  const head = groups.slice(0, 2).map((g) => LIFT_GROUP_LABELS[g]).join(' · ')
  return groups.length > 2 ? `${head} +${groups.length - 2}` : head
}
