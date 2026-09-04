---
name: create-pr
description: 为 Yakit 仓库一站式完成提 PR 流程：提交工作区改动、调用 code-review skill 评审、推送远端后在 yaklang/yakit 创建或更新 PR。当用户要求提 PR、提交 PR、创建 PR、发 PR、raise/submit/open PR、"create PR"、更新已有 PR，或使用 /create-pr 时触发。
---

# create-pr

一站式：**commit → code review → push → 创建/更新 PR**。调用即授权 push / 创建 PR，不再逐步确认；commit 仍走 `commit-msg` 弹窗。不要整理历史 commit、改写远端、force push、合并 PR。

**不支持 fork**：origin 必须是 `yaklang/yakit`（PR 建在 `--repo yaklang/yakit`）。origin 指向个人 fork 时第 1 步停止，提示自行推送并用网页创建 PR。

## 输入（均可选，可同时出现）

从用户原文识别，不要追问、不要猜测、不要搜索：

1. **合并方式**：`merge` / `squash` / `rebase` 或「合并提交 / 压缩合并 / 变基合并」。有则直接用，不走自动规则。
2. **关联**：本仓库 issue（`close` / `fix` / `ref #xxxx`）与其它仓库 PR URL（如 yaklang 引擎）。**仅用户明确提供时写入**。都没有则「关联 Issue / PR」填 `None`。

## 1. 前置检查

- `git branch --show-current`：**在 master 上停止**。
- `git remote -v`：origin 必须是 `yaklang/yakit`，否则停止（fork 按上方提示）。
- **gh**：`command -v gh` + `gh auth status`（PowerShell：`Get-Command gh`）。已装且已登录则继续；否则走下方降级，**不要直接停止**。
- **`code-review` skill 必须存在**（第 3 步强制依赖；外部指定范围时直接执行、不弹框）。不存在则**立即停止**，不要自行评审——此时尚未 commit / push。
- `git fetch origin master`；PR base 固定 `master`。
- `git status` + `git log origin/master..HEAD --oneline` 摸底。无 commit 且工作区无改动 → 停止。

### gh 降级（未安装或未登录）

`AskUserQuestion` 二选一（question 说明当前 gh 状态）；Other 取消则停止：

- **安装并登录 gh**：macOS `brew install gh`；Windows `winget install GitHub.cli`（或 scoop / choco）；Linux 提示官方安装。装完让用户自行 `gh auth login`（交互式，agent 不能代办），确认后**回到第 1 步重检**。安装或登录失败则停止。
- **手动创建 PR**：第 1–6 步照常，第 7 步改「手动模式」（不跑任何 `gh`）。

## 2. 处理工作区改动

`git status`（含未跟踪）。干净则跳过，不空提交。有未提交改动时**不要直接提交**，`AskUserQuestion`（概述如「3 个已修改 + 1 个未跟踪」）；Other 取消则停止：

- **提交为一个 commit**：`git add -A`，生成**一个** commit。优先 Skill 调用 `commit-msg`；会话无该 skill 时按其规范自行做（弹窗确认 → message 写临时文件 → `git commit -F`；`type: subject`、中文为主、72 字符内、不带 `(#PR号)`，基于 diff 归纳）。**终态核验**：仅当 `COMMITTED` 且 `git rev-parse HEAD` 已前移、`git diff --cached` 为空才进第 3 步；`CANCELLED` / `FAILED` 或核验不符 → **停止整个流程**，不得带着旧 HEAD 评审或推送。
- **stash 暂存**：`git stash push -u -m "create-pr: 暂存未提交改动"`。本次 PR 不含这些改动；报告 stash 已创建，**不要自动 `stash pop`**。

## 3. 代码评审（强制，推送前）

对象：`git diff origin/master...HEAD`（第 2 步之后的最终 HEAD）。只读：只记录问题，不顺手修（含 P0）。

