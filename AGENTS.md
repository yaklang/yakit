# Yakit 项目启动指南（Agent 背景文件）

本文件为所有 AI Agent（及新开发者）提供项目启动所需的背景知识。
阅读本文件后，你应能独立完成依赖安装与本地开发环境的启动。

## 项目信息

Yakit 是一个基于 Electron + React 的跨平台桌面应用，主要技术栈包括 Electron、React、TypeScript 等。项目通过 Vite 构建渲染端，使用 Yarn 作为包管理器。

## 项目结构

项目由三部分组成：

| 模块 | 路径 | 作用 | 端口 |
| --- | --- | --- | --- |
| Electron 主进程 | `app/main/` | 入口 index.js，承载窗口、IPC、gRPC | - |
| 主渲染端 | `app/renderer/src/main/` | Vite 8 MPA 主界面 | `3000` |
| Link 渲染端 | `app/renderer/engine-link-startup/` | 引擎链接启动页 | `5173` |

> 主进程在开发模式下会分别加载：
> - 主窗口：`http://127.0.0.1:3000`（`app/main/index.js:247`）
> - 引擎链接窗口：`http://127.0.0.1:5173`（`app/main/index.js:143`）
>
> 因此**两个渲染端都必须成功启动后，才能启动 Electron 主进程**，否则窗口会白屏。

## 前置要求

- Node.js（版本以团队约定为准，仓库暂未提供 `.nvmrc`）
- Yarn（本项目使用 `yarn` 作为包管理器，根目录已提供 `yarn.lock`）
- macOS（Apple Silicon / M 芯片）如遇到原生依赖编译失败，可参考 `ELECTRON_GUIDE.md` 执行：
  ```bash
  brew install pkg-config pixman cairo pango
  ```
- 如需从国内镜像安装 Electron，可先在当前终端执行对应脚本设置镜像源：
  - macOS: `source scripts/set-electron-mirror-macos.sh`
  - Linux: `source scripts/set-electron-mirror-linux.sh`
  - Windows PowerShell: `. .\scripts\set-electron-mirror.ps1`
  - Windows CMD: `scripts\set-electron-mirror.cmd`

## 依赖安装

项目共有三个需要安装依赖的子项目。一条命令即可按顺序全部安装（根目录 → Link 渲染端 → 主渲染端）：

```bash
yarn cli install
# 等价于：yarn cli install electron && yarn cli install link && yarn cli install main
# 也可只装其中一个：yarn cli install electron | main | link
```

命令细节见 [`cli/README.md`](cli/README.md)。本仓库日常仍以 `yarn cli` 为例；`pnpm cli` / `npm run cli --` / `node ./cli/cli.mjs` 语义相同。

## 启动开发环境

> 开发模式下 Electron 主进程会分别加载主窗口 `http://127.0.0.1:3000` 与引擎链接窗口 `http://127.0.0.1:5173`，因此**两个渲染端都必须先成功启动**，再启动 Electron，否则对应窗口会白屏。

### 启动前依赖检查（重要）

启动项目前，先检查本地依赖是否与仓库一致（尤其是 `git pull` 之后，别人可能新增或升级了依赖）：

```bash
yarn check-deps
```

- 若提示「未安装依赖」：按提示先执行 `yarn cli install`。
- 若提示「依赖可能有更新」：**使用 `AskUserQuestion` 工具向用户弹选项框确认**是否重新安装对应子项目的依赖，而不是在回复里用文字描述选项让用户再答一遍。选项示例：
  - `重装全部依赖`（执行 `yarn cli install`）
  - `仅重装有改动的子项目`（按 check-deps 提示的列表：`yarn cli install electron` / `main` / `link`）
  - `跳过，直接启动`
- 若提示「依赖一致」：进入启动步骤。但若用户提到最近 `git pull` 过而未重装（见下文「常见问题排查」的盲区），**使用 `AskUserQuestion` 工具弹选项框**询问是否仍重跑 `yarn cli install`。

> 通用规则：**凡涉及需要用户决策的环节（是否重装依赖、启动哪个版本、是否跳过某步等），一律优先用 `AskUserQuestion` 工具弹出选项框让用户一键选择，不要在回复里用文字罗列选项让用户再答一遍。**

### 启动步骤

