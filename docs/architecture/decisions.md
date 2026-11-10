# Architecture Decision Records — MirrorDeck

This document records the engineering decisions made while building MirrorDeck. Each
decision is an architectural commitment, not a temporary implementation detail.

---

## ADR-001 — Integrate the official `adb.exe` and `scrcpy.exe` (Nova engine); do not rewrite the engine

**Decision.** MirrorDeck treats Nova (Scrcpy) and ADB as external, official executables that it
locates, launches, monitors, and terminates. It never re-implements the Nova client
protocol, the ADB server, or the video/audio decode pipeline.

**Rationale.** The prompt requires preserving upstream functionality and not rewriting
the original engine. Nova's value (low latency, broad device compatibility, H.264/H.265
decode) lives in a C client that would be a multi-month reimplementation. Wrapping the
official binary preserves all of it and inherits upstream fixes.

**Consequences.**
- The app depends on two binaries (`adb.exe`, `scrcpy.exe`). A first-run dependency flow
  detects them and guides the user to bundle/install them (see `scripts/bootstrap.ps1`).
- License notices for both projects (Apache-2.0) are preserved in `docs/licenses/`.
- Version checks (`adb version`, `scrcpy --version`) are performed at runtime.

---

## ADR-002 — Nova renders in its own native window; the app hosts sessions, not pixels

**Decision.** The "Screen Mirror" section **launches** Nova as a managed child process
(which opens its own native window) and provides in-app session status, controls, and
recording. It does not embed the H.264/H.265 video frames inside the Tauri window.

**Rationale.** Nova has **no supported video-embedding sink on Windows**. Its only
embed surface is `--v4l2-sink` (Linux-only). Embedding on Windows would require
re-implementing the client (see ADR-001). Launching Nova's own window is the honest,
reliable path and is what production wrappers (guiscrcpy, QtScrcpy) do.

**Consequences.**
- Mouse/keyboard/touch control, fullscreen, rotation, screen-off, and clipboard all work
  through Nova's native window and flags — not simulated in the app.
- The app still provides a complete "studio" experience: per-device session cards,
  parameter presets (Battery Saver / Balanced / High Quality / Gaming / Custom), live
  status, and start/stop/record controls that map 1:1 to Nova flags.

---

## ADR-003 — No `@tauri-apps/api` dependency; own typed IPC bridge

**Decision.** The frontend imports nothing from `@tauri-apps/api`. It talks to the backend
through a single `src/lib/ipc.ts` bridge over `window.__TAURI_INTERNALS__.invoke`, with the
contract types centralized in `src/lib/types.ts` and mirrored in Rust (`AppError`, models).

**Rationale.** One fewer dependency, one authoritative contract, and the frontend builds
offline. The Tauri webview injects `__TAURI_INTERNALS__` automatically; no SDK is required
to call commands.

**Consequences.** The IPC surface is an explicit, reviewed list of `#[tauri::command]`
handlers. Nothing can reach the shell except through it.

---

## ADR-004 — Device state is polled; Rust also emits events

**Decision.** The frontend polls `list_devices` (1 s cadence, pausable) for device/session
state. The Rust backend additionally emits Tauri events (`device-changed`, `session-changed`)
for future SDK-based push subscribers.

**Rationale.** Polling is dead-simple, reliable, and needs no event-protocol dependency
(see ADR-003). It detects connect/disconnect with ≤1 s latency. Events are emitted so a
future push path exists without changing the contract.

---

## ADR-005 — Safe process management: argument arrays, `kill_on_drop`, registry

**Decision.** Every child process (ADB server, Scrcpy sessions, `adb` one-shot commands) is
spawned with `tokio::process::Command` using **argument arrays only** — never a shell string.
Long-running children are registered in a `ProcessManager` (`HashMap<SessionId, Child>`)
and terminated on shutdown or session-stop. `kill_on_drop(true)` is set as a backstop.

**Rationale.** Eliminates shell-injection risk, prevents orphaned `adb`/`scrcpy` processes,
and makes shutdown deterministic.

**Consequences.**
- The ADB server is started once and reused (never a fresh uncontrolled server per action).
- One-shot `adb` commands run with bounded timeouts and are reaped on drop.

---

## ADR-006 — SQLite (rusqlite) for persistence; no account, no telemetry

**Decision.** Saved/paired devices, connection history, recordings, automation sequences,
and settings persist in a local SQLite database (`mirrordeck.db`) under the app data
directory. There is no account system and no telemetry. The app is fully offline-capable;
only an explicit "check for updates" performs a network request.

**Rationale.** Local-first, private, and durable across restarts.

---

## ADR-007 — `adb shell` is exposed behind an allow-list, not free shell

**Decision.** The frontend cannot execute arbitrary shell. A `run_shell` command accepts a
small allow-list of read-only/no-destructive `adb shell` invocations (e.g. battery,
settings pages, `am start`). Everything else is a dedicated, validated command.

**Rationale.** Satisfies the security requirements: no unrestricted shell to the frontend,
all arguments validated, destructive operations require confirmation.
