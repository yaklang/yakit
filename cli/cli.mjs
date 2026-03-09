import {genCLIDisplayList, importWithHint} from "./utils.mjs"
import {
    BusinessVersionOption,
    ElectronCMDExamplesDoc,
    ElectronSystemOption,
    InstallCMDExamplesDoc,
    RenderCMDExamplesDoc
} from "./config.mjs"
import {MainChalk, RedChalk, BlueChalk, YellowChalk, GreenChalk, CyanChalk} from "./chalk.mjs"

const Command = await importWithHint("commander", (mod) => mod.Command)
const inquirer = await importWithHint("inquirer", (mod) => mod.default)
const execa = await importWithHint("execa", (mod) => mod.execa)
const concurrently = await importWithHint("concurrently", (mod) => mod.default)

// 错误信息输出的开头标题
const ErrorHeaderTitle = RedChalk("ERR! ")

const program = new Command()

// CLI命令指令头
program
    .name("yarn cli")
    .usage("<command>")
    .description("前端项目统一启动/构建 CLI 工具")
    .addHelpText(
        "beforeAll",
        BlueChalk(`
  ╭──────────────────────────────────────────────╮
  │                                              │
  │   🚀  Yakit CLI TOOL                         │
  │   统一管理 Electron 与 Render 进程启动       │
  │                                              │
  ╰──────────────────────────────────────────────╯
  `)
    )

// 自定义错误输出格式
program.configureOutput({
    writeErr: (str) => process.stdout.write(`${ErrorHeaderTitle}${str}`),
    outputError: (str, write) => write(str.replace(/^error:/i, ""))
})

// #region install相关cli
program
    .command("install")
    .description("下载项目依赖")
    .option("-e, --electron", "electron主进程项目", false)
    .option("-l, --link", `引擎链接渲染端项目`, false)
    .option("-m, --main ", `主渲染端项目`, false)
    .addHelpText(
        "after",
        `
${YellowChalk.bold("Examples:")}
${InstallCMDExamplesDoc}
`
    )
    .action(async (options) => {
        let {electron, link, main} = options

        try {
            if (electron && !link && !main) {
                console.log(MainChalk.bold(`Start install Electron ...`))
                await execa("yarn", ["install"], {stdio: "inherit"})
            } else if (!electron && link && !main) {
                console.log(MainChalk.bold(`Start install Link-Render ...`))
                await execa("yarn", ["install"], {
                    cwd: "app/renderer/engine-link-startup", // 直接指定执行目录
                    stdio: "inherit"
                })
            } else if (!electron && !link && main) {
                console.log(MainChalk.bold(`Start install Main-Render ...`))
                await execa("yarn", ["install"], {
                    cwd: "app/renderer/src/main", // 直接指定执行目录
                    stdio: "inherit"
                })
            } else {
                console.log(MainChalk.bold(`Start install Electron ...`))
                await execa("yarn", ["install"], {stdio: "inherit"})
                console.log(MainChalk.bold(`Start install Link-Render ...`))
                await execa("yarn", ["install"], {
                    cwd: "app/renderer/engine-link-startup", // 直接指定执行目录
                    stdio: "inherit"
                })
                console.log(MainChalk.bold(`Start install Main-Render ...`))
                await execa("yarn", ["install"], {
                    cwd: "app/renderer/src/main", // 直接指定执行目录
                    stdio: "inherit"
                })
            }
        } catch (error) {
            console.log(error)
            // 错误通常已经通过 stdio: inherit 打印出来了，这里只需捕获退出码
            process.exit(error.exitCode || 1)
        }
    })
// #endregion

