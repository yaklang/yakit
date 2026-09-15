# 渲染进程崩溃与白屏恢复

适用范围：Link 连接页和 Main 主界面。实现位于 Electron 主进程，渲染进程已经退出时仍能记录诊断、显示原生恢复对话框和退出应用。

## 如何理解原来的三行日志

`Render gone / reason: crashed, exitCode: 10` 表示渲染进程异常结束，不是普通的 JavaScript 异常堆栈。如果日志来自 macOS，Chromium 118 的 POSIX 退出状态处理和 Darwin 的信号定义表明，`crashed + 10` 对应 `SIGBUS`。这只能说明结束方式，不能据此确定是内存不足、GPU、Electron/V8 缺陷还是某个业务页面引起。其他操作系统不能照搬数字 10 的解释。参见 [Chromium 118 退出状态实现](https://raw.githubusercontent.com/chromium/chromium/118.0.5993.54/base/process/kill_posix.cc) 和 [Darwin 信号定义](https://raw.githubusercontent.com/apple-oss-distributions/xnu/main/bsd/sys/signal.h)。

旧代码把 `app.getGPUInfo()` 和声明为 async 的进程指标函数返回值直接交给 `JSON.stringify()`，这些 Promise 会变成 `{}`。崩溃后只写结束原因和缓存日志，没有界面恢复动作；正常关闭流程还需要渲染端响应 IPC，因此白屏时可能连关闭也没有反应。

这次补充诊断与恢复能力。没有原始故障的 dump 和可重复触发步骤，不能宣称修复了截图中崩溃的根因。

## 使用方法

1. 可见的 Link 或 Main 发生进程异常退出、主页面加载失败或无响应时，原生对话框提供“恢复界面”“回到连接页”“导出诊断”“退出软件”。隐藏窗口只记录故障，显示后再提示。打包后的生产环境和 E2E 测试会自动弹框；开发环境为避免 Vite 编译慢或启动/重连时项目数据加载慢被误判，仅对“恢复超时”（窗口 20 秒内未就绪）静默处理、只记录事件，渲染进程崩溃、窗口无响应、主框架加载失败仍会弹窗。
2. 无论是否自动弹框，都可使用 `Cmd/Ctrl + Alt + R` 手动调出恢复对话框。macOS/Windows/Linux 均可通过 `View → 界面恢复` 进入，`View → 导出诊断` 用于直接导出诊断包（无需先触发恢复对话框）。Windows/Linux 的快捷键在应用窗口获得焦点时注册，macOS 由应用菜单处理。
3. “恢复界面”重载当前窗口。Main 复用现有的引擎凭据重放机制；Link 重新挂载启动页。恢复要等各自真实的应用 ready IPC，20 秒没有就绪会再次提示。无响应或上次重载超时后，重试会先请求终止渲染进程，收到旧进程的退出事件后才开始加载，避免异步终止把恢复加载一起取消。Electron 提供了[终止无响应渲染进程后重载的接口](https://www.electronjs.org/docs/latest/api/web-contents#contentsforcefullycrashrenderer)。
4. 同一窗口一分钟内累计三次故障，会暂停提供重复重载按钮。可以先导出诊断，再返回连接页或退出；没有自动循环重载。从故障对话框“回到连接页”会清除待重放凭据，释放 Main 旧渲染进程，并把这个窗口停在空白文档；只重载 Link。用户重新连接时才重新加载 Main 应用，避免故障页面在后台反复分配内存。保留 BrowserWindow 及其已注册的处理器，不主动终止引擎。
5. 数据库、localStorage 等已经持久化的数据仍可使用；仅在渲染内存中的编辑内容无法凭这项改动找回。恢复后应确认任务状态，尤其是与渲染端订阅或 stream 生命周期有关的操作，避免重复执行。引擎进程仍存活不等于所有任务都继续运行。

界面正常时仍沿用原有关闭确认。故障窗口关闭及原生 Quit 不再等待坏掉的渲染进程响应；退出前最多等待 1.5 秒刷日志。应用主进程本身退出或操作系统异常不在此界面恢复机制的范围内。

## 新增诊断内容与边界

在 `<Electron userData>/renderer-diagnostics` 保存最近十条事件 JSON（包括故障、恢复请求和恢复完成），内容包括窗口名称、窗口/webContents ID、最后记录到的渲染 PID、时间、原因/退出码、应用及 Electron/Chromium/V8 版本、系统和进程内存/CPU、GPU 信息及图形启动选项。每五秒采样一次，内存中最多保留十二次样本；故障时另取当前样本。这是短时观测，不能证明没有瞬间的内存峰值。

Main 与 Link 的 sandbox preload 每秒按主进程请求返回 JS 堆已用量、堆上限、可用量及 Blink 分配计数，单位为 KiB；不返回业务内容。每个窗口最多保留 60 个样本，每个样本携带 PID 和主进程接收时间。每个窗口最多一个待响应请求，卡死时不会不断向 IPC 队列追加请求。响应校验主框架和请求标识，导航会废弃旧请求。采样不依赖 React ready，过早崩溃仍可能没有样本。[Electron 27 process API](https://github.com/electron/electron/blob/v27.0.0/docs/api/process.md) 明确支持 sandbox 中读取这些计数。

`memoryAssessment` 区分 Electron 明报 `oom`、同一 PID 的十秒内样本显示 JS 堆使用达到 80% 的“疑似堆压力”、未观察到 JS 堆压力，以及数据缺失/陈旧的未知状态。原始 reason 和 exitCode 始终保留。达到 80% 时每个窗口每分钟最多另写一条本地压力事件，不弹框、不自动清理用户数据。内存相关故障对话框默认选中“回到连接页”，同时保留一次恢复尝试和导出入口。JS 堆不高不能排除原生分配、ArrayBuffer、GPU、系统内存不足或瞬间分配失败；高堆用量也不能单独证明崩溃原因。

GPU Promise 会被等待完成，单项最多 1.5 秒，失败或超时有明确字段；采集不阻塞窗口创建。日志句柄初始化也改为异步，避免文件系统卡住时耽误窗口创建和恢复 UI 出现。故障 JSON 同步写入，避免马上退出时只留下三行空泛日志。文件系统、原有日志落盘或 Crashpad 初始化失败时，恢复按钮仍可工作。

在创建窗口前启用本地 Crashpad，设置 `uploadToServer: false`，dump 位于该目录的 `Crashpad` 子目录。没有自动上传。初始化时机和本地保存方式遵循 [Electron crashReporter 文档](https://www.electronjs.org/docs/latest/api/crash-reporter)。SIGKILL、部分 OOM 或过早失败不保证有 dump；dump 按修改时间选择，不能只凭“最新文件”认定属于某次故障。Crashpad 目录由运行时维护，十条事件的保留上限不等于 dump 文件的保留上限。

用户主动导出的 ZIP 包含：

- 当前会话的 render、print、engine 日志尾部，每份最多 2 MiB，先刷新 500 毫秒缓冲及已发出的写操作。
- 最近十条事件 JSON，以及最近三份 dump；单文件大于 32 MiB 时明确记录省略原因。
- `manifest.json`：导出时快照、刷新状态、包含字节数、截断/缺失/复制失败说明；`dumpCollection` 明确区分已包含 dump、候选不可用和未发现 dump。

ZIP 先写独立临时文件，完成后原子替换目标；Windows 下目标文件已存在时先删除再重命名，兼容保存对话框的覆盖确认。失败清理临时产物。日志可能包含请求和业务数据，dump 可能含内存中的凭据片段；导出对话框提示分享前检查，不要直接公开上传完整诊断包。

## 当前版本已经白屏时的缓解

还没有此改动的版本，可先保存同一时段的 render、print、engine 三份日志；macOS 在“控制台”的崩溃报告里查找同一时刻的 Yakit Helper/Renderer 报告，记录当时使用的页面、数据规模和复现步骤。尝试系统菜单的重新加载，仍无法操作则退出后重开。不要为了排查直接删除工作区或数据库。

若恢复后立刻再次白屏，先返回连接页，再缩小待打开的数据量或并发任务，逐步确认触发条件。只有诊断中有 GPU 异常线索时，才把禁用 GPU 作为一次对照试验：完全退出应用后，在 macOS 执行 `open -a Yakit --args --disable-gpu`（名称以实际安装为准），比较同样操作是否仍复现；正常启动即可撤销此参数。它不是 `exitCode: 10` 的通用修复，也可能降低渲染性能。

## OOM 的客户侧处理与定位

白屏后先导出诊断，然后尝试恢复；立即复发时选择“回到连接页”，释放 Main 的应用堆。重新连接后先打开较小的数据范围，减少同时打开的流量、Fuzzer、编辑器和 AI 会话页面，记录能稳定触发问题的页面、数据量与操作顺序。已有业务 JS 异常会写入 render 日志；原生 OOM 通常来不及执行页面 error handler，需要看进程事件、崩溃前计数和 dump。

同样的操作在缩小数据范围后不再触发，只能作为负载相关线索。拿到业务复现后再针对分页/虚拟列表、缓存容量、订阅释放或大对象复制做优化，并用同一输入测量内存峰值和功能结果。这次实现优化的是恢复期间的资源释放与诊断容量边界，尚未定位或修复某个客户业务页面的内存泄漏。提高堆上限只能作为受控实验，不能替代这些检查；产品默认堆上限未改动。

不要在已经接近 OOM 时自动抓完整 heap snapshot：它需要额外内存，参见 [V8 heap snapshot 的内存与阻塞说明](https://nodejs.org/api/v8.html#v8getheapsnapshotoptions)。后台 Yak 进程存活并不保证渲染端绑定的 stream/任务仍在运行，恢复后应先查状态再决定是否重试。

## 可重复验证

无需新增测试依赖。轻量回归使用现有 Vitest，真实崩溃套件是本地可选的现有 WDIO suite，不加入常规 PR CI 的重型 Electron 任务。

```bash
yarn check-deps
yarn test:vitest run app/main --maxWorkers=2
yarn test:e2e:build
yarn test:e2e:electron:smoke
YAKLANG_MAIN_DIR=/absolute/path/to/yaklang \
  node scripts/run-electron-e2e.mjs --with-yak-engine --suite renderer-recovery
YAKIT_E2E_RENDERER_HEAP_MB=256 YAKLANG_MAIN_DIR=/absolute/path/to/yaklang \
  node scripts/run-electron-e2e.mjs --with-yak-engine --suite renderer-oom
```

真实套件创建临时 userData、应用配置和 Yak 引擎数据库，仅连接自行启动的 loopback 引擎。夹具兼容启动事件 schema v1/v2，仍校验 loopback 地址和 v2 的 TCP transport。自动化只替用户选择原生对话框按钮和保存路径，页面、渲染进程、IPC、日志、dump 和 gRPC Echo 都经过真实实现。

| 验证 | 方法与判定 |
| --- | --- |
| JS 异常与空白页面 | 在真实 Main 抛出 JS 异常并清空应用根节点，使用原生菜单恢复，检查真实项目卡片/Echo，以及导出包中的异常堆栈 |
| Main 原生崩溃 | 调用 Chromium `Page.crash` 触发原生崩溃，断言 `crashed`、新 PID、应用 ready IPC、主进程 PID 不变、真实 Echo 成功及默认项目卡片可接收点击（macOS Electron 27 的该注入产生退出码 5；截图的退出码 10 由事件分支单测覆盖） |
| 实际 V8 堆 OOM | 在独立实例限制 old space 为 256 MiB，保留 JS 数组直到堆耗尽；覆盖 Main、隐藏 Link、可见 Link。检查故障前堆计数、恢复新 PID、真实 ready/Echo、MDMP 格式及 `v8-oom-location: Reached heap limit` 原生注释 |
| 保存边界 | localStorage 标记保留，旧 window 内存标记消失 |
| Main 卡死 | 实际执行阻塞事件循环的 `while (true) {}`，再恢复到新进程并验证 Echo |
| 隐藏 Link 崩溃 | 记录 Link 故障，不打断 Main，Main Echo 仍成功 |
| 连续失败与返回连接页 | 检查重载限制，调用实际原生菜单，验证 Link 显示、Main 停在空文档、旧 Main PID 消失；再次连接后 Main 项目卡片/Echo 可用，引擎仍存活 |
| 诊断导出 | 解压真实 ZIP，检查三类日志、事件、manifest；macOS 要求包含实际生成的非空 dump |
| 可见 Link 崩溃 | 原生崩溃后新 PID、真实 Link ready IPC、启动页可见 |
| 外部强杀 | 向隔离实例的隐藏 Link PID 发送 SIGKILL，验证 `killed` 事件、没有新增 dump、Main Echo 仍成功；这是外部强杀代理，不等同于操作系统 OOM killer 实验 |
| 故障分支单测 | 异步终止先于加载、终止等待超时/关闭/退出/改为回连接页、恢复中反复 OOM、过早崩溃无样本、陈旧/旧 PID 采样、不接受死进程的迟到 ready、坏框架/nonce/非法数值、每窗口单个待响应请求、60 样本上限/压力写盘限频、OOM 无 dump 且日志刷新失败时仍能导出、异常退出/启动失败、子框架与中止导航过滤、超时、过期对话框、并发窗口隔离、磁盘/导出失败、关闭、日志刷新及大小限制 |

恢复后的 DOM、截图及 Echo 通过存活的主进程调用真实新渲染进程，避免 ChromeDriver 继续使用旧渲染进程的调试上下文。

WDIO/ChromeDriver 会禁用 Chromium hang monitor，所以卡死用例在真实阻塞 JS 后显式发出 `unresponsive` 事件；它验证后续恢复，不验证系统自动检测无响应的时间。原生对话框选择由测试自动处理，没有据此宣称人工视觉验收。OOM 注入期间临时关闭隐藏 Link 的后台节流，以使受限分配在实验时限内完成，结束后恢复原设置。分配有次数和时间上限，并先检查实际报告的堆上限；不耗尽整台宿主机内存。其他平台的真实 OOM、原生 dump 与快捷键仍需对应系统实测。

2026-09-13 在 macOS arm64、Electron 27.0.0 / Chromium 118.0.5993.54 上验证：主进程相关测试 212 项通过，1 项 Windows 专属测试按平台跳过；E2E 预检 68 项通过。两个渲染端构建已通过（渲染源码输入未变化）；现有 Electron smoke 7 项通过；原生崩溃与受限堆 OOM 套件各 7 项通过。最终普通崩溃产物目录为 `2026-09-13T11-06-27-384Z`，smoke 为 `2026-09-13T11-08-07-925Z`。

实测完整 Yakit 的 Main/Link V8 OOM 仍可能返回 `crashed`，最终受限堆实验 Main/Link 都为 `exitCode: 5`，而非 `reason: oom`。该轮 Main 崩溃前最近样本为 251583 KiB / 286720 KiB（87.7%，距故障 744 ms），Link 为 255858 KiB / 286720 KiB（89.2%，525 ms）；导出的两份原生 dump 包含 `v8-oom-location` 与 `Reached heap limit`。这是受限 JS 堆实验的证据，不是客户现场根因或真实系统内存耗尽的证据。Electron 27 的同类现象也有[上游可复现报告](https://github.com/electron/electron/issues/40426)。不同崩溃机制/运行配置的退出码会不同，不能仅据数字区分 OOM。

原始三行日志无法还原业务堆栈或找回已经消失的未保存内存。系统杀死整个应用、主进程 OOM、瞬间耗尽且来不及采样仍有观测/恢复边界，处理这些情况需要系统报告和下一次启动后的排查。

该轮 OOM 验证产物目录为 `reports/e2e-electron/2026-09-13T11-04-00-588Z/`。

完整测试产物在 `reports/e2e-electron/<run timestamp>/`，其中恢复套件额外写入 `renderer-recovery-report.json` 和诊断 ZIP。测试用 dump 不应提交到仓库。
