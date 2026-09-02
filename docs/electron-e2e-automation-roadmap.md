# Yakit Electron 自动化测试路线图

## 1. 决策与状态

- 主框架：WebdriverIO Test Runner + `@wdio/electron-service`；
- 单元、状态模型和组件测试继续使用 Vitest；
- `yak-mitm-perf` 继续负责确定性流量生产、后端指标和优化前后比较；
- MITM 性能是首条端到端纵向场景，但自动化基础设施面向整个 Yakit；
- 当前状态：Phase 0 骨架、Phase 1 真实 Yak 主链路与 Phase 2 HTTP-only MITM V2 端到端性能闭环已落地；请求/响应列表投影、详情按需补包、body/定速矩阵、body-free 专用流直接列表消费、自适应批处理、有界 Yak CPU/heap profile、Renderer CDP Trace、虚拟滚动正确性、慢消费者恢复和严格串行重复样本均已有自动化证据；首轮后端 CPU/大 Body 分配、MITMV2 明文响应重复克隆、HTTPFlow 标题整包转换、虚拟表格 hover 扇出、MITM overscan 与 Query 驱动的实时列表延迟已有优化，下一门槛是长时/断线/项目切换矩阵、Chromium/nuclei 生产器及剩余后端热点；
- 正式生产包的调试参数拦截策略保持不变，Main Process 自动化只运行在明确的 test build 中。

这份文档同时作为架构决策记录。后续改变主框架、隔离契约、安全边界或报告协议时，应先更新本文档。

## 2. 目标与非目标

### 目标

1. 把长期依赖人工的 Electron 回归变成可重复、可诊断的自动化场景；
2. 覆盖 Main Process、IPC、Renderer、yak engine 和外部客户端的真实组合；
3. 支持默认版及其他发行变体、未打包 test build 和跨平台打包产物；
4. 失败时自动保留足够的窗口、日志、进程和业务状态，避免只能本地重试；
5. 为性能优化建立同机、同配置、可比较的基线和门禁；
6. 测试数据、端口、项目和用户目录完全隔离，不读取或污染开发者日常环境。

### 非目标

- 不使用 E2E 替代所有单元和组件测试；
- 不把每个前置条件都实现为 UI 点击；
- 不依赖公网目标站点作为 CI 性能基线；
- 不通过固定 `pause`、无限重试或放宽生产安全配置换取“测试通过”；
- 不把 `100 / 300 / 1200` 等历史实现参数变成性能协议语义。

## 3. 测试分层

```text
Vitest
└── 纯函数、Reducer/Store、Hooks、状态模型、React 组件

WDIO Renderer
└── browser mode：不启动 Electron 的快速页面交互和可访问性检查

WDIO Electron Test Build
└── Main + IPC + Renderer + yak engine 的完整应用链路

WDIO Packaged Test Build
└── electron-builder 产物、路径、权限、多窗口、文件和协议交互

Release Artifact Health Check
└── 对正式发布包做外部启动、签名、退出码和崩溃检查，不开放调试桥

yak-mitm-perf + WDIO Performance Reporter
└── 流量生产、端到端时序、CPU/内存、正确性和前后版本比较
```

原则：尽可能在低层测试稳定覆盖业务分支，只把进程边界、真实渲染、窗口生命周期和用户关键路径留给 Electron E2E。

## 4. 目录与职责

```text
e2e/
├── config/       # shared / renderer / electron / packaged 配置
├── fixtures/     # 临时目录、引擎、项目、本地目标服务、流量生产器
├── drivers/      # 稳定的应用控制与观测接口
├── pages/        # 页面对象，只封装定位和用户动作
├── components/   # 可复用的复杂组件对象
├── specs/        # smoke / regression / mitm / performance
└── reporters/    # 统一 JSON、JUnit、性能和附件报告

scripts/
└── run-electron-e2e.mjs  # 创建隔离环境并启动 WDIO

reports/e2e-electron/
└── <run-id>/             # 日志、截图、状态、Trace 和报告
```

Page Object 不持有断言和跨页面业务流程；spec 描述用户场景和验收条件；fixture 负责非测试目标的准备与清理。

## 5. 隔离与测试模式契约

Electron 测试必须由统一运行器启动，并设置：

```text
YAKIT_E2E=1
YAKIT_E2E_USER_DATA=<mkdtemp>/user-data
YAKIT_HOME=<mkdtemp>/yakit-home
YAKIT_E2E_ARTIFACTS_DIR=<repo>/reports/e2e-electron/<run-id>
ELECTRON_IS_DEV=0
```

约束：

- `YAKIT_E2E_USER_DATA` 必须是绝对路径，且只在 `YAKIT_E2E=1` 时生效；
- 运行器只删除自己通过 `mkdtemp` 创建且通过前缀校验的目录；
- 不修改 `$HOME`，不复用用户默认项目和 Chromium profile；
- 每个 worker 使用独立目录、端口、项目数据库和场景 token；
- E2E 性能场景固定为单 worker；普通功能 spec 才允许受控并行；
- 测试开始前检查静态 Renderer 产物，禁止静默加载陈旧或缺失页面；
- 测试结束无论成功、失败或中断，都终止本轮 Electron、引擎和流量生产进程。

## 6. Test Driver 设计

测试不能只依赖 DOM，也不能直接调用任意内部函数。Driver 只暴露少量稳定、版本化的测试契约：

- `getApplicationState()`：版本、窗口、当前项目和引擎连接状态；
- `waitForEngineReady()` / `waitForMainWindowReady()`；
- `createIsolatedProject()` / `resetProject()`；
- `getProcessMetrics()`：Electron Main/Renderer/GPU 进程指标；
- `getMITMObservabilitySnapshot()` / `resetMITMObservability()`；
- `collectFailureState()`：窗口 URL、标题、加载状态和最近错误。

Driver 允许用 fixture 快速完成与目标无关的准备，但关键用户行为仍走 UI。例如项目文件准备可走 fixture，“启动 MITM”必须至少有一条真实 UI 场景。

启动 Smoke 的边界也必须显式标注：当前用例真实点击工作空间“确定并启动”，并等待页面进入引擎阶段；由于仓库不携带 Yak 二进制，随后通过公开 preload bridge 模拟“引擎已就绪”，走生产 `engineLinkWin-done` IPC 验证 Link → Main 窗口交接。它能证明 Electron shell、Renderer 和 IPC 交接正常，但不能证明真实引擎可启动或可连接；后者由 Phase 1 的临时引擎 fixture 单独覆盖。

Driver API 必须：

- 仅在 `YAKIT_E2E=1` 下可用；
- 不监听公网端口；
- 不暴露请求/响应正文、Token 或本地敏感路径到普通日志；
- 使用版本字段，发生不兼容改变时显式失败；
- 只提供测试需要的最小能力，不形成第二套产品 API。

## 7. 选择器与等待规范

优先级：

1. 可访问角色和名称；
2. 稳定业务标识，如 `data-testid="mitm-start"`；
3. 稳定的表单 name/id；
4. 最后才使用普通 CSS。

禁止：

- CSS Module 生成类名；
- 深层 DOM 结构和 `nth-child`；
- 只依赖可能国际化的文本；
- 固定 `browser.pause(...)` 等待异步状态；
- 通过增加全局 timeout 掩盖未定义的就绪条件。

使用 WDIO 内置可重试断言和明确状态条件。对于虚拟表格，断言业务 ID/行状态，不断言全部 DOM 行数量。

## 8. 失败产物与可观测性

每个失败至少保存：

- 当前活动窗口截图；
- 所有 BrowserWindow 的标题、URL、可见性、加载和崩溃状态；
- Main/Renderer console 和 ChromeDriver/WDIO 日志；
- Electron `app.getAppMetrics()`；
- yak engine 日志、退出状态和资源采样；
- 当前项目身份的不可逆摘要；
- 场景输入、预期流量 ID、实际 ID、缺口和重复；
- MITM 端到端观测快照；
- 失败阶段与最后一个成功的业务检查点。

默认运行只采集低开销指标；CDP Trace、CPU Profile 和 Heap Snapshot 仅在 nightly、显式诊断模式或回归重跑时启用，避免观测本身扭曲性能。

报告的稳定机器可读入口为 `report.json`，JUnit/HTML 只是展示层。性能报告必须标注是否覆盖 Electron/React，直接 gRPC 探针不得冒充完整 UI 延迟。

## 9. 测试套件和 CI

| Suite | 触发 | 主要内容 | 并发 |
| --- | --- | --- | ---: |
| `smoke` | PR | 启动、窗口加载、引擎连接、项目、MITM 最短闭环、退出 | 1 |
| `renderer` | PR | 无 Electron 的快速页面交互 | 可并行 |
| `regression` | nightly | 项目切换、多窗口、异常恢复、历史人工回归项 | 受控并行 |
| `performance` | nightly/专用机器 | 浏览器/nuclei、突发追平、CPU 恢复、内存稳定性 | 1 |
| `packaged` | 发布候选 | Windows/macOS/Linux test build | 每平台 1 |
| `release-health` | 发布候选 | 正式包签名、启动、退出码、崩溃 | 每平台 1 |

共享 CI 的性能结果只做趋势和正确性检查；严格 CPU/延迟门禁只在固定硬件、固定电源策略、固定窗口尺寸和相同构建配置下执行。WSL 只承担低资源 Smoke，不作为正式渲染性能基线。

## 10. MITM 首条纵向场景

```text
启动隔离 test build
→ 连接临时 yak engine
→ 创建独立项目
→ UI 进入并启动 MITM V2
→ 第二个 Chromium/nuclei 通过代理请求本地目标服务
→ 等待流量 React commit
→ 停止生产
→ 等待 backlog 归零
→ 校验 ID 无永久缺口、无重复、无串项目
→ 校验 CPU 恢复和内存平台期
→ 合并 yak-mitm-perf 与 WDIO 指标
→ 正常关闭全部进程
```

负载使用 profile 描述：速率、并发、持续时间、请求/响应字节和协议组合。场景完成依赖业务条件，不依赖固定睡眠时间。

性能前后比较：

- 同一机器和构建模式；
- 每组先预热，再运行至少 3 次正式样本；
- 比较 P50/P95/P99、最大 backlog、追平时间、CPU 恢复和峰值 RSS；
- 门禁采用相对退化比例加绝对噪声下限；
- 正确性错误（永久缺口、重复、崩溃、无法退出）不允许用统计噪声豁免。

## 11. 安全边界

当前生产包会拒绝 `remote-debugging-*` 和 `--inspect*` 参数；这一行为不能为了 E2E 被全局关闭。

因此：

- Main Process `execute/mock` 只用于未打包应用或明确的 packaged test build；
- 当前实现会拒绝在 `app.isPackaged=true` 的正式包中启用 `YAKIT_E2E`；未来 packaged test build 必须使用独立构建标记，不能只信任运行时环境变量；
- test build 可以在构建期有条件开启 WDIO 所需的调试桥，产物不得进入发布渠道；
- 正式发布包保持调试参数拦截和安全 fuse，只做不依赖调试桥的外部健康检查；
- CI 必须用独立命名、独立输出目录和显著水印区分 test build；
- 测试配置不得改变普通 `yarn cli electron` 和正式打包命令的行为。

## 12. Flaky 管理

- 禁止通过固定 pause 和无限 retry 修复 flaky；
- PR 默认不重试，nightly 最多一次诊断重跑；
- “首次失败、重跑成功”仍记为 flaky，不转换为稳定成功；
- 每个隔离用例必须有负责人、首次出现提交、失败率和失效日期；
- 连续出现的 flaky 优先修基础设施或产品竞态，不能永久 quarantine；
- 测试失败应指出业务检查点，不只输出 selector timeout。

## 13. 分阶段路线图

### Phase 0：框架骨架（进行中）

- [x] 选择 WDIO Electron Service；
- [x] 定义测试分层、目录、安全和隔离契约；
- [x] 增加 test-only userData 隔离入口及单元测试；
- [x] 增加统一隔离运行器和静态产物预检；
- [x] 增加单 worker Electron 配置、日志和失败窗口快照；
- [x] 增加每轮 `report.json`，失败时采集窗口、Main/Renderer/GPU 进程资源状态；
- [x] 增加工作空间真实确认、引擎阶段 Ready 和 Link → Main 交接 Smoke；
- [x] E2E teardown 绕过用户关闭确认，普通启动行为不变；
- [x] 在 WSLg 低资源环境跑通首个真实 WDIO session；
- [ ] 在 Linux CI 配置 Xvfb 并跑通首个真实 session；
- [ ] 增加独立 workflow，先不阻断现有 PR。

当前依赖说明：`@wdio/electron-service@10.1.0` 发布包声明了
`@wdio/native-utils@2.4.0`，但实际导入了只在后续版本提供的
`installMockSyncOverride`。Yarn resolutions 暂时固定到 `2.5.0`；升级
Electron Service 时必须先移除该 override 并重新跑启动 Smoke，不能让临时兼容项永久漂移。

本地验证记录（2026-07-22，WSLg，Node 22.12.0）：单 worker Shell Smoke 共 2 个断言通过，最近一次完整运行 75.2 秒；真实引擎用例 1 个通过，覆盖欢迎页 → 协议 → 远程地址输入回验 → Link WatchDog → Main → Echo，Go 对象缓存预热后整轮 93.0 秒。首次脏工作树冷构建约 357 秒。两类运行结束后均无 Yak/Electron/ChromeDriver 进程、监听端口和隔离临时目录残留。WDIO 通过后台 CDP 控制应用，不以肉眼可见的 DevTools 窗口作为启动或就绪信号。

### Phase 1：稳定应用 Driver

- [x] 应用/窗口 Ready 契约和首批稳定选择器；
- [x] 从 `yaklang-main` worktree 受限构建真实 Yak；
- [x] `127.0.0.1:0`、结构化 Ready、Echo 探活和进程树清理；
- [x] 独立 profile/project DB 与真实远程连接 UI → Main Echo 闭环；
- [ ] 由 Yakit 自己发现、启动和停止本地 Yak 的生命周期场景；
- [ ] 临时项目创建、切换、清空和数据库身份校验；
- [ ] Main/Renderer 统一业务 Ready 状态；
- [ ] 引擎崩溃、重连和异常退出场景。

实际运行命令、缓存规则、资源上限、环境变量和失败产物见 [`e2e/README.md`](../e2e/README.md)。

本地标准门禁为 `yarn test:e2e:electron:local`，固定执行 Renderer 构建、隔离/fixture 预检、Shell Smoke 和真实引擎套件。单阶段命令保留给开发反馈环；涉及 Main、启动页、preload/IPC、Yak CLI 或 gRPC 连接契约的改动，交付前必须经过真实引擎套件。

### Phase 2：MITM 性能闭环

- [x] 随机 loopback 端口的 HTTP 目标服务，按场景 token/序号验证无缺口、无重复；
- [x] 有界 Node HTTP 代理生产器，提供 `40/4`、`200/8`、显式 `1000/16` 三档 profile；
- [x] 真实 UI 选择隔离项目、进入 MITM V2、填写监听地址、启动和停止；
- [x] 自动校验 target、项目 DB、MITM 虚拟表格和 Renderer high-water 全部追平；
- [x] 采集 request/response/persist → React commit、Query 分段、Long Task、Electron CPU/RSS、Yak CPU/RSS 和恢复时间；
- [x] `harnessVersion: 5` 严格 idle gate，阻止 Yak 启动波动和历史 Long Task 污染基线，并记录专用实时流实验模式、700 ms 合并间隔与协议正确性；
- [x] 显式记录请求体/响应体大小、逐轮触发源、游标、高水位、行数、包字节和停止原因；
- [x] 声明式 body 矩阵覆盖 small、request-heavy、response-heavy 和 bidirectional，真实 POST body 由 loopback 目标精确验字节且每个 case 顺序隔离运行；
- [x] MITM 列表查询省略 Request/Response 原始包，性能窗口结束后用详情 RPC 精确校验完整双向 body；
- [x] Request 依赖的 Web Fuzzer、WebSocket、CSRF、PoC、Comparer 和快捷键按 ID 懒加载，并合并同一 ID 的并发请求；
- [x] 区分诊断指标与阻断指标：空闲等待、Long Task 次数和阻塞占比只诊断，绝对总时长、p95 和最大值参与门禁；
- [x] 同 profile/系统/构建/协议的 JSON A/B 比较，采用 15% 相对门槛加绝对噪声下限；
- [x] 显式、限时、仅 loopback 的 Yak CPU profile；保留符号的诊断构建与普通剥离构建使用不同缓存身份，profile 报告被 comparator 强制拒绝；
- [x] 显式、强制 GC、仅 loopback 的 Yak heap profile；空闲/恢复双快照自动生成 `alloc_space`、`inuse_space` 差分与绝对 live heap，和 CPU 模式互斥且不能进入正式 A/B；
- [x] 显式、有界的 Renderer CDP Trace；只使用 WDIO 已建立的 Renderer 调试连接，自动归因主线程 Long Task、JS、样式/布局、绘制、GC 与 IPC，并与所有 profile 模式互斥；
- [x] body matrix 支持每 case `1..10` 次严格串行重复；每次使用全新的项目 DB 和 Electron user-data，汇总 P50/P95、范围、标准差、MAD 与相对离散度；
- [x] 修复虚拟表格 hover 状态变化导致所有可见单元格重新渲染的扇出，只让旧/新 hover 行失效，并增加纯函数回归测试；
- [x] 扩展 Renderer trace 的长任务来源、嵌套事件、IPC 字节数、布局对象数和 layout root 归因，并用低扰动/高扰动对照约束可用 trace 类别；
- [x] MITM 表格 overscan 从全局默认 10 收敛为 5；其他页面不变，E2E 在性能窗口外自动验证滚动、首行变化、回顶恢复及 DOM 行/单元格数量；
- [ ] HTTPS、WebSocket、证书信任和 CONNECT 场景；
- [ ] Chromium 与 nuclei 生产器，复现真实浏览器/扫描器连接行为；
- [ ] 与 `yak-mitm-perf` 后端报告合并为单一父报告；
- [x] 持续生产期间滚动离开顶部、恢复顶部并精确追平 direct/Query 混合消费；
- [ ] 长时、100+ 站点突发、停止追平和断线重放场景；
- [ ] 固定硬件 runner 上至少 3 次 `standard` 重复及正式门禁。

本地最终验证记录（2026-07-22，WSLg，`production-unminified`，Yak `GOMAXPROCS=2` / `GOMEMLIMIT=2GiB`，单 worker）：所有候选均无 ID 缺口/重复，列表 Request/Response 原始包均为 0；性能窗口结束后的详情查询仍精确得到配置的双向 body，并正确停止 MITM、目标服务、Electron 和 Yak。相同 case 的原始基线到最终候选如下，两份 comparator 均为 `passed`：

| 场景（120 请求，并发 8） | 数据库排空 | Renderer 排空 | request → React p95 | Query 往返 p95 | Long Task 总时长 / p95 | 吞吐 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Request 64 KiB / Response 4 KiB | `2723 → 98 ms` | `2748 → 363 ms` | `3893 → 1156 ms` | `2125 → 116 ms` | `455 → 407 ms` / `100 → 76 ms` | `32.32 → 37.49 req/s` |
| Request 64 KiB / Response 256 KiB | `2054 → 190 ms` | `2078 → 460 ms` | `5656 → 1514 ms` | `3362 → 167 ms` | `374 → 395 ms` / `86 → 72 ms` | `17.68 → 18.95 req/s` |

Request-heavy 场景的后端列表转换 p95 为 `1070.469 → 0.256 ms`；详情校验为 Request `65536`、Response `4096` 字节。双向大 body 详情校验为 Request `65536`、Response `262144` 字节。投影后的列表行使用保守的 8 KiB 摘要估算参与自适应调度，不再把详情正文长度误当成 IPC 传输量；该数字只是预算估算，时间预算和最大行数继续提供硬上限。

Long Task 阻塞占比改为诊断指标，因为观测窗口在 Renderer 排空时结束，候选越快，分母越短；绝对总时长、p95 和最大值仍阻断真实回归。WSL 单样本用于定位和大幅 A/B，不作为发布结论，固定硬件仍需至少 3 次同 case 重复。

#### Phase 2 后端 CPU 诊断与第二轮证据（2026-07-23）

CPU profile 已成为可重复的显式诊断模式：Yak 只在测试进程传入 `--pprof --pprof-listen 127.0.0.1:0` 时开放监听，WDIO 在负载窗口采集固定 1～60 秒的 profile，并输出原始 `yak-cpu.pprof`、flat/cumulative top 和结构化摘要。诊断构建保留符号，普通性能构建继续剥离符号；两者缓存键隔离，且任何带 profile 的报告都不能进入正式 A/B。

首轮 profile 定位并修复了两个后端热点：Linux 进程名查找从每连接全量遍历 `/proc` 改为“短 TTL PID 提示、每次重新验证 socket inode/exe、固定分片锁、失败时精确全量回退”；minirehs Teddy 在 nibble 指纹后增加精确双字节前缀门，消除低熵大 Body 在每个字节位置进入 confirm 的退化。随机差分、真实规则对照、TrafficGuard 全量测试和 race 均通过，检测规则与包大小范围没有变化。

诊断场景的变化如下。数字来自 profile 运行，只用于归因，不作为门禁：

| 场景 | 关键热点（优化前 → 优化后） | 总 CPU 样本 | 吞吐 |
| --- | --- | ---: | ---: |
| Request 64 KiB / Response 4 KiB | 进程名查找 `1080 ms / 16.51% → 50 ms / 0.90%` | `6540 → 5580 ms` | `36.68 → 42.19 req/s` |
| Request 64 KiB / Response 256 KiB | TrafficGuard `3240 ms / 27.76% → 100 ms / 1.27%`；minirehs C 扫描 `3120 → 30 ms` | `11670 → 7880 ms` | `22.29 → 30.35 req/s` |

TrafficGuard 的独立 256 KiB 微基准进一步复现了低熵退化：连续 `a` 的 JSON 从约 `24 ms/op` 降到 `0.57 ms/op`（约 42 倍），普通 JSON/HTML 从约 `3.5` 降到 `1.56 ms/op`（约 2.2 倍）。

正式无 profile 结果保留了门禁失败，不用吞吐改善掩盖内存问题：

| 场景（原始基线 → 当前候选） | 数据库 / Renderer 排空 | request → React p95 | Query 往返 p95 | Long Task 总时长 / p95 | 吞吐 | Yak 峰值 RSS | 结果 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Request 64 KiB / Response 4 KiB | `2723 → 353` / `2748 → 374 ms` | `3893 → 1016 ms` | `2125 → 63 ms` | `455 → 400` / `100 → 96 ms` | `32.32 → 56.62 req/s` | `668 → 741 MB` | 最新重复样本通过；前一次为 `780 MB` 并触发门禁 |
| Request 64 KiB / Response 256 KiB | `2054 → 148` / `2078 → 853 ms` | `5656 → 1463 ms` | `3362 → 193 ms` | `374 → 436` / `86 → 72 ms` | `17.68 → 31.75 req/s` | `854 → 1071 MB` | 失败：Long Task 总时长 `+16.6%`、Yak RSS `+25.4%` |

因此这一轮没有继续调整固定分页数字，也没有放宽 15% 门禁。下面的 heap/allocation 阶段直接测量并处理大 Body 的重复复制。

#### Phase 2 后端 Heap/allocation 诊断与第三轮证据（2026-07-23）

`yarn test:e2e:electron:mitm-heap-profile` 现可自动运行双向大 Body 场景。空闲 gate 通过后先请求 `/debug/pprof/heap?gc=1`，在负载、数据库/Renderer 排空与 CPU 恢复完成后再抓一份；报告自动生成 `alloc_space` 基线差分、正向 `inuse_space` 差分、结束时绝对 live heap、flat/cumulative top 和结构化分类。单份产物最多 64 MiB，CPU/heap 模式互斥，任何 heap 报告都由 comparator 拒绝。

首份诊断（`2026-07-23T02-45-53-407Z`）中，120 条 Request 64 KiB / Response 256 KiB 流量只包含 37.5 MiB 原始双向 Body，却产生 `5,395,723,287 B` 累计分配；其中 `io.ReadAll` 为 `3,810,906,733 B / 70.63%`，`bytes.growSlice` 为 `644,438,541 B / 11.94%`。基线到恢复点净 live heap 只增加约 14.8 MiB，结束时绝对 live heap 约 271.3 MiB，说明主要是短命重复复制与 GC 压力，不是同等规模的持续泄漏。

调用链定位到后端 `SplitHTTPPacketEx`：输入已经是完整 `[]byte`，旧实现仍通过 `io.ReadAll` 几何扩容整个 Body。改成一次精确长度分配且继续返回独立副本后，256 KiB 微基准中位耗时 `207.2 → 67.8 µs/op`，分配 `1,191,665 → 267,750 B/op (-77.5%)`，分配次数 `52 → 32`。第二份同场景诊断（`2026-07-23T02-54-58-894Z`）累计分配降到 `2,999,089,540 B`，减少 `44.4%`，绝对 live heap 约 269.9 MiB，基本持平。

无 profile 正式运行 `2026-07-23T02-59-44-866Z` 相对本次修复前报告通过 comparator：Renderer 排空 `853 → 432 ms`、request → React p95 `1463 → 1092 ms`、Query 往返 p95 `192.8 → 122.1 ms`、吞吐 `31.75 → 38.38 req/s`、Yak 峰值工作集 `1071 → 915 MB`。相对最初基线，Yak 工作集只增加 `7.2%`，已回到门限内；Renderer Long Task 总时长仍为 `374 → 443 ms / +18.4%`，所以总体门禁继续失败。

#### Phase 2 Renderer Trace、重复样本与第四轮证据（2026-07-23）

Renderer 诊断不修改正式包的远程调试策略，而是复用 WDIO/ChromeDriver 已建立的主页面 CDP session。`--renderer-trace` 在负载窗口使用 16 MiB `recordUntilFull` buffer，停止、flush 和流读取共享 30 秒硬期限，原始产物上限 64 MiB；自动生成 `renderer-trace.json` 与紧凑的 `renderer-trace-summary.json`。CPU、heap、Renderer trace 三种诊断模式互斥，只允许单次运行，并被 comparator 标记为 `diagnosticOnly`。曾验证 Electron Main `contentTracing.stopRecording` 在当前 Electron 27/WSLg 组合中会阻塞 Main 调试桥，因此没有把该路径纳入自动化。

双向大 Body 优化前 trace（`2026-07-23T03-47-54-677Z`）记录 6 个主线程 Long Task、总计 `401.211 ms`，与页面 Long Task Observer 的 `397 ms` 基本一致。归因显示三次 `Receive mojo reply` 共 `180.771 ms`，另外三次帧任务包含 React `mouseover` 事件分发、`UpdateLayoutTree`、`Layout` 和 `Paint`。代码检查确认 `TableVirtualResize` 把表级 hover ID 传给所有可见单元格，两个 `React.memo` 比较器在 hover ID 变化时会让所有单元格失效；实时插入使静止鼠标下也会重复触发该扇出。

修复后只让旧 hover 行和新 hover 行重新渲染。相同 trace 场景（`2026-07-23T03-55-46-989Z`）中，React `EventDispatch` 累计耗时 `50.297 → 14.850 ms`，对应函数调用 `49.719 → 14.390 ms`，约减少 71%；trace Long Task 总时长 `401.211 → 361.068 ms`，Observer 为 `397 → 359 ms`。IPC 回复 `180.771 → 184.693 ms` 基本不变，说明改动命中了预期的渲染扇出，并没有掩盖下一层瓶颈。

`--repeat 3` 的首轮候选稳定性运行位于 `matrices/body-2026-07-23T04-00-31-083Z`，三次都完成 120/120 流量、无 ID 缺口/重复、列表原始包为 0、详情正文精确匹配且清理成功。中位数与范围为：吞吐 `36.45 [31.69..39.51] req/s`、首次可见 `669 [492..684] ms`、Query 往返 p95 `88.6 [72.7..129.3] ms`、request → React p95 `1209 [1109..1210] ms`、Long Task 总时长 `357 [295..396] ms`、Yak 峰值 RSS `882.9 [877.9..884.3] MB`。该组证明重复执行和离散度报告可用，也显示短时吞吐/Query 指标在 WSL 上噪声明显；因为优化前只有单样本，不能把它冒充固定硬件上的三次正式 A/B。

#### Phase 2 IPC/layout 排除实验与第五轮证据（2026-07-23）

trace 摘要现在会记录长任务 native 来源、耗时最高的嵌套事件、IPC interface/payload/data bytes，以及 Layout 的 element/dirty/total object、`partialLayout` 和有界 layout roots。关闭后端 `SystemTiming` 的诊断运行（`2026-07-23T04-20-47-726Z`）仍有 3 次 IPC native task、合计 `171.066 ms`，与开启时的 `184.693 ms` 同量级，因此观测字段不是根因，正式产品默认继续开启有界观测。

两项看似合理的方案没有通过真实 trace，均已撤回：MITM-only protobuf 默认字段压缩虽能缩小合成对象，但真实运行没有降低 IPC task，约 160 B 的回复也需要 `65～68 ms`，说明该环境中的耗时不随 payload 大小单调变化；`contain: layout` 仍以 document `nodeId=1` 做 full layout，element count 保持 `2204`，样式/布局累计反而约 `121 → 143 ms`。额外开启 Chromium invalidation tracking 的运行（`2026-07-23T04-48-13-128Z`）把 Observer 长任务放大到 `4334 ms`、最大 `1614 ms`，观测扰动过强，已从默认 trace 类别移除，不能作为性能证据。

保留的改动只作用于 MITM：虚拟表格 overscan 从 10 降为 ahooks 原生默认值 5，其他表格维持原行为。候选 trace（`2026-07-23T04-55-48-958Z`）中 `UpdateLayoutTree` element count `2204 → 1864 (-15.4%)`、dirty layout objects `2907 → 2462 (-15.3%)`、累计耗时 `81.494 → 49.580 ms (-39.2%)`。E2E 在性能窗口结束后记录顶部 `27` 行、`486` 单元格，并滚动到 `1120 px` 再回顶；三次候选样本均验证首行 `120 → 84 → 120`、margin `0 → 1008 → 0`，没有空窗或恢复错误。

同一 WSLg、同构建和资源上限的三次基线 `body-2026-07-23T04-00-31-083Z` 与三次候选 `body-2026-07-23T04-59-24-854Z` 中位数如下：

