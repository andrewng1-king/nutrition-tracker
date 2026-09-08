import type { ComponentType } from 'react'
import { norm } from '../lib/format'
import type { Food, FoodCategory } from '../lib/types'

interface Props {
  className?: string
}

export type FoodIconType = ComponentType<Props>

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

/* ---------------- thịt, cá, hải sản ---------------- */

/** Đùi gà — mọi phần thịt gà. */
export function IconDrumstick({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M15.6 3.4a5 5 0 0 1 3.7 8.5 3.2 3.2 0 0 1-4.4 1.1l-1.5 1.5a2.6 2.6 0 1 1-3.7-3.7l1.5-1.5a3.2 3.2 0 0 1 1.1-4.4 5 5 0 0 1 3.3-1.5Z" />
      <path d="m10.6 13.4-3.7 3.7" />
      <circle cx="5.2" cy="18.8" r="2.2" />
    </svg>
  )
}

/** Tôm. */
export function IconShrimp({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M18.4 6.4a7.4 7.4 0 1 0 2 9.4" />
      <path d="m20.4 15.8 1.4 3.4-3.6-.9" />
      <path d="M18.4 6.4 21 4.2M18.4 6.4 18 3.2" />
      <path d="M8.6 13.4h3M9.4 16.4h2.8" />
      <circle cx="15.6" cy="8.6" r=".95" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Cá — cá ngừ, cá hồi, cá basa… */
export function IconFish({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M21 12c-2.3 3.4-5.2 5.1-8.6 5.1S6.1 15.4 3.8 12c2.3-3.4 5.2-5.1 8.6-5.1S18.7 8.6 21 12Z" />
      <path d="M3.8 12 1.4 8.6v6.8Z" />
      <path d="M14.4 8.4c-1.2 2.4-1.2 4.8 0 7.2" />
      <circle cx="17.2" cy="11" r=".95" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Mực. */
export function IconSquid({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M6.8 12.6c0-4 2.3-6.8 5.2-6.8s5.2 2.8 5.2 6.8" />
      <path d="M12 2.6c-.6.9-.6 1.9 0 3.2" />
      <path d="M7.4 12.6c-.6 2.6-.2 5.2 1 8M12 12.6c0 2.8-.4 5.6-1.2 8.4M16.6 12.6c.6 2.6.2 5.2-1 8" />
      <circle cx="10" cy="10.4" r=".9" fill="currentColor" stroke="none" />
      <circle cx="14" cy="10.4" r=".9" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Miếng thịt — heo, bò, thịt xay. */
export function IconMeat({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M13.8 3.6c4.2 0 7.4 2.9 7.4 6.8 0 4.6-4.2 9.9-9.4 9.9-4 0-6.8-2.6-6.8-6.2 0-1.6.5-2.8 1.4-4C8 8.2 8.6 3.6 13.8 3.6Z" />
      <circle cx="9.6" cy="13" r="2.7" />
    </svg>
  )
}

/** Xúc xích, chả lụa. */
export function IconSausage({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M5.6 5.4c4.2-1.2 9 .4 11.6 4 2.2 3.1 2 6.6-.4 8.4-2.4 1.8-6 .8-8.2-2.2C6 12 4.8 8.6 5.6 5.4Z" />
      <path d="M4.2 4.2 6.8 6.4M18.6 19.4l2.4-2" />
    </svg>
  )
}

/** Ba rọi — dải mỡ nạc xen kẽ. */
export function IconBacon({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M3 8.2c2.2-2.4 4.4-2.4 6.6 0s4.4 2.4 6.6 0 4.4-2.4 5.8-1.2" />
      <path d="M3 12.4c2.2-2.4 4.4-2.4 6.6 0s4.4 2.4 6.6 0 4.4-2.4 5.8-1.2" />
      <path d="M3 16.6c2.2-2.4 4.4-2.4 6.6 0s4.4 2.4 6.6 0 4.4-2.4 5.8-1.2" />
    </svg>
  )
}

/** Đậu hũ — khối cắt miếng. */
export function IconTofu({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <rect x="3.4" y="6.6" width="17.2" height="11" rx="2.4" />
      <path d="M9.2 6.6v11M14.8 6.6v11M3.4 12.1h17.2" />
    </svg>
  )
}

/* ---------------- trứng ---------------- */

export function IconEgg({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3c3.3 0 6.1 4.5 6.1 8.4A6.1 6.1 0 0 1 12 17.5a6.1 6.1 0 0 1-6.1-6.1C5.9 7.5 8.7 3 12 3Z" />
    </svg>
  )
}

export function IconFriedEgg({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M8.6 4.6c3-1.4 6.1 0 6.9 2.3.5 1.4 2.4 1 3.4 2.5 1.4 2 .5 4.6-1.5 5.6-1 .5-1.1 1.6-2.1 2.4-2.2 1.8-5.7 1.4-7.3-.6-.7-.9-2-.6-3-1.4-2.2-1.7-2.2-5 0-6.7.9-.7.8-2 1.6-2.8.5-.5 1.2-.9 2-1.3Z" />
      <circle cx="12" cy="11.6" r="3" />
    </svg>
  )
}

/* ---------------- tinh bột ---------------- */

/** Chén cơm + hơi nóng. */
export function IconRiceBowl({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M3.6 12.4h16.8a8.4 8.4 0 0 1-8.4 7.6 8.4 8.4 0 0 1-8.4-7.6Z" />
      <path d="M2.6 12.4h18.8" />
      <path d="M7.2 12.4a4.8 4.8 0 0 1 9.6 0" />
      <path d="M9.8 4.4c.6.9.6 1.5 0 2.4M14.2 4.4c.6.9.6 1.5 0 2.4" />
    </svg>
  )
}

/** Dĩa cơm tấm — cơm + miếng sườn. */
export function IconRicePlate({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M2.6 15.8a9.4 9.4 0 0 0 18.8 0Z" />
      <path d="M6.4 15.8a4.4 4.4 0 0 1 8.8 0" />
      <rect x="14.4" y="10.6" width="5.4" height="4.2" rx="1.4" />
    </svg>
  )
}

/** Bánh mì ổ. */
export function IconBread({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M4.6 15.4 15.4 4.6a3.7 3.7 0 0 1 5.2 5.2L9.8 20.6a3.7 3.7 0 0 1-5.2-5.2Z" />
      <path d="m9.4 12.4 2.2 2.2M12.4 9.4l2.2 2.2M15.4 6.4l2.2 2.2" />
    </svg>
  )
}

/** Khoai lang. */
export function IconSweetPotato({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M17.6 5.4c2 2 1.4 5.6-1.3 8.4-2.8 2.7-6.5 3.3-8.4 1.3-2-2-1.4-5.6 1.3-8.4 2.8-2.7 6.5-3.3 8.4-1.3Z" />
      <path d="m7 15.6-3.2 3.2M10 10.2l1.6 1.6M13.4 7.2 15 8.8" />
    </svg>
  )
}

export function IconBanana({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M5.4 5.6c-.4 6.4 3.6 11.4 9.4 12.6 2.6.6 4.7-.2 5.4-1.6.5-1-.2-1.9-1.4-1.9-3.6 0-6.5-1.4-8.3-4-1.4-2-2-3.8-2-5.8" />
      <path d="M5.4 5.6a1.6 1.6 0 0 1 3.1-.5" />
    </svg>
  )
}

/* ---------------- snack ---------------- */

/** Hũ sữa chua. */
export function IconYogurt({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M6.2 8.2h11.6l-1.1 10.4a2 2 0 0 1-2 1.8H9.3a2 2 0 0 1-2-1.8Z" />
      <path d="M4.8 5.2h14.4v3H4.8Z" />
      <path d="M10.6 12.2v4M13.4 12.2v4" />
    </svg>
  )
}

/** Bình whey. */
export function IconShaker({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M7.4 8.6h9.2v9.8a2.6 2.6 0 0 1-2.6 2.6H10a2.6 2.6 0 0 1-2.6-2.6Z" />
      <path d="M8.6 5h6.8v3.6H8.6Z" />
      <path d="M7.4 13h9.2" />
    </svg>
  )
}

/** Hạnh nhân + óc chó. */
export function IconNuts({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M8.8 5.6c2.2 0 4 2.7 4 6s-1.8 6-4 6-4-2.7-4-6 1.8-6 4-6Z" />
      <path d="M8.8 5.6v12" />
      <circle cx="17.4" cy="14.8" r="3.8" />
      <path d="M17.4 11v7.6" />
    </svg>
  )
}

/** Bánh quy — snack chung. */
export function IconCookie({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.6" />
      <circle cx="9.4" cy="9.6" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="11" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="10.8" cy="15.2" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.4" cy="15.6" r=".9" fill="currentColor" stroke="none" />
    </svg>
  )
}

/* ---------------- ăn ngoài ---------------- */

export function IconBurger({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M3.4 9.6c0-3 3.9-5.4 8.6-5.4s8.6 2.4 8.6 5.4Z" />
      <path d="M3.6 12.4h16.8" />
      <path d="M3.6 15.2h16.8c0 2.6-2.1 4.6-4.6 4.6H8.2c-2.6 0-4.6-2-4.6-4.6Z" />
    </svg>
  )
}

/** Xiên nướng — buffet nướng, đồ nướng. */
export function IconSkewer({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M12 2.6v18.8" />
      <rect x="8.2" y="5" width="7.6" height="3.8" rx="1.6" />
      <rect x="8.2" y="10.1" width="7.6" height="3.8" rx="1.6" />
      <rect x="8.2" y="15.2" width="7.6" height="3.8" rx="1.6" />
    </svg>
  )
}

/** Tô phở / bún / mì. */
export function IconNoodle({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M3.6 11.8h16.8a8.4 8.4 0 0 1-8.4 8.2 8.4 8.4 0 0 1-8.4-8.2Z" />
      <path d="M2.6 11.8h18.8" />
      <path d="M7.6 8.6c1.1-1.5 2.4-1.5 3.5 0M12.9 8.6c1.1-1.5 2.4-1.5 3.5 0" />
      <path d="m14.6 3.6 5 4" />
    </svg>
  )
}

export function IconPizza({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3.2 21 19.6c-5.6 2.3-12.4 2.3-18 0Z" />
      <circle cx="12" cy="11.6" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="16.4" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="16.4" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconCheese({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M3.4 11.6 12.6 5.6l8 6v5a1.6 1.6 0 0 1-1.6 1.6H5a1.6 1.6 0 0 1-1.6-1.6Z" />
      <circle cx="8.4" cy="14.2" r="1.2" />
      <circle cx="14.8" cy="15.2" r="1.2" />
    </svg>
  )
}

export function IconCake({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M4.4 13c0-1.6 1.3-2.9 2.9-2.9h9.4c1.6 0 2.9 1.3 2.9 2.9v5.4a1.6 1.6 0 0 1-1.6 1.6H6a1.6 1.6 0 0 1-1.6-1.6Z" />
      <path d="M4.4 15.6c1.6 0 1.6 1.6 3.2 1.6s1.6-1.6 3.2-1.6 1.6 1.6 3.2 1.6 1.6-1.6 3.2-1.6 1.4 1.4 2.4 1.6" />
      <path d="M12 10.1V7" />
      <circle cx="12" cy="5.4" r="1.4" />
    </svg>
  )
}

/* ---------------- rau, trái cây ---------------- */

export function IconVeg({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M8.4 11.6a3.1 3.1 0 0 1-.3-6.1 3.4 3.4 0 0 1 6.3-1.4 3.2 3.2 0 0 1 4.4 4.7 3.1 3.1 0 0 1-2.6 2.8Z" />
      <path d="m9.6 11.6.5 8.4M15.2 11.6l-.8 8.4M10.1 20h4.3" />
    </svg>
  )
}

export function IconApple({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M12 7.6c1.4-1.5 4.2-1.9 5.8 0 1.9 2.1 1.6 6.2-.6 9.4-1 1.5-2.2 2.6-3.4 2.6-.7 0-1.2-.4-1.8-.4s-1.1.4-1.8.4c-1.2 0-2.4-1.1-3.4-2.6-2.2-3.2-2.5-7.3-.6-9.4 1.6-1.9 4.4-1.5 5.8 0Z" />
      <path d="M12 7.6V4.8c0-1 .9-1.9 2-1.9" />
    </svg>
  )
}

/* ---------------- đường & đồ uống ---------------- */

/** Hai viên đường. */
export function IconSugarCube({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <rect x="3.2" y="9.6" width="9.4" height="9.4" rx="1.8" />
      <rect x="11.4" y="5" width="9.4" height="9.4" rx="1.8" />
    </svg>
  )
}

/** Lon sữa đặc. */
export function IconCan({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M6.4 6.6c0-1.3 2.5-2.3 5.6-2.3s5.6 1 5.6 2.3v10.8c0 1.3-2.5 2.3-5.6 2.3s-5.6-1-5.6-2.3Z" />
      <path d="M6.4 6.6c0 1.3 2.5 2.3 5.6 2.3s5.6-1 5.6-2.3" />
    </svg>
  )
}

/** Lon nước ngọt. */
export function IconSoda({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M7 4.2h10l-.9 15.4a1.7 1.7 0 0 1-1.7 1.6H9.6a1.7 1.7 0 0 1-1.7-1.6Z" />
      <path d="M7.2 8.2h9.6" />
      <path d="M11 4.2v1.8h2V4.2" />
    </svg>
  )
}

/** Trà sữa trân châu. */
export function IconBubbleTea({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M6.6 8.4h10.8l-1.1 10.8a2 2 0 0 1-2 1.8h-4.6a2 2 0 0 1-2-1.8Z" />
      <path d="M5.4 8.4h13.2" />
      <path d="m13.8 8.4 2.6-5.4" />
      <circle cx="10.2" cy="17.2" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="13.7" cy="17.6" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14.4" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconCoffee({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M4.4 8.6h12v6a4.6 4.6 0 0 1-4.6 4.6H9a4.6 4.6 0 0 1-4.6-4.6Z" />
      <path d="M16.4 10.2h1.8a2.6 2.6 0 0 1 0 5.2h-1.8" />
      <path d="M7.6 3.4c.6.9.6 1.6 0 2.5M11.4 3.4c.6.9.6 1.6 0 2.5" />
    </svg>
  )
}

/** Chai sốt / nước chấm — nhóm còn lại. */
export function IconBottle({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M10 3.4h4v2.5l1.8 2.3c.5.6.8 1.4.8 2.2v8a2 2 0 0 1-2 2H9.4a2 2 0 0 1-2-2v-8c0-.8.3-1.6.8-2.2L10 5.9Z" />
      <rect x="9.6" y="12" width="4.8" height="4.6" rx="1" />
    </svg>
  )
}

/* ---------------- phân loại ---------------- */

/** Icon cố định cho từng món trong bảng gốc. */
const BY_ID: Record<string, FoodIconType> = {
  'uc-ga': IconDrumstick,
  'ma-dui-ga': IconDrumstick,
  'canh-ga': IconDrumstick,
  'dui-ga-co-da': IconDrumstick,
  tom: IconShrimp,
  'ca-ngu': IconFish,
  'ca-dieu-hong': IconFish,
  'ca-basa': IconFish,
  'ca-hoi': IconFish,
  muc: IconSquid,
  'nac-heo-than': IconMeat,
  'heo-xay-nac': IconMeat,
  'heo-xay-thuong': IconMeat,
  'suon-heo': IconMeat,
  'than-bo': IconMeat,
  'bo-xay-nac': IconMeat,
  'bo-xay-thuong': IconMeat,
  'dau-hu': IconTofu,
  'cha-lua': IconSausage,
  'xuc-xich': IconSausage,
  'ba-roi-heo': IconBacon,
  'trung-luoc': IconEgg,
  'trung-op-la': IconFriedEgg,
  'com-trang': IconRiceBowl,
  'khoai-lang': IconSweetPotato,
  'banh-mi': IconBread,
  chuoi: IconBanana,
  'sua-chua-hy-lap': IconYogurt,
  whey: IconShaker,
  hat: IconNuts,
  'jollibee-combo': IconBurger,
  'com-tam-suon-opla': IconRicePlate,
  'buffet-nuong': IconSkewer,
  'duong-trang': IconSugarCube,
  'sua-dac': IconCan,
  'nuoc-ngot': IconSoda,
  'tra-sua': IconBubbleTea,
}

/**
 * Đoán icon cho món tự thêm theo tên. Khớp trên tên đã bỏ dấu, xét theo thứ tự
 * — cụm dài và đặc trưng đứng trước, từ chung đứng sau.
 */
const BY_NAME: [RegExp, FoodIconType][] = [
  [/tra sua|milk ?tea|boba|tran chau/, IconBubbleTea],
  [/ca phe|cafe|coffee|latte|espresso/, IconCoffee],
  [/nuoc ngot|coca|pepsi|soda|7 ?up|sting|red ?bull|bia|beer/, IconSoda],
  [/sua dac|sua tuoi|sua bo|milk|yakult/, IconCan],
  [/sua chua|yogurt|yaourt|kefir/, IconYogurt],
  [/duong|sugar|mat ong|honey|syrup/, IconSugarCube],
  [/whey|casein|bcaa|mass gainer|protein bot/, IconShaker],
  [/pho mai|phomai|cheese|bo sua|butter/, IconCheese],
  [/pizza/, IconPizza],
  [
    /burger|ham ?burger|kfc|lotteria|jollibee|mcdonald|ga ran|khoai chien|fast ?food/,
    IconBurger,
  ],
  [/\bpho\b|\bbun\b|\bmi\b|mien|hu tieu|noodle|ramen|\bnui\b|banh canh|pasta|spaghetti/, IconNoodle],
  [/nuong|bbq|xien|buffet|\blau\b/, IconSkewer],
  [/banh mi|bread|toast|sandwich|baguette/, IconBread],
  [/banh kem|banh ngot|cake|\bkem\b|donut|cupcake|\bche\b/, IconCake],
  [/banh quy|cookie|snack|bim bim|khoai tay chien|cracker/, IconCookie],
  [/hanh nhan|oc cho|\bdieu\b|macca|\bhat\b|\bnut\b|nuts|almond|peanut|dau phong/, IconNuts],
  [/com tam|com suon|com ga|com chien|dia com/, IconRicePlate],
  [/\bcom\b|\bgao\b|rice|\bxoi\b/, IconRiceBowl],
  [/khoai lang|khoai mi|khoai tay|potato/, IconSweetPotato],
  [/chuoi|banana/, IconBanana],
  [/\btao\b|apple|\bcam\b|orange|\ble\b|\boi\b|xoai|dua hau|trai cay|hoa qua|fruit|\bnho\b|kiwi|buoi/, IconApple],
  [/\brau\b|\bcai\b|bong cai|broccoli|salad|xa lach|ca rot|carrot|bi do|dua leo|\bnam\b|\bveg/, IconVeg],
  [/trung op|trung chien|fried ?egg|op la/, IconFriedEgg],
  [/trung|egg/, IconEgg],
  [/dau hu|dau phu|tofu|tau hu/, IconTofu],
  [/\btom\b|shrimp|prawn|\btep\b/, IconShrimp],
  [/\bmuc\b|squid|bach tuoc|octopus/, IconSquid],
  [/\bca\b|fish|salmon|tuna/, IconFish],
  [/\bga\b|chicken|\bvit\b|duck/, IconDrumstick],
  [/ba roi|bacon|thit xong khoi/, IconBacon],
  [/xuc xich|cha lua|gio lua|sausage|\bham\b|thit nguoi|\bnem\b/, IconSausage],
  [/\bbo\b|beef|\bheo\b|pork|\bthit\b|steak|\bsuon\b|\bcuu\b/, IconMeat],
  [/nuoc mam|nuoc tuong|\bsot\b|sauce|\bdau\b|\bmuoi\b|gia vi|tuong/, IconBottle],
]

/** Không đoán được thì rơi về icon của nhóm thực phẩm. */
const BY_CATEGORY: Record<FoodCategory, FoodIconType> = {
  protein: IconMeat,
  trung: IconEgg,
  tinhbot: IconRiceBowl,
  snack: IconCookie,
  anngoai: IconBurger,
  khac: IconBottle,
}

/** Màu icon theo nhóm thực phẩm — nhìn màu là biết loại món trước khi đọc tên. */
export const CATEGORY_TINT: Record<FoodCategory, string> = {
  protein: 'var(--protein)',
  trung: 'var(--fat)',
  tinhbot: 'var(--carb)',
  snack: 'var(--sugar)',
  anngoai: 'var(--kcal)',
  khac: 'var(--muted)',
}

export function foodIconFor(food: Pick<Food, 'id' | 'name' | 'category'>): FoodIconType {
  const fixed = BY_ID[food.id]
  if (fixed) return fixed
  const name = norm(food.name)
  for (const [re, Icon] of BY_NAME) {
    if (re.test(name)) return Icon
  }
  return BY_CATEGORY[food.category] ?? IconBottle
}

/**
 * Ô icon món ăn — thay hẳn ô ảnh cũ. Không còn chức năng tự dán ảnh: icon suy
 * ra từ chính món, nên món nào cũng có hình ngay lúc tạo, không phải đi tìm URL.
 */
export function FoodIcon({
  food,
  size = 'md',
}: {
  food: Pick<Food, 'id' | 'name' | 'category'>
  size?: 'md' | 'sm'
}) {
  const Icon = foodIconFor(food)
  return (
    <span
      className={`food-ico${size === 'sm' ? ' sm' : ''}`}
      style={{ '--tint': CATEGORY_TINT[food.category] } as React.CSSProperties}
      aria-hidden="true"
    >
      <Icon />
    </span>
  )
}
