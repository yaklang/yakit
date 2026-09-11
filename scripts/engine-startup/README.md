# IPC-first startup smoke tests

Yakit owns one main-process engine session shared by Link and Main. Local startup
defaults to Windows named pipes or macOS/Linux Unix sockets. An explicit TCP
choice stays TCP. Remote Host/Port/TLS behavior is separate.

## Safety contract

- Main generates a fresh random endpoint and password for every new instance.
  IPC has no fabricated port. Renderer DTOs never contain passwords or command lines.
- Check and ready endpoints must match the requested endpoint before authenticated
  RPCs. Startup requires authenticated Echo success **and** anonymous Echo rejection.
- Automatic fallback is limited to one TCP attempt, after confirmed child exit,
  with explicit unsupported-IPC-flag or classified IPC-bind evidence. Unknown
  failures, endpoint mismatches, authentication errors, database errors, ordinary
  timeouts and cancellation never trigger fallback.
- Check/start each share a 180-second budget across both attempts, with a
  360-second operation cap. At 20 seconds a one-time migration hint is shown;
  it does not claim a migration has been detected.
- Reconnect uses a trusted instance ID, not credentials from process discovery.
  Only current-session children may be stopped. Discovered external engines are
  read-only. A failed stop blocks replacement and engine-file mutation.
- Restoring the embedded engine is transactional and never deletes project data.
  No automatic restart is performed after a failed restore.

## Fixed CDN artifacts (no engine compilation)

`engines.json` pins **1.4.8-alpha0911ipc** for Windows x64, Linux x64 and macOS
arm64, plus Windows **1.4.8-beta17** as a historical TCP sample. Each platform has
its own SHA-256. Downloads are from
`https://yaklang.oss-accelerate.aliyuncs.com/yak/<version>/<file>`.
No latest pointer, source build, public release or OSS write is used.

```sh
node scripts/engine-startup/download-engine.cjs ipc /absolute/cache
node scripts/engine-startup/verify-electron-ipc.cjs /absolute/downloaded-yak 1 matrix
# Optional repeated IPC startup/stop check:
node scripts/engine-startup/verify-electron-ipc.cjs /absolute/downloaded-yak 100 ipc ipc
```

The matrix executes auto IPC, IPC-only and explicit TCP using the locked Electron
27 runtime and grpc-js client, even with unusable proxy variables. IPC is tested
while the fallback TCP port is occupied. It exercises cancellation/recovery,
business RPC, negative authentication, disconnect/reconnect, endpoint/password
freshness, secret redaction and confirmed owned-child cleanup. All databases are
temporary, in a Unicode/space-containing home.

Windows historical checks:

```sh
node scripts/engine-startup/verify-real-engine.cjs /absolute/legacy-yak
node scripts/engine-startup/verify-electron-ipc.cjs /absolute/legacy-yak 1 auto manual-tcp
```

**beta17 caveat:** its checker silently ignores IPC flags and reports TCP.
Yakit correctly rejects that mismatched endpoint; a separate explicit TCP choice
then succeeds. This sample is not evidence of automatic unsupported-flag fallback.
That branch is covered by deterministic CLI-diagnostic lifecycle tests.

## Existing project scaffolding

Use the Node version required by package.json (at least 22.22.0), installed frozen
dependencies, and the repository CLI. Do not run the source-engine E2E suites for
this CDN-only task.

```sh
yarn check-deps
yarn test:engine-startup
yarn test:vitest app/main/handlers/__test__/newEngineStatus.test.js --run --maxWorkers=1
cd app/renderer/engine-link-startup
yarn type-check
yarn i18n:check
yarn test run src/pages/StartupPage --maxWorkers=1
cd ../../..
yarn test:e2e:preflight
yarn test:e2e:build
yarn test:e2e:electron:smoke
yarn test:e2e:electron:ipc
```

For development-renderer acceptance, start both renderers using
`yarn cli start -v yakit`, then:

```sh
node scripts/run-electron-e2e.mjs --dev-renderers --with-cdn-engine --suite ipc-startup
```

The runner verifies HTTP 200 and root/script content on ports 3000/5173 before
starting Electron. Its CDN fixture installs into disposable userData/YAKIT_HOME,
does not pre-start the engine, and never uses the user's installed engine/database.
`YAKIT_E2E_CDN_BINARY` may point to an already downloaded binary; the same manifest
hash is still mandatory. `YAKIT_E2E_STARTUP_POLICY=auto|ipc|tcp` selects the initial
UI scenario. The UI test checks real Link-to-Main handoff, Echo, project entry,
endpoint header, management controls, stop, policy change and a fresh restart.
Screenshots/metadata live under `reports/e2e-electron/<run-id>`.

## CI

The `启动测试` workflow has three parallel jobs: windows-2022, macos-15 and
ubuntu-24.04. Only PR changes under `app/main/**` trigger it automatically;
renderer-only, documentation-only and fixture-only changes do not. Manual dispatch
is available. Draft PR run/job names have a **[WIP]** prefix without skipping checks.

The exact workflow download step and unchanged verifier were also run locally on
Windows with Node 24.19.0: both CDN binaries passed hash verification and all
startup, authentication, redaction, port-conflict and cleanup checks.

To exercise the unmodified legacy Yakit IPC handlers against the repaired engine:

```sh
git show de89a81859ab914f5b5aae7c842cd6cc630dfccc:app/main/handlers/newEngineStatus.js > /tmp/yakit-legacy-startup.js
node scripts/engine-startup/verify-legacy-client.cjs /tmp/yakit-legacy-startup.js /absolute/yak-new
```

This harness supplies Electron IPC registration, disposable paths, and real gRPC
clients to the original module. It verifies that the old client receives a usable
random password and still recognizes the legacy port-conflict reason.

