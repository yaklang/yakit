# 2026-07-29 数字员工现代化界面

## 目标

提高选择页与员工对话详情页的清晰度和响应式表现，同时保持原版 AI Agent 的消息、任务与工具逻辑不变。

## 修改

- 移除选择页中间的轮播圆点。
- 选择页背景增加同色系多层渐变，并保留原背景素材作为细节底图。
- 普通卡片边框、选中发光、卡片内按钮、快捷导航底板和确认按钮改为 CSS 绘制，避免低分辨率图片缩放模糊。
- 卡片选中与悬停继续使用绝对定位视觉层，卡片尺寸和文字位置不参与状态切换，避免布局跳动。
- 员工详情顶部改为紧凑身份栏，显示品牌、高清头像、当前员工、技能标签与在线状态。
- 员工会话区改为响应式双栏：左侧为原版 `AIReActChat`，右侧为原版 `AITaskContent`。
- 任务尚未开始时右栏显示说明占位；任务开始后由现有任务事件和真实状态自动替换。
- 窄窗口下双栏自动变为上下排列，不影响消息输入和任务详情滚动。

## 逻辑边界

- 未修改模型请求协议、Chat IPC、任务事件结构或工具执行流程。
- 未修改数字员工默认技能注入方式。
- 普通 AI Agent 分支维持原布局与行为。

## 关键文件

- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeSelectPage.tsx`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeSelectPage.module.scss`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeWorkspace.tsx`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeWorkspace.module.scss`
- `app/renderer/src/main/src/pages/ai-agent/aiChatContent/AIChatContent.tsx`
- `app/renderer/src/main/src/pages/ai-agent/aiChatContent/AIChatContent.module.scss`

## 验证

- TypeScript：通过。
- 数字员工单元测试：2 个文件、7 个测试全部通过。
- 开发环境：主界面 `http://127.0.0.1:2800` 返回 200，Electron 窗口继续连接现有热更新服务。

## 回退

- 回退上述六个界面文件即可恢复上一版视觉效果。
- 本次没有数据迁移或接口变更。
