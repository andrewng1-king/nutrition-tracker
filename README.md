# Nutrition Tracker

App track dinh dưỡng cá nhân (1 người dùng), tiếng Việt, chạy local-first trên điện thoại.
Xây theo [nutrition-tracker-spec.md](nutrition-tracker-spec.md).

## Chạy

```bash
npm install
npm run dev
```

| Lệnh | Việc |
|---|---|
| `npm run dev` | Dev server (port mặc định của Vite) |
| `npm run build` | Build production vào `dist/` |
| `npm run preview` | Xem thử bản build |
| `npm test` | Chạy unit test cho engine macro |

## Cài lên điện thoại

App là PWA. Deploy `dist/` lên bất kỳ static host nào (Vercel, Netlify, GitHub Pages, hoặc
`npx serve dist` trong mạng LAN), mở bằng trình duyệt điện thoại rồi **Add to Home Screen**.
Sau đó chạy offline được, không cần mạng để log.

## Dữ liệu

Dữ liệu nằm trong `localStorage` của trình duyệt và app chạy được hoàn toàn offline. Khi đã
cấu hình Supabase và đăng nhập (**Cài đặt → Đồng bộ Supabase**), mọi thay đổi được đồng bộ lên
Supabase theo kiểu local-first: ghi vào máy trước, có mạng thì đẩy lên. Cách cài từng bước ở
[SUPABASE.md](SUPABASE.md). Chưa cấu hình thì app chạy chỉ trên máy như trước, và vẫn nên
**Cài đặt → Tải file backup** định kỳ.

## Cấu trúc

```
src/
  data/foods.ts          37 món seed từ spec mục 5 (đã nấu chín, không dầu)
  lib/types.ts           kiểu dữ liệu dùng chung
  lib/macros.ts          engine: cộng macro, target, STATUS_RULES, portion helper
  lib/day.ts             ghép ngày + target + tổng macro + tiền, một chỗ duy nhất
  lib/week.ts            tuần (T2–CN), ngân sách calo tuần, cheat meal đã dùng chưa
  lib/status.ts          thang màu đỏ→xanh, và ghi chú "thiếu gì, ăn gì, không ăn thì sao"
  lib/run.ts             pace, kcal đốt, parse file GPX/TCX xuất từ Strava
  lib/wallet.ts          tổng hợp chi tiêu: ngày / tuần / tháng, trung bình, top món
  lib/label.ts           đọc bảng dinh dưỡng từ text OCR (VN + EN)
  lib/verdict.ts         quyết định nên ăn / ăn một phần / để hôm khác
  lib/storage.ts         localStorage + export/import backup
  lib/lift.ts            volume, 1RM, dropset, bước nhảy kg, lần trước, buổi mẫu
  lib/setRows.ts         dòng nhập set: tick, set chờ lưu, dựng từ log / kế hoạch / lần trước
  lib/draft.ts           bản nháp ô nhập set, sống qua lúc app bị tắt
  lib/sync.ts            đồng bộ Supabase + đăng nhập bằng mã email
  lib/syncCore.ts        phần logic thuần của đồng bộ (gộp ngày, giải xung đột)
  lib/format.ts          định dạng tiếng Việt, tìm kiếm không dấu
supabase/migrations/     SQL tạo bảng + RLS, chạy trong Supabase SQL Editor
  components/            Sheet, Ring, WeekChart, ExpenseGauge, NoticeSheet,
                         LogSheet, EntrySheet, ScanSheet, RunSheet, icons
  screens/               Today, History, Wallet, Foods, Body, Settings
  *.test.ts              engine macro, parser nhãn, verdict, buổi chạy, ví tiền, tập tạ, đồng bộ
```

## Quét nhãn dinh dưỡng

Nút máy ảnh ở màn Hôm nay: chụp bảng "Thông tin dinh dưỡng" trên bao bì. App OCR
(tesseract.js, tiếng Việt + Anh), đọc ra calo/protein/fat/carb/đường, rồi đối chiếu với:

1. chỗ calo còn lại của **hôm nay**,
2. calo đã **để dành** trong tuần (mỗi ngày ăn hụt chỉ được để dành tối đa 350 kcal —
   không khuyến khích nhịn sâu, spec mục 8),
3. **cheat meal** tuần này còn hay đã dùng.

Kết quả là một trong bốn: *Ăn thoải mái*, *Ăn được (kèm lý do)*, *Tính là cheat meal*,
hoặc *Ăn một phần thôi / Để hôm khác* — kèm số gram ăn được và nút log thẳng phần đó.

