# 六维检查细则

> 供 `code-review` SKILL.md 步骤三使用：审查到对应维度时读取该节。每节按「检查点 → 怎么查」组织，发现的问题按 SKILL.md 的严重程度体系定级。

## 1. 代码逻辑检查

检查点：

- **空值与边界**：可选链/默认值是否覆盖（`a?.b`、空数组、`find()` 返回 `undefined` 后直接取属性）。
- **异步与竞态**：async 错误是否被捕获（try/catch 或 `.catch`）；连续触发的请求是否防重、过期响应是否丢弃；组件卸载后是否还会 setState。
- **资源清理**：useEffect 的 cleanup 是否清理了定时器、事件监听、`ipcRenderer.on`、各类订阅。
- **错误处理路径**：gRPC / 接口调用的失败分支是否有处理与用户提示，而不是静默吞掉。
- **安全**：`dangerouslySetInnerHTML` / `eval` / `new Function` 的输入来源；硬编码的 token / key / 密码 / 内网地址。
- **性能**：大列表渲染、循环内重复昂贵计算、高频更新组件缺 memo——仅在有实际影响时提，不吹毛求疵。
- **i18n**：新增 UI 文案是否走 i18n 而非硬编码中文（对照同目录既有写法）。
- **死代码**：注释掉的大段代码、不可达分支、因本次改动而孤立的无用变量 / import。

怎么查：通读每个源码文件的完整 diff，并向上下文延伸——读改动函数所在文件的完整实现及其直接调用方，重点跟踪状态流转与数据流向。

## 2. TS 定义检查

- **文件内一致性**：类型定义与实际使用是否一致，新增字段是否同步进 interface/type。
- **对外影响**：导出的 type / interface / props 定义有增删改时，grep 全仓库使用方逐一核对是否同步。tsc 能兜底大部分，但动态拼接（字符串路径、对象索引）的场景 tsc 查不到。
- **any 与断言**：新增的 `any` 是否掩盖了本可表达的类型；`as` 断言是否掩盖真实类型不匹配。
- **可选性**：必填改可选（或反之）对调用方的影响。
- **客观标准**：tsc 失败即 P0（由步骤四的验证结果决定）；tsc 通过不代表无问题，仍需人工核对定义合理性。

## 3. UI 引用与 Props 检查

- **props 定义增删改**：grep 全仓库该组件的标签使用（`<Component`）与 import，逐一核对——新增必填 props 是否所有使用处都已传；删除 / 改名的 props 是否还有残留传参。
- **组件重命名 / 移动**：引用是否全部更新。**重点查 tsc 覆盖不到的引用**：字符串路径（lazy import、路由表、菜单 / 侧边栏配置、注册表）。
- **废弃 props / 组件**：确认是否有迁移说明。
- **引用存在性**：i18n key（新增使用 → 语言包中存在该 key；删除 key → 无残留引用）；图标 / 图片等静态资源路径存在。
- **Yakit 特有**：yakitUI 系列组件的 props 与 `app/renderer/src/main/src/components/yakitUI/` 下的定义一致。

## 4. CSS 样式检查

- **类名一致性**：改动 / 删除的类名 → grep `className` / `classNames(...)` / `styles.xxx` 确认引用同步；新增类名未被使用、删除类名仍被引用都算问题。
- **暗色主题兼容**：Yakit 有暗色主题。新增的硬编码颜色（`#fff`、`#000`、`rgba(...)`、`white`）在暗色下是否异常；对照同文件既有写法，优先用主题变量。历史 bug 参考：「暗色主题下关闭记事本时内容区闪白」。
- **冗余与优先级**：重复定义的同名规则、滥用 `!important`、明显互相覆盖的规则。
- **布局健壮性**：固定高度 / 宽度在内容变化或窗口缩放下的问题（历史 bug 参考：「记事本代码块固定高度不随内容伸缩」）；绝对定位脱离文档流的隐患。

怎么查：样式文件改动读完整 diff；tsx 内联样式改动看组件上下文；类名有改动必须 grep 引用。

## 5. 依赖版本影响检查（仅当改动含 package.json）

> 本仓库三处独立依赖：根 `package.json`、`app/renderer/src/main/package.json`、`app/renderer/engine-link-startup/package.json`，各配独立 `yarn.lock`。先确定改的是哪一处（或哪几处）。

- **新增依赖**：用途是什么、是否已有等价能力（避免重复引入）、体积影响、license 兼容。
- **升级**：跨 major → 必查该版本 changelog 的 breaking change，并 grep 代码中受影响 API；minor / patch → 关注是否为解决特定问题。
- **删除**：grep 残留 `import` / `require`；确认没有构建脚本仍引用它。
- **engines**：主渲染端要求 `node >= 22.22.0`，升级依赖自身的 engines 需求不得与之冲突。
- **lock 同步**：package.json 与对应子项目 `yarn.lock` 是否同步改动——只改 json 不改 lock 会导致 `yarn check-deps` / 安装不一致。
- **版本写法**：`^` / `~` / 精确版本与该子项目既有风格是否一致。
- 版本号 bump（如 Yakit 产品版本号）不算依赖问题，可在配置维度确认是否预期。

## 6. 配置项影响检查（仅当改动含配置文件）

配置文件清单：`tsconfig*.json`、`vite.config.*`、vitest 配置、electron-builder 配置、`.github/workflows/`、`scripts/`、`cli/`、`.env*`、`.husky/`、`.lintstagedrc`、package.json 的 `scripts` 段。

- **tsconfig**：`strict`、`paths`（`@/*`、`@renderer`、`@engine`、`@app`）、`include` / `exclude` 的变化会波及全项目——受影响代码能否过编译以步骤四 tsc 结果为准。
- **vite**：alias、plugin、构建 target、dev server 配置变化对启动 / 构建的影响。
- **CI workflows**：改动是否影响 PR 检查流程（`ci-tsc` / `ci-vitest` / `ci-eslint` 各自的 workdir 与触发条件）。
- **electron-builder**：打包产物、平台配置、签名配置的变化。
- **环境变量**：本仓库用 `YAKIT_EDITION` 区分六版本（yakit / yakitEE / yakitSE / irify / irifyEE / memfit），相关改动需确认六个版本行为一致或差异符合预期。
- **脚本类**（`scripts/`、`cli/`、package.json `scripts` 段）：新增 / 修改的脚本是否有调用方、是否破坏既有入口（如 `yarn cli install` / `start` / `dev`）。
