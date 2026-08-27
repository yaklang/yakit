/**
 * CLI 帮助文案。无业务逻辑；合法取值以 env.mjs 为准。
 * 各 *CMDExamplesDoc 出现在对应子命令 -h 的 Examples；
 * install / add / remove 在 commander 未装好时也会直接打印同一份。
 */
import { EDITIONS, SYSTEMS } from './env.mjs'

/** 拼进 start/build/pack/dev 的 -v 说明，以及缺 -v 时的报错 */
const editionValues = EDITIONS.map((item) => item.value).join(' | ')
/** 拼进 pack 的 -s 说明，以及缺 -s 时的报错 */
const systemValues = SYSTEMS.map((item) => item.value).join(' | ')

/** yarn cli -h 末尾：四种调用方式 */
const RootHelpExtraDoc = `
  调用方式:
    yarn cli <command>
    pnpm cli <command>
    npm run cli -- <command>
    node ./cli/cli.mjs <command>

  完整说明见 cli/README.md
`

/** install -h：三端全装，或只装 electron / main / link */
const InstallCMDExamplesDoc = `
  # 安装根目录 + 两个渲染端
  $ yarn cli install

  # 只装主进程 / 主渲染端 / Link 渲染端
  $ yarn cli install electron
  $ yarn cli install main
  $ yarn cli install link
`

/** add -h：给指定子项目加包（含 -D） */
const AddCMDExamplesDoc = `
  # 给主渲染端加依赖
  $ yarn cli add main lodash
  $ yarn cli add main -D vite-plugin-checker

  # 给根目录 / Link 加依赖
  $ yarn cli add electron wait-on
  $ yarn cli add link ahooks
`

/** remove -h：从指定子项目卸包 */
const RemoveCMDExamplesDoc = `
  # 从指定子项目移除依赖
  $ yarn cli remove main lodash
  $ yarn cli remove electron env-cmd
  $ yarn cli remove link dayjs
`

/** start -h：TTY 可省略 -v；--main / --link 只启一端 */
const StartCMDExamplesDoc = `
  # TTY 下未传 -v 会询问业务版本
  $ yarn cli start

  # 启动 yakit 两端开发服务
  $ yarn cli start -v yakit

  # 只启动主渲染端
  $ yarn cli start -v irifyEE --main
`

/** build -h：--devtools / --no-license / --link / --analyzer */
const BuildCMDExamplesDoc = `
  # 构建两端生产产物
  $ yarn cli build -v yakit

  # 企业版构建并打开开发者工具、跳过 License
  $ yarn cli build -v yakitEE --devtools --no-license

  # 只构建 Link，并打开 bundle 分析
  $ yarn cli build -v memfit --link --analyzer
`

/** pack -h：-s / --legacy / --sign / mwl */
const PackCMDExamplesDoc = `
  # 打 macOS Yakit 安装包（本机默认不签名）
  $ yarn cli pack -s mac -v yakit

  # 旧版兼容 + 签名
  $ yarn cli pack -s linux -v memfit --legacy --sign

  # 一次打三个系统
  $ yarn cli pack -s mwl -v yakitEE
`

/** electron -h：只起主进程（渲染端需已就绪） */
const ElectronCMDExamplesDoc = `
  # 启动 Electron 主进程（需渲染端已就绪）
  $ yarn cli electron
`

/** dev -h：start + 等 :3000/:5173 + electron */
const DevCMDExamplesDoc = `
  # 启动两端渲染 + 等待端口 + Electron
  $ yarn cli dev -v yakit
`

export {
  editionValues,
  systemValues,
  RootHelpExtraDoc,
  InstallCMDExamplesDoc,
  AddCMDExamplesDoc,
  RemoveCMDExamplesDoc,
  StartCMDExamplesDoc,
  BuildCMDExamplesDoc,
  PackCMDExamplesDoc,
  ElectronCMDExamplesDoc,
  DevCMDExamplesDoc,
}
