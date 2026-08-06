# AI SenSo 数字员工深度规划面板交接

更新时间：2026-08-05 16:35（Asia/Shanghai）

本文档接续：

- `docs/AI-SenPike-handover-2026-08-05.md`
- `docs/DIGITAL_EMPLOYEE_HANDOFF.md`

## 1. 当前结论

本轮需求已经完成并由用户在运行界面中确认可用：

- 数字员工聊天详情页右侧恢复“深度规划”内容。
- 右侧固定显示“任务清单”和“深度规划”两个标签。
- 不再显示后端动态注入的“数字情报官初始化”等任务详情标签。
- 无任务时，“等待执行步骤”空状态在面板中垂直居中，不再紧贴标签栏。
- 标签栏的背景、间距、圆角、选中态和悬停态已经统一优化。
- 有深度规划内容时，左侧自由对话区会适度收窄，为右侧规划区留出空间。
- 窄屏下改为上下排列，避免左右区域互相挤压。
- 5713 开发端口导致的 Electron 白屏已修复；用户最终反馈“可以了”。

“思考与执行”是右侧整个区域的标题，“任务清单 / 深度规划”是该区域内部的内容切换，不是两套互相竞争的渲染入口，因此不会打架。

## 2. 仓库与 Git 状态

工作区：

```text
D:\360MoveData\Users\Titee_G\Desktop\aiSenPike\yakit-memfit-AISenPike
```

远端：

```text
origin  https://gitee.com/a1543733438/ai-sense.git
```

分支：`master`

截至编写本文档前，功能代码已经推送到 Gitee，`master` 与 `origin/master` 一致：

```text
257ccfd fix: trust configured local dev ports
e45dd08 Add employee task list tab and responsive planning layout
e9d4e67 feat: restore AI agent plan controls
76eac64 修复logo及其他bug
519c91a docs: add AI SenSo handover guide
```

其中：

- `e9d4e67`：恢复 Plan / Focus Mode 入口、Plan 默认开启，并允许覆盖开发环境的连接页 URL。
- `e45dd08`：恢复右侧深度规划，加入任务清单固定标签并完成响应式布局和视觉优化。
- `257ccfd`：允许 Electron 安全信任通过环境变量配置的本地开发端口，解决 5713 页面 IPC 被拒绝造成的白屏。

## 3. 最终界面结构

数字员工聊天详情页布局如下：

```text
┌─────────────────────────────┬──────────────────────┐
│ 左侧：对话                   │ 右侧：思考与执行      │
│                              │ ┌────────┬─────────┐ │
│ 自由对话、消息、输入框        │ │任务清单│深度规划 │ │
│                              │ └────────┴─────────┘ │
└─────────────────────────────┴──────────────────────┘
```

右侧两个标签的数据职责不同：

- “任务清单”：渲染 `DigitalEmployeeTaskProgress`，读取当前会话 `casualChat.planDetails.todoList`，展示任务总数、完成进度和第一步/第二步式执行清单。
- “深度规划”：复用原项目 `AITaskContent` 中的 `AIReActTaskChatContent`，读取 `taskChat.elements` 和 `taskChat.plan.task_tree`，展示规划与执行过程。

两个数据源来自同一会话状态体系，但表现层用途不同，不会重复写入或相互覆盖。

## 4. 关键实现

### 4.1 聊天详情页接入规划面板

文件：

`app/renderer/src/main/src/pages/ai-agent/aiChatContent/AIChatContent.tsx`

关键逻辑：

```tsx
const hasDeepPlanningContent = !!taskChat.elements.length || !!taskChat.plan?.task_tree?.length
```

数字员工分支不再只渲染 `DigitalEmployeeTaskProgress`，而是通过 `AITaskContent` 统一承载两个固定标签：

```tsx
<AITaskContent
  tabBarExtraContent={null}
  emptyNode={null}
  hideTaskDetailTabs
  taskListNode={<DigitalEmployeeTaskProgress />}
/>
```

`hideTaskDetailTabs` 只影响数字员工详情页这个调用点，不改变其他 AI ReAct 页面原有的动态任务详情标签行为。

### 4.2 AITaskContent 扩展

文件：

- `app/renderer/src/main/src/pages/ai-re-act/aiTaskContent/AITaskContent.tsx`
- `app/renderer/src/main/src/pages/ai-re-act/aiTaskContent/type.ts`

新增可选属性：

```ts
hideTaskDetailTabs?: boolean
taskListNode?: ReactNode
```

行为：

- 传入 `taskListNode` 时，在标签列表最前面加入固定“任务清单”。
- `taskContent` 对应固定“深度规划”。
- 开启 `hideTaskDetailTabs` 时，只保留 `taskContent`，忽略动态注入的子任务详情标签。
- “任务清单”和“深度规划”均不可关闭。
- 当深度规划内容到达时，沿用原有逻辑自动切到 `taskContent`；用户手动切换后仍可在两个固定标签之间切换。

### 4.3 响应式布局

文件：

`app/renderer/src/main/src/pages/ai-agent/aiChatContent/AIChatContent.module.scss`

关键规则：

- 默认聊天详情保持原布局。
- 有深度规划内容时增加 `employee-detail-layout-planning`，左右列为：

```scss
grid-template-columns: minmax(520px, 1.35fr) minmax(420px, 1fr);
```

- 中等宽度下降低左右最小宽度。
- `960px` 以下改为上下排列，并为右侧面板保留至少 `300px` 高度。

