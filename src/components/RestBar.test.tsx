// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { RestBar, RestController } from './RestBar'
import { clearRest, restStore, startRest } from '../lib/rest'

let root: Root, host: HTMLDivElement
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-04T00:00:00Z'))
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(() => { act(() => { root.unmount(); clearRest() }); host.remove(); vi.useRealTimers(); vi.restoreAllMocks() })
it('alerts once even when the rest bar disappears during navigation', () => {
  const vibrate = vi.fn()
  vi.stubGlobal('navigator', { onLine: true, vibrate })
  act(() => { startRest('pullup',15); root.render(<><RestController /><RestBar /></>) })
  act(() => root.render(<RestController />))
  act(() => vi.advanceTimersByTime(15_000))
  expect(vibrate).toHaveBeenCalledOnce()
  expect(restStore.get()?.alerted).toBe(true)
  act(() => root.render(<><RestController /><RestBar /></>))
  expect(host.textContent).toContain('Hết giờ nghỉ')
  expect(vibrate).toHaveBeenCalledOnce()
  act(() => vi.advanceTimersByTime(12_000))
  expect(restStore.get()).toBeNull()
  vi.unstubAllGlobals()
})
