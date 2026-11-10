import { useEffect, useState } from 'react'
import { History as HistoryIcon, Trash2 } from 'lucide-react'
import { Section } from '../components/Section'
import { Badge, Button, ConfirmDialog, EmptyState } from '../components/ui'
import { api } from '../lib/api'
import { notify } from '../lib/store'
import type { ConnectionHistoryEntry } from '../lib/types'
import { formatClock } from '../lib/format'

export function HistoryPage() {
  const [entries, setEntries] = useState<ConnectionHistoryEntry[]>([])
  const [confirmClear, setConfirmClear] = useState(false)

  const load = () => {
    api.get_history().then(setEntries).catch(() => setEntries([]))
  }

  useEffect(load, [])

  const clear = async () => {
    try {
      await api.clear_history()
      setEntries([])
      notify({ kind: 'info', title: 'History cleared' })
    } catch (e) {
      notify({ kind: 'error', title: 'Clear failed', message: (e as Error).message })
    }
  }

  return (
    <Section
      title="Connection History"
      subtitle="When devices connected and disconnected."
      actions={
        <Button variant="secondary" onClick={() => setConfirmClear(true)} disabled={entries.length === 0}>
          <Trash2 className="h-4 w-4" /> Clear
        </Button>
      }
    >
      {entries.length === 0 ? (
        <EmptyState icon={HistoryIcon} title="No history" description="Connection events will appear here." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[rgb(var(--border))]">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[rgb(var(--surface-2))] text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Device</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Connected</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--border))]">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-2 font-mono text-xs text-muted">{e.serial}</td>
                  <td className="px-4 py-2 uppercase text-xs text-muted">{e.kind}</td>
                  <td className="px-4 py-2 text-xs text-muted">{formatClock(e.connectedAt)}</td>
                  <td className="px-4 py-2">
                    <Badge tone={e.succeeded ? 'success' : 'danger'}>{e.succeeded ? 'connected' : 'failed'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Clear history"
        message="Remove all connection history entries?"
        confirmLabel="Clear"
        danger
        onConfirm={clear}
        onClose={() => setConfirmClear(false)}
      />
    </Section>
  )
}
