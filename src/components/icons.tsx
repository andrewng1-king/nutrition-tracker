interface Props {
  className?: string
}

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function IconToday({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.2v4.8l3.2 2" />
    </svg>
  )
}

export function IconHistory({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M4 19V9M9.3 19V5M14.7 19v-6.5M20 19v-9.5" />
    </svg>
  )
}

export function IconFoods({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M6 3v7a2.6 2.6 0 0 0 5.2 0V3M8.6 10.2V21" />
      <path d="M17.6 21v-7.4c1.4-.5 2.4-2 2.4-4.2C20 6.3 19 3.6 17.6 3c-1.4.6-2.4 3.3-2.4 6.4 0 2.2 1 3.7 2.4 4.2Z" />
    </svg>
  )
}

export function IconBody({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <rect x="2.6" y="8.4" width="18.8" height="7.2" rx="2.2" />
      <path d="M7 8.4v3M12 8.4v4.2M17 8.4v3" />
    </svg>
  )
}

export function IconSettings({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2.4" />
      <circle cx="8" cy="17" r="2.4" />
    </svg>
  )
}

export function IconWallet({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M3.4 8.2a2 2 0 0 1 2-2h11.2a2 2 0 0 1 2 2v.6" />
      <rect x="3.4" y="8.2" width="17.2" height="11.4" rx="2.6" />
      <path d="M20.6 12.4h-3.3a1.9 1.9 0 0 0 0 3.8h3.3" />
    </svg>
  )
}

export function IconCamera({ className }: Props) {
  return (
    <svg {...base} className={className} width="22" height="22">
      <path d="M3.5 8.5A2 2 0 0 1 5.5 6.5h1.9a1 1 0 0 0 .83-.45l.86-1.3a1 1 0 0 1 .83-.45h4.16a1 1 0 0 1 .83.45l.86 1.3a1 1 0 0 0 .83.45h1.9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" />
      <circle cx="12" cy="12.8" r="3.4" />
    </svg>
  )
}

export function IconLift({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M3 9.6v4.8M6.2 7.4v9.2M17.8 7.4v9.2M21 9.6v4.8M6.2 12h11.6" />
    </svg>
  )
}

export function IconProfile({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="8.4" r="3.7" />
      <path d="M4.8 20.2a7.2 7.2 0 0 1 14.4 0" />
    </svg>
  )
}

export function IconRun({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="14.6" cy="4.6" r="1.9" />
      <path d="M8.2 21l2.6-5.2-2.4-2.4 1.2-4.6 3.6-1.4 2.8 3 3 1" />
      <path d="M10.8 15.8l3.4 1.6.8 3.6M9.6 8.8 6 9.8l-1.2 2.8" />
    </svg>
  )
}

/** Giày chạy — nhãn "Chạy bộ" ở thanh loại ngày, dễ nhận ra hơn hình người chạy. */
export function IconShoe({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M2.6 16.8V11c0-.5.5-.9 1-.8l2.6.5c.6.1 1.2 0 1.7-.4l2-1.6c.5-.4 1.3-.3 1.7.2l1.2 1.5c.4.5 1 .8 1.6.9l4 .8c1.4.3 2.4 1.5 2.4 2.9v1.8a1 1 0 0 1-1 1H3.6a1 1 0 0 1-1-1Z" />
      <path d="M2.6 14.6h18.9M8.2 10.5l1.5 2.2M11.6 8.6l1.6 2.3" />
    </svg>
  )
}

/**
 * Đồng hồ tốc độ kiểu công-tơ-mét xe máy — nhãn "Turbo" khi ngày chạy có thêm
 * calisthenic. Kim vẽ riêng để CSS quay được lúc kích hoạt.
 */
export function IconTurbo({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M3.6 18.4a9.4 9.4 0 1 1 16.8 0" />
      <path d="M5.2 9.1l1.5 1M12 5.6v1.8M18.8 9.1l-1.5 1" />
      <g
        className="turbo-needle"
        style={{ transformBox: 'view-box', transformOrigin: '12px 18.4px' }}
      >
        <path d="M12 18.4 16.4 12" />
      </g>
      <circle cx="12" cy="18.4" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Mũi tên xuống — nút mở/thu gọn chi tiết buổi tập. */
export function IconChevron({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />
    </svg>
  )
}

/** Tua vít — nút công cụ dev ở góc trái dưới. */
export function IconScrewdriver({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M14.2 4.1 19.9 9.8a1 1 0 0 1 0 1.4l-1.4 1.4a1 1 0 0 1-1.4 0L11.4 6.9a1 1 0 0 1 0-1.4l1.4-1.4a1 1 0 0 1 1.4 0Z" />
      <path d="m12.8 8.3-2.5 2.5M10.9 12.2 6.2 16.9l-2.1 3.9 3.9-2.1 4.7-4.7" />
    </svg>
  )
}

/* ---- macro icons: dùng cho vòng nhỏ, tô theo màu nhận diện của từng nhóm chất ---- */

export function IconProtein({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="15.8" cy="8.2" r="5.2" />
      <path d="M12.1 11.9 7.7 16.3" />
      <circle cx="6" cy="18" r="2.6" />
    </svg>
  )
}

export function IconCarb({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M12 21V8.5" />
      <path d="M12 8.6c0-2.6 1.5-4.6 4-5.1.4 2.7-1 5-4 5.1Z" />
      <path d="M12 8.6c0-2.6-1.5-4.6-4-5.1-.4 2.7 1 5 4 5.1Z" />
      <path d="M12 14.4c0-2.6 1.5-4.6 4-5.1.4 2.7-1 5-4 5.1Z" />
      <path d="M12 14.4c0-2.6-1.5-4.6-4-5.1-.4 2.7 1 5 4 5.1Z" />
    </svg>
  )
}

export function IconFat({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3.2c3.6 4 5.6 6.9 5.6 9.5A5.6 5.6 0 0 1 12 18.3a5.6 5.6 0 0 1-5.6-5.6c0-2.6 2-5.5 5.6-9.5Z" />
    </svg>
  )
}

export function IconSugar({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3.4 20 8v8l-8 4.6L4 16V8Z" />
      <path d="M4 8l8 4.6L20 8M12 12.6V20.6" />
    </svg>
  )
}

export function IconFlame({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M13 2.6c.5 2.6-.6 4.3-2 5.7-1.6 1.6-3.6 3-3.6 6.1a6.6 6.6 0 0 0 13.2 0c0-3.4-2.2-5.6-4.4-8.2" />
      <path d="M12 21a3.2 3.2 0 0 1-3.2-3.2c0-1.8 1.6-2.7 2.4-4.1.9 1.3 4 2.2 4 4.1A3.2 3.2 0 0 1 12 21Z" />
    </svg>
  )
}
