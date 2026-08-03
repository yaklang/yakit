# AI SenPike 数字员工功能交接

更新时间：2026-08-03（Asia/Shanghai）

## 1. 当前结论

本轮完成了智能体广场 UI、数字员工与 Forge 的数据绑定、员工数量动态化、横向轮播，以及员工卡片视觉增强。聊天、Milkdown mention、AI ReAct 和 Electron IPC 主链路没有重写。

当前最重要的约束：**智能体广场后端列表是员工数量的唯一数据源。** 后端返回 9 个 Forge，选择页就只渲染 9 张员工卡，不再是“前端静态 8 个 + 后端 N 个”。

前端现有 8 名员工配置只承担前 8 张卡片的展示模板作用，包括姓名、职责文案、技能文案、头像和主题色；每张卡实际绑定当前排序位置对应的真实 Forge 对象。第 9 个及以后直接使用后端名称、描述和标签，并循环复用前 8 张头像。

## 2. 数字员工与智能体广场的实际关系

### 2.1 数据加载

入口：`app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeContext.tsx`

- 使用 `QueryAIForge` 分页读取全部 Forge，每页 100 条，按 `id asc` 排序。
- 所有分页结果按真实 `Forge.Id` 去重后排序。
- 最终执行 `forges.map(...)`，因此员工卡数量严格等于后端 Forge 数量。
- 第 1～8 条套用 `DIGITAL_EMPLOYEES[index]` 的视觉与职责模板，但 `employee.forge` 是该位置真实返回的 Forge。
- 第 9 条及以后动态生成员工定义：
  - `id`: `forge-${Forge.Id}`
  - `order`: 当前列表位置，从 1 开始
  - 名称：`ForgeVerboseName || ForgeName || 智能体 {Id}`
  - 描述：真实 `Description`，为空时生成简短兜底
  - 技能：真实 `Tag`，为空时使用 `ForgeType`
  - 头像：按列表顺序循环复用前 8 张，9→1、10→2，以此类推
- 请求失败时不再额外展示 8 条静态假数据，而是显示“技能库暂时不可用”并提供重试。
- 后端成功返回空列表时显示“智能体广场暂无可用智能体”。

### 2.2 执行绑定

- 卡片展示顺序不是 Forge ID；真实执行标识来自 `employee.forge.Id` 和 `employee.forge.ForgeName`。
- `getDigitalEmployeeDefaultMention` 使用真实 Forge ID 创建锁定 mention。
- `getDigitalEmployeeSkillName` 优先使用真实 `forge.ForgeVerboseName`，因此后端同事更新展示名称后，输入框标签会自动使用新名称。
- 首次启动通过 `applyForgeNameToStartParams` 注入真实 `ForgeName`。
- 后续消息通过 `applyDigitalEmployeeSkillToInputEvent` 添加并去重 aiforge 资源。

不要恢复已废弃的“按前端 order 推测数据库 ID 1～8，再拼接额外 Forge”的实现。该做法在真实 ID 不是 1～8 时会错误渲染成 8+N 条，已由提交 `2b9ec8c` 修正。

### 2.3 2026-08-03 本地数据快照

本轮只读检查到 `yakit-profile-plugin.db` 中有 9 条有效 Forge：

| ID | ForgeVerboseName | ForgeName |
|---:|---|---|
| 1 | 日志监控与分析 | `web_log_monitor` |
| 2 | 流量日志分析生成报告 | `flow_report` |
| 3 | 主机体检 | `hostscan` |
| 4 | 根据SSA Risk智能生成POC | `ssapoc` |
| 5 | 空 | `ssa_vulnerability_analyzer` |
| 6 | 按项目的扫描风险分析 | `scan_risk_analysis_project` |
| 7 | 警告降噪分析 | `alert_denoising` |
| 8 | SyntaxFlow 规则补全 | `sf_rule_completion` |
| 9 | SSA项目检查 | `sf_project_scan_check` |

后端同事计划更新展示名称。该表只是当日快照，不应再写死到前端。

## 3. 选择页与轮播

主要文件：

- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeSelectPage.tsx`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeSelectPage.module.scss`
- `app/renderer/src/main/src/pages/digitalEmployee/config.ts`

当前行为：

- 每页最多 8 张员工卡，桌面端为 4×2。
- 超过 8 张后形成下一页，使用横向滚动和 CSS scroll snap。
- 支持触控板/触摸横向滑动、上一页、下一页和可点击圆点。
- 只有一页时不显示翻页控件。
- 移动端继续切换为双列或单列布局。
- 页面纵向溢出可以滚动，不会在超过两行后裁切内容。

## 4. 视觉增强与性能边界

