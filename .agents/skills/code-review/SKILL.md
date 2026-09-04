---
name: code-review
description: 对 Yakit 仓库的代码改动做规范化 code review：按代码逻辑、TS 定义、UI 引用与 Props、CSS 样式、依赖版本、配置项六个维度审查，检查测试用例缺失，强制执行 tsc 类型检查与 vitest 测试验证，输出「结果汇总 / 明细解释 / 合并结论」三块报告，经用户确认后写入文件。当用户要求 review、审查、评审代码改动，或在提交、合并、提 PR 前先检查代码时触发。审查对象可以是 PR 编号、分支 diff（含当前分支相对基线的改动）或工作区未提交改动。
---

# code-review

产出规范化三块式 review 报告。**只读**：不改被审代码，不运行被审代码本体；允许的命令只有 `yarn type-check` 与 `yarn test:vitest ... --run`。tsc / vitest 未实际跑过，报告中不得标 ✅，不得编造结果。发现问题不瞒报、不把功能 bug 降成警告。

## 触发

1. 语义：如「review」「审查这个 PR / 当前分支」「对比 master」「合并前检查」。
2. `/code-review`，可带参数（如 `/code-review review PR 4198`）。
3. 被其他 skill 调用（如 create-pr）：**已指定范围则直接执行，不弹框**。三块报告全文返回调用方；落盘仍须用户同意。

## 1. 确定审查对象

能确定的直接用，不要多问：

| 优先级 | 条件 | 模式 |
| --- | --- | --- |
| 1 | 含 PR 编号（「review 4198」「审查 #4198」） | PR |
| 2 | 含分支或基线（「review dev」「对比 feat-x」） | 分支 |
| 3 | 外部 skill 已指定 diff 范围 | 直接采用，不弹框 |
| 4 | 以上都没有 | `AskUserQuestion` |

弹框选项（question 注明「审查 PR 或其他基线请在 Other 中输入编号 / 分支名」）：当前分支 vs master；工作区未提交改动。

| 模式 | 获取改动 | 报告文件名（仓库根） |
| --- | --- | --- |
| PR | `gh pr view <编号> --repo yaklang/yakit --json title,headRefName,headRefOid,baseRefName,baseRefOid,files` + `gh pr diff <编号>`。必须记录 `baseRefOid` / `headRefOid` 供步骤 4 | `PR-<编号>-review.md` |
| 分支 | `git diff <基线>...HEAD` + `git log --oneline <基线>..HEAD`，基线默认 `master` | `<分支名>-review.md`（`/` → `-`） |
| 工作区 | `git diff HEAD` + `git status --short` 未跟踪新文件（读内容纳入审查） | `working-tree-review.md` |

gh 未安装或未登录：PR 模式报错并停止；若本地分支恰好对应该 PR，经用户确认后降级为分支模式。

## 2. 收集与分类

`git diff --stat`（或 PR files 列表）列出全部改动。分类：源码（ts/tsx/js/jsx）、测试、样式（less/css/scss）、依赖（package.json / yarn.lock）、配置、文档。**diff 为空 → 说明无改动并停止。** 文件 > 50：优先审源码/依赖/配置，样式与文案抽检，报告开头说明覆盖度。

PR 模式只有 diff 没有本地上下文：结合文件清单审；本地有对应分支则读本地补充，否则注明「仅基于 diff 审查」。验证仍须在 OID worktree 双跑，不用当前目录结果。

## 3. 六维检查

逐维度先读 [`references/check-dimensions.md`](references/check-dimensions.md) 对应节。

| # | 维度 | 触发 | 无涉及时 |
| --- | --- | --- | --- |
| 1 | 代码逻辑 | 有源码改动 | 汇总表标 ⏭️ N/A |
| 2 | TS 定义 | 有 ts/tsx 改动 | 同上 |
| 3 | UI 引用与 Props | 有组件 / props 改动 | 同上 |
| 4 | CSS 样式 | 有样式文件或 tsx 内样式改动 | 同上 |
| 5 | 依赖版本影响 | **仅当改动含 package.json** | ⏭️ N/A（无依赖改动） |
| 6 | 配置项影响 | **仅当改动含配置文件** | ⏭️ N/A（无配置改动） |

维度 5、6 不可放宽：无 package.json 不审依赖，无配置文件不审配置。N/A 行必须出现在汇总表，不许整行消失。配置文件：`tsconfig*.json`、vite/vitest、electron-builder、`.github/workflows/`、`scripts/`、`cli/`、`.env*`、`.husky/`、`.lintstagedrc` 等；package.json 的 `scripts` 段改动同时触发维度 5、6。

## 4. 强制验证（每次必做）

**工作区 / 分支**：在当前工作目录跑。

**PR 模式禁止在当前工作目录跑**（本地可能不是该 PR head）。必须 base / head 双快照：

1. 用步骤 1 的 `baseRefOid` / `headRefOid`，`git fetch origin <OID>`（用 OID，不用分支名）。
2. `git worktree add --detach <临时目录> <OID>` 建 head、base 两个隔离 worktree，不动用户当前状态。
3. 两处跑**完全相同**的 tsc / vitest；依赖未就绪则在对应子项目 `yarn cli install`，仍无法运行 →「环境异常降级」。
4. 结束后 `git worktree remove <临时目录>`。

**归因**：head 失败且 base 同项失败 → 基线遗留，**不记本 PR 的 P0**（注明「base 同样失败，非本 PR 引入」，可作警告）；head 失败且 base 通过 → ❌ P0；head 通过 → ✅。fetch / worktree 失败等无法构造快照 → 环境异常降级，**不得标 ✅，也不得用当前目录结果代替**。

