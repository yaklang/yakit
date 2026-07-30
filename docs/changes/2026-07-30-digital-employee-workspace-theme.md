# 数字员工工作区与顶部导航主题优化

日期：2026-07-30

## 目标

- 提升选择页选中状态的视觉层次，不再只使用普通蓝色边框。
- 放大 AI Agent 顶部员工信息区，并简化欢迎引导与输入框布局。
- 将原版灰白标题栏、主菜单栏和页面标签栏调整为 AI SenPike 浅蓝主题。

## 实现

- 选择卡片：选中态使用蓝青渐变遮罩描边、双层柔光、冰蓝卡面、主题渐变进入按钮，并增加真实状态文案“当前选择”；hover 只显示弱描边。
- 员工信息区：高度调整为 `clamp(132px, 14.5vh, 168px)`，Logo、头像、标题、说明、技能标签和装饰圆环同步放大；低于 720px 高度时自动压缩。
- 欢迎区：从纵向居中大留白改为左侧任务引导、右侧 2×2 技能入口、下方 940px 上限宽输入框；1060px 以下切为单列，720px 以下进一步压缩。
- 顶部导航：分别在 `UILayout`、`HeardMenu`、`MainOperatorContent` 增加 Memfit 条件类，只覆盖背景、边框、文字、hover 和 active 表现，不改菜单数据、标签拖拽、关闭或导航事件。

## 验证

- `yarn tsc --noEmit -p tsconfig.json`：通过。
- 数字员工与消息回显定向测试：4 个文件、13 项通过。
- 选择页测试新增默认选中卡“当前选择”标识断言。
- `git diff --check`：通过。
- `http://127.0.0.1:2800`：返回 200；webpack 显示 `No issues found`，热更新未出现 `Failed to compile` 或 `ERROR in`。

## 白屏恢复记录

- UI 验证完成后，持续运行约 105 分钟的 2800 渲染进程发生 Node 堆内存溢出并退出，导致 Electron 白屏；崩溃日志为 `JavaScript heap out of memory`，不是 React、TypeScript 或 SCSS 编译失败。
- 使用 `NODE_OPTIONS=--max-old-space-size=8192`、`PORT=2800` 重新启动 `start-render-memfit` 后，2800 恢复 HTTP 200，webpack 编译与类型检查通过。
- 重启指向 `http://127.0.0.1:2800` 的 Electron 后，用户已确认页面恢复正常。
- 后续长时间开发建议保留 8GB Node 堆上限；再次白屏时先查端口和进程日志，不要直接改写聊天或 IPC 逻辑。

## 视觉复核说明

Electron 窗口可以被定位和恢复，但 Windows 桌面截图接口仍返回 `SetIsBorderRequired failed (0x80004002)`。下一窗口应直接人工检查：选择卡选中态层级、员工头部尺寸、欢迎区响应式切换，以及顶部三层浅蓝主题是否协调。

## 边界

本轮没有修改 AI Chat 输入组件、mention、IPC、模型请求、员工切换、标签关闭/拖拽和聊天消息逻辑。
