import { useEffect } from 'react'
import { useDevices } from '../lib/store'
import { Select } from './ui'

export function DevicePicker({
  value,
  onChange,
}: {
  value?: string
  onChange: (serial: string) => void
}) {
  const devices = useDevices((s) => s.devices)
  const options = devices
    .filter((d) => d.state === 'device')
    .map((d) => ({
      value: d.serial,
      label: `${d.localAlias || d.model || d.serial} (${d.serial})`,
    }))
  const firstOption = options[0]

  useEffect(() => {
    if (firstOption && !options.some((option) => option.value === value)) {
      onChange(firstOption.value)
    }
  }, [firstOption, options, value, onChange])

  if (options.length === 0) {
    return <p className="text-xs text-muted">No connected devices.</p>
  }

  return <Select value={value ?? options[0].value} onChange={onChange} options={options} label="Device" />
}
