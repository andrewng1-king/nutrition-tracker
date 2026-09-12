import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
// Project mới có "publishable key" (sb_publishable_…); project cũ gọi là "anon key". Nhận cả hai.
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined

/**
 * null khi chưa điền biến môi trường — app chạy y như trước, chỉ trên máy.
 * Key ở đây là publishable/anon key: được phép nằm trong bundle công khai, dữ
 * liệu được khoá bằng RLS. Service role key tuyệt đối không đưa vào frontend.
 */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      })
    : null
