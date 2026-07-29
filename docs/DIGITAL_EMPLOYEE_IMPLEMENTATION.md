# 数字员工实现约定

项目原则：尽量复用原版 AI Agent，只增加轻量的数字员工适配层。

## 原版请求机制

- 用户文本进入首次请求的 `UserQuery` 或后续消息的 `FreeInput`。
- 一个或多个技能、工具、知识库、文件标签由 `mentionList` 转成 `AttachedResourceInfo[]`。
- 技能资源类型是 `aiforge`。原版允许多个资源并保留显示顺序。
- 前端不会把技能提示词硬拼进用户文本；后端根据资源信息加载对应能力后交给模型。

## 数字员工机制

- 数字员工等价于一个预配置的默认 AI Forge 技能，不是单纯头像。
- `config.ts` 保存员工与 `ForgeVerboseName` 的映射。
- 首次会话继续写入真实内部 `ForgeName`，保持 Forge 工作流能力。
- `applyDigitalEmployeeSkillToInputEvent` 在原版资源解析之后，把员工技能放到附件数组首位。
- 首次提问和后续消息都会默认携带员工技能。
- 用户额外选择的多个技能、工具等保持不变；只对相同员工技能去重。
- 欢迎页显示“默认技能 / 随消息发送”标签。

## 修改边界

- 不改变 `getAIReActRequestParams` 的原版多标签解析。
- 不改变 `useChatIPC` 和模型 IPC 协议。
- 普通 AI Agent 分支必须保持原行为。
- `AIReActChat.tsx` 只允许在原请求构建后追加员工资源。

## 素材与回退

- 当前正式人物：`senso-agent-01-portrait-hd.png` 至 `senso-agent-08-portrait-hd.png`。
- 原低清人物继续保留。回退时把 `config.ts` 的 portrait import 改回 `portrait-transparent.png`。

## 界面复用约定

- 员工详情页继续复用 `AIReActChat`、`AITaskContent` 和现有 Chat IPC 上下文。
- 左侧对话区负责原版消息流和输入框，右侧“思考与执行”直接展示原版任务规划与执行详情。
- UI 调整不得复制任务状态、伪造进度或改变事件协议。
- 选择页的边框、按钮和导航底板优先使用 CSS 渐变、边框与阴影，保证任意窗口尺寸下清晰；文字始终保留为 DOM 文本。
- 响应式断点只改变列数与面板排列，不改变选择和发送行为。

## 开发记录

项目已启用 Git。每次改动仍应写明目的、文件、行为变化、验证结果和回退方法，随后形成独立提交。
