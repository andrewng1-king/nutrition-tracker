# Cài Supabase cho Nutrition Tracker

Làm một lần, khoảng 10 phút. Xong thì dữ liệu được đồng bộ lên Supabase, dùng được trên nhiều
máy, và bản nháp buổi tập đang gõ dở không mất khi app bị tắt.

Tên các mục trong dashboard Supabase có thể lệch chút tuỳ phiên bản, nhưng vị trí thì như dưới.

## 1. Tạo project

1. Vào <https://supabase.com/dashboard> → **New project**.
2. Đặt tên (VD `nutrition-tracker`), đặt **Database password** rồi lưu lại ở chỗ an toàn.
3. **Region**: chọn **Southeast Asia (Singapore)**, gần Việt Nam nhất nên đồng bộ nhanh.
4. Gói **Free** là đủ cho một người dùng.

## 2. Tạo bảng

1. Trong project, mở **SQL Editor** → **New query**.
2. Mở file [`supabase/migrations/20260911000000_init_sync.sql`](supabase/migrations/20260911000000_init_sync.sql),
   copy toàn bộ, dán vào rồi bấm **Run**.
3. Mở **Table Editor**, phải thấy 3 bảng: `app_state`, `days`, `drafts`. Cả ba đều có nhãn
   **RLS enabled**.

File SQL chạy lại nhiều lần vẫn an toàn.

## 3. Bật đăng nhập bằng mã email

App đăng nhập bằng **mã 6 số gửi qua email**, không dùng magic link. Lý do: trên iPhone, bấm
link trong mail sẽ mở Safari chứ không mở app đã cài lên màn hình chính, nên phiên đăng nhập
nằm sai chỗ. Gõ mã thì đăng nhập ngay trong app.

1. **Authentication → Sign In / Providers → Email**: bật **Enable Email provider** (thường đã bật sẵn).
2. **Authentication → Emails → Templates**. Sửa **cả hai** template **Magic link** và **Confirm sign up**
   để email có chứa mã. Ví dụ:
   - Subject: `Mã đăng nhập Nutrition Tracker`
   - Body:
     ```html
     <h2>Mã đăng nhập</h2>
     <p>Mã của bạn: <strong style="font-size:24px">{{ .Token }}</strong></p>
     <p>Mã dùng một lần, hết hạn sau 1 giờ.</p>
     ```
   Phải có `{{ .Token }}` thì email mới có mã. Template mặc định chỉ có link.

Lưu ý về email: dịch vụ gửi mail có sẵn của Supabase **chỉ gửi tới email của thành viên trong
project** (chính là email bạn dùng đăng ký Supabase) và giới hạn 2 email mỗi giờ. Đăng nhập
bằng đúng email đó là chạy ngay, bỏ qua được mục 4. Email khác sẽ báo
`Error sending confirmation email` → làm mục 4.

## 4. SMTP riêng (nếu muốn dùng email khác)

Mail có sẵn của Supabase chỉ để thử. Gắn Resend vào là gửi được tới email bạn muốn, hạn mức
3000 mail/tháng, miễn phí, không cần có tên miền riêng.

1. Vào <https://resend.com> → **Sign up**. **Đăng ký bằng đúng email bạn sẽ dùng để đăng nhập app**
   (VD `abc@gmail.com`) — quan trọng, lý do ở ghi chú dưới.
2. Vào **API Keys** → **Create API Key**. Quyền **Sending access** là đủ. Copy key `re_…`, chỉ hiện
   một lần.
3. Về Supabase → **Authentication → Emails → SMTP Settings** → bật **Enable Custom SMTP**, điền:

   | Ô | Điền |
   |---|---|
   | Sender email | `onboarding@resend.dev` |
   | Sender name | `Nutrition Tracker` |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | key `re_…` ở bước 2 |

4. **Save**.
5. **Authentication → Rate Limits** → mục gửi email: mặc định 30/giờ, để nguyên là được.

> **Vì sao phải đăng ký Resend bằng chính email đó:** khi chưa xác minh tên miền riêng, Resend chỉ
> cho gửi từ `onboarding@resend.dev` **tới địa chỉ email của chủ tài khoản Resend**. Đúng nhu cầu
> app một người dùng. Sau này muốn gửi tới email bất kỳ thì vào Resend → **Domains**, thêm tên miền
> của bạn, xác minh DNS, rồi đổi ô Sender email thành `no-reply@tenmien-cua-ban`.

Thử lại: mở app → **Cài đặt → Đồng bộ Supabase** → **Gửi mã đăng nhập**. Không thấy mail thì xem
**Logs → Auth Logs** trên Supabase và tab **Emails** trên Resend — một trong hai chỗ sẽ ghi lỗi thật.

## 5. Lấy URL và key

1. **Project Settings → API Keys**: copy **Publishable key** (`sb_publishable_…`). Project cũ thì
   dùng **anon** key trong mục Legacy. Cả hai đều được.
2. **Project URL** (`https://xxxx.supabase.co`): nằm ở **Project Settings → Data API**, hoặc bấm
   nút **Connect** trên đầu dashboard.