> 若用户未指定启动哪个版本，**使用 `AskUserQuestion` 工具弹选项框**让用户选择版本，不要默认替用户决定。
>
> ⚠️ `AskUserQuestion` 每个问题最多只能放 4 个选项（外加自动提供的「Other」自定义输入），而项目共有 6 个版本（见「多版本/多平台变体」表），无法一次性全部展示。采用**分层弹框**策略：
>
> 1. **第一层弹框**：选项只放 4 个主版本——`Yakit`（默认）、`enterprise`（企业版）、`irify`（IRify 社区版）、`memfit`（AI 精简版）。question 文本中完整列出全部 6 个版本名，提示 `simple-enterprise` 与 `irify-enterprise` 会根据后续选择追问。
> 2. **第二层弹框（按需追问）**：
>    - 若用户在第一层选了 `enterprise`，再弹一次选项框，让用户在 `enterprise`（企业版 EE）与 `simple-enterprise`（便携 / 简易企业版 SE）之间二选一。
>    - 若用户在第一层选了 `irify`，再弹一次选项框，让用户在 `irify`（IRify 社区版）与 `irify-enterprise`（IRify 企业版）之间二选一。
>    - 若用户选了 `Yakit` 或 `memfit`，无需追问，直接确定。
> 3. 这样既不超出工具单次 4 选项上限，又能覆盖全部 6 个版本，且用户全程点选、无需手动输入「Other」。

选完版本后，映射到 CLI `-v`（**不要**再跑已删除的 `start-renders*` / `pack-*`）：

| 用户选择 | CLI `-v` | 启动两端渲染 |
| --- | --- | --- |
| Yakit | `yakit` | `yarn cli start -v yakit` |
| enterprise | `yakitEE` | `yarn cli start -v yakitEE` |
| simple-enterprise | `yakitSE` | `yarn cli start -v yakitSE` |
| irify | `irify` | `yarn cli start -v irify` |
| irify-enterprise | `irifyEE` | `yarn cli start -v irifyEE` |
| memfit | `memfit` | `yarn cli start -v memfit` |

先启动两个渲染端（:3000 主渲染端 + :5173 Link 渲染端），例如社区版：

```bash
yarn cli start -v yakit
# 只启一端：yarn cli start -v yakit --main  或  --link
```

待两个渲染端**真正就绪**后，再启动 Electron 主进程：

```bash
yarn cli electron
```

> ⚠️ **重要：必须确认渲染端「真正就绪」后再启动 Electron，否则窗口会白屏。**
>
> 端口进入 LISTEN 状态 ≠ 渲染端加载完成。Vite / CRA 的 dev server 端口会很快开始监听，但此时首次编译可能尚未结束，Electron 此时加载会拿到不完整的页面导致白屏。
>
> 必须按以下两步确认就绪：
>
> 1. **端口检查**：确认 `3000` 与 `5173` 端口均在监听。
>    ```bash
>    lsof -i :3000 -sTCP:LISTEN
>    lsof -i :5173 -sTCP:LISTEN
>    ```
>
> 2. **内容轮询**：用 `curl` 轮询，直到两端都返回 HTTP 200 且响应体包含有效内容（如 `<script` 或 `<div id="root"`），才说明首次编译完成、页面真正可访问。
>    ```bash
>    # 轮询直到主渲染端（:3000）就绪
>    until curl -s http://127.0.0.1:3000 | grep -qE '<script|<div id="root"'; do sleep 2; done
>
>    # 轮询直到 Link 渲染端（:5173）就绪
>    until curl -s http://127.0.0.1:5173 | grep -qE '<script|<div id="root"'; do sleep 2; done
>    ```
>
> 两端都通过上述检查后，再执行 `yarn cli electron`。
>
> 也可用 `yarn cli dev -v <edition>` 一条命令（start + wait-on 端口 + electron）。Agent 启动仍优先走上面的 curl 内容轮询，因为端口 LISTEN 不等于页面可访问。

## 多版本/多平台变体

> 依赖安装步骤与版本无关，请先按上文「依赖安装」完成；版本差异只体现在 CLI `-v` 上。

发行版由 CLI 注入 `YAKIT_EDITION`（三端同一名字、同一取值），**不再**使用 `env-cmd` / `--mode` / `REACT_APP_PLATFORM` / `VITE_PLATFORM`。Electron 主进程不区分版本，它只加载当前已运行的渲染端地址。

