import type { Food } from '../lib/types'

/**
 * Seed database — spec section 5.
 * Mọi số liệu tính theo thực phẩm ĐÃ NẤU CHÍN, KHÔNG THÊM DẦU.
 * Dầu thêm khi nấu được log riêng qua `oilTsp` (1 muỗng cà phê = +5g fat, +45 kcal).
 */
export const SEED_FOODS: Food[] = [
  // ---- Protein: thịt, cá, hải sản (per 100g đã nấu chín) ----
  { id: 'uc-ga', name: 'Ức gà / Lườn gà', category: 'protein', group: 'good', servingSize: 100, servingUnit: 'g', kcal: 165, protein: 31, fat: 3.6, carb: 0 },
  { id: 'tom', name: 'Tôm', category: 'protein', group: 'good', servingSize: 100, servingUnit: 'g', kcal: 99, protein: 24, fat: 0.3, carb: 0 },
  { id: 'ca-ngu', name: 'Cá ngừ', category: 'protein', group: 'good', servingSize: 100, servingUnit: 'g', kcal: 132, protein: 28, fat: 1, carb: 0 },
  { id: 'ca-dieu-hong', name: 'Cá diêu hồng', category: 'protein', group: 'good', servingSize: 100, servingUnit: 'g', kcal: 128, protein: 26, fat: 3, carb: 0 },
  { id: 'ca-basa', name: 'Cá basa', category: 'protein', group: 'good', servingSize: 100, servingUnit: 'g', kcal: 105, protein: 18, fat: 3, carb: 0 },
  { id: 'nac-heo-than', name: 'Nạc heo (thăn)', category: 'protein', group: 'good', servingSize: 100, servingUnit: 'g', kcal: 143, protein: 26, fat: 4, carb: 0 },
  { id: 'than-bo', name: 'Thăn bò', category: 'protein', group: 'good', servingSize: 100, servingUnit: 'g', kcal: 187, protein: 29, fat: 7, carb: 0 },
  { id: 'dau-hu', name: 'Đậu hũ', category: 'protein', group: 'good', servingSize: 100, servingUnit: 'g', kcal: 76, protein: 8, fat: 4.8, carb: 1.9 },
  { id: 'ma-dui-ga', name: 'Má đùi gà (không da)', category: 'protein', group: 'moderate', servingSize: 100, servingUnit: 'g', kcal: 179, protein: 25, fat: 8, carb: 0 },
  { id: 'heo-xay-nac', name: 'Heo xay nạc', category: 'protein', group: 'moderate', servingSize: 100, servingUnit: 'g', kcal: 180, protein: 27, fat: 7, carb: 0 },
  { id: 'canh-ga', name: 'Cánh gà', category: 'protein', group: 'moderate', servingSize: 100, servingUnit: 'g', kcal: 203, protein: 30, fat: 8, carb: 0 },
  { id: 'muc', name: 'Mực', category: 'protein', group: 'moderate', servingSize: 100, servingUnit: 'g', kcal: 92, protein: 15.6, fat: 1.4, carb: 3.1 },
  { id: 'ca-hoi', name: 'Cá hồi', category: 'protein', group: 'moderate', servingSize: 100, servingUnit: 'g', kcal: 208, protein: 22, fat: 13, carb: 0 },
  { id: 'bo-xay-nac', name: 'Bò xay nạc (90/10)', category: 'protein', group: 'moderate', servingSize: 100, servingUnit: 'g', kcal: 217, protein: 26, fat: 12, carb: 0 },
  { id: 'dui-ga-co-da', name: 'Đùi gà có da', category: 'protein', group: 'limit', servingSize: 100, servingUnit: 'g', kcal: 250, protein: 24, fat: 16, carb: 0 },
  { id: 'suon-heo', name: 'Sườn heo', category: 'protein', group: 'limit', servingSize: 100, servingUnit: 'g', kcal: 277, protein: 25, fat: 19, carb: 0 },
  { id: 'heo-xay-thuong', name: 'Heo xay thường', category: 'protein', group: 'limit', servingSize: 100, servingUnit: 'g', kcal: 297, protein: 25, fat: 21, carb: 0 },
  { id: 'bo-xay-thuong', name: 'Bò xay thường (80/20)', category: 'protein', group: 'limit', servingSize: 100, servingUnit: 'g', kcal: 254, protein: 24, fat: 17, carb: 0 },
  { id: 'cha-lua', name: 'Chả lụa', category: 'protein', group: 'limit', servingSize: 100, servingUnit: 'g', kcal: 210, protein: 15, fat: 15, carb: 4 },
  { id: 'xuc-xich', name: 'Xúc xích', category: 'protein', group: 'limit', servingSize: 100, servingUnit: 'g', kcal: 300, protein: 12, fat: 27, carb: 2, addedSugar: 2 },
  { id: 'ba-roi-heo', name: 'Ba rọi heo', category: 'protein', group: 'limit', servingSize: 100, servingUnit: 'g', kcal: 518, protein: 9, fat: 53, carb: 0 },

  // ---- Trứng ----
  { id: 'trung-luoc', name: 'Trứng gà luộc', category: 'trung', group: 'good', servingSize: 1, servingUnit: 'quả', kcal: 78, protein: 6.5, fat: 5.5, carb: 0.6, note: '~50g. Khuyến nghị 2-3 quả/ngày — giới hạn thật là fat budget, không phải cholesterol.' },
  { id: 'trung-op-la', name: 'Trứng ốp la (có dầu)', category: 'trung', group: 'moderate', servingSize: 1, servingUnit: 'quả', kcal: 100, protein: 6.5, fat: 8, carb: 0.6, note: 'Đã tính dầu chiên — không cộng thêm oilTsp.' },

  // ---- Tinh bột ----
  { id: 'com-trang', name: 'Cơm trắng (đã nấu)', category: 'tinhbot', group: 'good', servingSize: 100, servingUnit: 'g', kcal: 130, protein: 2.7, fat: 0.3, carb: 28 },
  { id: 'khoai-lang', name: 'Khoai lang luộc', category: 'tinhbot', group: 'good', servingSize: 100, servingUnit: 'g', kcal: 86, protein: 1.6, fat: 0, carb: 20 },
  { id: 'banh-mi', name: 'Bánh mì (ổ VN)', category: 'tinhbot', group: 'moderate', servingSize: 1, servingUnit: 'ổ', kcal: 250, protein: 8, fat: 2, carb: 48 },
  { id: 'chuoi', name: 'Chuối', category: 'tinhbot', group: 'good', servingSize: 1, servingUnit: 'quả', kcal: 105, protein: 1.3, fat: 0.4, carb: 27, note: 'Đường tự nhiên — không tính vào hạn mức đường thêm vào.' },

  // ---- Snack ----
  { id: 'sua-chua-hy-lap', name: 'Sữa chua Hy Lạp không đường', category: 'snack', group: 'good', servingSize: 150, servingUnit: 'g', kcal: 90, protein: 15, fat: 0, carb: 6 },
  { id: 'whey', name: 'Whey protein', category: 'snack', group: 'good', servingSize: 1, servingUnit: 'muỗng', kcal: 120, protein: 24, fat: 2, carb: 3, note: '1 muỗng ~30g.' },
  { id: 'hat', name: 'Hạnh nhân / óc chó', category: 'snack', group: 'moderate', servingSize: 20, servingUnit: 'g', kcal: 115, protein: 4, fat: 10, carb: 4 },

  // ---- Món ăn ngoài (ước tính ±10-15%) ----
  { id: 'jollibee-combo', name: 'Combo Jollibee (mì Ý + gà + khoai chiên)', category: 'anngoai', group: 'limit', servingSize: 1, servingUnit: 'phần', kcal: 1080, protein: 32, fat: 50, carb: 110, addedSugar: 25, estimate: true },
  { id: 'com-tam-suon-opla', name: 'Cơm tấm sườn + ốp la', category: 'anngoai', group: 'limit', servingSize: 1, servingUnit: 'phần', kcal: 880, protein: 47, fat: 38, carb: 80, addedSugar: 10, estimate: true },
  { id: 'buffet-nuong', name: 'Buffet thịt nướng', category: 'anngoai', group: 'limit', servingSize: 1, servingUnit: 'phần', kcal: 2750, protein: 120, fat: 180, carb: 120, addedSugar: 25, estimate: true, note: 'Dải thực tế 2000-3500 kcal. Con số ở đây là mức giữa — chỉnh số phần nếu ăn ít/nhiều hơn.' },

  // ---- Đường thêm vào (để log riêng, spec mục 2) ----
  { id: 'duong-trang', name: 'Đường trắng', category: 'khac', group: 'limit', servingSize: 1, servingUnit: 'muỗng cà phê', kcal: 16, protein: 0, fat: 0, carb: 4, addedSugar: 4 },
  { id: 'sua-dac', name: 'Sữa đặc', category: 'khac', group: 'limit', servingSize: 1, servingUnit: 'muỗng canh', kcal: 64, protein: 1.6, fat: 1.7, carb: 10.8, addedSugar: 10.8 },
  { id: 'nuoc-ngot', name: 'Nước ngọt có gas', category: 'khac', group: 'limit', servingSize: 1, servingUnit: 'lon 330ml', kcal: 139, protein: 0, fat: 0, carb: 35, addedSugar: 35 },
  { id: 'tra-sua', name: 'Trà sữa trân châu', category: 'khac', group: 'limit', servingSize: 1, servingUnit: 'ly', kcal: 350, protein: 4, fat: 10, carb: 60, addedSugar: 45, estimate: true, note: 'Ly ~500ml, đường 100%. Ước tính.' },
]

export const CATEGORY_LABELS: Record<string, string> = {
  protein: 'Thịt, cá, hải sản',
  trung: 'Trứng',
  tinhbot: 'Tinh bột',
  snack: 'Snack',
  anngoai: 'Món ăn ngoài',
  khac: 'Đường & đồ uống',
}

export const GROUP_LABELS: Record<string, string> = {
  good: 'Nên ăn',
  moderate: 'Vừa phải',
  limit: 'Hạn chế',
}