- 评审开始记录 `git rev-parse HEAD` 完整 SHA。
- **必须 Skill 调用 `code-review`**，范围为本分支 vs `origin/master`（已指定范围，不弹框）。会话中途没有该 skill → 停止，不要自行评审。
- 从报告提取：P0+P1 全部（警告不写入 PR）→「建议合并前修复的问题」；「三、合并结论」的结论（不通过 / 需要修复 / 可以合并）与统计行 →「代码评审结论」（必需）。每条问题记 `文件:行号` + 一句话。结论只能来自实际 code-review 输出，不得编造。

## 4. 推送远端

- 推送前再 `git rev-parse HEAD`，与第 3 步 SHA 一致才继续；不一致则停止。
- **禁止裸 `git push`**。执行 `git push -u origin HEAD:refs/heads/<当前分支>`（显式 origin；分支名含 shell 元字符时安全引用）。
- 推送后：`git ls-remote origin refs/heads/<当前分支>` 的 OID == 本地 HEAD，否则停止。
- push 被拒（远端有本地没有的提交）：停止，不要 pull / rebase / force push。

## 5. 生成 PR 标题与描述

**标题**（`git log origin/master..HEAD` 全部 commit，**不用分支名**）：`type: subject`，与 `commit-msg` 一致（中文为主、无句号、不带 `(#PR号)`、尽量 72 字符、中文按 2 计）。单 commit 用该标题；多 commit 归纳主语义（type：feat/fix/docs/style/perf/refactor/test/build/ci/chore）。

更新已有 PR：旧标题 == 分支名 → 换成总结标题；旧标题 ≠ 分支名 → **保留旧标题**。

**描述**：先读 `.github/PULL_REQUEST_TEMPLATE.md`（不要默写），按模板填，可删 HTML 注释但**保留全部小节**。模板不存在时用 [`references/pr-examples.md`](references/pr-examples.md) 的约定结构；「合并方式」仍须三项 checkbox，不得写成单行。无法从 diff / log / 用户输入确认的信息标「待补充」，创建前向用户说明。正例与同步示例见该 references。

- 改动类型：按 diff 主目的勾 `- [x]`（与 commit type 一致）。
- 🔗 关联 Issue / PR：用户明确提供的 issue（`close` / `fix` / `ref #xxxx`）与跨仓库 PR URL；都没有填 `None`。不要编造编号或链接。
- 💡 背景与方案：原先问题 → 本次做法；基于全量 diff，不逐文件罗列。
- 影响范围：用户可见行为变化；纯重构写「不改变用户可见行为」；UI 变化建议附截图。
- 合并方式：勾选第 6 步选定的一项。

**模板外追加**（插在「影响范围」之后、「合并方式」之前）：

```markdown
## 代码评审结论

**结论：需要修复**（正确 6 项 / 问题 3 项（P0 1 项 / P1 2 项）/ 警告 2 项）
```

必需小节；放在「建议合并前修复的问题」**之前**。更新已有 PR 时**每次覆盖重写**。

```markdown
## 建议合并前修复的问题

- [ ] `src/xxx.ts:123` <问题描述>
```

第 3 步全部 P0+P1；已修复 `- [x]`。无此类问题则省略整节。更新已有 PR 时该节**累积保留**（含已标注已修复的），不得因重生成描述而丢失；是否已修复以本次评审为准，同步规则见第 7 步。

## 6. 合并方式选择

1. 用户本次指定 → 直接用。
2. 更新 OPEN PR 且用户未指定 → **保留旧描述「## 合并方式」已勾选的方式**（`gh pr edit --body` 是整段替换）。无该小节或三项都未勾选 → 优先级 3。
3. 自动（新建，或更新但旧描述无有效勾选）：`git log origin/master..HEAD --format='%an'` 去重作者数 + commit 总数，**从上到下**：

| 顺序 | 条件 | 方式 |
| --- | --- | --- |
| 1 | 作者 ≥ 2，**或** commit > 3 | merge |
| 2 | commit = 1 | rebase |
| 3 | commit 2–3 且同一作者 | squash |

描述里勾选对应一项，**保留三项完整文案**（与模板一致）：

```markdown
## 合并方式

- [ ] Create a merge commit（保留完整提交历史）
- [x] Squash and merge（压缩为一条提交）
- [ ] Rebase and merge（线性历史）
```

判断示例见 [`references/pr-examples.md`](references/pr-examples.md)。

