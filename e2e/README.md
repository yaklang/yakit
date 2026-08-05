# Yakit Electron E2E Runbook

This directory contains the repeatable Electron automation entrypoints. The runner owns every process and temporary file needed by a test; developers and CI must not pre-start Electron or Yak manually.

## Suites

| Suite | Command | Yak boundary | Intended use |
| --- | --- | --- | --- |
| Shell Smoke | `yarn test:e2e:electron:smoke` | Simulated engine-ready handoff | Fast Electron/Renderer/preload/IPC/window lifecycle regression |
| Real Engine | `yarn test:e2e:electron:real-engine` | Compiled `yaklang-main` worktree, real gRPC and Echo | Startup UI, Link WatchDog, Main handoff and cross-window engine connectivity |
| MITM V2 Performance | `YAKIT_E2E_MITM_PROFILE=standard yarn test:e2e:electron:mitm-performance` | Real engine plus loopback HTTP target/producer | Correctness, end-to-end latency, CPU/RSS and before/after comparison |

Build both static Renderer artifacts once before running a suite:

```bash
yarn test:e2e:build
```

The default E2E build uses production React with minification disabled. This
keeps local/WSL memory bounded while preserving production scheduling behavior;
reports identify it as `production-unminified`. Use
`yarn test:e2e:build:minified` only on a fixed performance worker with enough
memory. Never compare reports from the two build modes.

For a tighter local memory ceiling, override only the Renderer child process:

```bash
YAKIT_E2E_RENDERER_NODE_OPTIONS=--max-old-space-size=3072 \
  yarn build-test-render-e2e
```

The bounded helper writes `yakit-e2e-build.json` after a successful Renderer
build. The complete `test:e2e:build` command then builds the Link Renderer; no
manual metadata step is required.

The metadata is schema v2 and includes a content hash of the Main Renderer
build inputs (`app/renderer/src/main`, `app/protos`, root `package.json`, and
`yarn.lock`). Before creating isolated data, compiling Yak, or starting
Electron, the runner rejects a missing, legacy, or stale artifact with exit code
2 and tells the caller to run `yarn test:e2e:build`. Documentation and E2E-only
changes do not force a Renderer rebuild; a changed Renderer input always does.

On a local checkout matching the standard `code/ts` + `code/go` layout, the runner discovers `yaklang-main` automatically. Otherwise set an absolute worktree path:

```bash
YAKLANG_MAIN_DIR=/absolute/path/to/yaklang-main \
  yarn test:e2e:electron:real-engine
```

## Standard Local Workflow

Use the complete local gate before handing off changes to the Electron runner,
startup flow, engine fixture, or gRPC connection contract:

```bash
yarn test:e2e:electron:local
```

That command deliberately runs these stages in order and stops on the first
failure:

1. build the Main and Link Renderer test artifacts;
2. run the isolation and Yak-fixture preflight tests;
3. run the fast shell/window/IPC Smoke suite;
4. build and start the current Yak worktree, then run the real-engine suite.

During short feedback loops, run only the narrowest affected stage. A backend
CLI or connection-contract change still requires the real-engine suite before
handoff. The runner—not the developer—chooses the port, starts Yak, waits for
Echo, forwards credentials to WDIO, terminates the process tree, and removes
the isolated databases.

## MITM V2 HTTP Performance

The first performance scene is intentionally HTTP-only. It does not install a
CA or depend on public sites:

```text
real Yak + isolated project
→ UI selects [default] and starts MITM V2 on 127.0.0.1:<random>
→ bounded Node producer sends absolute-form HTTP proxy requests
→ loopback target verifies every scenario token and sequence
→ project DB and visible virtual table must contain every flow
→ Renderer observability, Long Tasks, Electron metrics and Yak /proc metrics are captured
→ UI stops MITM and the runner proves both listeners/process trees are closed
```

Profiles are explicit; `stress` is never selected implicitly:

