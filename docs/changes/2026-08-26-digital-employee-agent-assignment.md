# 2026-08-26 数字员工角色与智能体一对多

## 目标

将原来的“数字员工等于一个 AI Forge”调整为“固定八个数字员工角色，每个角色可关联多个智能体”。首页左侧只切换数字员工角色，用户进入聊天欢迎页后再选择该角色下的智能体进行对话。

## 数据约定

- 八个数字员工角色固定来自 `digitalEmployee/config.ts`，不再由后端 Forge 数量或返回顺序生成。
- AI Forge 使用保留标签 `senso-role:<role-id>` 保存唯一角色归属，例如 `senso-role:threat-analyst`。
- 保留标签不会显示在能力标签、卡片标签或能力数量中。
- 没有有效角色标签的历史智能体归入“未分配”，不会再按 ID、名称关键词或列表位置猜测角色。
- Memfit 创建和编辑智能体时必须选择一个数字员工角色；保存时会替换旧角色标记，确保一个智能体只属于一个角色。

## 聊天流程

1. 启动选择页始终显示固定八个数字员工角色。
2. 进入 AI Agent 后，左侧仍只显示八个角色。
3. 欢迎页列出当前角色下的全部智能体；没有选中智能体时不渲染输入框。
4. 选择智能体后，输入框恢复原版锁定 Forge mention，首次请求写入真实 `ForgeName`，首次和后续消息继续通过 `AttachedResourceInfo` 兜底并去重。
5. 切换角色会清空当前智能体并创建新会话；打开带 `ForgeName` 的历史会话时会尝试恢复已分配的角色和智能体。

## 智能体广场

- 八个角色分类不再用角色中文名做 Keyword 模糊搜索。
- 当前已发布引擎可以保存并返回 Forge 角色 Tag，但 `AIForgeFilter.Tag` 查询会返回空集；角色页签会分页读取候选智能体，再使用与卡片相同的 `getDigitalEmployeeRoleId` 在前端精确过滤。
- 卡片展示智能体所属角色；未标记的旧智能体显示“未分配角色”。
- `AIForgeFilter.Tag` 的前端类型已与 protobuf 的 `repeated string Tag` 对齐为 `string[]`。

## 主要文件

- `app/renderer/src/main/src/pages/digitalEmployee/roleAssignment.ts`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeContext.tsx`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeWorkspace.tsx`
- `app/renderer/src/main/src/pages/ai-agent/aiChatWelcome/AIChatWelcome.tsx`
- `app/renderer/src/main/src/pages/ai-re-act/aiReActChat/AIReActChat.tsx`
- `app/renderer/src/main/src/pages/aiForge/AIForge.tsx`
- `app/renderer/src/main/src/pages/aiForge/forgeEditor/ForgeEditor.tsx`

## 验证

- 数字员工、角色筛选及消息回显定向测试：7 个文件、17 项测试通过。
- TypeScript `tsc --noEmit` 通过。
- `git diff --check` 通过。
- 测试日志仅有项目既有的 React 18 `ReactDOM.render` 兼容警告。

## 迁移注意

当前已有 Forge 不会被自动猜测归属。上线前需要在智能体广场逐个编辑旧智能体并选择角色，或基于经过业务确认的稳定 `ForgeName` 编写一次性迁移；禁止恢复“前八条 Forge 依次套用八个员工角色”的顺序映射。
