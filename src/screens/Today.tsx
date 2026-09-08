import { useMemo, useState } from 'react'
import { EntrySheet } from '../components/EntrySheet'
import { ExpenseGauge } from '../components/ExpenseGauge'
import { LogSheet } from '../components/LogSheet'
import { NoticeSheet } from '../components/NoticeSheet'
import { MacroRings } from '../components/Ring'
import { RunSheet } from '../components/RunSheet'
import { ScanSheet } from '../components/ScanSheet'
import { Sheet } from '../components/Sheet'
import { WeekChart } from '../components/WeekChart'
import { DayTypeBar } from '../components/DayTypeBar'
import { IconCamera, IconTurbo } from '../components/icons'
import {
  MEAL_LABELS,
  MEAL_ORDER,
  amountLabel,
  dayLabel,
  guessMeal,
  n,
  shiftDate,
  shortDate,
  vnd,
  weekday,
} from '../lib/format'
import { dayView } from '../lib/day'
import { useData } from '../lib/hooks'
import {
  LIFT_GROUP_LABELS,
  entryVolume,
  shortSet,
  summarize,
  volumeShort,
} from '../lib/lift'
import { dateKey, evaluate, macrosFor, sumEntries } from '../lib/macros'
import { formatDuration, formatPace, paceSecPerKm } from '../lib/run'
import { buildNotice, type NoticeKey } from '../lib/status'
import { allFoods, exerciseMap, foodMap, saveTemplate, setTurbo } from '../lib/storage'
import type { Entry, Exercise, LiftEntry, MealSlot } from '../lib/types'
import { weekSummary } from '../lib/week'