| Profile | Requests | Concurrency | Request body | Response body | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| `smoke` | 40 | 4 | 0 | 32 KiB | Fast correctness and harness iteration |
| `standard` | 200 | 8 | 0 | 64 KiB | Local before/after evidence |
| `stress` | 1,000 | 16 | 0 | 64 KiB | Scheduled/fixed-worker diagnosis only |

Before load, harness version 5 requires three consecutive Electron/Yak CPU
samples below 25%, followed by five more accepted baseline samples. Any spike
restarts the gate. Long Tasks are collected only inside the load/drain window,
so navigation and startup work cannot contaminate the result. The report also
records the configured and observed request/response bytes plus the live-cycle
trigger, cursor, high-water, row count, packet bytes and stop reason. Dedicated
stream runs additionally record the Renderer-observed live refresh minimum
interval; a matrix rejects interval drift between its repeated samples.

Run baseline and candidate with the same profile, machine, Renderer mode and
resource settings, then compare their reports:

```bash
yarn perf:mitm:electron:compare \
  --baseline reports/e2e-electron/<before>/mitm-performance.json \
  --candidate reports/e2e-electron/<after>/mitm-performance.json \
  --out reports/e2e-electron/<after>/comparison.json
```

The single-run comparator first enforces correctness and cleanup, then rejects
profile, system, harness or metric-coverage drift. A metric is a regression only
when it exceeds both the default 15% threshold and its unit-specific absolute
noise floor. Scheduler idle gaps and Long Task count are diagnostic because a
more responsive consumer naturally wakes more often. Long Task blocking ratio
is also diagnostic: its denominator is the load/drain observation window, so a
faster candidate can have a larger ratio merely because it drains sooner. Long
Task absolute total duration, p95 and maximum remain gating metrics. Use at
least three `standard` samples on a fixed worker before claiming a performance
improvement.

Request and response body scaling uses a declarative matrix. The checked-in
matrix covers small packets, request-heavy, response-heavy and bidirectional
traffic while keeping total transfer bounded:

```bash
yarn test:e2e:electron:mitm-matrix
```

Use `--case request-64k` for the 120-request feedback-loop case,
`--case request-64k-medium` for the bounded 600-request/concurrency-12
signal-amplification case, or `--matrix-file` for a different reviewed JSON
configuration. The runner executes cases sequentially,
uses a fresh project database and Electron profile per case, reuses only an
identical content-addressed Yak build, and writes `summary.json` plus
`summary.md` below `reports/e2e-electron/matrices/`. A request-body case sends a
real POST body and asserts the exact byte count observed by the loopback target.
The MITM metadata/list query also asserts that both raw packet fields are absent.
After load, renderer drain, Long Task observation and CPU recovery have ended,
the scene calls `GetHTTPFlowById` and verifies the exact request and response body
sizes again. This proves that list projection did not damage the detail contract
without allowing a large detail IPC transfer to distort the performance window.
The same post-window correctness phase records the virtual table DOM footprint,
scrolls it to 1,120 px, verifies that the first rendered row changes without an
empty window, then restores the table to the original first row and scroll
position. These checks exercise overscan and row recycling without contaminating
the measured load/drain window.
Matrix cases describe scaling; performance regressions are decided by comparing
the same case before and after a code change.

Compressed responses use a separate reviewed matrix so decoded Body size is not
confused with bytes transferred on the wire:

```bash
yarn test:e2e:electron:mitm-compressed
```

The larger bounded compressed canary combines the same decoded/wire-byte oracle
with fixed-rate scheduling and CPU recovery:

```bash
yarn test:e2e:electron:mitm-compressed-fixed-rate
```

It sends 400 gzip responses at 100 requests/s with 256 KiB decoded bodies
(100 MiB decoded in total). Keep this sequential; it is intentionally separate
from the fast 120-request compressed regression matrix.

`responseContentEncoding` currently accepts `identity` or `gzip`. The loopback
target records both the configured decoded Body bytes and actual compressed wire
bytes. The producer verifies the `Content-Encoding` header and exact wire byte
count, while the post-window `GetHTTPFlowById` check verifies that MITM persisted
the exact decoded Body size. The encoding is part of report and matrix comparison
identity, so compressed and identity runs cannot be compared accidentally.

