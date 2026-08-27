# yarn cli

仓库唯一的启动 / 构建 / 打包入口。解析参数后由 Node 注入同一套 `YAKIT_*`，再直接 spawn 本地 `node_modules/.bin`（vite / tsc / electron / electron-builder / concurrently / wait-on），不经过 yarn/npm/pnpm。`install` / `add` / `remove` 会调用当前包管理器。

终端里先看 `-h`，细节以本文为准。

## 调用方式

```bash
yarn cli <command>
pnpm cli <command>
npm run cli -- <command>    # npm 必须加 --
node ./cli/cli.mjs <command>
```

本仓库日常 / CI 仍以 `yarn cli` 为例，语义相同。

`install` / `add` / `remove` 会调用当前包管理器。`install` 只用 Node 内置模块，**全新 clone 可直接** `yarn cli install` / `node ./cli/cli.mjs install`（不必先有 commander / inquirer）。其它命令需要根目录依赖已装好。

## 命令一览

| 命令 | 做什么 | 常用参数 | 默认 |
| --- | --- | --- | --- |
| `install [electron\|main\|link]` | 装依赖 | 位置参数 | 三端全装 |
| `add <electron\|main\|link> <pkg…>` | 给指定子项目加包 | `-D` / `--dev` 及其他 yarn/npm/pnpm 原样 flag | 必须指定一端 |
| `remove <electron\|main\|link> <pkg…>` | 从指定子项目卸包 | 位置参数 | 必须指定一端 |
| `start` | 开发态启动渲染端 | `-v`、`--main`、`--link` | 两端都启 |
| `build` | 生产构建渲染端 | `-v`、`--main`、`--link`、`--devtools`、`--no-license`、`--analyzer` | 两端都构建 |
| `pack` | electron-builder 打安装包 | `-s`、`-v`、`--legacy`、`--sign` | 本机默认不签名 |
| `electron` | 只起 Electron 主进程（开发） | 无 | 不区分业务版本 |
| `dev` | `start` + wait-on :3000/:5173 + `electron` | `-v` | 两端渲染 + 主进程 |

短 flag **不跨命令复用**。旧命令名 `render` / `electron -b` 已删除，没有别名。

### 交互规则

- 仅 TTY 且缺**该命令必需项**时才 inquirer：`start` / `build` / `dev` 缺 `-v`，`pack` 缺 `-s` 或 `-v`
- 非 TTY（CI）缺参直接 `exit 1`，禁止交互
- `--main` 与 `--link` 不能同时使用；都不传则两端都跑

```bash
yarn cli -h
yarn cli start -h
yarn cli build -h
yarn cli pack -h
yarn cli install -h
yarn cli add -h
yarn cli remove -h
yarn cli dev -h
yarn cli electron -h
```

## `-v` 业务版本

| `-v` | 产品 | 引擎端口 |
| --- | --- | --- |
| `yakit` | Yakit 社区版 CE | 9011 |
| `yakitEE` | EnpriTrace 企业版 EE | 9012 |
| `yakitSE` | EnpriTraceAgent 便携 / 简易企业版 SE | 9013 |
| `irify` | IRify 社区版 | 9014 |
| `irifyEE` | IRifyEnpriTrace 企业版 | 9015 |
| `memfit` | Memfit AI | 9016 |
| `breachtrace` | BAS / BreachTrace | 9011 |

CI 输入 `ce/ee/se/irify/irifyee/memfit` 映射为上面的 `-v` 取值。

## `-s` 系统（仅 `pack`）

| `-s` | 含义 |
| --- | --- |
| `win` | Windows |
| `mac` | macOS |
| `linux` | Linux |
| `mwl` | 依次打 win + mac + linux |

## 示例

### 日常开发

```bash
yarn cli install
yarn cli start -v yakit
# 两端页面真正可访问后
yarn cli electron
```

一条命令（wait-on 端口后起 Electron；端口 LISTEN ≠ 页面编译完成）：

```bash
yarn cli dev -v yakit
```

### 增删依赖

必须指定子项目，不会一次改三端：