提交 `aa68128` 完成以下效果：

- 头像使用光晕、落地阴影、轮廓投影、悬浮和轻微景深，增强 3D 层次。
- “选择 TA / 进入”使用 3 个 SVG chevron 依次流动。
- 选中卡使用蓝紫渐变跑马边框和呼吸透明度。
- “当前选择”状态标识使用轻量缩放/透明度呼吸。
- 卡片悬停轻微抬升，不改变网格布局尺寸。

性能约束：

- 没有新增 `setInterval`、`requestAnimationFrame`、全局鼠标监听或 JS 动画状态。
- 箭头动画默认暂停，只在选中或悬停卡片上运行。
- 头像基础状态不长期强制创建 3D 合成层；仅选中/悬停卡进入景深变换。
- 跑马边框只在当前选中卡运行。
- 已提供 `prefers-reduced-motion: reduce`，系统要求减少动态效果时停用动画和过渡。

## 5. 智能体广场 UI

Memfit 模式下：

- 原“技能库”改名为“智能体广场”。
- “新建技能”改为“创建智能体”，编辑文案同步调整。
- 保留原创建、编辑、删除、导入、导出、搜索和滚动加载逻辑。
- 新增 Hero、分类标签、搜索框和双列智能体卡片。
- 卡片继续展示真实 Forge 名称、描述、类型、作者、更新时间等数据。
- 其他 Yakit / IRify 产品模式不受影响。

相关记录：`docs/changes/2026-07-30-agent-marketplace-ui.md`。

## 6. 本轮验证

### 6.1 类型与测试

- `yarn tsc --noEmit -p tsconfig.json`：通过。
- 数字员工定向测试：2 个文件、11 项通过。
- 测试覆盖：
  - 后端返回 9 条且 ID 为 101～109 时，前端仍严格只生成 9 张员工卡。
  - 第 9 张复用第 1 张头像。
  - 超过 8 张后生成第二页、左右按钮与 2 个圆点。
  - 每张员工卡包含 3 个箭头 SVG。
  - Forge mention、ForgeName 注入和资源去重保持正常。
- 选择页 SCSS 使用本地 `sass.compile(...)` 独立编译通过。
- `git diff --check`：通过。

测试命令：

```powershell
node node_modules/vitest/vitest.mjs run app/renderer/src/main/src/pages/digitalEmployee/__test__/DigitalEmployeeSelectPage.test.tsx app/renderer/src/main/src/pages/digitalEmployee/__test__/resolver.test.ts --reporter=verbose

cd app/renderer/src/main
yarn tsc --noEmit -p tsconfig.json
```

测试仍会输出项目原有的 React 18 `ReactDOM.render` 警告，不是本轮失败。

### 6.2 生产构建

根脚本 `yarn build-renders-memfit` 在当前安装环境中因缺少 `run-s` 命令入口而立即退出，因此实际使用等价的顺序命令：

```powershell
$env:NODE_OPTIONS='--max-old-space-size=8192'
yarn build-render-memfit
yarn build-link-render-memfit
```

两个生产渲染器均构建成功。主构建有项目既有的 autoprefixer、CSS 顺序、Browserslist 过期和大 chunk 警告，没有 `Failed to compile`。

## 7. Windows 安装包

### 7.1 成功产物

安装包：

`release/AI SenPike-1.4.8-0711-windows-amd64.exe`

- 目标：Windows x64，NSIS
- 大小：124,304,937 bytes（118.55 MB）
- 生成时间：2026-08-03 13:32:42
- SHA-256：`6B1BCFB6F326A4FED99C1D22A1C5A695F9FEF0F7A5CF0F6DC64CDF9F05B06442`
- Authenticode：`NotSigned`，符合 `nonSignNormal,Memfit` 配置

同时生成：

- `release/AI SenPike-1.4.8-0711-windows-amd64.exe.blockmap`
- `release/711.yml`
- `release/win-unpacked/AI SenPike.exe`

### 7.2 实际成功命令

第一次直接运行 `yarn pack-win-memfit` 时，Windows 锁定 Electron 的 `default_app.asar`，electron-builder 无法将 `win-unpacked.tmp` 重命名为 `win-unpacked`。为避免该临时解压路径，最终成功命令复用了仓库已安装的 Electron 27 运行时：

```powershell
$env:NODE_OPTIONS='--max-old-space-size=8192'
yarn pack-win-memfit --config.electronDist=node_modules/electron/dist
```

这是命令级覆盖，没有修改 `electron-builder.config.js`。

### 7.3 打包注意事项

打包日志提示以下可选源文件不存在，但安装器仍成功生成：