### TS

对改动所在子项目跑整个子项目 type-check（不是单文件）：

| 改动位置 | 命令 |
| --- | --- |
| `app/renderer/src/main/` | `cd app/renderer/src/main && yarn type-check` |
| `app/renderer/engine-link-startup/` | `cd app/renderer/engine-link-startup && yarn type-check` |
| 仅 `app/main/` 或不含 TS 子项目 | 跳过，注明原因（主进程纯 JS 无 tsconfig / 本次无 TS） |

通过 → 1 条 ✅；失败 → 1 条 ❌ P0（附 `文件:行号` 摘要）；PR 模式 head 失败但 base 同样失败不记 P0。

### 测试

与 CI（`scripts/ci-select-vitest-tests.js`）相同的三条规则选相关测试：

1. 变更文件本身是 `__test__/` 下 `*.test.*` / `*.spec.*` → 纳入；
2. 业务文件同目录 `__test__/<stem>.(test|spec).*` 存在 → 纳入；
3. `__test__/` 用例 import 了某个变更模块（grep 路径 / `@renderer` / `@engine` 等）→ 纳入。

仓库根执行（PR 模式在 base / head worktree 各跑相同命令）：

```bash
yarn test:vitest <测试文件...> --run
```

全通过 → 1 条 ✅（注明文件数与用例数）；有失败 → 每个失败用例 ❌ P0（用例名 + 断言摘要）；PR 模式 base 同样失败的不记 P0。找不到相关测试 → 汇总表「⏭️ 无相关测试」。

### 环境异常降级

tsc / vitest 因环境无法运行（依赖未装、node 版本等），而非代码报错：汇总表标 ⚠️「验证环境异常」，提示 `yarn cli install`。**既不得标 ✅，也不得算代码问题。** PR 模式无法构造快照时同样降级。

## 5. 测试用例缺失

需要用例：新增/修改逻辑分支、纯工具函数、状态转换、复杂组件交互、bug 修复（防回归）。不需要：纯样式、纯文案/i18n、类型声明、构建/CI 配置本身。

需要但同目录无 `__test__/<stem>.test.*` → ❌ **P1「缺失测试用例」**，建议路径 `<业务目录>/__test__/<stem>.test.ts`。

## 严重程度

| 级别 | 含义 | 典型 | 对结论 |
| --- | --- | --- | --- |
| ❌ P0 | 必须修复 | 安全漏洞、明确功能 bug、TS/测试验证失败 | 存在即不通过 |
| ❌ P1 | 需要修复 | 边界缺陷、props 与定义不符、缺失测试 | 存在即需要修复 |
| ⚠️ 警告 | 不阻塞 | 风格偏离、冗余、命名、依赖升级缺动机 | 不影响结论 |

## 6. 输出三块报告

先在对话完整输出，再 `AskUserQuestion` 是否写入本地文件（文件名见步骤 1）；同意才写，不同意仅留在对话。布局：

````markdown
# Code Review 报告：<PR 标题 / 分支名 / 工作区改动>

## 一、Review 结果汇总

| 检查项 | 结果 |
| --- | --- |
| 代码逻辑检查 | ✅ / ❌ / ⏭️ N/A |
| TS 定义检查 | ✅ / ❌ / ⏭️ N/A |
| UI 引用与 Props 检查 | ✅ / ❌ / ⏭️ N/A |
| CSS 样式检查 | ✅ / ❌ / ⏭️ N/A |
| 依赖版本影响检查 | ✅ / ❌ / ⏭️ N/A（无 package.json 改动） |
| 配置项影响检查 | ✅ / ❌ / ⏭️ N/A（无配置文件改动） |
| TS 验证（tsc） | ✅ 通过 / ❌ 失败 / ⚠️ 环境异常 / ⏭️ 跳过（原因） |
| 测试验证（vitest） | ✅ N 个文件全通过 / ❌ 失败 / ⏭️ 无相关测试 |
| 测试用例缺失检查 | ✅ 齐全 / ❌ 缺失 N 处 |

**统计：正确 X 项 / 问题 Y 项（P0 a 项 / P1 b 项）/ 警告 Z 项**

## 二、明细解释

> 每项固定两行：第一行定位，第二行缩进两格写原因。第一行末尾两个空格（markdown hard break；下方 `··` 表示这两个空格，不要真写点号）。不得并成一行，也不得超过两行；细节压缩进第二行。

### ✅ 正确项

- 内容描述（确认了什么）··
  原因结果（为什么正确 / 验证依据）

### ❌ 问题项

行号必须写（函数定义行等）；缺测试用关键函数行号。不允许只写路径。

- [P0] `文件:行号`··
  原因结果：<问题是什么> → <修复建议>
- [P1] `文件:行号`··
  原因结果：<问题是什么> → <修复建议>

### ⚠️ 警告项

- `文件:行号` 或 <一句话标题>··
  原因结果：<说明与建议>

## 三、合并结论

**结论：不通过 / 需要修复 / 可以合并**

<只允许这三种，不得出现「修复后可合并」等中间态>
````

统计：维度整体通过计 1 条正确项；每个问题/警告各 1 条；tsc / vitest 通过各 1 条正确项。⏭️ N/A 与 ⚠️ 环境异常不计入三项统计。

| 情况 | 结论 |
| --- | --- |
| 任一 P0 | 不通过 |
| 无 P0，有 P1 | 需要修复 |
| 仅警告或全部正确 | 可以合并 |
