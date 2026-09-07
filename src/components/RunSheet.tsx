import { useRef, useState } from 'react'
import { n } from '../lib/format'
import { useData } from '../lib/hooks'
import {
  formatDuration,
  formatPace,
  paceSecPerKm,
  parseDuration,
  parseTrackFile,
  runBurnKcal,
} from '../lib/run'
import { getDay, setDayField } from '../lib/storage'
import type { RunLog } from '../lib/types'
import { Sheet } from './Sheet'

export function RunSheet({ date, onClose }: { date: string; onClose: () => void }) {
  const data = useData()
  const existing = getDay(date, data).run
  const fileRef = useRef<HTMLInputElement>(null)

  const [distance, setDistance] = useState(existing?.distanceKm ?? 0)
  const [duration, setDuration] = useState(
    existing ? formatDuration(existing.durationSec) : '',
  )
  const [elevation, setElevation] = useState(existing?.elevationM ?? 0)
  const [source, setSource] = useState<RunLog['source']>(existing?.source ?? 'manual')
  const [fileName, setFileName] = useState(existing?.fileName)
  const [error, setError] = useState<string | null>(null)

  const durationSec = parseDuration(duration)
  const burn = runBurnKcal(distance, data.settings.weightKg)
  const pace = paceSecPerKm({ distanceKm: distance, durationSec })
  const valid = distance > 0

  async function importFile(file: File) {
    setError(null)
    try {
      const parsed = parseTrackFile(await file.text())
      setDistance(parsed.distanceKm)
      if (parsed.durationSec > 0) setDuration(formatDuration(parsed.durationSec))
      setElevation(parsed.elevationM)
      setSource('file')
      setFileName(file.name)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  function save() {
    const run: RunLog = {
      distanceKm: distance,
      durationSec,
      elevationM: elevation || undefined,
      burnKcal: burn,
      source,
      fileName,
    }
    setDayField(date, { isRunDay: true, run })
    onClose()
  }

  function clearRun() {
    setDayField(date, { isRunDay: false, run: undefined })
    onClose()
  }

  return (
    <Sheet title="Buổi chạy" onClose={onClose}>
      <input
        ref={fileRef}
        type="file"
        accept=".gpx,.tcx,application/gpx+xml,application/xml,text/xml"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) importFile(file)
          e.target.value = ''
        }}
      />

      <button className="btn full" onClick={() => fileRef.current?.click()}>
        Nhập từ file Strava (.gpx / .tcx)
      </button>
      <p className="dim" style={{ margin: 0 }}>
        Mở activity trên Strava → menu ⋯ → <b>Export GPX</b>, rồi chọn file ở đây. File
        được đọc ngay trên máy, không gửi đi đâu và không cần đăng nhập Strava.
      </p>
      {fileName && (
        <p className="muted" style={{ margin: 0 }}>
          Đã nhập từ <b>{fileName}</b>.
        </p>
      )}
      {error && (
        <p className="muted" style={{ margin: 0, color: 'var(--warn)' }}>
          {error}
        </p>
      )}

      <div className="grid2">
        <div className="field">
          <label htmlFor="run-dist">Quãng đường (km)</label>
          <input
            id="run-dist"
            type="number"
            inputMode="decimal"
            step="0.1"
            value={distance}
            onChange={(e) => {
              setDistance(Math.max(0, Number(e.target.value)))
              setSource('manual')
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="run-time">Thời gian (mm:ss)</label>
          <input
            id="run-time"
            inputMode="numeric"
            placeholder="55:30"
            value={duration}
            onChange={(e) => {
              setDuration(e.target.value)
              setSource('manual')
            }}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="run-elev">Độ cao tích luỹ (m)</label>
        <input
          id="run-elev"
          type="number"
          inputMode="numeric"
          value={elevation}
          onChange={(e) => setElevation(Math.max(0, Number(e.target.value)))}
        />
      </div>

      <div className="card ink">
        <div className="grid3" style={{ textAlign: 'center' }}>
          <Stat label="pace" value={formatPace(pace)} unit="/km" />
          <Stat label="thời gian" value={durationSec > 0 ? formatDuration(durationSec) : '—'} />
          <Stat label="đốt" value={n(burn)} unit="kcal" />
        </div>
        <p className="muted" style={{ margin: '12px 0 0' }}>
          {valid
            ? `Target hôm nay sẽ cộng thêm ${n(Math.min(burn, 900))} kcal, dồn hết vào carb — không cộng protein.`
            : 'Nhập quãng đường để tính lượng calo cộng thêm cho hôm nay.'}
        </p>
      </div>

      <button className="btn primary full" disabled={!valid} onClick={save}>
        Lưu buổi chạy
      </button>

      {existing ? (
        <button className="btn danger full" onClick={clearRun}>
          Xoá buổi chạy, bỏ đánh dấu ngày chạy
        </button>
      ) : (
        <button
          className="btn full"
          onClick={() => {
            setDayField(date, { isRunDay: true })
            onClose()
          }}
        >
          Chỉ đánh dấu ngày chạy, chưa nhập số
        </button>
      )}
    </Sheet>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <div className="num" style={{ fontSize: 20, fontWeight: 700 }}>
        {value}
        {unit && (
          <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.65 }}> {unit}</span>
        )}
      </div>
      <div className="dim">{label}</div>
    </div>
  )
}
