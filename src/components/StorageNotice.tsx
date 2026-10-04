import { useSyncExternalStore } from 'react'
import { persistenceStore, retryPersistence } from '../lib/persistence'
import { downloadBackup } from '../lib/storage'

export function StorageNotice() {
  const errors = useSyncExternalStore(persistenceStore.subscribe, persistenceStore.get, persistenceStore.get)
  const messages = [...new Set(Object.values(errors))]
  if (!messages.length) return null
  return <aside className="storage-notice" role="alert">
    <strong>Chưa lưu an toàn trên máy</strong>
    {messages.map((m) => <p key={m}>{m}</p>)}
    <div className="row">
      <button className="btn sm" onClick={retryPersistence}>Thử lưu lại</button>
      <button className="btn sm" onClick={downloadBackup}>Tải backup hiện tại</button>
    </div>
  </aside>
}
