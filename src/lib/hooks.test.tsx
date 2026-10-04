// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useOverlay } from './hooks'

let root: Root
let host: HTMLDivElement
let trigger: HTMLButtonElement
function Modal({ close, children }: { close: () => void; children?: React.ReactNode }) {
  const ref = useOverlay(close)
  return <div ref={ref} tabIndex={-1} role="dialog"><button>First</button><button>Last</button>{children}</div>
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList)
  trigger = document.createElement('button'); trigger.textContent = 'Open'
  host = document.createElement('div')
  document.body.append(trigger, host); trigger.focus()
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); trigger.remove(); host.remove(); vi.restoreAllMocks() })
it('traps both Tab directions, makes the background inert and restores focus', () => {
  act(() => root.render(<Modal close={() => {}} />))
  const buttons = host.querySelectorAll('button')
  expect(document.activeElement).toBe(buttons[0])
  expect(trigger.inert).toBe(true)
  document.dispatchEvent(new KeyboardEvent('keydown', {key:'Tab',shiftKey:true,bubbles:true,cancelable:true}))
  expect(document.activeElement).toBe(buttons[1])
  document.dispatchEvent(new KeyboardEvent('keydown', {key:'Tab',bubbles:true,cancelable:true}))
  expect(document.activeElement).toBe(buttons[0])
  act(() => root.render(null))
  expect(document.activeElement).toBe(trigger)
  expect(trigger.inert).toBeFalsy()
  expect(document.body.style.overflow).toBe('')
})
it('keeps a simultaneously mounted nested popup on top and only closes it on Escape', () => {
  const parent = vi.fn(), child = vi.fn()
  act(() => root.render(<Modal close={parent}><Modal close={child} /></Modal>))
  const inner = host.querySelectorAll('[role="dialog"]')[1]
  expect(inner.contains(document.activeElement)).toBe(true)
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}))
  expect(child).toHaveBeenCalledOnce()
  expect(parent).not.toHaveBeenCalled()
  act(() => root.render(<Modal close={parent} />))
  expect(document.body.style.overflow).toBe('hidden')
  expect(host.querySelector('[role="dialog"]')!.contains(document.activeElement)).toBe(true)
})
