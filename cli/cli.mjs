import {Command} from "commander"
import inquirer from "inquirer"
import chalk from "chalk"
import {execa} from "execa"
import concurrently from "concurrently"
import {BusinessVersionOption, ElectronCMDExamplesDoc, ElectronSystemOption} from "./config.mjs"
import {buildElectronCommand, cliCommands} from "./command.mjs"
import {buildLinkRenderCommand, buildMainRenderCommand} from "./command.mjs"

// #region chalk 颜色配置
// 主题色
const MainChalk = chalk.hex("#B06028")
// 红色
const RedChalk = chalk.hex("#D93F3F")
// 蓝色
const BlueChalk = chalk.hex("#2D7CE8")
// 黄色
const YellowChalk = chalk.hex("#DF900C")
// 绿色
const GreenChalk = chalk.hex("#11A976")
// 青色
const CyanChalk = chalk.hex("#1E6C76")
// 灰色
const GrayChalk = chalk.hex("#5F636B")
// #endregion

// 错误信息输出的开头标题
const ErrorHeaderTitle = RedChalk("CLI ERR!")

const program = new Command()

program
    .name("yarn cli")
    .usage("<command>")
    .description("前端项目统一启动/构建 CLI 工具")
    .addHelpText(
        "beforeAll",
        chalk.cyan(`
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
        console.log(JSON.stringify(options))

        let {build, system, legacy, version} = options

        let cmd = ""
        let envs = {}

        if (!build) {
            // 如果build为false, legacy为false, system没有值, 则为开发模式
            if (legacy || !!system) {
                console.log(`${ErrorHeaderTitle} 开发环境不允许设置 legacy 和 system 配置项`)
                process.exit(1)
            }

            cmd = cliCommands["start-electron"]
        } else {
            // 构建模式
            const systemValids = ElectronSystemOption.map((item) => item.value)
            const businessValids = BusinessVersionOption.map((item) => item.value)

            if (!!system && !systemValids.includes(system)) {
                // 校验 system 参数
                console.log(`${ErrorHeaderTitle} 无效的 system 值, 支持列表(${MainChalk(systemValids.join(" | "))})`)
                process.exit(1)
            }
            if (!!version && !businessValids.includes(version)) {
                // 校验 version 参数
                console.log(`${ErrorHeaderTitle} 无效的 version 值, 支持列表(${MainChalk(businessValids.join(" | "))})`)
                process.exit(1)
            }

            if (!system) {
                // 如果没有通过命令行传入 system 参数，则进入交互式问答模式
                console.log(BlueChalk("未检测到 system 参数，进入交互模式..."))
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

                    const buildResult = buildElectronCommand(system, legacy, version)
                    cmd = buildResult.cmd
                    envs = buildResult.envs
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

        // 3. 组装环境变量
        // 这里对应你在 package.json 里原本写的 VUE_APP_UI=ce 这种
        const envVars = {
            ...process.env, // 保留原有的环境变量
            ...(envs || {}) // 添加新的环境变量
        }

        // 4. 确定要运行的基础命令
        console.log(GreenChalk("\n🚀 准备执行..."))
        if (build) {
            console.log(CyanChalk(`> 构建系统版本: ${chalk.bold(system)}`))
            console.log(CyanChalk(`> 构建业务版本: ${chalk.bold(version)}`))
            console.log(CyanChalk(`> 是否为兼容旧版模式: ${chalk.bold(legacy ? "是" : "否")}`))
            console.log(GrayChalk(`> 实际指令: \n  ${cmd}`))
        } else {
            console.log(CyanChalk(`> 开始启动 Electron 开发环境...`))
            console.log(GrayChalk(`> 实际指令: \n  ${cmd}`))
        }
        console.log("---")

        // 5. 执行命令
        // try {
        //     // stdio: 'inherit' 让子进程的日志直接输出到当前终端，保留颜色
        //     await execa(command, undefined, {
        //         env: envVars,
        //         stdio: "inherit"
        //     })
        // } catch (error) {
        //     // 错误通常已经通过 stdio: inherit 打印出来了，这里只需捕获退出码
        //     process.exit(error.exitCode || 1)
        // }
    })

program
    .command("render")
    .description("启动或构建 渲染进程")
    // 定义参数
    .option("-p, --prod", "是否为生产环境构建 (默认为开发模式)", false)
    .option("-v, --version <type>", `业务版本 (${BusinessVersionOption.map((item) => item.value).join(" | ")})`)
    .option("-d, --devtools", "是否展示开发者工具 (开发模式默认开启)", false)
    .action(async (options) => {
        console.log(JSON.stringify(options))

        let {prod, version, devtools} = options

        let cmd = ""

        const businessValids = BusinessVersionOption.map((item) => item.value)

        // 校验 业务版本 参数
        if (!businessValids.includes(version)) {
            console.log(
                RedChalk(
                    `Error: 无效的业务版本 "${version}".\n支持列表: \n${BusinessVersionOption.map((item) => {
                        return `  ${item.value} → ${item.name}`
                    }).join("\n")}`
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
                        name: "prod",
                        message: "是否为生产构建环境:",
                        default: false,
                        when: !prod // 如果命令行没传 -p 才问
                    },
                    {
                        type: "confirm",
                        name: "devtools",
                        message: "构建环境是否展示开发者工具UI?",
                        default: false,
                        when: prod && !devtools // 如果命令行没传 -t 才问
                    }
                ])

                version = answers.version
                prod = prod || answers.prod
                devtools = devtools || answers.devtools
            } catch (error) {
                if (error instanceof Error && error.name === "ExitPromptError") {
                    console.log("👋 Exit Command Guidance!")
                    return
                } else {
                    process.exit(error.exitCode || 1)
                }
            }
        }

        cmd = `concurrently "${buildLinkRenderCommand(prod, devtools, version)}" "${buildMainRenderCommand(
            prod,
            devtools,
            version
        )}"`

        // 3. 组装环境变量
        const envVars = {
            ...process.env // 保留原有的环境变量
        }

        // 4. 确定要运行的基础命令
        console.log(chalk.green("\n🚀 准备执行..."))
        // console.log(chalk.cyan(`> UI版本: ${chalk.bold(ui)}`))
        // console.log(chalk.cyan(`> 模式: ${chalk.bold(prod ? "Production Build" : "Development Server")}`))
        // console.log(chalk.cyan(`> 测试环境: ${chalk.bold(devtools ? "Yes" : "No")}`))
        console.log(GrayChalk(`> 实际指令: \n  ${cmd}`))
        console.log("---")

        // 5. 执行命令

        const {result} = concurrently([
            // {command: "cd app/renderer/engine-link-startup && yarn electron-render", name: "link"},
            {command: buildMainRenderCommand(prod, devtools, version), name: "main"}
        ])
        try {
            // stdio: 'inherit' 让子进程的日志直接输出到当前终端，保留颜色
            // await execa(cmd, {
            //     env: envVars,
            //     stdio: "inherit"
            // })
            await result
        } catch (error) {
            console.log(error)
            // 错误通常已经通过 stdio: inherit 打印出来了，这里只需捕获退出码
            process.exit(error.exitCode || 1)
        }
    })

program.parse(process.argv)
