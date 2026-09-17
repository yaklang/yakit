# Electron 通信与 TypeScript 改造

普通 gRPC 直接通过 `ipc.invoke('grpc', api, params)` 调用；包含主进程业务的操作使用 `local`；流通过 `openStream` 创建独立会话。Electron 只注册一个请求入口 `yakit:request`，响应事件共用 `yakit:event`。

## 目录职责

```text
app/main/
├── index.ts                  应用、窗口启动与退出
├── bootstrap.ts              gRPC 客户端与业务服务组装
├── paths.ts                  编译产物和资源定位
├── ipc/
│   ├── index.ts              请求入口、来源窗口与角色校验
│   ├── router.ts             请求分发、取消、超时
│   ├── grpc.ts               普通 gRPC 转发
│   ├── methods.ts            手工审核的接口允许列表
│   ├── streams.ts            流实例、队列、背压与恢复
│   └── events.ts             主进程应用通知
├── preload/
│   ├── main.ts
│   ├── engine-link.ts
│   ├── screenshots.ts
│   └── transport.ts          固定请求和事件通道
├── services/                 平铺的主进程业务与必要辅助函数
│   ├── engine.ts / startup.ts / updates.ts
│   ├── mitm.ts / mitmSender.ts / mitmV2LargeRequestUpload.ts
│   ├── httpFlows.ts / plugins.ts / ai.ts
│   ├── files.ts / transfers.ts / downloadTask.ts
│   ├── desktop.ts / auxWindows.ts / childWindows.ts
│   ├── screenshots.ts / screenshotNative.ts
│   └── …
├── resources/                原生模块、第三方库和模板
└── __test__/
app/shared/
├── communication/            SDK、错误、协议与本地业务类型
└── generated/grpc/
    ├── types.ts             集中的消息、客户端及接口映射类型
    └── methods.ts           运行时使用的接口流形态信息
```

`services` 保留需要窗口、文件、认证、上传、缓存或特殊流处理的主进程逻辑。普通 gRPC 不需要再建立一份逐接口注册代码。旧 `handlers`、`api`、`uiOperate` 和临时 legacy 注册表、renderer facade、preload require shim 已移除。

## 普通调用

主渲染端从 `@/services/ipc` 导入 SDK，Link 渲染端从自己的 `services/ipc` 导入同一个共享 SDK。

```ts
import { ipc, BridgeError } from '@/services/ipc'

try {
  const data = await ipc.invoke('grpc', 'Echo', { text: 'hello' })
  console.log(data.result)
} catch (error) {
  if (error instanceof BridgeError) {
    console.error(error.message, error.code, error.source, error.details)
  }
}
```

主进程普通调用由生成的方法信息和人工允许列表分发。新增 proto 接口后，需要生成类型并审核允许列表；不对客户端对象进行任意属性调用。

本地业务使用类型契约和业务函数，例如：

```ts
// app/shared/communication/local-methods.ts 内已有契约
// 'read-file-content': { request: string; response: string }

// 主进程业务注册示意
registerMainMethod('read-file-content', (filePath, context) =>
  fs.promises.readFile(filePath, { encoding: 'utf8', signal: context.signal })
)

// 渲染端
const text = await ipc.invoke('local', 'read-file-content', filePath)
```

本地方法声明默认仅主窗口可用；需要 Link 共用的操作显式声明角色。窗口操作根据调用窗口定位，不再靠 `EngineLink:` 前缀复制注册。

## 双工流和 token

```ts
const controller = new AbortController()
const task = await ipc.openStream('grpc', 'StartAIReAct', initialRequest, {
  token: 'task-A',
  signal: controller.signal,
  onData(data) {
    updateTaskA(data)
  },
  onError(error) {
    showTaskAError(error.message)
  },
  onEnd() {
    finishTaskA()
  }
})

await task.write(nextRequest)
await task.end()       // 只结束写入方向，仍接收服务端数据
// await task.cancel() // 取消整个会话
```

`onData/onError/onEnd` 就是 SDK 替调用方管理的监听：先绑定监听，再发起流，结束时移除所属监听。每次打开都会创建新的 `instanceId`，身份同时包含窗口/页面、接口、token 和实例；同接口不同任务、不同窗口同 token、取消后复用 token 都不会串流。

