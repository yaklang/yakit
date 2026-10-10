# 主进程工程化

主进程保留现有业务 JS，允许逐步加入 TS。开发和发布使用同一套 esbuild bundle 入口、CommonJS 格式及资源布局；发布额外开启 minify。渲染端继续使用 Vite。

## 使用方式

| 命令 | 行为 |
| --- | --- |
| `yarn typecheck:electron` | 主进程和 preload 类型检查；新 TS 严格检查，历史 JS 暂不开启 checkJs |
| `yarn build:electron:dev` | 跳过 tsc，生成未压缩 bundle 和调试 map |
| `yarn build:electron` | 先执行 tsc 类型检查，再生成压缩 bundle 和独立 map |
| `yarn cli electron` | 等待两端页面有效，单次开发构建（跳过 tsc），然后启动 |
| `yarn cli dev -v yakit` | 启动两个渲染服务，再执行上述主进程流程 |
| `yarn cli build -v yakit` | 构建两端渲染，再构建发布主进程 |
| `yarn cli build --electron` | 只构建发布主进程，无需发行版参数 |
| `yarn cli pack -s mac -v yakit` | beforePack 校验渲染资源、重新生成发布主进程，再打包 |

保存主进程或 preload 不触发构建、重启或窗口重载。用户主动关闭 Electron 后重跑启动命令。构建失败会阻止后续启动；构建脚本不会主动终止正在运行的应用。渲染端 HMR 保留。

## 模块和资源约定

- 主进程入口为 `dist/electron/main/index.js`；三个 preload 位于 `dist/electron/preload`；专属运行资源位于 `dist/electron/resources`。
- 新增扫描目录中的 IPC 模块，需要更新 `app/main/ipcModules.js` 的延迟加载清单。构建会检查遗漏和同名 JS／TS 冲突。
- 第一方业务模块进入主 bundle；Electron、Node 内置模块和已声明的生产 npm 依赖保持运行时加载。
- preload 分别打包，本地共用代码内联，并检查沙箱外部引用。
- 使用 `runtimePaths.js` 定位页面、preload、Proto 和资源，避免按原源码文件位置解释 `__dirname`。
- 第三方预构建文件、原生模块和可执行文件按资源清单复制；`.node` 与进程枚举可执行文件配置 ASAR 解包。
- 子窗口主题来自主渲染构建或开发服务生成的 CSS；缺失时先构建或启动主渲染端。
- E2E 初始化保持早于用户目录、缓存和业务模块加载；源码和 ASAR 启动均使用正确的资源根目录。

发布压缩包括局部标识符、语法和空白，不混淆协议属性，不删除日志。安装包排除第一方主进程源码、测试、source map 和构建分析文件。source map 连同版本、Electron 版本及产物 SHA-256 单独归档到 `reports/electron-build`，发布 CI 保存为独立诊断 artifact。

## 验证

- `yarn ci:electron`：类型检查及开发／发布构建测试。
- `yarn test:vitest app/main/__test__ --run`：既有主进程回归。
- `yarn test:e2e:build` 后执行 `yarn test:e2e:electron:smoke`：默认测试压缩主进程。
- 调试 E2E 可传 `--electron-build-mode development`，与 `--dev-renderers` 独立。

2026-09-20，本机 macOS arm64 实施验证结果：

| 验证 | 结果 |
| --- | --- |
| 类型检查、开发和发布构建 | 通过 |
| 主进程回归及构建测试 | 15 个文件、127 项通过 |
| Electron 27 E2E | 主窗口／Link 切换、进程指标、截图及水印共 7 项通过 |
| 开发 bundle 基础冒烟 | Electron 27 主窗口、Link、preload、原生模块通过 |
| macOS arm64 未签名目录包 | electron-builder 成功生成 |
| ASAR 内容检查 | 无第一方主进程源码和构建 map，入口为 production bundle，原生模块已解包 |
| 同一 ASAR 的兼容冒烟 | 使用 stock Electron 27.0.0 和 22.3.27，隔离用户数据，主窗口／Link／preload／原生模块通过 |

主进程开发 bundle 为 857,565 字节，发布 bundle 为 368,727 字节，减少约 57%（仅主进程 JS，不代表安装包体积变化）。

本机基线测试曾因 `/var` 与 `/private/var` 临时目录别名比较失败；回归使用 `TMPDIR=/private/tmp` 规范化测试环境，未修改浏览器配置业务或该已有测试。

本地缺少内置引擎 ZIP、引擎版本／校验文件及浏览器扩展 ZIP，electron-builder 对这些发布资源给出了缺失提示；本次目录包只用于工程化验证，不是可交付的正式安装包。未执行签名、公证、正式发布，也未完成 Windows／Linux 或完整 Electron 22 业务回归。ASAR 兼容冒烟由 stock Electron 加载归档执行，不等同于对 Electron 22 完整安装包的验证。
