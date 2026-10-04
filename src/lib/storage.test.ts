// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addEntry, applyTemplate, blankData, deleteExercise, deleteFood, exerciseMap, exportJSON, importJSON, replaceAll, resetAll, saveExercise, saveFood, saveTemplate, setDayField, setLiftEntry, setSettings, store } from './storage'
import { dayView } from './day'
import { exerciseHistory, entryVolume } from './lift'
import { walletSummary } from './wallet'
import { decodeAppData } from './dataCodec'
import { persistenceStore, retryPersistence } from './persistence'

const date = '2026-09-01'
const food = { name: 'Món thử', category: 'khac' as const, servingSize: 100, servingUnit: 'g', kcal: 100, protein: 10, fat: 2, carb: 10 }
const ex = { name: 'Pullup thử', mode: 'calisthenic' as const, gear: 'body' as const, group: 'back' as const }
beforeEach(() => { vi.restoreAllMocks(); localStorage.clear(); resetAll(); retryPersistence() })

describe('historical snapshots', () => {
  it('keeps food totals, name and wallet ratios after edit and delete', () => {
    const id = saveFood(food)
    addEntry(date, { foodId: id, amount: 100, meal: 'trua', cost: 10000 })
    saveFood({ ...food, id, kcal: 200, protein: 20, name: 'Tên mới' })
    deleteFood(id)
    expect(dayView(store.get(), date).totals.kcal).toBe(100)
    expect(store.get().days[date].entries[0].food?.name).toBe('Món thử')
    expect(walletSummary(store.get(), date).topFoods[0].name).toBe('Món thử')
  })
  it('freezes legacy entries before a library edit', () => {
    const data = blankData()
    data.customFoods = [{ ...food, id: 'old' }]
    data.days[date] = { date, entries: [{id:'e1',foodId:'old',amount:100,meal:'trua',ts:1}] }
    replaceAll(data)
    saveFood({ ...food, id:'old', kcal:500 })
    expect(dayView(store.get(), date).totals.kcal).toBe(100)
  })
  it('snapshots entries created by meal templates', () => {
    const id = saveFood(food)
    const t = saveTemplate({name:'Bữa thử',items:[{foodId:id,amount:100}]})
    applyTemplate(date,t,'trua')
    saveFood({...food,id,kcal:500})
    expect(dayView(store.get(),date).totals.kcal).toBe(100)
  })
  it('keeps bodyweight and exercise rules across edits, weighing and archive', () => {
    setDayField(date, { weightKg:60 })
    const id = saveExercise(ex)
    setLiftEntry(date,id,[{kg:0,reps:10}])
    setSettings({weightKg:70})
    saveExercise({...ex,id,gear:'db',perSide:true})
    deleteExercise(id)
    const e = store.get().days[date].lifts![0]
    expect(entryVolume(exerciseMap().get(id)!,e,70)).toBe(600)
    expect(exerciseHistory(store.get(),{...ex,id},undefined,70)[0].volume).toBe(600)
    expect(exerciseMap().has(id)).toBe(true)
  })
  it('uses the most recent weight at or before a legacy workout', () => {
    const d = blankData()
    d.days['2026-08-30'] = { date:'2026-08-30',entries:[],weightKg:60 }
    d.days[date] = { date,entries:[],lifts:[{id:'l1',exerciseId:'x',ts:1,sets:[{kg:0,reps:10}]}] }
    d.days['2026-09-02'] = { date:'2026-09-02',entries:[],weightKg:70 }
    expect(exerciseHistory(d,{...ex,id:'x'},undefined,70)[0].volume).toBe(600)
  })
})

describe('backup validation and migration', () => {
  it.each([
    {days:{[date]:{}}}, {days:[]}, {days:{'2026-02-30':{date:'2026-02-30',entries:[]}}},
    {days:{},customFoods:[{...food,id:'x',servingSize:0}]}, {days:{},settings:{weightKg:-1}},
    {days:{},version:999}, {days:{},restSec:{x:'ninety'}},
  ])('rejects malformed backup without replacing current state', (invalid) => {
    setSettings({weightKg:65})
    const before = exportJSON()
    expect(importJSON(JSON.stringify(invalid)).ok).toBe(false)
    expect(exportJSON()).toBe(before)
  })
  it('fills older missing settings and snapshots existing history', () => {
    const legacy = {version:1,days:{[date]:{date,entries:[{id:'e1',foodId:'x',amount:100,meal:'trua',ts:1}]}},customFoods:[{...food,id:'x'}],settings:{weightKg:60}}
    expect(importJSON(JSON.stringify(legacy)).ok).toBe(true)
    expect(store.get().settings.runDayWeekdays).toEqual([2,0])
    expect(store.get().days[date].entries[0].food?.kcal).toBe(100)
    expect(() => dayView(store.get(),date)).not.toThrow()
  })
  it('exports a round-trip backup', () => {
    const id=saveFood(food)
    addEntry(date,{foodId:id,amount:100,meal:'trua'})
    expect(decodeAppData(JSON.parse(exportJSON()))).toEqual(store.get())
  })
})

describe('persistence failures', () => {
  it('shows failure and retries the latest change', () => {
    const spy = vi.spyOn(Storage.prototype,'setItem').mockImplementation(() => {throw new Error('quota')})
    setSettings({weightKg:70}); setSettings({weightKg:71})
    expect(Object.keys(persistenceStore.get())).not.toHaveLength(0)
    spy.mockRestore(); retryPersistence()
    expect(JSON.parse(localStorage.getItem('nutrition-tracker-v1')!).settings.weightKg).toBe(71)
    expect(Object.keys(persistenceStore.get())).toHaveLength(0)
  })
  it('does not replace live data or queue an import when durable write fails', () => {
    const before = exportJSON()
    const d=blankData(); d.settings.weightKg=99
    const spy=vi.spyOn(Storage.prototype,'setItem').mockImplementation(() => {throw new Error('quota')})
    expect(importJSON(JSON.stringify(d)).ok).toBe(false)
    expect(exportJSON()).toBe(before)
    spy.mockRestore(); retryPersistence()
    expect(store.get().settings.weightKg).toBe(60)
  })
})
