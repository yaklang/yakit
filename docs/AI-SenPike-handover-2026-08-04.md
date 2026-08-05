# AI SenPike 数字员工功能交接

更新时间：2026-08-04（Asia/Shanghai）

> 本文档接续 `docs/AI-SenPike-handover-2026-08-03.md`，并以当前未提交工作区为准。昨天的文档保留作历史参考；遇到冲突时以本文和实际 `git diff` 为准。

## 1. 当前结论

本轮在既有数字员工、智能体广场和聊天链路上完成了四组修改：

1. 所有数字员工卡片的名称、描述和标签统一以后端 Forge 字段为准，尤其是 `ForgeVerboseName`。
2. 会话详情中的任务时间不再显示 `01-01 08:00` 一类无效占位时间。
3. 聊天页和聊天详情页顶部人物资料区支持描述换行和高度自适应，矮窗口下不再让人物进入无边框标题栏遮罩。
4. Windows 安装包已经重新构建；macOS ARM64 包尚未生成，因为当前机器是 Windows AMD64，必须切换到 macOS 主机或 macOS CI。

当前最重要的数据规则仍然是：**后端 Forge 列表是数字员工数量和卡片文案的唯一数据源。** 前端静态配置只保留视觉身份，不再覆盖后端名称、描述和标签。

## 2. Git 与工作区状态

- 当前分支：`master`
- 当前 HEAD：`519c91a docs: add AI SenPike handover guide`
- 远程仓库：`origin = https://gitee.com/a1543733438/ai-sense.git`
- 当前修改尚未提交、尚未推送。

业务与构建配置的未提交修改共 7 个；加上本文档后，`git status` 应显示 8 个未提交项：

```text
M app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeContext.tsx
M app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeTaskProgress.tsx
M app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeWorkspace.module.scss
M app/renderer/src/main/src/pages/digitalEmployee/__test__/DigitalEmployeeSelectPage.test.tsx
M app/renderer/src/main/src/pages/digitalEmployee/__test__/taskProgress.test.ts
M app/renderer/src/main/src/pages/digitalEmployee/taskProgress.ts
M packageScript/electron-builder.config.js
?? docs/AI-SenPike-handover-2026-08-04.md
```

不要清理或覆盖这些修改。`release/`、生产构建目录和依赖目录不应提交。

## 3. Forge 字段与数字员工卡片

### 3.1 数据加载规则

入口：`app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeContext.tsx`

- 使用 `QueryAIForge` 分页读取全部 Forge，每页 100 条，按 `id asc` 排序。
- 分页结果按真实 `Forge.Id` 去重并排序。
- 最终使用 `forges.map(...)` 生成员工，因此卡片数量严格等于后端 Forge 数量。
- 后端增加或减少 Forge 数量时，选择页会自动增加或减少卡片，并按每页最多 8 张进行分页。
- 如果后端直接重命名字段本身，例如把 `ForgeVerboseName` 改成另一个键，前端不会凭空识别新字段，仍需同步更新类型和映射逻辑。

### 3.2 所有卡片统一使用后端展示字段

最新实现先对每个 Forge 执行 `createGeneratedEmployee(forge, order)`，再按是否存在前 8 个视觉模板决定是否覆盖视觉字段。

所有卡片统一使用：

- 名称：`ForgeVerboseName || ForgeName || 智能体 {Id}`
- 描述：`Description`；为空时使用简短兜底文案
- 标签：`Tag`；为空时使用 `ForgeType`
- 执行对象：当前位置真实的 `forge`

前 8 张卡片只从 `DIGITAL_EMPLOYEES[index]` 保留：

- `id`
- `portrait`
- `accent`

因此后端修改第 1～8 个 Forge 的 `ForgeVerboseName`、`Description` 或 `Tag` 后，前端卡片会像原第 9 张卡一样使用后端最新内容。第 9 张及以后仍动态生成员工 ID，并循环复用前 8 张头像。

### 3.3 执行绑定不要回退

- 展示顺序不是 Forge ID。
- 真正执行标识来自 `employee.forge.Id` 和 `employee.forge.ForgeName`。
- 默认 Milkdown mention 使用真实 Forge ID。
- 输入框技能名称优先使用真实 `forge.ForgeVerboseName`。
- 首次启动注入真实 `ForgeName`，后续消息添加并去重 aiforge 资源。

不要恢复“静态 8 人 + 全部后端 Forge”或“按前端 order 推测数据库 ID 1～8”的旧实现，否则会重新出现 8+N 卡片和执行对象错配。

## 4. 会话详情任务时间修复

相关文件：

- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeTaskProgress.tsx`
- `app/renderer/src/main/src/pages/digitalEmployee/taskProgress.ts`
- `app/renderer/src/main/src/pages/digitalEmployee/__test__/taskProgress.test.ts`

当前逻辑：

- 时间戳兼容秒和毫秒。
- 早于 `2000-01-01T00:00:00.000Z` 的值视为后端占位值并隐藏。
- 优先显示有效的 `updated_at`。
- `updated_at` 无效时回退到有效的 `created_at`。
- 使用更新时间时显示“更新于”，回退创建时间时显示“创建于”。
- 两个值都无效时不渲染时间行。

这样可避免后端传入 `0`、`1` 等值时显示 `01-01 08:00`。

## 5. 聊天页与详情页顶部人物资料区

聊天页和聊天详情页共用 `DigitalEmployeeProfile`，入口在：

- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeWorkspace.tsx`
- `app/renderer/src/main/src/pages/ai-agent/AIAgent.tsx`

