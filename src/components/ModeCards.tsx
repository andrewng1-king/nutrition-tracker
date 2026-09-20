import { useMemo } from 'react'
import calisPhoto from '../assets/train/calis.webp'
import gymPhoto from '../assets/train/gym.webp'
import runPhoto from '../assets/train/run.webp'
import { n } from '../lib/format'
import { useData } from '../lib/hooks'
import { isSessionLocked, liftDates, summarize, volumeShort } from '../lib/lift'
import { dateKey } from '../lib/macros'
import { exerciseMap, getDay } from '../lib/storage'
import type { AppData, LiftMode } from '../lib/types'

export type TrainMode = LiftMode | 'run'

/**
 * Bộ chọn loại bài tập bằng ảnh: mode đang xem là thẻ lớn kèm số liệu, hai mode
 * kia là ô nhỏ bấm để đổi. Vẫn là điều hướng nên dùng <nav> + aria-current="page"
 * giống SubTabs — ảnh chỉ là nền, nội dung chữ mới là thứ đọc được.
 */
interface ModeInfo {
  key: TrainMode
  /** tên đầy đủ, dùng cho thẻ lớn */
  name: string
  /** tên rút gọn cho ô nhỏ — "Calisthenic" không đủ chỗ ở máy hẹp */
  short: string
  photo: string
  /** dòng nhỏ trên tên: tình trạng hôm nay */
  kicker: string
  /** dòng nhỏ dưới tên: tổng kết từ trước tới nay */
  meta: string
}

const PHOTOS: Record<TrainMode, string> = {
  gym: gymPhoto,
  calisthenic: calisPhoto,
  run: runPhoto,
}

function liftInfo(
  data: AppData,
  exById: ReturnType<typeof exerciseMap>,
  mode: LiftMode,
  today: string,
): Pick<ModeInfo, 'kicker' | 'meta'> {
  const day = getDay(today, data)
  const belongs = (id: string) => exById.get(id)?.mode === mode
  const todays = (day.lifts ?? []).filter((e) => belongs(e.exerciseId))
  const planned = (day.plan ?? []).filter((p) => belongs(p.exerciseId))
  const sessions = liftDates(data, mode, exById).length

  const kicker = isSessionLocked(day, mode, exById, today)
    ? 'Đã xong'
    : todays.length > 0 || planned.length > 0
      ? 'Đang dở'
      : 'Chưa tập'

  if (sessions === 0) return { kicker, meta: 'Chưa có buổi nào' }
  const volume = summarize(todays, exById, data.settings.weightKg).volume
  return {
    kicker,
    meta:
      volume > 0
        ? `${sessions} buổi · ${volumeShort(volume)} kg`
        : `${sessions} buổi`,
  }
}

function runInfo(data: AppData, today: string): Pick<ModeInfo, 'kicker' | 'meta'> {
  const runs = Object.keys(data.days)
    .map((date) => data.days[date]?.run)
    .filter((run) => run && run.distanceKm > 0)
  const kicker = (data.days[today]?.run?.distanceKm ?? 0) > 0 ? 'Đã xong' : 'Chưa chạy'
  if (runs.length === 0) return { kicker, meta: 'Chưa có buổi nào' }
  const km = runs.reduce((sum, run) => sum + (run?.distanceKm ?? 0), 0)
  // 1 chữ số thập phân để khớp thẻ "Tổng cộng" ngay bên dưới — 10 km vs 10,4 km
  // nhìn như hai số liệu khác nhau.
  return { kicker, meta: `${runs.length} buổi · ${n(km, 1)} km` }
}

function useModes(): ModeInfo[] {
  const data = useData()
  const today = dateKey()
  const exById = useMemo(() => exerciseMap(data), [data])
  return useMemo(
    () => [
      {
        key: 'gym' as const,
        name: 'Gym',
        short: 'Gym',
        photo: PHOTOS.gym,
        ...liftInfo(data, exById, 'gym', today),
      },
      {
        key: 'calisthenic' as const,
        name: 'Calisthenic',
        short: 'Calis',
        photo: PHOTOS.calisthenic,
        ...liftInfo(data, exById, 'calisthenic', today),
      },
      {
        key: 'run' as const,
        name: 'Run',
        short: 'Run',
        photo: PHOTOS.run,
        ...runInfo(data, today),
      },
    ],
    [data, exById, today],
  )
}

export function ModeCards({
  active,
  onSelect,
}: {
  active: TrainMode
  onSelect: (mode: TrainMode) => void
}) {
  const modes = useModes()
  // Thứ tự gốc giữ nguyên ở cột phải để hai ô nhỏ không nhảy chỗ khi đổi mode.
  const hero = modes.find((m) => m.key === active) ?? modes[0]
  const rest = modes.filter((m) => m.key !== hero.key)

  return (
    <nav className="modecards" aria-label="Loại bài tập">
      <button
        className="mode-hero"
        aria-current="page"
        onClick={() => onSelect(hero.key)}
      >
        <img className="mode-photo" src={hero.photo} alt="" />
        <span className="mode-scrim" />
        <span className="mode-hero-txt">
          <span className="mode-kicker">{hero.kicker}</span>
          <span className="mode-name">{hero.name}</span>
          <span className="mode-meta">{hero.meta}</span>
        </span>
      </button>
      <div className="mode-side">
        {rest.map((m) => (
          <button key={m.key} className="mode-small" onClick={() => onSelect(m.key)}>
            <img className="mode-photo" src={m.photo} alt="" />
            <span className="mode-scrim" />
            <span className="mode-small-txt">{m.short}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
