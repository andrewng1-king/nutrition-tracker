/**
 * Hàng chọn sub-tab dùng chung cho các màn có nhiều mục con (Bài tập, Profile).
 * Dùng aria-current="page" giống tabbar chính vì đây cũng là điều hướng, không
 * phải nút bật/tắt trạng thái.
 */
export function SubTabs<T extends string>({
  tabs,
  active,
  onSelect,
  label,
}: {
  tabs: [T, string][]
  active: T
  onSelect: (tab: T) => void
  label: string
}) {
  return (
    <nav className="subtabs" aria-label={label}>
      {tabs.map(([key, text]) => (
        <button
          key={key}
          aria-current={active === key ? 'page' : undefined}
          onClick={() => onSelect(key)}
        >
          {text}
        </button>
      ))}
    </nav>
  )
}
