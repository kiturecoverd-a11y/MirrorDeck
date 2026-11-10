import { useEffect, useState } from 'react'
import { Workflow, Plus, Trash2, Play, Save, ListChecks } from 'lucide-react'
import { Section } from '../components/Section'
import { DevicePicker } from '../components/DevicePicker'
import { Badge, Button, ConfirmDialog, EmptyState, IconButton, Input, Select } from '../components/ui'
import { notify } from '../lib/store'
import { api } from '../lib/api'
import { uid } from '../lib/id'
import type { AutomationSequence, AutomationStep, AutomationActionType } from '../lib/types'

const STEP_TYPES: { value: AutomationActionType; label: string }[] = [
  { value: 'launch_app', label: 'Launch app' },
  { value: 'shell_command', label: 'Shell command' },
  { value: 'open_settings', label: 'Open settings page' },
  { value: 'screenshot', label: 'Take screenshot' },
  { value: 'start_mirror', label: 'Start mirroring' },
  { value: 'stop_mirror', label: 'Stop mirroring' },
  { value: 'wait', label: 'Wait' },
]

const SETTINGS_PAGES: { value: string; label: string }[] = [
  { value: 'android.settings.SETTINGS', label: 'Settings' },
  { value: 'android.settings.WIFI_SETTINGS', label: 'Wi-Fi' },
  { value: 'android.settings.WIRELESS_SETTINGS', label: 'Network & internet' },
  { value: 'android.settings.DISPLAY_SETTINGS', label: 'Display' },
  { value: 'android.settings.APPLICATION_SETTINGS', label: 'Apps' },
  { value: 'android.settings.DEVELOPER_SETTINGS', label: 'Developer options' },
]

function emptyStep(): AutomationStep {
  return { id: uid(), type: 'wait', params: { seconds: '1' } }
}

export function AutomationPage() {
  const [sequences, setSequences] = useState<AutomationSequence[]>([])
  const [draft, setDraft] = useState<AutomationSequence | null>(null)
  const [deleting, setDeleting] = useState<AutomationSequence | null>(null)
  const [running, setRunning] = useState(false)

  const load = () => {
    api.get_sequences().then(setSequences).catch(() => setSequences([]))
  }

  useEffect(load, [])

  const newSequence = () => {
    setDraft({ id: uid(), name: 'New sequence', serial: '', steps: [emptyStep()] })
  }

  const updateStep = (id: string, patch: Partial<AutomationStep>) => {
    if (!draft) return
    setDraft({ ...draft, steps: draft.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) })
  }

  const save = async () => {
    if (!draft) return
    try {
      await api.save_sequence(draft)
      notify({ kind: 'success', title: 'Sequence saved' })
      setDraft(null)
      load()
    } catch (e) {
      notify({ kind: 'error', title: 'Save failed', message: (e as Error).message })
    }
  }

  const run = async () => {
    if (!draft) return
    setRunning(true)
    try {
      await api.run_sequence(draft)
      notify({ kind: 'success', title: 'Sequence completed', message: draft.name })
    } catch (e) {
      notify({ kind: 'error', title: 'Sequence failed', message: (e as Error).message })
    } finally {
      setRunning(false)
    }
  }

  const doDelete = async () => {
    if (!deleting) return
    try {
      await api.delete_sequence(deleting.id)
      load()
    } catch (e) {
      notify({ kind: 'error', title: 'Delete failed', message: (e as Error).message })
    } finally {
      setDeleting(null)
    }
  }

  return (
    <Section
      title="Automation"
      subtitle="Build and run reusable device action sequences."
      actions={
        <Button onClick={newSequence}>
          <Plus className="h-4 w-4" /> New sequence
        </Button>
      }
    >
      {!draft && sequences.length === 0 ? (
        <EmptyState icon={Workflow} title="No sequences" description="Create a sequence like: connect device → launch app → wait → screenshot.">
          <Button size="sm" onClick={newSequence}>
            <Plus className="h-4 w-4" /> New sequence
          </Button>
        </EmptyState>
      ) : !draft ? (
        <ul className="space-y-2">
          {sequences.map((s) => (
            <li key={s.id} className="card flex items-center justify-between gap-3 p-4">
              <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setDraft(s)}>
                <ListChecks className="h-4 w-4 shrink-0 text-muted" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{s.name}</p>
                  <p className="text-xs text-muted">{s.steps.length} steps</p>
                </div>
              </button>
              <IconButton onClick={() => setDeleting(s)} aria-label="Delete sequence">
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-4">
          <div className="card space-y-4 p-5">
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Sequence name" />
            <DevicePicker value={draft.serial} onChange={(serial) => setDraft({ ...draft, serial })} />

            <div className="space-y-2">
              {draft.steps.map((step, i) => (
                <div key={step.id} className="rounded-xl border border-[rgb(var(--border))] p-3">
                  <div className="flex items-center gap-2">
                    <Badge tone="accent">{i + 1}</Badge>
                    <Select<AutomationActionType>
                      value={step.type}
                      onChange={(type) => updateStep(step.id, { type, params: {} })}
                      options={STEP_TYPES}
                    />
                    <IconButton
                      onClick={() => setDraft({ ...draft, steps: draft.steps.filter((x) => x.id !== step.id) })}
                      aria-label="Remove step"
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                  <StepFields step={step} onChange={(params) => updateStep(step.id, { params })} />
                </div>
              ))}
            </div>

            <Button variant="secondary" onClick={() => setDraft({ ...draft, steps: [...draft.steps, emptyStep()] })}>
              <Plus className="h-4 w-4" /> Add step
            </Button>

            <div className="flex gap-2 border-t border-[rgb(var(--border))] pt-4">
              <Button onClick={save}>
                <Save className="h-4 w-4" /> Save
              </Button>
              <Button variant="secondary" onClick={run} disabled={running || !draft.serial}>
                <Play className="h-4 w-4" /> {running ? 'Running…' : 'Run'}
              </Button>
              <Button variant="ghost" onClick={() => setDraft(null)}>
                Cancel
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted">
            Steps run in order. Destructive actions require confirmation, and shell commands are restricted
            to a safe allow-list on the backend.
          </p>
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete sequence"
        message={`Delete “${deleting?.name ?? ''}”?`}
        confirmLabel="Delete"
        danger
        onConfirm={doDelete}
        onClose={() => setDeleting(null)}
      />
    </Section>
  )
}

function StepFields({ step, onChange }: { step: AutomationStep; onChange: (params: Record<string, string>) => void }) {
  const p = step.params
  switch (step.type) {
    case 'launch_app':
      return <Input className="mt-2" placeholder="Package name (e.g. com.android.settings)" value={p.package ?? ''} onChange={(e) => onChange({ package: e.target.value })} />
    case 'shell_command':
      return <Input className="mt-2" placeholder="Allow-listed command (e.g. getprop ro.product.model)" value={p.command ?? ''} onChange={(e) => onChange({ command: e.target.value })} />
    case 'open_settings':
      return (
        <div className="mt-2">
          <Select value={p.page ?? SETTINGS_PAGES[0].value} onChange={(page) => onChange({ page })} options={SETTINGS_PAGES} />
        </div>
      )
    case 'screenshot':
      return <Input className="mt-2" placeholder="Output path (optional)" value={p.path ?? ''} onChange={(e) => onChange({ path: e.target.value })} />
    case 'wait':
      return <Input className="mt-2" type="number" min={1} placeholder="Seconds" value={p.seconds ?? '1'} onChange={(e) => onChange({ seconds: e.target.value })} />
    default:
      return null
  }
}
