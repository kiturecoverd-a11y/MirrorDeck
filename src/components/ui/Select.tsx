export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label?: string
}) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-xs font-medium text-[rgb(var(--text-muted))]">{label}</span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-9 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2.5 text-sm text-[rgb(var(--text))] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