样式修改位于：

`app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeWorkspace.module.scss`

当前行为：

- `.employee-profile` 使用 `flex: 0 0 auto`，不再固定为 `clamp(...)` 高度。
- 描述取消单行省略号，允许换行并使用 `overflow-wrap: anywhere`。
- 资料区会随多行描述撑高。
- 宽度不超过 820px 时仍隐藏品牌、分隔线、技能和右上状态，但高度继续自适应。
- 高度不超过 720px 时，资料区最小高度为 142px，顶部 padding 为 34px。
- 其中额外 24px 用于避开无边框窗口顶部遮罩；右上状态同步下移到 `top: 34px`。
- 矮窗口下头像缩小为 90×90，但不应再被顶部裁切。

这项修改已通过生产 SCSS 编译，但仍建议下一位接手者在真实 Electron 矮窗口中人工确认聊天主页和已有会话详情两个状态。

## 6. 测试与验证

数字员工定向测试已通过：3 个文件、13 项测试。

```powershell
& .\node_modules\.bin\vitest.cmd run `
  app/renderer/src/main/src/pages/digitalEmployee/__test__/DigitalEmployeeSelectPage.test.tsx `
  app/renderer/src/main/src/pages/digitalEmployee/__test__/resolver.test.ts `
  app/renderer/src/main/src/pages/digitalEmployee/__test__/taskProgress.test.ts
```

覆盖重点：

- 后端返回多少 Forge 就生成多少员工。
- 第 1 张卡也会使用后端更新后的名称、描述和标签，同时保留第 1 个视觉 ID 和头像。
- 第 9 张继续使用真实后端字段并循环复用第 1 张头像。
- 轮播分页、Forge mention、ForgeName 注入和资源去重保持正常。
- 无效时间戳 `0` 和 `1` 都不会显示。

测试仍会输出项目原有的 React 18 `ReactDOM.render` 警告，不是本轮失败。

两个 Memfit 生产渲染器均构建成功：

- 主渲染器：React production build 成功；存在项目原有的 autoprefixer、CSS 顺序和 Browserslist 警告。
- 链接页：TypeScript 检查通过，Vite 共转换 4325 个模块并成功生成产物；存在大 chunk 警告。

根目录 `yarn build-renders-memfit` 在当前环境中可能找不到 `run-s`，实际成功时使用了本地 `.bin` 入口顺序构建。

## 7. Windows 安装包

最新成功安装包：

`release/codex-pack-20260803-173546/AI SenPike-1.4.8-0711-windows-amd64.exe`

- 目标：Windows x64，NSIS
- 大小：124,277,641 bytes（118.52 MB）
- 生成时间：2026-08-03 17:37:56
- SHA-256：`5EEF506AABC044AE7C320F31569C1E990B2302ACC28905D4920D19CE7E02AB2D`
- Authenticode：`NotSigned`
- 使用环境：`nonSignNormal,Memfit`

打包前已在 `packageScript/electron-builder.config.js` 的 `files` 中加入：

```js
'!release/**/*'
```

该规则必须保留，否则把输出目录改到 `release/` 子目录时可能把旧安装包和临时产物递归打入新包。

### 7.1 Windows 打包实际情况

第一次写入默认 `release/win-unpacked.tmp` 时，Windows 持续锁定：

`release/win-unpacked.tmp/resources/default_app.asar`

确认没有 Electron 进程后仍无法删除。最终通过新的独立输出目录成功打包：

```powershell
& .\node_modules\.bin\env-cmd.cmd `
  -e nonSignNormal,Memfit `
  -r packageScript\.env-cmdrc `
  .\node_modules\.bin\electron-builder.cmd build `
  --win `
  --config .\packageScript\electron-builder.config.js `
  --config.directories.output=release\codex-pack-20260803-173546
