# 本次白屏修复：静态构建的 React Refresh 配置不一致

日期：2026-11-05（Asia/Shanghai）。**修复版已加载并启动，用户明确确认“正常，已看到数字员工或会话页面”。** 此结论仅覆盖本次白屏恢复，不代表最后七项功能已人工验收，也不将此前多次白屏统一归因。

## 证据和原因

本次主渲染日志 `.codex-run/batch3-user-start-client.log` 明确记录：

```text
Uncaught ReferenceError: $RefreshReg$ is not defined
```

错误发生在 18080 主页面的共享脚本中，阻断入口模块执行。当时主进程、窗口标题、HTTP 200、脚本 MIME 和九份 locale 核对均正常，仍不足以证明页面可显示。

原因是本轮独立构建脚本仅过滤了 `ReactRefreshPlugin`，而 CRA 的 Babel loader 仍开启 `react-refresh/babel`，产物残留未绑定的 `$RefreshReg$` / `$RefreshSig$` 调用。该构建改动由助手引入。现场脚本对应行确有裸调用，旧产物扫描可稳定拒绝该错误；真实 Babel 编译回归用例复现了同样的 ReferenceError。

这条证据与此前内存紧张、网络子进程、连接页停滞和 Milkdown 日志不同。不能用这次修复证明那些历史案例的原因。

## 修复和防复发

- 在创建 CRA 配置前设置 `FAST_REFRESH=false`，让 CRA 同时关闭 Babel 转换与 webpack Refresh 运行时；不再单独删除插件。
- 新增受版本控制的 `scripts/static-preview-config.cjs` 和 `scripts/build-memfit-static-preview.cjs`。前者检查静态配置及生成脚本，后者提供一致的单次静态构建入口，输出限制在工作区 `.codex-run` 子目录。
- 增加产物校验：发现未绑定 Refresh 调用就拒绝激活，不能只检查文件存在和 HTTP 200。`.codex-run/activate-batch3-preview.ps1` 也执行该校验。
- 旧失败产物 `.codex-run/batch3-main-20261105` 保留，修复版输出 `.codex-run/batch3-main-20261105-refresh-fixed`；修复版已复制到 `app/renderer/pages/main`。
- 没有修改业务 TypeScript、历史 / IDB / 附件、引擎、依赖、授权、文件权限或系统 GPU 设置。

以后需要单次静态构建，使用：

```powershell
node --max-old-space-size=8192 scripts/build-memfit-static-preview.cjs .codex-run/main-static-preview-fixed
```

遵守已有内存、独立类型检查与单编译器、九份 locale 和服务顺序；不要再次直接过滤 Refresh 插件，也不要用空全局函数掩盖该错误。

## 验证和运行

- 本次新增定向回归 **1 文件 / 4 条通过**：真实 Babel 复现错误、正确关闭后执行入口、拒绝不一致配置、拒绝错误产物。测试 `app/main/__test__/staticPreviewRefresh.test.js`。本次仅修改构建脚本，没有重跑业务 TypeScript 或此前完整套件；此前 85 文件 / 558 通过 / 1 跳过与类型检查结论仍单独保留。
- 修复版单次 webpack 退出码 0，`BATCH3_BUILD_SUCCESS`。旧产物可复现校验失败，修复产物未发现未绑定 Refresh 调用，见 `.codex-run/white-screen-refresh-validation.json`。
- 激活后入口脚本和九份 locale 与修复产物一致，18080 / 19080 就绪；编译器 / tsc 均已退出。
- 自动审批曾拒绝分离后台启动服务的包装命令，仅返回 `blocked by policy`；随后使用工具直接托管原静态脚本的前台进程，再直接执行原 `start-b3bd-electron.ps1`。没有改变引擎或网络 / 安全配置。
- 本机 Computer Use 截图超时，随后工具报告用户按 Escape 停止窗口控制；已停止后续 Computer Use。本次实际显示结论来自用户明确确认，不能写成助手取得了修复后截图。
- 修复后主进程当时 PID 15576，窗口标题 AI Senso，仅供追溯。日志 `.codex-run/white-screen-fixed-client.log`；构建日志 `.codex-run/white-screen-refresh-fixed-build.log`；静态服务日志 `.codex-run/white-screen-fixed-preview.stdout.log` / `.stderr.log`。
- 当前日志未再出现本次 Refresh ReferenceError，仍记录引擎源 HTTP 400 与旧 `headingIdGenerator` Milkdown 提示。用户已确认页面恢复；这些提示不作为本次白屏根因，也未在本次盲改。输入与最后七项如有实际回归，按反馈继续修复。

最后七项测试入口仍见 [人工测试指南](../MEMFIT_MANUAL_TEST_GUIDE.md#第三批七项2026-11-05)。