## Verification scope

Earlier source-built experiments used engine
`65467f3cf73d9803b9cee7754008dd317611e3ca` and Yakit
`de89a81859ab914f5b5aae7c842cd6cc630dfccc`, with repaired engine
`4f7863298e6cabdeb4ad25e7321743d6a93dd2a3` in yaklang/yaklang#5043.
CI now uses the published CDN versions listed above, not those source builds.
These experiments exercise startup, authentication, and recovery; they do not
replace a packaged Electron GUI smoke test or establish compatibility with every
historical release. Engine IPC platform testing is tracked separately.

## PR 4249 review follow-up (Windows, alpha0910ipc)

The existing branch already verifies both authenticated Echo success and anonymous
Echo rejection before committing a connection. This follow-up keeps TCP and all
existing Electron channels; it does not add Unix socket or named-pipe support.

- Closing-window notifications are best-effort, including delayed progress and
  database messages from child-process output.
- The process list has no trusted credentials. Its direct-switch button is
  disabled with guidance to use connection settings. Switching must not probe
  anonymously or terminate the current engine on failure. Process details display
  PID, parent PID and port only, not command lines containing local passwords.
- Silent checker exits retain the `antivirus_blocked` recovery route, but are not
  asserted to be antivirus failures: a crash or other process failure is possible.
  Exit code and signal remain in diagnostics; users are advised to inspect logs
  and security-software events, not disable protection indiscriminately.
- Legacy and main-process errors use localized recovery advice when the engine
  supplies no message in the selected language. Unknown errors use the caller's
  localized fallback; detailed Chinese diagnostics remain available in logs.
- Check results are accepted from stdout or stderr. Multiple marked results are
  rejected rather than accepting a contradictory success result.
- The real-engine verifier rebinds the original startup port after disposal;
  reserving a different port is not evidence that cleanup succeeded.

Self-check and engine-start stages each have a 180-second deadline. Startup RPC
probes remain cancellable with a 2-second deadline per probe. An explicit connection
has one 10-second budget; local authenticated and anonymous-rejection probes share
that absolute deadline. Authentication rejection fails immediately. Cleanup retains
its bounded 4-second process-exit wait. At 20 seconds, each still-pending check/start emits a one-time hint
explaining that a major-version database migration may take extra time and is
usually a one-time operation. The hint does not assert that migration is occurring.
Timers are cleared on success, failure, cancellation and supersession. Subsequent
progress messages do not erase the migration hint.

Recovery actions first await cleanup of this manager's owned processes before
checking or starting again. External port owners are never terminated. Concurrent
cleanup calls share the same result, and new operations wait for cleanup to settle.
After a cleanup failure, the user can retry cancellation; another check/start is
blocked until cleanup succeeds.

`cancel()`, `dispose()`, and `EngineLink:cancel-all-tasks` return either
`{ ok: true, canceled, status: 'cancelled' }` or
`{ ok: false, canceled, status: 'process_error', message }`. The count includes
confirmed completed cancellations only: an active operation counts once, including
its child; each retained child counts once. Failed cleanup does not authorize
check, start, installation, or mode switching. The renderer displays localized
recovery guidance for both business failures and rejected IPC calls.

Cleanup logs use the existing engine log sink with `cleanup_start` and
`cleanup_result` events. Fields are `operationId`, `stage`, `ownedChildPid`,
`exitCode`, `signal`, `confirmedExit`, and `elapsedMs`; credentials and command-line
arguments are excluded. Logging is best-effort and never changes the cleanup result.

Local validation uses the installed Windows x64 `1.4.8-alpha0910ipc` engine,
SHA-256 `351ba169c3ee77b936a619c3f649aa3a4b13d8a692b906176429d527b8ab9a0c`,
with disposable homes/databases. This verifies authenticated startup, credential
rejection, redaction, occupied-port recovery and release of the original port.
It does not migrate or modify the user's existing project databases, and does not
claim that a real large-database migration was reproduced. Timing behavior is
covered with deterministic fake-clock tests at 20 and 180 seconds.

Validation on Windows completed with 61 main-process tests and 65 startup-renderer
tests passing, Link TypeScript and locale parity checks passing, ESLint reporting
no errors, and the community Link production build passing. The real-engine
experiment also passes under both Node 24.19.0 and Electron 27's Node 18.17.1.
These are local verification results; PR comments are not marked resolved remotely
until the corresponding changes have been reviewed and published.

## Recovery and cancellation follow-up (macOS)

The repair adds regressions for queued operations invalidated by a later cancel,
cleanup failure blocking a replacement connection, and the parent page waiting
before retry, port change, installation, or either remote-mode entry. Explicit
connection tests cover a 3-second response, a 10-second timeout, immediate auth
rejection, and a shared local authentication deadline. TCP and TLS tests use real
loopback servers; their test certificate is not a production credential.

The real-engine verifier also exercises a failed RPC while an owned child is
still alive, then confirms cleanup before same-port restart and a later port
change. Each check must produce new credentials. This simulates RPC failure with
wrong credentials; it does not reproduce an operating-system network outage.

macOS verification uses the already-installed engine with SHA-256
`0e27d266de388c6e837beab7fc268b36136de4733836d28ad6ba22a2a98b147a`, disposable
databases, Node 26.7.0 and Electron 27's Node 18.17.1. This local verification does
not replace Windows process-tree CI or packaged Electron GUI checks on each OS.

Each real startup smoke step has a two-minute cap. Cold dependency/CDN preparation
is separate and may take longer; the whole job has a ten-minute limit. Logs,
SHA/runtime metadata and JUnit results are retained as Actions artifacts. These
are startup/authentication smoke tests, not a packaged installer or full-product
cross-platform GUI certification.