```

`release/win-unpacked.tmp` 仍是失败打包留下的临时目录，不属于成功安装包。重启 Windows 或文件锁释放后可删除整个临时目录。

打包日志还提示以下源文件不存在，但安装器仍成功生成：

- `bins/scripts/google-chrome-plugin.zip`
- `bins/engine-version.txt`
- `bins/yak_windows_amd64.zip`

正式发布前应确认是否必须补齐这些资源。本轮没有实际安装/卸载 NSIS 包做冒烟测试。

## 8. macOS ARM64 打包状态

用户随后要求生成 macOS ARM64 包，但当前环境是 Windows 10 AMD64，无法在本机完成 `.app/.dmg` 封装、Apple 签名和公证，因此没有生成 Mac 包。

项目配置本身已包含：

```js
mac: {
  target: [{ target: 'dmg', arch: ['x64', 'arm64'] }],
}
```

仓库已有 macOS CI：

`.github/workflows/build-multi-memfit-prod.yml`

该流程：

- 在 `macos-15` 上运行。
- 仅由 `v*-memfit` 标签触发。
- 依赖 Apple ID、Team ID、证书和密码等 GitHub Secrets。
- 下载并签名 Darwin AMD64/ARM64 引擎。
- 生成并上传 Memfit 的 Windows、macOS 和 Linux 产物。
- Artifact 保留 1 天。

当前阻塞：

- Git 远程只有 Gitee，没有 GitHub remote。
- 仓库没有 `.gitee` 流水线配置。
- 当前 7 个业务/配置修改和尚未跟踪的本文档均未提交或推送。
- 不应在未获得用户明确授权、GitHub 仓库地址和签名 Secrets 准备确认前擅自提交、推送或创建发布标签。

继续生成 Mac ARM64 包有两条可行路径：

1. 在 Apple Silicon Mac 上打开本工作区，构建 Memfit 渲染器后运行 Electron Builder 的 `--mac --arm64`。
2. 将当前修改提交到已配置 Apple Secrets 的 GitHub 仓库，并由 `v*-memfit` 标签触发现有 `macos-15` 工作流。

## 9. 本地开发启动

2026-08-04 核对时没有运行中的 Electron、Node 或 esbuild 开发进程。重新开发时使用 Memfit 模式：

```powershell
# 窗口 1：主渲染器
$env:NODE_OPTIONS='--max-old-space-size=8192'
$env:PORT='2800'
yarn start-render-memfit

# 窗口 2：连接页
yarn start-link-render-memfit

# 窗口 3：Electron
$env:YAKIT_DEV_RENDERER_URL='http://127.0.0.1:2800'
yarn start-electron
```

普通 `start-render` 会进入通用 Yakit 页面，不是 AI SenPike。

## 10. 关键文件

数字员工数据与配置：

- `app/renderer/src/main/src/pages/digitalEmployee/config.ts`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeContext.tsx`
- `app/renderer/src/main/src/pages/digitalEmployee/resolver.ts`

选择页与工作区：

- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeSelectPage.tsx`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeSelectPage.module.scss`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeWorkspace.tsx`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeWorkspace.module.scss`

任务进度：

- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeTaskProgress.tsx`
- `app/renderer/src/main/src/pages/digitalEmployee/taskProgress.ts`

聊天接入：

- `app/renderer/src/main/src/pages/ai-agent/AIAgent.tsx`
- `app/renderer/src/main/src/pages/ai-agent/aiChatWelcome/AIChatWelcome.tsx`
- `app/renderer/src/main/src/pages/ai-agent/template/template.tsx`
- `app/renderer/src/main/src/pages/ai-re-act/aiReActChat/AIReActChat.tsx`
- `app/renderer/src/main/src/pages/ai-agent/components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin.ts`

测试：

- `app/renderer/src/main/src/pages/digitalEmployee/__test__/DigitalEmployeeSelectPage.test.tsx`
- `app/renderer/src/main/src/pages/digitalEmployee/__test__/resolver.test.ts`
- `app/renderer/src/main/src/pages/digitalEmployee/__test__/taskProgress.test.ts`

构建与发布：

- `packageScript/electron-builder.config.js`
- `.github/workflows/build-multi-memfit-prod.yml`

## 11. 下一位接手者优先事项

1. 先阅读本文，再执行 `git status` 和 `git diff`，保留当前 7 个业务/配置修改和本文档。
2. 启动 Memfit 开发环境，在矮窗口中人工检查聊天主页和会话详情顶部人物是否完整显示。
3. 使用真实后端数据确认前 1～8 张卡也展示 `ForgeVerboseName`、`Description` 和 `Tag`。
4. 确认任务列表不会再显示 1970 年派生的 `01-01 08:00`，并验证 created/updated 回退标签。
5. 安装最新 Windows NSIS 包，执行首次启动、聊天、会话详情和卸载冒烟测试。
6. 决定正式 Windows 发布是否补齐引擎、engine-version 和 Chrome 插件资源，并使用签名配置重新打包。
7. 若继续 macOS ARM64 打包，先准备 Apple Silicon Mac 或已配置 Secrets 的 GitHub 仓库，再获得用户对提交、推送和标签操作的明确授权。
8. 功能验收后再有意识地提交当前工作区；不要把 `release/` 和构建产物加入提交。

## 12. 不要回退的设计决定

- 不要把员工数量写死为 8。
- 不要把静态 8 名员工与全部后端 Forge 相加。
- 不要让前 8 张卡继续覆盖后端 `ForgeVerboseName`、`Description` 或 `Tag`。
- 不要依赖数据库 ID 必须为 1～8；显示位置与真实 Forge ID 分离。
- 不要用普通 DOM 伪造默认技能标签；继续走 Milkdown mention 链路。
- 不要显示早于 2000 年的任务占位时间。
- 不要重新把人物资料区设为固定高度或单行省略，避免描述和头像再次被裁切。
- 不要移除 Electron Builder 对 `release/**/*` 的排除规则。
- 不要提交 `release/`、构建目录、依赖、日志或本机缓存。