| 用户选择（问询标签） | CLI `-v` | 产品名 | 性质 | 本地引擎端口 |
| --- | --- | --- | --- | --- |
| Yakit | `yakit` | Yakit | 社区版 CE | `9011` |
| enterprise | `yakitEE` | EnpriTrace | 企业版 EE | `9012` |
| simple-enterprise | `yakitSE` | EnpriTraceAgent | 便携 / 简易企业版 SE | `9013` |
| irify | `irify` | IRify | IRify 社区版 | `9014` |
| irify-enterprise | `irifyEE` | IRifyEnpriTrace | IRify 企业版 | `9015` |
| memfit | `memfit` | Memfit AI | AI Agent 精简版 | `9016` |

```bash
# 启动两端渲染（以企业版为例）
yarn cli start -v yakitEE

# 只启主渲染 / Link
yarn cli start -v yakitEE --main
yarn cli start -v yakitEE --link

# 按上文「启动步骤」确认两端真正就绪后
yarn cli electron

# 或一条命令（wait-on 端口后起 Electron）
yarn cli dev -v yakitEE
```

### 各版本功能差异（概要）

- **默认 / Yakit**：完整社区版基线，所有功能开放。
- **enterprise / EnpriTrace**：企业版，使用企业 token、企业远端配置、独立的企业数据库 `company-default-yakit.db`。
- **simpleEE / EnpriTraceAgent**：便携 / 简易企业版，隶属企业系（`isEnterpriseOrSimpleEdition()` 为 true）。
- **irify / IRify**：IRify 社区版，紫色主题，含 `irifyHome`、`irifyAiCodeAudit`（AI 代码审计）等专属页面。
- **irifyEnterprise / IRifyEnpriTrace**：IRify 的企业版分支。
- **memfit / Memfit AI**：面向 AI Agent 的精简版，菜单与界面元素最多精简（大量 `!isMemfit()` 守卫）。

## 构建渲染端产物

若需打包发布，需先构建两个渲染端的静态产物，再执行 electron-builder：

```bash
yarn cli build -v yakit
yarn cli pack -s mac -v yakit
```

完整参数（`--devtools` / `--no-license` / `--legacy` / `--sign` 等）见 [`cli/README.md`](cli/README.md)。终端里先看 `yarn cli -h` / `yarn cli <cmd> -h`。

## 常见问题排查

> 当用户带着启动 / 编译报错来询问时，**第一步应先跑 `yarn check-deps` 排查是否由依赖问题引起**，再去看具体报错。
>
> ⚠️ 注意 `yarn check-deps` 的盲区：它通过 `git diff HEAD -- yarn.lock` 判断依赖是否更新，**只能检测工作区未提交的 yarn.lock 改动**。若用户刚 `git pull` 拉到了别人**已提交**的新 yarn.lock 但没重新 `yarn install`，此时新 lock 已进 HEAD，`git diff HEAD` 为空，脚本会误报「依赖一致」而实际 `node_modules` 已滞后。
>
> 因此：**若用户最近 `git pull` 过但没重新安装依赖，即便 `check-deps` 报「依赖一致」，也应使用 `AskUserQuestion` 工具弹选项框**询问用户是否重跑 `yarn cli install` 后再启动，而不是在回复里用文字描述让用户再答一遍。

- **窗口白屏 / `ERR_CONNECTION_REFUSED`**：对应渲染端未就绪。注意端口监听 ≠ 加载完成，需按「启动步骤」用 `curl` 轮询确认两端返回有效 HTML 后再启动 Electron。
- **启动 / 编译报错（模块找不到、API 报错、语法报错等）**：优先 `yarn check-deps` 排查依赖是否一致；结合上述盲区判断是否需要重装依赖。
- **M1 芯片原生依赖编译失败**：执行 `brew install pkg-config pixman cairo pango`。
- **Electron 下载慢 / 失败**：在当前终端执行对应镜像脚本后重试（macOS `source scripts/set-electron-mirror-macos.sh` / Linux `source scripts/set-electron-mirror-linux.sh` / Windows PowerShell `. .\scripts\set-electron-mirror.ps1` / Windows CMD `scripts\set-electron-mirror.cmd`）。
- **端口被占用**：确认没有残留的 vite / electron 进程，必要时 `lsof -i :3000` / `lsof -i :5173` 排查。