// #region electron相关cli
program
    .command("electron")
    .description("启动或构建 Electron 主进程")
    .option("-b, --build", "是否为生产环境构建 (默认为开发模式)", false)
    .option(
        "-s, --system <type>",
        `生产环境可用: 系统版本 (${ElectronSystemOption.map((item) => item.value).join(" | ")})`
    )
    .option(
        "-v, --version <type>",
        `生产环境可用: 业务版本 (${BusinessVersionOption.map((item) => item.value).join(" | ")})`
    )
    .option("-l, --legacy", "生产环境可用: 是否为旧版兼容模式 (默认正常模板)", false)
    .addHelpText(
        "after",
        `
${YellowChalk.bold("Examples:")}
${ElectronCMDExamplesDoc}
`
    )
    .action(async (options) => {
        let {build, system, legacy, version} = options

        if (!build && legacy) {
            console.log(YellowChalk("Warning: 开发模式下 legacy 选项不生效，将被忽略"))
        }
        if (!build && system) {
            console.log(YellowChalk("Warning: 开发模式下 system 选项不生效，将被忽略"))
        }
        if (!build && version) {
            console.log(YellowChalk("Warning: 开发模式下 version 选项不生效，将被忽略"))
        }

        if (build) {
            // 构建模式

            const systemValids = ElectronSystemOption.map((item) => item.value)
            const businessValids = BusinessVersionOption.map((item) => item.value)

            if (!!system && !systemValids.includes(system)) {
                // 校验 system 参数
                console.log(
                    RedChalk(
                        `Error: 无效的system "${system}".\n支持列表: \n${genCLIDisplayList(ElectronSystemOption, "value", "name")}`
                    )
                )
                process.exit(1)
            }
            if (!!version && !businessValids.includes(version)) {
                // 校验 version 参数
                console.log(
                    RedChalk(
                        `Error: 无效的业务版本 "${version}".\n支持列表: \n${genCLIDisplayList(BusinessVersionOption, "value", "name")}`
                    )
                )
                process.exit(1)
            }

            if (!system || !version) {
                // 如果没有通过命令行传入 system 参数，则进入交互式问答模式
                console.log(BlueChalk("未检测到 system 或 version 参数，进入交互模式..."))
                try {
                    const answers = await inquirer.prompt([
                        {
                            type: "list",
                            name: "system",
                            message: "请选择系统版本:",
                            choices: ElectronSystemOption,
                            when: !system // 如果命令行没传 -s 才问
                        },
                        {
                            type: "list",
                            name: "version",
                            message: "请选择业务版本:",
                            choices: BusinessVersionOption,
                            when: !version // 如果命令行没传 -v 才问
                        },
                        {
                            type: "confirm",
                            name: "legacy",
                            message: "是否开启旧版兼容模式?",
                            default: false,
                            when: !legacy // 如果命令行没传 -l 才问
                        }
                    ])

                    system = answers.system
                    version = answers.version
                    legacy = legacy || answers.legacy
                } catch (error) {
                    if (error instanceof Error && error.name === "ExitPromptError") {
                        console.log("👋 Exit Command Guidance!")
                        return
                    } else {
                        process.exit(error.exitCode || 1)
                    }
                }
            }
        }

        // 确定要运行的基础命令
        console.log(GreenChalk("\n🚀 准备执行..."))
        if (build) {
            console.log(CyanChalk.bold(`> 系统版本: ${system}`))
            console.log(CyanChalk.bold(`> 业务版本: ${version}`))
            console.log(CyanChalk.bold(`> 是否为兼容旧版模式: ${legacy ? "Yse" : "No"}`))
            console.log(``)
        } else {
            console.log(CyanChalk(`> 开始启动 Electron 开发环境...`))
            console.log(``)
        }

        try {
            if (!build) {
                await execa("electron", ["."], {stdio: "inherit"})
            } else {
                // 组装环境变量
                const envVars = {
                    ...process.env, // 保留原有的环境变量
                    PLATFORM: version,
                    CSC_IDENTITY_AUTO_DISCOVERY: "false"
                }
                if (legacy) {
                    envVars.THE_LEGACY = "true"
                }

                // 执行命令
                if (system === "mwl") {
                    console.log(MainChalk.bold(`Start building win ...`))
                    await execa(
                        "electron-builder",
                        ["build", `--win`, "--config", "./packageScript/electron-builder.config.js"],
                        {
                            env: envVars,
                            stdio: "inherit"
                        }
                    )
                    console.log(MainChalk.bold(`Start building mac ...`))
                    await execa(
                        "electron-builder",
                        ["build", `--mac`, "--config", "./packageScript/electron-builder.config.js"],
                        {
                            env: envVars,
                            stdio: "inherit"
                        }
                    )
                    console.log(MainChalk.bold(`Start building linux ...`))
                    await execa(
                        "electron-builder",
                        ["build", `--linux`, "--config", "./packageScript/electron-builder.config.js"],
                        {
                            env: envVars,
                            stdio: "inherit"
                        }
                    )
                } else {
                    await execa(
                        "electron-builder",
                        ["build", `--${system}`, "--config", "./packageScript/electron-builder.config.js"],
                        {
                            env: envVars,
                            stdio: "inherit"
                        }
                    )
                }
            }
        } catch (error) {
            console.log(error)
            // 错误通常已经通过 stdio: inherit 打印出来了，这里只需捕获退出码
            process.exit(error.exitCode || 1)
        }
    })
// #endregion