| 指标 | overscan 10 | overscan 5 | 变化 |
| --- | ---: | ---: | ---: |
| Long Task 总时长 | `357 ms` | `166 ms` | `-53.5%` |
| Long Task 阻塞占比（诊断） | `9.89%` | `4.41%` | `-55.4%` |
| request → React p95 | `1209 ms` | `1130 ms` | `-6.5%` |
| response → React p95 | `1073 ms` | `1034 ms` | `-3.6%` |
| 吞吐 | `36.45 req/s` | `39.18 req/s` | `+7.5%` |
| 首次可见 | `669 ms` | `765 ms` | `+14.3%`（更慢、候选 CV `31.4%`） |
| Query 往返 p95 | `88.6 ms` | `112.9 ms` | `+27.4%`（更慢、后端阶段波动） |

这不是“所有指标都提升”的结论。保留 overscan 的依据是 DOM/layout 工作量的确定性下降、三次稳定的 Long Task 降幅和完整滚动正确性；首次可见与 Query RTT 的反向变化继续作为风险记录，不用 Renderer 优化解释后端查询噪声。下一阶段分别拆分 gRPC/protobuf 解码、Main 对象构造、Main→Renderer structured clone、Renderer 状态提交和后端 query/conversion，并在固定硬件各跑优化前/后至少 3 次；之后补 Chromium/nuclei、持续生产、100+ 站点突发、慢消费者和断线恢复。当前端到端可见延迟仍未达到路线图 SLO。

#### Phase 2 后端实时链路分段与第六轮证据（2026-07-23）

Electron 报告现在把后端 `COUNT`、数据 SELECT、模型转换、Renderer→Main、Main→后端、后端→Main、写库队列、实际写入、数据库变化检测、Duplex 投递和通知→Query 全部分段。矩阵 JSON/Markdown 也聚合写库队列 p50/p95、写入 p95、变化检测 p95、Duplex p95、trigger→Query p95 和 persist→React p95，不再需要人工从每轮原始报告取数。E2E 的 `--disable-skip-total` 只用于同构建 A/B，产品默认仍在初始化和周期校准时请求精确 Total。

三次精确 COUNT 基线 `body-2026-07-23T05-59-45-490Z` 与三次 SkipTotal 候选 `body-2026-07-23T06-06-12-227Z` 中，后端 Query p95 `53.757 → 2.650 ms`、COUNT `51.056 → 0.232 ms`、COUNT 执行比例 `1.0 → 0.2`；但 request→React `1090 → 1152 ms`、Query 往返 `79.7 → 130.3 ms`，所以结论限定为后端 SQL 竞争减少，不把它包装成整体体感改善。

后端异步写库去掉无事务收益的固定 10 ms 等待，并在入队时绑定项目 DB；Duplex 使用每客户端有界串行队列隔离慢消费者。以 SkipTotal 组为基线，对应候选 `body-2026-07-23T06-43-03-849Z` 的三次中位数为：写库等待 p50 `36 → 9 ms`、等待 p95 `130 → 142 ms`、写入 p95 `55 → 36 ms`、Duplex p95 `142 → 113 ms`、persist→React `868 → 820 ms`、request→React `1152 → 1065 ms`、吞吐 `36.64 → 37.33 req/s`。首次可见 `604 → 662 ms` 反向波动，且 trigger→Query `1011.5 → 994.2 ms` 基本不变。三次均完成 120/120 且正确清理；数据明确把下一阶段指向后端 `FlowCommitted` 影子事件，而不是继续调整前端分页常量。

SQLite 并发排除实验也已经自动化。通用写连接 max2 虽把 Query p95 中位数 `28.497 → 10.744 ms`，但写队列 p95 `51 → 89 ms`、写入 p95 `31 → 52 ms`、Long Task `209 → 368 ms`，端到端可见延迟与吞吐没有改善；独立 read1 相对同二进制 read0 把 Query p95 `126.464 → 100.678 ms`，同时写队列 p95 `62 → 113 ms`、persist → React `307 → 359 ms`、Long Task `549 → 754 ms`。因此两项候选都不切默认，产品保持 writer1/read0。矩阵比较器现要求同 case/config、每组至少 3 次正确样本，并输出中位数、范围和方向；WSL 结果只用于拒绝明显回归。

后端现已同步到 `origin/main@8d813bd6d`，数据库批量与 GORM 升级 PR 已进入主干；GORM 正确性修复 `70430b4` 已作为 `v1.9.2-yaklang.2` 发布并被 Yaklang 引用。前端因此继续推进 Phase 3，而不再等待旧数据库分支。

专用 `SubscribeHTTPFlows` server stream 已接入 Electron Main/preload 和 Renderer shadow 控制器。协议使用独立、无正文的 `HTTPFlowLiveSummary`，按项目/会话/Sequence 校验并在明确 `Gap` 后回到 Query；旧引擎返回 `UNIMPLEMENTED` 时，同一项目不会反复重连。共享 Electron 流 helper 也补上 error 清理、重复 token cancel、旧流事件所有权与窗口销毁清理测试。专用流与旧 Duplex committed 使用独立 shadow/canary 模式；观测快照包含重放、Gap 原因、序列异常、可用性和 commit/server → Renderer 延迟。heartbeat 越过 RPC 待发送 committed 的竞态已在真实 Smoke 中复现并修复，后端 heartbeat 只报告该连接实际投递的 high-water。相关 TypeScript 检查及 45 项聚焦 Vitest 已通过。

`harnessVersion: 5` 已把该实验流程自动化：`--httpflow-live-stream-mode off|shadow|canary` 独立于旧 Duplex 模式，报告等待专用流高水位追平，并把 Gap、非法信封/事件、Sequence 缺口、重复、乱序、不可用和意外结束作为正确性失败；矩阵 JSON/Markdown 自动汇总通知延迟、事件计数和 `httpFlowLiveRefreshMinIntervalMs`，比较器要求实验差异显式声明。

首个未合并 canary 将 120 条通知放大为约 15 个查询周期，Long Task 中位数 `284 → 477 ms`；`400 ms` 合并仍有 12 次查询且 Long Task `333 → 468 ms`，均未切默认。首轮 Query-backed 策略为首条立即、持续洪峰最小 `700 ms` 的 leading/trailing 合并；健康 canary 期间旧 duplex 通知保留投递观测和字段组刷新，但不重复唤醒 Query，任何断流/Gap/不可用/筛选不兼容立即回退旧路径。

最终同构建 3+3 矩阵为 `body-2026-07-23T13-41-56-178Z`（off）和 `body-2026-07-23T13-47-17-325Z`（canary），比较报告位于 `reports/e2e-electron/comparisons/httpflow-live-coalesced-2026-07-23/`。三次候选都完成 120/120，所有流协议错误和清理错误为 0；Query 中位数 `5 → 6`，trigger→Query p95 `918.9 → 700.3 ms`，persist→React `896 → 693 ms`，response→React `971 → 838 ms`，首次可见 `715 → 628 ms`，Long Task `341 → 337 ms`，吞吐 `35.82 → 35.61 req/s`。request→React `1045 → 1054 ms` 基本持平且候选离散较大。

该轮默认继续保持 `shadow`，并为后续 body-free summary 直接列表消费提供协议和回退基础；Query 恢复链路不删除。

#### Phase 2 后端 HTTPFlow Body View 与第七轮证据（2026-07-23）

heap 自动化继续定位到 `CreateHTTPFlow` 的重复 Body 副本。后端保留原切包 API 的独立副本语义，新增只读 View，并只迁移建流 metadata、截断判断和 large-request spill 的只读调用方；真正截断仍显式复制，输入包不变性和 ownership 由测试锁定。新建 `BenchmarkCreateHTTPFlowBodyMatrix64K256K` 将单次分配从约 `6.10 MiB/op` 降到 `4.79 MiB/op (-21.5%)`，耗时约 `4.99 → 5.07 ms/op`，不宣称 CPU 改善。

同一 heap case 的新报告为 `reports/e2e-electron/2026-07-23T14-14-57-009Z`。相对 `2026-07-23T02-54-58-894Z`，累计分配 `2,999,089,540 → 2,764,771,622 B (-7.8%)`，Split flat `672,897,530 → 449,617,316 B (-33.2%)`，`CreateHTTPFlow` cumulative `812,470,067 → 573,600,442 B (-29.4%)`，绝对 live heap `283,032,394 → 273,422,821 B`。`io.ReadAll` 仍约 776 MB，下一候选将针对后端 response read/dump，而不是无边界扩大共享 View。

无 profiler 的三次候选矩阵为 `body-2026-07-23T14-22-29-748Z`，比较报告为 `reports/e2e-electron/comparisons/httpflow-body-view-2026-07-23/`。三次均完成 120/120，正文、数据库、stream 顺序和清理门禁通过；吞吐中位数 `+6.0%`、request → React `-18.3%`、response → React `-11.9%`，Yak CPU/RSS 基本持平。写库等待、写入和 Long Task 样本反向波动，因此结论限定为分配优化通过，不能声称全链路延迟都改善。

矩阵比较器新增 `--allow-case-config <field>`：历史报告缺少、当前报告补报同一实际实验值时，必须逐字段显式放行并记录在 comparison 中；未列出的 case 配置差异仍会失败。本轮只允许旧报告缺失的 `httpFlowLiveRefreshMinIntervalMs=700` 元数据，不改变实际调度配置。

#### Phase 2 后端响应读取与第八轮证据（2026-07-23）

响应构造自动化新增 256 KiB Content-Length 的网络 reader/已有 bytes 两条基准，以及 input、`rsp.Body`、httpctx bare packet 三者独立 ownership 和短读补齐测试。不超过 1 MiB 的响应使用一次有界精确分配，超限继续渐进读取；新 Body reader 只持有本次读取产生的独立切片，bare response 继续克隆，因此没有用共享可变数据换性能。

网络 reader 微基准从约 `421.8 µs / 1,992,237 B/op / 84 allocs` 降到 `192.3 µs / 806,019 B/op / 60 allocs`；已有 bytes 二次解析从 `368.5 µs / 1,721,486 B/op / 78 allocs` 降到 `123.3 µs / 535,308 B/op / 55 allocs`。真实 heap 报告 `2026-07-23T14-47-27-344Z` 相对 `2026-07-23T14-14-57-009Z` 的累计分配为 `2,764,771,622 → 2,339,609,176 B (-15.4%)`，`io.ReadAll` 为 `776,202,307 → 358,823,143 B (-53.8%)`，绝对 live heap `273,422,821 → 265,137,425 B`。

正式三次矩阵 `body-2026-07-23T14-53-28-951Z` 与基线 `body-2026-07-23T14-22-29-748Z` 配置完全一致，比较报告为 `reports/e2e-electron/comparisons/http-response-body-read-2026-07-23/`。三次均完成 120/120，stream 与清理错误为 0；吞吐 `+5.7%`、Yak RSS `-3.0%`、Long Task `-31.8%`、Yak CPU 基本持平。request/response → React 中位数分别 `+2.1%/+8.5%` 变慢且范围重叠，路线图保留风险，不把后端分配收益描述成所有 UI 指标改善。

下一候选是独立审计 `DumpHTTPResponse` 的 Body 读取/恢复语义；完整 `common/utils/lowhttp`、持续/突发、慢消费者和 Chromium/nuclei 场景仍在后续门槛中，默认专用流继续为 `shadow`。

#### Phase 2 DumpHTTPResponse 与第九轮证据（2026-07-23）

后端 dumper 快路径只接受解析器内部不可变 owned Body，并保持原 reader 被消费、`rsp.Body` 恢复到未读内容、返回 packet 独立可修改的历史语义；外部 Body 继续走 `io.ReadAll`。部分读取、外部 reader、chunked、恢复与不别名测试均通过。256 KiB 微基准从约 `298.0 µs / 1,465,820 B/op / 38 allocs` 降到 `64.4 µs / 274,910 B/op / 16 allocs`，分配字节减少 `81.2%`。

heap 报告 `2026-07-23T15-10-24-871Z` 相对 `2026-07-23T14-47-27-344Z` 的累计分配为 `2,339,609,176 → 2,157,080,041 B (-7.8%)`，`DumpHTTPResponse` cumulative `216,439,900 → 69,928,653 B (-67.7%)`，`io.ReadAll` `358,823,143 → 198,994,567 B (-44.5%)`。绝对 live heap `265,137,425 → 278,683,416 B` 有单次波动，仍低于此前约 283 MB 样本，不描述为常驻内存改善。

正式三次矩阵 `body-2026-07-23T15-15-43-104Z` 与同配置基线 `body-2026-07-23T14-53-28-951Z` 的比较报告为 `reports/e2e-electron/comparisons/http-response-dump-body-2026-07-23/`。三次 120/120 与 stream/清理门禁全部通过；Yak RSS `-2.9%`、CPU `-0.6%`、request → React `-3.8%`、response → React `-5.9%`、Long Task `-3.1%`，吞吐 `-2.7%`。保留候选和吞吐风险，默认专用流仍为 `shadow`。

下一后端热点转向 `bytes.growSlice` 与仍在使用兼容复制切包 API 的只读匹配调用方；自动化必须继续逐候选独立 heap + 三次正式矩阵，不能把多项内存改动合成后再归因。

#### Phase 2 染色 Body View 排除实验（2026-07-23）

同步 `prepareColorMatch` 的内部 Body View 在 256 KiB 微基准中分配字节减少 `19.1%`，heap 中目标 HookColor 链路也减少 `8.3%`；但 heap 总分配 `2,157,080,041 → 2,165,879,116 B (+0.4%)`，没有整体改善。正式三次矩阵 `body-2026-07-23T15-37-29-530Z` 相对 `body-2026-07-23T15-15-43-104Z` 出现吞吐 `-5.3%`、request/response → React `+8.2%/+7.3%`、Long Task `+21.6%`，Yak CPU/RSS 也略升。

该候选因此被拒绝并完整撤回，当前有效实现仍是上一轮 dumper 候选；矩阵和 heap 报告保留为自动化排除证据。后续 `bytes.growSlice` 优化必须先定位具体调用源，不能仅凭局部微基准扩大共享 View。

#### Phase 2 只读 Header helper 与第十一轮证据（2026-07-23）

pprof caller 拆分发现 `GetHTTPPacketHeaders` 和 `GetStatusCodeFromResponse` 等只读 helper 仍通过兼容切包 API 复制完整 Body。后端只迁移 7 个 header/cookie/content-type/status helper 到显式只读 View，所有公开 Body 返回 API 继续返回独立副本。256 KiB 自动化基准中，headers 读取约从 `52 µs / 269,715 B/op` 降到 `7.1 µs / 7,568 B/op (-97.2%)`，status 读取同量级；等价、既有 helper、race 和完整 lowhttp 回归通过。

配置严格匹配 `canary` 的 heap 报告为 `reports/e2e-electron/2026-07-23T16-17-33-098Z`。相对 dumper 基线 `2026-07-23T15-10-24-871Z`，累计分配 `2,157,080,041 → 2,017,235,444 B (-6.5%)`，`splitHTTPPacketEx` flat/cumulative 分别 `-34.6%/-30.7%`，绝对 live heap `278,683,416 → 277,031,840 B` 基本持平。相对首份大 Body profile，累计分配合计已下降 `62.6%`。

正式三次候选矩阵 `body-2026-07-23T16-11-29-679Z` 对照 `body-2026-07-23T15-15-43-104Z`，报告位于 `reports/e2e-electron/comparisons/http-header-readonly-view-2026-07-23/`。三次 120/120、正文、数据库、stream 顺序与清理门禁全部通过；吞吐 `+1.3%`、Yak RSS `-3.7%`，Yak CPU/Long Task 持平。request/response → React `+5.0%/+7.3%`、写库 p95 `36 → 43 ms` 是保留风险，不能声称 UI 延迟全面改善。

一次未显式指定模式的运行落到产品默认 `shadow`，比较器正确拒绝了它与 canary 基线的配置差异；该三次矩阵和 heap 只作为默认路径额外正确性证据，正式结论改用重跑的同配置 canary 组。产品默认没有因此变更，仍为 `shadow`。

#### Phase 2 FixHTTPPacketCRLF Body View 与第十二轮证据（2026-07-23）

后端确认 `FixHTTPPacketCRLF` 对 Body 只读并始终构造独立输出，内部保留旧 copy oracle 供自动化逐字节对照。大 Content-Length、no-fix、chunked + rest、multipart、输入不变和输出不别名测试，以及既有 CRLF、race、完整 lowhttp 回归均通过。256 KiB 基准约从 `131 µs / 538,745 B/op` 降到 `70 µs / 276,576 B/op (-48.7%)`。

同配置 canary heap 报告为 `reports/e2e-electron/2026-07-23T16-27-08-323Z`，基线为 `2026-07-23T16-17-33-098Z`：`FixHTTPPacketCRLF` cumulative `95.13 → 52.61 MiB (-44.7%)`，总分配 `2,017,235,444 → 1,962,799,243 B (-2.7%)`，绝对 live heap `277,031,840 → 273,042,814 B`。从首份大 Body profile 算起，总分配累计下降 `63.6%`。

第一组历史比较出现与微基准相反且离散很大的 Long Task/网络波动，因此自动化没有直接放行。随后只切换内部 oracle 做紧邻 3+3：copy A 为 `body-2026-07-23T16-38-23-835Z`，view B 为 `body-2026-07-23T16-45-53-696Z`，报告在 `reports/e2e-electron/comparisons/http-fix-crlf-body-view-paired-2026-07-23/`。六次均通过；B 吞吐 `+11.9%`、网络请求 p95 `-22.3%`、Long Task `-21.1%`、Yak RSS `-2.4%`，Yak CPU持平。request/response → React `+4.3%/+4.0%` 与 Query 波动保留为风险。最终 source 已恢复为 view，临时 copy 构建只存在于带 source hash 的隔离报告中。

#### Phase 2 自动解压 Body View 排除实验（2026-07-24）

自动解压旧路径在未编码报文上也复制完整 Body。内部 copy/view oracle 的 256 KiB 微基准从约 `45 µs / 268,105 B/op` 降到 `4.2 µs / 5,958 B/op (-97.8%)`，编码/失败/ownership/race/完整 lowhttp 均通过。但 canary heap `reports/e2e-electron/2026-07-24T01-40-41-012Z` 虽将目标调用从 `37.69` 降到 `1.50 MiB`，总分配却 `1,962,799,243 → 1,966,690,729 B (+0.2%)`，没有整体收益。

紧邻 copy/view 3+3 为 `body-2026-07-24T01-45-22-529Z` 与 `body-2026-07-24T01-51-58-570Z`，报告位于 `reports/e2e-electron/comparisons/http-auto-unzip-body-view-paired-2026-07-24/`。六次正确性和清理均通过；候选吞吐 `-1.3%`，Long Task `+25.3%`、request → React `+11.9%`、persist write p95 `+63.3%`，Yak CPU/RSS 仅小幅下降。该候选因此被拒绝，代码和专用测试/基准完整撤回；报告继续证明自动化能阻止“局部微基准很好、产品体感反而变差”的优化进入有效实现。

#### Phase 2 定速生产、历史指标兼容与 Linux 进程归属第十四轮证据（2026-07-24）

固定速率矩阵升级到 harness v7：生产器按目标开始时间调度，不让响应完成速度反向限制发压；性能窗口前原子清空 fixture/Renderer 计数，并断言 committed shadow 的 initial snapshot 被省略。报告可分别观察 schedule lag、实际 dispatch rate、代理完成吞吐、停止生产时 backlog 与恢复时间，从而区分“生产器没发出来”和“MITM 消费不完”。全部矩阵继续严格串行，默认实时模式仍为 `shadow`。

历史矩阵可能缺少后来新增的 CPU/队列 timing。重复矩阵 comparator 现在只把缺失或不足三次覆盖的单项标记为 `metric-coverage-mismatch` / `insufficient-samples` 并降级为 diagnostic，其余同配置、足三次的指标仍可比较；差异会进入 JSON/Markdown，不能静默消失。配置、Body、并发、模式和正确性差异仍然直接拒绝。零基线不再打印 `NaN`，而是明确显示百分比不可用。对应单测覆盖历史缺项、两次样本、候选独有 timing 和零基线 CLI 输出。

Linux 客户端进程归属进一步从 source-only inet_diag 升级为精确 4-tuple 查询，netlink 连接池固定上限 16；`/proc/<pid>/fd` 使用 32 项流式读取和 `readlinkat`。精确查询微基准约 `488 → 134 µs`、`11,048 → 5,752 B/op`，FD 已命中扫描约 `8,301 → 1,369 B/op`。严格三次报告分别位于：

- `reports/e2e-electron/matrices/body-2026-07-24T05-00-04-439Z/comparison-vs-before-exact-netlink.{json,md}`；
- `reports/e2e-electron/matrices/body-2026-07-24T05-17-09-686Z/comparison-vs-before-fd-scan.{json,md}`。

#### Phase 2 无启用规则染色快路径第十五轮证据（2026-07-24）

大 Body profile 证明默认无启用规则时仍会进入后端 `HookColor` goroutine/channel 与切包。后端快路径保留热更新竞态中已经命中的颜色/标签，启用规则和 WebSocket 行为不变。64 KiB 无规则微基准约从 `36～39 µs / 214,452 B/op` 降到 `76 ns / 16 B/op`；heap `1.956 → 1.815 GB (-7.2%)`，CPU 总样本约 `-12.0%`。

严格基线 `body-2026-07-24T06-00-23-198Z` 与候选 `body-2026-07-24T06-08-31-743Z` 的比较为 `comparison-vs-before-hookcolor.{json,md}`：吞吐中位数 `+4.4%`、Yak RSS `-4.1%`，request p95 中位数约 `+5.2%` 且范围重叠。该项因函数、heap、CPU 和正确性证据一致而保留，不把短时 UI 尾延迟描述成改善。

#### Phase 2 流式 HTTPFlow 哈希第十六轮证据（2026-07-24）

后端 `HTTPFlow.CalcHash` 改为逐字段流式写 SHA-1，不再物化包含完整 Request 的中间字符串；256 组随机/控制字节差分锁定历史 hash。64 KiB 微基准约 `83.7 → 48.3 µs`、`222,030 → 96 B/op`，heap `1.815 → 1.648 GB (-9.2%)`。

严格基线 `body-2026-07-24T06-08-31-743Z` 与候选 `body-2026-07-24T06-26-54-407Z` 的比较为 `comparison-vs-before-streaming-hash.{json,md}`：吞吐 `+17.5%`、网络 request p95 `-22.3%`、request → React `-12.0%`、Yak RSS `-1.4%`；三次正确性、配置和清理门禁均通过。

#### Phase 2 POST 参数单次 Body 读取第十七轮证据（2026-07-24）

后端 `GetPostCommonParams` 从 JSON/XML/form 各读一次 Body 改为一次读取后复用 owned bytes，并对不含 JSON/XML 起始特征的普通二进制快速排除。旧控制流差分覆盖 URL-escaped JSON、XML、重复 form、Base64 JSON 和二进制，且保留 printable octet-stream 生成参数的历史行为。64 KiB 微基准约 `1.37 → 0.451 ms`、`1,182,900 → 656,290 B/op`；heap `1.648 → 1.550 GB (-6.0%)`，CPU profile 中目标函数 `290 → 150 ms`。

严格基线 `body-2026-07-24T06-26-54-407Z` 与候选 `body-2026-07-24T06-44-07-916Z` 的比较为 `comparison-vs-before-single-body-read.{json,md}`。吞吐中位数 `-2.9%`、request p95 `+19.6%`，与稳定正向的微基准/heap/CPU 不一致；因此保留确定性后端分配收益，同时把端到端尾延迟标成风险，不宣称全面提速。下一轮按最新 profile 处理 response raw/body 存储，但必须先补 wire/body/bare packet ownership 契约。

#### Phase 2 请求二次解析的精确 Body 与 owned handoff 第十八轮证据（2026-07-24）

`ReadHTTPRequestFromBytes` 现在在完成 Header 解析后，用 `bufio.Reader.Buffered() + bytes.Reader.Len()` 精确计算 `[]byte` 输入的剩余 Body，一次分配替代 `io.ReadAll` 几何扩容；随后把 parser 新分配、独占的 Body 直接交给 `bytes.Buffer`，不再复制到第二个 Body Buffer。流式公开 API 不变，调用方输入、`req.Body`、httpctx bare packet 仍互不别名。自动化修改输入和 bare 后再核对 64 KiB Body，并覆盖 128 并发、池释放、race 和 `common/utils` 全包。

64 KiB 微基准依次为 `97.1 µs / 500,369 B/op / 66 allocs`、精确读取 `56.4 µs / 280,974 B/op / 51 allocs`、owned handoff `53.5 µs / 215,485 B/op / 51 allocs`。第一步 heap `reports/e2e-electron/2026-07-24T07-09-42-831Z` 相对上一轮总分配 `-4.0%`、`io.ReadAll -58.9%`、request parser cumulative `-28.6%`；第二步 heap `2026-07-24T07-25-55-429Z` 再下降总分配 `4.4%`、parser `18.4%`、`bytes.growSlice 9.4%`，live heap均基本持平。CPU 归因中 parser 依次 `310 → 210 → 140 ms`。

第一步严格 3+3 为 `body-2026-07-24T06-44-07-916Z` → `body-2026-07-24T07-17-03-886Z`，比较文件 `comparison-vs-before-exact-request-body-read.{json,md}`：吞吐 `+2.7%`、request p95 `-13.9%`、request → React `-4.3%`，Yak CPU/RSS 约 `+1.3%/+0.4%`。第二步为 `body-2026-07-24T07-17-03-886Z` → `body-2026-07-24T07-33-13-446Z`，比较 `comparison-vs-before-owned-request-body.{json,md}`：Yak CPU/RSS `-1.2%/-2.4%`、首次可见 `-17.7%`，但吞吐 `-8.1%`、request → React `+5.8%`、Long Task `+95.7%`。后者与微基准/heap/CPU 方向矛盾且该后端 copy 没有 Renderer 扇出路径，因此保留确定性分配优化，同时原样记录 WSL 风险，不声称 UI 全面改善，也不修改 15% 门禁。

#### Phase 2 Response bare packet owned handoff 第十九轮证据（2026-07-24）

响应 parser 的正常、未超限路径把本地 `rawPacket` 显式移交给 httpctx，不再克隆整份响应；`rsp.Body` 仍有独立存储，外部/共享输入和超限响应仍走原有 clone/file 路径。ownership、短读、bytes 输入、race 与完整 `common/utils` 回归通过。256 KiB 微基准中位数 `166.3 → 131.6 µs (-20.9%)`、`806,037 → 535,669 B/op (-33.5%)`。heap `2026-07-24T07-45-15-744Z` 中 `bytes.Clone -24.3%`、response parser cumulative `-10.5%`、live heap `-3.0%`，但总分配 `+1.0%`；CPU 诊断 `2026-07-24T07-50-09-857Z` 总样本和目标 parser 均反向，只作为风险证据。

严格 3+3 为 `body-2026-07-24T07-33-13-446Z` → `body-2026-07-24T07-52-15-391Z`，候选目录内比较文件 `comparison-vs-before-response-bare-handoff.{json,md}`。三次配置、诊断、指标覆盖、Body/数据库/stream 与清理门禁一致；吞吐 `+7.4%`、request → React `-0.7%`、Renderer drain `-14.5%`、Yak CPU p95 `-0.2%`，Yak RSS `+1.5%`。Electron CPU p95 `+19.2%`、Query p95 `+20.4%`，后者两侧 CV 为 `82%/98%`。候选未触发“产品指标与 CPU 同向持续退化”的撤回条件，因此保留确定性分配优化，但不把它描述为 UI 或 CPU 全面改善。

#### Phase 2 专用流直接列表消费与第二十轮证据（2026-07-24）

后端专用流新增 request hijack、response mirror、flow built、persist enqueue/start 五个可选标量时间点，仍不携带 Request/Response Body。Renderer canary 只在 MITM 顶部、默认排序、无额外筛选且没有恢复 Query 时把 summary 直接映射成列表行；Gap、断流、不可用、项目/筛选切换、离开顶部或游标异常会先取消未提交 batch，再回到 Query。虚拟列表插入补上 ID 去重、窗口裁剪、游标边界和空 offset 的 no-op，定时器回调通过 `unstable_batchedUpdates` 兼容现有 legacy React root。

第一版固定 `100 ms` direct flush 的矩阵为 `body-2026-07-24T09-26-19-594Z`（shadow）与 `body-2026-07-24T09-32-31-361Z`（canary）。虽然 request → React `991 → 213 ms`、最大可见 backlog `165 → 44`，Long Task 却从 `525 → 3278 ms (+524.4%)`，Electron CPU p50 约 `+171%`；该版本被自动化否决。中间的 `100/500 ms` 与 `250/500 ms` 单次实验用于定位批量状态提交问题，不作为正式性能结论。

最终策略为空闲后首行立即提交，稀疏最小间隔 `250 ms`，pending 达 8 行后使用 `500 ms` 持续间隔；单批最多 256 行、pending 最多 2048 行。严格同源码指纹 3+3 为 `body-2026-07-24T09-58-01-917Z`（shadow）和 `body-2026-07-24T10-03-34-990Z`（canary），比较文件为候选目录下 `comparison-vs-shadow-direct-batched.{json,md}`。六次均为 1000/1000、唯一 ID 1000、数据库 1000，stream Gap/Sequence/重复/乱序和清理错误全部为 0；三个候选各 direct 1000 行、fallback 0、Query 0 次，共 11～12 个 React batch。

正式中位数为 request → React `990 → 490 ms (-50.5%)`、persist → React `987 → 485 ms (-50.9%)`、首次可见 `137 → 44 ms (-67.9%)`、最大可见 backlog `193 → 39 (-79.8%)`、Renderer drain `486 → 368 ms (-24.3%)`、Long Task `517 → 0 ms`（候选范围 `0～169 ms`）、Electron CPU p95 `8.67% → 6.81% (-21.5%)`、Yak CPU p50 `116.6% → 100.8% (-13.5%)`，吞吐 `200.09 → 199.32 req/s (-0.4%)` 基本持平。Electron CPU p50 `2.49% → 3.09% (+24.2%)` 仍作为风险保留。

