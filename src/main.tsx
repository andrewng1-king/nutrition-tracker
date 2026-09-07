import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

/**
 * `registerType: 'autoUpdate'` cho service worker mới giành quyền ngay, nhưng lần
 * load hiện tại đã lấy HTML và asset từ cache cũ rồi — không nạp lại thì sau mỗi
 * lần deploy phải mở app hai lần mới thấy bản mới.
 *
 * Chỉ nạp lại khi ĐÃ có controller từ trước. Lần cài đầu tiên cũng bắn
 * `controllerchange`, nạp lại lúc đó là làm chậm lần mở đầu vô ích.
 */
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return
    reloading = true
    window.location.reload()
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