The fixed-rate matrix separates producer scheduling from request completion:

```bash
yarn test:e2e:electron:mitm-fixed-rate
```

Harness version 9 schedules each request by its intended start time, atomically
resets fixture and Renderer counters immediately before the load window, and
requires the committed-shadow initial snapshot to be omitted. It also records
the response content encoding and decoded/wire byte contract. Reports include
schedule lag, actual dispatch rate, completion throughput, stop-time backlog and
recovery. This makes a late producer distinguishable from a saturated proxy.
The suite is bounded and strictly sequential. Its default follows the product's
`canary` live mode; pass `--httpflow-live-stream-mode shadow` for an explicit
legacy Query-path baseline.

For a checked-in three-sample Query-path gate, use:

```bash
node scripts/run-electron-mitm-body-matrix.mjs \
  --matrix-file e2e/config/mitm-compressed-fixed-rate-matrix.json \
  --case gzip-response-256k-fixed-rate \
  --repeat 3 \
  --httpflow-live-stream-mode shadow
```

It runs the reviewed 400-request, 100 requests/s, gzip 256 KiB case in strict
`shadow` mode. The summary must report a stable non-zero `queryCount`,
400 query matches, zero direct rows, exact database/wire/detail correctness and
clean shutdown. Compare equal-version-count baseline and candidate matrices;
do not compare this Query gate with a `canary`/direct matrix.

`--disable-system-timing` is a trace-only isolation switch and requires
`--httpflow-live-stream-mode off`. The dedicated stream bootstraps its project
generation and database identity from `QueryHTTPFlow.SystemTiming`; requesting
`shadow` or `canary` while removing that identity cannot produce a valid stream
measurement, so the matrix runner rejects the combination before starting Yak.

For a stability sample, repeat each selected case strictly sequentially:

```bash
yarn test:e2e:electron:mitm-matrix:repeat

# Or repeat one reviewed case from 1 through 10 times.
node scripts/run-electron-mitm-body-matrix.mjs \
  --case bidirectional-64k-256k \
  --repeat 3
```

Every repetition starts with a fresh project database and Electron user-data
directory. The matrix keeps the original scalar `measurements` contract as the
median and adds `measurementDistributions` with min, P50, P95, max, mean,
population standard deviation, median absolute deviation, coefficient of
variation and relative range. `summary.md` renders each value as
`p50 [min..max]`. Its backend/live table includes persistence queue P50/P95,
write P95, database detection P95, Duplex delivery P95, trigger-to-query P95
and persist-to-React P95. Repeats prove stability; a before/after claim still requires
the same number of baseline and candidate samples on the same fixed worker.

To isolate exact `COUNT(*)` cost without rebuilding the Renderer, run the same
case and repeat count with `--disable-skip-total`. The switch changes only the
MITM live incremental query; bootstrap, history/filter queries and periodic
total reconciliation continue to request an exact total in the normal product
path. Treat the result as a segmented backend A/B, not as an automatic claim
that end-to-end latency improved.

To isolate SQLite connection-pool serialization, keep the same case, repeat
count and live mode while selecting the reviewed two-connection backend
candidate:

```bash
node scripts/run-electron-mitm-body-matrix.mjs \
  --case bidirectional-64k-256k \
  --repeat 3 \
  --flow-committed-mode canary \
  --sqlite-project-max-open-conns 2
```

The default is `1`. Reports and matrix summaries record the selected value;
the generic single-report comparator rejects cross-mode comparisons. Compare
the two three-run matrix summaries with an explicit experimental allowlist:

```bash
yarn perf:mitm:electron:matrix-compare \
  --baseline <max1-matrix>/summary.json \
  --candidate <max2-matrix>/summary.json \
  --case bidirectional-64k-256k \
  --allow-diagnostic sqliteProjectMaxOpenConns \
  --out <comparison.json> \
  --markdown-out <comparison.md>
```

