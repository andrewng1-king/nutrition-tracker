import { useMemo, useState } from 'react'
import { MacroRings } from '../components/Ring'
import { dayLabel, lastNDays, n } from '../lib/format'
import { useData } from '../lib/hooks'
import {
  averageMacros,
  computeTargets,
  dateKey,
  dayTypesFor,
  evaluate,
  sumEntries,
} from '../lib/macros'
import { foodMap, getDay } from '../lib/storage'
import type { AppData, DayType, Macros } from '../lib/types'

interface DayStat {
  date: string
  macros: Macros
  warnings: number
  types: DayType[]
  cheat: boolean
  logged: boolean
}

function buildStats(dates: string[], data: AppData): DayStat[] {
  const map = foodMap(data)
  return dates.map((date) => {
    const day = getDay(date, data)
    const types = dayTypesFor(date, data.settings, day)
    const adjust = {
      runDay: types.includes('run'),
      liftDay: types.includes('lift'),
      runBurnKcal: day.run?.burnKcal,
    }
    const macros = sumEntries(day.entries, (id) => map.get(id))
    return {
      date,
      macros,
      warnings: evaluate(macros, computeTargets(data.settings, adjust)).length,
      types,
      cheat: day.entries.some((e) => e.cheat),
      logged: day.entries.length > 0,
    }
  })
}

/**
 * Streak = số ngày liên tiếp gần nhất đạt hết ngưỡng.
 * Ngày có cheat meal bị bỏ qua — không cộng, không làm đứt streak (spec mục 4).
 * HÔM NAY chưa xong nên không bao giờ làm đứt streak: đạt rồi thì cộng, chưa đạt
 * thì bỏ qua. Buổi trưa mới ăn hai bữa mà báo streak = 0 là sai và gây nản.
 */
function computeStreak(data: AppData): number {
  const map = foodMap(data)
  const today = dateKey()
  let streak = 0
  const cursor = new Date()

  for (let i = 0; i < 400; i++) {
    const key = dateKey(cursor)
    const day = getDay(key, data)
    const step = () => cursor.setDate(cursor.getDate() - 1)

    if (day.entries.length === 0) {
      if (key === today) {
        step()
        continue
      }
      break
    }
    if (day.entries.some((e) => e.cheat)) {
      step()
      continue
    }

    const types = dayTypesFor(key, data.settings, day)
    const macros = sumEntries(day.entries, (id) => map.get(id))
    const clean =
      evaluate(
        macros,
        computeTargets(data.settings, {
          runDay: types.includes('run'),
          liftDay: types.includes('lift'),
          runBurnKcal: day.run?.burnKcal,
        }),
      ).length === 0

    if (clean) streak++
    else if (key !== today) break

    step()
  }
  return streak
}

export function History({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const data = useData()
  const [range, setRange] = useState<7 | 30>(7)

  const stats = useMemo(() => buildStats(lastNDays(range), data), [range, data])
  const avg = useMemo(() => averageMacros(stats.map((s) => s.macros)), [stats])
  const streak = useMemo(() => computeStreak(data), [data])

  const loggedCount = stats.filter((s) => s.logged).length
  const cleanCount = stats.filter((s) => s.logged && s.warnings === 0).length
  // Trung bình so với target ngày tập tạ — ngày chạy và ngày nghỉ lệch khỏi mốc này.
  const targets = computeTargets(data.settings, { runDay: false, liftDay: true })

  return (
    <div className="screen">
      <h1 className="h1">Lịch sử</h1>

      <div className="seg">
        <button aria-pressed={range === 7} onClick={() => setRange(7)}>
          7 ngày
        </button>
        <button aria-pressed={range === 30} onClick={() => setRange(30)}>
          30 ngày
        </button>
      </div>

      <div className="card">
        <div className="grid4" style={{ textAlign: 'center', marginBottom: 14 }}>
          <Metric label="ngày có log" value={`${loggedCount}/${range}`} />
          <Metric label="ngày đạt hết" value={String(cleanCount)} color="var(--ok)" />
          <Metric label="streak" value={String(streak)} color="var(--kcal)" />
          <Metric label="kcal TB" value={n(avg.kcal)} />
        </div>
        <h2 className="h2" style={{ marginBottom: 12 }}>
          Trung bình / ngày có log
        </h2>
        <MacroRings macros={avg} targets={targets} heading="Target ngày tập tạ" />
      </div>

      <section className="card">
        <h2 className="h2" style={{ marginBottom: 6 }}>
          Từng ngày
        </h2>
        <div className="list">
          {[...stats].reverse().map((s) => (
            <button key={s.date} className="entry" onClick={() => onOpenDay(s.date)}>
              <span className="grow">
                <span className="row" style={{ gap: 6 }}>
                  <span>{dayLabel(s.date)}</span>
                  {s.types.includes('run') && <span className="badge run">chạy</span>}
                  {s.types.includes('lift') && <span className="badge good">tạ</span>}
                  {s.types.includes('rest') && <span className="badge est">nghỉ</span>}
                  {s.cheat && <span className="badge moderate">cheat</span>}
                  {s.logged && s.warnings === 0 && <span className="badge good">đạt</span>}
                </span>
                {s.logged ? (
                  <span className="dim num">
                    P {n(s.macros.protein)} · F {n(s.macros.fat)} · C {n(s.macros.carb)}
                    {s.warnings > 0 ? ` · ${s.warnings} cảnh báo` : ''}
                  </span>
                ) : (
                  <span className="dim">chưa log</span>
                )}
              </span>
              <span className="entry-kcal">{s.logged ? `${n(s.macros.kcal)}` : '—'}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function Metric({
  label,
  value,
  color = 'var(--text)',
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div>
      <div className="num" style={{ color, fontSize: 20, fontWeight: 700 }}>
        {value}
      </div>
      <div className="dim">{label}</div>
    </div>
  )
}
