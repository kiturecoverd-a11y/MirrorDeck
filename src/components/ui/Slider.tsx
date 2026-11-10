export function Slider({
  min,
  max,
  step = 1,
  value,
  onChange,
  label,
  format,
}: {
  min: number
  max: number
  step?: number
  value: number
  onChange: (v: number) => void
  label?: string
  format?: (v: number) => string
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        {label && <span className="text-xs font-medium text-[rgb(var(--text-muted))]">{label}</span>}
        <span className="text-xs font-semibold tabular-nums">{format ? format(value) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[rgb(var(--surface-2))] accent-[var(--accent)]"
      />
    </div>
  )
}