The matrix comparator requires at least three sequential, correct runs per
group, identical body/concurrency/profile settings and identical diagnostics
except fields named by `--allow-diagnostic`. It reports medians and both ranges
but remains evidence-only; it does not turn noisy WSL samples into a release
gate. If a historical matrix lacks a newly added metric, or a timing has fewer
than the required samples, only that metric becomes diagnostic with an explicit
`metric-coverage-mismatch` or `insufficient-samples` status. All other fully
covered metrics remain comparable. Configuration/correctness drift still fails
the entire comparison, and the missing fields are listed in both JSON and
Markdown. A zero baseline is rendered as “percent unavailable” rather than
`NaN`; it is never presented as a percentage improvement.

To isolate direct consumption of the body-free `SubscribeHTTPFlows` stream,
keep the legacy `FlowCommitted` channel in shadow mode in both groups and vary
only the dedicated stream. Use the fixed-rate scene and run the groups
sequentially:

```bash
# Baseline: existing Query consumer; dedicated stream observes only.
node scripts/run-electron-mitm-body-matrix.mjs \
  --matrix-file e2e/config/mitm-fixed-rate-matrix.json \
  --repeat 3 \
  --flow-committed-mode shadow \
  --httpflow-live-stream-mode shadow

# Candidate: compatible committed summaries update the list directly.
node scripts/run-electron-mitm-body-matrix.mjs \
  --matrix-file e2e/config/mitm-fixed-rate-matrix.json \
  --repeat 3 \
  --flow-committed-mode shadow \
  --httpflow-live-stream-mode canary

yarn perf:mitm:electron:matrix-compare \
  --baseline <stream-shadow-matrix>/summary.json \
  --candidate <stream-canary-matrix>/summary.json \
  --case fixed-rate-small \
  --allow-diagnostic httpFlowLiveStreamMode \
  --out <comparison.json> \
  --markdown-out <comparison.md>
```

The candidate must reach the scenario high-water without Gap, sequence gap,
duplicate, out-of-order, invalid-envelope, unavailable or unexpected-end
events. It must also report the expected direct-row count and no fallback rows.
The matrix records direct batches, rows, fallback rows, batch-size distribution,
delivery timing and event counts. The A/B decision still uses end-to-end
visibility, persistence/React timing, Long Task, CPU, memory, throughput and the
existing traffic/body correctness contract.

The direct scheduler makes the first row after idle visible immediately and
uses a 100 ms minimum/sustained interval, switching to the sustained path at
eight pending rows. It caps batches/pending rows at 256/2,048. Timer-driven list
updates use React `unstable_batchedUpdates`. Reports record these scheduler
values and the MITM table overscan so comparisons cannot silently mix product
settings. `httpFlowLiveRefreshMinIntervalMs` remains the 700 ms Query-recovery
scheduler setting and is recorded separately. A Gap, stream failure,
incompatible view/cursor, project/filter change, scroll away from the top, or
active recovery Query cancels pending direct rows and returns to the Query
path.

The retained 3+3 evidence is
`body-2026-07-24T09-58-01-917Z` versus
`body-2026-07-24T10-03-34-990Z`, with
`comparison-vs-shadow-direct-batched.{json,md}` in the candidate matrix. All
candidate samples inserted 1,000/1,000 rows directly in 11--12 batches, with no
fallback and no live-list Query. The follow-up exact reconciliation matches
legacy shadow and committed direct-list events by database identity, project
generation, and ID in either arrival order. Report
`2026-07-24T10-37-01-314Z` matched 1,000/1,000 and ended with zero pending and
zero direct rows without a shadow event; its single sample is a correctness
check, not replacement performance evidence. After the later Phase 36 fixed-rate
and slow-consumer gates, the product default is `canary`; the Query path remains
the compatibility and recovery fallback.

Run the bounded slow-consumer recovery matrix separately:

```bash
yarn test:e2e:electron:mitm-slow-consumer
```