```bash
yarn cli add main lodash
yarn cli add main -D vite-plugin-checker
yarn cli add electron wait-on
yarn cli add link ahooks

yarn cli remove main lodash
yarn cli remove electron env-cmd
```

flag 原样转发（`-D` / `--dev` 等）。识别到 npm 时，仅把 `--dev` 转成 `--save-dev`（npm 没有 `--dev`）。

### 只启一端

```bash
yarn cli start -v yakit --main
yarn cli start -v irifyEE --link
```

### 生产构建

```bash
yarn cli build -v yakit
yarn cli build -v yakitEE --devtools --no-license
yarn cli build -v memfit --link --analyzer
yarn cli build --main -v yakit --devtools
```

默认产物不含 sourcemap。`--devtools` 会注入 `YAKIT_DEVTOOLS=true`。`--no-license` 会注入 `YAKIT_REQUIRE_ENTERPRISE_LICENSE=false`。

### 打安装包

```bash
# 本机 unsigned
yarn cli pack -s mac -v yakit

# mac 签名/公证探测
yarn cli pack -s mac -v yakit --sign

# 旧版兼容包
yarn cli pack -s win -v yakitSE --legacy

# 三系统
yarn cli pack -s mwl -v yakitEE
```

未传 `--sign` 时设 `CSC_IDENTITY_AUTO_DISCOVERY=false`。`--sign` 设为 `true`（electron-builder 内置变量，CLI 不改名）。

## 环境变量 `YAKIT_*`

由 `cli/env.mjs` 组装，根 CLI spawn 子进程时注入。渲染端子 CLI 只读这些变量，不再维护 versionMap / `--mode`。

| 变量 | 取值 | 用途 |
| --- | --- | --- |
| `YAKIT_EDITION` | 上表 `-v` | 发行版（三端同一词表） |
| `YAKIT_DEVTOOLS` | `true` / 未设 | 渲染端开发者工具 UI |
| `YAKIT_SOURCEMAP` | `true` / 未设 | Vite sourcemap |
| `YAKIT_ANALYZER` | `true` / 未设 | bundle visualizer |
| `YAKIT_REQUIRE_ENTERPRISE_LICENSE` | `false` 表示跳过 | 对应旧 `enterpriseNoLicense` |
| `YAKIT_LEGACY` | `true` / 未设 | 旧版兼容包 |

不改名：`CSC_IDENTITY_AUTO_DISCOVERY`、`APPLE_*` / `CERT_*`。

引擎 Handshake 仍走旧名（`yakitEE` → `enterprise` 等），见 `toEngineHandshakeName()`。UI / 端口 / 打包直接使用 `YAKIT_EDITION`。

## 与旧脚本对照

旧的版本化 yarn 脚本已删除，按下面迁移：

| 旧命令 | 新命令 |
| --- | --- |
| `yarn install` + `yarn install-render` + `yarn install-link-render` | `yarn cli install` |
| `yarn start-renders` / `start-renders-enterprise` / … | `yarn cli start -v yakit` / `-v yakitEE` / … |
| `yarn start-render` / `start-link-render` | `yarn cli start -v <edition> --main` / `--link` |
| `yarn start-electron` | `yarn cli electron` |
| `yarn dev` | `yarn cli dev -v <edition>` |
| `yarn build-renders` / `build-renders-enterprise` / … | `yarn cli build -v yakit` / `-v yakitEE` / … |
| `yarn build-render -test` / `REACT_APP_DEVTOOL` | `yarn cli build --main -v yakit --devtools` |
| `yarn pack-mac` / `pack-win-ee` / `pack-linux-se` / … | `yarn cli pack -s mac -v yakit` / `-s win -v yakitEE` / `-s linux -v yakitSE` |
| `yarn pack-mac-legacy` / `pack-*-se-legacy` | 加上 `--legacy` |
| 旧 mac `signNormal` / `pack-mac-se` | 加上 `--sign` |
| `env-cmd -e enterprise` / Vite `--mode enterprise` | 删除；只设 `YAKIT_EDITION` |

`-v` 对照：`enterprise` → `yakitEE`，`simple-enterprise` → `yakitSE`，`irify-enterprise` → `irifyEE`。