### 4.4 标签栏和空状态样式

文件：

`app/renderer/src/main/src/pages/ai-re-act/aiTaskContent/AITaskContent.module.scss`

新增：

- `ai-task-tab-wrap-employee`：浅色渐变背景、胶囊式标签容器、统一间距和选中态。
- `tab-content-employee`：使用纵向 flex 和 `min-height: 0`，使 `DigitalEmployeeTaskProgress` 的 `margin: auto` 能把空状态垂直居中。

注意：该项目当前 CSS Modules loader 不接受下面这种嵌套写法：

```scss
:global {
  > div[class*='...'] {
  }
}
```

它会报：

```text
Error: Missing whitespace after :global
```

最终已改为在本地类下使用直接子级属性选择器，不要恢复上述 `:global` 写法。

## 5. 白屏问题及修复

### 5.1 根因

开发环境使用：

- 主渲染页：`http://127.0.0.1:3000`
- 引擎连接页：`http://127.0.0.1:5713`

`app/main/index.js` 已支持通过 `YAKIT_DEV_ENGINE_LINK_URL` 覆盖默认 5173，但 `app/main/security.js` 的 IPC 发送方白名单仍只允许：

```text
3000, 2800, 5173
```

因此连接页调用 IPC 时出现：

```text
untrusted IPC sender for EngineLink:is-enpritrace-to-domain
```

连接流程无法完成，表现为 Electron 白屏或主窗口没有正确出现。

### 5.2 修复方式

文件：

`app/main/security.js`

启动时读取：

- `YAKIT_DEV_RENDERER_URL`
- `YAKIT_DEV_ENGINE_LINK_URL`

只有满足以下条件的 URL 才会把端口加入开发白名单：

- 协议为 `http:` 或 `https:`。
- 主机名严格为 `127.0.0.1` 或 `localhost`。
- URL 有明确端口。

这不是放开任意远端来源；生产环境未设置这些变量时，原有固定白名单保持不变。

## 6. 本地启动方式

当前机器上 2800 和 5173 存在端口限制，已验证的启动组合是 3000 + 5713。

窗口 1，Memfit 主渲染器：

```powershell
$env:NODE_OPTIONS='--max-old-space-size=8192'
$env:PORT='3000'
yarn start-render-memfit
```

窗口 2，引擎连接页：

```powershell
cd app/renderer/engine-link-startup
yarn electron-render-memfit --host 127.0.0.1 --port 5713
```

窗口 3，Electron：

```powershell
$env:YAKIT_DEV_RENDERER_URL='http://127.0.0.1:3000'
$env:YAKIT_DEV_ENGINE_LINK_URL='http://127.0.0.1:5713'
yarn start-electron
```

不要在主渲染器仍在首次编译时反复启动多个副本。首次编译较慢且内存占用较高。

## 7. 验证记录

已经完成：

- Webpack 最终编译成功：`webpack compiled with 7 warnings`，没有 SCSS build error。
- `node --check app/main/security.js` 通过。
- `git diff --check` 通过。
- 目标文件 ESLint 为 0 error；仍有少量原有 React Hooks dependency warning。
- `http://127.0.0.1:3000` 返回 HTTP 200。
- `http://127.0.0.1:5713` 返回 HTTP 200。
- 重启 Electron 后不再出现 `untrusted IPC sender`。
- 用户已确认标签显示、样式和白屏恢复后的页面可用。

未形成可靠结论：

- `DigitalEmployeeTaskProgress` 的 Vitest 在沙箱内首次出现 `spawn EPERM`，提权重试后约 124 秒超时，没有拿到断言结果。逻辑代码未因此改动；后续若调整进度计算，应在正常本地终端补跑该测试。

相关测试：

`app/renderer/src/main/src/pages/digitalEmployee/__test__/taskProgress.test.ts`

## 8. 后续接手注意事项

1. 开始工作前先运行 `git status --short`，不要覆盖用户或其他任务产生的修改。
2. 不要重新显示“数字情报官初始化”等动态详情标签；当前产品要求数字员工右侧只显示“任务清单 / 深度规划”。
3. 不要删除外层“思考与执行”标题，它描述整个区域；两个标签是区域内部视图。
4. 若调整 `AITaskContent`，必须回归非数字员工场景，因为该组件仍被其他 AI ReAct 页面复用。
5. 若修改标签样式，注意本项目 CSS Modules 对 `:global` 的解析限制。
6. 若再次白屏，优先检查 3000/5713 是否返回 200，再检查 Electron stderr 中是否有 IPC sender 拒绝；不要先归因于页面 SCSS。
7. 推送 Gitee 时若直连失败，可临时使用本机 10808 代理：

```powershell
git -c http.proxy=http://127.0.0.1:10808 -c https.proxy=http://127.0.0.1:10808 push origin master
```

8. `.codex-*.log`、`release/` 和本地构建产物不要加入提交。

## 9. 建议的下一步

- 用一条真实、会生成多步骤计划的数字员工任务回归“待执行 / 正在执行 / 已完成”的实时变化。
- 回归历史会话，确认重新进入后任务清单与深度规划都能从会话数据恢复。
- 在 960px 附近以及更窄窗口检查上下布局和滚动行为。
- 在正常终端补跑 `taskProgress.test.ts`，确认进度聚合单元测试。

当前没有已知阻塞项。
