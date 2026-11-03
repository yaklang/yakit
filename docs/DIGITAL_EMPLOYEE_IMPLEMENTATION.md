# 数字员工当前实现约定

核对日期：2026-10-30；代码基准 `afc69b034`。总交接见 [HANDOFF.md](HANDOFF.md)，官方核心功能迁入见 [UPSTREAM_SYNC.md](UPSTREAM_SYNC.md)。

本文替代此前的员工 1:1 Forge 和按展示名映射约定。原则是官方引擎跟随最新，官方 Memfit 前端核心实现按需同步，数字员工通过客户端适配接入。

## 1. 数据模型

- `pages/digitalEmployee/config.ts` 定义固定八个角色的 ID、名称、介绍、展示技能、头像和主题色，不保存 Forge 名称映射。
- 一个角色关联零个或多个 `AIForge`，通过官方既有 `AIForge.Tag` 中唯一的有效 `senso-role:<role-id>` 标记归属。
- `roleAssignment.ts` 统一处理角色标签和可见普通标签。角色标签不直接作为普通能力标签展示，也不是授权标记。
- 未带有效角色标签的 Forge 进入“未分配”；不按返回顺序、名称或 ID 常量猜角色。
- `DigitalEmployeeContext.tsx` 分开维护 `selectedEmployee` 与 `selectedAgent`，分页获取 Forge 并按 ID 升序组织。
- 当前角色默认取第一个智能体；列表刷新保留有效手动选择，角色切换或所选项失效时回退。已有会话可用真实 `ForgeName` 恢复角色和智能体。
- 广场与编辑器复用同一标签工具；Memfit 编辑时要求角色。现有 `marketplaceRoleFilter.ts` 分页读取候选集后精确过滤，不能未验证就恢复依赖引擎 Tag 查询的方式。

## 2. 请求与输入适配

用户文本进入首次请求 `UserQuery` 或后续 `FreeInput`；输入编辑器的 `mentionList` 转成 `AttachedResourceInfo[]`，沿官方 AI 会话链路发送。

`digitalEmployee/resolver.ts` 提供三个关键适配：

| 函数 | 当前职责 |
| --- | --- |
| `applyForgeNameToStartParams` | 将所选智能体真实 `ForgeName` 加入启动参数 |
| `getDigitalEmployeeDefaultMention` | 生成所选智能体的 `forge` mention，使用真实 ID / 显示名并锁定 |
| `applyDigitalEmployeeSkillToInputEvent` | 在原资源解析之后兜底附加所选智能体，避免重复 |

- 默认标签必须是真正的编辑器 mention；不能用普通 DOM 仿制后漏掉发送数据。
- `AIChatTextarea` 接收 `defaultMentions`；欢迎页和详情页复用原输入机制。
- 切换智能体时通过 `selectionVersion` 等 key 创建干净输入实例，避免旧锁定标签残留。
- 欢迎页始终显示输入框；没有可用智能体时按钮和快捷键不能发送。搜索只过滤可见列表，不改变当前选择，切角色清空搜索。
- 保持用户附加多个技能、工具、知识库和文件的机制及资源去重；不把技能 Prompt 硬拼入用户文本。
- 当前链路为 `AIReActChat` → `useChatIPC` / `ChatMultiSessionController` → 主进程 `handlers/ai-agent.js` → 官方 `StartAIReAct`。

## 3. 工作区、导航与真实任务数据

- `DigitalEmployeeProvider` / `Gate` 位于 `UILayout` 中，分别负责状态与进入流程；工作区复用官方 AI 主界面和消息组件。
- 六个快捷入口使用原有 `YakitRoute`；选择页先写入 `quickNavigation.ts` 的一次性目标。
- `pages/layout/mainOperatorContent/MainOperatorContent.tsx` 完成默认页初始化后再消费目标，避免跳转被默认 `AI_Agent` 覆盖。不要通过 `setTimeout` 猜测初始化顺序。
- 任务清单使用当前问题的 `rawData.taskDetailsMap.get(questionID)?.todoList`，并订阅 `chatTodoListUpdate` 更新信号；旧 `casualChat.planDetails.todoList` 说法已过期。
- 任务进度、时间和执行状态使用真实引擎事件与会话数据，不另造一套任务状态。
- Plan、深度规划、文件和任务详情应随官方核心同步正确接入数字员工工作区，不按早期精简版记录重新隐藏已恢复功能。
- 响应式布局可以调整列数和面板排列，不应改变角色选择、消息发送或事件消费。

## 4. 品牌与素材

- 显示品牌为 AI Senso，内部产品模式仍为 `memfit`，保持其他产品分支行为。
- 当前八张人物由 `config.ts` 引用 `senso-agent-01-portrait-hd.png` 至 `senso-agent-08-portrait-hd.png`。
- 当前正式 Logo 和选择页素材以组件实际 import 为准，不再按旧约定统一强制替换成白底 `memfitHasName.jpg`。
- 人物和 Logo 资产与文字分离；文本保留 DOM，边框和按钮可使用 CSS / SVG，避免缩放后模糊。
- 用户 2026-11-02 澄清：保持整体视觉风格与品牌辨识度，允许按功能调整页面布局、控件、尺寸、局部样式和交互。现有实现是对照基线，不要求后续像素、面板位置或默认视图保持不变；业务行为按各批范围验证。

## 5. 同步边界

维护数字员工时尽量保持适配集中；同步官方核心时允许更新 `getAIReActRequestParams`、`useChatIPC`、会话状态、IPC 和客户端协议到官方实现，随后恢复本节定义的定制行为。旧文档“不允许改 useChatIPC”等限制不能阻止用户要求的官方同步。

迁入后的验证重点：角色与智能体选择、默认标签、首次与后续消息、切换清理、历史恢复、导航初始化、真实任务更新，以及已有客户端授权 / 权限适配。

记录官方来源、改动范围、保留定制、实际验证结果和未验证项。具体任务未要求时，无需顺带提交、推送、升级引擎或发布安装包。
