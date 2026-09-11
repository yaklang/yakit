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

Each real startup smoke step has a two-minute cap. Cold dependency/CDN preparation
is separate and may take longer; the whole job has a ten-minute limit. Logs,
SHA/runtime metadata and JUnit results are retained as Actions artifacts. These
are startup/authentication smoke tests, not a packaged installer or full-product
cross-platform GUI certification.
