# 2026-07-30 数字员工交互与布局微调

## 目标

统一项目品牌，优化选择卡片和员工介绍栏，并保持原版 AI Agent 输入逻辑。

## 修改

- 选择页与员工介绍栏统一使用软件设置页同源的 `memfitHasName.jpg` 正式 Logo。
- 页面中的临时 “AI SenSo” 品牌文字统一调整为 “AI SenPike”。
- 点击任意员工卡片会直接完成选择并进入 AI Agent；底部确认按钮继续保留。
- 卡片选中边框改为卡片内部绘制，缩小编号与标题字号，重新调整标题、说明和进入按钮的垂直间距。
- 员工介绍栏高度改为随窗口高度增长，头像、Logo、标题和技能标签同步放大。
- 欢迎页技能点改为只读能力标签，点击不再向输入框写入预设文字。
- 移除欢迎页额外的“默认技能”展示条，保留原版输入框的 `@`、资源标签、附件选择和提交逻辑。

## 逻辑边界

- 员工默认技能的请求注入保持不变。
- 未修改 `AIChatTextarea`、mention 解析、资源标签解析、Chat IPC 或模型请求协议。
- 卡片直接进入复用既有 `switchEmployee`，没有新增路由或状态协议。

## 关键文件

- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeSelectPage.tsx`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeSelectPage.module.scss`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeWorkspace.tsx`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeWorkspace.module.scss`
- `app/renderer/src/main/src/pages/ai-agent/aiChatWelcome/AIChatWelcome.tsx`
- `app/renderer/src/main/src/pages/ai-agent/aiChatWelcome/AIChatWelcome.module.scss`

## 验证

- TypeScript 检查通过。
- 数字员工相关 2 个测试文件、7 个测试全部通过。
- 开发前端 `http://127.0.0.1:2800` 返回 200。
- Electron 已通过 `YAKIT_DEV_RENDERER_URL` 连接现有 2800 热更新服务运行。
