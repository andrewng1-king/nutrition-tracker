import { afterEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_REST_SEC,
  MAX_REST_SEC,
  MIN_REST_SEC,
  adjustRest,
  clearRest,
  formatRest,
  markRestAlerted,
  restSecFor,
  restStore,
  startRest,
} from './rest'
import type { AppData } from './types'

afterEach(() => clearRest())

describe('rest timer', () => {
  it('ends total seconds after start', () => {
    startRest('row', 90, 1_000)
    expect(restStore.get()).toEqual({ exerciseId: 'row', endAt: 91_000, total: 90 })
  })

  it('+15 pushes the end and the remembered total', () => {
    startRest('row', 90, 0)
    expect(adjustRest(15, 10_000)).toBe(105)
    expect(restStore.get()?.endAt).toBe(105_000)
  })

  it('−15 past the remaining time ends now, never in the past', () => {
    startRest('row', 30, 0)
    adjustRest(-15, 25_000)
    expect(restStore.get()?.endAt).toBe(25_000)
    expect(restStore.get()?.total).toBe(MIN_REST_SEC)
  })

  it('clamps the total', () => {
    startRest('row', 5000, 0)
    expect(restStore.get()?.total).toBe(MAX_REST_SEC)
  })

  it('re-arms the alert when time is added back after it went off', () => {
    startRest('row', 60, 0)
    markRestAlerted()
    adjustRest(15, 70_000)
    expect(restStore.get()?.alerted).toBe(false)
  })

  it('does nothing without a running timer', () => {
    expect(adjustRest(15)).toBeNull()
  })
})

describe('restSecFor', () => {
  it('falls back to the default', () => {
    expect(restSecFor({ restSec: {} } as unknown as AppData, 'row')).toBe(DEFAULT_REST_SEC)
    expect(restSecFor({} as AppData, 'row')).toBe(DEFAULT_REST_SEC)
  })

  it('uses the remembered value per exercise', () => {
    expect(restSecFor({ restSec: { row: 120 } } as unknown as AppData, 'row')).toBe(120)
  })
})

describe('formatRest', () => {
  it('rounds up to whole seconds', () => {
    expect(formatRest(65_000)).toBe('1:05')
    expect(formatRest(64_100)).toBe('1:05')
    expect(formatRest(0)).toBe('0:00')
    expect(formatRest(-500)).toBe('0:00')
  })
})
