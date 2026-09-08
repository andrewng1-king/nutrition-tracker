import { Fragment, useMemo, useState } from 'react'
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
import { FoodIcon } from '../components/foodIcons'
import { IconCamera, IconChevron, IconTurbo } from '../components/icons'
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
import { computeAdjust, dateKey, evaluate, macrosFor, sumEntries } from '../lib/macros'
import { formatDuration, formatPace, paceSecPerKm } from '../lib/run'
import { buildNotice, type NoticeKey } from '../lib/status'
import { allFoods, exerciseMap, foodMap, saveTemplate, setTurbo } from '../lib/storage'
import type { Entry, Exercise, Food, LiftEntry, Macros, MealSlot } from '../lib/types'
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
  // Turbo = ngày chạy có kèm buổi thể trọng. Ngày Turbo không xếp thêm buổi tạ
  // phòng gym, nên "tạ" và "calisthenic" không bao giờ cùng bật.
  const turbo = runDay && Boolean(day.turbo)
  const gymLifts = lifts.filter((e) => exById.get(e.exerciseId)?.mode === 'gym')
  const calLifts = lifts.filter((e) => exById.get(e.exerciseId)?.mode === 'calisthenic')
  const warnings = evaluate(totals, targets)
  const week = weekSummary(data, date)
  const adjust = computeAdjust(data.settings, {
    runDay,
    liftDay,
    runBurnKcal: day.run?.burnKcal,
  })
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

  /* Ba loại buổi tập luôn hiện đủ, nhưng loại đã chọn cho ngày này được xếp lên
     trước: mở màn hình ra là thấy ngay buổi phải nhập, không phải lướt qua hai
     thẻ mờ. Loại không chọn vẫn nằm dưới ở dạng khoá, không biến mất. */
  const sessions: { key: string; active: boolean; node: React.ReactNode }[] = [
    {
      key: 'run',
      active: runDay,
      node: (
        <SessionCard active={runDay} turbo={turbo}>
          <div className="between" style={{ marginBottom: 10 }}>
            <h2 className="h2">Buổi chạy</h2>
            {runDay ? (
              <button className="btn sm" onClick={() => setRunning(true)}>
                {day.run ? 'Xem kết quả' : 'Nhập số liệu'}
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
      ),
    },
    {
      key: 'lift',
      active: liftDay,
      node: (
        <SessionCard active={liftDay}>
          <div className="between" style={{ marginBottom: 10 }}>
            <h2 className="h2">
              Buổi tạ{day.liftGroup ? ` · ${LIFT_GROUP_LABELS[day.liftGroup]}` : ''}
            </h2>
            <span className="dim">{liftDay ? 'sửa ở tab Bài tập' : 'không chọn'}</span>
          </div>
          <LiftSummary
            id="today-gym"
            entries={gymLifts}
            exById={exById}
            bodyKg={data.settings.weightKg}
            empty={
              liftDay ? 'Chưa log bài nào — nhập ở tab Bài tập.' : 'Ngày này không chọn buổi tạ.'
            }
          />
        </SessionCard>
      ),
    },
    {
      key: 'calisthenic',
      active: turbo,
      node: (
        <SessionCard active={turbo} turbo={turbo}>
          <div className="between" style={{ marginBottom: 10 }}>
            <h2 className="h2">Buổi calisthenic</h2>
            <span className="dim">{turbo ? 'sửa ở tab Bài tập' : 'không chọn'}</span>
          </div>
          <LiftSummary
            id="today-calisthenic"
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
      ),
    },
  ]
  const orderedSessions = [...sessions].sort((a, b) => Number(b.active) - Number(a.active))

  return (
    <div className="screen">
      <header className="col today-head" style={{ gap: 12 }}>
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
          alerts={alerts}
          onOpenNotice={setNoticeKey}
          badge={
            runDay ? (
              <button
                className={`badge turbo${day.turbo ? '' : ' off'}`}
                aria-pressed={Boolean(day.turbo)}
                onClick={() => setTurbo(date, !day.turbo)}
              >
                <IconTurbo className="ico" />
                {day.turbo ? `Turbo · +${n(adjust.run)} kcal` : `+ Turbo · +${n(adjust.run)} kcal`}
              </button>
            ) : null
          }
        />
        {alerts.size > 0 && (
          <p className="dim" style={{ margin: '12px 0 0', textAlign: 'center' }}>
            Vòng đỏ / cam = chưa đạt, bấm vào vòng để xem cách bù.
          </p>
        )}
      </div>

      {orderedSessions.map((s) => (
        <Fragment key={s.key}>{s.node}</Fragment>
      ))}

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

      {/* Chi tiêu và bốn bữa nằm cạnh nhau chứ không xếp chồng: trước đây năm thẻ
          full-width làm màn "Hôm nay" dài gấp đôi màn hình, phải cuộn mới thấy hết
          một ngày. Hai khối này cũng đọc chung một câu chuyện — bữa nào ăn gì và
          bữa đó tốn bao nhiêu. */}
      <div className="today-split">
        <section className="card">
          <div className="col" style={{ gap: 2, marginBottom: 4 }}>
            <h2 className="h2">Chi tiêu ăn uống</h2>
            <span className="dim num">Tuần: {vnd(week.cost)}</span>
          </div>
          {cost > 0 ? (
            <ExpenseGauge byMeal={costByMeal} total={cost} compact />
          ) : (
            <p className="empty" style={{ padding: '14px 0 4px' }}>
              Chưa nhập tiền cho ngày này. Giá tiền nhập lúc log món, hoặc bấm vào món
              đã log để thêm sau.
            </p>
          )}
        </section>

        <div className="today-meals">
          {MEAL_ORDER.map((meal) => (
            <MealCard
              key={meal}
              meal={meal}
              entries={day.entries.filter((e) => e.meal === meal)}
              map={map}
              dayTotals={totals}
              cost={costByMeal[meal]}
              onAdd={() => setLogging({ meal })}
              onSaveTemplate={() => setTemplateFor(meal)}
              onEdit={setEditing}
            />
          ))}
        </div>
      </div>

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

/** Phần đóng góp của một bữa vào tổng cả ngày, %. Ngày chưa có gì thì trả 0. */
function share(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}

const MACRO_TINTS: [keyof Macros, string, string][] = [
  ['protein', 'P', 'var(--protein)'],
  ['fat', 'F', 'var(--fat)'],
  ['carb', 'C', 'var(--carb)'],
]

/**
 * Thẻ nhỏ cho một bữa. Mặt ngoài chỉ có kcal và phần trăm từng chất đóng góp
 * vào cả ngày — đủ để biết bữa nào đang gánh macro nào. Bấm vào mới mở danh
 * sách món và số tiền, nên bốn bữa vẫn nằm gọn trong nửa màn hình.
 */
function MealCard({
  meal,
  entries,
  map,
  dayTotals,
  cost,
  onAdd,
  onSaveTemplate,
  onEdit,
}: {
  meal: MealSlot
  entries: Entry[]
  map: Map<string, Food>
  dayTotals: Macros
  cost: number
  onAdd: () => void
  onSaveTemplate: () => void
  onEdit: (entry: Entry) => void
}) {
  const [open, setOpen] = useState(false)
  const sub = sumEntries(entries, (id) => map.get(id))
  const id = `meal-detail-${meal}`

  return (
    <section className="card meal-card">
      <button
        className="meal-card-head"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="grow">
          <span className="meal-card-name">{MEAL_LABELS[meal]}</span>
          <span className="meal-card-kcal num">
            {entries.length > 0 ? `${n(sub.kcal)} kcal` : 'chưa log'}
          </span>
        </span>
        <span className="lift-caret">
          <IconChevron />
        </span>
      </button>

      <div className="meal-pcts">
        {MACRO_TINTS.map(([key, tag, tint]) => (
          <span
            key={key}
            className="meal-pct num"
            style={{ '--tint': tint } as React.CSSProperties}
          >
            {tag} {share(sub[key], dayTotals[key])}%
          </span>
        ))}
        {sub.addedSugar > 0 && (
          <span
            className="meal-pct num"
            style={{ '--tint': 'var(--sugar)' } as React.CSSProperties}
          >
            Đ {share(sub.addedSugar, dayTotals.addedSugar)}%
          </span>
        )}
      </div>

      <div className="meal-card-detail" id={id} hidden={!open}>
        {entries.length === 0 ? (
          <p className="empty" style={{ padding: '8px 0' }}>
            Chưa log gì
          </p>
        ) : (
          <>
            <div className="list">
              {entries.map((e) => {
                const food = map.get(e.foodId)
                if (!food) return null
                const m = macrosFor(food, e.amount, e.oilTsp ?? 0)
                return (
                  <button key={e.id} className="entry" onClick={() => onEdit(e)}>
                    <FoodIcon food={food} size="sm" />
                    {/* Cột hẹp nên dòng dưới chỉ giữ khối lượng và tiền: tỉ lệ
                        macro của cả bữa đã nằm ngay trên mặt thẻ rồi. */}
                    <span className="grow" style={{ minWidth: 0 }}>
                      <span className="row" style={{ gap: 5 }}>
                        <span className="truncate">{food.name}</span>
                        {e.cheat && <span className="badge moderate">cheat</span>}
                      </span>
                      <span className="dim num truncate" style={{ display: 'block' }}>
                        {amountLabel(e.amount, food.servingUnit)}
                        {e.oilTsp ? ` + ${n(e.oilTsp)} mcf dầu` : ''}
                        {e.cost ? ` · ${vnd(e.cost)}` : ''}
                      </span>
                    </span>
                    <span className="entry-kcal">{n(m.kcal)}</span>
                  </button>
                )
              })}
            </div>
            <div className="between meal-card-cost">
              <span className="dim">Tiền bữa này</span>
              <b className="num">{cost > 0 ? vnd(cost) : 'chưa nhập'}</b>
            </div>
          </>
        )}

        <div className="row" style={{ marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
          <button className="btn sm" onClick={onAdd}>
            + Thêm món
          </button>
          {entries.length > 0 && (
            <button className="btn sm" onClick={onSaveTemplate}>
              Lưu mẫu
            </button>
          )}
        </div>
      </div>
    </section>
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

/** Bản inline của `Stat` — dùng trong nút mở/thu gọn buổi tập. */
function InlineStat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-stat">
      <span className="num" style={{ fontSize: 18, fontWeight: 700 }}>
        {value}
      </span>
      <span className="dim">{label}</span>
    </span>
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

/**
 * Tổng kết + danh sách bài của một buổi tập, dùng chung cho thẻ tạ và calisthenic.
 * Mặc định chỉ hiện bốn con số tổng — bấm vào mới mở danh sách từng bài, để màn
 * "Hôm nay" không bị hai buổi tập đẩy phần ăn uống xuống quá xa.
 */
function LiftSummary({
  entries,
  exById,
  bodyKg,
  empty,
  id,
}: {
  entries: LiftEntry[]
  exById: Map<string, Exercise>
  bodyKg: number
  empty: string
  id: string
}) {
  const [open, setOpen] = useState(false)

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
      <button
        className="lift-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        {/* span chứ không phải div: nội dung nút chỉ được chứa phần tử inline */}
        <span className="grid4 grow" style={{ textAlign: 'center' }}>
          <InlineStat label="bài" value={n(workout.exercises)} />
          <InlineStat label="set" value={n(workout.sets)} />
          <InlineStat label="rep" value={n(workout.reps)} />
          <InlineStat label="volume" value={volumeShort(workout.volume)} />
        </span>
        {/* xoay cái span bọc ngoài chứ không xoay thẳng thẻ <svg>: transform trên
            phần tử SVG gốc không phải trình duyệt nào cũng áp */}
        <span className="lift-caret">
          <IconChevron />
        </span>
      </button>

      <div className="list" id={id} hidden={!open} style={{ marginTop: 6 }}>
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
