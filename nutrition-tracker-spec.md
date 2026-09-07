# Nutrition Tracker — App Spec & Context

App cá nhân (1 người dùng duy nhất). Mục tiêu: track dinh dưỡng hàng ngày để đảm bảo ăn đủ chất cho mục tiêu tăng cơ giảm mỡ (body recomposition).

---

## 1. User profile

| | |
|---|---|
| Giới tính | Nam |
| Tuổi | 26 |
| Chiều cao | 166-167 cm |
| Cân nặng | 60 kg |
| Body type | Skinny fat (ít cơ, mỡ tập trung vùng bụng) |
| Mục tiêu | Recomp — tăng cơ + giảm mỡ đồng thời |

**Lịch tập:**
- Gym: 4-5 buổi/tuần, sau giờ làm (~18:00-18:30)
- Chạy bộ: Thứ 3 và Chủ nhật, 5-10km, pace 7

**Thói quen ăn:**
- 3 bữa chính/ngày
- Meal prep 5 ngày trong tuần (không prep cuối tuần)
- Dùng nồi chiên không dầu (Sunhouse 6.5L)
- Thực đơn lặp lại mỗi 2-3 ngày hoặc 1 tuần
- 1 cheat meal/tuần

---

## 2. Daily targets (macro goals)

| Chất | Mục tiêu/ngày | Ghi chú |
|---|---|---|
| Calo | 2250-2350 kcal | TDEE ~2600, deficit nhẹ 10-15% |
| Protein | 140 g (~2.3 g/kg) | Ưu tiên cao nhất — giữ/tăng cơ |
| Fat | 65 g | Sàn tối thiểu, không hạ thấp hơn |
| Carb | 285 g | Cần cao vì có chạy bộ + gym |
| Đường thêm vào | < 25-30 g | Không tính đường tự nhiên trong trái cây |

**Quy tắc điều chỉnh:**
- Ngày chạy bộ (T3, CN): +350-600 kcal (thêm carb, không thêm protein)
- Protein 140g là mức trần đã đủ — chỉ tăng khi cân nặng tăng (giữ ~2.3 g/kg)
- Vượt protein không sao; thiếu fat hoặc thiếu carb mới là vấn đề

---

## 3. Core features (MVP)

1. **Log bữa ăn** — chọn thực phẩm từ database, nhập số gram, tự tính macro
2. **Dashboard hôm nay** — 4 progress bar (calo, protein, fat, carb) so với target, hiển thị số còn thiếu
3. **Food database** — dữ liệu built-in (bảng bên dưới) + cho phép tự thêm món mới
4. **Meal templates** — lưu bữa ăn hay lặp lại, log lại bằng 1 tap
5. **Lịch sử** — xem lại 7/30 ngày qua, trung bình tuần
6. **Cảnh báo cuối ngày** — nếu thiếu protein hoặc fat, gợi ý món bù

## 4. Nice to have (v2)

- Chế độ ngày chạy bộ (tự động tăng target carb)
- Track cheat meal riêng (đánh dấu, không tính vào streak)
- Track cân nặng + vòng eo (recomp không đo bằng cân nặng đơn thuần)
- Ước tính macro nhanh cho món ăn ngoài (Jollibee, buffet, cơm tấm...)

---

## 5. Food database (seed data)

### Protein — thịt, cá, hải sản (per 100g đã nấu chín, không dầu)

| Thực phẩm | Calo | Protein (g) | Fat (g) | Carb (g) | Nhóm |
|---|---|---|---|---|---|
| Ức gà / Lườn gà | 165 | 31 | 3.6 | 0 | good |
| Tôm | 99 | 24 | 0.3 | 0 | good |
| Cá ngừ | 132 | 28 | 1 | 0 | good |
| Cá diêu hồng | 128 | 26 | 3 | 0 | good |
| Cá basa | 105 | 18 | 3 | 0 | good |
| Nạc heo (thăn) | 143 | 26 | 4 | 0 | good |
| Thăn bò | 187 | 29 | 7 | 0 | good |
| Đậu hũ | 76 | 8 | 4.8 | 1.9 | good |
| Má đùi gà (không da) | 179 | 25 | 8 | 0 | moderate |
| Heo xay nạc | 180 | 27 | 7 | 0 | moderate |
| Cánh gà | 203 | 30 | 8 | 0 | moderate |
| Mực | 92 | 15.6 | 1.4 | 3.1 | moderate |
| Cá hồi | 208 | 22 | 13 | 0 | moderate |
| Bò xay nạc (90/10) | 217 | 26 | 12 | 0 | moderate |
| Đùi gà có da | 250 | 24 | 16 | 0 | limit |
| Sườn heo | 277 | 25 | 19 | 0 | limit |
| Heo xay thường | 297 | 25 | 21 | 0 | limit |
| Bò xay thường (80/20) | 254 | 24 | 17 | 0 | limit |
| Chả lụa | 210 | 15 | 15 | 4 | limit |
| Xúc xích | 300 | 12 | 27 | 2 | limit |
| Ba rọi heo | 518 | 9 | 53 | 0 | limit |

