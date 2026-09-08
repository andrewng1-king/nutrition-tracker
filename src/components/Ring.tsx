import { useId, type ComponentType } from 'react'
import { IconCarb, IconFat, IconProtein, IconSugar } from './icons'
import { n } from '../lib/format'
import { statusLevel, type Level, type NoticeKey } from '../lib/status'
import type { Macros, Targets } from '../lib/types'

/**
 * Cung vòng đổ gradient (kiểu ring của ảnh tham chiếu): stop sáng -> stop đậm của
 * cùng một bậc trạng thái, để vòng vẫn đọc được màu nhưng có chiều sâu.
 */
const LEVEL_GRADIENT: Record<Level, [string, string]> = {
  1: ['#ff8f93', '#e5484d'],
  2: ['#ffb277', '#f26430'],
  3: ['#ffe173', '#f2b90d'],
  4: ['#e2ff7a', '#7fd400'],
}

/**
 * Vượt ngưỡng:
 * 'ok'  — protein: vượt là tốt, giữ xanh lá.
 * 'bad' — fat, carb, đường, calo: đảo lại thành vàng -> đỏ.
 */
const OVER_GRADIENT: Record<'bad' | 'ok', [string, string]> = {
  bad: ['#f2c53d', '#e5484d'],
  ok: ['#d9ff6b', '#22c55e'],
}

interface RingProps {
  value: number
  target: number
  /** đường kính danh nghĩa (px) — CSS co lại theo --ring-scale trên máy nhỏ */
  size: number
  thickness: number
  /** target là mức trần (fat, đường) chứ không phải mức cần đạt */
  ceiling?: boolean
  /** sàn tối thiểu — fat có cả sàn 50g lẫn trần 65g */
  floor?: number
  overTone?: 'bad' | 'ok'
  label?: string
  children?: React.ReactNode
}

export function Ring({
  value,
  target,
  size,
  thickness,
  ceiling,
  floor,
  overTone = 'bad',
  label,
  children,
}: RingProps) {
  const uid = useId().replace(/:/g, '')
  const r = (size - thickness) / 2
  const circumference = 2 * Math.PI * r
  const over = target > 0 && value > target
  const pct = target > 0 ? Math.min(value / target, 1) : 0
  // vòng 2 chạy tiếp từ mốc 0, đè lên vòng 1 — nhìn là biết vượt bao nhiêu
  const overPct = over ? Math.min((value - target) / target, 1) : 0

  // Khi đã vượt, vòng nền chuyển sang màu "đạt": phần đỏ/xanh đè lên mới là phần vượt.
  const baseLevel: Level = over ? 4 : statusLevel(value, target, { ceiling, floor })

  const grad = (id: string, [from, to]: [string, string]) => (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor={from} />
      <stop offset="100%" stopColor={to} />
    </linearGradient>
  )

  const arc = (id: string, fraction: number, key: string) => (
    <circle
      key={key}
      className="ring-arc"
      cx={size / 2}
      cy={size / 2}
      r={r}
      strokeWidth={thickness}
      stroke={`url(#${id})`}
      strokeDasharray={circumference}
      strokeDashoffset={circumference * (1 - fraction)}
    />
  )

  return (
    <div className="ring-wrap ring" style={{ '--ring': `${size}px` } as React.CSSProperties}>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
        <defs>
          {grad(`${uid}-base`, LEVEL_GRADIENT[baseLevel])}
          {grad(`${uid}-over`, OVER_GRADIENT[overTone])}
        </defs>
        <circle
          className="ring-track"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={thickness}
        />
        {arc(`${uid}-base`, pct, 'base')}
        {over && (
          <>
            {/* viền tối mảnh để tách vòng vượt khỏi vòng nền cùng bán kính */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              className="ring-arc ring-over-edge"
              strokeWidth={thickness + 3}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - overPct)}
            />
            {arc(`${uid}-over`, overPct, 'over')}
          </>
        )}
      </svg>
      {children && <div className="ring-center">{children}</div>}
    </div>
  )
}

interface MiniProps {
  name: string
  icon: ComponentType<{ className?: string }>
  /** màu nhận diện của nhóm chất — chỉ tô icon, vòng vẫn tô theo trạng thái */
  tint: string
  value: number
  target: number
  unit?: string
  ceiling?: boolean
  floor?: number
  overTone?: 'bad' | 'ok'
  alert?: boolean
  onClick?: () => void
}