正式 3+3 中旧 `FlowCommitted` shadow 对账 pending 到 1000，因为旧观测只在 Query 返回时匹配。现在用 `databaseIdentity + projectGeneration + ID` 精确双向匹配旧 shadow 与已经提交列表的专用流事件，覆盖两种到达顺序；报告新增 direct matches、direct-without-shadow 与 commit/shadow → direct 延迟，E2E 最终要求双向未匹配和 pending 都归零。真实单样本 `body-2026-07-24T10-37-01-191Z` / `2026-07-24T10-37-01-314Z` 完成 1000/1000、direct/shadow matches 1000、最终 pending 0、direct-without-shadow 0，峰值 pending `1000 → 48`，11 个 batch 且 Query/fallback/Gap/Long Task 为 0。该单次只验证对账正确性，不替代正式 3+3。

首次运行新门禁时，WDIO 实际加载了 09:55 的旧 Renderer 产物，报告虽记录当前源码指纹，页面快照却没有新增字段并正确失败。构建元数据因此升级为 v2：成功构建后记录 Main Renderer 的实际输入内容哈希（`app/renderer/src/main`、`app/protos`、根 package/lock）；runner 在创建隔离目录、编译 Yak 或启动 Electron 前校验，不匹配即退出码 2 并要求重建。单测证明文档变化不误判，Renderer 源码变化必定失效旧产物。

#### Phase 2 慢消费者恢复竞态与第二十一轮证据（2026-07-24）

新增 `mitm-slow-consumer-matrix.json` 和标准命令 `yarn test:e2e:electron:mitm-slow-consumer`。生产器保持定速发送，WDIO 在 25% 进度滚动离开顶部、持续生产到 75% 后回顶；结束门禁不只比较最大 ID，而是按 `databaseIdentity + projectGeneration + ID` 精确核对旧 `FlowCommitted`、direct 行和 Query 行，并要求恢复闸门关闭、pending 与双向未匹配都为 0。

首个 800 条样本 `2026-07-24T10-55-49-429Z` 正确失败：数据库和专用流均为 800/800，但列表仅匹配 direct 291 + Query 485 = 776，留下 24 个中间 ID。原因是离顶后 direct 回退 Query，回顶时新 direct 行在旧游标区间补齐前插入并推进表格最大 ID，使游标跨过中间缺口。修复后第一次 fallback 会关闭 direct 写入，记录恢复高水位；后续事件全部走 Query，只有 exhausted Query 覆盖 fallback 高水位和最新 stream ID，且对应 React commit 已可见、期间没有更新事件时才重新开放 direct。新的事件会使候选恢复点失效。

同时修复了一个仅影响观测的高水位误判：专用流先把聚合 backend high-water 推高后，较旧 Query 结果不再被当成数据库 ID 重置；真正的 reset 只比较相邻 Query high-water。快照 schema 升到 v5，并记录恢复进入、完成和当前高水位。

| 场景 | 完成/精确匹配 | 暂停窗口 | 回顶到 Renderer 排空 | DB / Renderer 排空 | 恢复次数 | Long Task | 结果 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 800 条、120 req/s、0 / 4 KiB | `800 = 232 direct + 568 Query` | `3414 ms` | `1856 ms` | `120 / 487 ms` | `1 / 1` | `266 ms` | 通过 |
| 240 条、30 req/s、64 / 256 KiB | `240 = 76 direct + 164 Query` | `3879 ms` | `2095 ms` | `165 / 314 ms` | `2 / 2` | `279 ms` | 通过 |

通过报告分别为 `reports/e2e-electron/2026-07-24T11-22-46-115Z/mitm-performance.json` 和 `reports/e2e-electron/2026-07-24T11-27-17-125Z/mitm-performance.json`。两组均无 Gap、Sequence 缺口、重复、乱序、不可用、正文错误或清理错误，最终 visible/backend high-water 相等且 backlog 为 0。request → React 包含刻意离顶的约 4 秒等待，不能与顶部跟随 A/B 直接比较。

产品仍默认 `shadow`。下一批 canary 门禁是长时/100+ 站点突发、断线重放、项目/筛选切换及 Chromium/nuclei 场景；大 Body 慢消费者已经覆盖，但完整 body 矩阵仍需在固定硬件重复。

真实引擎启动回归同时修复了一个 WDIO 交互 flake：只有明确检测到 `xterm-` canvas 拦截用户协议 checkbox 时才回退到 DOM click，随后仍验证选中状态；其他点击失败继续原样报错。启动、Echo、主窗口切换和清理回归通过，未用固定 sleep 掩盖问题。

#### Phase 2 MITMV2 明文响应重复克隆第二十二轮证据（2026-07-24）

后端 heap caller 拆分发现，未修改响应在 `getPlainResponseBytes` 解码并建立独立 cache 后，`handleHijackResponse` 会立刻通过同一 setter 再克隆一次完整明文。候选只跳过这次冗余 cache refresh；进入函数前已经 modified 的响应仍执行独立克隆，并用修改调用方切片后的 ownership 测试及 race 锁定语义。256 KiB 微基准由约 `38～40 µs / 262,233 B/op / 4 allocs` 降为未修改路径约 `19 ns / 0 B/op / 0 allocs`，modified 路径分配不变。

单次 heap 候选 `reports/e2e-electron/2026-07-24T11-42-26-163Z` 对照 `2026-07-24T07-45-15-744Z`：总累计分配 `-2.9%`，`bytes.Clone` 从 `122,690,190` 降到 `90,925,766 B (-25.9%, -31.8 MB)`，结束 live heap `+0.8%` 基本持平。单次 CPU profile 总样本反向 `4.59 → 5.24 s`，不作为 CPU 改善证据。

随后仅切换该调用点做紧邻旧实现/候选各 3 次：基线 `body-2026-07-24T11-48-49-833Z`，候选 `body-2026-07-24T11-57-17-023Z`，比较文件为候选目录下 `comparison-vs-unconditional-plain-response-clone.{json,md}`。六次均为 120/120，Body、数据库唯一性、stream 与清理门禁全部通过；比较器为 `passed`，case config 和 diagnostics 差异均为空。中位数为吞吐 `+21.8%`、网络 request p95 `-25.0%`、首次可见 `-32.0%`、Renderer drain `-53.5%`、Long Task `-59.1%`、Yak CPU p95 `-0.2%`；Yak RSS `+2.1%`，request/response/persist → React 分别 `+6.5%/+17.6%/+15.3%`，persist write p95 `+52.0%`。候选因此只按“确定性减少一次大对象分配且没有同向 CPU/产品退化”保留，负向 UI/写库指标继续作为 WSL 风险，不宣称全面提速。

#### Phase 2 HTTPFlow 标题 bytes 提取第二十三轮证据（2026-07-24）

后端行级 heap 显示，新建 HTTPFlow 为提取最多 128 个字符的 title，会先把完整响应从 `[]byte` 转成 `string`；256 KiB 场景中该行约 `35.2 MB`。候选新增 bytes 入口并复用相同的正则、非法 UTF-8 处理、128 rune 结果上限和 512 KiB 扫描上限，只替换新流量构建路径；string API、旧记录 fallback 和数据库表示不变。边界差分、input ownership、focused race、完整 `common/utils`/`common/schema` 以及持久化标题回归均通过。

5 次 256 KiB 微基准从约 `44～50 µs / 262,309～262,316 B/op / 2 allocs` 降到 `1.68～1.74 µs / 64 B/op / 1 alloc`。heap `reports/e2e-electron/2026-07-24T12-15-05-134Z` 对照 `2026-07-24T11-42-26-163Z`：目标行从约 `35.2 MB` 降到不可见，`CreateHTTPFlow` flat/cumulative 分别 `-39.7%/-9.7%`，总累计分配 `-1.5%`；结束 live heap `+2.9%` 反向，不宣称常驻内存改善。

严格 3+3 直接复用上一轮最终候选作为 string 基线：`body-2026-07-24T11-57-17-023Z` → `body-2026-07-24T12-19-42-548Z`，比较文件为候选目录下 `comparison-vs-string-html-title.{json,md}`。六次 120/120 和全部正确性/清理门禁通过，配置与诊断差异为空。Yak RSS `-1.1%`、CPU p95 `+0.8%`、吞吐 `-2.8%`、request/response → React `-1.6%/-6.8%`、Renderer drain `-19.2%`；Long Task `113 → 161 ms (+42.5%)`，候选范围 `112～215 ms`。因此保留确定性分配优化，同时把 Long Task 明确列为固定硬件复验风险，不把这轮描述为 UI 全面提速。

#### Phase 2 MITMV2 明文请求缓存只读 Body 第二十四轮证据（2026-07-24）

后端 heap caller 拆分发现，MITMV2 解码 bare request 后仅为判断 Body 是否超过 200 KiB cache 上限，会先通过兼容 split API 克隆完整 Body；随后 context setter 再按独立所有权克隆整包。候选只把长度检查切到显式只读 view，真正缓存、wire packet、parser Body 与 httpctx bare/plain packet 的所有权不变；v2 与旧 MITM 等价入口共用 helper。阈值边界、超限不缓存、源切片修改后 cache 不变、focused race 和 MITMV2 gzip/手工劫持回归均有覆盖。

128 KiB 可缓存请求的 5 次微基准中位数为 `45.351 → 24.427 µs (-46.1%)`、`270,903 → 139,828 B/op (-48.4%)`；256 KiB 超限请求为 `42.648 → 0.717 µs (-98.3%)`、`262,619 → 472 B/op (-99.8%)`。heap `reports/e2e-electron/2026-07-24T13-25-18-259Z` 对照 `2026-07-24T12-15-05-134Z`：`MITMV2.func6` cumulative `27.18 → 15.45 MB (-43.2%)`，目标 Body split `9.57 → 0.50 MB (-94.8%)`；context owned clone 仍保留 `6.97 MB`。总累计分配 `+0.17%` 基本持平，结束 live heap `-8.0%`，只认 caller 定向收益。旧 MITM 300 KiB 回归在组合冷运行中曾于上游完整接收后命中固定 5 秒数据库查询 deadline，单独重跑 3.6 秒通过，记录为自动化 flake 而非产品性能结论。

严格 3+3 为 `body-2026-07-24T12-19-42-548Z` → `body-2026-07-24T13-30-36-835Z`，比较文件为候选目录下 `comparison-vs-cloned-request-body.{json,md}`。六次 120/120 和 Body、数据库、stream、清理门禁通过，比较器 `passed`，配置/诊断差异为空。吞吐 `+2.1%`、request/response → React `-6.2%/-5.2%`、Yak CPU p95 持平；Yak RSS `+3.4%`、首次可见 `+24.0%`、Electron CPU p95 `+21.1%`、Long Task `161 → 226 ms (+40.4%)`、persist write p95 `+40.0%`。候选按确定性后端 allocation 收益保留，但反向 Renderer/首显/写库指标继续进入固定硬件复验，不描述为 UI 提速。

#### Phase 2 response fix 与限长只读 Body 第二十五轮证据（2026-07-24）

后端 pprof 显示，response 限长只为比较长度却复制约 `33.0 MiB` Body；lowhttp 执行和 HTTPFlow 存储又都丢弃 `FixHTTPResponse` 返回的 Body，合计再复制约 `62.6 MiB`。候选保留旧公开 API 的独立 Body 语义，增加只返回 owned 重组报文的 packet-only 入口；普通 Body 使用 view，malformed chunked 因旧错误预览可能原地写入而保留防御性 clone。限长路径也只读 view，真正截断仍新建报文。plain/gzip/chunked/100-Continue/错误输入差分、输入/输出/旧 Body ownership、lowhttp 全包、Yakit 定向测试和 race 均通过。

5 次 256 KiB 微基准中，response fix 为 `723.359 → 680.101 µs (-6.0%)`、`556,261 → 294,125 B/op (-47.1%)`；限长 Body 读取为 `45.214 → 0.894 µs (-98.0%)`、`262,777 → 618 B/op (-99.8%)`。heap `reports/e2e-electron/2026-07-24T14-09-50-940Z` 对照 `2026-07-24T13-25-18-259Z`：目标切包分配 `95.67 → 约 1 MiB`，`GetHTTPPacketBody` 的 `33.04 MiB` 消失，Fix focus cumulative `-38.7%`，总累计分配 `-6.1%`；结束 live heap `+4.1%`，不宣称常驻内存改善。

严格 3+3 为 `body-2026-07-24T13-30-36-835Z` → `body-2026-07-24T14-15-45-537Z`，比较文件 `comparison-vs-response-body-clones.{json,md}`。六次 120/120 和全部正确性/清理门禁通过，配置、诊断及实际 Renderer 输入一致。Yak CPU p95 `-0.7%`、峰值 RSS `-4.4%`、首次可见 `-22.9%`、Long Task `-49.1%`；吞吐 `-8.5%`、request p95 `+9.3%`、request/response → React `+17.9%/+6.5%`、Query p95 `3.153 → 63.438 ms`、Electron CPU p95 `+4.3%`。候选按确定性 allocation/ownership 证据保留，UI 与 SQLite 反向项进入固定硬件复验，不描述成体感提速。

#### Phase 2 response fix provenance owned handoff 第二十六轮证据（2026-07-24）

后端现在只为成功完成 `FixHTTPResponsePacket` 的正常 HTTP/1 响应建立 provenance，并在 parser 输入不保留测试证明后，把 fixed packet 从 lowhttp 经 minimartian/httpctx 以 owned 方式移交给 HTTPFlow 创建路径。未修改响应 take 一次并跳过第二次 fix；modified 响应会释放旧 packet 并保持原修复流程，`NoFixContentLength` 优先级不变。NoFix、NoBodyBuffer、多响应、HTTP/2/3 和失败修复都不复用。协议、数据库与公开 API 未改变，相关四个 package 的 focused/完整回归和 race 通过。

5 次 256 KiB 微基准中，重复 fix 的中位数为 `2.391 ms / 1,247,989 B/op / 319 allocs`，复用 fixed packet 为 `1.638 ms / 954,108 B/op / 236 allocs`，分别约 `-31.5%/-23.5%/-26.0%`。heap 报告 `reports/e2e-electron/2026-07-24T14-49-28-440Z` 对照 `2026-07-24T14-09-50-940Z`：目标 caller 消失，Fix cumulative `-48.2%`、`CreateHTTPFlow` cumulative `-17.5%`、`transform.Bytes` flat `-55.1%`、总累计分配 `-4.4%`；live heap `-2.1%` 仅为单样本。CPU 报告 `2026-07-24T15-01-46-777Z` 对照早于第二十五轮的同配置 `2026-07-24T11-45-52-112Z`：目标 caller 从 `290 ms/5.53%` 降到 top 外，Fix 链 `510 → 170 ms`、`CreateHTTPFlow 980 → 720 ms`，因此只作为第二十五、二十六轮累计归因。

严格 3+3 为 `body-2026-07-24T14-15-45-537Z` → `body-2026-07-24T14-54-42-668Z`，比较文件为候选目录下 `comparison-vs-response-fix-provenance.{json,md}`。六次 120/120 和 Body、数据库、stream、CPU 恢复、清理门禁通过，配置、诊断与实际 Renderer 输入一致。Yak CPU p95/RSS `+0.3%/+0.7%`、吞吐 `+6.2%`、request → React `-13.4%`、Query RTT `-11.8%`、数据库/Renderer 排空 `-51.1%/-42.3%`；request p95 `+27.5%`、首次可见 `+18.7%`、Long Task `115 → 284 ms (+147%)`、persist queue wait p95 `+32.7%`。候选 throughput/request/首显/Long Task 的 CV 为 `10.2%/16.3%/23.1%/47.5%`，因此按确定性后端证据保留，并把 UI/WSL 反向项留给固定硬件复验，不宣称整体体感提升。

#### Phase 2 response writer-only 与构建指纹修复第二十七轮证据（2026-07-24）

后端 minimartian 的 CONNECT、代理认证失败与普通响应路径此前把 `DumpHTTPResponse` 返回的完整序列化报文立即丢弃，却仍为它分配一份 cache。候选增加共享原序列化逻辑的 writer-only API，只替换这三个 discard caller；公开 Dump、wire bytes、Body 恢复和 ownership 不变。5 次 256 KiB 微基准由中位 `63.358 µs / 274,939 B/op / 16 allocs` 降到 `2.276 µs / 4,272 B/op / 9 allocs`。heap `reports/e2e-electron/2026-07-24T15-24-38-358Z` 对照 `2026-07-24T14-49-28-440Z`：总累计分配 `-5.4%`，目标序列化 cumulative 约 `-38.5 MB (-55.1%)`，旧 cache grow caller 消失；约 30 MiB 实际 client output 必须保留。live heap 单样本反向 `+3.5%`，不宣称常驻内存改善。CPU `2026-07-24T15-33-54-677Z` 中旧 `330 ms/7.93%` dumper 降到 top 阈值外；因响应只有 4 KiB 且有随机 RSA 噪声，只认目标 caller 与无 CPU 回归。

正式严格 3+3 为 `body-2026-07-24T14-54-42-668Z` → `body-2026-07-24T15-48-39-764Z`，比较文件为候选目录下 `comparison-vs-discarded-response-packet.{json,md}`。六次 120/120、精确 64 KiB request/256 KiB response、数据库、stream、CPU 恢复与清理门禁全部通过；比较器 `passed`，配置/诊断差异为空，实际 Renderer 输入指纹一致。候选三轮后端构建指纹均为 `a08ab85d69e9e44a583a`，cache 为 `false/true/true`。Yak CPU p95/RSS `-0.1%/-2.5%`、吞吐 `+3.4%`、request p95 `-23.1%`、首次可见 `-8.7%`、Renderer drain `-30.9%`、Long Task `-42.3%`；反向风险为 Query p95 `+116.8%`、change detection p95 `+271.9%`、Electron drain CPU `+18.1%` 和 producer-stop visible backlog `+42.9%`。Query/change detection CV 最高约 `79.7%/87.3%`，最终排空正确，因此保留确定性后端优化但不宣称 UI 全面收益。

本轮还修复了一个会污染长期 A/B 的 fixture 缺陷。原命令封装在 ChildProcess `exit` 时读取 stdout/stderr，并逐 chunk 解码；约 907 KiB、含中文的后端 git diff 会因 UTF-8 边界产生不稳定替换字符，导致同一源码构建指纹漂移。现在等待 `close`，收集 Buffer 后一次解码，并加入大中文 tracked diff 回归。`test:e2e:fixture` 9 项、完整 preflight 48 项通过，真实脏工作区连续 5 次 state/build fingerprint 一致。发现问题前的候选矩阵已明确作废，正式矩阵在修复后重跑。下一轮继续以后端 heap caller 为准，验证 response parser 中被调用方丢弃的 raw packet 是否可避免，同时保持 Body/httpctx 独立 ownership。

#### Phase 2 requestless response raw packet 第二十八轮证据（2026-07-24）

后端 `ParseBytesToHTTPResponse` 调用 `ReadHTTPResponseFromBytes(..., nil)` 时没有 request/httpctx 接收者，旧 parser 仍把 Header+Body 重建为完整 raw packet 后丢弃；`rsp.Body` 另有一份独立 allocation。候选只在 request 非 nil 时创建 raw buffer，无 request 路径继续独立持有 Body，有 request 路径继续向 httpctx 移交 bare packet。新增 bytes+request 的 input/bare/body ownership 回归，原 input-retention、Content-Length、focused race 和三个相关 package 完整回归通过。

256 KiB 优化前/后各 5 次微基准中位数为 `109.345 → 53.000 µs (-51.5%)`、`535,315 → 264,766 B/op (-50.5%)`、`55 → 52 allocs`。heap `reports/e2e-electron/2026-07-24T16-10-40-261Z` 对照 `2026-07-24T15-24-38-358Z`：总累计分配 `-10.3%`，`ParseBytesToHTTPResponse` cumulative `-58.3%`，`ReadHTTPResponseFromBytes` `-59.9%`，`bytes.growSlice -18.0%`，目标 raw-packet 写入行消失；约 47.65 MiB 的 owned Body 必须保留。post live heap `+2.7%`、positive live delta `-8.2%` 方向交错，不宣称常驻内存收益。标准 CPU case 只有 4 KiB response，总样本 `2.30 → 2.31 s`、吞吐 `101.39 → 102.40 req/s`，只认无总 CPU 回归。

正式严格 3+3 为 `body-2026-07-24T15-48-39-764Z` → `body-2026-07-24T16-17-57-516Z`，比较文件为候选目录下 `comparison-vs-requestless-response-raw-packet.{json,md}`。六次 120/120、精确 Body、数据库、stream、CPU 恢复和清理门禁通过，比较器 `passed`，配置/诊断差异为空，实际 Renderer 输入一致。候选三轮后端构建指纹均为 `542887dfcc4c0913032f`，cache 为 `false/true/true`。Yak CPU p95/RSS `+0.2%/+0.8%`、吞吐 `+5.3%`、request p95 `-12.8%`、首次可见 `-20.1%`、Query p95 `-28.4%`；反向风险为 request → React `+4.9%`、Renderer drain `+9.5%`、persist queue wait p95 `+55.8%`、max persistence backlog `+60%` 和 Electron CPU p50 `+28.2%`。最终排空正确，候选按确定性后端证据保留，不描述为 UI 全面改善。下一轮继续由最新 heap caller 排序，并保持 Body/httpctx/HTTPFlow ownership 门禁。

#### Phase 2 HTTPFlow quote 输入只读视图与滚动门禁第二十九轮证据（2026-07-24）

后端仍逐字节保留 `strconv.Quote` 数据库表示，只移除 quote 前完整 request/response `[]byte → string` 的临时输入副本。只读 view 不逃逸，quote 后用 `runtime.KeepAlive` 保证生命周期，返回 string 仍独立持有；nil/empty、中文/控制字符、非法 UTF-8、完整字节域与源输入修改后的差分/ownership 测试通过。64 KiB + 256 KiB `CreateHTTPFlow` 的 5 次微基准中位数为 `3.187 → 3.151 ms/op`、`2,734,899 → 2,390,940 B/op (-12.6%)`、`432 → 430 allocs`；独立 256 KiB quote 为 `942,083 → 671,746 B/op (-28.7%)`。heap `reports/e2e-electron/2026-07-24T16-33-49-322Z` 中两处临时 string caller 消失，`CreateHTTPFlow` cumulative `-12.8%`；总 allocation/live heap 单样本分别 `+1.7%/+3.2%`，只认目标副本收益。CPU `2026-07-24T16-38-03-642Z` 的 Create/quote 链为 `550 → 330 ms`、`150 → 80 ms`，仅作诊断。

正式严格比较为 `body-2026-07-24T16-17-57-516Z` → `body-2026-07-24T16-46-15-707Z`，比较文件为候选目录下 `comparison-vs-httpflow-quote-input-copy.{json,md}`。候选 3/3 均完成 120/120、精确 Body、数据库、shadow stream、详情与清理门禁，比较器 `passed`，配置/诊断差异为空，实际 Renderer 输入指纹未变。Yak CPU p95/RSS `+0.4%/-3.0%`、Electron CPU p95 `-3.5%`、吞吐 `+3.6%`、request → React `+2.2%`、首次可见 `+3.3%`；request p95 `+11.7%`、Renderer drain `+44.4%`、Query RTT `+156.5%`、backend Query p95 `+571.1%` 为反向风险，最终排空仍正确。候选仅按确定性后端 allocation 与中性 CPU/RSS 证据保留，不描述为 UI 提速。

第一次正式尝试 `body-2026-07-24T16-40-23-283Z` 仍保留为失败样本。失败时容器和虚拟 offset 已移动到 `1120/1008 px`，但旧驱动只等待“两帧 + 20 ms”，早于表格 `200 ms` 节流下的 React 行内容提交，首行仍读到 `120`。驱动现进行最多 `1.5 s` 的有界状态等待、每次重取 DOM，并把回顶门禁加强为首行也必须恢复；超时仍会失败，不降低门槛。preflight 48 项通过，随后三轮均验证 `120 → 84 → 120`，下滚实际等待 `111.9..118.7 ms`、回顶 `0.7..0.9 ms`。这一修复把“几帧后应该完成”的时间假设改成可观测条件，后续高负载和更慢 CI 仍可给出明确 timed-out 证据。

#### Phase 2 conn pool 成功响应延迟恢复副本第三十轮证据（2026-07-24）

后端连接池原先为每个成功响应预先复制一份完整 recovery packet，正常路径不会使用；候选改为只有解析错误或 `Connection: close` 后确实补读到尾随字节时才分配并组合，成功 packet、异常超时、连接淘汰和 httpctx ownership 语义不变。定点 256 KiB 基准由中位约 `38.067 µs / 262,146 B/op / 1 alloc` 降到 `0.492 ns/op / 0 B/op / 0 alloc`。heap `reports/e2e-electron/2026-07-24T17-04-36-726Z` 对照 `2026-07-24T16-33-49-322Z`：旧约 `28.80 MiB` caller 消失，`persistConn.readLoop -8.4%`、总累计分配 `-3.9%`、`bytes.growSlice -5.9%`；positive live delta `+10.2%`，因此不宣称常驻内存收益。4 KiB CPU 场景未采到目标 copy 且整体反向，只保留为诊断风险。

正式严格 3+3 为 `body-2026-07-24T16-46-15-707Z` → `body-2026-07-24T17-12-11-181Z`，比较文件为候选目录下 `comparison-vs-eager-conn-pool-recovery-copy.{json,md}`。六次均完成 120/120、精确 Body、数据库、shadow stream、详情、滚动、CPU 恢复和清理门禁，配置/诊断差异为空；候选三轮后端指纹均为 `b0f9f67fbbc613466aaf`，cache 为 `false/true/true`，实际 Renderer 输入指纹未变。Yak CPU p95/RSS `-0.5%/-0.1%`、request p95 `-18.2%`；吞吐 `-8.5%`、Electron CPU p95 `+3.2%`、首次可见 `+6.7%`、Long Task `+141.3%`、数据库 catch-up/drain `+83.8%/+61.7%` 为反向项，且多项范围较宽。候选按后端定点 allocation、ownership 与 heap caller 证据保留，不宣称 UI 或总吞吐改善；后续自动化继续给 response 各份表示提供同一套逐字节、落库、stream、滚动与资源恢复门禁。

#### Phase 2 MITM 中间响应 Body 丢弃第三十一轮证据（2026-07-26）

后端确认 minimartian 已完整捕获 wire packet，却还让 lowhttp parser 保留一份随后不会消费的临时 `http.Response.Body`。候选通过默认关闭、仅 minimartian 开启的内部选项，在普通 HTTP/1、明确 `Content-Length` 且不超过 1 MiB 时只保留 transport metadata；chunked/CL+TE、header callback、流式/超限/大 Body、特殊方法与公开默认 parser 全部保持旧行为。自动化新增逐字节、size、独立 ownership、短 Body、100 Continue、fallback 与连接池开/关集成门禁。未预扩容 drain 因 allocation 反向被拒绝，直接复用含 1xx 的外层 capture 因会改变 final-only bare 语义被拒绝。三个相关 Go package 的 focused/full/race 和前端 48 项 preflight 均通过。

5 次 256 KiB 微基准中位数为 `198.073 → 131.973 µs (-33.4%)`、`806,357 → 544,555 B/op (-32.5%)`、`65 → 64 allocs`。heap `reports/e2e-electron/2026-07-26T04-39-01-213Z` 对照 `2026-07-24T17-04-36-726Z`：连接池 read loop/parser cumulative `-60.7%`、body reader flat `-38.0%`、总累计分配 `-8.8%`、`bytes.growSlice -25.4%`，post live/positive live delta 也分别 `-3.4%/-11.6%`。4 KiB CPU 诊断 `2026-07-26T04-44-08-160Z` 整体反向，吞吐 `103.89 → 96.87 req/s`、request p95 `164.76 → 248.01 ms`；目标量低于采样分辨率，因此不宣称 CPU 提速。

正式严格 3+3 为 `body-2026-07-24T17-12-11-181Z` → `body-2026-07-26T04-48-05-606Z`，比较文件为候选目录下 `comparison-vs-retained-intermediate-response-body.{json,md}`。六次均完成 120/120、精确 64 KiB request/256 KiB response、数据库、shadow stream、详情、滚动、CPU 恢复和清理门禁；比较器 `passed`，配置/诊断差异为空，候选后端指纹 `a3ca1f78d46d2c0dd0f6`、cache `false/true/true`，实际 Renderer 输入未变。Yak CPU p95 近似持平、RSS `-1.5%`、吞吐 `+8.5%`、数据库 catch-up/drain `-59.5%/-47.7%`、persist → React `-15.4%`；request p95 `+16.3%`、duplex p95 `+251.2%` 与 Yak drain CPU `+42.4%` 为反向风险。duplex 候选的均值/最大值并未退化且两侧范围高度波动，故候选按确定性 allocation、heap 与正确性证据保留，不把混合端到端结果包装成 UI 全面提速。下一轮继续由 heap caller 驱动 `bytes.growSlice/io.ReadAll/bytes.Clone/splitHTTPPacketEx` 的 ownership 分析。

#### Phase 2 parser-owned Request Body dump 第三十二轮证据（2026-07-26）

后端请求 parser 已拥有独立 Body，但 `DumpHTTPRequest` 仍先用 `io.ReadAll` 建立临时副本。候选只对包内私有 owned Body 取得剩余只读 view，并保持原 reader 被消费到 EOF、dump 后恢复剩余 Body、输出独立 copy 的历史语义；外部或插件替换 Body 继续走旧 fallback。部分读取/恢复/output ownership/外部 fallback、并发 parser、相关五个 Go package 完整回归与 focused race 均通过，前端 preflight 48/48 通过。5 次 64 KiB 微基准中位为 `67.959 → 16.000 µs (-76.5%)`、`359,369 → 74,430 B/op (-79.3%)`、`34 → 18 allocs`。

heap `reports/e2e-electron/2026-07-26T05-35-58-885Z` 对照 `2026-07-26T04-39-01-213Z`：`DumpHTTPRequest cumulative -75.2%`，其 `io.ReadAll` caller 消失，全局 `io.ReadAll -64.0%`、总累计分配 `-8.4%`、post live `-1.9%`；`growSlice +4.1%`、`bytes.Clone +2.8%`、positive live delta `+5.9%` 保留为单样本风险。CPU `2026-07-26T05-41-58-226Z` 对照 `2026-07-26T04-44-08-160Z`：总样本 `-5.0%`，旧 dump/read-all caller 降到 top 外，请求 parser `280 → 130 ms`；单次 Yak RSS/Electron CPU p95 反向 `+1.6%/+6.8%`，不做整体 CPU 声明。