### Trứng

| Thực phẩm | Đơn vị | Calo | Protein (g) | Fat (g) | Carb (g) |
|---|---|---|---|---|---|
| Trứng gà luộc | 1 quả (~50g) | 78 | 6.5 | 5.5 | 0.6 |
| Trứng ốp la (có dầu) | 1 quả | 100 | 6.5 | 8 | 0.6 |

> Khuyến nghị: 2-3 quả/ngày. Giới hạn thật là fat budget (65g/ngày), không phải cholesterol.

### Tinh bột

| Thực phẩm | Đơn vị | Calo | Protein (g) | Fat (g) | Carb (g) |
|---|---|---|---|---|---|
| Cơm trắng (đã nấu) | 100 g | 130 | 2.7 | 0.3 | 28 |
| Khoai lang luộc | 100 g | 86 | 1.6 | 0 | 20 |
| Bánh mì (ổ VN) | 1 ổ | 250 | 8 | 2 | 48 |
| Chuối | 1 quả | 105 | 1.3 | 0.4 | 27 |

### Snack

| Thực phẩm | Đơn vị | Calo | Protein (g) | Fat (g) | Carb (g) | Nhóm |
|---|---|---|---|---|---|---|
| Sữa chua Hy Lạp không đường | 150 g | 90 | 15 | 0 | 6 | good |
| Whey protein | 1 muỗng (30g) | 120 | 24 | 2 | 3 | good |
| Hạnh nhân / óc chó | 20 g | 115 | 4 | 10 | 4 | moderate |

### Món ăn ngoài (ước tính, ±10-15%)

| Món | Calo | Protein (g) | Fat (g) | Carb (g) |
|---|---|---|---|---|
| Combo Jollibee (mì Ý + gà + khoai chiên) | 1080 | 32 | 50 | 110 |
| Cơm tấm sườn + ốp la | 880 | 47 | 38 | 80 |
| Buffet thịt nướng | 2000-3500 | — | — | — |

---

## 6. Business logic rules

```
STATUS_RULES:
  protein < 140g          -> WARNING "Thiếu protein — gợi ý ức gà/tôm/whey"
  fat < 50g               -> WARNING "Fat quá thấp, ảnh hưởng hormone"
  fat > 65g               -> WARNING "Vượt fat budget"
  carb < 200g             -> WARNING "Carb thấp — sẽ đuối khi tập"
  calo < 2000             -> WARNING "Ăn quá ít, nguy cơ mất cơ"
  added_sugar > 30g       -> WARNING "Đường vượt giới hạn"
  tất cả trong ngưỡng      -> OK
```

**Ưu tiên khi hiển thị cảnh báo:** protein > fat > calo > carb > đường

**Portion helper:** khi thiếu X gram protein, app gợi ý số gram cần ăn của các món nhóm `good`
(ví dụ: thiếu 30g protein → 97g ức gà HOẶC 125g tôm HOẶC 1.25 muỗng whey)

---

## 7. Tech notes

- **Chỉ 1 user** — không cần auth, không cần multi-user
- **Local-first** — lưu dữ liệu trên máy (localStorage/SQLite/file JSON tuỳ platform)
- **Mobile-friendly** — sẽ log bữa ăn bằng điện thoại lúc đang ăn
- **Nhập nhanh là ưu tiên số 1** — log 1 bữa không nên quá 3-4 tap
- **Ngôn ngữ hiển thị: tiếng Việt**
- Đơn vị: gram (không dùng oz/lbs)

---

## 8. Lưu ý quan trọng (context nền)

- Tất cả số liệu trong bảng tính theo **thực phẩm đã nấu chín, không thêm dầu**. Nồi chiên không dầu áp dụng đúng bảng này. Mỗi 1 muỗng cà phê dầu thêm vào = +5g fat, +45 kcal.
- Recomp là quá trình chậm (6-12 tháng mới thấy rõ với body type skinny fat). App nên tránh nhấn mạnh cân nặng — theo dõi bằng vòng eo, ảnh chụp, và sức nâng tạ.
- Không tự động đề xuất cắt calo sâu. Deficit đã ở mức nhẹ có chủ đích để bảo vệ cơ.