> **Không bao giờ** dùng `service_role` key hay secret key cho app này. Publishable/anon key được
> phép nằm công khai trong code trên Vercel, vì dữ liệu đã được khoá bằng RLS. Service role key
> thì vượt qua được RLS: lộ ra là ai cũng đọc/xoá được toàn bộ dữ liệu.

## 6. Điền vào máy chạy dev

Mở (hoặc tạo) file `.env.local` ở thư mục gốc dự án, thêm hai dòng:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
```

(Nếu file đang ghi `VITE_SUPABASE_ANON_KEY=…` thì giữ nguyên, app nhận được cả tên đó.)

Tắt `npm run dev` rồi chạy lại: Vite chỉ đọc biến môi trường lúc khởi động.
File `.env.local` đã nằm trong `.gitignore`, không bị commit.

## 7. Điền vào Vercel

1. Vercel → project → **Settings → Environment Variables**.
2. Thêm `VITE_SUPABASE_URL` và `VITE_SUPABASE_PUBLISHABLE_KEY`, chọn **Production** (và **Preview**
   nếu dùng).
3. **Deployments → Redeploy** bản mới nhất. Biến `VITE_*` được nhúng vào code lúc build, nên
   thêm biến xong mà không build lại thì app vẫn chưa thấy.

## 8. Đăng nhập trong app

1. Mở app → **Cài đặt → Đồng bộ Supabase** → nhập email → **Gửi mã đăng nhập**.
2. Mở email, gõ mã vào ô **Mã trong email** → **Đăng nhập**.
3. Lần đầu:
   - Tài khoản còn trống: toàn bộ dữ liệu trên máy tự đẩy lên.
   - Tài khoản đã có dữ liệu mà máy này cũng có: app hỏi **Dùng dữ liệu tài khoản** (bỏ dữ liệu
     máy này) hay **Gộp cả hai** (giữ các ngày chỉ máy này có, ngày trùng lấy bản tài khoản).
     Phân vân thì bấm **Tải file backup máy này trước**.

Thẻ đồng bộ hiện trạng thái: đang đồng bộ, số mục chờ đẩy lên, hoặc giờ đồng bộ gần nhất.

## 9. Khoá đăng ký (nên làm)

Sau khi đã đăng nhập được lần đầu: **Authentication → Sign In / Providers** → tắt
**Allow new users to sign up**.

RLS vốn đã không cho người khác đọc dữ liệu của bạn. Khoá đăng ký để người lạ có key công khai
cũng không tạo được tài khoản và dùng hết quota miễn phí của project.

## Cách đồng bộ hoạt động

- **Máy là nguồn chính.** Mọi thao tác ghi vào máy trước, nên phòng gym mất sóng vẫn log bình
  thường. Có mạng thì app đẩy lên sau khoảng 1,5 giây.
- App kéo dữ liệu về khi mở app, khi quay lại app, khi có mạng lại, và mỗi 90 giây lúc đang mở.
  Ẩn app thì đẩy lên ngay, phòng khi điện thoại tắt app.
- `days`: mỗi ngày một dòng. Hai máy cùng sửa một ngày thì **bản sửa sau cùng thắng**.
- `app_state`: cài đặt, món tự thêm, bài tự thêm, mẫu bữa ăn, buổi tập mẫu.
- `drafts`: các ô nhập set đang gõ dở. Mở app lên mà còn nháp từ lần trước thì app hỏi
  *"Bạn đang tập dở …, tiếp tục không?"*.
- Đăng xuất chỉ ngắt đồng bộ, dữ liệu trên máy giữ nguyên.
- **Xoá toàn bộ dữ liệu** ở Cài đặt khi đang đăng nhập sẽ xoá cả trên tài khoản.

## Gặp lỗi

| Thông báo | Nguyên nhân / cách xử lý |
|---|---|
| Thẻ đồng bộ ghi "Chưa cấu hình" | Thiếu biến môi trường, hoặc chưa khởi động lại dev server / chưa redeploy Vercel |
| "Supabase không gửi được email" (`Error sending confirmation email`) | Chưa có SMTP riêng mà đăng nhập bằng email không phải thành viên project. Làm mục 4 |
| Không nhận được email | Kiểm tra Spam. Vẫn không có thì xem **Logs → Auth Logs** (Supabase) và tab **Emails** (Resend) |
| Email chỉ có link, không có mã | Template chưa có `{{ .Token }}` (mục 3) |
| "Mã sai hoặc đã hết hạn" | Dùng mã trong email mới nhất. Mỗi lần bấm gửi lại là mã cũ hết hiệu lực |
| "Gửi mã quá nhiều lần" | Chạm giới hạn gửi mail, đợi vài phút |
| "Email này chưa có tài khoản" | Đã tắt đăng ký trước khi tạo tài khoản. Bật lại, đăng nhập, rồi tắt |
| "Lỗi đồng bộ: relation … does not exist" | Chưa chạy file SQL ở mục 2 |
| Lâu ngày không dùng, đồng bộ lỗi | Project Free bị tạm dừng sau 7 ngày không hoạt động. Vào dashboard bấm **Restore**; trong lúc đó app vẫn chạy trên máy, có lại là tự đồng bộ |