正式严格 3+3 为 `body-2026-07-26T04-48-05-606Z` → `body-2026-07-26T05-50-09-512Z`，比较文件为候选目录下 `comparison-vs-request-body-readback.{json,md}`。六次均完成 120/120 和全部正确性/清理门禁，比较器 `passed`，配置/诊断差异为空；候选后端指纹 `e89c39ecbfba4c444c9d`、cache `false/true/true`，实际 Renderer 输入未变。Yak CPU/RSS `+0.1%/-1.3%`、吞吐 `+1.7%`、request p95 `-1.1%`、Long Task `+1.2%`；Electron CPU p95 `+11.1%`、首次可见 `+17.6%`、Renderer drain `+25.5%`、database catch-up/drain `+52.9%/+32.8%` 为反向风险。候选按确定性后端证据保留，不宣称 UI 体感提升；下一轮先证明 clone 的跨阶段生命周期，再考虑 `splitHTTPPacketEx` 的显式 view caller。

#### Phase 2 unencoded auto-unzip Body 只读视图第三十三轮证据（2026-07-26）

后端 MITM V2 response mirror 的 `DeletePacketEncoding` 旧路径即使遇到普通未编码响应，也会先经 `SplitHTTPPacket` 复制完整 Body，确认无需转换后再返回原 packet。候选只在内部检测/解码函数使用 `splitHTTPPacketEx(..., copyBody=false)` 的只读 view；无变换和失败路径仍返回原切片，成功解压仍生成独立输出。审计发现畸形 chunked 的 decoder 会修改诊断输入，因此 chunked 分支明确保留防御性 clone；跨 goroutine/插件生命周期的 `SetPlainResponseBytes` clone 也未动。same-pointer、输入不变、成功输出 ownership、非法 gzip/chunked 回退门禁、focused race、完整 lowhttp（187.53 s）、MITM V2 gRPC 定向测试及前端 preflight 48/48 全部通过。5 次 256 KiB 微基准中位为 `52.909 → 1.412 µs (-97.3%)`、`263,137 → 974 B/op (-99.6%)`、`26 → 25 allocs`。

heap `reports/e2e-electron/2026-07-26T06-20-44-227Z` 对照 `2026-07-26T05-35-58-885Z`：旧 `DeletePacketEncoding 36,980,867 B` cumulative 消失，`MITMV2.func7 -41.8%`，总累计分配 `857,827,388 → 815,443,386 B (-4.9%)`，`growSlice/bytes.Clone -6.5%/-7.4%`；post live/positive live delta `+1.6%/+6.0%` 反向，不宣称常驻内存下降。CPU `2026-07-26T06-28-11-506Z` 总样本 `2.28 → 1.97 s`、GC flat `810 → 570 ms`，但标准 case 仅 4 KiB response，目标 caller 未进入采样，且 Electron CPU/首显反向，只作为无确定性 CPU 回退的诊断。

正式严格 3+3 为 `body-2026-07-26T05-50-09-512Z` → `body-2026-07-26T06-33-07-606Z`，比较文件为候选目录下 `comparison-vs-unencoded-unzip-body-copy.{json,md}`。六次均完成 120/120、精确 Body、数据库、shadow stream、详情、滚动、资源恢复和清理门禁；比较器 `passed`，配置/诊断差异为空。候选后端指纹 `a37abefdd1026d87ba27`，因前置诊断已预热构建，cache 为 `true/true/true`；实际 Renderer 输入仍为 `fa377df501505467d37539e9407e550f7931d1ebf5607b0d6cc4ce176fe3328a`。Yak CPU/RSS `+0.1%/-0.9%`、吞吐 `+0.8%`、request p95 `-10.8%`、首次可见 `-7.7%`、Renderer drain `-7.1%`、数据库 catch-up/drain `-22.6%/-15.9%`；Electron CPU p95 `+7.0%`、Query RTT `+64.8%`、database change detection `+77.6%` 为反向风险，Query/DB 分段仍高波动且最终排空正确。候选按确定性 allocation/ownership/heap 证据保留，不宣称 UI 全面提速；后续继续以 profile 统计决定前后端优先级，chunked 与跨阶段 plain/bare clone 在生命周期重构前保留。

#### Phase 2 mirror response 同步过滤 Body 只读视图第三十四轮证据（2026-07-26）

后端最新 heap 将约 `31.98 MB` 的 `SplitHTTPPacketFast` Body copy 定位到 MITM V2 response mirror：默认仅 bundled/static JS 过滤器同步读取，却每条流量都复制完整响应。候选改为同步只读 view；只有安装 `MirrorHTTPFlow` 插件 hook、Body 将跨 goroutine 时，才在启动前建立独立 snapshot。产品测试验证旧/新 Header 与 Body 逐字节一致、view 别名和 hook snapshot 双向独立；静态过滤、定向回归、focused race 及 62 个 MITM V2 MUSTPASS 测试（211.44 s）通过。256 KiB clone/view 5 次中位为 `55.616 → 0.897 µs (-98.4%)`、`262,778 → 618 B/op (-99.8%)`、`17 → 16 allocs`。

heap `reports/e2e-electron/2026-07-26T07-10-20-462Z` 对照 `2026-07-26T06-20-44-227Z`：旧 `SplitHTTPPacketFast/SplitHTTPPacket 31,979,396 B` cumulative 消失，`splitHTTPPacketEx` flat/cumulative `-82.9%/-76.6%`、`MITMV2.func25 -6.1%`；总分配仅 `-0.1%`，`growSlice/bytes.Clone` 单样本反向，live 指标交错，只认目标 caller。4 KiB CPU `2026-07-26T07-14-13-863Z` 总样本 `+4.6%`、GC flat 反向，目标低于采样阈值；Yak CPU p95 近似不变、RSS `-1.6%`，不作 CPU 提速声明。

首个正式矩阵 `body-2026-07-26T07-16-32-198Z` 保留为失败证据：第 3 轮在负载前由 Electron CDP bridge 返回 `Promise was collected`，应用/Yak 未崩溃且清理成功。失败点是同步幂等的场景 Observer 安装；自动化现只对这一精确传输错误重选主窗口并最多重试一次，应用/断言错误不重试、第二次失败继续上抛。新增成功、单次重试、非传输错误、二次失败 4 项单测，完整 preflight 从 48 增至 52 项并全部通过。失败矩阵前两轮没有被拼入结果，而是完整重跑。

有效严格 3+3 为 `body-2026-07-26T06-33-07-606Z` → `body-2026-07-26T07-26-19-918Z`，比较文件为候选目录下 `comparison-vs-mirror-response-body-copy.{json,md}`。六次均完成 120/120 和所有正确性/清理门禁，比较器 `passed`，配置/诊断差异为空；候选后端指纹 `578160e9bb081343ca73`、cache `true/true/true`，实际 Renderer 输入未变。Yak CPU/RSS `-0.1%/+1.2%`、吞吐 `+15.3%`、request p95 `-14.6%`、首次可见 `-22.6%`、Long Task `-32.5%`；Electron CPU `+6.0%`、Renderer drain `+41.9%`、database catch-up/drain `+75.7%/+47.7%`、persist wait `+118.2%`、duplex `+623.5%` 为反向项。候选吞吐范围 `71.3..79.4` 高于基线 `61.9..73.8 req/s`，max-rate 下生产提速同时暴露下游积压；候选按确定性后端证据保留，不宣称 UI 全面改善。下一轮应继续从 request fix/parser 热点推进后端，同时用固定速率/慢消费者矩阵单独约束数据库与 Renderer 消费。

#### Phase 2 后端请求重复修复/解析第三十五轮证据（2026-07-26）

MITMV2 request hijack 已持有 minimartian 解析完成并携带 httpctx 的 `originReqIns`，旧路径仍对原始请求执行 `FixHTTPRequest`，再调用内部还会修复 CRLF 的 `ParseBytesToHttpRequest`。额外解析结果在普通路径完全不用；手动 drop 虽传入一个建流 option，随后也会被 `createHTTPFlowFromHTTP` 的 `originReqIns` 覆盖。候选删除这段 eager fix/parse 与无效 option，不改变 wire、插件输入、数据库或公开 API。手动 drop、mirror ownership、62 个 MITM V2 MUSTPASS（211.53 s）和 focused race（11.59 s）通过。256 KiB 的 5 次微基准中，复用 origin request 约 `0.49 ns/op / 0 B/op / 0 allocs`，旧路径中位约 `237.984 µs/op / 1,347,495 B/op / 99 allocs`。

heap `reports/e2e-electron/2026-07-26T08-03-27-479Z` 对照 `2026-07-26T07-10-20-462Z`：总累计分配 `815,443,386 → 748,489,570 B (-8.2%)`，MITMV2 request handler cumulative `54.93 → 7.40 MiB`，旧两行约 `11.76 + 33.60 MiB` 完全消失，全局 request parse/fix 分别下降 `37.2%/40.7%`。正式 shadow 3+3 为 `body-2026-07-26T07-26-19-918Z` → `body-2026-07-26T09-01-25-649Z`，比较文件 `comparison-vs-eager-request-fix-parse.{json,md}`；配置/诊断差异为空、Renderer 输入指纹不变、候选后端指纹 `6fe8eab244e61640d25e`。Yak CPU p95/RSS `-0.1%/-9.2%`、Electron CPU p95 `-29.5%`、Renderer drain `-9.4%`；吞吐 `-5.2%`、首显 `+13.2%`、Long Task `+47.3%` 等交错项保留为风险。候选按确定性死工作、micro/heap/RSS 证据保留，不据此宣称 UI 全面提速。

#### Phase 2 固定速率归因与默认实时流第三十六轮证据（2026-07-26）

同一第三十五轮后端、同一 1000 请求 × 200 req/s 固定生产源的 shadow 3 次矩阵为 `body-2026-07-26T08-06-39-849Z`：SQLite persist queue/write p95 都为 `1 ms`、DB detect p95 `20 ms`，但 trigger → Query p95 `996.2 ms`、persist → React `958 ms`、最大可见积压 `193`。因此该场景主要卡在 Query 可见链路，不在 SQLite 写入；writer2/read pool 早前已被自动化判为退化，本轮不改数据库连接配置。

只切 body-free 专用流到 `canary` 的同源 3 次矩阵为 `body-2026-07-26T08-12-43-176Z`，候选的 `comparison-vs-shadow-phase35.{json,md}` 只允许这一项实验差异并通过。每轮 1000/1000、11 batch、1000 direct row，Query/fallback/Gap/Sequence gap/重复/乱序/unavailable 全为 0；request → React `970 → 490 ms (-49.5%)`、persist → React `958 → 486 ms (-49.3%)`、首显 `117 → 42 ms (-64.1%)`、最大可见积压 `193 → 36 (-81.3%)`、Renderer drain `-8.4%`、Yak RSS `-9.0%`，吞吐保持 `200.1 req/s`。风险项为 Electron CPU p50 `+25.3%`、Yak CPU p95 `+4.3%` 和 duplex p95 `+88.0%`；Electron CPU p95 `-24.9%`，Long Task 中位 `569 → 0 ms`、候选最大 `105 ms`。

当前后端的慢消费者复验 `body-2026-07-26T08-23-13-914Z` 同样通过：小 Body 精确对账 `234 direct + 566 Query = 800`（540 fallback row），大 Body 为 `89 direct + 151 Query = 240`（142 fallback row），恢复 entry/completion 都为 `1/1`，回顶到排空分别 `1921/2182 ms`，最终无缺失 ID、Gap、重复或未匹配。基于固定速率收益与恢复门禁，Renderer 产品默认和 E2E 默认均改为 `canary`，但 Query 保留为旧引擎 `UNIMPLEMENTED`、Gap/断流、项目/筛选切换、离顶、恢复和游标不兼容的降级路径；没有协议/API/数据库迁移。针对 stream/observability 的 35 项 Vitest、完整 preflight 52/52、受限 Renderer build 均通过；新 Renderer 输入指纹为 `9cb881b6298183534bb3d574bb9403af8264269dd20645d6aa01d7fdfcd96f6f`。最终默认 smoke `body-2026-07-26T09-14-17-341Z` 完成 1000/1000、11 batch、0 Query/fallback/协议错误，request → React `492 ms`、首显 `42 ms`、最大可见积压 `43`。后续继续覆盖断线重放、项目/筛选迁移、长时/突发、100+ 站点与真实 Chromium/nuclei。

#### Phase 2 后端 response packet Body 受控只读视图第三十七轮证据（2026-07-26）

最新大 Body heap 将两份独立 response parser Body 定位到受控 caller：minimartian 已拥有完整且生命周期明确的 `LowhttpResponse.RawPacket`，交互式响应劫持也已经需要一份独立结果快照，旧路径却在解析时再次复制 Body。后端新增显式 opt-in 的 packet Body view parser；旧公开 parser 的独立 Body 语义不变。minimartian 只对自己的 immutable raw packet 启用，劫持路径仍保留一次必要 `bytes.Clone` 快照并让 Body 引用该快照，因此不共享外部可变 packet，也没有 proto、数据库或前端调用契约的破坏性变更。

普通/短 Content-Length、100 Continue、chunked、输入不变、view 别名、minimartian caller 和劫持 snapshot ownership 测试，以及三个相关 package 的 full/focused/race 和全部 MITMV2 MUSTPASS（210.885 s）通过。256 KiB 的 5 次微基准中位约为 `66.299 → 5.005 µs/op (-92.5%)`、`264,974 → 2,824 B/op (-98.9%)`、`54 → 53 allocs`。heap `2026-07-26T10-24-19-483Z` 对照 `2026-07-26T08-03-27-479Z`：总累计分配 `748,489,570 → 692,794,542 B (-7.4%)`，两条合计约 `67.35 MiB` 的旧 response Body 读取 caller 消失；约 `36.24 MB` 的显式 clone 是保留的劫持 snapshot，不作为可删副本。heap 后端指纹为 `53d8b443935d4979830f`，120/120 与全部正确性/清理门禁通过。

正式严格 shadow 3+3 为 `body-2026-07-26T09-01-25-649Z` → `body-2026-07-26T10-41-13-373Z`，比较文件为候选的 `comparison-vs-copied-response-body.{json,md}`；比较器 `passed`，配置/诊断差异为空，Renderer 输入指纹保持 `fa377df501505467d37539e9407e550f7931d1ebf5607b0d6cc4ce176fe3328a`，候选后端指纹 `10ec43a2a0d6c40ecb0b`、cache `false/true/true`。中位吞吐 `+3.7%`、request/response → React `-4.5%/-2.6%`、persist queue/write `-22.4%/-43.3%`、Long Task `-25.5%`，Yak CPU 基本持平；Yak RSS `+5.6%`、Renderer drain `+12.0%`、Electron CPU p95 `+12.9%`、request p95 `+8.3%`、首显 `+6.3%` 与高波动 DB detection `+149.3%` 记为风险，因此只认确定性 allocation/ownership 收益，不宣称 UI 全面提速。

恢复默认 canary Renderer 指纹 `9cb881b6298183534bb3d574bb9403af8264269dd20645d6aa01d7fdfcd96f6f` 后，默认固定速率 smoke `body-2026-07-26T10-51-59-171Z` 精确完成 1000/1000，11 个 direct batch、0 Query/fallback/Gap/顺序错误，吞吐 `199.86 req/s`、request → React `489 ms`、首显 `44 ms`、最大可见积压 `39`。这验证了后端分配优化和第三十六轮默认实时链路可以组合工作；下一轮继续按最新 heap 的 `bytes.growSlice`、必要 clone、quote/SQLite bind 及 Renderer 长时观测做 caller 级归因。

#### Phase 2 parser-owned bare request 移交第三十八轮证据（2026-07-26）

第三十七轮 heap 的 clone caller 拆分确认：request parser 已在本地 `bytes.Buffer` 重建完整 bare packet，却调用兼容外部可变输入的 setter 再复制整包；该本地 buffer 在调用后不再使用。后端新增窄 owned-handoff API，只由 parser 移交独占 packet；原 setter、plain/hijacked request/response 和所有外部 caller 继续克隆。调用方输入、httpctx bare packet 与 Body 仍相互独立，没有 wire、proto、数据库或前端契约的破坏性变更。

64 KiB request parser 的 5 次中位为 `54.235 → 30.083 µs/op (-44.5%)`、`215,453 → 141,724 B/op (-34.2%)`、`50 → 49 allocs`。完整 utils（28.449 s）、lowhttp（183.745 s）、httpctx、focused race 和并发/ownership 回归通过。第一次全 MITM V2 组合运行中，invalid-UTF8 详情用例命中固定 4 秒 DB 查询 deadline；隔离 3/3 通过后，全套再次运行 195.780 s 全部通过，明确记录为组合长跑 flake。

heap `2026-07-26T11-15-02-333Z` 对照 `2026-07-26T10-24-19-483Z`：parser 下约 `21.98 MiB` bare-request clone 消失，全局 `bytes.Clone 116,717,473 → 88,642,234 B (-24.1%)`、request parser cumulative `-26.5%`、总累计分配 `692,794,542 → 647,763,815 B (-6.5%)`。外部劫持、plain request/response 和 response snapshot clone 均保留。post-live heap 和 positive live delta 单样本反向，不宣称常驻内存改善；报告 120/120 通过，诊断后端指纹 `c8547a51c57cfa36f129`。

正式严格 shadow 3+3 为 `body-2026-07-26T10-41-13-373Z` → `body-2026-07-26T11-51-53-723Z`，比较文件为候选的 `comparison-vs-cloned-request-bare-packet.{json,md}`。比较器 `passed`、配置/诊断差异为空，Renderer 输入保持 `fa377df501505467d37539e9407e550f7931d1ebf5607b0d6cc4ce176fe3328a`，候选后端指纹 `ae8561a7c4869b2905a6`、cache `false/true/true`。request p95 `-11.9%`、首显 `-15.3%`、backend conversion `-20.1%`、Renderer drain `-7.9%`，Yak CPU/RSS 基本持平；吞吐 `-2.1%`、request → React `+4.2%`、Electron CPU p95 `+10.5%`、Long Task `+13.8%`、persist queue/write `+9.6%/+47.1%` 和高波动 DB detection `+181.4%` 为风险。候选按确定性 ownership/micro/heap 证据保留，不描述为 UI 全面提速。

产品 canary 指纹恢复为 `9cb881b6298183534bb3d574bb9403af8264269dd20645d6aa01d7fdfcd96f6f` 后，默认 fixed-rate smoke `body-2026-07-26T12-00-09-473Z` 完成 1000/1000、11 batch、0 Query/fallback/协议错误，吞吐 `200.10 req/s`、request → React `493 ms`、首显 `43 ms`、最大可见积压 `38`、SQLite queue/write `1/1 ms`、Long Task `0 ms`。下一轮继续区分必要 wire buffer、跨阶段 snapshot、query parsing 与 SQLite bind；数据库或前端只在统计指向它们时调整。

#### Phase 2 后端有界 Content-Length 请求读取第三十九轮证据（2026-07-26）

第三十八轮 heap 继续归因后，普通网络请求的确定长度 Body 仍经 `io.ReadAll` 几何扩容，parser-owned raw packet 也独立扩容。后端候选仅在 `Content-Length <= 1 MiB` 时精确读取一次、对 raw packet 做同样有界的容量预留，并把独占读取切片直接移交给 Body；更大长度、chunked 和未知长度保留旧路径。1 MiB 是防止不可信长度导致无界预分配的内部保护，不是产品阈值。短 Body、`Content-Length + chunked` 歧义处理、wire bare packet、caller/bare/body 独立性均保持，没有前端、proto、数据库或公开 API 迁移。

64 KiB bufio parser 的 5 次中位为 `83.963 -> 34.462 us/op (-59.0%)`、`426,616 -> 141,644 B/op (-66.8%)`、`63 -> 45 allocs (-28.6%)`。完整 utils（28.353 s）、focused race、lowhttp（主包 185.804 s）和全部 MITMV2 MUSTPASS（208.039 s）通过。heap `2026-07-26T14-24-26-460Z` 对照 `2026-07-26T11-15-02-333Z`：网络 parser 入口 cumulative `-62.6%`，整个 parser cumulative `-45.6%`，旧 `io.ReadAll 42,996,592 B` 栈消失、替代 helper 为 `11,712,507 B`；总窗口分配却 `+0.5%`，post/positive live 方向交错，因此不宣称整体内存下降。

正式严格 shadow 3+3 为 `body-2026-07-26T11-51-53-723Z` -> `body-2026-07-26T14-40-58-936Z`，候选比较文件 `comparison-vs-bounded-content-length-read.{json,md}`。六轮 120/120，比较器 `passed`，配置/诊断差异为空，Renderer 输入指纹保持 `fa377df501505467d37539e9407e550f7931d1ebf5607b0d6cc4ce176fe3328a`，候选后端指纹 `c0bdbe701f755f542dd7`、cache `false/true/true`。吞吐 `+7.4%`、Electron CPU p95 `-16.4%`、Long Task `-55.7%`、Yak CPU/RSS 近似持平或略降；request p95 `+16.8%`、首显 `+13.9%`、request -> React `+4.3%`、Renderer drain `+37.6%` 为反向项，且多数区间重叠。候选只按确定性的后端 micro/heap caller 证据保留。

临时 shadow 测量后已重新恢复并构建产品 canary，指纹回到 `9cb881b6298183534bb3d574bb9403af8264269dd20645d6aa01d7fdfcd96f6f`。默认 fixed-rate smoke `body-2026-07-26T14-49-28-551Z` 完成 1000/1000、11 batch、1000 direct row、0 Query/fallback/Gap/顺序错误，吞吐 `200.09 req/s`、request -> React `496 ms`、首显 `53 ms`、最大可见积压 `43`、SQLite queue/write `1/1 ms`；Long Task 单样本为 `107 ms`，按波动保留。相关 Renderer Vitest `68/68`、完整 E2E preflight `52/52` 和两次受限构建（shadow 测量、canary 恢复）均通过。统计仍未指向 SQLite 或 Renderer 为本轮目标，因此没有追加数据库/GORM 或前端消费修改，继续以新 heap caller 决定下一阶段。

### Phase 3：历史回归资产化

- 收集历史人工回归问题并按风险排序；
- 启动/引擎/项目/MITM/HTTP History/插件/多窗口优先；
- 每个线上回归修复必须附带最低可行层级的自动化用例；
- 建立 flaky、执行时长和失败归因仪表盘。

### Phase 4：打包与跨平台

- electron-builder packaged test build；
- Windows/macOS/Linux 矩阵；
- 文件、权限、协议链接、升级和签名相关场景；
- 正式 release artifact 的外部健康检查；
- 发布门禁和产物保留策略。

## 14. Phase 0 验收标准

- 一条命令可创建隔离环境并启动 WDIO；
- 缺少 Renderer 产物时快速失败并给出构建命令；
- 不读写默认 userData、默认 YAKIT_HOME 或用户项目；
- Smoke 能识别 Link 和 Main 两个窗口，而不是误用第一个窗口；
- 失败自动保存截图、窗口状态和 Main/Renderer 日志；
- WDIO 退出后不残留 Electron 进程和临时目录；
- 单元测试验证测试模式关闭、缺少路径、相对路径和合法隔离路径；
- 文档明确生产包调试桥不可放宽。

## 15. 参考

