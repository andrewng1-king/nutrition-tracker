import { useEffect, useState, type InputHTMLAttributes } from 'react'

type NativeProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
>

interface Props extends NativeProps {
  value: number
  onChange: (value: number) => void
  /** ô trống thay vì "0" khi giá trị bằng 0 — dùng cho trường không bắt buộc */
  blankZero?: boolean
}

/**
 * Ô số giữ nguyên chuỗi người dùng đang gõ.
 *
 * Input `type=number` điều khiển thẳng bằng `value={mộtConSố}` thì không xoá
 * trắng được: xoá hết ký tự là `Number('')` → 0, React vẽ lại ngay số "0", và
 * số gõ tiếp bị dính vào con số cũ. Ở đây chuỗi đang gõ là state riêng, chỉ
 * đồng bộ lại từ prop khi ô không được focus (bấm +/−, chọn chip số lượng).
 */
export function NumberInput({ value, onChange, blankZero, ...rest }: Props) {
  const [text, setText] = useState(() => show(value, blankZero))
  const [typing, setTyping] = useState(false)

  useEffect(() => {
    if (!typing) setText(show(value, blankZero))
  }, [value, typing, blankZero])

  return (
    <input
      {...rest}
      type="number"
      value={text}
      onFocus={(e) => {
        setTyping(true)
        rest.onFocus?.(e)
      }}
      onChange={(e) => {
        const raw = e.target.value
        setText(raw)
        const num = raw.trim() === '' ? 0 : Number(raw)
        if (Number.isFinite(num)) onChange(Math.max(0, num))
      }}
      onBlur={(e) => {
        setTyping(false)
        setText(show(value, blankZero))
        rest.onBlur?.(e)
      }}
    />
  )
}

function show(value: number, blankZero?: boolean): string {
  if (blankZero && value === 0) return ''
  return String(value)
}
