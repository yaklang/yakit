# 固定参考核心功能复核（2026-11-05）

**后续状态：本报告列出的六组差异已按用户授权补迁，新版已启动且用户确认浏览器位置。本文下方为原始核对结果，当前状态见 [最终检查](2026-11-06-final-review-and-github.md)。**

## 结论与范围

按代码接线核对，既定 B1–B9 共 29 个子项均已有本地实现，主要 AI 工作链路已迁入或作本地适配。但 **29/29 指既定清单的代码实施完成，不代表参考快照全部功能一比一齐全，也不代表真实环境全部验收通过**。本次扩大到清单外的 AI 页面差异后，发现任务队列新动作等尚未迁入的增强。

固定参考：`D:/qianduan/cankaodeYAKIT/_memfit`，本次核实 SHA 为 `9fc639fbb677eaa538132b2afa749555b3b14791`，工作树干净。本地 HEAD 为此前备份提交 `8cb79ea04`，后续工作区改动属于本次核对对象。本次只读核对业务代码，仅新增本报告；没有操作客户端、重启服务、编译、改引擎、升级依赖、提交或推送。

核对方式：检查 AI Agent / ReAct / browserExtension 页面模块差异，对照实际入口、状态处理、请求构造、原生 IPC 和协议；文件名不同的模块继续查找本地替代实现，未以“缺同名文件”直接认定功能缺失。本次不是引擎行为审计，也不是参考仓库全部安全工具的穷尽核对。

## 既定清单的接线结果

下表路径均相对 `app/renderer/src/main/src/`，原生路径另标明。

| 范围 | 已有能力 | 本地关键实现 / 接线 |
| --- | --- | --- |
| B1，2 项 | 运行时上下文阈值、缓存迁移、运行中调整 | `pages/ai-agent/utils/index.ts`、`useContext/useRuntimeContextSizeLimit.ts`；ReAct 启动参数、热补丁和 proto |
| B2，3 项 | Goal 持续时间、验收条件、`/` 模式入口和标签重开 | `pages/ai-agent/aiRunModeSelect/`、`components/aiMilkdownInput/aiMilkdownModeSlash/`；策略规范化与请求序列化 |
| B3，4 项 | 列表 / 看板 / 甘特图、状态筛选排序、同会话任务切换 | `pages/ai-agent/chatTemplate/aiTaskExecutionDetails/AITaskExecutionDetails.tsx` 及子组件，实际渲染已引用 |
| B4，3 项 | 首问 pending、连接 token 与业务 ID 分离、取消重连、持久化和删除竞态保护 | `pages/ai-re-act/hooks/ChatMultiSessionController.ts`、`sessionLifecycle.ts`、持久化层和启动 IPC；保留旧历史，不照搬清空表行为 |
| B5，3 项 | 会话技能的已加载 / 可用、搜索分页、文档详情、加载后确认 | `pages/ai-re-act/sessionSkills/SessionSkills.tsx`，由 `AIChatContent.tsx` 接入；controller 同步、`grpcStreamHandler/aiTaskDetail.ts` 更新会话数据 |
| B6，4 项 | 工具导入导出 / 批量、文件内容搜索、多文件预览、MCP 状态与调用历史 | `forgeName/ForgeName.tsx` 的工具分支；`FileTreeContentSearch/`；`FileTreeSystem.tsx`、`useFilePreviewTabs.ts`；`aiMCP/`、`aiMCPHistory/` |
| B7，3 项 | 独立会话页签、正式历史去重恢复和标题同步、定时任务运行后定位 | `pages/ai-agent/sessionTabs/`、历史入口、`aiScheduledTasks/runScheduleSession.ts`；每页签独立数字员工 provider 和页面 ID |
| B8，4 项 | Yak 脚本模型提供方、单模型模式、推理强度 / 探测、时间线 Dump | `components/configNetwork/YakScriptModelFields.tsx`、模型配置和 `reasoningEffort.ts`、`chatTemplate/TimelineCard/TimelineDumpButton.tsx`；请求保留 SingleModelMode |
| B9，3 项 | 浏览器桥接配对、实例状态 / 引用 / 接管卡片、YTray 历史恢复 | `pages/browserExtension/`、`browserInstances/`、`aiBrowserHandoffCard/`，以及 `app/main/handlers/browserExtension.js`、`ytrayControl.js`、`managedBrowserProfiles.js`、preload / IPC 注册 |

辅助交叉检查：本地与参考 `AIStartParams` 都有 44 个直接字段，热补丁枚举都有 11 项，字段 / 成员名称集合相同。同步枚举本地 29 项、参考 30 项，参考独有 `SYNC_TYPE_ADD_TODO`。这只是名称级比较，不证明类型、实现语义或引擎支持完全相同。浏览器客户端、协议校验、transform contract 三个文件及 slash query helper 与固定参考逐字节一致，其余适配模块不能用整文件相等判断。

## 本次发现的未完全对齐部分

### 1. 任务队列“追加待办 / 调整方向”：实质功能差异，优先补齐

