# AI SenPike 数字员工功能交接

更新时间：2026-08-05（Asia/Shanghai）

本文档接续：

- `docs/AI-SenPike-handover-2026-08-03.md`
- `docs/AI-SenPike-handover-2026-08-04.md`

## 1. 仓库与 Git 状态

工作区：

`D:\360MoveData\Users\Titee_G\Desktop\aiSenPike\yakit-memfit-AISenPike`

当前分支：`master`

本轮开始时 HEAD：

`76eac64 修复logo及其他bug`

该提交在本地显示为 `HEAD -> master, origin/master`。用户曾执行 `git push`，因 Git 访问 Gitee 时尝试通过 `127.0.0.1` 代理且代理未运行而失败：

```text
fatal: unable to access 'https://gitee.com/a1543733438/ai-sense.git/':
Failed to connect to gitee.com port 443 via 127.0.0.1
```

本轮改动尚未提交。不要覆盖或丢弃以下修改：

- `app/main/index.js`
- `app/renderer/src/main/src/pages/ai-agent/AIAgent.tsx`
- `app/renderer/src/main/src/pages/ai-agent/aiAgentChat/AIAgentChat.tsx`
- `app/renderer/src/main/src/pages/ai-agent/aiChatWelcome/AIChatWelcome.tsx`
- `app/renderer/src/main/src/pages/ai-agent/defaultConstant.tsx`
- `app/renderer/src/main/src/pages/ai-agent/historyChat/HistoryChatList/HistoryChatList.tsx`
- `app/renderer/src/main/src/pages/ai-re-act/aiReActChat/AIReActChat.tsx`
- 本文档

## 2. 已经提交的既有工作

提交 `76eac64` 已包含此前完成的内容：

- Windows 打包程序使用新的 AI SenPike 应用图标。
- macOS ICNS 同步使用新图标资源。
- 应用内品牌 Logo 已替换为 AI SenSo / AI SenPike 新资源。
- 修复应用图标外围白边。
- 顶栏 `AIAgent` 改为“数字员工”。
- 二级固定标签的 `AIAgent` 改为“数字员工”。
- “智能体广场”移动到“数字员工”右侧。
- 隐藏顶栏消息中心 / 更新通知铃铛。
- 同步意图识别默认开启。
- 调整数字员工聊天页顶部描述区域的溢出、换行和遮挡问题。

最近一次 Windows 安装包：

`release/codex-pack-iconfix-20260804-182157/AI SenPike-1.4.8-0711-windows-amd64.exe`

SHA-256：

`DC9A006CA7201AA3832A9328179D67A9AA2488D31DA01E7209368ED34C3B0A71`

该安装包未签名。macOS 图标资源已更新，但 Windows 环境没有生成新的 macOS 安装包。

## 3. 本轮：恢复原有 Plan / 模式入口

用户提供了一个“请选择模式，可多选，Plan / Multi-Agent / Goal”的参考图，要求先确认项目是否隐藏了类似入口。

检查结果：项目原本就有 Plan 按钮和 Focus Mode 选择器，并非需要新写 UI，但数字员工页面通过属性将其隐藏。

### 3.1 欢迎页

文件：

`app/renderer/src/main/src/pages/ai-agent/aiChatWelcome/AIChatWelcome.tsx`

已从数字员工欢迎页的 `AIChatTextarea` 删除：

```tsx
footerRightTypes={[]}
hidePlan
```

效果：

- 恢复原项目的 Focus Mode 选择器。
- 恢复原项目的 Plan 按钮。

### 3.2 进入会话后的聊天框

文件：

`app/renderer/src/main/src/pages/ai-re-act/aiReActChat/AIReActChat.tsx`

已删除：

```tsx
hidePlan={!!selectedEmployee}
```

效果：选择数字员工进入对话后，聊天框仍显示原有 Plan 按钮。

### 3.3 重要说明

- 当前显示的 Plan 按钮是原项目组件，不是本轮新写的按钮。
- 按钮样式、交互和提交参数均沿用项目原有实现。
- 当前 Focus Mode 选项由 `grpcQueryAIFocus()` 从后端动态加载，前端类型是单个 `FocusModeLoop` 字符串。
- 它不是前端写死的 `Plan / Multi-Agent / Goal` 多选列表，不要在没有后端协议支持的情况下伪造 Multi-Agent 或 Goal 选项。

## 4. 本轮：Plan 默认开启

用户在看到恢复后的 Plan 按钮后，明确要求设置为默认开启。

已修改四处：

1. `app/renderer/src/main/src/pages/ai-agent/defaultConstant.tsx`
   - `AIAgentSettingDefault.EnablePlan` 从 `false` 改为 `true`。
