import { useCallback, useEffect, useState } from 'react'
import {
  FolderOpen,
  File as FileIcon,
  ArrowUp,
  RefreshCw,
  Upload,
  Download,
  Trash2,
  Pencil,
  FolderPlus,
  ChevronRight,
} from 'lucide-react'
import { Section } from '../components/Section'
import { DevicePicker } from '../components/DevicePicker'
import { Button, ConfirmDialog, EmptyState, IconButton, Input, Modal, Spinner, Tooltip } from '../components/ui'
import { useDevices, notify } from '../lib/store'
import { api } from '../lib/api'
import type { AppFileEntry } from '../lib/types'
import { formatBytes, formatRelativeTime } from '../lib/format'

function parentPath(path: string): string {
  const parts = path.split('/').filter(Boolean)
  parts.pop()
  return parts.length === 0 ? '/' : '/' + parts.join('/')
}

function join(a: string, b: string): string {
  return a.endsWith('/') ? a + b : `${a}/${b}`
}

function basename(p: string): string {
  return p.split(/[\\/]/).pop() ?? p
}

export function FileManagerPage() {
  const devices = useDevices((s) => s.devices)
  const [serial, setSerial] = useState<string | undefined>()
  const [cwd, setCwd] = useState('/sdcard')
  const [entries, setEntries] = useState<AppFileEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  const [deleting, setDeleting] = useState<AppFileEntry | null>(null)
  const [renaming, setRenaming] = useState<AppFileEntry | null>(null)
  const [newName, setNewName] = useState('')
  const [mkdirOpen, setMkdirOpen] = useState(false)
  const [newFolder, setNewFolder] = useState('')

  const connected = devices.filter((d) => d.state === 'device')

  const load = useCallback(
    async (dir: string, s?: string) => {
      const target = s ?? serial
      if (!target) return
      setLoading(true)
      try {
        setEntries(await api.list_files(target, dir))
      } catch (e) {
        notify({ kind: 'error', title: 'Failed to list directory', message: (e as Error).message })
        setEntries([])
      } finally {
        setLoading(false)
      }
    },
    [serial],
  )

  useEffect(() => {
    if (serial) load(cwd, serial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serial])

  const navigate = (dir: string) => {
    setCwd(dir)
    load(dir)
  }

  const upload = async () => {
    if (!serial) return
    const local = await api.pick_file()
    if (!local) return
    setBusy(true)
    try {
      await api.push_file(serial, local, join(cwd, basename(local)))
      notify({ kind: 'success', title: 'Upload complete', message: basename(local) })
      load(cwd)
    } catch (e) {
      notify({ kind: 'error', title: 'Upload failed', message: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const download = async (entry: AppFileEntry) => {
    if (!serial) return
    const folder = await api.pick_folder()
    if (!folder) return
    setBusy(true)
    try {
      await api.pull_file(serial, entry.path, join(folder, entry.name))
      notify({ kind: 'success', title: 'Download complete', message: entry.name })
    } catch (e) {
      notify({ kind: 'error', title: 'Download failed', message: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const doDelete = async () => {
    if (!serial || !deleting) return
    try {
      await api.delete_file(serial, deleting.path)
      notify({ kind: 'info', title: 'Deleted', message: deleting.name })
      load(cwd)
    } catch (e) {
      notify({ kind: 'error', title: 'Delete failed', message: (e as Error).message })
    } finally {
      setDeleting(null)
    }
  }

  const doRename = async () => {
    if (!serial || !renaming) return
    try {
      await api.rename_file(serial, renaming.path, join(parentPath(renaming.path), newName.trim()))
      notify({ kind: 'success', title: 'Renamed' })
      load(cwd)
    } catch (e) {
      notify({ kind: 'error', title: 'Rename failed', message: (e as Error).message })
    } finally {
      setRenaming(null)
    }
  }

  const doMkdir = async () => {
    if (!serial || !newFolder.trim()) return
    try {
      await api.mkdir(serial, join(cwd, newFolder.trim()))
      notify({ kind: 'success', title: 'Folder created' })
      setMkdirOpen(false)
      setNewFolder('')
      load(cwd)
    } catch (e) {
      notify({ kind: 'error', title: 'Create folder failed', message: (e as Error).message })
    }
  }

  const crumbs = cwd.split('/').filter(Boolean)

  return (
    <Section
      title="File Manager"
      subtitle="Browse and transfer files on the accessible device storage."
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={upload} disabled={!serial || busy}>
            <Upload className="h-4 w-4" /> Upload
          </Button>
          <Button variant="secondary" onClick={() => setMkdirOpen(true)} disabled={!serial}>
            <FolderPlus className="h-4 w-4" /> New folder
          </Button>
          <IconButton onClick={() => load(cwd)} disabled={!serial || loading} aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </IconButton>
        </div>
      }
    >
      {connected.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No device connected" description="Connect a device to browse its storage." />
      ) : (
        <div className="space-y-3">
          <DevicePicker value={serial} onChange={setSerial} />

          <div className="flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] px-3 py-2">
            <Tooltip label="Up one level" side="bottom">
              <IconButton onClick={() => navigate(parentPath(cwd))} disabled={cwd === '/'} aria-label="Up">
                <ArrowUp className="h-4 w-4" />
              </IconButton>
            </Tooltip>
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm">
              <button type="button" onClick={() => navigate('/')} className="shrink-0 text-[var(--accent)]">
                /
              </button>
              {crumbs.map((c, i) => (
                <span key={i} className="flex shrink-0 items-center gap-1">
                  <ChevronRight className="h-3.5 w-3.5 text-muted" />
                  <button type="button" className="text-muted hover:text-[rgb(var(--text))]" onClick={() => navigate('/' + crumbs.slice(0, i + 1).join('/'))}>
                    {c}
                  </button>
                </span>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : entries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[rgb(var(--border))] py-10 text-center text-xs text-muted">
              Empty directory.
            </p>
          ) : (
            <ul className="divide-y divide-[rgb(var(--border))] overflow-hidden rounded-xl border border-[rgb(var(--border))]">
              {entries.map((e) => (
                <li key={e.path} className="flex items-center gap-3 bg-[rgb(var(--surface))] px-3 py-2 hover:bg-[rgb(var(--surface-2))]">
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => (e.isDirectory ? navigate(e.path) : download(e))}>
                    {e.isDirectory ? (
                      <FolderOpen className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                    ) : (
                      <FileIcon className="h-4 w-4 shrink-0 text-muted" />
                    )}
                    <span className="truncate text-[13px]">{e.name}</span>
                  </button>
                  <span className="hidden w-24 text-right text-xs text-muted sm:block">{e.isDirectory ? '—' : formatBytes(e.sizeBytes)}</span>
                  <span className="hidden w-24 text-right text-xs text-muted md:block">{e.modifiedAt ? formatRelativeTime(e.modifiedAt) : '—'}</span>
                  <div className="flex items-center gap-1">
                    {!e.isDirectory && (
                      <Tooltip label="Download" side="top">
                        <IconButton onClick={() => download(e)} aria-label="Download">
                          <Download className="h-4 w-4" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip label="Rename" side="top">
                      <IconButton onClick={() => { setRenaming(e); setNewName(e.name) }} aria-label="Rename">
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip label="Delete" side="top">
                      <IconButton onClick={() => setDeleting(e)} aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </Tooltip>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="text-xs text-muted">
            Android scoped-storage and permissions may limit which directories are visible or writable.
          </p>
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete"
        message={`Delete “${deleting?.name ?? ''}” permanently? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={doDelete}
        onClose={() => setDeleting(null)}
      />

      <Modal open={!!renaming} onClose={() => setRenaming(null)} title="Rename">
        <div className="space-y-4">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRenaming(null)}>Cancel</Button>
            <Button onClick={doRename}>Rename</Button>
          </div>
        </div>
      </Modal>

      <Modal open={mkdirOpen} onClose={() => setMkdirOpen(false)} title="New folder">
        <div className="space-y-4">
          <Input value={newFolder} onChange={(e) => setNewFolder(e.target.value)} placeholder="Folder name" autoFocus />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setMkdirOpen(false)}>Cancel</Button>
            <Button onClick={doMkdir}>Create</Button>
          </div>
        </div>
      </Modal>
    </Section>
  )
}
