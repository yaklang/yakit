# 渲染进程崩溃与白屏恢复

适用范围：Link 连接页和 Main 主界面。实现位于 Electron 主进程，渲染进程已经退出时仍能记录诊断、显示原生恢复对话框和退出应用。

## 如何理解原来的三行日志

`Render gone / reason: crashed, exitCode: 10` 表示渲染进程异常结束，不是普通的 JavaScript 异常堆栈。如果日志来自 macOS，Chromium 118 的 POSIX 退出状态处理和 Darwin 的信号定义表明，`crashed + 10` 对应 `SIGBUS`。这只能说明结束方式，不能据此确定是内存不足、GPU、Electron/V8 缺陷还是某个业务页面引起。其他操作系统不能照搬数字 10 的解释。参见 [Chromium 118 退出状态实现](https://raw.githubusercontent.com/chromium/chromium/118.0.5993.54/base/process/kill_posix.cc) 和 [Darwin 信号定义](https://raw.githubusercontent.com/apple-oss-distributions/xnu/main/bsd/sys/signal.h)。

旧代码把 `app.getGPUInfo()` 和声明为 async 的进程指标函数返回值直接交给 `JSON.stringify()`，这些 Promise 会变成 `{}`。崩溃后只写结束原因和缓存日志，没有界面恢复动作；正常关闭流程还需要渲染端响应 IPC，因此白屏时可能连关闭也没有反应。

这次补充诊断与恢复能力。没有原始故障的 dump 和可重复触发步骤，不能宣称修复了截图中崩溃的根因。

## 使用方法

1. 可见的 Link 或 Main 发生进程异常退出、主页面加载失败或无响应时，原生对话框提供“恢复界面”“回到连接页”“导出诊断”“退出软件”。隐藏窗口只记录故障，显示后再提示。
2. 没有自动弹框的白屏，可使用 `Cmd/Ctrl + Alt + R`。macOS 也可从 `View → 界面恢复` 进入，`View → 导出诊断` 可以单独导出。Windows/Linux 的快捷键只在应用窗口获得焦点时注册。
3. “恢复界面”重载当前窗口。Main 复用现有的引擎凭据重放机制；Link 重新挂载启动页。恢复要等各自真实的应用 ready IPC，20 秒没有就绪会再次提示。无响应或上次重载超时后，重试会先替换渲染进程。Electron 提供了[终止无响应渲染进程后重载的接口](https://www.electronjs.org/docs/latest/api/web-contents#contentsforcefullycrashrenderer)。
4. 同一窗口一分钟内累计三次故障，会暂停提供重复重载按钮。可以先导出诊断，再返回连接页或退出；没有自动循环重载。“回到连接页”清除待重放凭据并重载两端，不主动终止引擎。
5. 数据库、localStorage 等已经持久化的数据仍可使用；仅在渲染内存中的编辑内容无法凭这项改动找回。恢复后应确认任务状态，尤其是与渲染端订阅或 stream 生命周期有关的操作，避免重复执行。引擎进程仍存活不等于所有任务都继续运行。

界面正常时仍沿用原有关闭确认。故障窗口关闭及原生 Quit 不再等待坏掉的渲染进程响应；退出前最多等待 1.5 秒刷日志。应用主进程本身退出或操作系统异常不在此界面恢复机制的范围内。

## 新增诊断内容与边界

在 `<Electron userData>/renderer-diagnostics` 保存最近十条事件 JSON（包括故障、恢复请求和恢复完成），内容包括窗口名称、窗口/webContents ID、最后记录到的渲染 PID、时间、原因/退出码、应用及 Electron/Chromium/V8 版本、系统和进程内存/CPU、GPU 信息及图形启动选项。每五秒采样一次，内存中最多保留十二次样本；故障时另取当前样本。这是短时观测，不能证明没有瞬间的内存峰值。

GPU Promise 会被等待完成，单项最多 1.5 秒，失败或超时有明确字段；采集不阻塞窗口创建。故障 JSON 同步写入，避免马上退出时只留下三行空泛日志。文件系统、原有日志落盘或 Crashpad 初始化失败时，恢复按钮仍可工作。

在创建窗口前启用本地 Crashpad，设置 `uploadToServer: false`，dump 位于该目录的 `Crashpad` 子目录。没有自动上传。初始化时机和本地保存方式遵循 [Electron crashReporter 文档](https://www.electronjs.org/docs/latest/api/crash-reporter)。SIGKILL、部分 OOM 或过早失败不保证有 dump；dump 按修改时间选择，不能只凭“最新文件”认定属于某次故障。Crashpad 目录由运行时维护，十条事件的保留上限不等于 dump 文件的保留上限。

用户主动导出的 ZIP 包含：

- 当前会话的 render、print、engine 日志尾部，每份最多 2 MiB，先刷新 500 毫秒缓冲及已发出的写操作。
- 最近十条事件 JSON，以及最近三份 dump；单文件大于 32 MiB 时明确记录省略原因。
- `manifest.json`：导出时快照、刷新状态、包含字节数、截断/缺失/复制失败说明。

ZIP 先写独立临时文件，完成后替换目标，失败清理临时产物。日志可能包含请求和业务数据，dump 可能含内存中的凭据片段；导出对话框提示分享前检查，不要直接公开上传完整诊断包。

## 当前版本已经白屏时的缓解

还没有此改动的版本，可先保存同一时段的 render、print、engine 三份日志；macOS 在“控制台”的崩溃报告里查找同一时刻的 Yakit Helper/Renderer 报告，记录当时使用的页面、数据规模和复现步骤。尝试系统菜单的重新加载，仍无法操作则退出后重开。不要为了排查直接删除工作区或数据库。

若恢复后立刻再次白屏，先返回连接页，再缩小待打开的数据量或并发任务，逐步确认触发条件。只有诊断中有 GPU 异常线索时，才把禁用 GPU 作为一次对照试验：完全退出应用后，在 macOS 执行 `open -a Yakit --args --disable-gpu`（名称以实际安装为准），比较同样操作是否仍复现；正常启动即可撤销此参数。它不是 `exitCode: 10` 的通用修复，也可能降低渲染性能。

## 可重复验证

无需新增测试依赖。轻量回归使用现有 Vitest，真实崩溃套件是本地可选的现有 WDIO suite，不加入常规 PR CI 的重型 Electron 任务。

```bash
yarn check-deps
yarn test:vitest run app/main --maxWorkers=2
yarn test:e2e:build
yarn test:e2e:electron:smoke
YAKLANG_MAIN_DIR=/absolute/path/to/yaklang \
  node scripts/run-electron-e2e.mjs --with-yak-engine --suite renderer-recovery
```

真实套件创建临时 userData、应用配置和 Yak 引擎数据库，仅连接自行启动的 loopback 引擎。夹具兼容启动事件 schema v1/v2，仍校验 loopback 地址和 v2 的 TCP transport。自动化只替用户选择原生对话框按钮和保存路径，页面、渲染进程、IPC、日志、dump 和 gRPC Echo 都经过真实实现。

| 验证 | 方法与判定 |
| --- | --- |
| Main 原生崩溃 | 调用 Chromium `Page.crash` 触发原生崩溃，断言 `crashed`、新 PID、应用 ready IPC、主进程 PID 不变、真实 Echo 成功及默认项目卡片可接收点击（macOS Electron 27 的该注入产生退出码 5；截图的退出码 10 由事件分支单测覆盖） |
| 保存边界 | localStorage 标记保留，旧 window 内存标记消失 |
| Main 卡死 | 实际执行阻塞事件循环的 `while (true) {}`，再恢复到新进程并验证 Echo |
| 隐藏 Link 崩溃 | 记录 Link 故障，不打断 Main，Main Echo 仍成功 |
| 连续失败与返回连接页 | 检查重载限制，调用实际原生菜单，验证 Link 显示、Main 隐藏及引擎仍存活 |
| 诊断导出 | 解压真实 ZIP，检查三类日志、事件、manifest；macOS 要求包含实际生成的非空 dump |
| 可见 Link 崩溃 | 原生崩溃后新 PID、真实 Link ready IPC、启动页可见 |
| 故障分支单测 | OOM/异常退出/启动失败、子框架与中止导航过滤、超时、过期对话框、并发窗口隔离、磁盘/导出失败、关闭、日志刷新及大小限制 |

恢复后的 DOM、截图及 Echo 通过存活的主进程调用真实新渲染进程，避免 ChromeDriver 继续使用旧渲染进程的调试上下文。

WDIO/ChromeDriver 会禁用 Chromium hang monitor，所以卡死用例在真实阻塞 JS 后显式发出 `unresponsive` 事件；它验证后续恢复，不验证系统自动检测无响应的时间。原生对话框选择由测试自动处理，没有据此宣称人工视觉验收。其他平台的原生 dump 与快捷键仍需对应系统实测。

2026-09-13 在 macOS arm64、Electron 27.0.0 / Chromium 118.0.5993.54 上验证：主进程相关测试 194 项通过，1 项 Windows 专属测试按平台跳过；E2E 预检 68 项通过；两个渲染端构建成功（Main 为 production-unminified，Link 为生产构建）；现有 Electron smoke 7 项通过；上述真实恢复场景 5 项通过。原生崩溃为故意注入，不代表复现了用户现场的具体根因。

完整测试产物在 `reports/e2e-electron/<run timestamp>/`，其中恢复套件额外写入 `renderer-recovery-report.json` 和诊断 ZIP。测试用 dump 不应提交到仓库。