2. `app/renderer/src/main/src/pages/ai-agent/AIAgent.tsx`
   - 页面初始化不再强制写死 `false`，改用 `AIAgentSettingDefault.EnablePlan`。
3. `app/renderer/src/main/src/pages/ai-agent/aiAgentChat/AIAgentChat.tsx`
   - 新建会话时改用 `AIAgentSettingDefault.EnablePlan`。
4. `app/renderer/src/main/src/pages/ai-agent/historyChat/HistoryChatList/HistoryChatList.tsx`
   - 历史记录缺少 `EnablePlan` 字段时，回退到 `AIAgentSettingDefault.EnablePlan`。

预期行为：

- 新进入数字员工页面时，Plan 默认开启。
- 新建会话时，Plan 默认开启。
- 旧历史记录没有保存该字段时，按新默认值开启。
- 旧历史记录若明确保存 `EnablePlan: false`，仍保持关闭，因为使用了空值合并而不是布尔或运算。

## 5. 本地白屏与开发端口处理

### 5.1 问题现象

最初误用了根目录 `yarn dev`，该命令启动的是普通渲染器，不是 Memfit 模式。随后按交接方式启动时发现：

- 当前 Windows 的端口排除范围包含 `2797-2896`，所以原交接文档使用的主渲染器端口 `2800` 不适合当前机器。
- 连接页监听 `0.0.0.0:5173` 和 `127.0.0.1:5173` 都返回 `EACCES`。
- Electron 因连接页没有启动而出现白屏。

### 5.2 当前解决方式

主渲染器使用 `3000`，连接页使用 `127.0.0.1:5713`。

为让 Electron 开发环境可以使用其他连接页端口，在 `app/main/index.js` 增加了开发 URL 覆盖：

```js
if (isDev) engineLinkWin.loadURL(process.env.YAKIT_DEV_ENGINE_LINK_URL || 'http://127.0.0.1:5173')
```

这不会改变生产包行为；未设置环境变量时仍使用原来的 `http://127.0.0.1:5173`。

### 5.3 当前可用的启动命令

窗口 1，Memfit 主渲染器：

```powershell
$env:NODE_OPTIONS='--max-old-space-size=8192'
$env:PORT='3000'
yarn start-render-memfit
```

窗口 2，Memfit 连接页：

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

本轮实际验证：

- `http://127.0.0.1:3000` 曾返回 HTTP 200。
- `http://127.0.0.1:5713` 返回 HTTP 200。
- 使用上述两个 URL 重启 Electron 后，用户确认已经可以看到项目，不再白屏。

主渲染器首次编译非常慢，曾占用约 5 GB 内存；不要在它仍在编译时反复启动多个副本。

## 6. 验证状态

已完成：

- `git diff --check` 通过。
- Memfit 主渲染器成功启动并返回 HTTP 200。
- 替代端口上的连接页成功启动并返回 HTTP 200。
- Electron 使用替代 URL 成功显示项目，用户已确认可见。
- 用户已确认看到恢复后的 Plan 按钮。

尚需下一位接手者验证：

- 热更新后新进入数字员工页面，Plan 是否视觉上默认选中。
- 新建会话后 Plan 是否继续保持默认开启。
- 切换到明确保存 `EnablePlan: false` 的历史会话时是否正确保持关闭。
- Focus Mode 后端选项的实际内容是否符合产品预期。

## 7. 下一步建议

1. 先执行 `git status --short` 和 `git diff --check`，保留本轮 7 个源码修改与本文档。
2. 在当前运行实例中刷新或新建会话，人工确认 Plan 默认开启。
3. 如默认状态正确，再执行必要的类型检查或相关测试。
4. 用户确认后再提交；不要把 `release/`、开发日志或构建产物加入提交。
5. 若需要推送 Gitee，先检查 Git 的 `http.proxy` / `https.proxy` 配置以及本地代理是否运行，再重试推送。
6. 若需要重新打 Windows 包，应使用 Memfit 构建环境；macOS 包必须在 macOS 或已有 Apple 签名 Secrets 的 CI 上生成。

## 8. 注意事项

- 当前工作区存在用户要求的未提交修改，不要使用 `git reset --hard` 或 `git checkout --` 清理。
- 不要重新隐藏 Plan 或 Focus Mode，除非用户明确改变需求。
- 不要把截图中的多选模式菜单直接硬编码进前端；现有协议只确认了单值 Focus Mode。
- `app/main/index.js` 的开发 URL 环境变量用于解决本机端口冲突，生产逻辑仍保持兼容。
- 本地启动产生的 `.codex-*.log` 文件用于诊断，当前未出现在 `git status` 中，不应提交。
