-- Chặn stale upsert ngay trong transaction; UPDATE đã giữ row lock.
-- Không cho request đến muộn thay thế nội dung có timestamp mới hơn.
create or replace function public.guard_sync_version()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.updated_at < old.updated_at or
     (new.updated_at = old.updated_at and new.data is distinct from old.data) then
    raise exception 'Sync conflict: fetch the latest row before retrying'
      using errcode = '40001';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_sync_write on public.days;
create trigger guard_sync_write before update on public.days
  for each row execute function public.guard_sync_version();
drop trigger if exists guard_sync_write on public.app_state;
create trigger guard_sync_write before update on public.app_state
  for each row execute function public.guard_sync_version();
drop trigger if exists guard_sync_write on public.drafts;
create trigger guard_sync_write before update on public.drafts
  for each row execute function public.guard_sync_version();
