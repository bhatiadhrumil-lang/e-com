interface Props {
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
  disabled?: boolean
  label?: string
}

/**
 * Accessible quantity stepper: decrement/increment buttons plus a numeric input.
 */
export default function QuantityStepper({
  value,
  min = 1,
  max = 99,
  onChange,
  disabled = false,
  label = 'Quantity',
}: Props) {
  function clamp(n: number): number {
    return Math.min(max, Math.max(min, n))
  }

  return (
    <div className="qty">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled || value <= min}
        aria-label={`Decrease ${label.toLowerCase()}`}
      >
        −
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        aria-label={label}
        disabled={disabled}
        onChange={(e) => {
          const parsed = Number.parseInt(e.target.value, 10)
          if (Number.isNaN(parsed)) return
          onChange(clamp(parsed))
        }}
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled || value >= max}
        aria-label={`Increase ${label.toLowerCase()}`}
      >
        +
      </button>
    </div>
  )
}