`openStream` 的拒绝表示建立失败；建立后的运行错误进入 `onError`。客户端流的一次最终响应通过 `task.result` 等待。数据回调可返回 Promise，SDK 等它完成后确认数据；主进程有界排队，普通服务端流可暂停，双工流保留控制消息容量。

MITM/MITMV2 是窗口级持久会话：页面重载使用新实例重新关联，真正关闭窗口或切换引擎时取消。显式停止仍关闭后端；保留发送间隔与大文件 EOF 屏障。其他流随所属页面清理。

## 取消、进度和应用通知

```ts
const controller = new AbortController()
const savedPath = await ipc.invoke('local', 'download-url-to-path', downloadParams, {
  signal: controller.signal,
  onProgress(progress) {
    updateProgress(progress)
  }
})
// controller.abort()
```

进度与调用的 requestId 关联，使用同一个事件通道；同名下载、上传之间不共用回调。普通调用默认不设置超时，需要时传正数 `timeoutMs`。取消会传到支持取消的 gRPC、下载、上传和子进程任务。

普通应用通知使用 `const unsubscribe = ipc.on(eventName, callback)`，卸载时只调用自己的 `unsubscribe()`。不再由组件调用 `removeAllListeners` 删除其他消费者。

错误以可序列化数据返回，在渲染端重建 `BridgeError`，保留原始 `message/code/details` 并标明 `source`、接口与 requestId。业务响应里的 `ok: false` / 非成功业务码维持原有语义，不自动当作通信异常。真正的 IPC 故障也会拒绝，但无法凭空恢复 Electron 没有传出的底层字段。

## proto 类型生成

```sh
yarn generate:grpc
yarn check:grpc
```

使用项目已有的 `@grpc/proto-loader` 类型生成器，脚本同时输出方法名、请求/响应类型与流形态。生成器版本锁定在 lockfile；生成输出确定性检查进入构建。只在临时副本中处理旧解析器不接受的注释，原始 `grpc.proto` 不改写。

生成器的分散产物只保存在临时目录，再通过 TypeScript 语法树解析和符号引用重写，集中到 `app/shared/generated/grpc/types.ts`。请求、`__Output` 响应、枚举、客户端及 `GrpcMethods` 类型保持原有语义；若发现重名声明则生成失败，避免静默合并不同类型。`methods.ts` 只保留运行时使用的 `grpcMethods` 信息表。两端使用 `import type` 引用类型，业务仍可通过 `GrpcInput<'接口名'>` / `GrpcOutput<'接口名'>` 使用 IPC 类型，不需要直接依赖生成文件的组织方式。枚举保留上游生成形式，只有作为值导入时才需要相应运行代码。

`int64` 输出十进制字符串，二进制输出 `Uint8Array`。输入允许安全整数或十进制字符串。业务调用中的 int64 ID 保留字符串；日期、页码、数量等需要数值的 UI 字段使用有安全范围检查的转换。新增相邻大 ID 的标签更新、游标与 DTO 编解码测试。

## 开发与打包

```sh
yarn cli start -v yakit   # 两个渲染端
# 两个页面就绪后：
yarn cli electron        # 主进程和 preload 单次编译成功后启动

yarn typecheck:electron
yarn --cwd app/renderer/src/main type-check
yarn --cwd app/renderer/engine-link-startup tsc -b

yarn cli build -v yakit   # 渲染端与 Electron 产物
yarn cli pack -s mac -v yakit
```

修改主进程/preload 后，由开发者主动关闭 Electron，再执行启动命令。没有主进程 watch、自动重启或自动窗口重载；渲染端保留 Vite HMR。

主进程采用严格 TypeScript 检查，esbuild 输出 Node 16.17 兼容的 CommonJS。preload 单独打包，只外置 Electron。产物统一放在 `dist/electron/{main,preload,renderer,resources}`；electron-builder 使用编译结果和显式运行资源，不把主进程 TS、生成器或测试源码塞进安装包。

当前验证结果和环境限制见 [STATUS.md](./STATUS.md)。