function MiniRing({
  name,
  icon: Icon,
  tint,
  value,
  target,
  unit = 'g',
  ceiling,
  floor,
  overTone,
  alert,
  onClick,
}: MiniProps) {
  const body = (
    <>
      <Ring
        value={value}
        target={target}
        size={58}
        thickness={7}
        ceiling={ceiling}
        floor={floor}
        overTone={overTone}
        label={`${name}: ${n(value, 1)} trên ${n(target)} ${unit}`}
      />
      <span className="mini-name">
        <Icon className="mini-ico" />
        <span className="truncate">{name}</span>
      </span>
      <span className="mini-val num">
        {n(value)}/{n(target)}
        {unit}
      </span>
    </>
  )

  const style = { '--tint': tint } as React.CSSProperties

  if (!onClick) {
    return (
      <div className="mini-ring" data-alert={alert} style={style}>
        {body}
      </div>
    )
  }

  return (
    <button
      className="mini-ring"
      data-alert={alert}
      style={style}
      onClick={onClick}
      aria-label={`${name} — xem ghi chú`}
    >
      {body}
    </button>
  )
}

/** Số kcal 4 chữ số phải nhỏ lại, nếu không là tràn ra ngoài vòng. */
function heroFontSize(text: string) {
  if (text.length >= 6) return 19
  if (text.length === 5) return 22
  if (text.length === 4) return 25
  return 29
}

export function MacroRings({
  macros,
  targets,
  heading = 'Mục tiêu hôm nay',
  badge,
  alerts,
  onOpenNotice,
}: {
  macros: Macros
  targets: Targets
  heading?: string
  /** nhãn phụ dưới dải target — màn "Hôm nay" gắn nút Turbo vào đây */
  badge?: React.ReactNode
  /** chỉ số nào đang vi phạm ngưỡng — hiện chấm đỏ trên vòng đó */
  alerts?: Set<NoticeKey>
  onOpenNotice?: (key: NoticeKey) => void
}) {
  const kcalLeft = targets.kcalMax - macros.kcal
  const has = (k: NoticeKey) => alerts?.has(k) ?? false
  const open = (k: NoticeKey) =>
    onOpenNotice && has(k) ? () => onOpenNotice(k) : undefined
  const kcalText = n(macros.kcal)

  return (
    <>
      <div className="hero-ring">
        <Ring
          value={macros.kcal}
          target={targets.kcalMax}
          size={104}
          thickness={10}
          label={`Calo: ${kcalText} trên ${n(targets.kcalMax)} kcal`}
        >
          <span className="hero-value" style={{ fontSize: heroFontSize(kcalText) }}>
            {kcalText}
          </span>
          <span className="hero-unit">kcal</span>
        </Ring>

        <div className="grow">
          <div className="h2">{heading}</div>
          <div className="hero-goal num">
            <span>
              {n(targets.kcalMin)}–{n(targets.kcalMax)}
            </span>
            <i>kcal</i>
          </div>
          <div className={`hero-left num${kcalLeft < 0 ? ' over' : ''}`}>
            {kcalLeft >= 0 ? `Còn ${n(kcalLeft)} kcal` : `Vượt ${n(-kcalLeft)} kcal`}
          </div>
          {badge && <div style={{ marginTop: 8 }}>{badge}</div>}
        </div>
      </div>

      <div className="mini-rings">
        <MiniRing
          name="Protein"
          icon={IconProtein}
          tint="var(--protein)"
          value={macros.protein}
          target={targets.protein}
          overTone="ok"
          alert={has('protein')}
          onClick={open('protein')}
        />
        <MiniRing
          name="Fat"
          icon={IconFat}
          tint="var(--fat)"
          value={macros.fat}
          target={targets.fat}
          ceiling
          floor={targets.fatMin}
          alert={has('fat')}
          onClick={open('fat')}
        />
        <MiniRing
          name="Carb"
          icon={IconCarb}
          tint="var(--carb)"
          value={macros.carb}
          target={targets.carb}
          alert={has('carb')}
          onClick={open('carb')}
        />
        <MiniRing
          name="Đường"
          icon={IconSugar}
          tint="var(--sugar)"
          value={macros.addedSugar}
          target={targets.addedSugarMax}
          ceiling
          alert={has('sugar')}
          onClick={open('sugar')}
        />
      </div>
    </>
  )
}