Both cases produce traffic at a fixed rate, scroll the MITM table away from the
top at 25% progress, keep producing until 75%, then return to the top. The gate
requires an observed direct-to-Query fallback, recovery entry and completion,
exact reconciliation of every `FlowCommitted` event with either a direct or
Query row, zero unmatched rows/events, and equal database/backend/visible high
water. It deliberately rejects a table that reaches the final maximum ID while
retaining a hole in the middle. Direct insertion stays closed after fallback
until an exhausted Query covers both the fallback high water and current stream
cursor and that Query result has committed in React. A newer stream event
invalidates the pending reopen candidate.

The retained passing reports are `2026-07-24T11-22-46-115Z` (800 requests at
120 req/s, 0/4 KiB bodies) and `2026-07-24T11-27-17-125Z` (240 requests at
30 req/s, 64/256 KiB bodies). Both ended with exact reconciliation, zero pending
and zero stream backlog. Request-to-React timing in this matrix includes the
intentional off-top interval and must not be compared directly with top-follow
latency A/B.

If an older matrix predates a reporting-only case field but is known to have
used the same runtime value, the exception must be explicit and remains visible
in the generated comparison:

```bash
yarn perf:mitm:electron:matrix-compare \
  --baseline <older-matrix>/summary.json \
  --candidate <current-matrix>/summary.json \
  --case bidirectional-64k-256k \
  --allow-diagnostic httpFlowLiveRefreshMinIntervalMs \
  --allow-case-config httpFlowLiveRefreshMinIntervalMs
```

`--allow-case-config` is not a general compatibility bypass. Every named field
is recorded as an experimental difference, and any unlisted body, concurrency
or scheduler difference still fails the comparison.

The safer read-isolation candidate keeps the writer pool at one connection and
opens one separate SQLite `mode=ro`, `query_only` connection used only by
`QueryHTTPFlows`:

```bash
node scripts/run-electron-mitm-body-matrix.mjs \
  --case bidirectional-64k-256k \
  --repeat 3 \
  --flow-committed-mode canary \
  --sqlite-project-max-open-conns 1 \
  --sqlite-project-read-pool-conns 1
```

Compare it to the same current-code `read-pool=0` control by allowing only
`sqliteProjectReadPoolConns` to differ. The default is `0`; this remains an
experiment until write latency, lock safety and end-to-end visibility all pass.

### Bounded Renderer content tracing

Renderer tracing is an explicit diagnostic mode for attributing Long Tasks to
JavaScript, style/layout, paint/composite, GC and IPC work:

```bash
yarn test:e2e:electron:mitm-renderer-trace

# Or select another reviewed body case.
node scripts/run-electron-mitm-body-matrix.mjs \
  --case request-64k \
  --renderer-trace
```

The fixture reuses the main Renderer CDP connection already owned by WDIO; it
does not enable an additional production remote-debugging flag or open a new
listener. Capture uses a 16 MiB `recordUntilFull` trace buffer, a shared
30-second stop/flush/read deadline, 1 MiB stream reads and a 64 MiB artifact
limit. Only the Yakit main page target is accepted. The resulting
`renderer-trace.json` is accompanied by `renderer-trace-summary.json`, which
deduplicates nested task envelopes and reports only Renderer-main-thread tasks
of at least 50 ms plus bounded inclusive attribution. Each retained task also
records its native source when available, the most expensive nested events, IPC
interface/payload/data bytes, and layout element/object/root details. Inclusive
trace durations can overlap and must not be added together.

Renderer trace, Yak CPU profile and Yak heap profile are mutually exclusive,
require `--repeat 1`, and mark the performance report `diagnosticOnly`; the A/B
comparator rejects them. Re-run the same case without tracing for a gateable
sample. Electron Main `contentTracing` is intentionally not used because its
stop/flush path blocked the Main automation bridge on the current Electron 27
WSLg fixture.

`--disable-system-timing` is a trace-only diagnostic control for testing the
cost of backend timing fields; it is not a product mode and requires
`--renderer-trace`. Do not add Chromium invalidation-tracking categories to the
default capture: on the current fixture they produced severe observer effect
(4.3 seconds of Long Tasks, with a 1.6-second maximum) and destroyed the task
envelope needed for comparison.

