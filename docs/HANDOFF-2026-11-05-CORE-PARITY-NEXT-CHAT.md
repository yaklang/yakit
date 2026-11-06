# AI Senso 核心差异补迁交接（2026-11-05）

**2026-11-06 最新状态：最后七项及核心六组补迁已实施，新版已加载，用户确认显示与浏览器位置正常。最终回归100文件/622条通过/1条跳过，类型检查通过。当前引擎返回 `unsupported schema: browser-extension`，浏览器正向集成不记作已验收。** [最新交接](HANDOFF-2026-11-06-FINAL-REVIEW.md)、[最终检查记录](changes/2026-11-06-final-review-and-github.md)。本段优先于下方历史启动、进度和待编译状态；当前客户端保持运行。

## 当前请求和运行状态

用户已明确授权迁入核心复核列出的六组差异，并将浏览器移到“任务内容 / 文件系统 / 技能”同栏。代码接入、100 文件回归和最终类型检查完成，正在收尾独立编译与资源校验；最终结果见 [本轮记录](changes/2026-11-05-core-parity-completion.md) 和 `.codex-run/parity-release-tests.json` / `parity-release-tsc.log`。交接收尾前会更新本节验证结果。

**本轮没有操作窗口、重启客户端、停止或重启 18080 / 19080、覆盖 `app/renderer/pages/main`。运行窗口仍为此前用户确认正常显示的 Refresh 修复版，不能称本次功能已加载或已通过人工验收。** 新推荐技能 IPC 需要下次客户端启动。

保留所有现有修改和 `outputs/`、`2140`、`2672`、`2852`、`3460`。当前 HEAD `8cb79ea04` 是此前用户要求的备份；本轮未提交 / 推送。固定前端参考 `D:/qianduan/cankaodeYAKIT/_memfit`，SHA `9fc639fbb677eaa538132b2afa749555b3b14791`，保持干净只读。没有引擎变更、全局依赖升级、整仓合并或授权 / 文件权限调整。

## 已接入的范围

- 浏览器会话页签紧随技能；引用写入本会话输入框。欢迎页可以从 `@ → 浏览器 → 浏览器设置` 访问同一面板；确认框和引导跟随编辑器容器，弹层键盘事件不触发提及切换。
- 队列“追加待办 / 调整方向”、SyncID loading、重复操作保护和超时 / 发送失败反馈；保留插队 / 删除。
- 任务详情 Skill 加载状态 / 搜索 / Token 排序 / 只读文档，与 Forge 分开；文档组件按需加载，沿用文件权限和体积检查。
- 子 Agent 汇总及持续状态更新，保留数字员工待办、Plan 历史和聊天定位。
- 实际 provider / model / thinking level 用量明细和事件 / 刷新链路，保留旧引擎回退。
- 推荐场景多选、角色隔离缓存、编辑 / 确认恢复默认，三个正式客户端 proto / 可信 IPC；Type + Name 合并能力，保留真实 Forge / 附件。`@` 聚合 / 分类 / 浏览器搜索、更多数据、键盘 / IME、过期回包保护和完整 query 消耗。
- 浏览器缩略图 / 刷新 / 悬浮放大，原参考 Windows / macOS 图文引导和 11 张图片；保留配对 / 引用 / 接管 / YTray 历史。图片仅在内存，外链通过现有 bridge。

六组原发现及本轮适配说明见 [复核报告](changes/2026-11-05-core-parity-audit.md)、[补迁记录](changes/2026-11-05-core-parity-completion.md)。具体按钮见 [人工测试指南的核心补迁节](MEMFIT_MANUAL_TEST_GUIDE.md#核心补迁六组与浏览器位置2026-11-05)。

## 验证与产物入口

最终相关回归 **100 文件 / 621 条通过 / 1 条原有跳过**，退出码 0。清单 `.codex-run/parity-full-test-files.json`，报告 `.codex-run/parity-release-tests-final.json`，日志 `.codex-run/parity-release-tests-final.log`。按逐条 assertionResults 计数，不将顶层计入的 skipped 当通过。

最终主渲染类型检查退出码 0，日志 `.codex-run/parity-release-tsc-final.log`；Node 最大堆 2560 MB，`--noEmit --incremental --tsBuildInfoFile .codex-run/parity-verified.tsbuildinfo`，没有修改 tsconfig。测试、类型检查、webpack 串行执行。

独立编译计划使用 `.codex-run/build-core-parity.cjs` 调用受版本控制的 `scripts/build-memfit-static-preview.cjs`，输出 `.codex-run/parity-main-20261105`；不等于已激活。最大堆限制 3072 MB，低于 3 GiB 空闲拒绝开始，剩余物理内存低于 1 GiB 时仅退出自身编译器。内存报告 `.codex-run/parity-build-memory.json`。编译状态、资源 / 九份 locale 校验完成后更新本交接。

## 再次加载时必须遵循

1. 当前用户仍在测试，不自行加载或重启；有问题先修复回归。
2. 若用户明确要求加载：先核实本项目客户端 / 服务身份及运行任务，结束相应任务后再停客户端和旧静态服务；不要操作其他项目进程，不清空缓存 / 历史。
3. 使用本轮独立产物，禁止旧失败的 `.codex-run/batch3-main-20261105`。创建 CRA 配置前必须 `FAST_REFRESH=false`；不能只移除 RefreshPlugin，不能补空的 `$RefreshReg$` 掩盖错误。
4. 不并行运行类型检查和 webpack；九份 locale 为 aiAgent / layout / configNetwork × zh / zh-TW / en，与源码逐份核对。复制沿用 Node `fs.cpSync`，避免 PowerShell `aux` 保留名称错误，不删除保留文件。
5. 静态 18080 就绪 → 确认 19080 就绪 → 原普通 `.codex-run/start-b3bd-electron.ps1`。新 IPC / proto 必须由新主进程加载；只刷新 renderer 不够。
6. 显示通过需要用户或实际画面证据。进程、标题、HTTP 200、编译成功都不等于功能 / 视觉通过。此前用户确认的是旧 Refresh 修复版。

真实引擎、技能路径 / 推荐 RPC、浏览器扩展 / YTray 及视觉仍需用户验收。定时任务没有执行关联 ID 的既有限制继续保留，不为此修改引擎。
