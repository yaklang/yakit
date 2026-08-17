---
name: commit-msg
description: 基于当前 git 暂存区（若为空则询问是否改用工作区 diff）生成一行 commit message，保持与 Yakit 仓库已有提交习惯一致。当用户要求写 commit message、提到"提交信息""commit msg""写个提交"等语境时触发。
---

# commit-msg

为 Yakit 仓库生成一行 commit message，对齐项目已有的提交风格。

> 核心原则：**commit message 不是对 diff 的逐文件罗列，而是对这次提交意图的压缩表达。**

## 输出要求

- **默认只输出最终一行 message**，不要输出多行分析、不要解释理由。
- 除非用户明确要求解释，否则不要附带任何说明文字。
- 若暂存区为空，先明确说明当前没有 staged changes，再用 `AskUserQuestion` 询问是否基于工作区 diff（`git diff`）生成；未获同意前不要凭空生成，也不要擅自改用工作区 diff。

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

## 执行步骤

1. **读取暂存区**：必须通过 `git diff --cached` 获取实际提交内容，不能只靠文件名猜测。若暂存区为空，先说明没有 staged changes，再用 `AskUserQuestion` 询问是否基于工作区 diff（`git diff`）生成；用户同意后再读工作区 diff，未同意则停止。
2. **检查仓库风格**：通过 `git log --oneline -10` 查看最近的提交风格、语言和习惯。
3. **归纳主语义**：找出本次提交的主要目的和影响范围，用一个更高层级的概括覆盖全部改动。
4. **对齐风格**：生成时贴合仓库已有 type/scope/语言习惯，而非机械套用 Conventional Commits。生成新提交时优先 `type: subject`，不要去改写历史里的其它格式。

## 边界情况

- **多类改动混在一起**：优先找主目的；若无单一主目的，则用更上层的概括（如 `refactor: 重构 XX 模块状态管理`）。
- **提交内容过于分散**：仍给出一个尽量诚实的一行 message，可使用较宽的概括。
- **暂存区为空**：先明确说明当前没有 staged changes，再用 `AskUserQuestion` 询问是否基于工作区 diff 生成。用户同意后基于 `git diff` 生成；未同意则停止，不要凭空生成。

## 禁止事项

- 不读 diff 就写 message。
- 只描述部分已 stage 文件而忽略其它。
- 输出多行分析说明（除非用户要求）。
- 为了套格式而违背仓库已有风格。
- 写超过 72 字符的冗长标题（除非很难避免）。
- 手写 `(#PR号)` 后缀——该后缀由 GitHub 合并 PR 时自动生成，本地 commit 不应包含。

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
