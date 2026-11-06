# Memfit 增量更新测试与验收矩阵

**2026-11-06 最新状态：最后七项及核心六组补迁已实施，新版已加载，用户确认显示与浏览器位置正常。最终回归100文件/622条通过/1条跳过，类型检查通过。当前引擎返回 `unsupported schema: browser-extension`，浏览器正向集成不记作已验收。** [最新交接](HANDOFF-2026-11-06-FINAL-REVIEW.md)、[最终检查记录](changes/2026-11-06-final-review-and-github.md)。本段优先于下方历史启动、进度和待编译状态；当前客户端保持运行。

**2026-11-05 最新修复状态：本次白屏已定位为独立静态构建的 React Refresh 转换 / 运行时不一致，修复产物已激活并启动；用户确认“正常，已看到数字员工或会话页面”。** [修复、证据与防复发](changes/2026-11-05-white-screen-refresh-fix.md)。本次恢复不代表此前所有白屏已统一查明，也不代表最后七项已人工验收。启动仍必须确认实际画面，不能只看进程 / 标题 / HTTP 200。

**2026-11-05 当前状态：第三批 B2-C、B7-A/B/C、B9-A/B/C 已实施，累计 29/29。最终回归 85 个文件、558 条通过，1 条 Windows 符号链接用例跳过；独立类型检查通过。当前窗口未重启，本批采用独立编译目录。** [最新交接](HANDOFF-2026-11-05-BATCH3-NEXT-CHAT.md)、[第三批记录](changes/2026-11-05-batch3-input-tabs-browser.md)、[测试入口](MEMFIT_MANUAL_TEST_GUIDE.md#第三批七项2026-11-05)。本段优先于下方历史进度；真实引擎 / 扩展 / YTray / 视觉仍待验收。

**2026-11-04 新窗口交接已整理：[当前完整快照](HANDOFF-2026-11-04-BATCH2-NEXT-CHAT.md)；[可复制提示词](NEXT_CHAT_PROMPT-2026-11-04.md)。客户端已按用户最新明确要求使用既有普通脚本启动，用户确认“启动了，我自己检查即可”，已停止窗口检查。当前22/29，剩余7项；68文件/479条回归及类型检查通过。启动确认不等于本批真实引擎或视觉验收通过。以下此前“自动启动被拒绝”是历史状态，以本段为准。**

**2026-11-04 第二批七项：B4-A / B4-B / B4-C、B5-A / B5-B / B5-C、B6-D 已实施，当前 22 / 29，剩余 7 项。68 个文件 / 479 条回归、主渲染类型检查通过。静态编译通过（7 条非阻断警告），18080 / 19080 和资源就绪；客户端自动启动被自动审批拒绝，实际显示待人工确认。** [实施、验证与运行记录](changes/2026-11-04-batch2-sessions-skills-mcp.md)；[具体页面 / 按钮测试入口](MEMFIT_MANUAL_TEST_GUIDE.md#第二批七项2026-11-04从这里开始测试)。下一批为 B2-C、B7-A / B / C、B9-A / B / C。真实引擎技能 / MCP 及本批人工视觉待用户验收；保留品牌、数字员工 / Forge / 附件 / 历史 / 授权 / 文件权限，未动引擎、未升级依赖、未提交 / 推送，保留已有改动与 outputs/、2140 / 2672 / 2852 / 3460。本段优先于下方历史批次数字。

**2026-11-04 白屏恢复跟进：旧进程停在连接页启动加载，且记录网络子进程崩溃；空闲约 6.9 GiB、没有 webpack / tsc。重新启动本项目客户端后，主页面完成加载，浏览器视图截图已显示八个数字员工与快速导航。** [恢复记录](changes/2026-11-04-white-screen-recovery.md)。用户随后明确确认“已恢复正常显示”；底层原因尚未确定，不将本次恢复等同于永久修复。业务源码与引擎未改，功能计数仍为 15 / 29。

**2026-11-04 人工反馈修复：文件搜索布局、输入区下拉焦点、推理探测用途与结果提示已修正。60 文件 / 399 条回归、主渲染类型检查和开发编译通过；验收服务和客户端已重新启动。** [修复与验证记录](changes/2026-11-04-batch1-ui-feedback.md)；[逐页面 / 按钮人工测试指南](MEMFIT_MANUAL_TEST_GUIDE.md)。进度仍为 15 / 29、剩余 14 项；本次没有新增下一批功能。原生截图采集仍超时，实机视觉及真实引擎复验待用户完成，下方此前数字保留追溯。

**2026-11-03 剩余 21 项第一批：B6-A / B6-B / B6-C、B8-A / B8-B / B8-C / B8-D 已实施。当前 15 / 29，剩余 14 项，按两批各 7 项继续。58 文件 / 392 条回归通过，主渲染类型检查退出码 0。** [本批七项记录与人工测试清单](changes/2026-11-03-final7-batch1-tools-files-models.md)。用户负责最后集中进行真实引擎和人工视觉测试，不以人工验收作为批间默认等待条件。保留既有改动和未跟踪产物；HEAD 仍为 `d2cc5db82`，本批未提交 / 推送、不动引擎。下方旧批次数字仅供追溯。 本批页面已生成（7 条非阻断警告），六份 locale 同步，编译器已退出，18080 / 19080 与客户端已恢复；运行边界见本批记录。

**2026-11-03 B3-C 续批：状态筛选、总数全显 / 全隐、拖拽及键盘排序、三视图联动已实施。当前 8 项已实施、21 项待实施；B3 四项均已实施。43 文件 / 300 条回归及主渲染类型检查通过。** 本批保留已有未提交改动，未提交 / 推送，不动引擎。详细范围、参考差异、静态生成和人工验收边界见 [本批记录](changes/2026-11-03-b3c-task-status-controls.md)。静态验收页与三语 locale 已更新，webpack 已退出，客户端沿用临时 `--disable-gpu` 重启；两次窗口截图采集超时，人工视觉与真实引擎验收仍待完成。本段优先于下方旧批次数字。

**2026-11-03 续批 B3-B / B3-D：41 文件 / 265 条完整回归通过，主渲染类型检查退出码 0。** 新增甘特时间工具 21 条、组件 4 条、详情切换 6 条、真实流路由快照 8 条，共 39 条；原 226 条继续通过。范围及人工验收边界见 [本批记录](changes/2026-11-03-b3-gantt-task-switch.md)。报告 `.codex-run/memfit-b3bd-verified-20261103.json`，日志 `.codex-run/memfit-b3bd-regression.log` 和 `.codex-run/b3bd-tsc-final.log`。开发 webpack 生成成功（7 条既有类别警告），停止编译器并同步 locale 后已恢复轻量静态服务。默认 Electron 启动遇 GPU 子进程失败，本次临时 `--disable-gpu` 启动后出现窗口和连接页加载日志，但两次 Computer Use 截图超时。后续主页面日志出现旧批次也有的 Milkdown headingIdGenerator 错误；尚未稳定复现，未修复。用户随后人工确认当前窗口能正常显示和输入；该反馈单独作为当前显示 / 输入可用证据，不代表日志错误已修复或新功能验收完成。真实引擎、1280×720 / 1920×1080 人工视觉和生产包验收仍未完成。以下数字均保留为此前阶段记录。

日期：2026-11-02。实施范围、批次定义与固定参考 SHA 见 [增量计划](MEMFIT_INCREMENTAL_UPDATE_PLAN.md)。

**2026-11-03 提交整理复核：38 个文件 / 226 条完整回归通过，主渲染 `tsc --noEmit` 退出码 0。** 在此前 219 条范围加入 `app/main/__test__/auxWindowManager.test.js` 的 7 条，提交前 Prettier 格式化完成后执行。报告 `.codex-run/memfit-commit-verified-20261103.json`，日志 `.codex-run/memfit-commit-verified.log`、`.codex-run/memfit-commit-tsc.log`。代码提交 `3f1ae975f`；日志窗口另通过真实 Electron 打开、终端挂载、推送和截图验证，见 [修复记录](changes/2026-11-02-chat-log-window.md)。下方 219 / 215 条保留为阶段历史。

**最终追加结果：新对话默认 Plan 修正新增 4 条回归，37 文件 / 219 条通过；主渲染 `tsc --noEmit` 通过。** 检查默认勾选、手动取消、新实例默认、缺省参数、显式 false 和历史 false 恢复；未更改历史恢复策略。报告 `.codex-run/memfit-handoff-20261102.json`，日志 `.codex-run/memfit-handoff-regression.log`、`.codex-run/plan-default-tsc.log`。验收页面最终生成情况及新窗口入口见 [最终交接](HANDOFF-2026-11-02-NEXT-CHAT.md)。以下 215 条是此前三单元的阶段记录。

最新结果：B2-A / B2-B / B3-A 新增 79 条用例，整批回归 **37 个文件 / 215 条通过**；主渲染 `tsc --noEmit` 与开发 webpack 编译通过（7 条警告）。未重打生产安装包。真实 Goal 执行及新界面的人工验收待完成。详见 [本批记录](changes/2026-11-02-b2-goal-b3-task-board.md)。

报告 `.codex-run/memfit-b2b3-verified-20261102.json`。在 B1-B 范围追加 `aiRunModeSelect/__test__`、任务详情及看板的 `__test__`、`digitalEmployee/__test__/DigitalEmployeeTaskProgress.test.tsx`、`hooks/__test__/taskBoardStream.test.ts`、`app/main/__test__/aiGoalStrategyProto.test.js` 可复现；类型检查独立执行，验收开发编译采用显式外部类型检查选项，生产检查保留。

## 1. 测试分层

| 层次 | 验证内容 | 边界 |
| --- | --- | --- |
| 单元与组件 | 参数、资源、角色、事件处理、状态转换、可操作 UI | 依赖可 mock；不能证明真实引擎或视觉布局 |
| 客户端集成 | 选中 Forge → 启动 / 发送 → 状态更新，IPC / gRPC 生命周期和持久化 | 尽量只 mock 边界，不 mock 要验证的控制器与适配函数 |
| 实际引擎 | 指定官方版本的协议、任务和错误路径 | 必须记录版本与真实结果；未连接则标记未验收 |
| 视觉与交互 | AI Senso 整体风格、预期布局调整、响应式和键盘操作 | 固定对照条件，核实有意变化与意外回归；不要求像素或控件位置不变，不能由文本快照替代 |
| 交付检查 | 渲染构建、主进程资产、安装包启动 | 由变更范围触发；包启动通过不等于业务验收 |

使用现有 Vitest / Testing Library / 项目构建检查，不引入新的测试框架。参考仓库的既有测试作为迁入依据，按本项目依赖与业务差异适配；整体风格保持一致，具体布局、局部样式和交互可以按功能调整。测试主要保护业务行为与可用性；有意改变默认视图或交互时，同步更新对应期望和验收说明。

## 2. 本轮新增保护测试

`app/renderer/src/main/src/pages/digitalEmployee/__test__/DigitalEmployeeContext.test.tsx` 新增 5 条实际行为测试：

1. Forge 超过一页时加载后续页，重叠 ID 去重，默认项按 ID 而非服务端返回顺序决定，并保持角色隔离。
2. 展示名相同也按真实 ForgeName 恢复历史角色与智能体；未知、未分配或跨角色替换不能破坏当前选择；相同恢复不重复重建输入。
3. 刷新后所选 Forge 改属另一角色时，当前角色回退到有效默认项，不自动跳角色。
4. 新刷新完成后，旧请求迟到成功不能覆盖当前列表。
5. 新刷新完成后，旧请求迟到失败不能清空当前列表或显示过期错误。

`DigitalEmployeeChatWelcome.test.tsx` 新增 1 条：无智能体时，即使输入编辑器触发快捷键提交回调，父级仍阻止发送；引擎恢复并重试后，快捷键携带正确锁定 Forge 标签提交。

另为既有 `DigitalEmployeeSelectPage.test.tsx` 补显式 `cleanup()`，防止同进程运行其他组件测试后依赖不稳定的自动清理，导致页面残留和重复按钮。业务源码、样式和布局均未修改。

## 3. B0 自动基线验证结果（此前阶段）

以下为实施 B1-A 之前的基线结果，保留追溯；B1-A 当前结果见第 4 节。未来矩阵不表示对应功能已实现或测试已执行。

| 检查 | 结果 |
| --- | --- |
| 数字员工及关联客户端 / 授权定向回归 | 15 个文件、61 条测试通过，退出码 0；其中新增保护测试 6 条 |
| 主渲染 TypeScript | `tsc --noEmit` 通过，退出码 0 |
| 文档本地链接、来源路径、格式 | 5 个入口文档的 23 个本地链接、18 个具名测试来源检查通过；新增 / 调整测试与两份方案文档 Prettier 检查通过，`git diff --check` 通过 |
| 实际官方引擎 / 授权联调 | 未执行，本轮未迁功能 |
| 运行截图和像素 / 布局对比 | 未执行，B0 视觉基线仍待建立 |
| 生产渲染构建 / 多平台安装包 | 未执行，本轮未改业务代码和构建配置 |

自动回归范围：数字员工 7 个文件，加 Forge 角色筛选、历史来源、ReAct 完成标记展示、主进程授权 / sender / 文件能力 / 引擎安装、启动页授权。JSON 运行结果保存于本地 `.codex-run/memfit-incremental-baseline-20261102.json`，不作为待提交文件。

首轮试跑纠正了新增测试中的恢复场景设定和异步等待，并发现上述既有测试清理问题；修正后完整重跑得到 61 / 61 通过。未通过放宽业务断言掩盖失败，也未修改业务实现。

测试运行保留旧 Testing Library 的 ReactDOM.render 兼容警告和 Vite CJS API 弃用提示；本轮不因此升级全局依赖。它们与真实页面的视觉验收是不同事项。

## 4. B1-A 本轮实现验证

变更说明见 [B1-A 记录](changes/2026-11-02-b1a-runtime-context.md)。新增字节边界、设置序列化、缓存兼容、实际设置表单、会话启动、定时任务 API / 表单和 protobuf 请求测试；同时复跑既有定制与授权保护用例。

| 检查 | 当前状态 |
| --- | --- |
| B1-A 定向测试与既有保护回归 | 23 个文件、105 条测试全部通过；其中 B1-A 新增 44 条 |
| 主渲染 TypeScript | 最终代码 `tsc --noEmit` 通过，退出码 0 |
| 两套 Memfit 渲染端生产构建 | `yarn build-renders-memfit` 通过；最终代码另执行 `yarn build-render-memfit` 复核通过，均退出码 0 |
| 新版官方引擎联调 | 未执行；本机默认目录二进制为 `1.4.8-beta1`，仓库二进制为 `dev` |
| 实机视觉 / 多平台安装包 | 未执行 |

本批已覆盖的关键断言：UI KB 只转换一次；历史字节值原样发送；gRPC 数字字符串安全规范化；废弃字段从请求和缓存清除；显式 0 保留；Forge / Strategy 和其他有效参数保留；定时任务仅重命名不改变阈值或时区；protobuf 使用官方字段号 51；错误仍返回失败。

另外覆盖旧历史完全缺少新字段时的重启路径：不会从 UI 默认值泄漏出“300 字节”，而是明确交给引擎默认值处理。最终 JSON 报告：本地 `.codex-run/memfit-b1a-verified-20261102.json`。第 7 节基线命令后追加以下目录 / 文件即可复现本批完整回归：

```text
app/renderer/src/main/src/pages/ai-re-act/hooks/__test__
app/renderer/src/main/src/pages/ai-agent/utils/__test__
app/renderer/src/main/src/pages/ai-agent/aiScheduledTasks/__test__
app/renderer/src/main/src/pages/ai-agent/aiScheduledTasks/scheduledTasksForm/__test__
app/renderer/src/main/src/pages/ai-agent/AIChatSetting/__test__
app/main/__test__/aiRuntimeContextProto.test.js
```

测试的 Electron / bridge、样式动画及媒体查询适配只用于 jsdom 环境，不改变应用运行时桥接或生产样式。会话测试仅替换磁盘准备边界，实际执行注册与 IPC 启动链路。

生产构建保留工具链 / 样式及包体警告，不将带警告构建写成零警告。日志保存在本地 `.codex-run/memfit-b1a-render-build-20261102.log` 与 `.codex-run/memfit-b1a-main-build-final-20261102.log`。最终主端本机编译约 923 秒；后续验证注意内存占用，避免同时重复启动多个大型构建。未打安装包，也未启动应用验证旧 / 新引擎实际行为。

## 5. 每批必须补的测试与参考用例

### B1-B 已完成验证（2026-11-02）

详见 [B1-B 记录](changes/2026-11-02-b1b-runtime-context-hotpatch.md)。新增 30 条用例；连同启动 IPC 修复、B1-A 和定制保护测试，合计 **27 个文件 / 136 条通过**。覆盖运行会话 / 新会话显示来源、KB 刻度只换算一次、断连 / 历史恢复拒绝、当前会话隔离、部分历史参数合并、Forge 保留、hook 透传 boolean，以及真实 protobuf 热补丁序列化。主渲染 TypeScript 检查通过。

报告 `.codex-run/memfit-b1b-verified-20261102.json`。复现时在 B1-A 命令范围追加 `aiReActTaskChat/__test__`、`historyChat/__test__/sessionUpdates.test.ts`、`app/main/__test__/engineLinkIPC.test.js`。本批未重打安装包；真实热更新生效和视觉验收待人工完成。用户已明确引擎由同事维护，按最新版前提开发，不在本批升级引擎。

下表参考路径相对 `D:\qianduan\cankaodeYAKIT\_memfit\app\renderer\src\main\src\`；当前新增用例位置按本项目相邻 `__test__/` 约定。B1、B2-A / B2-B、B3-A 已实施，结果见上方最新摘要；其他单元为后续测试要求，不能按计划中的条目宣称通过。

| 批次 | 正向与异常测试要求 | 可复用的参考用例 / 范围 |
| --- | --- | --- |
| B0 | 上述 6 条新增用例；现有角色、默认标签、导航、授权回归；两种尺寸视觉基线 | 本项目 `pages/digitalEmployee/__test__/`、`pages/aiForge/__test__/` 与主进程 / 启动页已有测试 |
| B1-A | 默认值与用户值区分、KB → 字节一次换算、旧字段移除、零值 / 负值 / 数字字符串、旧缓存恢复、定时任务保存参数 | `pages/ai-re-act/hooks/__test__/grpcApi.runtimeContextLimit.test.ts`、`pages/ai-agent/utils/__test__/formatAIAgentSetting.test.ts` |
| B1-B | 只热更新当前会话、回执 / 失败、未连会话不乱发、配置刷新不覆盖刚编辑值 | `pages/ai-agent/__test__/AIAgent.settingBroadcast.test.tsx` 及输入设置测试 |
| B2-A/B | 迭代 / 时长 / 验收条件互斥与关闭清理；Plan / Multi-Agent 保留；首问与历史恢复一致；运行中限制；锁定 Forge 标签保留 | `pages/ai-agent/aiRunModeSelect/__test__/useAIRunMode.test.ts`、`AIRunModeSelect.test.tsx`；新参数序列化用例随批补 |
| B2-C | `/` 过滤、Esc、Enter、中文输入组合、已有正文不误删、标签重新打开、默认 Forge mention 不丢失 | `pages/ai-agent/components/aiMilkdownInput/aiMilkdownModeSlash/__test__/` 和 `store/__test__/`；需补 AI Senso 编辑器交叉回归 |
| B3-A | 空任务、已完成 / 跳过 / 删除、只读看板、实时更新、列表与看板切换、设计选定的默认视图、角色工作区核心能力 | `pages/ai-agent/chatTemplate/aiTaskExecutionDetails/aiTaskBoard/__test__/AITaskBoard.test.tsx`，以及本项目 `taskProgress.test.ts` |
| B3-B/C/D | 起止时间缺失、秒 / 毫秒、执行中跨度、零时长；筛选与排序一致；切换任务及新推送不串数据；列表 / 看板 / 甘特图统计一致 | `.../aiTaskExecutionDetails/aiTaskGantt/__test__/AITaskGantt.test.tsx`、`ganttUtils.test.tsx`；排序与数字员工区集成测试随批补 |
| B4-A | 首问恰好一次、后端正式 ID 绑定、pending 期间切换页面 / 角色、附加资源保留、迟到回复不串页 | `pages/ai-re-act/hooks/__test__/useStartAIChat.test.tsx`、`useChatIPC.test.tsx`、`ChatMultiSessionController.newSession.test.ts`；本地 Forge 适配集成另补 |
| B4-B/C | 取消后迟到数据、失败 / 超时 / 重试、重复重连、旧连接回包、流终止、分页历史失败、IDB 失败、删除后不恢复、关闭与并发限额 | 同目录 `ChatMultiSessionController.reconnect.test.ts`、`concurrency.test.ts`、`pageIndex.test.ts`、持久化 / 历史相关已有用例 |
| B5-A/B/C | 同步回执早于数据、可用技能分页 / 搜索、详情失败 / 缓存失效、重复加载、加载后分类更新、换会话清理、不修改角色 Tag / 默认 Forge | `pages/ai-re-act/aiRightPanel/__test__/AISkillLoadingPane.test.tsx`、`AISkillList.test.tsx`、`AISkillListItem.test.tsx`、`hooks/__test__/useSyncLoadingState.test.tsx` |
| B6-A | 已选 / 全选 / 跨页选中与搜索范围、空选择禁止导出、导入成功刷新、损坏文件 / 失败 / 取消、文件授权 | `pages/aiTool/__test__/AITool.test.tsx`、`pages/ai-agent/forgeName/__test__/ForgeName.test.tsx`；本地文件能力回归 |
| B6-B/C | 目录 / 当前打开范围、大小写与匹配模式、无权限 / 无结果 / 错误、搜索取消与乱序、命中行定位 / 高亮、过大文件、换会话不串预览 | `components/FileTreeContentSearch/hooks/__test__/useFileContentSearch.test.ts`、`components/FileTreeContentSearch/__test__/revealSearchHit.test.ts`、`pages/ai-agent/aiChatWelcome/FileTreeList/FileTreeSearchView/__test__/FileTreeSearchView.test.tsx` |
| B6-D | MCP 无配置、连接失败、工具加载中 / 空列表、调用结束刷新、历史详情失败和重试 | `pages/ai-agent/aiMCP/__test__/AIMCP.test.tsx`、`AIMCPForm.test.tsx`；调用历史新增接口边界另补 |
| B7-A/B | 两会话消息 / 角色 / 默认 Forge 隔离、后台流继续、页签关闭范围、重启恢复、失效历史不复活、默认初始化不覆盖快捷导航 | 官方 `pages/layout/mainOperatorContent/__test__/`、AI 工作区与会话控制器测试；本项目六快捷入口与员工切换交叉测试必须保留 |
| B7-C | 定时任务立即执行仅打开对应新会话、推送先到 / 超时、双击去重、关联历史、时区 / 周期和旧 Payload 参数保留 | `pages/ai-agent/aiScheduledTasks/__test__/waitForAISessionPush.test.ts` 及列表 / 表单测试 |
| B8-A/B/C | provider 配置往返、原 API 类型和凭证保留、全局与会话设置边界、探测不支持 / 超时、迟到响应不覆盖新模型 | `components/configNetwork/__test__/NewAIThirdPartyApplicationConfig.test.tsx`、`pages/ai-agent/aiModelList/aiModelForm/__test__/providerConfig.test.ts`、`pages/ai-re-act/aiReasoningEffortSelect/__test__/` |
| B8-D | 正常 Dump 复制、空内容、剪贴板失败、刷新失败保留旧值、会话切换清缓存 | `pages/ai-re-act/aiRightPanel/__test__/TimelineDumpButton.test.tsx`、`TimelineDumpButton.loading.test.tsx`、`hooks/__test__/ChatMultiSessionController.timelineDump.test.ts` |
| B9 | 批准 / 拒绝配对、离线、选中实例引用、恢复历史、插件缺失、原生服务失败、权限和平台差异 | `pages/ai-agent/browserInstances/__test__/`、`pages/ai-re-act/hooks/__test__/browserHandoffHandler.test.ts`、参考根 `app/main/__test__/ytrayControl.test.js` 与 `managedBrowserProfiles.test.js` |

`.../aiTaskExecutionDetails/` 为 `pages/ai-agent/chatTemplate/aiTaskExecutionDetails/`。参考用例需要迁入适配，不能在本项目不存在对应实现时提前计为通过。

## 6. 实际运行和 UI 检查清单

所有影响聊天的批次均验证：有效授权启动 → 选择数字员工 → 默认智能体 → 带 Forge / 工具 / 知识库的真实提问 → 流式输出 → 取消或完成 → 打开历史。若改到导航，额外逐一验证六个快捷入口。

UI 对照固定：数字员工选择页、欢迎页、已有会话、任务区、广场；1280×720 与 1920×1080；同主题、缩放、角色与数据。检查品牌、配色和组件风格一致，以及调整后的布局、卡片比例、输入区、面板滚动、长名称截断、键盘焦点和弹层可用性。逐批注明布局与样式的预期变化，确认没有遮挡、溢出或功能丢失；截图用于评估变化，不要求与旧版完全相同。

涉及多会话时另验不同角色 A / B 同时运行、后台消息抵达、关闭和恢复；涉及文件时另验系统选择框权限和超大 / 不存在文件；涉及浏览器时必须具备真实扩展 / YTray 环境。

## 7. 可复现命令

从本项目根目录运行，不使用参考版 Vite / Vitest 配置替代当前配置：

```powershell
node node_modules/vitest/vitest.mjs run app/renderer/src/main/src/pages/digitalEmployee/__test__ app/renderer/src/main/src/pages/aiForge/__test__/marketplaceRoleFilter.test.ts app/renderer/src/main/src/pages/ai-agent/historyChat/__test__/source.test.ts app/renderer/src/main/src/pages/ai-re-act/aiReActChatContents/__test__/displayPolicy.test.ts app/main/__test__/memfitLicense.test.js app/main/__test__/security.test.js app/main/__test__/fileAccessPolicy.test.js app/main/__test__/yakEngineInstaller.test.js app/renderer/engine-link-startup/src/pages/StartupPage/components/MemfitLicenseGate/__test__/MemfitLicenseGate.test.tsx --threads=false --reporter=default

node --max-old-space-size=8192 app/renderer/src/main/node_modules/typescript/bin/tsc -p app/renderer/src/main/tsconfig.json --noEmit
```

按本次改动需要补定向命令即可，功能实现时再运行对应官方测试的适配版本；检查通过后不无理由反复执行。


## 2026-11-04 第二批七项自动结果

| 检查 | 实际结果 |
| --- | --- |
| 本批 + 前批 + 定制保护回归 | 68 文件 / 479 条通过，新增 80 条；`.codex-run/memfit-batch2-20261104.json` |
| 会话稳定性 | 首问 / 参数捕获 / token 身份 / 失败取消 / 旧事件 / 缓存保留 / 收尾与删除 / 事务提交失败和重开覆盖 |
| 技能 | 真实数据与回执分离 / 搜索分页去重 / 详情文本 / 会话隔离 / 加载确认与超时 / 无紧密轮询覆盖 |
| MCP | 工具加载 / 错误 / 空态 / 旧服务器响应 / 历史筛选详情 / IPC 信任 / 官方 proto 往返覆盖 |
| 主渲染 TypeScript | 独立 `tsc --noEmit`，退出码 0 |
| 静态编译与启动显示 | webpack 7 条警告，无错误；静态资源与九份 locale 验证；客户端自动启动被审批拒绝，实际显示待用户确认 |
| 真实引擎 / 人工验收 | 待用户按测试指南集中确认，自动通过不等同于实机通过 |

固定参考、差异及保留项见 [本批记录](changes/2026-11-04-batch2-sessions-skills-mcp.md)。


## 第三批最终验证（2026-11-05）

85 文件、558 条通过、1 条 Windows 符号链接用例跳过；独立 tsc 和单次 webpack 通过。当前运行窗口未更新，真实环境与视觉未验收。

| 范围 | 主要回归 |
| --- | --- |
| B2-C | modeSlashQuery、Enter guard、真实 ProseMirror 文档中保留锁定 Forge 与前文、中文组合输入 Enter、热补丁拒绝、按卡片重开、弹层所有权隔离 |
| B7-A/B | AIAgentWorkbench：草稿与挂载保留、历史去重、失效记录剔除、缓存读取 / 写入失败、删除筛选、后台导航隔离；原 Controller 页归属 / 取消 / 重连保护；上下文参数单位恢复 |
| B7-C | runScheduleSession：推送先到、请求去重、续跑精确 ID、缺失推送、无关 / 多候选不选取、失败清理与重试 |
| B9-A/B | browserExtensionClient / browserProtocolValidation / browserTransformContract，browserInstanceStore / BrowserInstancesPanel，browserHandoffHandler / AIBrowserHandoffCard；消息落盘剔除图像、慢预览与断开 / 乱序处理 |
| B9-C / IPC | ytrayControl、managedBrowserProfiles、browserExtension IPC 信任 / token / renderer 隔离与关闭清理；proto 全量解析继续通过 |

最新完整清单 `.codex-run/batch3-test-files.json`，报告 `.codex-run/memfit-batch3-20261105.json`。19 个静态入口资源和九份 locale 独立核对；没有使用 HTTP 200 代替显示验收。