Trần fat và hạn mức đường là **hạn mức cứng**: calo dư của tuần không mua được quyền
vượt hai cái đó. Khẩu phần gợi ý luôn lấy theo hạn mức chật nhất trong ba (calo, fat, đường).

Số liệu OCR đọc ra đều **sửa tay được trước khi quyết định** — nhãn mờ hay chụp nghiêng
là chuyện thường, nên bước xác nhận là bắt buộc chứ không phải tuỳ chọn. Lần quét đầu
cần mạng để tải bộ nhận dạng chữ (~10MB), sau đó trình duyệt cache lại.

Ảnh nhãn lấy được theo hai cách: **Chụp nhãn** (mở thẳng camera) hoặc **Chọn ảnh từ album**.

## Buổi tập tạ

- **Nhập set**: mỗi ô kg và rep có nút − / +. Kg nhảy 2,5 mỗi lần bấm, đổi riêng cho từng bài ở
  **Sửa bài** (máy cáp nấc 5 kg, tạ đơn nhảy 2 kg…). Nhấn giữ thì số chạy liên tục.
- **Tick từng set**: tập xong set nào tick set đó, set đã tick vào log ngay. Bấm Lưu mà còn set
  đã điền chưa tick thì app hỏi tick hết hay chỉ giữ set đã tick.
- **Dropset**: bấm số thứ tự set → **Thêm nấc drop**, kg gợi ý giảm ~20%. Cả chuỗi tính là một
  set, volume cộng mọi nấc, 1RM/top set chỉ đọc set chính.
- **Lần trước**: chọn nhóm buổi (VD Kéo) khi hôm nay chưa log gì, app hiện buổi Kéo gần nhất.
  **Log sẵn** đưa các bài đó vào kế hoạch; set chỉ vào log khi được tick, nên bỏ bài giữa chừng
  không làm sai lịch sử.
- **Buổi mẫu**: log xong bấm **Lưu thành buổi mẫu** và đặt tên. Mẫu nhớ bài và số set, còn kg/rep
  lấy từ lần tập gần nhất mỗi khi dùng. Quản lý ở **Cài đặt → Buổi tập mẫu**.
- **Sửa buổi cũ**: tab Bài tập → **Các buổi đã tập** → bấm vào ngày cần sửa.
- **Tiến bộ từng bài**: nút sparkline bên phải mỗi bài trong danh sách (6 buổi gần nhất + mức
  chênh). Bấm vào mở biểu đồ theo thời gian: đổi 1RM / top set / volume, lọc 1T–6T–tất cả,
  vòng lime đánh dấu kỷ lục mới, chạm một điểm để xem set của buổi đó.
- **Bản nháp**: số đang gõ dở được lưu ngay trên máy (và đồng bộ nếu đã đăng nhập). App bị tắt
  giữa buổi thì lần mở sau hỏi *"Bạn đang tập dở …, tiếp tục không?"*.

## Buổi chạy bộ

Bấm chip **Ngày chạy bộ** ở màn Hôm nay để nhập quãng đường, thời gian và độ cao — hoặc
nhập thẳng từ file Strava: mở activity trên Strava → menu ⋯ → **Export GPX**, chọn file.
File GPX/TCX được parse ngay trên máy (haversine cho quãng đường, timestamp cho thời gian,
lọc nhiễu GPS dưới 1m khi cộng độ cao). Không cần đăng nhập Strava, không gửi dữ liệu đi đâu.

Có buổi chạy thì target ngày đó cộng đúng lượng kcal đốt được (`km × kg × 1.03`) thay cho
con số mặc định, vẫn dồn hết vào carb và không cộng protein. Số này bị chặn trên ở 900 kcal
để một lần gõ nhầm quãng đường không thổi target lên gấp đôi.

## Chi tiêu — tab Ví tiền

Giá tiền nhập tay lúc log món (hoặc bấm vào món đã log để thêm sau). App nhớ đơn giá của
từng món nên lần sau điền sẵn theo khẩu phần. Màn Hôm nay có đồng hồ chia chi tiêu theo bữa.

Tab **Ví tiền** tổng hợp: tổng đã chi, chi hôm nay / tuần / tháng, trung bình mỗi ngày,
trung bình mỗi tháng, biểu đồ 14–30 ngày, chia theo bữa, top món tốn tiền, và tiền đổi ra
dinh dưỡng (đồng mỗi gram protein, đồng mỗi 1.000 kcal).