## 代码规范

- 强制使用 LF 换行符。
- 缩进为 2 个空格。
- 代码不使用分号，使用单引号。
- 遵循项目中的 `.prettierrc.js` 和 `.editorconfig`。

### 编码行为准则

旨在减少 LLM 编码中常见错误的行为准则，可与项目特定指令合并使用。

**权衡：** 本准则倾向于"谨慎优于速度"。对于简单任务，请自行判断。

#### 1. 先思考再编码

**"不要假设。不要隐藏困惑。呈现权衡。"**

实现之前：

- 明确陈述假设；如果不确定，就提问。
- 当存在多种理解时，逐一列出而非默默选择。
- 如果存在更简单的方案，直接说明并在必要时提出异议。
- 如果有不明白的地方，停下来指出困惑之处，然后提问。

#### 2. 简洁优先

**"用最少的代码解决问题。不做臆测性编码。"**

- 不实现超出需求的特性。
- 不为仅使用一次的代码做抽象。
- 不添加未经要求的"灵活性"或"可配置性"。
- 不处理不可能发生的错误场景。
- 如果你写了 200 行但 50 行就够了，那就重写。

自检："资深工程师会觉得这过于复杂吗？" 如果是，就简化。

#### 3. 精准改动

**"只改必须改的。只清理自己制造的遗留。"**

编辑现有代码时：

- 不要"改善"相邻的代码、注释或格式。
- 不要重构没有问题的代码。
- 风格优先级：**项目显式代码规范 > 当前文件既有风格 > 个人习惯**。若既有代码与上文「代码规范」冲突，以显式规范为准。
- 如果发现无关的废弃代码，提出来而不是直接删除。

当你的改动产生了孤立的代码时：

- 移除因你的改动而变得未使用的 import/变量/函数。
- 不要移除之前就存在的废弃代码，除非被明确要求。

检验标准："每一行改动都应该能追溯到用户的请求。"

#### 4. 目标驱动执行

**"定义成功标准。循环验证直到通过。"**

将任务转化为可验证的目标：

- "添加校验" → 构造一个非法输入，验证被拦截；而非先去搭建测试基建
- "修复 Bug" → 先复现 Bug 现象，改后再验证现象消失
- "重构 X" → 确认重构前后原有行为不变（手动验证或已有测试通过）

> 注：项目已有 Vitest（含 CI `ci-vitest`）。验证时优先跑/更新邻近已有测试；没有现成测试时再手动复现。不要为一次性验证引入新的测试框架或测试依赖。

对于多步骤任务，简要列出计划：

```
1. [步骤] → 验证：[检查方式]
2. [步骤] → 验证：[检查方式]
3. [步骤] → 验证：[检查方式]
```

"明确的成功标准让你可以独立循环迭代。" 模糊的标准如"让它能用"则需要不断确认。

## 关键脚本速查

命令细节以 [`cli/README.md`](cli/README.md) 为准。本仓库示例用 `yarn cli`；`pnpm cli` / `npm run cli --` 相同。

| 命令 | 作用 |
| --- | --- |
| `yarn check-deps` | 检查本地依赖是否与仓库一致（启动前执行） |
| `yarn cli install` | 安装根目录 + 两个渲染端依赖 |
| `yarn cli install electron\|main\|link` | 只装其中一个 |
| `yarn cli install cli` | 只装根目录 CLI 运行时（不含 Electron） |
| `yarn cli add <electron\|main\|link> <pkg…>` | 给指定子项目加包（`-D` / `--dev`） |
| `yarn cli remove <electron\|main\|link> <pkg…>` | 从指定子项目卸包 |
| `yarn cli start -v <edition>` | 开发态启动两端渲染（`--main` / `--link` 只启一端） |
| `yarn cli electron` | 启动 Electron 主进程（不区分版本） |
| `yarn cli dev -v <edition>` | start + wait-on :3000/:5173 + electron |
| `yarn cli build -v <edition>` | 生产构建两端渲染 |
| `yarn cli pack -s <os> -v <edition>` | electron-builder 打安装包（`win\|mac\|linux\|mwl`） |

`-v` 取值：`yakit` / `yakitEE` / `yakitSE` / `irify` / `irifyEE` / `memfit`（另有 `breachtrace`）。