The latest bounded overscan experiment keeps the global table default unchanged
and uses 5 rows only for MITM instead of the previous effective 10. A three-run
local comparison reduced median Long Task total from 357 to 166 ms and blocking
ratio from 9.89% to 4.41%; request-to-React P95 changed from 1,209 to 1,130 ms.
First-visible and Query P95 were noisier and slower, so this is retained on the
deterministic DOM/layout reduction and scroll-correctness evidence, not claimed
as an across-the-board performance win. The corresponding matrix reports are
`body-2026-07-23T04-00-31-083Z` and `body-2026-07-23T04-59-24-854Z`.

### Bounded Yak CPU profiling

CPU profiling is an explicit diagnostic mode, not part of normal performance
A/B. The convenience command profiles the request-heavy case for five seconds:

```bash
yarn test:e2e:electron:mitm-cpu-profile
```

Select another body case or duration directly through the matrix runner:

```bash
node scripts/run-electron-mitm-body-matrix.mjs \
  --case bidirectional-64k-256k \
  --cpu-profile-seconds 5
```

The duration must be an integer from 1 through 60. When enabled, the fixture
builds a separate Yak binary with diagnostic symbols, starts pprof only on an
OS-assigned `127.0.0.1` port, captures during load without blocking the producer,
and bounds download size and shutdown time. The output contains the raw profile,
flat and cumulative `go tool pprof` reports, and a structured summary. A
profiled report is marked `diagnosticOnly`; the comparison CLI rejects it even
when every correctness check passes. Re-run the same case without
`--cpu-profile-seconds` for a gateable candidate.

### Bounded Yak heap/allocation profiling

Heap profiling is also an explicit diagnostic mode and is mutually exclusive
with CPU profiling. The convenience command runs the bidirectional large-body
case:

```bash
yarn test:e2e:electron:mitm-heap-profile
```

Or select a reviewed body case directly:

```bash
node scripts/run-electron-mitm-body-matrix.mjs \
  --case bidirectional-64k-256k \
  --heap-profile
```

After the idle gate, the harness captures `yak-heap-baseline.pprof` through
`/debug/pprof/heap?gc=1`. After load, database/Renderer drain and CPU recovery,
it forces GC again and captures `yak-heap-post.pprof`. Sequential `go tool
pprof` analysis reports baseline-subtracted `alloc_space`, positive
`inuse_space` differences and the absolute post-run live heap. Each download is
limited to 64 MiB and 30 seconds, uses only the OS-assigned loopback pprof
address, and leaves CPU profiling disabled. Forced GC changes the run, so the
report is `diagnosticOnly` and cannot be used by the A/B comparator. Always run
the same case once more without `--heap-profile` for a gateable result.

## Real Engine Lifecycle

The `--with-yak-engine` runner contract performs these steps in order:

1. Validate the backend worktree (`go.mod` and `common/yak/cmd/yak.go`).
2. Record backend Git HEAD, dirty state, Go version, GOOS and GOARCH.
3. Build Yak with bounded parallelism and memory into a cache or disposable directory.
4. Create isolated `YAKIT_HOME`, profile DB and project DB paths.
5. Start `yak grpc` on `127.0.0.1:0`; the OS chooses the port.
6. Parse the versioned `yak grpc ready` event and reject non-loopback addresses.
7. Retry the real Echo RPC until the server accepts calls.
8. Start one WDIO worker and pass only the fixture host/port/PID through its environment.
9. Drive the startup UI: confirm workspace, accept the agreement, choose remote engine, replace host/port through keyboard events, read both values back exactly, and connect.
10. Verify Echo once more from the visible Main Renderer.
11. Stop Electron, then terminate the complete Yak process tree with SIGTERM and bounded SIGKILL fallback.
12. Delete only the runner-created temporary root after a prefix check.

The original `yak grpc ok` line remains supported for older scripts, but this fixture requires the versioned ready event and a successful Echo. A log line or open TCP port alone is not considered ready.

