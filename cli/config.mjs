/** 前端业务版本的介绍和值 */
const BusinessVersionOption = [
  { value: 'yakit', name: 'Yakit CE' },
  { value: 'yakitEE', name: 'Yakit EE: enpritrace' },
  { value: 'yakitSE', name: 'Yakit SE: simple-enpritrace' },
  { value: 'irify', name: 'Irify CE: irify' },
  { value: 'irifyEE', name: 'Irify EE: irify-enpritrace' },
  { value: 'memfit', name: 'Memfit CE: memfit' },
]

/** electron命令中 -s 支持选项的介绍和值 */
const ElectronSystemOption = [
  { value: 'win', name: 'win: Windows 系统' },
  { value: 'mac', name: 'mac: MacOS 系统' },
  { value: 'linux', name: 'linux: Linux 系统' },
  { value: 'mwl', name: 'mwl: 多平台 (Mac + Windows + Linux)' },
]

/** render命令的示例 */
const RenderCMDExamplesDoc = `
  # 进入引导模式
  $ yarn cli render

  # 启动memfit版本的开发环境(包括link-render和main-render)
  $ yarn cli render -v memfit (yarn cli render -l -m -v memfit)

  # 启动irifyEE版本的开发环境(仅main-render)
  $ yarn cli render -mv irifyEE (yarn cli render -m -v irifyEE)
  
  # 启动yakit版本的构建环境(包括link-render和main-render)
  $ yarn cli electron -bv yakit (yarn cli render -b -v yakit)

  # 启动irify版本的构建环境(仅link-render)
  $ yarn cli render -blv irify (yarn cli render -b -l -v irify)
`

/** electron命令的示例 */
const ElectronCMDExamplesDoc = `
  # 启动开发环境主进程
  $ yarn cli electron

  # 构建 Mac 版本的 Yakit 安装包
  $ yarn cli electron -b -s mac -v yakit(yarn cli electron -bs mac -v yakit)
  
  # 构建 旧版兼容模式 的 Linux 版本 的 Memfit 安装包
  $ yarn cli electron -b -s linux -l -v memfit(yarn cli electron -bls linux -v memfit)

  # 进入引导模式
  $ yarn cli electron -b
`

/** instal命令的示例 */
const InstallCMDExamplesDoc = `
  # 安装主进程、渲染端的所有包
  $ yarn cli install(yarn cli install -elm)

  # 安装主进程所有包
  $ yarn cli electron -e
  
  # 安装引擎链接渲染端所有包
  $ yarn cli electron -l
  
  # 安装主渲染端所有包
  $ yarn cli electron -m 
`

export {
  BusinessVersionOption,
  ElectronSystemOption,
  RenderCMDExamplesDoc,
  ElectronCMDExamplesDoc,
  InstallCMDExamplesDoc,
}
