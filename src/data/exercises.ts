import type { Exercise } from '../lib/types'

/**
 * Tên bài để nguyên tiếng Anh — khớp với chữ in trên máy và tra cứu được.
 * Trường `note` giữ lại cách người dùng gọi bài đó, để tìm ra khi gõ tiếng Việt.
 *
 * Quy ước con số kg (chốt lúc nhập liệu, giữ nguyên để so sánh được):
 * - `db`    tạ đơn — số là MỖI TAY
 * - `smith` thanh máy Smith — số là đĩa MỖI BÊN, chưa cộng trọng lượng thanh
 * - `stack` cáp / máy có cục tạ — đọc đúng số in trên máy
 * - `bar`   thanh đòn rời — tổng cả thanh
 * - `body`  thể trọng — kg là tải CỘNG THÊM, để 0 nếu tập tay không
 *
 * `perSide: true` chỉ ảnh hưởng cách tính volume (nhân đôi) và nhãn hiển thị.
 * Không quy đổi cáp/máy ra tải thật: mỗi hãng một tỉ số ròng rọc, quy đổi chỉ
 * tạo cảm giác chính xác giả. Ghi nhất quán là đủ để thấy tiến bộ.
 */
export const SEED_EXERCISES: Exercise[] = [
  // ================= GYM — Pull =================
  { id: 'cable-curl', name: 'Cable Biceps Curl', group: 'pull', mode: 'gym', gear: 'stack' },
  {
    id: 'low-row-mid',
    name: 'Machine Low Row — Mid-Lat',
    group: 'pull',
    mode: 'gym',
    gear: 'stack',
    perSide: true,
    note: 'Máy low row, mode nhắm lats giữa.',
  },
  {
    id: 'low-row-lower',
    name: 'Machine Low Row — Lower Lat',
    group: 'pull',
    mode: 'gym',
    gear: 'stack',
    perSide: true,
    note: 'Cùng máy low row, mode nhắm lats dưới.',
  },
  { id: 'cable-row', name: 'Seated Cable Row', group: 'pull', mode: 'gym', gear: 'stack' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', group: 'pull', mode: 'gym', gear: 'stack' },
  { id: 'barbell-curl', name: 'Barbell Curl', group: 'pull', mode: 'gym', gear: 'bar' },
  {
    id: 'spider-curl',
    name: 'Dumbbell Spider Curl',
    group: 'pull',
    mode: 'gym',
    gear: 'db',
    perSide: true,
  },
  {
    id: 'reverse-db-curl',
    name: 'Dumbbell Reverse Curl',
    group: 'pull',
    mode: 'gym',
    gear: 'db',
    perSide: true,
    note: 'Cuốn tay úp cổ tay — nhắm brachialis và cẳng tay.',
  },
  {
    id: 'smith-row',
    name: 'Smith Machine Bent-Over Row',
    group: 'pull',
    mode: 'gym',
    gear: 'smith',
    perSide: true,
  },
  {
    id: 'vertical-row',
    name: 'Machine Vertical Row',
    group: 'pull',
    mode: 'gym',
    gear: 'stack',
    note: 'Máy kéo dọc từ trên xuống, còn gọi là high row.',
  },
  {
    id: 'seated-cable-pulldown',
    name: 'Seated Dual-Cable Lat Pulldown',
    group: 'pull',
    mode: 'gym',
    gear: 'stack',
    note: 'Ngồi trên cục tạ đơn, cáp đặt cao nhất, kéo xuống ăn vào lats dưới.',
  },
  { id: 'db-row', name: 'Dumbbell Row', group: 'pull', mode: 'gym', gear: 'db', perSide: true },
  {
    id: 'rear-pec-deck',
    name: 'Reverse Pec Deck Fly',
    group: 'pull',
    mode: 'gym',
    gear: 'stack',
    note: 'Vai sau.',
  },

  // ================= GYM — Push =================
  {
    id: 'oh-cable-ext',
    name: 'Overhead Cable Triceps Extension',
    group: 'push',
    mode: 'gym',
    gear: 'stack',
  },
  {
    id: 'oh-cable-ext-rev',
    name: 'Overhead Cable Triceps Extension — Reverse Grip',
    group: 'push',
    mode: 'gym',
    gear: 'stack',
  },
  {
    id: 'db-bench',
    name: 'Dumbbell Bench Press',
    group: 'push',
    mode: 'gym',
    gear: 'db',
    perSide: true,
  },
  { id: 'chest-press', name: 'Machine Chest Press', group: 'push', mode: 'gym', gear: 'stack' },
  {
    id: 'cable-low-press',
    name: 'Cable Chest Press — Lower Chest',
    group: 'push',
    mode: 'gym',
    gear: 'stack',
    note: 'Đẩy (khuỷu gập), khác với bài fly cáp trên xuống.',
  },
  {
    id: 'triceps-pushdown',
    name: 'Cable Triceps Pushdown',
    group: 'push',
    mode: 'gym',
    gear: 'stack',
  },
  {
    id: 'triceps-pushdown-rev',
    name: 'Cable Triceps Pushdown — Reverse Grip',
    group: 'push',
    mode: 'gym',
    gear: 'stack',
  },
  {
    id: 'high-to-low',
    name: 'High-to-Low Cable Fly',
    group: 'push',
    mode: 'gym',
    gear: 'stack',
    note: 'Tay gần thẳng, ép chéo xuống — cable crossover.',
  },
  {
    id: 'smith-jm-press',
    name: 'Smith Machine JM Press',
    group: 'push',
    mode: 'gym',
    gear: 'smith',
    perSide: true,
  },

  // ================= GYM — Shoulders =================
  {
    id: 'shoulder-press',
    name: 'Machine Shoulder Press',
    group: 'shoulder',
    mode: 'gym',
    gear: 'stack',
  },
  {
    id: 'cable-lat-raise',
    name: 'Cable Lateral Raise',
    group: 'shoulder',
    mode: 'gym',
    gear: 'stack',
  },
  {
    id: 'smith-shoulder-press',
    name: 'Smith Machine Shoulder Press',
    group: 'shoulder',
    mode: 'gym',
    gear: 'smith',
    perSide: true,
  },
  {
    id: 'db-lat-raise',
    name: 'Dumbbell Lateral Raise',
    group: 'shoulder',
    mode: 'gym',
    gear: 'db',
    perSide: true,
  },

  // ================= GYM — Legs =================
  { id: 'prone-leg-curl', name: 'Lying Leg Curl', group: 'legs', mode: 'gym', gear: 'stack' },
  { id: 'leg-extension', name: 'Leg Extension', group: 'legs', mode: 'gym', gear: 'stack' },
  {
    id: 'smith-squat',
    name: 'Smith Machine Squat',
    group: 'legs',
    mode: 'gym',
    gear: 'smith',
    perSide: true,
  },
  {
    id: 'linear-leg-press',
    name: 'Horizontal Leg Press',
    group: 'legs',
    mode: 'gym',
    gear: 'stack',
  },
  {
    id: 'smith-leg-press',
    name: 'Smith Machine Leg Press',
    group: 'legs',
    mode: 'gym',
    gear: 'smith',
    perSide: true,
  },
  {
    id: 'bulgarian-split-squat',
    name: 'Bulgarian Split Squat',
    group: 'legs',
    mode: 'gym',
    gear: 'db',
    perSide: true,
  },
  { id: 'back-extension', name: 'Back Extension', group: 'legs', mode: 'gym', gear: 'stack' },

  // ================= GYM — Abs =================
  {
    id: 'cable-crunch',
    name: 'Kneeling Cable Crunch',
    group: 'abs',
    mode: 'gym',
    gear: 'stack',
  },

  // ================= CALISTHENIC =================
  // kg = tải cộng thêm (đai tạ, tạ kẹp chân). Tay không thì để 0.
  {
    id: 'pull-up',
    name: 'Pull-Up',
    group: 'pull',
    mode: 'calisthenic',
    gear: 'body',
    note: 'kg = tải cộng thêm; tay không thì để 0.',
  },
  { id: 'chin-up', name: 'Chin-Up', group: 'pull', mode: 'calisthenic', gear: 'body' },
  { id: 'inverted-row', name: 'Inverted Row', group: 'pull', mode: 'calisthenic', gear: 'body' },
  { id: 'push-up', name: 'Push-Up', group: 'push', mode: 'calisthenic', gear: 'body' },
  {
    id: 'diamond-push-up',
    name: 'Diamond Push-Up',
    group: 'push',
    mode: 'calisthenic',
    gear: 'body',
  },
  { id: 'dip', name: 'Parallel Bar Dip', group: 'push', mode: 'calisthenic', gear: 'body' },
  {
    id: 'pike-push-up',
    name: 'Pike Push-Up',
    group: 'shoulder',
    mode: 'calisthenic',
    gear: 'body',
  },
  {
    id: 'bodyweight-squat',
    name: 'Bodyweight Squat',
    group: 'legs',
    mode: 'calisthenic',
    gear: 'body',
  },
  { id: 'lunge', name: 'Walking Lunge', group: 'legs', mode: 'calisthenic', gear: 'body' },
  {
    id: 'nordic-curl',
    name: 'Nordic Hamstring Curl',
    group: 'legs',
    mode: 'calisthenic',
    gear: 'body',
  },
  { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', group: 'abs', mode: 'calisthenic', gear: 'body' },
  { id: 'plank', name: 'Plank', group: 'abs', mode: 'calisthenic', gear: 'body', note: 'Rep = giây giữ.' },
  { id: 'ab-rollout', name: 'Ab Wheel Rollout', group: 'abs', mode: 'calisthenic', gear: 'body' },
]
