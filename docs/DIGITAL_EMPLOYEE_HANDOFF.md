# AI SenPike 数字员工功能交接

更新时间：2026-07-30

## 1. 当前结果

项目已经在原有 Memfit / AI Agent 代码上增加“选择你的数字员工”入口与数字员工工作区，没有重写聊天请求主链路。

- 启动后先进入 8 名数字员工选择页。
- 默认选中第一名员工；悬停展示进入按钮；点击卡片可直接进入；底部确认按钮也可进入。
- 选择页采用响应式 Grid/Flex 布局，以 1280×720 为视觉基准，窗口变大或变小时会自适应。
- 进入 AI Agent 后，左侧可切换员工，顶部显示当前员工介绍和技能。
- 数字员工本质上绑定一个已有 AI Forge 技能，不是新建的一套聊天协议。
- 输入框现在会自动显示当前员工对应的原版 `forge` mention 标签。
- 用户仍可通过 `@` 或原有选择器继续添加一个或多个技能、工具、知识库标签。
- 发送后进入详情页，详情输入框会继续保留/恢复当前员工默认技能标签。
- 切换员工时会按现有 `selectionVersion` 重建输入编辑器，只保留新员工的默认技能标签，不残留旧员工锁定标签。
- 请求层仍有员工技能兜底和去重：即使界面标签初始化异常，员工技能也会随消息发送；相同技能不会重复附加。

## 2. 最重要的业务逻辑

### 2.1 数字员工与技能的关系

每名数字员工在 `pages/digitalEmployee/config.ts` 中通过 `forgeVerboseName` 对应技能库中的一个 AI Forge。引擎连接后，`DigitalEmployeeContext.tsx` 查询技能库，并用 `ForgeVerboseName` 精确匹配真实 Forge。

发送链路保持原版：

1. `AIChatTextarea` 从 Milkdown 编辑器提取 `mentionList`。
2. `getAIReActRequestParams` 把 mention 转成 `AttachedResourceInfo`。
3. `AIReActChat` 发送开始消息或后续自由对话。
4. `applyDigitalEmployeeSkillToInputEvent` 把当前员工技能作为 `aiforge` 资源兜底加入并去重。
5. 首次启动参数仍通过 `applyForgeNameToStartParams` 写入真实 `ForgeName`。

因此，正确理解是：员工是一个默认绑定的技能上下文；用户还可以继续叠加多个原版标签和输入内容一起发送。

### 2.2 默认员工标签（本轮新增）

- `resolver.ts` 中的 `getDigitalEmployeeDefaultMention` 把员工转换成原版 `forge` mention。
- 该标签使用真实 Forge Id、显示名，并设置 `lock: true`，界面不显示删除按钮。
- `AIChatTextarea` 新增 `defaultMentions`：编辑器初始化、清空、会话切换后都会恢复缺失的默认标签。
- 欢迎页与详情页以数字员工 `selectionVersion` 作为输入组件 key；员工切换会创建干净的新输入实例，避免旧锁定标签与新标签叠加。
- 插入 mention 的底层命令只在光标前确实是 `@` 时删除触发字符，程序化插入不会误删用户文本。
- 欢迎页与对话详情页使用同一个输入组件和同一套 mention 提取逻辑。

不要再额外制作一套“看起来像标签”的普通 DOM；默认员工必须继续走 Milkdown mention 数据链路。

## 3. 主要文件

### 数字员工配置与请求绑定

- `app/renderer/src/main/src/pages/digitalEmployee/config.ts`
- `app/renderer/src/main/src/pages/digitalEmployee/resolver.ts`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeContext.tsx`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeWorkspace.tsx`

### 选择页与工作区样式

- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeSelectPage.tsx`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeSelectPage.module.scss`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeWorkspace.module.scss`
- `app/renderer/src/main/src/pages/ai-agent/AIAgent.module.scss`
- `app/renderer/src/main/src/pages/ai-agent/aiChatWelcome/AIChatWelcome.module.scss`
- `app/renderer/src/main/src/pages/ai-re-act/aiReActChat/AIReActChat.module.scss`

### 原版聊天与默认标签接入

- `app/renderer/src/main/src/pages/ai-agent/aiChatWelcome/AIChatWelcome.tsx`
- `app/renderer/src/main/src/pages/ai-agent/template/template.tsx`
- `app/renderer/src/main/src/pages/ai-agent/template/type.ts`
- `app/renderer/src/main/src/pages/ai-agent/components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin.ts`
- `app/renderer/src/main/src/pages/ai-re-act/aiReActChat/AIReActChat.tsx`
- `app/renderer/src/main/src/pages/ai-agent/utils/index.ts`

### 素材

- 素材目录：`app/renderer/src/main/src/assets/newAssets/`
- 人物使用生成后的高清透明图：`senso-agent-01-portrait-hd.png` 至 `08`。
- 项目正式 Logo 使用原有：`app/renderer/src/main/src/assets/memfitHasName.jpg`。
- 素材用途和尺寸参考：`senso-assets-manifest.json`。
- 不允许使用整张参考 UI 截图充当页面背景。

## 4. 已确认的交互

- 第一张卡片默认选中，但人物图始终使用普通高清透明人物，不使用完整选中卡图。
- hover 与 selected 不改变卡片尺寸，不产生布局跳动。
- 选中态蓝色边框和按钮由 CSS/独立内容实现，避免复用第一张卡片的固定文案。
- 点击任何卡片可直接进入员工工作区。
- 底部确认按钮随当前选中态保持高亮并可进入。
- 快捷技能卡片只作为建议展示，不再点击后向输入框塞普通文字。
- 数字员工默认技能在输入框内显示为原版标签；`@` 添加的其他标签仍可共存。
- 首次发送和详情页后续发送都会携带员工技能，并对重复资源去重。

## 5. 测试结果

2026-07-30 本轮完成后：

- TypeScript：通过。
- 数字员工定向测试：2 个测试文件、9 项测试全部通过。
- `git diff --check`：通过。

本轮运行检查：

- 渲染服务 `http://127.0.0.1:2800` 返回 200，Electron 正常连接并进入 AI Agent。
- 运行页面显示当前员工“首席信息安全官”及其介绍、技能和就绪状态。
- 输入框同时显示默认员工标签“首席信息安全官”和额外 Forge 标签“警告降噪分析”，确认原版多标签共存链路正常。
- 选择页响应式 Grid/Flex 结构与无横向溢出约束已复核；选择页组件测试继续覆盖 8 张员工卡、默认选中、卡片直达和确认按钮。

命令：

```powershell
cd app/renderer/src/main
yarn tsc --noEmit -p tsconfig.json

cd ../../../..
node node_modules/vitest/vitest.mjs run app/renderer/src/main/src/pages/digitalEmployee/__test__/resolver.test.ts app/renderer/src/main/src/pages/digitalEmployee/__test__/DigitalEmployeeSelectPage.test.tsx
```

测试中存在项目原有的 React 18 `ReactDOM.render` 警告，不是本次改动引入的失败。

## 6. 本地运行注意事项

根目录 `yarn dev` 固定等待 3000 端口，但当前开发服务器实际可能分配到 2800，曾因此出现 Electron 白屏。若 3000 不可用，推荐分开启动：

```powershell
# 窗口 1：渲染进程
$env:PORT='2800'
yarn start-render

# 窗口 2：让 Electron 指向渲染器实际地址
$env:YAKIT_DEV_RENDERER_URL='http://127.0.0.1:2800'
yarn start-electron
```

如果 2800 已被本项目占用，先访问 `http://127.0.0.1:2800`：返回 200 表示渲染服务已经在运行，不要重复启动。若改用其他端口，需要同时修改两个环境变量。启动前先检查是否已有旧 Electron/Node 进程，避免多个窗口混淆。

## 7. Git 状态

- 仓库：`https://gitee.com/a1543733438/ai-sense.git`
- 分支：`master`
- 已推送的关键提交：
  - `acaae69 feat: initialize AI SenSo digital employee experience`
  - `5b74f61 feat: modernize digital employee workspace`
- `7804ae2 fix: polish digital employee interactions`
- 本轮默认员工标签提交请以 `git log -1 --oneline` 的最新结果为准。
- 本轮员工切换标签重置提交也请以 `git log -1 --oneline` 的最新结果为准。

仓库较大，`.gitignore` 已重点忽略依赖、构建产物、缓存、日志、临时文件和本地配置。不要提交 `node_modules`、构建目录或本机缓存。

## 8. 新窗口继续时的优先检查

1. 启动项目，选择不同员工，确认进入欢迎页后输入框立刻出现对应员工的 Forge 标签。
2. 用 `@` 再添加一个或多个标签，输入文字发送，确认可以正常进入详情页。
3. 详情页确认员工默认标签仍存在；连续发送后应自动恢复，不能成倍重复。
4. 切换员工后确认新会话显示新员工标签，旧员工标签不残留。
5. 检查大屏、小屏下选择页与 AI Agent 工作区，无横向溢出和明显跳动。
6. 后续尽量只改布局和样式；除非定位到真实缺陷，不要重写原版聊天、mention、IPC 或模型发送逻辑。

## 9. 可直接交给新 AI 的指令

请先阅读本文件和 `docs/changes/` 下 2026-07-30 的记录，再查看 `git status` 与最新提交。当前数字员工已经复用原版 AI Forge mention 链路：员工技能是输入框内默认标签，用户可继续通过 `@` 添加多个标签；请求层有兜底去重。请以最小改动原则继续，优先做上述手工交互检查和响应式 UI 微调，不要重写原版聊天发送逻辑。每次完成后运行类型检查和数字员工定向测试，并更新交接/改动记录后提交推送到 `origin/master`。
