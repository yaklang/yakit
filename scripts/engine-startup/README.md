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

Build the engine entry point at explicit revisions with its supported Go toolchain:

```sh
go build -mod=readonly -o /absolute/path/to/yak ./common/yak/cmd/yak.go
```

From the Yakit repository, pass only explicitly selected engine binaries:

```sh
node scripts/engine-startup/verify-real-engine.cjs /absolute/yak-old /absolute/yak-new
```

Each binary gets disposable databases and a temporary home containing spaces and
Unicode. The experiment verifies random credentials, authenticated startup,
rejection of empty/masked/wrong credentials, secret redaction, port conflict
recovery, and owned-child cleanup. The JSON output includes binary SHA-256 hashes.
The Windows CI job pins and builds both source revisions; it never downloads a
moving `latest` engine.

To exercise the unmodified legacy Yakit IPC handlers against the repaired engine:

```sh
git show de89a81859ab914f5b5aae7c842cd6cc630dfccc:app/main/handlers/newEngineStatus.js > /tmp/yakit-legacy-startup.js
node scripts/engine-startup/verify-legacy-client.cjs /tmp/yakit-legacy-startup.js /absolute/yak-new
```

This harness supplies Electron IPC registration, disposable paths, and real gRPC
clients to the original module. It verifies that the old client receives a usable
random password and still recognizes the legacy port-conflict reason.

## Verification scope

The compatibility baseline is engine `65467f3cf73d9803b9cee7754008dd317611e3ca`
and Yakit `de89a81859ab914f5b5aae7c842cd6cc630dfccc`. The repaired engine is
`4f7863298e6cabdeb4ad25e7321743d6a93dd2a3` in yaklang/yaklang#5043.
These experiments exercise startup, authentication, and recovery; they do not
replace a packaged Electron GUI smoke test or establish compatibility with every
historical release. Engine IPC platform testing is tracked separately.