## Build Cache Rules

- Clean and dirty `yaklang-main` worktrees use a content-addressed cache keyed by Git HEAD, the complete tracked diff, untracked file names and contents, Go version, GOOS, GOARCH and fixture build-contract version.
- Any source-state change invalidates the cache; identical dirty worktrees can therefore reuse one Yak build across sequential matrix cases without accepting a stale binary.
- Yak builds use an E2E-owned `GOCACHE` and `GOTMPDIR`; both are removed after every real build and cleared again before the next fixture starts, including recovery from an interrupted prior run.
- The content-addressed Yak binary cache retains the six newest build identities by default. `YAKIT_E2E_YAK_BUILD_CACHE_MAX_ENTRIES` may set a reviewed bound from 1 through 32; unrelated directories are never removed.
- A local temporal A/B may pass `--yak-build-fingerprint <20-hex>` to the matrix runner. The value can select only an existing executable in this managed cache; a missing, malformed, or diagnostic combination fails before load. Reports retain both the selected binary fingerprint and the current source fingerprint, plus whether they match. This override is for deliberate same-window attribution only, never normal CI or release baselines.
- No binary is written into the backend repository root.

## Resource Controls

Defaults are intentionally conservative for local/WSL Smoke runs:

| Environment variable | Default | Meaning |
| --- | --- | --- |
| `YAKIT_E2E_GO_MAX_PROCS` | `2` | Go build package parallelism and `GOMAXPROCS` |
| `YAKIT_E2E_GO_MEMORY_LIMIT` | `2GiB` | Go build soft memory limit |
| `YAKIT_E2E_ENGINE_MAX_PROCS` | `2` | Yak runtime `GOMAXPROCS` |
| `YAKIT_E2E_ENGINE_MEMORY_LIMIT` | `2GiB` | Yak runtime soft memory limit |
| `YAKIT_SQLITE_PROJECT_MAX_OPEN_CONNS` | `1` | Experimental project SQLite pool size; `2` enables the reviewed WAL read-concurrency candidate |
| `YAKIT_SQLITE_PROJECT_READ_POOL_CONNS` | `0` | Experimental `mode=ro`, `query_only` pool used only by `QueryHTTPFlows`; `1` is the reviewed candidate |
| `YAKIT_E2E_YAK_BUILD_TIMEOUT_MS` | `900000` | Build deadline |
| `YAKIT_E2E_YAK_BUILD_FINGERPRINT` | unset | Exact existing 20-hex managed-cache build for deliberate local temporal A/B only |
| `YAKIT_E2E_YAK_START_TIMEOUT_MS` | `120000` | Structured ready-event deadline |
| `YAKIT_E2E_YAK_ECHO_TIMEOUT_MS` | `60000` | Echo readiness deadline |
| `YAKIT_E2E_MITM_PROFILE` | `smoke` | Explicit `smoke`, `standard`, or `stress` HTTP load |
| `YAKIT_E2E_MITM_RESPONSE_CONTENT_ENCODING` | `identity` | Loopback response encoding: `identity` or `gzip`; matrix runner sets this from the case |
| `YAKIT_E2E_MITM_FLOW_COMMITTED_MODE` | `shadow` | Legacy committed notification mode: `off`, `shadow`, or `canary` |
| `YAKIT_E2E_MITM_HTTPFLOW_LIVE_STREAM_MODE` | `canary` | Dedicated body-free HTTPFlow stream mode: `off`, `shadow`, or `canary` |
| `YAKIT_E2E_RESOURCE_SAMPLE_INTERVAL_MS` | `200` | Electron/Yak resource sampling interval |
| `YAKIT_E2E_IDLE_CPU_THRESHOLD_PERCENT` | `25` | Per-side CPU ceiling for a valid idle baseline |
| `YAKIT_E2E_IDLE_STABLE_SAMPLES` | `3` | Consecutive idle/recovery samples required |
| `YAKIT_E2E_IDLE_TIMEOUT_MS` | `30000` | Deadline for a stable pre-load baseline |
| `YAKIT_E2E_BASELINE_SAMPLE_COUNT` | `5` | Accepted samples after the idle gate |
| `YAKIT_E2E_RECOVERY_TIMEOUT_MS` | `10000` | Post-load CPU recovery observation window |
| `YAKIT_E2E_YAK_CPU_PROFILE_SECONDS` | unset | Opt-in Yak CPU capture duration, integer `1..60`; profiled reports are diagnostic-only |
| `YAKIT_E2E_YAK_HEAP_PROFILE` | unset | Set to `1` for baseline/post forced-GC heap allocation diagnostics; mutually exclusive with CPU profiling |
| `YAKIT_E2E_RENDERER_TRACE` | unset | Set to `1` for bounded Renderer CDP tracing; mutually exclusive with CPU/heap profiling and repeat runs |
| `YAKIT_E2E_KEEP_TEMP` | unset | Set to `1` only for explicit local diagnosis |
| `YAKIT_E2E_AUTO_XVFB` | unset | Set to `1` on a Linux worker configured for Xvfb |

