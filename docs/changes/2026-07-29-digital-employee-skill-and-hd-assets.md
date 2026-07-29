# 2026-07-29 数字员工默认技能与高清人物

## 目标

让数字员工复用原版 AI Agent 的多资源发送逻辑，并替换低清人物素材。

## 修改

- 员工 Forge 作为默认 `aiforge` 附件，与用户文本和额外资源共同发送。
- 默认技能覆盖首次提问和后续消息，且不会重复添加同名技能。
- 欢迎页输入框上方显示默认技能状态。
- 八名员工改用新生成的高清透明 PNG。
- 选择页改为 CSS 响应式布局，不再使用固定 1280×720 脚本缩放。

## 关键文件

- `pages/digitalEmployee/resolver.ts`
- `ai-re-act/aiReActChat/AIReActChat.tsx`
- `ai-agent/aiChatWelcome/AIChatWelcome.tsx`
- `pages/digitalEmployee/config.ts`
- `pages/digitalEmployee/DigitalEmployeeSelectPage.module.scss`

## 回退

- 移除 `applyDigitalEmployeeSkillToInputEvent` 包装可恢复原请求行为。
- 移除欢迎页默认技能 DOM 和样式可恢复原界面。
- 把 `config.ts` 的八个 portrait import 改回 `portrait-transparent.png` 可恢复原人物。

## 验证

- 需要通过数字员工相关 Vitest、TypeScript 检查，并在运行窗口检查选择、进入和发送。
