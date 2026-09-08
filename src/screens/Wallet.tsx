import { useMemo, useState } from 'react'
import { ExpenseGauge } from '../components/ExpenseGauge'
import { IconLogo } from '../components/icons'
import { dayLabel, shortDate, vnd, vndShort } from '../lib/format'
import { useData } from '../lib/hooks'
import { dateKey } from '../lib/macros'
import { dailySeries, walletSummary } from '../lib/wallet'

const MONTH_LABELS = [
  'Th1',
  'Th2',
  'Th3',
  'Th4',
  'Th5',
  'Th6',
  'Th7',
  'Th8',
  'Th9',
  'Th10',
  'Th11',
  'Th12',
]

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${MONTH_LABELS[m - 1]}/${String(y).slice(2)}`
}

export function Wallet({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const data = useData()
  const [range, setRange] = useState<14 | 30>(14)
  const w = useMemo(() => walletSummary(data), [data])
  const series = useMemo(() => dailySeries(w, range), [w, range])

  if (w.total === 0) {
    return (
      <div className="screen">
        <h1 className="h1">Ví tiền</h1>
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Chưa có khoản chi nào. Nhập giá tiền lúc log món ở màn <b>Hôm nay</b>, hoặc bấm
            vào món đã log để thêm tiền sau. App nhớ đơn giá từng món nên lần sau tự điền.
          </p>
        </div>
      </div>
    )
  }

  const peak = Math.max(...series.map((d) => d.total), 1)
  const monthPeak = Math.max(...w.months.map((m) => m.total), 1)

  return (
    <div className="screen">
      <h1 className="h1">Ví tiền</h1>

      <BankCard
        total={w.total}
        today={w.today}
        week={w.week}
        month={w.month}
        days={w.daysWithSpend}
        firstDate={w.firstDate}
      />

      <div className="grid2">
        <div className="card">
          <div className="h2">TB mỗi ngày</div>
          <div className="money">{vnd(w.avgPerDay)}</div>
          <p className="dim" style={{ margin: '4px 0 0' }}>
            Chia cho {w.daysWithSpend} ngày có chi tiền.
          </p>
        </div>
        <div className="card">
          <div className="h2">TB mỗi tháng</div>
          <div className="money">{vnd(w.avgPerMonthActual ?? w.avgPerMonthEstimate)}</div>
          <p className="dim" style={{ margin: '4px 0 0' }}>
            {w.avgPerMonthActual
              ? 'Trung bình các tháng đã trọn.'
              : `Ước tính: ${vndShort(w.avgPerDay)}/ngày × 30,44.`}
          </p>
        </div>
      </div>

      <section className="card">
        <div className="between" style={{ marginBottom: 12 }}>
          <h2 className="h2">Theo ngày</h2>
          <div className="seg ghost" style={{ padding: 3 }}>
            <button
              aria-pressed={range === 14}
              onClick={() => setRange(14)}
              style={{ minHeight: 30, padding: '0 12px', fontSize: 13 }}
            >
              14
            </button>
            <button
              aria-pressed={range === 30}
              onClick={() => setRange(30)}
              style={{ minHeight: 30, padding: '0 12px', fontSize: 13 }}
            >
              30
            </button>
          </div>
        </div>

        <div className="spend-bars">
          {series.map((d) => {
            const h = d.total > 0 ? 8 + (d.total / peak) * 76 : 3
            const isToday = d.date === dateKey()
            return (
              <button
                key={d.date}
                className="spend-bar"
                onClick={() => onOpenDay(d.date)}
                aria-label={`${dayLabel(d.date)}: ${d.total > 0 ? vnd(d.total) : 'không chi'}`}
                title={`${shortDate(d.date)} · ${d.total > 0 ? vnd(d.total) : '—'}`}
              >
                <i
                  style={{
                    height: h,
                    background:
                      d.total > w.avgPerDay
                        ? 'var(--level-2)'
                        : d.total > 0
                          ? 'var(--level-4)'
                          : 'var(--surface-3)',
                  }}
                />
                {isToday && <em />}
              </button>
            )
          })}
        </div>
        <div className="between dim" style={{ marginTop: 8 }}>
          <span>{shortDate(series[0].date)}</span>
          <span className="num">
            Cột cam = trên mức trung bình {vndShort(w.avgPerDay)}
          </span>
          <span>{shortDate(series[series.length - 1].date)}</span>
        </div>
      </section>

      <section className="card">
        <h2 className="h2" style={{ marginBottom: 4 }}>
          Chia theo bữa
        </h2>
        <ExpenseGauge byMeal={w.byMeal} total={w.total} />
      </section>

      {w.months.length > 1 && (
        <section className="card">
          <h2 className="h2" style={{ marginBottom: 12 }}>
            Theo tháng
          </h2>
          <div className="list">
            {[...w.months].reverse().map((m) => (
              <div key={m.month} className="list-item" style={{ gap: 12 }}>
                <span style={{ width: 58, fontWeight: 600 }}>{monthLabel(m.month)}</span>
                <span className="grow">
                  <span className="progress-line">
                    <i
                      style={{
                        transform: `scaleX(${m.total / monthPeak})`,
                        background: m.representative ? 'var(--level-2)' : 'var(--surface-3)',
                      }}
                    />
                  </span>
                  <span className="dim">
                    {m.days} ngày · {vndShort(m.total / m.days)}/ngày
                    {m.partial
                      ? ' · đang chạy'
                      : m.representative
                        ? ''
                        : ' · chưa đủ tháng'}
                  </span>
                </span>
                <span className="num" style={{ fontWeight: 600 }}>
                  {vndShort(m.total)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h2 className="h2" style={{ marginBottom: 4 }}>
          Tốn tiền nhất
        </h2>
        <div className="list">
          {w.topFoods.map((f) => (
            <div key={f.foodId} className="list-item">
              <span className="grow">
                <span className="truncate" style={{ display: 'block', fontWeight: 600 }}>
                  {f.name}
                </span>
                <span className="dim num" style={{ display: 'block' }}>
                  {f.times} lần · {vndShort(f.total / f.times)} mỗi lần
                </span>
              </span>
              <span className="num" style={{ fontWeight: 600 }}>
                {vndShort(f.total)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="h2" style={{ marginBottom: 10 }}>
          Tiền đổi ra dinh dưỡng
        </h2>
        <div className="grid2" style={{ textAlign: 'center' }}>
          <Metric label="mỗi gram protein" value={vnd(w.costPerProteinG)} dark />
          <Metric label="mỗi 1.000 kcal" value={vndShort(w.costPer1000Kcal)} dark />
        </div>
        <p className="dim" style={{ margin: '12px 0 0' }}>
          Đồng trên mỗi gram protein là con số đáng nhìn nhất: mục tiêu là 140g protein mỗi
          ngày, nên món nào hạ được chỉ số này sẽ tiết kiệm nhiều nhất về lâu dài.
        </p>
      </section>
    </div>
  )
}

/**
 * Số tiền cắt làm hai: nhóm nghìn cuối và ký hiệu ₫ mờ đi. Cùng một con số
 * nhưng mắt bắt được bậc độ lớn trước, giống cách thẻ ngân hàng tách phần lẻ.
 */
function splitAmount(value: number): [string, string] {
  const s = Math.round(value).toLocaleString('vi-VN')
  const i = s.lastIndexOf('.')
  return i < 0 ? [s, ''] : [s.slice(0, i), s.slice(i)]
}

/**
 * Thẻ tổng chi, dựng theo hình một chiếc thẻ ngân hàng thật: mặt tối, logo app
 * dập nổi ở góc, số tiền là dòng lớn nhất. Đây là con số người dùng mở tab Ví
 * để xem, nên nó được cầm một thẻ riêng thay vì nằm chung với các ô thống kê.
 */
function BankCard({
  total,
  today,
  week,
  month,
  days,
  firstDate,
}: {
  total: number
  today: number
  week: number
  month: number
  days: number
  firstDate?: string
}) {
  const [head, tail] = splitAmount(total)
  return (
    <div className="bankcard">
      <div className="bankcard-top">
        <span className="bankcard-mark">
          <IconLogo />
        </span>
        <span className="bankcard-brand">Nutrition Tracker</span>
        <span className="bankcard-chip" aria-hidden="true" />
      </div>

      <div className="bankcard-label">Tổng đã chi cho ăn uống</div>
      <div className="bankcard-amount num">
        {head}
        <span className="bankcard-amount-tail">
          {tail} ₫
        </span>
      </div>
      <div className="bankcard-sub">
        {days} ngày có chi{firstDate ? ` · từ ${shortDate(firstDate)}` : ''}
      </div>

      <div className="bankcard-foot">
        <CardMetric label="hôm nay" value={vndShort(today)} />
        <CardMetric label="tuần này" value={vndShort(week)} />
        <CardMetric label="tháng này" value={vndShort(month)} />
      </div>
    </div>
  )
}

function CardMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bankcard-metric">
      <div className="num">{value}</div>
      <div>{label}</div>
    </div>
  )
}

function Metric({
  label,
  value,
  dark,
}: {
  label: string
  value: string
  dark?: boolean
}) {
  return (
    <div>
      <div
        className="num"
        style={{ fontSize: 20, fontWeight: 700, color: dark ? 'var(--text)' : undefined }}
      >
        {value}
      </div>
      <div className="dim">{label}</div>
    </div>
  )
}