// #region render相关cli
program
    .command("render")
    .description("启动或构建 渲染进程")
    // 定义参数
    .option("-b, --build", "是否为生产环境构建 (默认为开发模式)", false)
    .option("-v, --version <type>", `业务版本 (${BusinessVersionOption.map((item) => item.value).join(" | ")})`)
    .option("-d, --devtools", "是否展示开发者工具 (开发模式默认开启)", false)
    .option("-l, --link", "只执行link-render项目相关cli(默认link和main都启动)", false)
    .option("-m, --main", "只执行main-render项目相关cli(默认link和main都启动)", false)
    .addHelpText(
        "after",
        `
${YellowChalk.bold("Examples:")}
${RenderCMDExamplesDoc}
`
    )
    .action(async (options) => {
        let {build, version, devtools, link, main} = options

        // 有效的version值
        const businessValids = BusinessVersionOption.map((item) => item.value)

        // 校验[version]参数
        if (version && !businessValids.includes(version)) {
            console.log(
                RedChalk(
                    `Error: 无效的业务版本 "${version}".\n支持列表: \n${genCLIDisplayList(BusinessVersionOption, "value", "name")}`
                )
            )
            process.exit(1)
        }

        // 1. 如果没有通过命令行传入 UI 参数，则进入交互式问答模式
        if (!version) {
            console.log(BlueChalk("未检测到业务版本参数，进入交互模式..."))
            try {
                const answers = await inquirer.prompt([
                    {
                        type: "list",
                        name: "version",
                        message: "请选择 业务版本 版本:",
                        choices: businessValids
                    },
                    {
                        type: "confirm",
                        name: "build",
                        message: "是否为生产构建环境:",
                        default: false,
                        when: !build // 如果命令行没传 -b 才问
                    },
                    {
                        type: "confirm",
                        name: "devtools",
                        message: "构建环境是否展示开发者工具UI?",
                        default: false,
                        when: (answers) => {
                            if (answers.build) {
                                return !devtools // 如果命令行没传 -t 才问
                            }
                        }
                    },
                    {
                        type: "list",
                        name: "render",
                        message: "请选择启动的渲染项目:",
                        choices: ["link-render", "main-render", "link&main render"],
                        when: !link && !main // 如果命令行没传 -l 和 -m 才问
                    }
                ])

                version = answers.version
                build = build || answers.build
                devtools = devtools || answers.devtools
                if (answers.render === "link-render") {
                    link = true
                    main = false
                } else if (answers.render === "main-render") {
                    link = false
                    main = true
                } else {
                    link = true
                    main = true
                }
            } catch (error) {
                if (error instanceof Error && error.name === "ExitPromptError") {
                    console.log("👋 Exit Command Guidance!")
                    return
                } else {
                    process.exit(error.exitCode || 1)
                }
            }
        }

        // 确定要运行的基础命令
        console.log(GreenChalk("\n🚀 准备执行..."))
        console.log(CyanChalk.bold(`> 业务版本: ${version}`))
        console.log(CyanChalk.bold(`> 模式: ${build ? "Production" : "Development"}`))
        console.log(CyanChalk.bold(`> show devTools: ${devtools ? "Yes" : "No"}`))
        console.log(
            CyanChalk.bold(
                `> 渲染端类型: ${link && !main ? "Link-Render" : !link && main ? "Main-Render" : "Link&Main Render"}`
            )
        )
        console.log(YellowChalk.bold(`ready to start ...\n`))

        try {
            // 组装环境变量
            const envVars = {
                ...process.env, // 保留原有的环境变量
                CLIVersion: version,
                CLIBuild: build,
                CLIDevtools: devtools
            }

            if (link && !main) {
                await execa("yarn", ["cli"], {
                    cwd: "app/renderer/engine-link-startup", // 直接指定执行目录
                    env: envVars,
                    stdio: "inherit"
                })
            } else if (!link && main) {
                await execa("yarn", ["cli"], {
                    cwd: "app/renderer/src/main", // 直接指定执行目录
                    env: envVars,
                    stdio: "inherit"
                })
            } else {
                const {result} = concurrently(
                    [
                        {
                            command: "yarn cli",
                            name: BlueChalk("link"),
                            cwd: "app/renderer/engine-link-startup",
                            env: envVars
                        },
                        {
                            command: "yarn cli",
                            name: MainChalk("main"),
                            cwd: "app/renderer/src/main",
                            env: envVars
                        }
                    ],
                    {
                        killOthers: ["failure"],
                        prefix: "[{name}]"
                    }
                )
                await result
            }
        } catch (error) {
            console.log(error)
            // 错误通常已经通过 stdio: inherit 打印出来了，这里只需捕获退出码
            process.exit(error.exitCode || 1)
        }
    })
// #endregion

program.parse(process.argv)
