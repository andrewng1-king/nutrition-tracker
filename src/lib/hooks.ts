import { useSyncExternalStore } from 'react'
import { store } from './storage'
import type { AppData } from './types'

export function useData(): AppData {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}
