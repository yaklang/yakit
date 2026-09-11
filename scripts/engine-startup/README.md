# Engine startup compatibility

Local startup deliberately uses the existing authenticated loopback TCP protocol.
Do not automatically enable Unix sockets or Windows named pipes based on the engine
version: older engines do not recognize those flags. IPC support in the engine is
opt-in and is separate from this client compatibility change.

The startup manager generates a fresh cryptographic password and probes with the
same immutable credentials that it commits to the connection settings. It also
checks that an anonymous Echo is rejected. A ready event or log line alone cannot
complete startup. Failed or cancelled attempts close their RPC clients, settle
their promises, and terminate only child processes owned by this manager.

## Automated client tests

```sh
yarn test:engine-startup
yarn test:vitest app/main/handlers/__test__/newEngineStatus.test.js --run --maxWorkers=1
cd app/renderer/engine-link-startup
yarn type-check
yarn i18n:check
yarn test run src/pages/StartupPage --maxWorkers=1
```

The main-process suite covers legacy and structured diagnostics, split output,
timeouts, spawn failures, authentication, stale callbacks, cancellation, and real
TCP connections using the production gRPC client factory. The Windows integration
case starts and terminates an owned process tree. Mock process tests never invoke
the host's real process termination command.

The renderer suite covers retry recovery, credential invalidation, and stale
check/connect responses. CI installs frozen dependencies without Electron download
or native install scripts, uses bounded jobs and RPCs, and uploads JUnit results.

## Real engine experiments

Download explicitly versioned, already published engine binaries from the CDN
and verify their SHA-256 before executing them. Do not compile engines for this
test or follow the moving `latest` pointer. From the Yakit repository, pass the
verified binaries:

```sh
node scripts/engine-startup/verify-real-engine.cjs /absolute/yak-old /absolute/yak-new
```

Each binary gets disposable databases and a temporary home containing spaces and
Unicode. The experiment verifies random credentials, authenticated startup,
rejection of empty/masked/wrong credentials, secret redaction, port conflict
recovery, and owned-child cleanup. The JSON output includes binary SHA-256 hashes.
The Windows CI job downloads these Windows x64 binaries from
`https://yaklang.oss-accelerate.aliyuncs.com/yak/<version>/yak_windows_amd64.exe`
and checks the hashes pinned in the workflow before running the same experiments:

| Coverage           | Published version    | SHA-256                                                            |
| ------------------ | -------------------- | ------------------------------------------------------------------ |
| Older release      | `1.4.8-beta17`       | `017d3fd2dcde3399f0b26940be94a8d4bb941be2504ccbf36949a67c01eb9d8a` |
| Current test alpha | `1.4.8-alpha0910ipc` | `351ba169c3ee77b936a619c3f649aa3a4b13d8a692b906176429d527b8ab9a0c` |

Updating a version or replacing an alpha artifact requires an explicit hash
update. A failed download or mismatched hash fails the job; it does not fall back
to source compilation or skip engine verification.

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