- [Electron Automated Testing](https://www.electronjs.org/docs/latest/tutorial/automated-testing)
- [WebdriverIO Electron](https://webdriver.io/docs/desktop-testing/electron/)
- [WebdriverIO Electron Configuration](https://webdriver.io/docs/desktop-testing/electron/configuration/)
- [WebdriverIO Best Practices](https://webdriver.io/docs/bestpractices/)
- [WebdriverIO Page Objects](https://webdriver.io/docs/pageobjects/)

## 16. 第四十轮：后端最终响应抓包借用与扩大资源门禁（2026-07-26）

后端仅在 minimartian 的受控连接池路径借用已经存在的最终 wire response，避免 metadata parser 为固定 `Content-Length` Body 再保留一份同尺寸 raw packet。opt-in 同时要求 discard intermediate body、无 body-stream callback、非 SSE 且最终响应长度有界；`100/103` 后缀、短包、chunked fallback、非连接池独立 ownership 和 focused race 均有自动化覆盖。普通 lowhttp、公开 setter、proto、数据库和 Renderer 消费契约不变。

256 KiB 微基准 5 次中位为 `110.392 -> 69.911 us/op (-36.7%)`、`544,440 -> 273,959 B/op (-49.7%)`。同配置 heap `2026-07-26T14-24-26-460Z -> 2026-07-26T16-08-37-759Z` 中，总累计分配 `-11.86%`，目标 parser `-42.36% (-30.64 MB)`，符合 120 份 256 KiB 副本；post-live `+1.24%`，不宣称常驻内存改善。严格 shadow 3+3 为 `body-2026-07-26T14-40-58-936Z -> body-2026-07-26T16-11-14-215Z`，比较文件 `comparison-vs-phase39-response-borrow.{json,md}`；六轮 120/120、配置/诊断差异为空。request p95 `-26.0%`、首显 `-16.2%`、Renderer drain `-22.6%`，但吞吐 `-2.9%`、Electron CPU p95 `+11.5%`、Long Task `62 -> 110 ms`、Query p95 `65 -> 90 ms`，因此只保留确定性后端分配收益，不包装成 UI 全面提速。

本轮按逐步扩大资源范围的约束，复跑 240 条慢消费者场景：64 KiB request 与 256 KiB response 合计 `15 + 60 MiB` Body，报告 `2026-07-26T16-17-54-684Z` 完成 240/240，`98 direct + 142 Query`，恢复 `1/1`，Gap、缺序、重复、乱序和最终 backlog 均为 0；回顶到排空 `2117 ms`、DB/Renderer 排空 `276/311 ms`、CPU 恢复 `2018 ms`。恢复产品 canary 后，默认 smoke `body-2026-07-26T16-31-25-058Z` 完成 1000/1000、11 direct batch、0 Query/fallback/协议错误、最大可见 backlog 37。下一轮继续由后端 heap 决定目标，只有观测明确指向 SQLite 或 Renderer 时才调整数据库或前端。

## 17. 第四十一轮：Query 参数解析临时分配清理（2026-07-26）

后端 `ParseQueryParams` 原来会为完整 query/body 创建 `bytes.Buffer`、同尺寸 `bufio.Reader` 和逐段 `ReadString`，普通未转义值还会进入 `%u` 正则与 URL decoder。候选只改变内部 framing：在 immutable string 上按 `&` 取 slice，保留原 handler 的 trim、首 `=`、template escape、顺序与 options；不含 `%`/`+` 的解码输入按等价 identity 快路径返回。内部 POST form 解析使用已有 owned Body snapshot 的只读 view，不借用 mutable wire packet。固定边界、2000 组随机差分、URL 解码 oracle、race、完整 lowhttp 与 MITMV2 长套件通过。

64 KiB `GetPostCommonParams` 5 次中位为 `421.846 -> 247.209 us/op (-41.4%)`、`656,162 -> 65,967 B/op (-89.9%)`、`23 -> 10 allocs`；同二进制旧/新 parser 为 `100.802 -> 63.411 us/op`、`262,371 -> 152 B/op`。shadow heap `2026-07-26T16-08-37-759Z -> 2026-07-26T17-01-10-097Z` 中，总 allocation `-10.4% (-59.75 MB)`，`GetPostCommonParams -89.0%`，旧 `ParseQueryParams 64.70 MB` 与正则 `40.16 MB` 栈消失，post-live `-1.3%` 只作诊断。

正式 shadow 3+3 为 `body-2026-07-26T16-11-14-215Z -> body-2026-07-26T17-06-42-680Z`，比较文件 `comparison-vs-buffered-query-parser.{json,md}`；六轮 120/120、配置/诊断差异为空。吞吐 `+12.1%`、request p95 `-10.4%`、request -> React `-8.3%`、Renderer drain `-21.3%`、Electron CPU p95 `-17.4%`，Yak CPU/RSS 基本持平；首显 `+8.9%` 和 CV `91.8%` 的 DB detection 反向，故仍按确定性后端 allocation 收益保留，不宣称 UI 全指标改善。

完整 canary 慢消费者矩阵 `body-2026-07-26T17-13-20-728Z` 继续通过：800 条为 `184 direct + 616 fallback`、恢复 `3/3`，75 MiB 场景为 `91 direct + 133 fallback`、恢复 `1/1`，无 Gap/缺序/重复/乱序。默认 fixed-rate smoke `body-2026-07-26T17-17-53-978Z` 完成 1000/1000、200.10 req/s、11 direct batch、0 Query/fallback/协议错误，request -> React `489 ms`、首显 `41 ms`、最大 backlog 36、SQLite queue/write `1/1 ms`。前端本轮没有产品代码变更；自动化继续提供跨后端/数据库/Renderer 的统一门禁。

## 18. 第四十二轮：后端报文 ownership 与四档 Body 扩展（2026-07-27）

后端将 heap 中的 clone 按生命周期拆分：外部劫持响应和无压缩 plain packet 仍保留隔离副本；只有 `hijackRequestHandler` 内刚生成、立即交给同一 req context 的 HTTP request dump 走 owned handoff。gzip/br/chunked 解码确实产生独立新报文时也可以转交 plain cache，无编码路径仍 clone。原 packet 篡改、解码后指针、focused race、完整 creep/lowhttp/MITMV2 长套件都通过。

256 KiB request dump 配对基准为 `92.878 -> 48.778 us/op (-47.5%)`、`541,207 -> 270,851 B/op (-50.0%)`；256 KiB gzip response decode/cache 为 `343.930 -> 302.931 us/op (-11.9%)`、`1,769,296 -> 1,498,949 B/op (-15.3%)`。shadow heap `2026-07-26T17-01-10-097Z -> 2026-07-26T18-07-33-609Z` 中，目标 request-context clone `12.33 MB` 完全消失，全局 `bytes.Clone 82.87 -> 64.77 MB`；总 allocation `+1.9%`、post-live `+4.4%` 是反向单样本，不作常驻内存改善宣称。

正式 shadow 3+3 为 `body-2026-07-26T17-06-42-680Z -> body-2026-07-26T18-10-31-124Z`，比较文件 `comparison-vs-request-dump-owned-transfer.{json,md}`；六轮 120/120，配置、诊断、Body、DB、stream、虚拟滚动和清理差异均为空。吞吐 `+0.9%`、request p95 `+2.2%`、request/response -> React `+0.4%/+3.6%`、Yak CPU p95 `-0.3%`、Yak RSS `-3.0%`。Renderer drain `539 -> 879 ms` 和 Query p95 `48.2 -> 64.3 ms` 反向，保留为无直接 caller 但需继续观测的风险。

自动化额外执行了完整 canary body matrix `body-2026-07-26T17-55-20-869Z`：small、64 KiB request、256 KiB response 与 64/256 KiB 双向四档均 120/120，累计约 83 MiB Body，无清理残留。最终 fixed-rate `body-2026-07-26T18-16-26-961Z` 完成 1000/1000、`199.66 req/s`、11 direct batch、0 Query/fallback/协议错误、最大 backlog 32、最终 backlog 0，request -> React `488 ms`、首显 `55 ms`、SQLite queue/write `1/1 ms`。前端产品代码本轮未修改；下一自动化扩展将显式加入 gzip 响应 case，以区分 wire bytes 与解码后 detail Body。

## 19. 第四十三轮：gzip wire/detail oracle 与 UTF-8 恒等解码（2026-07-27）

自动化现已显式覆盖压缩响应。fixture 支持 `identity/gzip`，target 只压缩一次并同时报告 decoded/wire Body 大小，producer 验证 `Content-Encoding` 与精确 wire bytes，`GetHTTPFlowById` 再验证 MITM 落库的是精确 decoded Body。encoding 写入 case、报告和比较身份，harness 升至 v9，避免将 identity 基线误用于 gzip 候选。新增 `mitm-compressed-matrix.json` 快速回归、`mitm-compressed-fixed-rate-matrix.json` 扩大 canary 及对应 package scripts；fixture/matrix/comparator 共 25 项定向 Vitest 通过，受限 Renderer 构建通过。

后端 gzip heap 基线 `reports/e2e-electron/2026-07-26T18-33-30-456Z` 显示，已检测为 UTF-8 的 256 KiB JSON 仍经 identity decoder 分配，`transform.Bytes` 为 `23,984,547 B`。候选保持 converted signal、HTML/GBK/未知 charset 与 replacement-rune 行为，仅复用已经验证的 UTF-8 bytes。配对微基准中位 `472.510 -> 195.724 us/op (-58.6%)`、`262,188 -> 0 B/op`；完整后端 race/lowhttp/MITMV2 门禁通过。候选 heap `2026-07-26T18-44-00-038Z` 的目标栈消失，总 allocation `-6.5%`，post-live `+0.7%` 不作常驻内存结论。

正式 gzip shadow 3+3 为 `body-2026-07-26T18-36-06-289Z -> body-2026-07-26T18-48-25-177Z`，候选比较文件 `comparison-vs-utf8-identity-decoder.{json,md}`，六轮 120/120 且无配置/诊断差异。backend conversion p95/per-flow p95 `-22.7%/-52.9%`，吞吐 `+1.1%`、Yak CPU p95近似持平、RSS `+1.4%`；Renderer drain `-15.6%`，但 backend Query p95 `+72.5%`、Electron CPU p95 `+27.3%`、Long Task `+8.9%` 保留为 WSL 短样本风险，不包装成 UI 全面改善。

扩大 canary 矩阵 `body-2026-07-26T19-08-22-255Z`、报告 `2026-07-26T19-08-22-892Z` 完成 400/400：400 个 256 KiB decoded gzip response，共 100 MiB，目标 100 req/s 下完成/调度 `99.48/99.99 req/s`。10 direct batch、400 direct row、0 Query/fallback/Gap/缺序/重复/乱序/unavailable，最大可见 backlog 38、最终 0、CPU `2021 ms` 恢复，wire 318 B 与 detail 262,144 B 继续逐条匹配。前端产品代码、SQLite/GORM/proto 本轮均未修改；新增内容只扩展可重复执行的压缩性能门禁。

## 20. 第四十四轮：gzip 解码预分配与严格通信模式隔离（2026-07-27）

后端继续从压缩 heap 最大 caller 推进：gzip ISIZE 只作为最多 1 MiB 的投机容量提示，实际输出仍受 32 MiB 上限、EOF/CRC 校验和保守回退约束。256 KiB 配对微基准 5 次中位为 `254.150 -> 90.785 us/op (-64.3%)`、`1,227,316 -> 311,595 B/op (-74.6%)`、`28 -> 8 allocs`；完整 race/lowhttp/MITMV2 门禁通过。自动化 heap `2026-07-26T19-36-18-312Z` 仍逐条验证 318 B gzip wire 与 262,144 B decoded detail，120/120 通过。相对 `2026-07-26T18-44-00-038Z`，总 allocation `515.35 -> 293.34 MB (-43.1%)`，旧 `io.ReadAll 287.92 MB` 消失，positive-live `-38.8%`、post-live `-0.6%`；heap 是 forced-GC 单样本诊断，不作常驻内存声明。

第一次候选 3 次矩阵 `body-2026-07-26T19-41-17-290Z` 全部通过，但 runner 当前默认是 `HTTPFlow live stream=canary`，而第四十三轮基线是显式 `shadow`。比较器因 `httpFlowLiveStreamMode` 不同拒绝 A/B。该组保留为 3 次 canary 稳定性证据，未使用 `--allow-diagnostic` 绕过。随后显式 shadow 重跑得到 `body-2026-07-26T19-46-59-578Z`，与基线 `body-2026-07-26T18-48-25-177Z` 的 `comparison-vs-gzip-size-hint.{json,md}` 正式通过，配置/诊断差异为空。六轮均 120/120；吞吐 `+24.6%`、request p95 `-7.3%`、首显 `-41.1%`、Query RTT p95 `-63.8%`、Yak drain CPU p95 `-43.1%`、Yak RSS `-4.9%`。DB catch-up/drain `+38.2%/+26.0%`、最大 visible backlog `+30.0%` 和 Electron CPU p95 `+4.8%` 作为反向风险保留。

当前扩大 canary 为 `body-2026-07-26T19-52-36-960Z`、报告 `2026-07-26T19-52-37-603Z`：400 个 256 KiB decoded gzip response、100 req/s、并发 12，共 100 MiB decoded data。结果 400/400、完成/调度 `99.69/100.00 req/s`、request p95 `71.72 ms`、9 direct batch、400 direct row；Query/fallback/Gap/缺序/重复/乱序/unavailable 全为 0，最大 persistence/visible backlog `2/14`、停止和最终 backlog 为 0、CPU `2019 ms` 恢复。上一轮同场景只有单样本，matrix comparator 按至少 3 次规则拒绝正式 A/B，因此与其相比的延迟/backlog/RSS 下降和 DB catch-up 上升只记录为方向性观察。

本轮前端产品逻辑、proto、SQLite/GORM 均未修改；前端只复用已落地的 gzip oracle、隔离引擎、通信模式身份校验、CPU 恢复与残留清理门禁。受限 Renderer/启动页顺序重建通过，所有 Electron 运行后无残留。下一轮继续让自动化同时约束后端 packet rebuild/quote/SQLite bind 候选，并在进入数据库或 Renderer 优化前先建立同模式、至少 3 次的可比较基线。

## 21. 第四十五轮：owned packet fold 与并发 session race 门禁（2026-07-27）

后端只对已经证明独占、且剩余 capacity 可容纳 Header 的解压 Body 做同 allocation 原地组包；公开 borrowed API、capacity fallback 和 `FixHTTPResponse` 的隔离语义不变。五次 256 KiB gzip decode + rebuild 中位为 `164.767 -> 117.762 us/op (-28.5%)`、`583,286 -> 312,691 B/op (-46.4%)`、`39 -> 36 allocs`。完整 race/lowhttp/MITMV2 门禁通过；race 还真实暴露并修复了多 MITMV2 session 竞争全局 plugin caller/channel、可能 double-close，以及四条异步路径共享外层 `err` 的问题。并发注册/替换/清理测试与手动劫持 race 均通过，前端通信协议未变化。

gzip heap `2026-07-26T19-36-18-312Z -> 2026-07-26T20-30-29-674Z` 中，总 allocation `293.34 -> 218.18 MB (-25.6%)`，旧 `ReplaceHTTPPacketBodyEx 66.96 MB` caller 消失，`bytes.growSlice -52.7%`；post-live `-1.85%`，positive-live delta `+59.8%` 只作 forced-GC 单样本风险。正式 shadow 3+3 为 `body-2026-07-26T19-46-59-578Z -> body-2026-07-26T20-39-54-761Z`，候选比较文件 `comparison-vs-owned-packet-fold.{json,md}`，六轮 120/120、比较器 `passed`、配置/诊断差异为空。吞吐 `+14.0%`、Electron CPU p95 `-9.2%`、Yak drain CPU p95 `-8.3%`；DB catch-up/drain、首显、Renderer drain 与 Query RTT 反向，按短样本风险保留，不宣称 UI 全面提速。

更大 canary `body-2026-07-26T20-45-36-491Z`、报告 `2026-07-26T20-45-37-147Z` 完成 400/400：100 MiB decoded gzip response 在 100 req/s 下实际 `99.69 req/s`，request p95 `80.51 ms`，9 direct batch、400 direct row，0 Query/fallback/Gap/缺序/重复/乱序/unavailable，最终 backlog 0，CPU `2021 ms` 恢复。受限 Renderer 与启动页顺序重建通过，Electron/Yak 无残留；前端产品逻辑、SQLite/GORM/proto 均未修改。下一轮继续用同一自动化约束后端 quote/SQLite bind 候选，只有 profile 明确指向 Renderer 时才调整前端。

## 22. 第四十六轮：HTTPFlow quote 输出移交与存储兼容门禁（2026-07-27）

后端继续使用标准库 `strconv.AppendQuote` 生成与历史 `strconv.Quote` 完全相同的数据库文本，只把函数内新建且之后不再修改的 byte buffer 作为 immutable string 移交，省去最终整份输出复制。全 byte/非法 UTF-8/Unicode/输入突变差分、focused race、完整 yakit persistence 和 MITMV2 门禁通过。256 KiB 当前路径与候选的五次中位为 `1.450 -> 1.407 ms/op (-3.0%)`、`671,746 -> 401,409 B/op (-40.2%)`、`2 -> 1 alloc`，没有 schema、proto 或历史读取迁移。

gzip heap `2026-07-26T20-30-29-674Z -> 2026-07-26T21-01-00-184Z` 中，`quoteHTTPPacket 79.80 -> 53.28 MB (-33.2%)`、总 allocation `-5.6%`、positive-live `-33.3%`，post-live `+0.7%` 只作诊断。正式 shadow 3+3 为 `body-2026-07-26T20-39-54-761Z -> body-2026-07-26T21-04-57-340Z`，比较文件 `comparison-vs-quote-output-handoff.{json,md}`；六轮 120/120、比较器 `passed`、配置/诊断差异为空。吞吐 `+6.6%`、request p95 `-11.9%`、Yak drain CPU p95 `-37.0%`、Yak RSS `-2.1%`；DB catch-up/drain、Renderer drain、request -> React 和 Electron CPU p95 反向，继续按风险记录。

更大 canary `body-2026-07-26T21-10-40-565Z`、报告 `2026-07-26T21-10-41-230Z` 完成 400/400、`100.14 req/s`、9 direct batch、0 Query/fallback/Gap/缺序/重复/乱序/unavailable，最终 backlog 0、CPU `2020 ms` 恢复。SQLite bind 的约 30 MB 位于外部 driver；GORM 侧改传 bytes 会触发 BLOB 语义，因此在无 driver 契约时不做。前端产品代码仍未修改，自动化继续作为后端 gzip reader/flate 候选的同构守门。

## 23. 第四十七轮：gzip reader 复用的全链路门禁（2026-07-27）

后端以自有 `bytes.Reader` wrapper 和标准库 `gzip.Reader.Reset` 复用 gzip/flate 状态，归还前清空 source，错误路径和并发路径均有 race/语义测试。五次 256 KiB 微基准中位为 `98.340 -> 89.620 us/op (-8.9%)`、`311,595 -> 270,388 B/op (-13.2%)`、`8 -> 2 allocs`；gzip heap `2026-07-26T21-01-00-184Z -> 2026-07-26T21-30-52-650Z` 中，总 allocation `-5.3%`，reader 与 flate dictionary 初始化栈消失，post-live `-0.56%`，positive-live 反向只作单样本风险。

正式 shadow 3+3 为 `body-2026-07-26T21-04-57-340Z -> body-2026-07-26T21-35-03-174Z`，比较文件 `comparison-vs-gzip-reader-pool.{json,md}`。六轮 120/120、配置/诊断差异为空，DB catch-up/drain、Electron CPU p95 和 Query RTT 改善；吞吐 `-3.6%`、request p95 `+9.4%`、首显 `+12.0%`、Renderer drain与 Yak drain CPU 反向，因此不把本轮描述成 UI 全面提速。

扩大固定速率 canary `body-2026-07-26T21-40-43-180Z`、报告 `2026-07-26T21-40-43-821Z` 完成 400/400 个 256 KiB decoded gzip response：实际 `99.38 req/s`、request p95 `65.02 ms`，9 direct batch、400 direct row、0 Query/fallback/Gap/缺序/重复/乱序/unavailable，最大 persistence/visible backlog `6/53`，最终 backlog 0、CPU `2022 ms` 恢复。前端产品代码仍未修改，Renderer 重建通过；自动化继续约束下一轮后端 quote 容量或其他 heap caller，并要求存储字节与压缩 wire/detail oracle 不变。

## 24. 第四十八轮：quote 容量策略的存储与最坏输入门禁（2026-07-27）

后端 `quoteHTTPPacket` 最多抽样 packet 首尾共 4 KiB，普通文本把预留从 50% 收紧到 12.5%，高转义或非法 UTF-8 仍使用 50%；最终编码仍由 `strconv.AppendQuote` 完成。普通 256 KiB HTTP 的分配 `401,409 -> 303,104 B/op (-24.5%)`，耗时约 `+1.0%`；控制字符和全 byte 场景保持原扩容次数，分配增量均低于 `0.4%`。语义/race、完整 persistence 和 MITMV2 长门禁通过，没有存储格式迁移。

gzip heap `2026-07-26T21-30-52-650Z -> 2026-07-26T21-59-36-191Z` 中，`quoteHTTPPacket -24.1%`、总 allocation `-8.5%`、positive-live `-11.6%`，post-live `+2.2%` 只作 forced-GC 风险。正式 shadow 3+3 为 `body-2026-07-26T21-35-03-174Z -> body-2026-07-26T22-09-02-145Z`，比较文件 `comparison-vs-adaptive-quote-capacity.{json,md}`；六轮 120/120、配置/诊断差异为空。DB/Renderer drain、可见积压和 Yak RSS 改善，吞吐、request p95、Query RTT、Electron CPU 与 Long Task 反向，因此不宣称 UI 全指标改善。

扩大固定速率 canary `body-2026-07-26T22-14-43-186Z`、报告 `2026-07-26T22-14-43-829Z` 完成 400/400 个 256 KiB decoded gzip response：`100.12 req/s`、request p95 `71.57 ms`，9 direct batch、400 direct row、0 Query/fallback/Gap/缺序/重复/乱序/unavailable，最大 persistence/visible backlog `4/50`，最终 backlog 0、CPU `2018 ms` 恢复。前端产品逻辑未修改；自动化继续把后端 allocation 候选与 Renderer/通信风险放在同一份报告中审计。

## 25. 第四十九轮：ASCII quote CPU 快路径与固定速率复验（2026-07-27）

后端只对全 ASCII HTTP packet 使用与 `strconv.Quote` 逐字节相同的 encoder，遇到非 ASCII 整包回退标准库。全 ASCII/全 byte/Unicode/非法 UTF-8 与存储读回 oracle、race、完整 persistence 和 MITMV2 长门禁通过。256 KiB ASCII 微基准中位 `1.408 ms -> 216.288 us (-84.6%)`，分配仍为 `303,105 B/op / 1 alloc`；末尾 Unicode 最坏回退仅 `+0.5%`。

同一 400 条、100 req/s、5 秒 CPU 诊断 `2026-07-26T22-25-45-716Z -> 2026-07-26T22-40-14-236Z` 中，总样本 `6.15 -> 5.30 CPU s (-13.8%)`、平均 CPU `123% -> 106%`、`quoteHTTPPacket 1.16 -> 0.38 s (-67.2%)`、memory/GC flat `2.07 -> 1.86 s (-10.1%)`；候选 400/400 且所有正确性门禁通过。正式 shadow 3+3 为 `body-2026-07-26T22-09-02-145Z -> body-2026-07-26T22-44-22-972Z`，比较文件 `comparison-vs-ascii-quote-fast-path.{json,md}`，六轮 120/120、配置/诊断差异为空。吞吐 `+44.8%`、request p95 `-20.8%`、Electron CPU p95 `-12.1%`、Long Task `53 -> 0 ms`；Renderer drain、最大可见积压和 Yak RSS 反向，按风险保留。

固定速率非诊断 canary `body-2026-07-26T22-50-06-164Z`、报告 `2026-07-26T22-50-06-812Z` 完成 400/400：`100.15 req/s`、request p95 `42.55 ms`、DB/Renderer drain `291/329 ms`，9 direct batch、0 Query/fallback/Gap/缺序/重复/乱序/unavailable，最大 persistence/visible backlog `4/18`，最终 backlog 0、CPU `2019 ms` 恢复。前一轮 canary 对应值为 `71.57 ms`、`358/392 ms`、visible backlog 50，方向性与 CPU 诊断一致。

自动化同时否决并撤回了只省 `3.0% B/op`、却让 gzip 微基准慢 `10.1%` 的 exact-hint EOF 探针原型。前端产品逻辑未修改；后续优先从 CPU/GC profile 继续降低后端短命对象，并单独规划真实 Chromium/nuclei 与长时断线矩阵。

## 26. 第五十轮：低密度 quote 容量的扩大 heap 与 A/B/A（2026-07-27）

后端把 quote 的固定 1/8 普通文本预留细分为低密度 1/64、中密度 1/8、高密度 1/2，并把 4 KiB 抽样改为首/中/尾，防止 Body 中部的控制字符或非 ASCII 被首尾样本漏掉。256 KiB ASCII 微基准中位 `214.735 -> 206.292 us/op (-3.9%)`、`303,105 -> 270,336 B/op (-10.8%)`，仍为一次分配；存储字节、Unquote、Unicode/非法 UTF-8 fallback 与输入 ownership 均未改变。focused race、完整 persistence 和 62 个 MITMV2 MUSTPASS 通过。

120 条 heap 因当前 case 与历史基线不一致、同代大对象样本仍有反向方差而被主动否决。扩大到 400 条、100 req/s、100 MiB decoded gzip response 后，`1/8` 控制报告 `2026-07-26T23-48-02-204Z` 到 `1/64` 候选 `2026-07-26T23-45-50-519Z` 的 `quoteHTTPPacket 125.65 -> 109.90 MB (-12.5%)`、总 allocation `577.61 -> 560.02 MB (-3.0%)`，两轮 400/400、配置和清理一致。CPU profile 中目标 quote `-23.7%`，但总 CPU `+2.8%`、GC/scanobject 反向，因此不宣称全局 CPU 改善。

无 profile 决策门禁使用候选 A1 `body-2026-07-26T23-53-13-414Z`、控制 B `body-2026-07-26T23-58-57-106Z`、候选 A2 `body-2026-07-27T00-05-18-037Z`，每组严格串行 3 轮、每轮 400 条。两个 comparator 均 passed、配置/诊断差异为空，九轮 3600/3600。A1 的 request p95/Electron CPU p95 相对 B 为 `+50.9%/+18.5%`，A2 则为 `-27.7%/-0.2%`；DB/Renderer drain 同样前后反转。稳定项是吞吐约 100 req/s、request -> React 两组均 `-0.2%`、response -> React `-1.4%/+1.2%`、Long Task 0，以及 0 Query/fallback/Gap/缺序/重复/乱序/unavailable/cleanup error。自动化据此保留直接分配收益，同时阻止把 WSL 时序噪声包装成 UI 全面提速。

本轮没有前端产品、proto、schema、数据库连接或 GORM 改动。后续自动化继续使用同配置 heap、CPU 和夹心矩阵审计后端 caller；只有 Renderer trace 明确归因到前端时才进入前端消费优化。

## 27. 第五十一轮：packet View 快路径的 heap/CPU 自动门禁（2026-07-27）

后端为无逐 Header hook 的标准 CRLF packet View 增加严格快路径，保留 Header 独立字符串、Body 只读 alias、请求首行 callback 和所有非标准报文回退。差分矩阵与 15 秒 fuzz（81,845 输入）、focused race、完整 lowhttp/yakit persistence 及 62 个 MITMV2 MUSTPASS 全部通过。256 KiB 无回调 View 的五次中位为 `809.7 -> 172.6 ns/op (-78.7%)`、`618 -> 96 B/op (-84.5%)`、`16 -> 1 alloc`；请求首行 callback 形式为 `731.2 -> 206.6 ns/op (-71.7%)`、`512 -> 104 B/op (-79.7%)`、`15 -> 2 allocs`。

自动化复用扩大后的 400 条固定速率 gzip 场景。heap 报告 `2026-07-26T23-45-50-519Z -> 2026-07-27T00-33-58-280Z` 均 400/400、100 req/s、wire/detail/DB/stream/cleanup 全部通过：总 allocation `-1.36%`，旧 parser cumulative `-41.1%`，计入新快路后 split 总量约 `-30.4%`，builder/bufio reader 均约 `-55%`。positive-live `-39.0%`、post-live `+1.9%` 保持 forced-GC 诊断属性。

CPU 报告 `2026-07-26T23-50-40-369Z -> 2026-07-27T00-47-15-795Z` 同样 400/400、最终 backlog 0、CPU 恢复；总采样 `+1.3%` 而 scanobject `-19.0%`，所以自动化阻止把目标微基准收益外推成整机 CPU 提升。本轮未修改前端产品逻辑、通信协议、proto、数据库、GORM 或 driver；Electron 只承担真实链路正确性、资源和清理门禁。下一轮继续由 heap caller 数据决定是否优化逐 Header hook，若进入前端则必须先由 Renderer trace 给出证据。

## 28. 第五十二轮：Header hook 快路的端到端门禁（2026-07-27）

后端把标准 CRLF packet 的只读 View 快路扩展到 MITM 逐 Header hook，并在执行任何 callback/hook 前完整预校验。这样既消除逐行 string/bufio/builder 成本，也修复“首行 callback 已执行、后续非规范 Header 再回退”可能造成的重复副作用；folded/LF-only 等输入仍完整回退。三种入口的 15 秒差分 fuzz 执行 75,911 次无差异，完整 lowhttp、yakit persistence、62 个 MITMV2 MUSTPASS 与 focused race 均通过。

逐 Header hook 的 256 KiB 微基准中位为 `792.5 -> 211.0 ns/op (-73.4%)`、`618 -> 96 B/op (-84.5%)`、`16 -> 1 alloc`。自动化 heap 报告 `2026-07-27T00-33-58-280Z -> 2026-07-27T01-14-29-233Z`、候选矩阵 `body-2026-07-27T01-14-28-592Z` 均完成 400/400；318 B gzip wire、262,144 B decoded detail、数据库、直接流、顺序与清理门禁全部通过。旧 parser cumulative `-48.5%`，计入新快路后 split 总量约 `-43.6%`，总 sampled allocation `-7.6%`；positive-live `+27.7%`、post-live `+5.2%` 反向，因此不宣称常驻内存改善。

CPU 报告 `2026-07-27T01-20-18-423Z`、矩阵 `body-2026-07-27T01-20-17-717Z` 同样 400/400、9 direct batch、0 Query/fallback/Gap/缺序/重复/乱序/unavailable、最终 backlog 0。总采样相对上轮 `-6.7%`，但目标 split 栈低于采样阈值且 GC 指标交错，自动化继续阻止全局 CPU 宣称。本轮没有前端产品逻辑、通信协议、proto、数据库配置、GORM 或 SQLite driver 变更；下一轮仍由后端 profile 选择目标，只有 Renderer trace 明确指向前端才调整消费链路。

## 29. 第五十三轮：response Header 分类的全链路复验（2026-07-27）

后端将 `fixHTTPResponse` 从“每条 Header 一到两次完整 lowercase”改为 case-folded 前缀分类，只为真正命中的 Transfer/Content-Encoding 构造小写值，保持 Content-Type、解码与报文字节契约。六条常见 Header 的五次微基准中位为 `700.0 -> 149.1 ns/op (-78.7%)`、`304 -> 24 B/op (-92.1%)`、`12 -> 1 alloc`；静态/端到端大小写 oracle、15 秒 fuzz、race、完整 lowhttp/yakit persistence 与 62 个 MITMV2 MUSTPASS 全部通过。

自动化 heap 报告 `2026-07-27T01-14-29-233Z -> 2026-07-27T02-49-20-863Z`、候选矩阵 `body-2026-07-27T02-49-20-127Z` 均完成 400/400。目标 `fixHTTPResponse -> strings.ToLower` 的约 `1.0 MiB` 采样栈消失；总 allocation `+3.8%`、positive-live `+16.8%`、post-live `-3.2%` 因大对象/forced-GC 方差方向交错，自动化只接受直接调用栈与微基准收益，不接受全局内存声明。

CPU 报告 `2026-07-27T02-55-06-007Z`、矩阵 `body-2026-07-27T02-55-05-254Z` 同样 400/400、约 100 req/s、400 direct row，0 Query/Gap/缺序/重复/乱序/unavailable、最终 backlog 0、CPU 恢复。总采样 `5.15 -> 5.62 CPU s`，目标低于 5 秒 profile 分辨率，因此继续拒绝全局 CPU 提升结论。两轮均逐条验证 318 B gzip wire 和 262,144 B decoded detail；前端产品代码、通信协议、proto、数据库、GORM 与 driver 均未修改，Electron 继续承担真实链路正确性、资源与清理门禁。

## 30. 第五十四轮：response writer 复用的 Electron 门禁（2026-07-27）

后端响应 dumper 不再在已有 `bufio.ReadWriter`、`bytes.Buffer` 或 `MultiWriter` 外重复分配 4 KiB buffer；已有 `io.StringWriter` 直接复用，纯 `io.Writer` 保持原 fallback。五次 256 KiB writer-only 微基准中位 `2.209 -> 1.140 us/op (-48.4%)`、`4,272 -> 176 B/op (-95.9%)`、`9 -> 8 allocs`，direct/fallback 字节 oracle、race、完整代理/持久化/MITMV2 门禁通过。

自动化 heap 报告 `2026-07-27T02-49-20-863Z -> 2026-07-27T03-17-09-362Z`、候选矩阵 `body-2026-07-27T03-17-08-673Z` 均 400/400。目标 `dumpHTTPResponse -> bufio.NewWriterSize` 栈消失，全部 writer buffer 分配 `-27.3%`；总 allocation `+1.8%`、positive-live `-64.8%`、post-live `-3.1%` 方向受大对象与 forced-GC 影响，只接受直接 4 KiB/流分配证据。

CPU 报告 `2026-07-27T03-21-49-203Z`、矩阵 `body-2026-07-27T03-21-48-549Z` 仍完成 400/400、约 100 req/s、400 direct row，0 Query/Gap/缺序/重复/乱序/unavailable、最终 backlog 0、CPU 恢复。总 CPU `+1.8%` 而 GC/scanobject `-11.8%/-7.7%`，不宣称全局 CPU 改善；request p95 单次反向也显式保留。两轮继续逐条验证 318 B gzip wire、262,144 B decoded detail、落库与清理；前端产品代码、通信协议、proto、数据库、GORM 和 driver 未修改。

## 31. 第五十五轮：bare-flow SQLite upsert 的全链路门禁（2026-07-27）

后端只对 SQLite 项目库的 bare request/response KV 将逐条 FirstOrCreate 改为单语句 upsert，其他 group/dialect 保持旧路径；冲突更新字段、行数、ID 与非目标字段均有 SQLite oracle。事务内唯一 key 微基准中位 `75.928 -> 34.486 us/op (-54.6%)`、`24,961 -> 12,915 B/op (-48.3%)`、`380 -> 189 allocs`，race、完整 persistence 与 MITMV2 长门禁通过。

自动化 heap 报告 `2026-07-27T03-17-09-362Z -> 2026-07-27T03-40-23-266Z`、候选矩阵 `body-2026-07-27T03-40-22-353Z` 均 400/400。bare caller 的 FirstOrCreate/query callback 消失，GORM DB/search clone flat `-37.5%`、总 allocation `-1.7%`；positive-live 反向、post-live `+2.9%`，不宣称常驻内存改善。DB catch-up/drain 和 request p95 的有利方向只作单样本观察。

CPU 报告 `2026-07-27T03-44-49-149Z`、矩阵 `body-2026-07-27T03-44-48-470Z` 中，总 CPU `-6.1%`，cgo/SQLite bind/exec/commit 约 `-21.3%/-43.6%/-35.0%/-43.2%`；GC/scanobject 与首显/可见 backlog 反向，自动化不将其包装成 UI 全面改善。heap/CPU 两轮均保持约 100 req/s、400 direct row、0 Query/Gap/缺序/重复/乱序/unavailable、最终 backlog 0、CPU 恢复，并精确校验 gzip wire/decoded detail、落库和清理。本轮前端产品代码、通信协议、proto、schema、连接配置、GORM 与 driver 未修改。

## 32. 第五十六轮：bare-flow direct upsert 的 profile 与 3+3 决策门禁（2026-07-27）

后端只在固定项目 schema 的 SQLite bare request/response 分支绕过 GORM Create callback，直接通过 transaction-aware `CommonDB()` 执行与上一轮相同的参数化 upsert；通用 KV、非 SQLite、Quote/Unquote、冲突更新字段、外层事务和非目标字段均由自动化约束。五次同事务微基准中位 `30.044 -> 13.228 us/op (-56.0%)`、`12,886 -> 2,567 B/op (-80.1%)`、`188 -> 31 allocs (-83.5%)`，race、完整 persistence 与 62 个 MITMV2 MUSTPASS 通过。

自动化 heap `2026-07-27T03-40-23-266Z -> 2026-07-27T04-04-44-329Z`、候选矩阵 `body-2026-07-27T04-04-43-675Z` 均 400/400：bare caller `-40.9%`、GORM DB/search clone flat `-20.0%`、总 allocation `-1.5%`，OnConflict clause 栈消失。positive-live/post-live 有利但仍保持 forced-GC 诊断属性；该 heap 单次的 DB/Renderer drain 反向，未被选择性忽略。

CPU 报告 `2026-07-27T04-09-23-245Z`、矩阵 `body-2026-07-27T04-09-22-580Z` 中，总样本 `5.37 -> 4.99 CPU s (-7.1%)`、memory/GC flat `-7.3%`，但 scanobject、SQLite bind/exec/commit 反向。自动化因此继续把 profile 限定为 caller 归因，不允许进入正式 A/B 结论。

无 profile 决策门禁临时切回上一轮 GORM upsert 跑控制 `body-2026-07-27T04-12-27-919Z`，恢复 direct 实现后跑候选 `body-2026-07-27T04-19-55-374Z`，各严格串行 3 轮、每轮 400 条；候选目录生成 `comparison-vs-gorm-bare-upsert.{json,md}`。比较器 passed，配置/诊断差异为 0，六轮全部完成 400/400、400 direct row、精确 gzip wire/decoded detail、0 Query/fallback/Gap/缺序/重复/乱序/unavailable、最终 backlog 0、CPU 恢复和无残留清理。

候选中位最大可见 backlog `20 -> 16 (-20.0%)`、DB drain `366 -> 359 ms`、request -> React p95 `508 -> 498 ms`、Yak CPU p50 `-3.3%`；首次可见 `42 -> 47 ms`、Yak CPU p95 `+11.4%`、RSS `+2.0%` 反向。自动化保留可确定归因的后端 ORM/分配收益，同时阻止将这轮描述为 UI 全面提速。前端产品、通信协议、proto、schema、数据库连接、GORM 与 driver 均未修改；后续继续以 profile 数据决定前后端优先级。

## 33. 第五十七轮：TrafficGuard ASCII fold 的 Electron 决策门禁（2026-07-27）

后端将 CGO minirehs 从“先复制整份小写正文再扫描”改为 Teddy/AC 内核读取时折叠 ASCII，保持原 packet、偏移、标点、高位字节与纯 Go 路径。256 KiB warm/cold 微基准中位分别改善 `70.7%/59.2%`，cold 每次少 `262,149 B` 和一次分配；59 条真实 TrafficGuard 自然正文改善 `52.5%`。大小写/标点/高字节差分、完整包、race 与 62 个 MITMV2 MUSTPASS 均通过。

自动化 heap `2026-07-27T04-04-44-329Z -> 2026-07-27T04-48-04-936Z`、候选矩阵 `body-2026-07-27T04-48-04-257Z` 均 400/400。目标 `asciiLowerInto 4,026,125 -> 0 B`，`scanHitsImpl` cumulative `-66.7%`、`MatchedIndexes -61.3%`；总 allocation `+0.3%`、post-live `+5.5%`，自动化只接受直接 prefilter 收益。CPU 报告 `2026-07-27T04-52-47-809Z`、矩阵 `body-2026-07-27T04-52-47-121Z` 中 TrafficGuard cumulative `-38.2%`，minirehs CGO scan 从 `250 ms` 降到采样阈值以下；总 CPU 与 GC 反向，仍不允许全局 CPU 宣称。

无 profile 决策矩阵 `body-2026-07-27T04-19-55-374Z -> body-2026-07-27T04-55-17-328Z` 各严格串行 3 轮，候选目录生成 `comparison-vs-phase56-ascii-fold.{json,md}`。比较器 passed、配置/诊断差异为 0，六轮完成 2400/2400、400 direct row/轮、精确 gzip wire/decoded detail、0 Query/fallback/Gap/缺序/重复/乱序/unavailable、最终 backlog 0、CPU 恢复和无残留清理。

候选中位 DB catch-up/drain、Renderer drain、Yak CPU p95、RSS 分别改善 `29.3%/21.4%/18.1%/7.1%/1.1%`，request -> React `498 -> 504 ms (+1.2%)` 基本持平。最大 visible backlog `16 -> 22`、Long Task total `0 -> 141 ms`、Electron drain CPU p95 `4.6% -> 7.0%`、Yak drain CPU p95 `53.7% -> 123.5%` 反向，说明更快后端不自动等价于更平滑 Renderer 到达节奏。前端本轮不盲改产品逻辑；若后续同方向风险在夹心 A/B 或 Renderer trace 中复现，再把 direct batch 调度/React commit 合并作为独立 phase，且不得牺牲首显、最终一致性或回退恢复。

## 34. 第五十八轮：fixed response 复用的 heap/CPU/3+3 门禁（2026-07-27）

后端消除了 unmodified MITMV2 response 的第二份完整 gzip decoded output：响应劫持插件只有真正读取 response closure 才获得独立 plain packet；无异步 mirror hook 的同步路径只读借用 fixed packet，建流取得独占所有权后复用为 plain input/fixed provenance。modified response 与 async hook 仍保持独立 ownership，并修复 extended hook 误把 response replacement 与 request 比较的问题。相关 ownership/hot-patch/manual hijack/auto-unzip/provenance、完整 yakit persistence 和 62 个 MITMV2 MUSTPASS 均通过。

自动化最终 heap 报告 `2026-07-27T05-44-11-701Z`、矩阵 `body-2026-07-27T05-44-10-455Z` 完成 400/400。相对第五十七轮 `2026-07-27T04-48-04-936Z`，总 allocation `-17.4%`、`bytes.growSlice -43.7%`，约 `97.91 MiB` 第二次解压栈消失；post-live `-11.2%`，positive-live 反向继续作为 forced-GC 风险。CPU 报告 `2026-07-27T05-49-11-900Z`、矩阵 `body-2026-07-27T05-49-11-214Z` 中，总采样 `-12.1%`、memory/GC `-29.0%`、scanobject `-26.5%`、重复解压 `390 ms -> 0`，所有 wire/detail/DB/stream/恢复与清理门禁通过。

无 profile 决策矩阵 `body-2026-07-27T04-55-17-328Z -> body-2026-07-27T05-51-28-746Z` 各严格串行 3 轮，候选目录生成 `comparison-vs-phase57-response-reuse.{json,md}`。比较器 passed、配置/诊断差异为空，六轮 2400/2400、400 direct row/轮、精确 318 B gzip wire 与 262,144 B decoded detail、0 Query/fallback/Gap/缺序/重复/乱序/unavailable、最终 backlog 0、CPU 恢复且无残留。

候选中位 DB catch-up/drain、Renderer drain、request -> React、Yak CPU p50、Yak drain CPU p95 改善 `13.6%/11.0%/10.6%/3.0%/11.5%/34.2%`，Long Task `141 -> 0 ms`；最大 visible backlog `22 -> 43`、producer-stop visible backlog `2 -> 43`、request p95 `+9.7%`、Yak CPU p95 `+6.1%` 反向。自动化因此接受可归因的后端解压/GC 收益，但仍不把它包装成所有前端瞬时指标改善。前端产品逻辑、通信协议和 proto 本轮未修改；若可见突发在后续 A/B/A 或 Renderer trace 中稳定复现，再单独设计到达节奏/React commit phase。

## 35. 第五十九轮：Discord gate CPU/3+3 门禁（2026-07-27）

后端将 TrafficGuard 的 Discord token 固定形态门禁从每包逐 byte 扫描，改为先用标准库向量化 `IndexByte` 检查必需点号并定位 `M/N` 候选，再执行原形态验证；局部前缀过密会回退旧线性算法。10,000 组随机差分、全部精确规则、完整 TrafficGuard、focused race 与 62 个 MITMV2 MUSTPASS 均通过。256 KiB 低熵/自然正文中位分别 `123.626 -> 2.381 us/op (-98.1%)`、`124.931 -> 4.817 us/op (-96.1%)`，命中位于尾部也改善 `96.2%`，`MN.` 密集对抗样本保持持平；新旧都是 0 分配，因此没有制造无假设的 heap 轮次。

CPU 报告 `2026-07-27T06-25-10-732Z`、矩阵 `body-2026-07-27T06-25-10-068Z` 相对第五十八轮 `2026-07-27T05-49-11-900Z`：`hasDiscordTokenCandidate 110 ms` 消失，TrafficGuard cumulative `330 -> 230 ms (-30.3%)`，总采样 `4.85 -> 4.55 CPU s (-6.2%)`、平均 CPU `97% -> 91%`；memory/GC 与 scanobject 分别反向 `+12.1%/+14.4%`，自动化只接受目标门禁因果。单轮完成 400/400、精确 gzip wire/decoded detail、400 direct row、0 Query/fallback/Gap/顺序错误、最终 backlog 0、CPU 恢复和清理；峰值 `3,865,664 KiB`、0 swap。

无 profile 决策矩阵 `body-2026-07-27T05-51-28-746Z -> body-2026-07-27T06-28-29-151Z` 各严格串行 3 轮，候选目录生成 `comparison-vs-phase58-discord-gate.{json,md}`。比较器 passed、配置/诊断差异为空，六轮 2400/2400、400 direct row/轮、精确 318 B wire/262,144 B detail、0 Query/fallback/Gap/缺序/重复/乱序/unavailable、最终 backlog 0、CPU 恢复且无残留。

候选中位 Yak/Electron CPU p95 改善 `11.3%/27.1%`，最大 visible backlog `43 -> 24`、producer-stop visible backlog `43 -> 1`、request p95 `-5.2%`、Yak RSS `-0.5%`；DB catch-up/drain `152/251 -> 230/341 ms`、Renderer drain `288 -> 376 ms`、duplex p95 `33 -> 67 ms`、Yak CPU p50 `+3.7%`、request -> React `489 -> 504 ms` 与 persistence backlog `1 -> 4` 反向。前端本轮不因后端单点优化盲调产品调度；产品代码、通信协议与 proto 均未修改，后续仍以重复 A/B 和 trace 决定是否单独进入 Renderer 到达节奏阶段。

## 36. 第六十轮：SQLite TEXT bind 与 E2E 缓存资源闭环（2026-07-27）

后端通过已发布的 GORM fork `v1.9.2-yaklang.3`，只对 SQLite 中至少 64 KiB 的 HTTPFlow Request/Response 使用 `CAST(? AS TEXT)` 的只读 byte view，避开 driver 对 string 执行的整字段 `[]byte` 副本。小字段、非 SQLite、Create hook、默认值、ID、时间戳、after-save、历史 TEXT 表示和查询语义保持不变。功能/race/GORM 全套与 62 个 MITMV2 MUSTPASS 通过；heap `2026-07-27T05-44-11-701Z -> 2026-07-27T07-46-31-959Z` 总 allocation `-29.9%`，SQLite bind `115,122,656 -> 1,574,464 B (-98.6%)`。CPU `2026-07-27T06-25-10-732Z -> 2026-07-27T07-39-15-157Z` 总样本 `-5.3%`、bind `-93.0%`、InsertHTTPFlow cumulative `-48.1%`、scanobject flat `-23.6%`，quote/gzip/growSlice 的短样本反向仍保留。

正式无 profile 决策矩阵为 `body-2026-07-27T06-28-29-151Z -> body-2026-07-27T07-50-48-295Z`，各严格串行 3 轮，比较文件 `comparison-vs-phase59-sqlite-text-bind.{json,md}`。比较器 passed，配置、诊断与正确性差异为空；六轮 2400/2400、精确 318 B wire/262,144 B decoded detail、400 direct row/轮、0 Query/fallback/Gap/缺序/重复/乱序/unavailable、最终 backlog 0、CPU 恢复和无残留。候选 DB catch-up/drain、persist write p95、Renderer drain 分别改善 `23.9%/17.9%/60.0%/16.5%`，但 Yak CPU p95、request p95、首显、Electron CPU p95 分别反向 `19.8%/18.2%/20.0%/25.3%`；因此只接受可归因的数据库分配/写入收益，不宣称 UI 全面提速。

本轮同时关闭自动化自身的磁盘无界增长。用户已确认手工清理前 `/home/go0p/.cache/go-build` 达到 `290G`；当前 54M 是清理后的状态，不能用于否认事故。Yak fixture 的真实构建现在强制使用 E2E 专属 `GOCACHE` 与 `GOTMPDIR`，启动前回收上次中断残留，成功或失败都在 `finally` 删除；`go build -p=2` 与默认 `GOMEMLIMIT=2GiB` 保持。按源码状态寻址的 Yak 二进制缓存默认只保留最新 6 份，可用 `YAKIT_E2E_YAK_BUILD_CACHE_MAX_ENTRIES=1..32` 设置经审查上限，并且只删除严格匹配 20 位十六进制指纹的目录。

落地时本地历史 Yak 二进制缓存从 211 个目录、约 47 GiB 清理为 6 个目录、约 1.4 GiB；删除的 205 份均为可重建产物，源码和报告未动。Phase 60 冷构建期间专属 build/tmp 目录各约 2.5 GiB，最大观察到的编译器 RSS 约 511 MiB；Yak Echo 启动前两个目录均已验证不存在。后端长门禁也使用命名明确的一次性 build/tmp 目录，结束后验证删除。fixture、profile、矩阵比较器共 9 个测试文件 48 项通过，其中缓存测试覆盖默认上限、非法无界值、保护当前产物、按 mtime 保留最新项和忽略非指纹目录。

后续资源纪律作为所有 phase 的前置门禁：重负载串行执行，启动前记录磁盘余量与缓存体积，Go 编译不写用户级全局缓存，退出后验证临时目录消失，二进制缓存条目数不得超过配置上限。下一轮仍由后端剩余 `quoteHTTPPacket`/`bytes.growSlice` profile 决定优化点；扩大到 1000 条及以上只逐级增加，并保留固定 400 条 3+3 作为可比较决策基线。

## 37. 第六十一轮：GORM Field 分配优化的 Electron 门禁（2026-07-27）

本轮没有修改前端产品消费逻辑。后端 profile 先确认约 107 MiB decoded output 与约 101 MiB historical quote 仍是必要输出，再把可避免的 GORM `Scope.Fields` 每字段独立分配收敛为连续存储。GORM fork 已按授权发布 commit `3b16dee`、tag `v1.9.2-yaklang.4`；五次微基准中位约 `45 -> 7 allocs/op (-84.4%)`、`2,928 -> 2,000 B/op (-31.7%)`、耗时约 `-14%`。兼容性、GORM 全套、focused race、真实 HTTPFlow Create 与 62 个 MITMV2 MUSTPASS 均通过，最终长门禁耗时 `211.984 s`。

Electron heap 报告 `2026-07-27T07-46-31-959Z -> 2026-07-27T08-32-52-494Z` 中，总 sampled allocation `303,064,972 -> 289,174,010 B (-4.58%)`，目标 `Scope.Fields 6,292,552 -> 1,050,624 B (-83.3%)`。positive-live 反向、post-live 有利，继续只作为 forced-GC 诊断；自动化不把目标分配收益包装成常驻内存下降。

无 profile 决策矩阵为 `body-2026-07-27T07-50-48-295Z -> body-2026-07-27T08-40-24-891Z`，各严格串行 3 轮，比较文件 `comparison-vs-phase60-gorm-scope-fields.{json,md}` passed，配置与诊断差异为空。候选 DB catch-up、duplex p95、首显、最大 visible backlog、request p95、Yak CPU p50/p95 为有利方向；DB drain、Renderer drain 与 Yak drain CPU p95 反向，吞吐持平。六轮全部 400/400、精确 wire/detail、0 Query/fallback/Gap/缺序/重复/乱序/unavailable、最终 backlog 0、CPU 恢复和无残留。

中断恢复时自动化明确发现旧隔离缓存和全局 Go cache 各约 3.2 GiB，先清理后才串行重跑；冷门禁临时 build/tmp 峰值约 `3.2/3.4 GiB`，退出后相关目录全部不存在，全局 cache 为 `768 KiB`。该结果只证明新的隔离与清理流程生效，不能用于否认用户已确认的历史 `/home/go0p/.cache/go-build = 290G` 事故。下一轮继续由后端 profile 选点；只有 Renderer trace 与重复 A/B 将问题明确归因于前端到达节奏时，才调整产品消费/commit 策略。

## 38. 第六十二轮：GORM Create 绑定优化的 Electron 门禁（2026-07-27）

本轮仍未修改前端产品消费逻辑。后端/GORM 将同一 Scope 每列重复的 `skip_bindvar` 实例查询缓存为稳定存在状态，并在合法的 `InstanceSet` 更新时同步刷新；Create callback 同时按字段数预分配 columns/placeholders。64 次绑定五次微基准中位约 `-64.1%` 耗时、`-46.4% B/op`、`143 -> 17 allocs/op`；真实 HTTPFlow adaptive 路径在 small/medium/large 中分别约减少 `24.7%/24.7%/24.4%` 分配，墙钟五次中位改善约 `5%–8%`。GORM 全套/race、yaklang focused/race 与 62 个 MITMV2 MUSTPASS 均通过。

经授权发布的唯一仓库仍是 GORM fork：commit `7eadd03`、tag `v1.9.2-yaklang.5`；yaklang 只把依赖升级到 `.5`，yaklang/yakit 未提交或推送。长门禁 `193.624 s` 相对上一轮 `211.984 s` 有利，但自动化不把跨次耗时包装成严格的 8.7% 提升。

heap 报告 `2026-07-27T08-32-52-494Z -> 2026-07-27T14-07-30-521Z` 中，目标 `InstanceGet` 从约 1.57 MiB 消失，`AddToVars -66.7%`、`createCallback cumulative -22.2%`、整个 GORM Create cumulative `-10.5%`。总 sampled allocation 却 `+12.1%`，必要 decoded growSlice/quote 大对象分别反向约 `18.7%/5.8%`；positive-live 有利、post-live 反向。因此自动化只接受目标 caller 与微基准收益，不接受全局 heap 或常驻内存改善声明。

无 profile 决策矩阵为 `body-2026-07-27T08-40-24-891Z -> body-2026-07-27T14-14-27-605Z`，各严格串行 3 轮，比较文件 `comparison-vs-phase61-gorm-create-binding.{json,md}` passed，配置/诊断差异为空。DB catch-up/drain、Renderer drain、首显、request -> React、Yak drain CPU p95、Yak RSS 为有利方向；最大 visible/shadow backlog `14 -> 48`、停止时 visible backlog `0 -> 48`、Electron CPU p95 `+20.3%`、duplex/request p95 与 Long Task 小幅反向，吞吐和 Yak CPU p95 基本持平。

六轮全部 400/400、精确 wire/detail、400 direct row/轮、0 Query/fallback/Gap/缺序/重复/乱序/unavailable、最终 backlog 0、CPU 恢复和无残留。heap 与正式矩阵退出后专属 build/tmp 均不存在，Yak 二进制缓存保持 6 份/约 1.4 GiB，全局 Go cache 为 `768 KiB`；仍明确保留历史 290G 事故事实。后续如果后端继续变快而 visible burst 在重复夹心矩阵中稳定复现，再用 Renderer trace 进入前端 direct-batch/React commit 调度阶段，而不是用降低吞吐或正确性掩盖到达突发。

## 39. 第六十三轮：GORM Query 扫描计划的 Electron 门禁（2026-07-27）

本轮仍未修改前端产品消费逻辑。后端/GORM 将 Query 每行重复构造的 column/selected/reset map 改为每个 `rows` 结果只建立一次扫描计划，并保留重复列、NULL、指针、`sql.Scanner`、嵌入字段和 preload join 语义。400 行元数据微基准五次中位约为 `2.806 ms -> 49.376 us`、`2,246,449 -> 118,698 B/op`、`6,001 -> 408 allocs/op`；真实 `QueryHTTPFlow` 的 published `.5` 对候选五组 A/B 中位为 `-23.5%` 耗时、`-42.1% B/op`、`-9.6% allocs/op`。GORM 全套/race、yaklang 全 yakit 包/query race 与 62 个 MITMV2 MUSTPASS 均通过。

经授权发布的唯一仓库为 GORM fork：commit `d06871f`、tag `v1.9.2-yaklang.6`；yaklang 仅升级依赖，yaklang/yakit 均未提交或推送。诊断 heap `2026-07-27T14-07-30-521Z -> 2026-07-27T14-56-48-088Z` 中，`Scope.scan` 的约 3.15 MiB 采样分配消失，`QueryHTTPFlow/SelectHTTPFlowFromDB cumulative -40.0%`、服务端 `QueryHTTPFlows cumulative -50.0%`、总 sampled allocation `-13.2%`。该报告带 forced-GC，只用于 caller 归因。

正式无 profile 决策矩阵为 `body-2026-07-27T14-14-27-605Z -> body-2026-07-27T15-03-54-384Z`，各严格串行 3 轮，比较文件 `comparison-vs-phase62-gorm-scan-plan.{json,md}` passed，配置、历史诊断覆盖和实验差异为空。六轮 2400/2400；候选每轮 400 direct row、0 Query/fallback/Gap/缺序/重复/乱序/unavailable、最终 backlog 0、CPU 恢复和无残留。

候选中位最大 visible/shadow backlog `48 -> 21 (-56.3%)`、停止时 visible backlog `48 -> 0`、Yak drain CPU p95 `-10.4%`、Yak RSS `-1.2%`。DB catch-up/drain `152/257 -> 169/275 ms`、Renderer drain `295 -> 313 ms`、首显 `43 -> 49 ms`、duplex p95 `27 -> 63 ms`、request -> React `492 -> 497 ms` 和 Long Task `53 -> 155 ms` 反向。由于该场景全程 direct stream、`queryCount == 0`，自动化只接受后端查询路径的确定性收益，不将时序噪声或直推链路指标包装成 UI 全面提速。

heap 冷构建隔离 build/tmp 峰值约 `3.3/3.5 GiB`，正式冷构建约 `2.3/2.3 GiB`，退出后均删除；Yak 二进制缓存保持 6 份/约 1.4 GiB，全局 Go cache 约 26 MiB。这只证明当前资源门禁有效，不能覆盖用户确认的历史 `/home/go0p/.cache/go-build = 290G` 事故。下一阶段需要新增能主动触发 query/fallback 的专用 E2E，直接验证本轮路径；只有 Renderer Long Task/direct burst 在夹心 A/B 中稳定复现，才修改前端调度。

## 40. 第六十四轮：Query Shadow 3+3 专用门禁（2026-07-27）

本轮把第六十三轮计划的 Query 专用 E2E 落地为 runbook 中的固定 matrix 命令：复用审核过的 400 请求、12 并发、100 req/s、gzip 256 KiB 场景，强制 `httpflow-live-stream-mode=shadow` 并严格串行 3 次。为避免只增加别名就使 Renderer 构建指纹失效，没有修改根 `package.json`；该命令是诊断/回退门禁，也不修改产品默认 canary/direct 模式。

严格 A/B 只改变 yaklang 解析的 GORM 版本：`.5` 基线 `body-2026-07-27T15-18-52-745Z`，`.6` 候选 `body-2026-07-27T15-29-06-961Z`；测试后工作区已断言恢复 `.6`。比较文件 `comparison-vs-gorm5-scan-plan-shadow.{json,md}` passed，配置、历史诊断覆盖和实验差异为空。六轮 2400/2400；每轮 6 次 Query、400 shadow Query match、0 direct row、0 row without event、最终 backlog 0、CPU 恢复和无残留。

后端 Query 路径出现稳定的目标收益：DataQuery p95 `37.644 -> 17.106 ms (-54.6%)`、完整 backend Query p95 `37.923 -> 17.148 ms (-54.8%)`、query round-trip p95 `55.4 -> 38.5 ms (-30.5%)`；COUNT p95/执行比例保持 `0.79 ms/1-of-6`。这补上了 direct 场景 `queryCount == 0` 无法验证 `.6` 的证据缺口。

但 UI 仍未全面改善：request/response -> React p95 小幅有利，Yak drain CPU p95 `-44.8%`、Electron RSS `-1.9%`；首显 `106 -> 185 ms`、最大 visible backlog `24 -> 95`、停止时 visible backlog `0 -> 87`、Long Task `179 -> 375 ms`、Yak RSS `+6.1%` 和 Yak CPU p95 `+6.5%` 反向。约 1 秒的 Query trigger 间隔仍占据 shadow 用户体感主导，且更快查询可能把更大的批次突发交给 Renderer。

两次冷构建隔离 build/tmp 峰值均约 `2.6/2.6 GiB`，退出后删除；Yak 二进制缓存保持 6 份/约 1.4 GiB，全局 Go cache 约 53 MiB。该结果仍不覆盖用户确认的历史 290G 事故。下一轮先在同一 shadow 场景采集 Renderer trace，量化 query batch 到达、React commit 和虚拟表更新；只有可重复归因后才改变前端消费调度。

## 41. 第六十五轮：Renderer 归因、100 ms 直推与虚拟表快路径（2026-07-27）

本轮先按第六十四轮计划拆分通信模式。Shadow trace `2026-07-27T15-54-08-963Z` 与关闭专用 stream/system timing 的纯 Query trace `2026-07-27T15-59-23-758Z` 都显示约 1 秒 polling 仍主导 request -> React；各自只有 4 个约 `51–72 ms` 的 IPC reply/layout Long Task。`--disable-system-timing` 与 shadow stream 不能组合，因为 stream bootstrap 依赖 Query identity；runner 现在启动前快速拒绝该组合并有单测，不再运行一份先天无效的诊断。

默认 canary/direct trace `2026-07-27T16-08-54-370Z` 将瓶颈分离得更清楚：400 条、100 req/s、gzip 256 KiB 下没有 Query，9 个约 50 行的 direct batch 使 request -> React p95 约 `496 ms`、最大 visible backlog `46`、停止时 backlog `46`。三个 `51–62 ms` 主线程任务均是批次触发的 style/layout；旧持续间隔 `500 ms` 本身形成约半秒的体感上限。

产品调度改为首批立即、最小/持续间隔均 `100 ms`，pending 阈值仍为 8，MITM 虚拟表 overscan 从 5 收紧到 2。四个值集中在 `HTTPFlowTable.performance.ts`，同时写入运行报告和矩阵 case config，后续比较不能静默混用参数。相对旧 `500 ms + overscan 5` 的 3 次矩阵 `body-2026-07-27T15-03-54-384Z`，候选 `body-2026-07-27T16-26-57-984Z` 的 request/response -> React p95 约 `497/494 -> 120/110 ms (-75.9%/-77.7%)`，最大 visible backlog `21 -> 9 (-57.1%)`，Long Task `155 -> 0 ms`。代价是 Electron CPU p50/p95 约 `3.0/7.12 -> 6.82/8.68%`、RSS 约 `+8.6%`；因此接受为明确的交互延迟换取小幅绝对 CPU 成本，而不是“所有资源都下降”。Overscan 2 相对同为 100 ms 的 overscan 5 还给出 CPU p50 `-7.9%`、RSS `-0.8%`、Long Task `212 -> 0 ms` 的方向性证据。

直推行预处理增加两个保持引用的常见快路：无收藏/标签过滤时不再复制数组；无颜色变化时不再为每行 spread 新对象。该项的矩阵 `body-2026-07-27T16-26-57-984Z -> body-2026-07-27T16-44-56-959Z` 因旧基线缺少新上报的调度字段而是 evidence-only，且 UI 指标交错，故只按确定性分配收敛保留，不声明 E2E 提速。

虚拟表 `pushTData` 随后消除每批两次完整去重/合并：先只选择合法新行；若 React state 仍是同一快照，直接 prepend 并裁剪；若期间有并发状态变化，则自动回退完整去重合并。1000 行窗口加 10 行批次的 Vitest bench 快路约快 `1.82x`，竞态回退和数组 identity 有单测。严格同配置 3+3 为 `body-2026-07-27T16-44-56-959Z -> body-2026-07-27T16-57-15-146Z`，比较文件 `comparison-vs-double-direct-merge.{json,md}` passed，配置/诊断差异为空。Electron CPU p50/p95 改善 `8.1%/3.6%`、request/response -> React `-7.6%/-5.1%`、Renderer drain `-24.7%`、首显 `137 -> 48 ms`，候选三轮 Long Task 均为 0；RSS `+1.5%`、visible backlog `10 -> 11`、Electron drain CPU `+10.3%` 和高波动 Yak drain CPU 作为风险保留。

扩大验证 `body-2026-07-27T17-03-45-330Z` 严格串行 3 次，每轮 1000 条、200 req/s、4 KiB response。三轮均为 1000/1000、固定 51 个 direct batch、batch rows p95 22、0 Query/fallback/Gap/缺序/重复/乱序/unavailable；request -> React p95 稳定在 `106–107 ms`，最大 visible backlog `17–21`、最终为 0，Electron CPU p95 `8.67–9.01%`。Long Task 为 `53–104 ms`，说明更高负载下 style/layout 仍是下一前端目标，但没有重新出现半秒调度延迟。

自动化也补齐中断边界：matrix CLI 的 `-h/--help` 现在只打印选项而不会误启动 Yak/Electron；runner 收到 SIGINT/SIGTERM 时终止完整 WDIO 进程树，真实中断报告 `2026-07-27T17-12-13-250Z` 验证 `interrupted` 元数据、临时目录删除且无 Electron/WDIO/chromedriver 残留。聚焦产品测试 61 项、E2E preflight 61 项、受限 Renderer 构建均通过。收尾时全局 Go cache 约 53 MiB、Yak 二进制缓存 6 份/约 1.3 GiB、磁盘可用约 840 GiB；这些仍是清理后的状态，不修改历史 `/home/go0p/.cache/go-build = 290G` 事故事实。

下一轮重新以后端 profile 为主战场：100 ms direct 已把用户可见延迟压到约 0.1 秒，前端只在 trace 再次稳定指向 layout/row decoration 时继续修改。后端优先量化 200 req/s 下 quote、必要 decoded output、SQLite persistence 与 stream publish；任何前端、数据库或 GORM 候选仍必须使用自描述配置和严格前后矩阵。

## 42. 第六十六轮：MITM 下游连接缓冲复用的 Electron 门禁（2026-07-27）

本轮没有修改前端产品、通信协议、proto、schema、数据库配置或 GORM。后端在 1000 条、200 req/s profile 中确认 GC/对象扫描是主成本：优化前 5 秒 CPU 总样本 `4.33 s`，`scanobject` flat/cumulative 为 `720/1840 ms`，而 heap 中数据库持久化 leaf 约占 8%。候选按下游连接生命周期复用成对 4 KiB `bufio.Reader/Writer`，连接结束后清除 reader/writer 引用再归还；CONNECT/TLS reset、SOCKS5 context 重建和重复释放边界均有显式处理。

五次微基准中，逐连接新建约 `1575–1652 ns/op`、`8368 B/op`、`5 allocs/op`，复用约 `24.3–24.8 ns/op`、`0 B/op`、`0 allocs/op`。heap `2026-07-27T17-24-01-284Z -> 2026-07-27T17-34-38-775Z` 的目标 `CreateProxyHandleContext` cumulative 约 `8.53 -> 1.00 MiB`，但全窗口 sampled allocation `178.0 -> 196.8 MB` 反向，所以自动化只接受目标 caller，不声明全局 heap 或常驻内存下降。CPU 候选 `2026-07-27T17-51-24-513Z` 的总样本 `4.33 -> 3.81 s (-12.0%)`、`scanobject` flat `720 -> 620 ms (-13.9%)`、cumulative `1840 -> 1680 ms (-8.7%)`。

正式无 profile 3+3 为 `body-2026-07-27T17-03-45-330Z -> body-2026-07-27T17-41-25-958Z`，比较文件 `comparison-vs-pre-proxy-buffer-pool.{json,md}` passed，配置与诊断差异为空。六轮均完成 1000/1000、约 200.1 req/s、1000 direct row，0 Query/fallback/Gap/缺序/重复/乱序/unavailable，最终 backlog 0、CPU 恢复和清理通过。候选 Yak CPU p50 `-25.4%`、RSS `-4.5%`、request p95 `-31.1%`，Yak CPU p95 基本持平；DB/Renderer drain、Yak drain CPU 和最大 visible backlog 反向，保留为短样本风险，不包装成前端全面提速。

完整 minimartian 测试和定向 race 通过。两份验证隔离 Go cache（约 423/877 MiB）结束后均移入回收站，E2E 无临时目录或 Electron/Yak/WDIO/chromedriver 残留，Yak 二进制缓存保持 6 份/约 1.4 GiB，全局 Go cache 约 57 MiB。它仍是用户手工清理后的状态，不能用于否认历史 `/home/go0p/.cache/go-build = 290G`。下一轮继续由后端剩余 parser/builder/growSlice profile 决定目标，前端 style/layout 只在重复 trace 证明后进入下一优化项。

## 43. 第六十七轮：HTTP Header 扫描快路径的 Electron 门禁（2026-07-27）

本轮仍以后端 profile 为主，没有修改前端产品消费逻辑。后端 response parser 原先会把 `ReadLine` 已独立分配的普通 Header 再复制到第二个 buffer，folded Header 还会创建临时 `CRLF + line`。候选直接接管首行 allocation，仅在确认 continuation 时扩容，并保持 callback slice 可长期留存。retained-slice oracle、旧实现差分 fuzz `138,815` 次、完整 utils/lowhttp 和 race 均通过；普通 Header 五次微基准约改善 `31%` 时间、`48.6%` 字节与 `45.5%` 分配次数。

自动化 heap 为 `2026-07-27T17-34-38-775Z -> 2026-07-27T18-16-19-882Z`。目标重复拷贝从 `2,097,236 B / 57,344 objects` 降为 0，scanner 累计对象数 `-7.3%`、response parser 累计字节 `-18.0%`，总 sampled allocation `196.85 -> 194.45 MB (-1.2%)`。CPU 为 `2026-07-27T17-51-24-513Z -> 2026-07-27T18-23-31-611Z`，总样本 `3.81 -> 3.66 s (-3.9%)`、平均 CPU `76.2% -> 73.2%`；目标函数低于 CPU profile 稳定分辨率，因此自动化只接受 heap caller 与微基准因果，并用 CPU 轮排除明显 tradeoff。

正式无 profile 3+3 为 `body-2026-07-27T17-41-25-958Z -> body-2026-07-27T18-25-48-136Z`，比较文件 `comparison-vs-phase66-header-scan.{json,md}` passed，配置、诊断与 metric coverage 差异为空。六轮均完成 1000/1000；候选每轮数据库总数/唯一 ID 均为 1000、1000 direct row、0 Query/fallback/Gap/缺序/重复/乱序/unavailable，最终 backlog 0、CPU 恢复和清理通过。候选中位 Yak CPU p50 `-7.8%`、Renderer drain `-9.3%`、最大 visible backlog `21 -> 20`，request/response -> React 基本持平；duplex p95、首显、Electron CPU/RSS 与 Yak RSS 的反向短窗波动继续保留，不据此盲调前端调度。

本轮前端只承担自动化和正确性门禁，通信协议、proto、schema、数据库、GORM 与 driver 均未修改。测试隔离 Go cache 峰值约 1.3 GiB 后永久删除，E2E build/tmp 退出后不存在；Yak 二进制缓存仍为 6 份/约 1.4 GiB，全局 Go cache 约 57 MiB、磁盘可用约 838 GiB。这些是用户清理后的当前值，不能覆盖历史 `/home/go0p/.cache/go-build = 290G` 事故。下一轮继续以最新后端 heap/CPU 选点；只有重复 Renderer trace 明确归因到 style/layout，才启动独立前端优化。

## 44. 第六十八轮：ASCII Header 分类去分配的 Electron 门禁（2026-07-27）

本轮继续以后端为主。`splitHTTPPacketEx` 与 `fixHTTPPacketCRLF` 原先为识别少数固定 Header/token，对每条 key/value 构造 lowercase string；候选仅在标准 ASCII 输入上使用无分配 case fold，非 ASCII 和非法 UTF-8 完整回退旧路径。五次配对微基准中位约 `923 -> 439 ns/op (-52.4%)`、`176 -> 0 B/op`、`12 -> 0 allocs/op`；约 10 万次 fuzz、聚焦 parser、race 与完整 lowhttp 全部通过。

自动化 heap `2026-07-27T18-16-19-882Z -> 2026-07-27T18-53-48-984Z` 中，总 sampled allocation `-5.5%`、sampled objects `-8.9%`，Builder objects `-50.4%`、split callback cumulative objects `-53.1%`，fix callback 分配节点消失。CPU `2026-07-27T18-23-31-611Z -> 2026-07-27T19-00-25-967Z` 总样本 `3.66 -> 3.68 s` 基本持平，目标节点降到阈值以下但 scanobject 反向；自动化只接受可归因的对象/heap 收益，不包装成全局 CPU 改善。

正式无 profile 3+3 为 `body-2026-07-27T18-25-48-136Z -> body-2026-07-27T19-02-35-441Z`，比较文件 `comparison-vs-phase67-header-classification.{json,md}` passed，配置、诊断与 metric coverage 差异为空。六轮均完成 1000/1000；候选每轮数据库总数/唯一 ID 1000、1000 direct row、0 Query/fallback/Gap/缺序/重复/乱序/unavailable，最终 backlog 0、CPU 恢复且清理成功。

候选中位 DB catch-up `-14.8%`、duplex p95 `-21.7%`、Renderer drain `-3.0%`、Yak RSS `-1.9%`、Long Task `52 -> 0 ms`；request p95 `+21.3%`、Yak CPU p50 `+8.5%` 和 drain CPU `+3.8%` 反向，因此前端不根据这一轮短窗结果调整产品调度。本轮没有前端产品、协议、proto、schema、数据库、GORM 或 driver 改动。

1.3 GiB 测试隔离缓存已永久删除而非留在回收站；E2E build/tmp 退出后不存在，Yak 缓存保持 6 份/约 1.4 GiB，全局 Go cache 约 64 MiB、磁盘可用约 839 GiB。这仍是用户手工清理后的状态，不能否认历史 `/home/go0p/.cache/go-build = 290G`。下一轮继续由最新后端 heap/CPU 决定，前端 style/layout 仍需重复 trace 才进入优化。

## 45. 第六十九轮：GORM identifier quote 去分配的 Electron 门禁（2026-07-27）

本轮仍以后端 profile 为依据，没有调整前端消费、虚拟表或通信调度。第六十八轮 heap 将 GORM `commonDialect.Quote` 定位为小对象热点；候选把等价的 `fmt.Sprintf` quoting 改为字符串拼接。10 秒 fuzz 执行 `301,458` 次无差异，完整 GORM、定向 race、完整 `common/yakgrpc/yakit` 和 SQLite TEXT race 均通过。常见 identifier 微基准约 `83.9 -> 27.0 ns/op (-67.8%)`、`32 -> 16 B/op`、`2 -> 1 allocs/op`；真实 HTTPFlow Create 分配约 `286 -> 241 allocs/op (-15.7%)`，但 A/B/A wall time 无稳定改善，自动化不作延迟宣称。

GORM 变更已按授权以 `40342e7` 推送并发布 `v1.9.2-yaklang.7`，yaklang 已解析到该版本。heap `2026-07-27T18-53-48-984Z -> 2026-07-27T19-31-43-403Z` 的 sampled objects `-4.12%`，基线 Quote 的 `65,537 flat / 81,921 cumulative objects` 在候选报告中降到阈值以下。CPU `2026-07-27T19-00-25-967Z -> 2026-07-27T19-38-13-641Z` 总样本 `-3.0%`，目标 caller 低于采样阈值，因此只用于排除明显 CPU tradeoff。

正式无 profile 3+3 为 `body-2026-07-27T19-02-35-441Z -> body-2026-07-27T19-40-24-435Z`，比较文件 `comparison-vs-phase68-gorm-quote.{json,md}` passed，配置、诊断和 metric coverage 差异为空。候选三轮全部 1000/1000，数据库唯一 ID 和 direct row 均为 1000，0 Query/fallback/Gap/缺序/重复/乱序/unavailable，最终 backlog 0、CPU 恢复且清理成功。

duplex p95 `-14.9%`、request p95 `-13.9%`、首显 `-12.5%`、Electron CPU p95 `-6.4%`；DB catch-up `+7.8%`、Renderer drain `+4.1%`、Yak CPU p50 `+5.1%`、Yak RSS `+3.1%` 反向，因此不根据短窗结果改动前端。约 2 GiB 的隔离验证缓存已永久删除，E2E 临时目录和相关进程不存在，全局 Go cache 约 72 MiB、磁盘可用约 839 GiB；这些是用户清理后的状态，不能覆盖历史 290 GiB Go cache 事故。下一轮继续由后端 persistence、stream serialization 和 parser profile 决定。

## 46. 第七十轮：MITM 静态 glob 预编译的 Electron 门禁（2026-07-27）

本轮没有修改前端产品消费、虚拟表或通信调度。后端 heap 发现默认 MITM hostname/method glob 会在每条流量上重复编译；候选改为更新过滤器时预编译静态规则，并保留非法规则、encoded group 和运行时新增 pattern 的旧回退语义。配对 benchmark 中位约 `6159 -> 2448 ns/op (-60.3%)`、`4000 -> 600 B/op (-85.0%)`、`123 -> 35 allocs/op (-71.5%)`；9,026 次 fuzz、完整 httptpl、MITM filter manager 和并发 race 均通过。

heap `2026-07-27T19-31-43-403Z -> 2026-07-27T20-25-50-802Z` 中，`gobwas/glob` 累计 sampled objects `150,188 -> 8,192 (-94.5%)`，剩余采样来自 response MIME 检查，request 静态 filter 编译链路降到阈值以下。整轮 sampled objects `+4.6%`、allocation `+1.9%` 反向，因此自动化只接受目标 caller。CPU `2026-07-27T19-38-13-641Z -> 2026-07-27T20-32-36-941Z` 的目标 request filter 约 `60 -> 20 ms`，但总样本 `3.57 -> 4.03 s` 反向，不作全局 CPU 宣称。

正式无 profile 3+3 为 `body-2026-07-27T19-40-24-435Z -> body-2026-07-27T20-34-45-131Z`，比较文件 `comparison-vs-phase69-static-glob.{json,md}` passed，配置、诊断和 metric coverage 差异为空。候选三轮全部 1000/1000，数据库唯一 ID 和 direct row 均为 1000，0 Query/fallback/Gap/缺序/重复/乱序/unavailable，最终 backlog 0、CPU 恢复且清理成功。

duplex p95 `-15.0%`、Yak CPU p50 `-12.9%`、首显 `-12.2%`、Electron RSS `-3.2%`；DB catch-up `+22.3%`、Electron CPU p95 `+10.5%`、request p95 `+11.9%`、Long Task `0 -> 50 ms` 反向，因此不据此调整前端。隔离测试 cache 峰值 7.1 GiB 后已永久删除；E2E build/tmp 和进程无残留，Yak 缓存维持 6 份/约 1.4 GiB，全局 Go cache 约 73 MiB、磁盘可用约 839 GiB。这仍是清理后的状态，不能覆盖历史 290 GiB Go cache 事故。

## 47. 第七十一轮：Parser Header 借用字符串的 Electron 门禁（2026-07-27）

本轮仍以后端 profile 为主，没有修改前端产品消费、虚拟表或通信调度。后端 request/response parser 原先在 scanner 已提供独占 Header 行后，仍复制 key/value string 并再次 lowercase key；候选直接借用 parser-owned line 的底层内存，并把精确规范大小写的常见 Header name 换成静态字符串。调用者原始 packet 覆写 + GC 的请求/响应生命周期测试、旧实现差分 fuzz `74,917` 次、聚焦 parser、完整 utils 与 race 均通过。五次配对微基准中位约 `98.02 -> 43.36 ns/op (-55.8%)`、`42 -> 4 B/op (-90.5%)`、`3 -> 0 allocs/op`。

heap `2026-07-27T20-25-50-802Z -> 2026-07-27T20-59-52-643Z` 中，request/response parser cumulative sampled objects 分别改善 `61.6%/53.3%`，对应 Header callback 改善 `58.5%/51.5%`；整轮 sampled objects `-27.4%`、allocation `-8.0%`。response cumulative bytes 有大对象采样反向，因此自动化以对象 profile 和微基准作为主要因果证据。CPU `2026-07-27T20-32-36-941Z -> 2026-07-27T21-06-48-931Z` 总样本 `4.03 -> 3.55 s (-11.9%)`、response parser `-22.7%`、folding scanner `-44.4%`，仍只作 profile 方向，不替代无 profile 决策门禁。

正式无 profile 3+3 为 `body-2026-07-27T20-34-45-131Z -> body-2026-07-27T21-08-49-299Z`，比较文件 `comparison-vs-phase70-owned-header-strings.{json,md}` passed，配置、诊断和 metric coverage 差异为空。候选三轮全部 1000/1000，数据库总数/唯一 ID 和 direct row 均为 1000，0 Query/fallback/Gap/缺序/重复/乱序/unavailable，停止与最终 backlog 0、CPU 恢复且清理成功。

候选 DB catch-up、Yak CPU p50、Yak RSS、Electron CPU p95、request/response -> React 中位分别改善 `27.1%/9.4%/3.1%/6.5%/2.7%/0.9%`；首显 `43 -> 53 ms`、request p95 `+11.4%`、duplex p95 `+11.8%`、Renderer drain `+6.8%`、Electron drain CPU `+26.9%` 反向。自动化因此保留可归因的后端 parser 对象收益，但不驱动无证据的前端调度改动。

约 1.2 GiB 的验证隔离 cache 已永久删除；E2E build/tmp、测试 home 和 Electron/Yak/WDIO/chromedriver 进程均无残留，Yak 缓存维持 6 份/约 1.4 GiB，全局 Go cache 约 88 MiB、磁盘可用约 839 GiB。这仍是用户手工清理后的当前值，不能覆盖历史 `/home/go0p/.cache/go-build = 290G` 事故。下一轮继续由最新后端 packet split、Header map、context 与 persistence profile 选点；前端只有在重复 trace 明确归因后才进入下一优化项。

## 48. 第七十二轮：Header value 查询快路径的 Electron 门禁（2026-07-27）

本轮仍未修改前端产品消费、虚拟表或通信调度。后端 dump 路径原先为每次 lowercase `content-length/host/transfer-encoding` 查询重新 canonicalize key，并在只有一个正常 Header value 时仍分配结果 slice 和去重 map。候选只对单侧存储、最多 8 个非空且不重复的值直接复用静态 canonical key 和原 value slice；混合、空值、重复、未知大小写和大列表保持旧路径。五次配对微基准中位约 `139.4 -> 54.07 ns/op (-61.2%)`、`40 -> 8 B/op (-80.0%)`、`2 -> 0 allocs/op`；55,356 次 fuzz、聚焦 dump/parser、完整 utils 与 race 均通过。

heap `2026-07-27T20-59-52-643Z -> 2026-07-27T21-33-20-051Z` 中，基线 `getHeaderValueList` 的 `32,768 flat / 54,613 cumulative objects` 和 `canonicalMIMEHeaderKey` 的约 `21,845 objects` 均降到候选报告阈值以下；整轮 sampled allocation `-4.1%`、objects `-2.2%`。positive-live 有利而 post-live `+11.6%` 反向，自动化不接受常驻内存下降声明。CPU `2026-07-27T21-06-48-931Z -> 2026-07-27T21-39-40-932Z` 总样本 `+2.8%`、scanobject flat `-13.0%`、cumulative 基本持平，目标 lookup 低于分辨率，因此只接受分配因果。

首次正式矩阵 `body-2026-07-27T21-41-43-728Z` 在第 1 轮报告和 MITM stop 完成后，由 Electron CDP 抛出已知瞬态 `Promise was collected`。该矩阵保持 failed、没有拼入性能样本；应用/Yak 未 panic，清理门禁通过。复用缓存发布版完整重跑后，正式 3+3 为 `body-2026-07-27T21-08-49-299Z -> body-2026-07-27T21-48-21-509Z`，比较文件 `comparison-vs-phase71-header-value-fast-path.{json,md}` passed，配置、诊断和 metric coverage 差异为空。

候选三轮全部 1000/1000，数据库总数/唯一 ID 和 direct row 均为 1000，0 Query/fallback/Gap/缺序/重复/乱序/unavailable，停止与最终 backlog 0、CPU 恢复且无清理错误。duplex p95、request p95、最大 visible backlog、Yak CPU p95、Electron CPU p50/RSS 和首显分别改善 `21.1%/25.0%/15.0%/8.7%/5.0%/2.2%/5.7%`；DB catch-up `+11.6%`、persistence backlog `3 -> 4`、Yak CPU p50 `+20.7%`、Electron CPU p95 `+3.0%` 反向，因此仍不据此修改前端。

约 1.2 GiB 的验证隔离 cache 已永久删除；E2E build/tmp、测试 home 和 Electron/Yak/WDIO/chromedriver 进程均无残留，Yak 缓存维持 6 份/约 1.4 GiB，全局 Go cache 约 95 MiB、磁盘可用约 839 GiB。这仍是清理后的当前值，不能覆盖历史 290 GiB Go cache 事故。下一轮继续由最新后端 `splitHTTPPacketEx`、`bufio.ReadBytes`、response parser 与 context metadata profile 决定。

## 49. 第七十三轮：split owned line 与 CDP 恢复门禁（2026-07-27）

本轮后端 `splitHTTPPacketEx` 复用 scanner 已独占的 first/Header line allocation，不再为 raw callback、request/response callback、Header hook 和重建重复执行 `string([]byte)`。返回的完整 headers 仍独立，body view/copy 契约不变。覆写原 packet + GC 生命周期测试、完整 lowhttp `184.144 s` 和定向 race 通过。

同缓存严格五次 A/B 中，普通 256 KiB view `664.5 -> 589.9 ns/op (-11.2%)`、`514 -> 426 B/op`、`12 -> 9 allocs`；request callback view `-12.4%`、`13 -> 9 allocs`；Header hook view `-13.4%`、`12 -> 9 allocs`。heap `2026-07-27T21-33-20-051Z -> 2026-07-27T22-07-17-076Z` 中 split flat/cumulative sampled objects 分别改善 `85.0%/59.1%`，Header callback cumulative `-39.0%`；整轮 objects/allocation 反向 `+5.6%/+2.0%`，自动化只接受目标 caller。CPU `2026-07-27T21-39-40-932Z -> 2026-07-27T22-13-41-550Z` 总样本 `-1.9%`，目标低于分辨率，不作 CPU 宣称。

首次正式矩阵 `body-2026-07-27T22-15-49-617Z` 前两轮通过，第 3 轮启动时 Electron CDP bridge 暂时不可用并导致截图超时。失败矩阵没有进入比较。自动化把精确错误 `CDP bridge is not available, API is disabled` 纳入既有 CDP 瞬态白名单：只对幂等 window-state 查询最多重试一次，由外层 `waitUntil` 保持 15/30 秒硬超时；应用断言、后端错误和持续不可用不会重试成成功。CDP 单测从 4 增至 5 项并通过。

修复后完整重跑，正式 3+3 为 `body-2026-07-27T21-48-21-509Z -> body-2026-07-27T22-26-18-523Z`，比较文件 `comparison-vs-phase72-owned-split-lines.{json,md}` passed，配置、诊断和 metric coverage 差异为空。候选三轮全部 1000/1000，数据库总数/唯一 ID 与 direct row 均为 1000，0 Query/fallback/Gap/缺序/重复/乱序/unavailable，停止与最终 backlog 0、CPU 恢复且清理成功。

DB catch-up/drain、duplex p95、Renderer drain、首显、Yak CPU p50 和 Electron CPU p95 分别改善 `26.0%/17.1%/20.0%/13.7%/22.0%/16.6%/2.9%`；delivery p95、visible backlog、Electron CPU p50/drain、Electron/Yak RSS 和 Yak CPU p95 反向。产品消费、通信与 proto 未修改，前端只增强自动化恢复。

873 MiB 验证隔离 cache 已永久删除；E2E build/tmp、测试 home 和 Electron/Yak/WDIO/chromedriver 进程均无残留，Yak 缓存维持 6 份/约 1.4 GiB，全局 Go cache 约 101 MiB、磁盘可用约 839 GiB。这仍是清理后的当前值，不能覆盖历史 290 GiB Go cache 事故。下一轮继续由最新后端 Builder、response parser、context 和 MIME glob profile 决定。

## 50. 第七十四轮：静态 MIME glob 的 Electron 门禁（2026-07-28）

本轮仍以后端 profile 为主，没有修改前端产品消费、虚拟表或通信调度。第七十三轮 heap 发现默认 `ExcludeMIME` 会在每条响应上重复编译 `image/*`、`audio/*` 等规则；后端候选改为 filter 发布前预编译静态无编码 MIME 规则，并保留 slash/bare wildcard、大小写 contains、非法 glob、encoded group 与运行时新增 pattern 的旧语义。五次配对 benchmark 中位约 `4151 -> 2061 ns/op (-50.3%)`、`2808 -> 841 B/op (-70.0%)`、`77 -> 22 allocs/op (-71.4%)`；7,897 次 fuzz、完整 httptpl、并发 race 和 MITM V2 Content-Type gRPC 测试均通过。

自动化 heap `2026-07-27T22-07-17-076Z -> 2026-07-28T02-54-28-837Z` 中，基线 `MIMEGlobRuleCheck` 的约 `65,537 cumulative sampled objects` 和 `glob.Compile/parserMain` 的约 `32,768 objects` 均降到候选阈值以下，完整 YakMatcher cumulative objects 约 `-91.8%`。CPU `2026-07-27T22-13-41-550Z -> 2026-07-28T03-01-05-758Z` 中 YakMatcher 约 `40 -> 10 ms`、`IsMIMEPassed` 约 `30 -> 10 ms`；总 CPU 同时受 GC/GORM 波动，不作整机归因。

正式无 profile 3+3 为 `body-2026-07-27T22-26-18-523Z -> body-2026-07-28T03-03-30-690Z`，比较文件 `comparison-vs-phase73-static-mime-precompile.{json,md}` passed，配置、诊断与 metric coverage 差异为空。候选三轮全部 1000/1000，数据库总数/唯一 ID 和 direct row 均为 1000，0 Query/fallback/Gap/缺序/重复/乱序/unavailable，停止与最终 backlog 0、CPU 恢复且清理成功。

产品指标仍然混合：Renderer drain `-4.6%`、Yak RSS `-4.3%`、Yak drain CPU p95 `-32.8%` 有利；DB catch-up `+21.8%`、duplex p95 `24 -> 66 ms`、request -> React p95 `+10.4%`、visible backlog `18 -> 20`、Yak CPU p50/p95 `+9.6%/+13.3%`、Electron CPU p50/p95 `+7.4%/+10.3%` 反向。自动化因此接受确定的后端 MIME matcher 热点消除，但不声称整机或前端体感已经因本轮改善，也不据此调整前端参数。

本轮前端仅承担 heap/CPU/正式矩阵和正确性门禁，协议、proto、schema、数据库、GORM 与 driver 均未修改。fuzz/race 隔离 cache/tmp 峰值约 `5.7/1.9 GiB` 后已永久删除；E2E build/tmp 与 Electron/Yak/WDIO/chromedriver 无残留，Yak 二进制缓存约 1.4 GiB、全局 Go cache 约 102 MiB、磁盘可用约 839 GiB。这仍是用户手工清理后的状态，不能覆盖历史 `/home/go0p/.cache/go-build = 290G` 事故。下一轮继续由后端 response reader、packet grow/quote 和 context metadata profile 决定。

## 51. 第七十五轮：raw matcher material 快路径门禁（2026-07-28）

本轮仍未修改前端产品消费、虚拟表或通信调度。第七十四轮 heap 中剩余 YakMatcher 对象全部来自空/`raw` scope 对当前 packet 计算 SHA1、hex 并访问 TTL cache；后端候选改为调用期只读借用，表达式和所有解析 scope 继续走旧 owned/cache 路径。无编码 Group 直接遍历原 slice，编码 Group 继续独立解码，binary 强制 hex 有明确回归覆盖。

同缓存改前/改后完整默认 MIME matcher 约 `2176 -> 263 ns/op (-87.9%)`、`841 -> 0 B/op`、`22 -> 0 allocs/op`；隔离 raw hash/cache 的精确 oracle 约 `1647 -> 38.36 ns/op (-97.7%)`、`425 -> 0 B/op`、`18 -> 0 allocs/op`。8,933 次 fuzz、完整 httptpl、定向 race 与 MITM V2 Content-Type gRPC 回归通过。

自动化 heap `2026-07-28T02-54-28-837Z -> 2026-07-28T03-31-16-037Z` 中，基线约 `10,923 sampled objects` 的 YakMatcher/cacheHash/CalcSha1/hex 链路在候选差分报告中全部消失；整轮对象受进程名查询、SQLite Query 与 Header canonical 反向采样，自动化只接受目标 caller。CPU `2026-07-28T03-01-05-758Z -> 2026-07-28T03-37-46-431Z` 中目标各约 10 ms 的节点降到分辨率以下，总样本 `-19.1%`、scanobject cumulative `-25.2%` 仅作同方向佐证。

正式无 profile 3+3 为 `body-2026-07-28T03-03-30-690Z -> body-2026-07-28T03-39-59-596Z`，比较文件 `comparison-vs-phase74-raw-material-fast-path.{json,md}` passed，配置、诊断和 metric coverage 差异为空。候选三轮全部 1000/1000，数据库总数/唯一 ID 和 direct row 均为 1000，0 Query/fallback/Gap/缺序/重复/乱序/unavailable，停止与最终 backlog 0、CPU 恢复且清理成功。

产品中位仍混合：request/response -> React p95 `-7.7%/-7.8%`、delivery p95 `-9.2%`、visible backlog `20 -> 19`、Yak CPU p95 `-21.0%`、Electron CPU p50/p95 `-1.7%/-2.8%` 有利；Yak CPU p50 `+36.0%`、request p95 `+27.0%`、首显 `42 -> 63 ms`、DB catch-up/drain `+11.0%/+9.6%`、Renderer drain `+9.7%` 与 Yak RSS `+2.6%` 反向。自动化保留确定的后端 matcher 收益，但不据此调整前端调度或声称整机稳定提速。

隔离 fuzz/race cache 峰值约 7.1 GiB 后永久删除；E2E 专用 build/tmp 冷构建峰值约 `3.1/3.1 GiB`，退出后不存在，Electron/Yak/WDIO/chromedriver 无残留。Yak 二进制缓存仍为 6 份/约 1.4 GiB，全局 Go cache 约 104 MiB、磁盘可用约 839 GiB。这仍是用户手工清理后的状态，不能覆盖历史 290 GiB Go cache 事故。下一轮继续由后端 response reader、Header canonical、packet grow/quote 与 context profile 决定。

## 52. 第七十六轮：未修改响应 fast path 的 Electron 门禁（2026-07-28）

本轮仍以后端 profile 为主，没有调整前端消费、虚拟表或通信调度。MITM V2 普通自动转发原先即使没有插件、规则或人工修改，也会在 crep 层 clone 完整响应并重新 parse；候选通过新增的 modification-aware 回调显式报告未修改，且仅在返回切片仍为原 packet view 时保留已解析 response。旧 callback、显式修改、独立结果和错误标记继续走保守 snapshot/reparse，不是破坏性 API 更新。

256 KiB 定点基准约 `49.7 us / 272,682 B / 38 allocs -> 2.5 ns / 0 B / 0 allocs`。完整 crep、race 和全部 MITM V2 MUSTPASS（`198.797 s`）通过。forced-GC heap `2026-07-28T03-31-16-037Z -> 2026-07-28T04-20-06-196Z` 中，`cloneAndParseHijackedResponse 39.30 MB -> 0`、`bytes.Clone 51.74 -> 5.06 MB (-90.2%)`、response handler cumulative `-29.5%`、窗口 allocation delta `-14.4%`；CPU 目标低于旧 profile 的 10 ms 分辨率，没有追加无归因价值的 CPU 轮次。

正式无 profile 3+3 为 `body-2026-07-28T03-39-59-596Z -> body-2026-07-28T04-27-08-051Z`，比较文件 `comparison-vs-phase75-unmodified-response-fast-path.{json,md}` passed，配置、诊断和 metric coverage 差异为空。候选三轮均完成 producer/target/database/unique/direct `1000/1000`，0 Query/fallback/gap/缺序/重复/乱序/unavailable，停止与最终 backlog 0、CPU 恢复且清理成功。

产品中位仍混合：DB catch-up/drain、duplex p95、首显、request p95、Renderer drain、Yak CPU p50 分别改善 `24.0%/17.2%/22.7%/28.6%/13.4%/15.2%/13.3%`；visible backlog `19 -> 25`、request/response -> React `+10.2%/+9.3%`、Yak CPU p95/RSS `+19.4%/+3.6%`、Electron CPU p50/p95 `+6.0%/+3.0%` 反向。因此前端只承担自动化门禁，不根据这一轮短窗波动修改产品调度。

3.7 GiB 隔离 Go cache 已永久删除；E2E build/tmp 与 Electron/Yak/WDIO/chromedriver 无残留，Yak 二进制缓存保持 6 份/约 1.4 GiB，全局 Go cache 约 151 MiB、磁盘可用约 839 GiB。这仍是用户清理后的当前值，不能覆盖历史 290 GiB Go cache 事故。下一轮继续由后端 packet grow、process lookup 与 context profile 决定。

## 53. 第七十七轮：未修改请求 fast path 的 Electron 门禁（2026-07-28）

本轮仍以后端 profile 为主，没有修改前端产品消费、虚拟表或通信调度。普通 MITM V2 自动转发原先即使请求没有被过滤器、规则、插件或人工动作修改，也会在 crep 层把同一 packet 再次 `ParseBytesToHttpRequest`。候选增加 modification-aware request callback，且只有显式 `modified=false` 与原 packet view 身份同时成立时才保留已解析请求；旧 callback、显式修改、独立 packet、错误标记和 drop 继续走保守路径，不是破坏性 API 更新。

256 KiB 五次基准约 `152.7 us / 807,492 B / 67 allocs -> 2.917 ns / 0 B / 0 allocs`。完整 crep、定向 race 和全部 MITM V2 MUSTPASS（`197.079 s`）通过。forced-GC heap `2026-07-28T04-20-06-196Z -> 2026-07-28T04-57-46-431Z` 中，request hijacker cumulative `-50.3%`、`ParseBytesToHttpRequest -45.5%`、`FixHTTPPacketCRLF -42.0%`、`ReadHTTPRequestFromBytes -41.1%`；整窗 sampled allocation 只改善 `2.7%`，因此自动化只接受目标 caller 与微基准因果，不包装成全局内存结论。

正式无 profile 3+3 为 `body-2026-07-28T04-27-08-051Z -> body-2026-07-28T05-05-07-631Z`，比较文件 `comparison-vs-phase76-unmodified-request-fast-path.{json,md}` passed，case 配置、诊断和 metric coverage 差异为空。候选三轮均完成 producer/target/database/unique/direct `1000/1000`，0 Query/fallback/gap/缺序/重复/乱序/unavailable，停止与最终 backlog 0、CPU 恢复且清理成功。

产品指标继续如实保留混合方向：Yak CPU p50、request p95、request/response -> React、Long Task 总时长和 Electron CPU 分别改善 `22.4%/5.7%/2.5%/4.3%/49.5%/4.0%~3.4%`；visible backlog `25 -> 40`、duplex p95 `+31.0%`、DB catch-up/drain `+27.4%/+18.5%`、Renderer drain `+15.1%` 与 Yak drain CPU `+25.9%` 反向。前端因此不直接改 batch/interval 常量；下一阶段以重复 Renderer trace 验证更快后端到达是否稳定造成 commit/layout burst，同时继续让后端最新 heap 决定主优化点。

3.7 GiB 验证 cache 与约 2.9 GiB tmp 已永久删除；heap/正式 E2E 专用 build/tmp 峰值约 `2.0/2.0 GiB` 和 `1.7/1.7 GiB`，退出后不存在，Electron/Yak/WDIO/chromedriver 无残留。Yak 二进制缓存保持 6 份/约 1.4 GiB，全局 Go cache 约 158 MiB、磁盘可用约 839 GiB。这些仍是用户手工清理后的状态，不能覆盖历史 `/home/go0p/.cache/go-build = 290G` 事故。本轮 yaklang/yakit 均未提交或推送。

## 54. 第七十八轮：连接级 direct I/O 的 Electron 门禁（2026-07-28）

本轮前端产品、通信调度和虚拟表没有修改。后端 profile 发现 minimartian 的 context reader/writer 会对每次读写创建等长中间 buffer、channel 和 goroutine；候选改为连接级取消 watcher，读写 packet 直接交给 `net.Conn`。64 KiB read 包装开销从约 `14.107 us / 65,720 B / 4 allocs` 降为 `1.019 us / 0 B / 0 allocs`，256 KiB write 的隔离包装开销从约 `40.461 us / 262,330 B / 4 allocs` 降为 `7.614 ns / 0 B / 0 allocs`。完整 minimartian、race 和 MITM V2 回归通过。

大 Body heap `2026-07-28T04-57-46-431Z -> 2026-07-28T05-33-50-436Z` 中，旧 `ctxReader.Read 11.65 MB` 与 downstream `bufio.Writer.Write 39.97 MB` 分配消失，`Proxy.handleRequest` cumulative `-26.5%`、整窗 sampled allocation `-20.4%`；最终 HTTP packet grow 基本持平。CPU 诊断没有给出可信的整机改善，自动化只接受可归因的复制/分配消除。

正式无 profile 3+3 为 `body-2026-07-28T05-05-07-631Z -> body-2026-07-28T05-44-17-656Z`，比较文件 `comparison-vs-phase77-connection-bound-direct-io.{json,md}` passed，case 配置、诊断和 metric coverage 差异为空。候选每轮 producer/target/database/unique/direct 均为 `1000/1000`，0 Query/fallback/gap/缺序/重复/乱序/unavailable，停止与最终 backlog 0、CPU 恢复且清理成功。

产品中位的 visible backlog `40 -> 19 (-52.5%)`、duplex p95 `76 -> 45 ms (-40.8%)`、request/response -> React `-7.8%/-4.5%`、Renderer drain `-5.5%`、Electron CPU `-2.8%~-5.3%` 有利；DB catch-up `+3.8%`、Yak drain CPU p95 `+14.5%` 反向，Yak 常态 CPU/RSS 近中性。第七十七轮怀疑的 Renderer burst 没有稳定复现，所以不凭一次反向结果改 batch/interval；后续只有重复 content trace 把成本定位到 React commit/layout，才进入前端产品改动。

冷构建专用 build/tmp 峰值约 `3.3/3.3 GiB`，结束后已删除，Electron/Yak/WDIO/chromedriver 和测试 home 无残留；Yak 二进制缓存仍受 6 份/约 1.4 GiB 上限约束，全局 Go cache 约 165 MiB、磁盘可用约 839 GiB。这是清理后的当前状态，不能覆盖历史 290 GiB Go cache 事故。本轮 yaklang/yakit 均未提交或推送。

## 55. 第七十九轮：parsed request 参数统计与 A/A 漂移门禁（2026-07-28）

本轮仍未修改前端产品消费、虚拟表或通信调度。后端 `CreateHTTPFlow` 原先会 dump 并重新 parse MITM 已解析的 request，只为统计 GET/POST/Cookie 参数数量；候选直接复用该 request，raw-only 调用方才 parse 一次。五次基准中位约 `18.147 -> 9.863 us/op (-45.6%)`、`10,071 -> 5,081 B/op (-49.5%)`、`225 -> 155 allocs/op (-31.1%)`；差分语义、完整 mutate/yakit、race 和 MITM V2 回归全部通过。

heap `2026-07-28T05-33-50-436Z -> 2026-07-28T06-23-26-506Z` 中，后端 `CreateHTTPFlow` cumulative sampled allocation `28.89 -> 10.11 MB (-65.0%)`，dump/reparse 两条目标栈消失，整窗 sampled allocation `-6.0%`；CPU 目标降到 profile 分辨率以下但全局样本反向，因此只接受局部 allocation 结论。

首次正式 3+3 为 `body-2026-07-28T05-44-17-656Z -> body-2026-07-28T06-33-18-310Z`，比较文件 `comparison-vs-phase78-reuse-parsed-request-param-counts.{json,md}` passed，但多个产品中位显著反向。自动化没有把它直接归因给后端，而是在完全相同代码上追加三轮 `body-2026-07-28T06-44-50-029Z`，生成 `comparison-aa-phase79-repeat.{json,md}` 与 `comparison-vs-phase78-reuse-parsed-request-param-counts-repeat2.{json,md}`。

无代码变更的 A/A 中，duplex p95 `87 -> 53 ms`、request -> React `128 -> 109 ms`、Yak CPU p95 `163.49% -> 148.37%`、Long Task `290 -> 103 ms`；第二组相对 Phase 78 的首显 `45 -> 46 ms`、request/response -> React `107/107 -> 109/108 ms`、request p95 `5.519 -> 5.495 ms`、Yak CPU p50 `49.459% -> 49.654%`，核心体感指标接近中性，DB/Renderer drain 仍混合。这次 A/A 把 Electron/WSL 短窗漂移显式量化，避免用首组尖峰驱动前端参数改动。

两组候选共 6 轮均完成 producer/target/database/unique/shadow-direct/live-direct `1000/1000`，Query、fallback、gap、缺序、重复、乱序、replay、recovery、unavailable 均为 0，最终 backlog 0、CPU 恢复且清理成功。前端继续只承担可重复的端到端正确性、延迟、资源与漂移门禁；在重复 content trace 没有把稳定成本定位到 React commit/layout 以前，不调整 batch/interval。

验证/E2E 专用 build/tmp、测试 home 和 Electron/Yak/WDIO/chromedriver 均无残留；Yak 二进制缓存保持最多 6 份/约 1.4 GiB，全局 Go cache 约 174 MiB、磁盘可用约 839 GiB。这仍是用户清理后的当前值，不能覆盖历史 `/home/go0p/.cache/go-build = 290G` 事故。本轮 yaklang/yakit 均未提交或推送。

## 56. 第八十轮：count-only 参数总数的 Electron 门禁（2026-07-28）

本轮仍没有修改前端产品消费、虚拟表或通信调度。后端 HTTPFlow 参数统计在第七十九轮去掉 dump/reparse 后，继续为三个总数构造完整 fuzz 参数对象和 JSON/XML path；候选改为严格等价的 count-only visitor。48,956 次有界差分 fuzz、完整 mutate/yakit、race 和 MITM V2 回归通过；相对 Phase 79 parsed-list path 的五次微基准中位约 `10.205 -> 3.164 us/op`、`5,134 -> 1,252 B/op`、`155 -> 34 allocs/op`。

heap `2026-07-28T06-23-26-506Z -> 2026-07-28T07-17-18-286Z` 中，参数对象/path 已降到阈值以下，Count 路径 `-15.8%`、CreateHTTPFlow `-7.3%`、整窗 sampled allocation `-7.9%`。剩余约 8.9 MB 明确属于 parser-owned 64 KiB request body 的读出/重装，已作为下一后端阶段而不是前端猜测项。CPU 总样本和 scanobject 有利，但 CreateHTTPFlow 反向，因此只作混合诊断。

正式无 profile 3+3 为 `body-2026-07-28T06-44-50-029Z -> body-2026-07-28T07-28-10-244Z`，比较文件 `comparison-vs-phase79-count-only-param-totals.{json,md}` passed。候选每轮 producer/target/database/unique/shadow-direct/live-direct 均为 `1000/1000`，Query、fallback、gap、缺序、重复、乱序、replay、recovery、unavailable 为 0，最终 backlog 0、CPU 恢复且清理成功。

产品中位的 duplex p95 `53 -> 43 ms`、首显 `46 -> 42 ms`、request/response -> React `109/108 -> 107/106 ms`、visible backlog `20 -> 19`、Yak CPU p50 `49.65% -> 44.86%` 有利；request p95、Yak CPU p95/RSS、Long Task 与 Electron CPU 近中性；DB catch-up/drain 和 Renderer drain 反向 `7.1%/8.4%/7.2%`。自动化继续把结果归类为局部后端收益 + 混合产品窗口，不调整前端 batch/interval。

验证隔离 cache/tmp 峰值约 `4.6/2.7 GiB` 后已永久删除；E2E build/tmp、测试 home 和 Electron/Yak/WDIO/chromedriver 无残留。Yak 缓存维持最多 6 份/约 1.4 GiB，全局 Go cache 约 174 MiB、磁盘可用约 839 GiB。这仍是用户清理后的当前值，不能覆盖历史 290 GiB Go cache 事故。本轮 yaklang/yakit 均未提交或推送；下一阶段仍以后端 body ownership profile 为主。

## 57. 第八十一轮：受管旧 Yak 同窗归因与 request-body view 门禁（2026-07-28）

后端本轮把 parser-owned request body 的参数计数读取改为同步只读 view + reset；foreign/custom Body 仍保留复制恢复。64 KiB 局部基准约从 `12.407 us / 65,600 B / 3 allocs` 降为 `5.596 ns / 0 B / 0 allocs`；forced-GC heap 中旧 8.92 MB copy 栈消失，`CreateHTTPFlow -19.7%`、整窗 sampled allocation `-11.1%`。完整后端测试、race、34,644 次差分 fuzz 和 MITM V2 MUSTPASS 全通过。

首次正式矩阵及同代码重复都比早先第八十轮出现更高 duplex/Yak CPU，单纯 A/A 仍无法区分“当前代码稳定回退”和“时段已经变化”。因此自动化新增 `--yak-build-fingerprint <20-hex>`：只允许选择 E2E 受管缓存里已有且可执行的 Yak，缺失、非法路径、大小写异常、CPU/heap profile 或 Renderer trace 组合都会在负载前失败。报告同时写入 selected/current-source fingerprint、选择模式和 sourceMatchesBinary；普通 CI 仍只能按当前源码 content-addressed build。fixture 单测增至 13 项并通过。

使用该能力，小包同窗 3+3 为 `body-2026-07-28T08-32-58-073Z -> body-2026-07-28T08-38-43-195Z`。旧第八十轮二进制 `536fe35700419c447fcc` 在当前时段自身测得 duplex `81 ms`、request -> React `117 ms`、Yak CPU p50 `49.56%`，已复现之前候选的“变慢”，而它早先是 `43 ms/107 ms/44.86%`；由此排除 Phase 81 是广泛回退的原因。相邻当前二进制 `cd3f035a183b867b86e2` 为 duplex `72 ms`、request -> React `113 ms`、Yak CPU p50 `49.70%`，DB/Renderer drain 分别改善 `26.3%/19.5%`；Long Task 和 request latency 反向，继续按噪声/风险记录。

随后直接跑 64 KiB request-body 同窗 3+3：`body-2026-07-28T08-45-35-379Z -> body-2026-07-28T08-50-45-504Z`。吞吐近中性 `+1.1%`，Yak CPU p50 方向有利 `-4.8%`，DB/Renderer drain `-13.8%/-12.0%`；request/response -> React 与 Yak RSS 反向。max-rate 120 条样本离散较高，不把任一方向包装成稳定产品结论。

两组共 12 轮精确通过：小包每轮 1000 producer/target/database/unique/direct，64 KiB 每轮 120 且 Body 恰为 7,864,320 B；fallback、gap、缺序、重复、乱序、replay、recovery、unavailable 和 cleanup error 均为 0。前端产品消费、虚拟表、通信协议和 batch/interval 未修改；本轮前端价值是把跨时段误判升级为可自动执行的旧/新二进制同窗归因。

所有矩阵复用 6 份上限内的缓存二进制，没有 Go build；E2E build/tmp、临时 home 和 Electron/Yak/WDIO/chromedriver 无残留。Yak 缓存约 1.4 GiB、全局 Go cache 约 181 MiB、磁盘可用约 838 GiB。这些仍是用户清理后的当前值，不能覆盖历史 `/home/go0p/.cache/go-build = 290G` 事故。下一轮以后端最新 heap/CPU caller 为主，必要时用这套受管指纹机制做同窗 A/B；只有 Renderer trace 重复定位到 React commit/layout 才修改前端产品调度。

## 58. 第八十二轮：PlainRequest 借用与中等 Body 矩阵（2026-07-28）

后端本轮只在待缓存 slice 与 request context 自有 bare packet 的起点和长度完全一致时借用 PlainRequest；外部等值 slice、子 slice、编码 buffer 和其他 foreign input 继续 clone。64/128 KiB 微基准的完整 packet 分配分别下降 `99.0%/99.4%`，旧 heap 的 `10,116,282 B bytes.Clone -> SetPlainRequestBytes -> decodeAndCache...` 栈和 CPU 中约 `60–70 ms` 的同链路在候选 profile 消失。完整 `httpctx`、定向 plain-request/race 和 MITM V2 MUSTPASS 通过；全量 `common/yakgrpc` 达到既有 10 分钟 package timeout，因此不记为通过。

120 条 64 KiB 请求体首组旧/新 3+3 表面吞吐 `-11.2%`。自动化立即反向补跑三次相同旧二进制，旧版自身相对前组也下降 `9.6%`；候选相对紧邻后置旧版仅 `-1.7%`，request p95 `-3.8%`、Yak CPU p50 `-3.0%`、Yak RSS `-4.6%`。三份比较报告同时保留 leading old、candidate 和 trailing old，避免再把分组时间顺序当作代码回退。

为放大目标路径信号，checked-in `mitm-body-matrix.json` 新增 `request-64k-medium`：600 条、并发 12、64 KiB request、4 KiB response；对应 Vitest 12 项通过。正式 3+3 为 `body-2026-07-28T10-14-58-858Z -> body-2026-07-28T10-20-06-695Z`，比较文件 `comparison-vs-phase81-cached-request-64k-medium-same-window.{json,md}` passed。

中等场景候选吞吐 `+14.3%`、request p95 `-10.9%`、DB/Renderer drain `-4.6%/-5.6%`、request/response -> React `-10.9%/-19.4%`、Long Task total `-81.8%`；Yak CPU p50/RSS `-1.0%/-0.2%` 近中性。first visible `64 -> 156 ms`、duplex p95 `65 -> 127 ms`、瞬时 visible backlog `21 -> 69` 反向，继续作为调度相位/更快生产可能放大的风险项公开，不据此调整前端 batch/interval。

六轮中等场景每轮 producer/target/database/unique 均为 `600/600`，target request body 精确 `39,321,600 B`；fallback、gap、缺序、重复、乱序、replay、recovery、unavailable 和 cleanup error 为 0。前端产品消费、虚拟表、通信协议、proto 和调度常量未改，本轮只增强自动化矩阵与测试。E2E 继续单实例串行，Yak 缓存约 1.4 GiB、全局 Go cache 约 183 MiB、磁盘可用约 839 GiB，无 Electron/Yak/chromedriver 残留；这些是用户清理后的当前值，不能覆盖历史 290 GiB Go cache 事故。下一轮主战场仍是后端 packet quote/growSlice/parser caller，前端只按重复 trace 证据进入产品优化。

## 59. 第八十三轮：TrafficGuard prefilter 有界缓冲门禁（2026-07-28）

后端最新 heap 将 TrafficGuard CGO prefilter 定位为可安全缩减的 caller：旧版对 256 KiB 正文即使零命中也按正文长度为每个 cold scratch 预留约 256 KiB pair buffer。候选只把首次容量限制为 8192 对/64 KiB；C 内核返回真实未截断命中总数，超过时按精确数量扩容重扫，并复用已扩容 backing array。

自动调参先否决了 2048 对版本：4000 命中对抗样本 CPU 约回退 43%。最终 8192 对在零命中 256 KiB 基准中时间/字节改善 `34.2%/75.8%`，4000 命中时改善 `24.0%/51.4%`，alloc 次数不变。完整 minirehs、TrafficGuard、race 和 MITM V2 MUSTPASS 通过。

heap `2026-07-28T09-39-45-988Z -> 2026-07-28T10-49-57-181Z` 中，`scanHitsImpl 3,917,119 B` 与 `MatchedIndexes 4,441,419 B cumulative` 均降到阈值以下，整窗 sampled allocation `-2.0%`。CPU 单样本因总采样 `1.75 -> 2.38 s` 而目标累计 `60 -> 80 ms`，占比近中性，所以自动化没有把它包装成整机 CPU 改善。

正式 64 KiB request/256 KiB response 3+3 为 `body-2026-07-28T11-05-00-470Z -> body-2026-07-28T11-10-17-929Z`，比较文件 `comparison-vs-phase82-prefilter-pair-cap.{json,md}` passed。吞吐 `+6.4%`、response -> React `-25.2%`、Long Task total `-49.5%`、Yak drain CPU `-22.8%` 有利，Yak 常态 CPU/RSS 近中性；DB/Renderer drain `+26.5%/+22.7%` 与 duplex p95 `+68.7%` 反向且离散较大，不据此修改前端 batch/interval。

六轮每轮 producer/target/database/unique 均为 `120/120`、request body `7,864,320 B`，detail 再校验 64 KiB request/256 KiB response；fallback、gap、缺序、重复、乱序、replay、recovery、unavailable 和 cleanup error 为 0。前端产品、通信、虚拟表、proto 和调度未修改，本轮前端只执行现有自动化门禁。Yak 缓存约 1.4 GiB、全局 Go cache 约 183 MiB、磁盘可用约 839 GiB，无 Electron/Yak/chromedriver 残留；仍明确不覆盖历史 290 GiB Go cache 事故。

## 60. 第八十四至八十六轮：最终 grow/quote 热点的自动化收口（2026-07-29）

本轮前端产品消费、direct stream、虚拟表和调度常量均未修改；WDIO/Electron 自动化用于验收后端最后两个大 allocation 热点。Phase 83 heap `2026-07-28T10-49-57-181Z` 的 `bytes.growSlice 96,197,205 B` 与 `quoteHTTPPacket 51,610,569 B`，经过内部 packet borrowing、quoted TEXT 有界复用和合法 Content-Length 原始顺序借用后，在最终 heap `2026-07-29T04-04-30-580Z` 分别变为 `60,674,353 B` 与 `6,812,006 B` pool acquisition；整窗 sampled allocation `184,998,744 -> 113,860,780 B (-38.5%)`。

中间诊断 `2026-07-29T03-47-31-376Z` 明确暴露 response fixer 仍为 Header 顺序复制整包，自动化没有因总量已改善就提前结束；后端补上窄快路径后，旧 `FixHTTPResponsePacketBorrowed -> replaceHTTPPacketBodyExWithBorrow 32,062,300 B` caller 在最终报告中降到阈值以下。两轮 heap 均精确完成 120/120、64 KiB request、256 KiB response、数据库唯一 ID、direct stream、detail Body、滚动、CPU 恢复与清理。

最终无 profiler 三次矩阵为 `body-2026-07-29T04-11-53-733Z`。对 Phase 83 `body-2026-07-28T11-10-17-929Z` 的 `comparison-vs-phase83-final-hotspots.{json,md}` passed，配置、诊断和 metric coverage 差异为空。三轮全部 producer/target/database/unique `120/120`，无 fallback、gap、缺序、重复、乱序、replay、recovery、unavailable 或 cleanup error。

产品中位方向为吞吐 `+38.6%`、request p95 `-26.3%`、request/response → React `-7.1%/-3.0%`、Yak CPU p50 `-2.4%`、Yak RSS `-1.3%`；DB catch-up/drain `+7.6%/+5.9%`、persist → React `+28.5%`、Renderer drain `+3.9%`、Yak CPU p95 `+1.2%` 反向。自动化因此只判定“正确且无明显整机回退”，不把跨日 WSL 样本包装成前端全面提速，也不据此继续修改 batch/interval。

heap 模式使用保留符号的 Yak，正式门禁使用 `-s -w` 发布式 Yak，二者按不同 content fingerprint 各自受管；三次正式轮次只在首轮冷构建，后两轮复用同一发布式二进制。E2E go build/tmp 在每次退出后清理，Electron/Yak/WDIO/chromedriver 无残留。任务专用 Go cache 已清到约 12 KiB，全局 Go cache 从约 3.9 GiB 主动清到约 768 KiB，受管 Yak 二进制缓存约 1.5 GiB、磁盘可用约 838 GiB；仍明确不以清理后的当前值否认历史 290 GiB 事故。

当前自动化已经完成这次性能专项的阶段性闭环：微基准验证局部因果、heap 验证 caller、SQLite/proto 测试验证兼容、race 验证并发、三次 Electron 验证真实链路。剩余后端 grow 主要是首次网络 packet 物化，不再由前端猜测参数或继续盲目压测；只有新的 profile 或用户场景出现可归因热点时再开启下一阶段。

## 61. 第八十七轮：MITM 重置与推送/滚动一致性修复（2026-07-29）

用户回归发现两条前端正确性问题：重置后偶发遗留一行并保留旧滚动高度，以及实时推送和滚动分页交错后出现重复 ID 与局部乱序。修复不调整 batch/interval，也不修改 proto、数据库或后端接口：重置先持久化时间边界，再用当前项目持久化/推送/可见 ID 的高水位隔离旧数据；所有旧查询通过 epoch 失效，推送 batch、offset、游标、选择和虚拟滚动状态同步清空。项目数据库切换时自动撤销旧项目的高水位，避免新项目较小 ID 被隐藏。

滑窗的顶部、底部和 offset 合并改为基于提交时最新 state，以 ID 去重并按当前单调顺序归并，查询行优先替换 body-free summary。虚拟表在空数据且旧 `scrollTop` 很大时显式把容器位置、wrapper 高度和 margin 归零，避免 ahooks `useVirtualList` 计算出负高度后保留旧滚动区。

自动化使用截图中的重叠序列 `6512/6511 + 6511..6507` 验证结果唯一且严格降序，并覆盖 182000 px 深滚动清空、重置事件新旧格式及高水位不关闭专用实时流。HTTPFlow、虚拟表和调度相关 11 个 Vitest 文件共 144 项通过，Renderer TypeScript 检查通过；本轮未运行高资源 Electron 矩阵。

## 62. 第八十八轮：重置 ID 回退与 History 隐藏态收口（2026-07-30）

上一轮的前端高水位能隔离清库前迟到结果，但 HTTPFlow 表被 Drop/Recreate 后会复用较小 ID；若项目逻辑边界不变，旧 `AfterId` 会把后续新流量永久隐藏。本轮与后端 generation 轮换配套：MITM 记录重置时的 project key，收到新 generation 后自动撤销旧高水位、失效旧查询并从新数据集重新加载，不用根据 ID 大小猜测是否发生清库。另一个直接导致“重置后不再出新流量”的边界是：实时流进入 GAP recovery 时，重置后的数据库查询可能为空，旧 controller 会把订阅游标错误降到 0 并反复撞 replay-window GAP；现在空结果也使用 `Filter.AfterId` 作为可靠恢复游标，新 ID 可继续直接推送。

同时收口 HTTP History 隐藏态工作。默认未开启“后台刷新”时，隐藏页面不再解析 flow 事件、不运行精确 Total 定时器，也不发列表查询；回到页面后只由虚拟表可见性切换执行一次 bootstrap，避免 dirty 补拉和 Hook 补拉互相失效。用户显式开启后台刷新时继续保持该产品能力，但隐藏态列表查询排除 Request/Response raw body，回到可见态后再执行一次完整 hydration。MITM 页面不受 History 后台开关影响，隐藏后保持停用。

定向 Vitest 覆盖 generation `7 -> 8` 清除旧边界、空结果按 `AfterId` 从 GAP 恢复、缺少项目身份时不猜测、History 默认隐藏停用、显式后台 metadata-only 以及 MITM 隔离，共 68 项通过；Renderer TypeScript 检查通过，定向 ESLint 无 error。本轮未运行高资源 Electron 矩阵。

## 63. 第八十九轮：项目切换后的 History 首次布局 bootstrap（2026-07-31）

项目管理页会卸载当前业务页面，切换完成后重新挂载 History。旧流程的首次 params effect 可能早于 ResizeDetector 得到有效高度，因此只启动兼容轮询而没有真正查询；共享 Duplex 已激活时，该轮询又会被停止。新项目中的既有流量不会产生新的 committed 通知，最终表现为网站树已有内容但表格保持空白，直到筛选或标签切换再次触发查询。

本轮把表格第一次获得有效高度定义为明确的 bootstrap 边界：活动表首次测得高度时立即刷新；隐藏表不查询，初始化后的尺寸变化继续保留原有“仅主表变高时刷新”规则。纯函数测试覆盖首次高度、隐藏态、变高、变小和详情展开状态，共 26 项 HTTPFlowTable utils 测试与 16 项虚拟表调度测试通过；Renderer TypeScript 检查通过，定向 ESLint 无 error。本轮不修改后端、proto 或数据库。

## 64. 第九十轮：HTTPFlow 实时协议主文件单源化（2026-07-31）

前端删除独立 `httpflow_live.proto`，其定义原样合并进唯一入口 `app/protos/grpc.proto`，与后端主 proto 逐字节同步。Electron 仍只加载该主文件；`SubscribeHTTPFlows` RPC、字段号和枚举值不变，不需要 Renderer 调用迁移，也不改变实时摘要的 body-free 契约。

## 65. 第九十一轮：MITM 订阅所有权与诊断入口收口（2026-08-04）

`SubscribeHTTPFlows` 主进程注册表改为 `webContents.id + renderer token` 内部 key，并同时校验可信页面、主窗口 sender、token 字符集/长度以及 `SessionId` 一致性；回传 channel 仍使用原 renderer token，因此 preload、Renderer 和 proto 契约不变。同一渲染进程中的 React 组件不是独立安全主体，但跨窗口取消订阅已被主进程拒绝，现有 40 字符随机 token 继续作为同一 renderer 内的取消能力值。

订阅不再依赖下一条 `data/error/end` 懒清理：主窗口关闭、webContents 销毁、renderer 退出或页面 reload 都会先清空 Map，再逐条 `cancel()`，避免取消同步触发终止事件时误投递；error/end 分支与 data 分支统一检查窗口可用性。参数化测试覆盖四个生命周期入口、同步 cancel/error 竞态、已销毁窗口 error、跨 sender 和非法 token。

两个 MITM 全局诊断入口只在主进程为开发/E2E BrowserWindow 注入显式 capability 时安装，打包窗口不再暴露 observability reset/mode 和 shadow/canary 写入口。MITM 页面仍按 `singleNode` 保持单表；开发/E2E 下若同一 renderer 同时挂载第二张 MITM 表会告警，避免模块级 observability 单例静默串台。proto `SystemTiming` 与 Electron 本地 `YakitMainProcessTiming` 已有独立类型和消费链，本轮保持双字段语义，不做破坏性改名。

定向 Vitest 4 个文件共 36 项通过，Renderer TypeScript 检查通过，定向 ESLint 0 error（表格文件保留 23 条既有 warning），Node 语法检查与 `git diff --check` 通过。本轮不修改后端、proto 或数据库，也不启动高资源 Electron/Go 构建。
