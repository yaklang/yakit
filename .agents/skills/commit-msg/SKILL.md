---
name: commit-msg
description: 为 Yakit 仓库完成一次本地提交：确定提交范围（暂存区优先，空则弹框确认）、基于 diff 按改动类型归纳中文 message（每种类型一行）、commit 前弹窗确认、执行 git commit（不推送）。只要 message 时仅输出文本。用户说「提交」「commit 代码」或输入 /commit-msg，或被 create-pr 等 skill 调用时使用。
---

# commit-msg

确定范围 → 按改动类型概括 message，每种类型一行中文 → 弹窗确认 → `git commit`。message 是意图概括，不是逐文件罗列；多行 message 仍用于同一次提交。

## 调用

| 情况 | 行为 |
| --- | --- |
| 默认（语义触发、`/commit-msg`、被其他 skill 调用） | 完整流程 |
| 「仅要 message」（含「写 / 生成 commit message」「写个提交信息」类措辞） | 只输出 message 文本，每种类型一行，不改仓库 |
| 已给出 message（如「用 fix: xxx 提交」） | 跳过生成，直接弹窗确认后 commit |

## 终态

供用户与调用方（如 `create-pr`）核验。`create-pr` 仅在 `COMMITTED` 且实测 HEAD 前移、`git diff --cached` 为空时继续。

| 终态 | 含义 |
| --- | --- |
| `COMMITTED` | 成功；附 SHA 与文件清单；HEAD 已前移、暂存区已清空 |
| `CANCELLED` | 用户取消任一弹窗；未改 git 状态 |
| `FAILED` | commit 失败（如 hook 拒绝）；附报错原文与当时 index/工作区状态。hook 可能留下部分改动，不得谎称已恢复 |

## 流程

1. **读暂存区**：`git status --short` + `git diff --cached`，不能只靠文件名。
   - 暂存区非空：只提交暂存内容，不要 `git add` 其它未暂存改动。
   - 暂存区空、工作区有改动：`AskUserQuestion`「暂存全部改动并提交」（`git add -A`）／「取消，不提交」。未同意前不 `git add`。取消 → `CANCELLED`。
   - 都空：停止。
2. **对齐风格**：`git log --oneline -10`。贴近仓库习惯，不要强套 Conventional Commits；新提交优先 `type: subject`。
3. **按类型归纳语义**：检查暂存区全部改动并按实际意图分类。单一类型生成一行中文 message；同时存在 feat、fix、refactor 等多个类型时，每种类型各占一行，同类改动合并概括，不为同一项改动重复列出多个类型。
4. **弹窗确认**：`AskUserQuestion` 展示完整 message（保留换行）+ 文件清单，「确认提交」／「取消」。Other 输入视为新 message。未确认不得 `git commit`。取消 → `CANCELLED`。
5. **提交**：将完整 message 按实际换行写入临时文件后 `git commit -F <文件>`，再删临时文件。**禁止 `git commit -m "..."`**（反引号 / `$()` / 引号会破坏 shell）。成功 → `COMMITTED`（SHA + 文件清单）。失败 → `FAILED`（报错原文 + 实际 git 状态），不隐藏、不重试掩盖。
6. **不推送**。

## Message 规范

每行使用 `<type>: <subject>` 或 `<type>(<scope>): <subject>`。无明确 scope 则省略（Yakit 多数无 scope）。

- 单一类型保持一行；多种类型直接换行分隔，每种类型一行，主要改动放在第一行。
- 祈使语气（添加 / 修复 / 更新 / 优化），中文为主，术语/组件名保留英文。
- 每行无句号，尽量 ≤72 字符（中文按 2 计）。
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

单行 message 示例（每行分别代表一次提交）：

```
feat: 添加支持多子Agent的配置选项
fix: 暗色主题下关闭记事本时内容区闪白
docs(agents): 完善启动指南的依赖检查与用户决策弹框交互
build(renderer): 将主渲染端与 Link 从 CRA/Vite6 迁移至 Vite 8
```

同一次提交包含多个类型时：

```
feat: 添加 AI 会话连接取消与重试功能
fix: 修复关闭会话时丢失排队消息的问题
refactor: 提取共享的会话启动逻辑
```