- `bins/scripts/google-chrome-plugin.zip`
- `bins/engine-version.txt`
- `bins/yak_windows_amd64.zip`

因此该安装包没有内置上述资源，安装后可能需要按现有应用逻辑下载或选择引擎。正式对外发布前应由发布负责人确认这些文件是否必须补齐。

第一次失败留下 `release/win-unpacked.tmp/resources/default_app.asar`，该文件持续被 Windows 进程锁定，当前无法删除。它不是成功安装包的一部分，`release/` 也不提交 Git；锁释放或重启 Windows 后可删除整个 `release/win-unpacked.tmp`。

为释放 Electron 资源锁，打包时已关闭本仓库 `node_modules/electron/dist/electron.exe` 启动的开发窗口。需要继续开发时重新启动 Electron。

本轮没有实际安装 NSIS 包进行安装/卸载冒烟测试，只验证了 electron-builder 成功退出、安装器存在、大小、SHA-256、blockmap 和未签名状态。

## 8. 本地开发启动

主渲染器使用 2800，必须启用 Memfit 模式：

```powershell
# 窗口 1
$env:NODE_OPTIONS='--max-old-space-size=8192'
$env:PORT='2800'
yarn start-render-memfit

# 窗口 2，仅启动连接页未运行时需要
yarn start-link-render-memfit

# 窗口 3
$env:YAKIT_DEV_RENDERER_URL='http://127.0.0.1:2800'
yarn start-electron
```

普通 `start-render` 会进入通用 Yakit 页面，不是 AI SenPike。

## 9. 关键文件

数字员工配置与数据源：

- `app/renderer/src/main/src/pages/digitalEmployee/config.ts`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeContext.tsx`
- `app/renderer/src/main/src/pages/digitalEmployee/resolver.ts`

选择页与工作区：

- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeSelectPage.tsx`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeSelectPage.module.scss`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeWorkspace.tsx`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeWorkspace.module.scss`

聊天接入：

- `app/renderer/src/main/src/pages/ai-agent/aiChatWelcome/AIChatWelcome.tsx`
- `app/renderer/src/main/src/pages/ai-agent/template/template.tsx`
- `app/renderer/src/main/src/pages/ai-re-act/aiReActChat/AIReActChat.tsx`
- `app/renderer/src/main/src/pages/ai-agent/components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin.ts`

测试：

- `app/renderer/src/main/src/pages/digitalEmployee/__test__/DigitalEmployeeSelectPage.test.tsx`
- `app/renderer/src/main/src/pages/digitalEmployee/__test__/resolver.test.ts`

## 10. 关键提交

- `b52a3ae`：重做 AI SenPike 智能体广场 UI
- `127dc46`：首次按 Forge ID 解析数字员工
- `adc646f`：增加每页 8 张的横向轮播
- `63fee51`：中间实现，增加后端额外 Forge；其 ID 去重思路已被后续修正
- `2b9ec8c`：后端 Forge 列表成为员工数量唯一数据源，修复 8+N 问题
- `aa68128`：头像 3D 层次、三箭头、呼吸与跑马边框视觉增强

交接文档提交请以 `git log -1 --oneline` 为准。

## 11. 下一位接手者优先事项

1. 与后端确认 9 个 Forge 的最终顺序和 `ForgeVerboseName`，尤其是前 8 个是否与员工职责顺序一致。
2. 用真实引擎打开选择页，确认 9 张卡：第一页 8 张、第二页 1 张，按钮与圆点可切换。
3. 重点检查第 9 张卡的真实名称、描述、标签、复用头像和默认 Forge mention。
4. 人工查看选中卡跑马边框、呼吸效果、三箭头循环和头像立体感；Windows 截图接口此前返回 `SetIsBorderRequired failed (0x80004002)`，不要伪造截图结论。
5. 决定正式发布包是否必须补齐引擎 zip、engine-version 和 Chrome 插件 zip。
6. 如需对外分发，重新使用签名配置生成 Authenticode 已签名安装包。
7. 安装/卸载当前 NSIS 包做冒烟测试，确认首次启动、引擎选择/下载、配置目录和卸载清理行为。

## 12. 不要回退的设计决定

- 不要把员工数量重新写死为 8。
- 不要把静态 8 名员工与全部后端 Forge 直接相加。
- 不要依赖数据库 ID 必须是 1～8；展示顺序与真实 Forge ID 分离。
- 不要用普通 DOM 伪造默认技能标签；继续走原版 Milkdown mention 链路。
- 不要为卡片动画增加全局 JS 定时器或逐帧鼠标跟踪。
- 不要把 Memfit 主题样式覆盖到其他产品模式。
- 不要提交 `release/`、构建目录、依赖、日志或本机缓存。
