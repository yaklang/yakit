# AI Senso 最终检查与 GitHub 交接（2026-11-06）

第三批最后七项及复核报告中的六组补迁已实施；浏览器已移动至“任务内容 / 文件系统 / 技能”同栏。新产物已按用户明确要求激活，使用原启动脚本启动；用户确认“正常显示，浏览器位置正确”。当前客户端保持运行，本次最终检查没有再次重启或操作窗口。

## 最终验证

- 相关回归：**100 文件、622 条通过、1 条原有 Windows 符号链接用例跳过**，退出码 0。按 assertionResults 计数，不能把 Vitest 顶层含 skipped 的数字当成通过数。
- 主渲染 `tsc --noEmit` 退出码 0；最终检查与测试串行，没有与 webpack 同时运行。
- 已有独立静态构建退出码 0，产物 `.codex-run/parity-main-20261105-ready` 已激活至 `app/renderer/pages/main`；入口资源 30 项、九份 locale 和 11 张参考引导图片校验通过。页面显示和按钮位置的验收证据来自用户，而非仅 HTTP / PID。
- 构建关闭 Fast Refresh 的转换与运行时，并关闭独立预览的 source map。最终构建峰值 RSS 2.73 GiB，最低空闲 2.37 GiB；构建器已退出。首次尝试因空闲不足触发保护，仅退出自己的编译器；失败目录 `parity-main-20261105`、`parity-main-20261105-no-map` 不得用于激活。
- 素材体积检查、差异空白检查及提交范围中的凭据模式检查通过；无依赖 / 锁文件升级，没有引擎变更。

可复现的 [测试清单](../validation/memfit-final-review-2026-11-06.test-files.json) 和 [验证摘要](../validation/memfit-final-review-2026-11-06.json) 已纳入仓库。完整日志位于本机 `.codex-run/final-review-20261106-tests.json` / `.log` 和 `final-review-20261106-tsc.log`。本机产物、日志和启动助手不作为源码提交。

```powershell
$testFiles = Get-Content docs/validation/memfit-final-review-2026-11-06.test-files.json | ConvertFrom-Json
node --max-old-space-size=2048 node_modules/vitest/vitest.mjs run @testFiles --threads=false
node --max-old-space-size=2560 app/renderer/src/main/node_modules/typescript/bin/tsc --noEmit --project app/renderer/src/main/tsconfig.json
```

## 已知运行边界

当前连接的引擎实际返回 `unsupported schema: browser-extension`（`BrowserExtensionRequest / RequestYakURL`）。浏览器面板位置已验收，但配对 / 设备通道 / 截图等依赖该 schema 的正向链路不能记为实机通过。由引擎同事核对支持 / 启用情况；没有因此修改、下载、替换或编译引擎。YTray 独立历史路径不因该错误被隐藏。

其余队列、技能、模型、推荐场景等真实引擎验收仍按用户实测记录。定时任务 RPC 缺少执行关联 ID 的既有限制保持：歧义时提示，不能随意打开最新会话。

## 后续入口与约束

- [本轮实现记录](2026-11-05-core-parity-completion.md)、[逐按钮测试入口](../MEMFIT_MANUAL_TEST_GUIDE.md#核心补迁六组与浏览器位置2026-11-05)。
- 固定参考 SHA `9fc639fbb677eaa538132b2afa749555b3b14791`，参考工作树干净；不追随新 HEAD、不整仓合并。保留品牌、数字员工 / Forge、附件、历史、授权和文件权限。
- 当前主分支 `main`，提交前基线 `8cb79ea04`。用户已明确授权本轮最终检查后提交并推送 GitHub；具体提交号以 Git 日志和交付消息为准，本文不嵌入自身提交哈希。
- 提交仅含源码、测试、文档、构建助手与参考引导素材，保留且不纳入 `outputs/`、`2140`、`2672`、`2852`、`3460`，不提交引擎、依赖目录、运行日志或编译产物。
- 不再自行重启或操作客户端。有反馈先修复回归。再次启动时沿用静态 18080 → 确认 19080 → 原普通 Electron 脚本的顺序；确认无编译器占内存、九份 locale 一致、产物无未绑定 Refresh 调用。
- Windows 的 `aux.bundle.js` 属于保留名称边界，资源读取 / 复制 / SHA 校验使用 Node fs，不对它使用 PowerShell Get-FileHash / Copy-Item；语言 JSON 可用普通路径检查。