export function Today({ date, setDate }: { date: string; setDate: (d: string) => void }) {
  const data = useData()
  const foods = useMemo(() => allFoods(data), [data])
  const map = useMemo(() => foodMap(data), [data])

  const [logging, setLogging] = useState<{
    meal: MealSlot
    preset?: { foodId: string; amount: number }
  } | null>(null)
  const [editing, setEditing] = useState<Entry | null>(null)
  const [templateFor, setTemplateFor] = useState<MealSlot | null>(null)
  const [scanning, setScanning] = useState(false)
  const [running, setRunning] = useState(false)
  const [noticeKey, setNoticeKey] = useState<NoticeKey | null>(null)

  const { day, runDay, liftDay, targets, totals, cost } = dayView(data, date)
  const exById = useMemo(() => exerciseMap(data), [data])
  const lifts = day.lifts ?? []
  // Turbo = ngày chạy có kèm buổi thể trọng. Buổi tạ ở phòng gym là nhãn riêng,
  // nên "tạ" và "calisthenic" là hai thẻ tách hẳn nhau.
  const turbo = runDay && Boolean(day.turbo)
  const gymLifts = lifts.filter((e) => exById.get(e.exerciseId)?.mode === 'gym')
  const calLifts = lifts.filter((e) => exById.get(e.exerciseId)?.mode === 'calisthenic')
  const warnings = evaluate(totals, targets)
  const week = weekSummary(data, date)
  const recentIds = Object.entries(data.recent)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id]) => id)

  const alerts = new Set<NoticeKey>(warnings.map((w) => w.key))
  const activeWarning = warnings.find((w) => w.key === noticeKey)
  const notice = activeWarning
    ? buildNotice(activeWarning, totals, targets, foods, recentIds)
    : null

  const hasCheat = day.entries.some((e) => e.cheat)
  const costByMeal = MEAL_ORDER.reduce(
    (acc, meal) => {
      acc[meal] = day.entries
        .filter((e) => e.meal === meal)
        .reduce((sum, e) => sum + (e.cost ?? 0), 0)
      return acc
    },
    {} as Record<MealSlot, number>,
  )

  return (
    <div className="screen">
      <header className="col" style={{ gap: 12 }}>
        <div className="between">
          <h1 className="display">
            {dayLabel(date)}
            <br />
            <span className="soft">
              {weekday(date)} {shortDate(date)}
            </span>
          </h1>
          <div className="row" style={{ gap: 6 }}>
            <button
              className="btn sm"
              onClick={() => setDate(shiftDate(date, -1))}
              aria-label="Ngày trước"
            >
              ‹
            </button>
            <button
              className="btn sm"
              onClick={() => setDate(shiftDate(date, 1))}
              disabled={date >= dateKey()}
              aria-label="Ngày sau"
            >
              ›
            </button>
          </div>
        </div>

        <DayTypeBar date={date} />
        {hasCheat && (
          <div className="chips">
            <span className="badge moderate">Cheat meal</span>
          </div>
        )}
      </header>

      <div className={`card ink${turbo ? ' card-turbo' : ''}`}>
        <MacroRings
          macros={totals}
          targets={targets}
          runDay={runDay}
          alerts={alerts}
          onOpenNotice={setNoticeKey}
        />
        {alerts.size > 0 && (
          <p className="dim" style={{ margin: '12px 0 0', textAlign: 'center' }}>
            Vòng đỏ / cam = chưa đạt, bấm vào vòng để xem cách bù.
          </p>
        )}
      </div>

      {/* Ba loại buổi tập luôn hiện đủ. Loại không được chọn cho ngày này thì mờ
          đi và khoá lại — thấy ngay "hôm nay không có buổi này" thay vì thẻ biến
          mất, dễ tưởng là chưa nhập. */}
      <SessionCard active={runDay} turbo={turbo}>
        <div className="between" style={{ marginBottom: 10 }}>
          <div className="row" style={{ gap: 8 }}>
            <h2 className="h2">Buổi chạy</h2>
            {/* T3 và CN đã là ngày chạy theo lịch, nên popup lúc bật nhãn không
                bao giờ hiện ra ở hai ngày đó — đây là chỗ bật/tắt Turbo còn lại. */}
            <button
              className={`badge turbo${day.turbo ? '' : ' off'}`}
              aria-pressed={Boolean(day.turbo)}
              disabled={!runDay}
              onClick={() => setTurbo(date, !day.turbo)}
            >
              <IconTurbo className="ico" />
              {day.turbo ? 'Turbo' : '+ Turbo'}
            </button>
          </div>
          {runDay ? (
            <button className="btn sm" onClick={() => setRunning(true)}>
              {day.run ? 'Sửa' : 'Nhập số liệu'}
            </button>
          ) : (
            <span className="dim">không chọn</span>
          )}
        </div>
        {day.run ? (
          <div className="grid4" style={{ textAlign: 'center' }}>
            <Stat label="km" value={n(day.run.distanceKm, 2)} />
            <Stat label="pace" value={formatPace(paceSecPerKm(day.run))} />
            <Stat
              label="thời gian"
              value={day.run.durationSec > 0 ? formatDuration(day.run.durationSec) : '—'}
            />
            <Stat label="đốt" value={n(day.run.burnKcal ?? 0)} />
          </div>
        ) : (
          <p className="empty" style={{ padding: '10px 0 2px' }}>
            {runDay
              ? `Chưa có số liệu — target đang dùng mức mặc định ${n(data.settings.runDayExtraKcal)} kcal.`
              : 'Ngày này không chọn buổi chạy.'}
          </p>
        )}
      </SessionCard>

      <SessionCard active={liftDay}>
        <div className="between" style={{ marginBottom: 10 }}>
          <h2 className="h2">
            Buổi tạ{day.liftGroup ? ` · ${LIFT_GROUP_LABELS[day.liftGroup]}` : ''}
          </h2>
          <span className="dim">{liftDay ? 'sửa ở tab Bài tập' : 'không chọn'}</span>
        </div>
        <LiftSummary
          entries={gymLifts}
          exById={exById}
          bodyKg={data.settings.weightKg}
          empty={liftDay ? 'Chưa log bài nào — nhập ở tab Bài tập.' : 'Ngày này không chọn buổi tạ.'}
        />
      </SessionCard>

      <SessionCard active={turbo} turbo={turbo}>
        <div className="between" style={{ marginBottom: 10 }}>
          <h2 className="h2">Buổi calisthenic</h2>
          <span className="dim">{turbo ? 'sửa ở tab Bài tập' : 'không chọn'}</span>
        </div>
        <LiftSummary
          entries={calLifts}
          exById={exById}
          bodyKg={data.settings.weightKg}
          empty={
            turbo
              ? 'Chưa log bài nào — nhập ở tab Bài tập.'
              : 'Ngày này không chọn buổi calisthenic.'
          }
        />
      </SessionCard>

      <section className="card">
        <div className="between" style={{ marginBottom: 12 }}>
          <h2 className="h2">Tuần này</h2>
          <span className="dim num">
            {n(week.consumed)} / {n(week.budget)} kcal
          </span>
        </div>
        <WeekChart stats={week.stats} onSelect={setDate} />
        <div className="row" style={{ marginTop: 14, gap: 6, flexWrap: 'wrap' }}>
          <span className={`badge ${week.banked >= 0 ? 'good' : 'limit'}`}>
            {week.banked >= 0
              ? `Để dành ${n(week.banked)} kcal`
              : `Đang vượt ${n(-week.banked)} kcal`}
          </span>
          <span className={`badge ${week.cheatAvailable ? 'good' : 'est'}`}>
            {week.cheatAvailable
              ? 'Cheat meal còn'
              : `Cheat đã dùng ${shortDate(week.cheatUsedOn!)}`}
          </span>
          <span className="badge est">{week.daysLogged}/7 ngày có log</span>
        </div>
      </section>

      <section className="card">
        <div className="between" style={{ marginBottom: 4 }}>
          <h2 className="h2">Chi tiêu ăn uống</h2>
          <span className="dim num">Tuần: {vnd(week.cost)}</span>
        </div>
        {cost > 0 ? (
          <ExpenseGauge byMeal={costByMeal} total={cost} />
        ) : (
          <p className="empty" style={{ padding: '14px 0 4px' }}>
            Chưa nhập tiền cho ngày này. Giá tiền nhập lúc log món, hoặc bấm vào món đã log
            để thêm sau.
          </p>
        )}
      </section>

      {day.entries.length === 0 && (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Chưa log gì cho ngày này. Bấm <b>+ Thêm món</b> để bắt đầu.
          </p>
        </div>
      )}

      {MEAL_ORDER.map((meal) => {
        const entries = day.entries.filter((e) => e.meal === meal)
        const sub = sumEntries(entries, (id) => map.get(id))
        const mealCost = costByMeal[meal]
        return (
          <section key={meal} className="card">
            <div className="meal-head">
              <h2 className="h2">{MEAL_LABELS[meal]}</h2>
              <span className="dim num">
                {entries.length > 0
                  ? `${n(sub.kcal)} kcal${mealCost > 0 ? ` · ${vnd(mealCost)}` : ''}`
                  : '—'}
              </span>
            </div>

            {entries.length === 0 ? (
              <p className="empty" style={{ padding: '10px 0' }}>
                Chưa log gì
              </p>
            ) : (
              <div className="list">
                {entries.map((e) => {
                  const food = map.get(e.foodId)
                  if (!food) return null
                  const m = macrosFor(food, e.amount, e.oilTsp ?? 0)
                  return (
                    <button key={e.id} className="entry" onClick={() => setEditing(e)}>
                      {food.image ? (
                        <img className="thumb" src={food.image} alt="" />
                      ) : (
                        <span className="thumb" aria-hidden="true" />
                      )}
                      <span className="grow">
                        <span className="row" style={{ gap: 6 }}>
                          <span className="truncate">{food.name}</span>
                          {e.cheat && <span className="badge moderate">cheat</span>}
                        </span>
                        <span className="dim num">
                          {amountLabel(e.amount, food.servingUnit)}
                          {e.oilTsp ? ` + ${n(e.oilTsp)} mcf dầu` : ''} · P {n(m.protein, 1)}{' '}
                          · F {n(m.fat, 1)} · C {n(m.carb, 1)}
                        </span>
                      </span>
                      <span className="entry-kcal">
                        {n(m.kcal)}
                        {e.cost ? (
                          <>
                            <br />
                            <span className="dim">{vnd(e.cost)}</span>
                          </>
                        ) : null}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn sm" onClick={() => setLogging({ meal })}>
                + Thêm món
              </button>
              {entries.length > 0 && (
                <button className="btn sm" onClick={() => setTemplateFor(meal)}>
                  Lưu thành mẫu
                </button>
              )}
            </div>
          </section>
        )
      })}

      <div className="fab-stack">
        <button
          className="fab secondary"
          onClick={() => setScanning(true)}
          aria-label="Quét nhãn dinh dưỡng"
        >
          <IconCamera />
        </button>
        <button className="fab" onClick={() => setLogging({ meal: guessMeal() })}>
          + Thêm món
        </button>
      </div>

      {logging && (
        <LogSheet
          date={date}
          defaultMeal={logging.meal}
          preset={logging.preset}
          onClose={() => setLogging(null)}
        />
      )}
      {scanning && <ScanSheet date={date} onClose={() => setScanning(false)} />}
      {running && <RunSheet date={date} onClose={() => setRunning(false)} />}
      {notice && (
        <NoticeSheet
          notice={notice}
          onClose={() => setNoticeKey(null)}
          onPick={(foodId, amount) => {
            setNoticeKey(null)
            setLogging({ meal: guessMeal(), preset: { foodId, amount } })
          }}
        />
      )}
      {editing &&
        map.get(editing.foodId) &&
        (() => {
          const food = map.get(editing.foodId)!
          return (
            <EntrySheet
              date={date}
              entry={editing}
              food={food}
              onClose={() => setEditing(null)}
            />
          )
        })()}
      {templateFor && (
        <SaveTemplateSheet
          meal={templateFor}
          entries={day.entries.filter((e) => e.meal === templateFor)}
          onClose={() => setTemplateFor(null)}
        />
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="num" style={{ fontSize: 18, fontWeight: 700 }}>
        {value}
      </div>
      <div className="dim">{label}</div>
    </div>
  )
}

/**
 * Thẻ một loại buổi tập. Ngày này không chọn loại đó thì thẻ vẫn hiện nguyên
 * chỗ nhưng mờ và khoá lại — ngày nghỉ là ba thẻ mờ hết, ngày turbo là thẻ tạ
 * mờ. Ruột thẻ vẫn vẽ như thường: buổi đã log mà nhãn ngày lỡ tắt thì vẫn đọc
 * được số, chỉ là không sửa được.
 */
function SessionCard({
  active,
  turbo,
  children,
}: {
  active: boolean
  turbo?: boolean
  children: React.ReactNode
}) {
  return (
    <section
      className={active ? `card${turbo ? ' card-turbo' : ''}` : 'card card-off'}
      aria-disabled={active ? undefined : 'true'}
    >
      {children}
    </section>
  )
}

/** Tổng kết + danh sách bài của một buổi tập, dùng chung cho thẻ tạ và calisthenic. */
function LiftSummary({
  entries,
  exById,
  bodyKg,
  empty,
}: {
  entries: LiftEntry[]
  exById: Map<string, Exercise>
  bodyKg: number
  empty: string
}) {
  if (entries.length === 0) {
    return (
      <p className="empty" style={{ padding: '10px 0 2px' }}>
        {empty}
      </p>
    )
  }

  const workout = summarize(entries, exById, bodyKg)
  return (
    <>
      <div className="grid4" style={{ textAlign: 'center' }}>
        <Stat label="bài" value={n(workout.exercises)} />
        <Stat label="set" value={n(workout.sets)} />
        <Stat label="rep" value={n(workout.reps)} />
        <Stat label="volume" value={volumeShort(workout.volume)} />
      </div>
      <div className="list" style={{ marginTop: 6 }}>
        {entries.map((entry) => {
          const ex = exById.get(entry.exerciseId)
          if (!ex) return null
          return (
            <div key={entry.id} className="list-item">
              <span className="grow truncate">{ex.name}</span>
              <span className="dim num">
                {entry.sets.map((s) => shortSet(s)).join(' · ')}
              </span>
              <span className="entry-kcal">
                {volumeShort(entryVolume(ex, entry, bodyKg))}
              </span>
            </div>
          )
        })}
      </div>
    </>
  )
}

function SaveTemplateSheet({
  meal,
  entries,
  onClose,
}: {
  meal: MealSlot
  entries: Entry[]
  onClose: () => void
}) {
  const data = useData()
  const map = useMemo(() => foodMap(data), [data])
  const [name, setName] = useState(
    `${MEAL_LABELS[meal]} — ${entries
      .map((e) => map.get(e.foodId)?.name)
      .filter(Boolean)
      .slice(0, 2)
      .join(' + ')}`,
  )

  return (
    <Sheet title="Lưu thành mẫu" onClose={onClose}>
      <div className="field">
        <label htmlFor="tpl-name">Tên mẫu</label>
        <input
          id="tpl-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>
      <div className="list">
        {entries.map((e) => {
          const food = map.get(e.foodId)
          return (
            <div key={e.id} className="list-item">
              <span className="grow truncate">{food?.name ?? '—'}</span>
              <span className="dim num">
                {food ? amountLabel(e.amount, food.servingUnit) : ''}
              </span>
            </div>
          )
        })}
      </div>
      <button
        className="btn primary full"
        disabled={!name.trim()}
        onClick={() => {
          saveTemplate({
            name: name.trim(),
            meal,
            items: entries.map((e) => ({
              foodId: e.foodId,
              amount: e.amount,
              oilTsp: e.oilTsp,
            })),
          })
          onClose()
        }}
      >
        Lưu mẫu
      </button>
    </Sheet>
  )
}
