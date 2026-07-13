# Yakit 项目启动指南（Agent 背景文件）

本文件为所有 AI Agent（及新开发者）提供项目启动所需的背景知识。
阅读本文件后，你应能独立完成依赖安装与本地开发环境的启动。

## 项目结构

Yakit 是一个 Electron 桌面应用，由三部分组成：

| 模块 | 路径 | 说明 | 开发端口 |
| --- | --- | --- | --- |
| Electron 主进程 | `app/main/` | 入口 `app/main/index.js`，承载窗口、IPC、gRPC 通信等 | - |
| 主渲染端 | `app/renderer/src/main/` | 基于 CRA（react-app-rewired）的主界面渲染端 | `3000` |
| Link 渲染端 | `app/renderer/engine-link-startup/` | 基于 Vite 的引擎链接启动页渲染端 | `5173` |

> 主进程在开发模式下会分别加载：
> - 主窗口：`http://127.0.0.1:3000`（`app/main/index.js:247`）
> - 引擎链接窗口：`http://127.0.0.1:5173`（`app/main/index.js:143`）
>
> 因此**两个渲染端都必须成功启动后，才能启动 Electron 主进程**，否则窗口会白屏。

## 前置要求

- Node.js（建议使用项目约定的版本，参见 `.nvmrc` 或团队约定）
- Yarn（本项目使用 `yarn` 作为包管理器，根目录已提供 `yarn.lock`）
- macOS（Apple Silicon / M 芯片）如遇到原生依赖编译失败，可参考 `ELECTRON_GUIDE.md` 执行：
  ```bash
  brew install pkg-config pixman cairo pango
  ```
- 如需从国内镜像安装 Electron，可先 `source ./electron.env` 设置镜像源。

## 依赖安装

项目共有三个需要安装依赖的子项目，**务必按顺序全部安装**：

```bash
# 1. 根目录（Electron 主进程相关依赖，含 electron、electron-builder、concurrently、wait-on 等）
yarn install

# 2. 主渲染端（CRA）
yarn install-render
# 等价于：cd app/renderer/src/main && yarn install

# 3. Link 渲染端（Vite）
yarn install-link-render
# 等价于：cd app/renderer/engine-link-startup && yarn install
```

> 主渲染端依赖了 `patch-package`，其 `postinstall` 脚本会在 `yarn install` 后自动执行补丁，请勿跳过。

## 启动开发环境

### 方式一：一键启动（推荐）

根目录提供了 `dev` 脚本，它会启动主渲染端并等待 `3000` 端口就绪后启动 Electron：

```bash
yarn dev
# 等价于：concurrently -k "yarn start-render" "wait-on tcp:3000 && yarn start-electron"
```

> 注意：`yarn dev` 只等待了主渲染端的 `3000` 端口，**未等待 Link 渲染端的 `5173`**。
> 若引擎链接窗口出现白屏，请改用「方式二」手动启动，或先用 `yarn start-link-render` 单独拉起 Link 渲染端。

### 方式二：手动分步启动（最稳妥）

按以下顺序执行，每一步成功后再进行下一步：

```bash
# 1. 启动主渲染端（监听 3000）
yarn start-render

# 2. 启动 Link 渲染端（监听 5173）
yarn start-link-render

# 3. 两个渲染端都就绪后，启动 Electron 主进程
yarn start-electron
```

也可以用 `concurrently` 同时启动两个渲染端：

```bash
yarn start-renders
# 等价于：concurrently "yarn start-render" "yarn start-link-render"
```

待两个端口（`3000` 与 `5173`）均可访问后，再执行 `yarn start-electron`。

## 多版本/多平台变体

项目通过 `--mode` / `env-cmd` 环境切换支持多个发行版本（默认 / enterprise / simpleEE / irify / irifyEnterprise / memfit）。
开发时如无特殊需求，使用默认模式即可；如需启动企业版等变体，可参考根 `package.json` 中的对应脚本：

```bash
yarn start-renders-enterprise        # 同时启动两个渲染端（企业版）
yarn start-render-irify              # 仅启动主渲染端（irify 版）
yarn start-link-render-memfit        # 仅启动 Link 渲染端（memfit 版）
# ... 以此类推
```

启动 Electron 时无需指定版本，它会加载当前已运行的渲染端地址。

## 构建渲染端产物

若需打包发布，需先构建两个渲染端的静态产物，再执行 electron-builder：

```bash
# 构建两个渲染端（默认版本）
yarn build-renders
# 等价于：run-s build-render build-link-render

# 之后使用对应平台的打包命令，例如 macOS：
yarn pack-mac
```

## 常见问题排查

- **窗口白屏 / `ERR_CONNECTION_REFUSED`**：对应渲染端未启动。确认 `3000` 与 `5173` 端口均在监听后再启动 Electron。
- **`yarn dev` 启动后引擎链接窗口白屏**：`dev` 脚本未等待 `5173`，请先用 `yarn start-link-render` 拉起 Link 渲染端。
- **M1 芯片原生依赖编译失败**：执行 `brew install pkg-config pixman cairo pango`。
- **Electron 下载慢 / 失败**：`source ./electron.env` 后重试。
- **端口被占用**：确认没有残留的 vite / react-scripts / electron 进程，必要时 `lsof -i :3000` / `lsof -i :5173` 排查。

## 代码规范

- 强制使用 LF 换行符。
- 缩进为 2 个空格。
- 代码不使用分号，使用单引号。
- 遵循项目中的 `.prettierrc.js` 和 `.editorconfig`。

## 关键脚本速查

| 命令 | 作用 |
| --- | --- |
| `yarn install` | 安装根目录依赖 |
| `yarn install-render` | 安装主渲染端依赖 |
| `yarn install-link-render` | 安装 Link 渲染端依赖 |
| `yarn start-render` | 启动主渲染端（:3000） |
| `yarn start-link-render` | 启动 Link 渲染端（:5173） |
| `yarn start-renders` | 同时启动两个渲染端 |
| `yarn start-electron` | 启动 Electron 主进程 |
| `yarn dev` | 一键启动（主渲染端 + Electron） |
| `yarn build-renders` | 构建两个渲染端产物 |
| `yarn pack-mac` / `pack-win` / `pack-linux` | 对应平台打包 |