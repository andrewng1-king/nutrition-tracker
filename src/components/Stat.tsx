/** Ô số liệu: con số to, đơn vị nhỏ bên cạnh, nhãn mờ bên dưới. */
export function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <div className="num" style={{ fontSize: 20, fontWeight: 700 }}>
        {value}
        {unit && <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.65 }}> {unit}</span>}
      </div>
      <div className="dim">{label}</div>
    </div>
  )
}
