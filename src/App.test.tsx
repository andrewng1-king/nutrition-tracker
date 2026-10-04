// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from './App'
import { addToPlan, allExercises, resetAll, setDayField, setLiftDone, setLiftEntry, store } from './lib/storage'
import { dateKey } from './lib/macros'
import { draftStore, getDraft } from './lib/draft'
import { clearRest, restStore } from './lib/rest'

let root: Root, host: HTMLDivElement
const today = dateKey()
const click = (element: Element | null) => {
  expect(element).not.toBeNull()
  act(() => element!.dispatchEvent(new MouseEvent('click',{bubbles:true})))
}
const button = (text: string) => [...host.querySelectorAll('button')].find((b)=>b.textContent?.trim()===text) ?? null
beforeEach(() => {
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true})
  vi.spyOn(HTMLElement.prototype,'getClientRects').mockReturnValue([{}] as unknown as DOMRectList)
  resetAll(); draftStore.applyRemote(null); clearRest()
  setDayField(today,{dayTypes:['lift']})
  host=document.createElement('div');document.body.append(host);root=createRoot(host)
})
afterEach(() => {act(()=>{root.unmount();clearRest()});host.remove();vi.restoreAllMocks()})
it('opens progress and all More destinations from the new navigation', () => {
  act(()=>root.render(<App />))
  click(button('Tiến bộ'))
  expect(host.querySelector('.h1')?.textContent).toBe('Tiến bộ')
  expect(host.textContent).toContain('Cân nặng (kg)')
  click(button('Thêm'))
  click(host.querySelector('.list-item:last-child'))
  expect(host.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Cài đặt')
  expect(host.textContent).toContain('Nạp lại từ file backup')
})
it('opens a completed workout as review without unlocking it', () => {
  const ex=allExercises().find((e)=>e.mode==='gym')!
  setLiftEntry(today,ex.id,[{kg:40,reps:12}]);setLiftDone(today,'gym',true)
  act(()=>root.render(<App />))
  click(button('Mở buổi tập'))
  expect(document.body.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Tổng kết buổi tập')
  expect(store.get().days[today].liftDone).toContain('gym')
})
it('keeps unticked rows when switching inline exercises and starts rest after a tick', () => {
  const [first,second]=allExercises().filter((e)=>e.mode==='gym' && e.gear!=='body')
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1)
  setLiftEntry(dateKey(yesterday),first.id,[{kg:40,reps:12}])
  addToPlan(today,[{exerciseId:first.id,sets:[{kg:42.5,reps:10}]},{exerciseId:second.id,sets:[{kg:20,reps:12}]}])
  act(()=>root.render(<App />));click(button('Mở buổi tập'))
  click(host.querySelector(`button[aria-controls="exercise-editor-${first.id}"]`))
  expect(host.querySelector('.set-previous')?.textContent).toContain('40')
  // Adding a row makes a draft without committing it as a completed set.
  click(button('+ Thêm set'))
  expect(getDraft(today,first.id)?.rows).toHaveLength(2)
  click(host.querySelector(`button[aria-controls="exercise-editor-${second.id}"]`))
  click(host.querySelector(`button[aria-controls="exercise-editor-${first.id}"]`))
  expect(host.querySelectorAll('.set-block')).toHaveLength(2)
  click(button('Xong set 1'))
  expect(store.get().days[today].lifts?.find((e)=>e.exerciseId===first.id)?.sets).toHaveLength(1)
  expect(restStore.get()?.exerciseId).toBe(first.id)
  expect(host.querySelector('.rest-bar')).not.toBeNull()
})
it('keeps newly picked exercises in the session before entering any sets', () => {
  const [first, second] = allExercises().filter((e) => e.mode === 'gym')
  act(() => root.render(<App />))
  click(button('Mở buổi tập'))
  for (const ex of [first, second]) {
    click(button('+ Thêm bài'))
    click([...host.querySelectorAll('.list-item')].find((item) => item.querySelector('.lift-name')?.textContent === ex.name) ?? null)
  }
  expect(store.get().days[today].plan?.map((item) => item.exerciseId)).toEqual([first.id, second.id])
  expect(host.querySelector(`button[aria-controls="exercise-editor-${first.id}"]`)).not.toBeNull()
  expect(host.querySelector(`button[aria-controls="exercise-editor-${second.id}"]`)).not.toBeNull()
  expect(store.get().days[today].lifts ?? []).toHaveLength(0)
})
