import { amountLabel, n } from '../lib/format'
import type { MacroNotice } from '../lib/status'
import { Sheet } from './Sheet'

export function NoticeSheet({
  notice,
  onClose,
  onPick,
}: {
  notice: MacroNotice
  onClose: () => void
  onPick: (foodId: string, amount: number) => void
}) {
  return (
    <Sheet title={notice.title} onClose={onClose}>
      <div className="notice">
        <h4>{notice.title}</h4>
        <p className="num" style={{ margin: 0, fontSize: 14 }}>
          {notice.gap}
        </p>
        <p className="risk">{notice.risk}</p>
      </div>

      {notice.suggestions.length > 0 && (
        <>
          <h3 className="h2">Ăn gì để bù</h3>
          <div className="list">
            {notice.suggestions.map((s) => (
              <button
                key={s.food.id}
                className="entry"
                onClick={() => onPick(s.food.id, s.amount)}
              >
                <span className="thumb" aria-hidden="true" />
                <span className="grow">
                  <span className="truncate" style={{ fontWeight: 600, display: 'block' }}>
                    {amountLabel(s.amount, s.unit)} {s.food.name}
                  </span>
                  <span className="dim num" style={{ display: 'block' }}>
                    {n(s.macros.kcal)} kcal · P {n(s.macros.protein, 1)} · F{' '}
                    {n(s.macros.fat, 1)} · C {n(s.macros.carb, 1)}
                  </span>
                </span>
                <span className="dim" aria-hidden="true">
                  ›
                </span>
              </button>
            ))}
          </div>
          <p className="dim" style={{ margin: 0 }}>
            Bấm một dòng để log thẳng với số lượng đó.
          </p>
        </>
      )}

      {notice.advice && (
        <div className="card">
          <h3 className="h2" style={{ marginBottom: 6 }}>
            Nên làm gì
          </h3>
          <p style={{ margin: 0, fontSize: 14 }}>{notice.advice}</p>
        </div>
      )}
    </Sheet>
  )
}