Performance baselines must record and hold these values constant. WSL is suitable for correctness Smoke, not for release CPU/paint thresholds.

## Artifacts

Every run writes `reports/e2e-electron/<run-id>/`:

- `report.json`: stable machine-readable run status and engine build identity;
- `run-metadata.json`: complete local execution metadata;
- `yak-build.log`: Go build output;
- `yak-engine.stdout.log` / `yak-engine.stderr.log`: real engine lifecycle logs;
- `logs/`: WDIO and ChromeDriver logs;
- `<test>.png` and `<test>.application.json`: screenshot, windows and process metrics on failure.
- `mitm-performance.json`: raw correctness, timing, observability and resource samples plus stable comparable metrics; MITM matrix runs also include the post-window virtual-table DOM snapshot and scroll/restore result;
- `comparison.json`: optional baseline/candidate decision produced by the comparison CLI.
- `yak-cpu.pprof`: optional raw Yak CPU profile from an explicit diagnostic run;
- `yak-cpu-top.txt`, `yak-cpu-top-cumulative.txt` and `yak-cpu-summary.json`: optional bounded pprof analysis artifacts.
- `yak-heap-baseline.pprof` / `yak-heap-post.pprof`: optional forced-GC snapshots from an explicit heap diagnostic run;
- `yak-heap-alloc-delta-*`, `yak-heap-inuse-*` and `yak-heap-summary.json`: optional allocation/live-heap difference reports and structured summary.
- `renderer-trace.json` / `renderer-trace-summary.json`: optional bounded raw CDP trace and compact Renderer-main-thread attribution from an explicit trace run.

The report records whether the backend was dirty, whether the content-addressed build cache was used, the loopback address, and the engine stop result. Database paths are stored only relative to the disposable root.

## Failure Policy

- No fixed sleeps are used as business readiness checks.
- PR suites do not retry failed specs.
- An unexpected Yak exit fails the run and terminates WDIO.
- A cleanup failure changes the final status to failed.
- A test must not bind Yak, targets, or proxies to a non-loopback address.
- Visible DevTools is never a readiness signal; WDIO uses background CDP.
- The startup driver uses a DOM click only when WebDriver explicitly reports an
  `xterm-` canvas intercepting the agreement checkbox, then verifies selection;
  unrelated click failures are not suppressed.

## Failure Triage Order

1. Read `report.json` for the failed stage, engine identity and cleanup result.
2. Read the matching WDIO log and `<test>.application.json` for the active
   window, URL, crash state and Electron process metrics.
3. Inspect `<test>.png` for the last user-visible state.
4. For real-engine failures, correlate `yak-engine.stdout.log`,
   `yak-engine.stderr.log` and `yak-build.log` using the recorded address.
5. Re-run only after classifying the failure; do not add a fixed pause or a
   retry to make an unknown failure disappear.

The startup form driver validates the final DOM values before submitting. This
keeps an input-automation fault distinct from a gRPC readiness, connection or
window-handoff failure.
