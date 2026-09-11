# Yakit-only IPC 启动验收（WIP）

基线：`rookie/enhance/distribution-optimization`，开发分支：`codex/yakit-ipc-startup-management`。
仅修改 Yakit；未修改、编译或发布 yaklang，也未覆盖用户日常引擎或数据库。

## 固定制品

CI 使用 CDN `1.4.8-alpha0911ipc`，三平台制品已下载并核对 SHA-256，固定值见
`scripts/engine-startup/engines.json`。Windows 历史样本为 `1.4.8-beta17`。
下载失败或哈希不符直接失败，不改用 latest、不编译引擎。

## 本地证据（2026-09-11）

Windows 11 10.0.26200，x64，非提升令牌；Electron 27.0.0 / Node 18.17.1 /
grpc-js 1.8.11。脚手架使用 Node 24.19.0、现有 Yarn/CLI/WDIO/Vitest。

| 验证 | 结果 |
| --- | --- |
| 主进程端点、生命周期、认证、取消、回退、恢复回归 | 98 测试通过 |
| Link 启动/恢复回归及新连接策略控件 | 70 + 3 测试通过 |
| Main 引擎管理安全操作 | 7 测试通过 |
| E2E 脚手架 preflight | 67 测试通过；不编译引擎 |
| 两端 TypeScript、三语言 key 对齐 | 通过 |
| Main 改动文件 ESLint | 0 error；4 个 effect 警告 |
| 两端生产渲染构建（现有 test:e2e:build） | 通过 |
| 0911 auto IPC / IPC-only / TCP，实际 Electron 主进程 | 均通过；各约 8–9 秒（含检查、业务 RPC、停止） |
| IPC 占用备用 TCP 端口、取消后重试、鉴权反例、断开重连 | 通过；未接管占用端口的服务 |
| beta17 TCP、鉴权反例、端口占用、进程清理 | 通过 |
| beta17 自动 IPC 拒绝端点不符，再手动 TCP 恢复 | 通过，约 8 秒 |
| 0911 开发渲染 GUI：auto IPC → UI 停止 → TCP 重启 | 通过，42.2 秒 |
| 0911 生产渲染 GUI：TCP → UI 停止 → IPC 重启 | 通过，40.6 秒 |

GUI 验证包含实际 Link/Main 窗口交接、业务 Echo、默认项目交互、真实端点和 PID、
安全列表 DTO、管理按钮、停止确认、策略持久化、新实例重启后的业务 Echo。
检查了启动设置面板和引擎管理面板浅/深色截图，没有将“窗口出现”作为验收完成。

可复查本地 WDIO 产物（不提交大体积截图）：

- `reports/e2e-electron/2026-09-11T01-55-48-888Z`：开发渲染 GUI。
- `reports/e2e-electron/2026-09-11T02-01-34-056Z`：生产渲染 GUI。
- 每次运行包含版本/哈希/source identity、`ipc-ui-acceptance.json` 和截图。

## 回退证据的边界

beta17 的 checker 会忽略 IPC 参数、返回 TCP 地址，并非明确的 unknown-flag 失败。
因此不能拿这个样本宣称自动回退验证通过；端点不符仍安全失败，用户明确选 TCP 后可恢复。
显式 CLI 参数不支持、分类绑定失败才允许自动回退；该分支已有确定性回归测试。
不会为了变绿放松端点、认证、数据库错误或进程退出校验。

## 三平台 CI 与未覆盖范围

三个并行启动测试：windows-2022 / macos-15 / ubuntu-24.04。PR 只在修改
`app/main/**` 时自动触发；renderer-only 不触发；Draft run/job 显示 `[WIP]`，不跳过测试。
真实启动烟测步骤限时两分钟，冷依赖/CDN 下载时间单独统计，整 job 限时十分钟。
Actions 上传 JUnit、引擎哈希、运行时、每种模式耗时及历史版本恢复结果。

本地结果不等于三平台 CI 结果，以 PR 最新提交的 checks 为准。仍不把以下范围写成已通过：
完整安装包验收、真实跨物理硬盘及存量大数据库迁移、最新制品下的 UAC 混合权限矩阵、
macOS/Linux 完整 GUI。保留 Draft/WIP，待这些范围后续验收。