## 7. 创建或更新 PR

gh 可用时按本步；用户选了「手动创建 PR」则跳到文末「手动模式」。**先查重，不要直接 create**：

```bash
gh pr view <当前分支> --repo yaklang/yakit --json number,url,state
```

动态文本（正文 / 标题）**禁止内插进 shell**：先写 `/tmp/pr-body.md`，用 `--body-file`，用完删除。title 用单引号包裹并对内部单引号转义。

- **已有 OPEN PR**：**不新建**，`gh pr edit` 更新描述，且**每次都必须带 `--title`**（第 5 步智能替换后的最终标题；省略 `--title` 可能改掉标题）：

  ```bash
  gh pr edit <PR number> --repo yaklang/yakit --title '<最终标题>' --body-file /tmp/pr-body.md
  ```

  更新前 `gh pr view <PR number> --repo yaklang/yakit --json body --jq '.body'` 取旧描述：

  - **改动类型**：旧小节已有 `- [x]` → 原样迁移；全未勾或无该节才按第 5 步重判。
  - **关联 Issue / PR**：旧内容非 `None` 则保留；本次用户又提供新关联则合并去重；旧为 `None` 且本次未提供才填 `None`。
  - **合并方式**：第 6 步优先级 2。
  - **建议合并前修复的问题**：必须先重跑第 3 步评审再同步：
    - 已在代码中修复（含旧「## P0 问题」历史条目）：保留并标已修复，如 `- [x] ~~<原问题>~~（✅ 已修复：<短哈希>）`，不得删除。
    - 已标「✅ 已修复」：原样保留（`- [x]`）。
    - 仍未修复：原样保留；旧普通列表改为 `- [ ]`；新问题 `- [ ]` 追加。
    - 旧无该节且本次也无 P0/P1：不生成该节。

  完成后报告：PR 链接、已更新描述、合并方式（沿用旧勾选 / 本次指定 / 自动）、评审结论与统计、关联信息、建议修复项及状态。

- **已有 CLOSED / MERGED PR**：**不要更新、不要 reopen**，按下方**新建**；新描述按第 5 步生成，不迁移旧 PR 历史。
- **没有 OPEN PR**（not found，或仅有 CLOSED / MERGED）：

  ```bash
  gh pr create --repo yaklang/yakit --base master --head <当前分支> --title '<commit 总结标题>' --body-file /tmp/pr-body.md
  ```

  标题为第 5 步基于全部 commit 的 `type: subject`（多 commit 不照搬单条 message）。成功后报告：链接、标题、合并方式、评审结论与统计、关联信息、建议修复项（如有）。

- create 报「A pull request already exists」：改 `gh pr edit`，同样必须带 `--title`（第 5 步最终标题），不要中断、不要再 create。
- **回读验证**：`gh pr view <PR number> --repo yaklang/yakit --json title,body --jq '{title: .title, body: .body}'`（编号：更新用查重结果，新建用 create 输出链接中的编号，避免旧 closed PR 干扰）。① 标题 == 第 5 步最终标题（新建 = 总结标题；更新 = 智能替换），不符则 `gh pr edit ... --title '<最终标题>'`；② 描述含完整「## 合并方式」且勾选与第 6 步一致，不符则再 `gh pr edit`。两点都过才能向用户报告。

用户只要求生成描述不创建时，按实际要求裁剪步骤，不要强行走完全流程。

### 手动模式

前 6 步照常；本步不执行任何 `gh`、**不写任何文件**，标题与描述在对话框展示后结束（创建结果由用户自行处理）：

1. **PR 标题**：单独代码块（第 5 步总结标题）。
2. **描述全文**：代码块展示 markdown **源码**（不截断、不渲染）。
3. 创建入口：`https://github.com/yaklang/yakit/compare/master...<当前分支>?expand=1`。无法自动查重，提醒先看页面是否已有 PR。
4. 读不到旧 PR 描述，默认不含旧勾选 / 关联 / 合并方式 / 累积问题。用户若把旧描述全文贴给 agent，按第 7 步同步规则合并；未提供则提醒在网页编辑器自行合并。
