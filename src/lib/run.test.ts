// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  formatDuration,
  formatPace,
  paceSecPerKm,
  parseDuration,
  parseTrackFile,
  runBurnKcal,
} from './run'
import { DEFAULT_SETTINGS, computeTargets } from './macros'
import { statusLevel } from './status'

describe('runBurnKcal', () => {
  it('scales with distance and bodyweight', () => {
    expect(runBurnKcal(10, 60)).toBe(618)
    expect(runBurnKcal(5, 60)).toBe(309)
  })
})

describe('pace and duration', () => {
  it('formats pace as m:ss per km', () => {
    expect(formatPace(355)).toBe('5:55')
    expect(formatPace(420)).toBe('7:00')
  })

  it('returns a dash rather than NaN for a zero-distance run', () => {
    expect(formatPace(paceSecPerKm({ distanceKm: 0, durationSec: 600 }))).toBe('—')
  })

  it('formats durations with and without hours', () => {
    expect(formatDuration(3616)).toBe('1:00:16')
    expect(formatDuration(2910)).toBe('48:30')
  })

  it('parses mm:ss, h:mm:ss, and bare minutes', () => {
    expect(parseDuration('48:30')).toBe(2910)
    expect(parseDuration('1:00:16')).toBe(3616)
    expect(parseDuration('45')).toBe(2700)
  })

  it('returns 0 for junk input rather than NaN', () => {
    expect(parseDuration('abc')).toBe(0)
  })
})

// ~1.11 km bắc-nam, leo 12m, 10 phút
const GPX = `<?xml version="1.0"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
 <trk><name>Morning Run</name><trkseg>
  <trkpt lat="10.7600" lon="106.6600"><ele>10</ele><time>2026-09-05T12:00:00Z</time></trkpt>
  <trkpt lat="10.7650" lon="106.6600"><ele>16</ele><time>2026-09-05T12:05:00Z</time></trkpt>
  <trkpt lat="10.7700" lon="106.6600"><ele>22</ele><time>2026-09-05T12:10:00Z</time></trkpt>
 </trkseg></trk>
</gpx>`

const TCX = `<?xml version="1.0"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
 <Activities><Activity Sport="Running"><Lap><Track>
  <Trackpoint><Time>2026-09-05T12:00:00Z</Time>
   <Position><LatitudeDegrees>10.76</LatitudeDegrees><LongitudeDegrees>106.66</LongitudeDegrees></Position>
   <AltitudeMeters>10</AltitudeMeters><DistanceMeters>0</DistanceMeters></Trackpoint>
  <Trackpoint><Time>2026-09-05T12:30:00Z</Time>
   <Position><LatitudeDegrees>10.77</LatitudeDegrees><LongitudeDegrees>106.66</LongitudeDegrees></Position>
   <AltitudeMeters>18</AltitudeMeters><DistanceMeters>5230</DistanceMeters></Trackpoint>
 </Track></Lap></Activity></Activities>
</TrainingCenterDatabase>`

describe('parseTrackFile', () => {
  it('reads distance, duration and elevation from GPX', () => {
    const r = parseTrackFile(GPX)
    expect(r.points).toBe(3)
    expect(r.distanceKm).toBeCloseTo(1.11, 1)
    expect(r.durationSec).toBe(600)
    expect(r.elevationM).toBe(12)
  })

  it('prefers the TCX DistanceMeters field over summed coordinates', () => {
    const r = parseTrackFile(TCX)
    expect(r.distanceKm).toBeCloseTo(5.23, 2)
    expect(r.durationSec).toBe(1800)
  })

  it('rejects a file with no coordinates', () => {
    expect(() => parseTrackFile('<gpx></gpx>')).toThrow(/toạ độ/)
  })

  it('rejects a file that is not XML at all', () => {
    expect(() => parseTrackFile('just some text')).toThrow()
  })
})

describe('computeTargets with a real run', () => {
  // Ngày tập tạ không chạy — mốc so sánh cho phần calo mà buổi chạy cộng thêm.
  const base = computeTargets(DEFAULT_SETTINGS, { runDay: false, liftDay: true })

  it('uses the actual burn instead of the default extra', () => {
    const t = computeTargets(DEFAULT_SETTINGS, {
      runDay: true,
      liftDay: true,
      runBurnKcal: 618,
    })
    expect(t.kcalMax).toBe(base.kcalMax + 618)
    // Carb làm tròn trên TỔNG phần cộng thêm, không cộng từng khoản rồi làm
    // tròn riêng, nên so với mốc có thể lệch 1g.
    expect(Math.abs(t.carb - base.carb - 618 / 4)).toBeLessThanOrEqual(1)
    expect(t.protein).toBe(140)
  })

  it('clamps an implausible burn so one typo cannot double the target', () => {
    const t = computeTargets(DEFAULT_SETTINGS, {
      runDay: true,
      liftDay: true,
      runBurnKcal: 99999,
    })
    expect(t.kcalMax).toBe(base.kcalMax + 900)
  })

  it('ignores the burn entirely on a non-run day', () => {
    const t = computeTargets(DEFAULT_SETTINGS, {
      runDay: false,
      liftDay: true,
      runBurnKcal: 618,
    })
    expect(t.kcalMax).toBe(base.kcalMax)
  })
})

describe('statusLevel', () => {
  it('runs red → orange → yellow → green as a target fills up', () => {
    expect(statusLevel(20, 140)).toBe(1)
    expect(statusLevel(70, 140)).toBe(2)
    expect(statusLevel(110, 140)).toBe(3)
    expect(statusLevel(140, 140)).toBe(4)
  })

  it('turns a ceiling red once it is breached, yellow only when very close', () => {
    expect(statusLevel(31, 30, { ceiling: true })).toBe(1)
    expect(statusLevel(29, 30, { ceiling: true })).toBe(3)
    expect(statusLevel(24, 30, { ceiling: true })).toBe(4)
    expect(statusLevel(5, 30, { ceiling: true })).toBe(4)
  })

  it('grades fat against its floor as well as its ceiling', () => {
    expect(statusLevel(70, 65, { ceiling: true, floor: 50 })).toBe(1) // vượt trần
    expect(statusLevel(10, 65, { ceiling: true, floor: 50 })).toBe(1) // hụt sâu
    expect(statusLevel(30, 65, { ceiling: true, floor: 50 })).toBe(2)
    expect(statusLevel(45, 65, { ceiling: true, floor: 50 })).toBe(3)
    expect(statusLevel(58, 65, { ceiling: true, floor: 50 })).toBe(4)
  })
})
