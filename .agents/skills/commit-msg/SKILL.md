---
name: commit-msg
description: 为 Yakit 仓库完成一次完整的本地提交：确定提交范围（暂存区优先，空则弹框确认）、基于 diff 归纳一行符合仓库风格的 message、commit 前弹窗确认、执行 git commit（不推送）；只要 message 时仅输出文本。
---

# commit-msg

为 Yakit 仓库生成**完整的 commit**：确定提交内容 → 归纳意图生成一行 message → 弹窗确认 → 执行 `git commit`。

> 核心原则：**commit message 不是对 diff 的逐文件罗列，而是对这次提交意图的压缩表达。**

## 调用与边界

**本 skill 支持语义触发**：用户用自然语言要求提交（「提交」「帮我提交一下」「commit 代码」）、输入 `/commit-msg`，或被其他 skill（如 `create-pr`）通过 Skill 工具调用时执行。

| 调用方式 | 行为 |
| --- | --- |
| 任意方式触发（语义触发、`/commit-msg`、被其他 skill 调用） | 走完整流程：确定提交范围 → 生成 message → 弹窗确认 → 执行 commit |
| 触发且说明「仅要 message」 | 只生成一行 message 输出给用户，**不执行任何 git 命令改动仓库** |
| 触发且提供了 message 内容（如「用 fix: xxx 提交」） | 不再生成，直接进入弹窗确认按给定 message 执行 commit |

## 提交流程

1. **读取暂存区**：通过 `git status --short` 与 `git diff --cached` 获取实际提交内容，不能只靠文件名猜测。
   - 暂存区**非空**：直接基于暂存区内容提交（**不要顺手 `git add` 工作区其它未暂存改动**）。
   - 暂存区**为空**、工作区有改动：先用 `AskUserQuestion` 弹框询问——「暂存全部改动并提交」（`git add -A`）／「取消，不提交」；未获同意前不要擅自 `git add` 或凭空生成。
   - 暂存区与工作区都为空：说明没有可提交的改动，停止。
2. **检查仓库风格**：通过 `git log --oneline -10` 查看最近的提交风格、语言和习惯。
3. **归纳主语义**：找出本次提交的主要目的和影响范围，用一个更高层级的概括覆盖全部改动。
4. **弹窗确认**：执行 commit 前用 `AskUserQuestion` 向用户展示**生成的 message 与本次提交的文件清单**，选项：「确认提交」／「取消」；用户通过 Other 输入新 message 时，改用新 message 提交。**未获用户确认前不得执行 `git commit`**。
5. **执行提交**：`git commit -m "<确认后的 message>"`。提交后如实报告结果；commit 失败（如 pre-commit hook 拒绝）时原样展示报错，不隐藏、不重试掩盖。
6. **禁止推送**：本 skill 只到 commit 为止，**不执行 `git push`**（推送由用户或 `create-pr` skill 决定）。

## 格式规范

单行标题，优先使用以下两种格式之一：

- `<type>(<scope>): <subject>`
- `<type>: <subject>`

标题规则：

- 使用祈使语气，如 `添加` / `修复` / `更新` / `优化`。
- **中文描述为主**（对齐 Yakit 仓库主流习惯），技术术语/配置项/组件名保留英文。
- 结尾无句号。
- 尽量控制在 72 个字符内（中文字符按 2 计）。
- 禁止出现 WIP、misc、update files、修改、调整 等空泛表述。
- **不要手写 `(#PR号)` 后缀**：该后缀由 GitHub 合并 PR 时自动生成，本地 commit 不应包含。

## Type 列表

| type | 用途 |
| --- | --- |
| `feat` | 新增功能 / 新页面 / 新选项 |
| `fix` | 修复问题（优先用于有用户可见行为修正的改动） |
| `perf` | 性能优化 |
| `refactor` | 重构（不改变外部行为） |
| `style` | 样式 / UI 调整（无逻辑变化） |
| `docs` | 文档改动（含 AGENTS.md、README、注释说明） |
| `test` | 测试改动 |
| `build` | 构建工具链、依赖、Vite/electron-builder 配置 |
| `ci` | CI 流程改动 |
| `chore` | 杂项（脚本、工程化、版本号 bump 等） |

> 不要强行把所有提交都写成严格的 Conventional Commits，需优先贴近仓库已有习惯。生成新提交时优先 `type: subject`，不要去改写历史里的其它格式。

## Scope 约定

- 改动集中在某个模块/页面时，用模块名：`webfuzz`、`agents`、`renderer`、`License`、`记事本`、`aiAgent` 等。
- 改动集中在某类构建/工具时，用 `renderer`、`electron`、`scripts` 等。
- **若没有明确 scope，允许省略**（Yakit 多数提交无 scope）。

## 边界情况

- **多类改动混在一起**：优先找主目的；若无单一主目的，则用更上层的概括（如 `refactor: 重构 XX 模块状态管理`）。
- **提交内容过于分散**：仍给出一个尽量诚实的一行 message，可使用较宽的概括。
- **只描述部分已 stage 文件而忽略其它**：不允许——message 必须覆盖暂存区全部改动。

## 禁止事项

- 不读 diff 就写 message。
- 只描述部分已 stage 文件而忽略其它。
- 用户只要 message 时擅自执行 commit。
- **未经弹窗确认就执行 `git commit`**。
- 为了套格式而违背仓库已有风格。
- 写超过 72 字符的冗长标题（除非很难避免）。
- 手写 `(#PR号)` 后缀——该后缀由 GitHub 合并 PR 时自动生成，本地 commit 不应包含。
- 执行 `git push` 或任何超出「确定范围 → 生成 message → commit」之外的仓库改动。

## 示例

以下是 Yakit 仓库真实提交，可作为 type / scope / 语言风格的参考。**注意：末尾的 `(#xxxx)` 是 GitHub 合并 PR 时自动生成的，本地 commit 不应手写此后缀。**

```
fix: 记事本代码块改为不固定高度，根据内容伸缩 License管理的编辑弹窗样式有问题 (#4112)
feat: 添加支持多子Agent的配置选项 (#4111)
feat: irify加记事本入口
fix: 暗色主题下关闭记事本时内容区闪白
fix(webfuzz): stop echoing request body in response when chunked transfer is enabled (#4100)
build(renderer): 将主渲染端与 Link 从 CRA/Vite6 迁移至 Vite 8 (#4095)
docs(agents): 完善启动指南的依赖检查、稳健启动流程与用户决策弹框交互 (#4104)
feat: 新增快捷键切换二级tab页 (#4103)
```

本地实际生成的 message 应类似（无 PR 后缀）：

```
fix: 记事本代码块改为不固定高度，根据内容伸缩
feat: 添加支持多子Agent的配置选项
docs(agents): 完善启动指南的依赖检查与用户决策弹框交互
```