Hai quy tắc thống kê quan trọng:

- Trung bình ngày chỉ chia cho **ngày thực sự có chi tiền**. Ngày ăn nhưng quên nhập tiền
  không được tính vào mẫu số, nếu không trung bình sẽ tụt xuống thành con số vô nghĩa.
- Một tháng chỉ được tính vào **trung bình tháng** khi có ít nhất 60% số ngày trong tháng
  có chi. Tháng đầu tiên thường bắt đầu giữa chừng (VD từ 27/07 chỉ có 4 ngày) — gộp vào
  sẽ kéo trung bình xuống rất sai. Tháng chưa đủ hiện nhãn "chưa đủ tháng". Khi chưa có
  tháng nào đủ thì hiện ước tính `TB ngày × 30,44`.

## Ghi chú thiết kế

Font là **Be Vietnam Pro**, không phải Instrument Sans như bản tham chiếu: Instrument Sans
không có khối U+1EA0–U+1EF1 (ạ ế ộ ữ ậ ị…), chữ tiếng Việt sẽ rơi sang font hệ thống ngay
giữa từ. Be Vietnam Pro cùng kiểu geometric sans và phủ đủ tiếng Việt.

## Quy ước dữ liệu

- Mọi số macro tính theo **`servingSize` `servingUnit`** của món đó: món tính theo 100g có
  `servingSize: 100, servingUnit: 'g'`, món tính theo cái có `servingSize: 1, servingUnit: 'quả'`.
- Số liệu là **thực phẩm đã nấu chín, không thêm dầu**. Dầu thêm khi nấu log riêng qua
  `oilTsp` trên từng entry: 1 muỗng cà phê = +5g fat, +45 kcal.
- Ngày lưu theo giờ địa phương (`YYYY-MM-DD`) — bữa ăn lúc 23:00 vẫn thuộc ngày hôm đó.

## Target và cảnh báo

Target protein tự tính theo cân nặng (`weightKg × proteinPerKg`, mặc định 60 × 2.33 = 140g)
và cập nhật khi nhập cân nặng mới ở tab Cơ thể.

Ngày chạy bộ (mặc định T3 + CN, chỉnh được) cộng thêm calo — **toàn bộ vào carb, không cộng
protein**. Ngưỡng cảnh báo (fat ≥ 50g, carb ≥ 200g, calo ≥ 2000) là số tuyệt đối theo spec
mục 6, không đổi theo ngày chạy.

Chỉ số nào chưa đạt thì vòng của nó có **nền đỏ nhạt**. Bấm vào vòng ra ghi chú: thiếu bao
nhiêu, ăn gì bù (bấm một dòng là log thẳng), và **không bù thì hậu quả gì** — gắn với mục
tiêu recomp chứ không phải câu cảnh báo chung chung. Gợi ý chỉ lấy món thực sự giàu macro
đang thiếu (mật độ đạt ≥ 45% món đậm đặc nhất) — nếu không sẽ ra những thứ vô nghĩa như
10kg đậu hũ để bù carb.

Màu vòng chạy theo thang **đỏ → cam → vàng → xanh**. Chỉ số cần đạt (protein, carb, calo)
càng đầy càng xanh. Chỉ số có trần (fat, đường) thì vượt trần là đỏ, sát trần là vàng.
Fat có cả sàn 50g lẫn trần 65g nên chấm theo cả hai phía.

**Vượt chỉ tiêu**: vòng nền chuyển sang xanh (đã đủ) và một cung thứ hai chạy đè lên từ mốc
0 — độ dài cung đó chính là phần vượt, nhìn là ước lượng được ngay. Cung đè màu đỏ với fat,
đường và calo (vượt là vấn đề), màu xanh dương với protein và carb (spec: vượt protein
không sao).

Streak đếm số ngày liên tiếp đạt hết ngưỡng. Ngày có cheat meal bị bỏ qua (không cộng,
không làm đứt). **Hôm nay không bao giờ làm đứt streak** — ngày chưa kết thúc thì chưa
tính là hỏng.

## Đã làm

Toàn bộ MVP (spec mục 3) và mục 4 (nice to have): log bữa ăn, dashboard hôm nay, food
database tự thêm/sửa được, meal template 1 tap, lịch sử 7/30 ngày + trung bình + streak,
cảnh báo cuối ngày kèm gợi ý món bù, chế độ ngày chạy bộ, đánh dấu cheat meal (không làm
đứt streak), theo dõi cân nặng + vòng eo, và ước tính món ăn ngoài.