参考 `pages/ai-agent/components/aiTaskQuery/AITaskQuery.tsx` 提供两个动作：先从排队列表移除输入，再分别发 `add_todo_sync`（`text`、`set_current:false`）或 `user_intervention`，并刷新队列；相关同步回执用于发送状态。

本地同文件目前提供插队 `react_jump_queue` 和删除，缺少追加待办枚举、请求与按钮。这不在原 29 项中，不能继续用“29/29”掩盖此差异。插队与调整当前执行方向的语义不同。

### 2. 任务详情的 Skill 专用视图：会话技能已迁，任务维度增强未齐

参考 `chatTemplate/aiTaskExecutionDetails/aiTaskSkillList/AITaskSkillList.tsx` 单独区分技能“已加载 / 可用”，并提供排序、详情能力。参考 `AITaskExecutionDetails.tsx` 已调用该组件。

本地任务详情仍将 skills 与 forges 合并进旧卡片，按“固定 / 动态”分类；没有该专用加载状态筛选和相同详情交互。本地独立 `SessionSkills` 的同步、搜索、详情、加载能力已接入，不能将此差异描述为“技能功能整体未迁”。

### 3. 子 Agent 统一任务汇总：旧入口仍可用

参考 `historyTaskTree/TaskListPane.tsx`、`SubAgentList.tsx`、`useHasTaskTree.ts` 将子 Agent 与任务树统一展示，并随任务版本更新。

本地保留 `AIReActChatHeader.tsx` 的“子Agent任务”浮层与聊天定位，也保留任务树及子任务消息。缺的是参考新版的统一列表 / 状态展示，不是 Multi-Agent 执行能力或全部子任务入口。

### 4. 实际模型维度的消耗统计：诊断展示未齐

参考 `AIContextToken/AIMainModelTokens.tsx`、`AITokens.tsx` 使用 `tier_model_consumption` 按运行时模型 / 推理级别展示；本地仍采用已有层级统计和配置模型展示。本地 `grpcApi.ts` 尚无该模型级统计字段。模型配置及推理强度设置已实施，但这不等于运行时消耗展示完全对齐。

### 5. 推荐场景多选 / 编辑与 @ 聚合搜索：参考交互未完整迁入

参考欢迎页通过 `GetAIReActRecommendedSkills` 查询推荐场景，支持选择、编辑、重置及选择缓存；提交时附加 `enabledCapabilities`。本地保留数字员工 / Forge 的欢迎流程，没有此完整推荐场景路径。不能把已有接口类型声明当成页面已接入。

参考 `aiChatMention/allListOfMention/` 和 `aiChatMentionTabs/` 提供统一分类 / 聚合搜索；本地保留原 mention 与独立浏览器引用入口，未迁入这套完整选择 UI。这两项应先评估如何与数字员工默认 Forge 共存，不能整页覆盖。

### 6. 浏览器缩略图和安装引导：外围体验未齐

参考 `browserInstances/BrowserInstancesPanel.tsx` 展示缩略图 / 悬浮预览，并引用 `BrowserInstancesGuideEmpty/` 的安装指引。本地较小面板已接实例文本信息、配对、准确设备引用、定位、历史恢复，但不渲染同等缩略图和图文引导。managed profile 只读列表是明确边界，不宣称已做浏览器 Profile 的创建 / 删除 / 启动管理。

## 有意适配与协议限制

- 会话页签置于数字员工工作区内部；参考使用全局 `MainOperatorContent`。这是架构适配，保留本地主导航、每页签员工 / Forge 归属。正式会话恢复已接；未发送草稿只在当前挂载页签保留，不持久化到应用退出后。
- 文件 / HTTP / 漏洞工作区沿用本地布局，已有搜索和多文件预览；未复制参考整套 `AIChatWorkspace` 布局。不能把缺该目录认定为这些业务入口整体缺失。
- 定时任务 RPC 返回 Empty，推送没有任务 UUID / 执行关联 ID。本地按正式历史唯一候选匹配，歧义 / 长队列时提示无法定位；参考直接取推送或最新会话的兜底不适合原样复制。任务执行与自动准确定位须分别验收。
- 保留品牌、数字员工、Forge、附件、历史、授权和文件权限。全局 React / AntD / 构建框架升级、完整 MITM / Web Fuzzer 浏览器明文网关等未列入本轮迁入范围。

## 验证证据与后续入口

本次未重新跑测试或构建，以免干扰用户正在测试的客户端。读取 `.codex-run/memfit-batch3-20261105.json` 的逐条 assertionResults，既有结果为 **85 个文件、558 条通过、1 条跳过**；白屏修复另外有 4 条聚焦回归。此前主渲染类型检查和修复后静态构建成功。以上是已有自动验证记录，不是本次新跑的结果。

用户已确认白屏修复后正常显示，并反馈目前问题不大；尚无足够记录将全部真实引擎、技能 / MCP、扩展 / YTray 及定时任务边界统一标记为验收通过。

现有功能逐按钮测试入口见 [人工测试指南](../MEMFIT_MANUAL_TEST_GUIDE.md)。建议后续优先补清单外的队列追加待办 / 调整方向，其次任务 Skill 状态视图及子 Agent 汇总，再评估统计与引导体验。本报告不自动扩大编码范围。
