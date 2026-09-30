---
name: commit-msg
description: 为 Yakit 仓库完成一次本地提交：确定提交范围（暂存区优先，空则弹框确认）、基于 diff 归纳一行符合仓库风格的 message、commit 前弹窗确认、执行 git commit（不推送）。只要 message 时仅输出文本。用户说「提交」「commit 代码」或输入 /commit-msg，或被 create-pr 等 skill 调用时使用。
---

# commit-msg

确定范围 → 把提交意图压成一行 message → 弹窗确认 → `git commit`。message 是意图概括，不是逐文件罗列。

## 调用

| 情况 | 行为 |
| --- | --- |
| 默认（语义触发、`/commit-msg`、被其他 skill 调用） | 完整流程 |
| 「仅要 message」（含「写 / 生成 commit message」「写个提交信息」类措辞） | 只输出一行 message，不改仓库 |
| 已给出 message（如「用 fix: xxx 提交」） | 跳过生成，仍检查提交范围并按确认规则提交 |

交互使用当前环境可用且允许用于该用途的工具（如 `AskUserQuestion` / `request_user_input_async`）；没有合适工具时，在对话中询问。异步问题未收到回答不算确认。当前会话已明确授权的同一范围与操作不重复询问；仅提供 message 不代表授权暂存全部改动。

## 终态

供用户与调用方（如 `create-pr`）核验。`create-pr` 仅在 `COMMITTED` 且实测 HEAD 前移、`git diff --cached` 为空时继续。

| 终态 | 含义 |
| --- | --- |
| `COMMITTED` | 成功；附 SHA 与文件清单；HEAD 已前移、暂存区已清空 |
| `CANCELLED` | 用户取消；核验并报告 HEAD 是否变化及暂存区/工作区实际状态。已同意的暂存操作可能已完成，保留其结果，不自动撤销 |
| `FAILED` | 暂存、commit 或提交后核验失败；附报错原文或未通过的检查，以及当时 HEAD、index/工作区状态。hook 可能留下部分改动，不得谎称已恢复 |

## 流程

「仅要 message」先分流：只读分析 `git status --short` 与 `git diff --cached`；有暂存内容时以暂存区为准，否则读取工作区 diff 及未跟踪文件内容。没有改动则说明并停止；有改动则完成第 2–3 步后只输出 message，跳过所有暂存、确认与提交步骤。

1. **读暂存区**：记录 `git rev-parse HEAD`，读取 `git status --short` + `git diff --cached`，不能只靠文件名。
   - 暂存区非空：只提交暂存内容，不要 `git add` 其它未暂存改动。
   - 暂存区空、工作区有改动：**CHECKPOINT — 暂存范围**：展示文件清单，确认「暂存全部改动，继续预览提交信息」（`git add -A`）／「取消，不提交」。未同意前不 `git add`。取消 → `CANCELLED`。暂存失败 → `FAILED`，停止；成功后重新读取暂存 diff 与文件清单。
   - 都空：报告无可提交改动并停止，不返回 `COMMITTED`。
2. **对齐风格**：`git log --oneline -10`。贴近仓库习惯，不要强套 Conventional Commits；新提交优先 `type: subject`。
3. **归纳主语义**：覆盖选定范围全部改动的一个更高层概括。多类改动找主目的；过散也给一行诚实概括。
4. **CHECKPOINT — 提交确认**：展示 message + 文件清单，「确认提交」／「取消」。Other 输入视为修改 message，重新展示并确认，不把修改本身当作提交确认。未获得覆盖当前范围与 message 的明确授权不得 `git commit`。取消 → `CANCELLED`。
5. **提交与核验**：
   - 提交前重新读取 HEAD 与暂存 diff，确认暂存区非空且范围、内容与已确认版本一致；若变化，重新归纳并确认；若已空，报告无可提交改动并停止。
   - 记录提交前 HEAD，message 写入临时文件后 `git commit -F <文件>`，无论成功或失败都删除该临时文件。**禁止 `git commit -m "..."`**（反引号 / `$()` / 引号会破坏 shell）。
   - 随后用 `git rev-parse HEAD`、`git diff --cached` 与 `git status --short` 核验；只有命令成功、HEAD 已前移且暂存区为空才返回 `COMMITTED`，附 SHA 与 `git show --format= --name-only HEAD` 得到的实际提交文件清单。命令或核验失败 → `FAILED`（报错原文或检查结果 + 实际 git 状态），明确是否已产生提交，不隐藏、不自动重试。
6. **不推送**。

## Message 规范

`<type>: <subject>` 或 `<type>(<scope>): <subject>`。无明确 scope 则省略（Yakit 多数无 scope）。

- 祈使语气（添加 / 修复 / 更新 / 优化），中文为主，术语/组件名保留英文。
- 无句号；尽量 ≤72 字符（中文按 2 计）。
- 禁止 WIP、misc、update files、修改、调整；不要手写 `(#PR号)`（GitHub 合并 PR 时自动加）。

| type | 用途 |
| --- | --- |
| `feat` | 新功能 / 页面 / 选项 |
| `fix` | 用户可见行为修正 |
| `perf` | 性能 |
| `refactor` | 重构（行为不变） |
| `style` | 样式 / UI（无逻辑变化） |
| `docs` | 文档（含 AGENTS.md、README、注释） |
| `test` | 测试 |
| `build` | 构建 / 依赖 / Vite / electron-builder |
| `ci` | CI |
| `chore` | 脚本、工程化、版本号 |

scope 例：`webfuzz`、`agents`、`renderer`、`electron`、`aiAgent`、`License`。

## 示例

```
feat: 添加支持多子Agent的配置选项
fix: 暗色主题下关闭记事本时内容区闪白
docs(agents): 完善启动指南的依赖检查与用户决策弹框交互
build(renderer): 将主渲染端与 Link 从 CRA/Vite6 迁移至 Vite 8
```
