// #region 公共变量和方法
/** 前端业务版本的介绍和值 */
const BusinessVersionOption = [
    {value: "yakit", name: "yakit: Yakit CE"},
    {value: "enpritrace", name: "enpritrace: Yakit EE"},
    {value: "simple-enpritrace", name: "simple-enpritrace: Yakit SE"},
    {value: "irify", name: "irify: Irify CE"},
    {value: "irify-enpritrace", name: "irify-enpritrace: Irify EE"},
    {value: "memfit", name: "memfit: Memfit CE"}
]
// #endregion

// #region electron 相关cli配置内容
/** electron命令的示例 */
const ElectronCMDExamplesDoc = `
  # 启动开发环境主进程
  $ yarn cli electron

  # 构建 Mac 版本的 Yakit 安装包
  $ yarn cli electron -b -s mac -v yakit
  
  # 构建 旧版兼容模式 的 Linux 版本 的 Memfit 安装包
  $ yarn cli electron -b -s linux -l -v memfit
`

/** electron命令中 -s 支持选项的介绍和值 */
const ElectronSystemOption = [
    {value: "win", name: "win: Windows 系统"},
    {value: "mac", name: "mac: MacOS 系统"},
    {value: "linux", name: "linux: Linux 系统"},
    {value: "mwl", name: "mwl: 跨平台 (Mac + Windows + Linux)"}
]
// #endregion

// #region render 相关cli配置内容
// #endregion

/**
 * UI 的所有版本和版本对应的详细信息
 */
const CLIConfig = {
    yakit: {
        name: `Yakit Community Edition`
    },
    enpritrace: {
        name: `Yakit Enterprise Edition`
    },
    "simple-enpritrace": {
        name: `Yakit Simple Enterprise Edition`
    },
    irify: {
        name: `Irify Community Edition`
    },
    "irify-enpritrace": {
        name: `Irify Enterprise Edition`
    },
    memfit: {
        name: `Memfit Edition`
    }
}

/** 所有支持的 UI 版本 */
const UIVersions = Object.keys(CLIConfig)

const UIVersionMaxLength = Math.max(...UIVersions.map((e) => e.length))
/** 支持 UI 的版本和对应NAME */
const UIVersionToName = UIVersions.map((item) => {
    return `  ${item.padEnd(UIVersionMaxLength)} → ${CLIConfig[item].name}`
}).join("\n")

export {BusinessVersionOption, ElectronCMDExamplesDoc, ElectronSystemOption, UIVersions, UIVersionToName}
