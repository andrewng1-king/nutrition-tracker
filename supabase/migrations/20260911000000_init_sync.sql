-- Nutrition Tracker: bảng đồng bộ cho app local-first.
-- Chạy nguyên file trong Supabase Dashboard → SQL Editor. Chạy lại nhiều lần vẫn an toàn.
--
-- Mô hình: dữ liệu chính nằm trên điện thoại, Supabase là bản sao để đồng bộ và giữ an toàn.
--   app_state  1 dòng / người: cài đặt, món tự thêm, bài tự thêm, mẫu bữa ăn, buổi mẫu
--   days       1 dòng / ngày:  bữa ăn, buổi chạy, buổi tạ, kế hoạch, số đo (JSON của DayLog)
--   drafts     1 dòng / người: các ô nhập set đang gõ dở chưa lưu
--
-- updated_at: mốc giờ (ms) của máy đã sửa — dùng để quyết định bản nào mới hơn khi hai máy cùng sửa.
-- synced_at:  giờ server lúc ghi — app dùng làm con trỏ "kéo những gì mới từ lần trước".

create table if not exists public.app_state (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at bigint not null,
  synced_at  timestamptz not null default clock_timestamp()
);

create table if not exists public.days (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date       date not null,
  data       jsonb,              -- null = ngày đã bị xoá trên một máy
  updated_at bigint not null,
  synced_at  timestamptz not null default clock_timestamp(),
  primary key (user_id, date)
);

create index if not exists days_user_synced_idx on public.days (user_id, synced_at);

create table if not exists public.drafts (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb,              -- null = không còn nháp nào
  updated_at bigint not null,
  synced_at  timestamptz not null default clock_timestamp()
);

-- clock_timestamp() thay vì now(): now() giống hệt nhau cho mọi dòng trong một lần upsert,
-- con trỏ phân trang theo synced_at sẽ bỏ sót dòng khi hai trang cắt ngang cùng một mốc.
create or replace function public.touch_synced_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.synced_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists app_state_touch on public.app_state;
create trigger app_state_touch before insert or update on public.app_state
  for each row execute function public.touch_synced_at();

drop trigger if exists days_touch on public.days;
create trigger days_touch before insert or update on public.days
  for each row execute function public.touch_synced_at();

drop trigger if exists drafts_touch on public.drafts;
create trigger drafts_touch before insert or update on public.drafts
  for each row execute function public.touch_synced_at();

-- ---------------- Row Level Security ----------------
-- Publishable/anon key nằm công khai trong bundle trên Vercel. Thứ duy nhất khoá dữ liệu
-- là các policy dưới đây: mỗi người chỉ đọc/ghi được dòng có user_id của chính mình.

alter table public.app_state enable row level security;
alter table public.days      enable row level security;
alter table public.drafts    enable row level security;

drop policy if exists "own app_state" on public.app_state;
create policy "own app_state" on public.app_state
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own days" on public.days;
create policy "own days" on public.days
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own drafts" on public.drafts;
create policy "own drafts" on public.drafts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Người chưa đăng nhập không có việc gì với các bảng này.
revoke all on public.app_state, public.days, public.drafts from anon;
grant select, insert, update, delete on public.app_state, public.days, public.drafts to authenticated;
