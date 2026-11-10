import { useState } from 'react'
import { Minus, Square, X } from 'lucide-react'
import { api } from '../../lib/api'
import { useTheme } from '../../lib/store'
import logoSquircle from '../../assets/logo.png'
import logoFlatLight from '../../assets/logo_light.png'
import logoFlatDark from '../../assets/logo_dark.png'

export function TitleBar() {
  const resolved = useTheme((s) => s.resolved)
  const [imgError, setImgError] = useState(false)

  const fallbackLogo = resolved === 'light' ? logoFlatLight : logoFlatDark

  return (
    <div
      data-tauri-drag-region
      className="flex h-10 shrink-0 select-none items-center justify-between border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))]"
    >
      <div data-tauri-drag-region className="flex items-center gap-2.5 pl-3.5">
        <img
          src={imgError ? fallbackLogo : logoSquircle}
          alt="MirrorDeck"
          onError={() => setImgError(true)}
          className="h-5 w-5 rounded-[5px] object-contain select-none shadow-sm"
          draggable={false}
        />
        <span className="text-xs font-bold tracking-wider text-[rgb(var(--text))]">MIRRORDECK</span>
      </div>
      <div className="flex h-full items-stretch">
        <button
          type="button"
          aria-label="Minimize"
          onClick={() => api.window_action('minimize')}
          className="flex w-11 items-center justify-center text-[rgb(var(--text-muted))] transition-colors hover:bg-[rgb(var(--surface-2))] hover:text-[rgb(var(--text))]"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Maximize"
          onClick={() => api.window_action('toggle_maximize')}
          className="flex w-11 items-center justify-center text-[rgb(var(--text-muted))] transition-colors hover:bg-[rgb(var(--surface-2))] hover:text-[rgb(var(--text))]"
        >
          <Square className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Close"
          onClick={() => api.window_action('close')}
          className="flex w-11 items-center justify-center text-[rgb(var(--text-muted))] transition-colors hover:bg-red-600 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
