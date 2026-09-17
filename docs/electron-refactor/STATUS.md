# 执行与验收状态

五个阶段的实现已落入工作区，尚未提交 Git。

| 阶段 | 已实现内容 |
| --- | --- |
| 统一通信 | 单一 Electron 请求入口；gRPC、本地方法、流控制共用路由；主/Link 使用同名共用接口 |
| 错误传递 | 序列化错误信封；渲染端重建 BridgeError，保留原始信息与错误来源 |
| 结构整理 | 主进程业务平铺于 services；preload 与运行资源分离；删除旧注册表、业务 facade 和 require shim |
| proto → TS | 锁定生成器；集中为 types.ts 与 methods.ts 两个生成文件；输入/输出、方法名及流形态类型；生成一致性检查 |
| 主进程 TS 与构建 | 严格 TS；单次编译启动；编译产物供 electron-builder 打包；无自动重启 |

静态清点：1248 处可识别的 SDK 字面量调用，涉及 661 个命名空间/方法组合；旧 renderer IPC 调用为 0。动态调用由 SDK 的类型和主进程允许列表约束。清单见 [migration.json](./migration.json)。

## 已通过的验证

- 完整 Vitest：132 个测试文件、948 项测试（最终 tests13）。
- 主进程严格 TypeScript 检查；主渲染端 type-check；Link 渲染端 tsc -b。
- 初次改造验收：651 个方法、1064 个生成文件的一致性检查通过；标准 yarn cli build -v yakit 的三端生产构建通过。类型文件随后集中为 types.ts，运行时信息单独保留于 methods.ts。
- 类型文件合并验收：`yarn ci:tsc` 通过（主进程、两套渲染端及 2 个生成文件的一致性检查）；5 个相关测试文件、36 项测试通过。合并前后 2122 个导出类型双向可赋值，运行时方法信息表一致；两套渲染端 SDK 的浏览器打包通过，产物不包含生成的 gRPC 模块。
- Electron 22.3.27：隔离启动，两端页面加载与统一 transport 调用通过。
- Electron 27.0.0：最终三项 smoke 通过：窗口交接、进程状态、真实 IPC 原始错误传递及旧 bridge 移除。
- electron-builder macOS arm64 未签名目录打包通过（验证时跳过原生依赖重建）；app.asar 入口为 dist/electron/main/index.js，要求的 preload、页面和运行资源齐全，未混入主进程/共享 TS 源码、脚本或测试。
- git diff --check 无空白错误。

测试覆盖错误字段、允许列表、早到事件、重复 token、跨窗口隔离、排队写入、超时/取消、结束与清理、MITM 重连/发送间隔/大文件 EOF 屏障、上传下载进度、数据库修复任务取消、文件错误、超过 2^53 的 ID 与生成 DTO 投影等。

## 环境边界

- 真实引擎业务 E2E 尚未运行：fixture 需要 yaklang-main 源码，默认两个候选目录均不存在，已向用户询问位置。
- 本机缺少部分 bins 引擎压缩包、版本标记与浏览器插件压缩包。打包目录检查不能代替带齐这些资源的正式发布验证。
- 签名、公证以及跨平台原生依赖重建没有执行。未推送代码或发布安装包。

开发命令、模板和目录职责见 [README.md](./README.md)。
