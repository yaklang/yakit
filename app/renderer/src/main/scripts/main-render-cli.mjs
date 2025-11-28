import {Command} from "commander"
import inquirer from "inquirer"
import chalk from "chalk"
import {execa} from "execa"
import {
    BusinessVersionOption,
    UIVersionToName,
    UIVersions,
    ElectronCMDExamplesDoc,
    ElectronSystemOption
} from "./cli-config.mjs"
import {cliCommands} from "./command.mjs"

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
            APP_UI_TYPE: ui,
            APP_IS_DEVTOOLS: devtools ? "true" : "false"
            // 你可以根据 options 动态添加更多
        }

        // 4. 确定要运行的基础命令
        // 假设开发是 npm run serve，构建是 npm run build
        const script = prod ? "build" : "serve"
        // 这里的 'npm' 在 Windows 下需要改为 'npm.cmd'，execa 会自动处理，但为了保险通常直接运行构建工具如 'vue-cli-service'
        // 为了通用，我们这里直接调用 npm run [script]
        const command = "npm"
        const args = ["run", script]

        console.log(chalk.green("\n🚀 准备执行..."))
        console.log(chalk.cyan(`> UI版本: ${chalk.bold(ui)}`))
        console.log(chalk.cyan(`> 模式: ${chalk.bold(prod ? "Production Build" : "Development Server")}`))
        console.log(chalk.cyan(`> 测试环境: ${chalk.bold(devtools ? "Yes" : "No")}`))
        console.log(chalk.gray(`> 实际指令: ${command} ${args.join(" ")} (with env vars)`))
        console.log("---")

        // 5. 执行命令
        try {
            // stdio: 'inherit' 让子进程的日志直接输出到当前终端，保留颜色
            await execa(command, undefined, {
                env: envVars,
                stdio: "inherit"
            })
        } catch (error) {
            // 错误通常已经通过 stdio: inherit 打印出来了，这里只需捕获退出码
            process.exit(error.exitCode || 1)
        }
    })

program
    .command("render")
    .description("启动或构建 渲染进程")
    // 定义参数
    .option("-v, --versions <type>", `UI版本 (${UIVersions.join("|")})`)
    .option("-p, --prod", "是否为生产环境构建 (默认为开发模式)", false)
    .option("-d, --devtools", "是否展示开发者工具 (开发模式默认开启)", false)
    .action(async (options) => {
        console.log(JSON.stringify(options))

        let {ui, devtools, prod} = options

        // 1. 如果没有通过命令行传入 UI 参数，则进入交互式问答模式
        if (!ui) {
            console.log(chalk.blue("未检测到 UI 参数，进入交互模式..."))
            const answers = await inquirer.prompt([
                {
                    type: "list",
                    name: "ui",
                    message: "请选择 UI 版本:",
                    choices: UIVersions
                },
                {
                    type: "confirm",
                    name: "devtools",
                    message: "是否开启测试环境配置?",
                    default: false,
                    when: !devtools // 如果命令行没传 -t 才问
                },
                {
                    type: "list",
                    name: "mode",
                    message: "请选择执行模式:",
                    choices: ["development (start)", "production (build)"],
                    default: "development (start)",
                    when: !prod // 如果命令行没传 -p 才问
                }
            ])

            ui = answers.ui
            devtools = devtools || answers.devtools
            prod = prod || (answers.mode && answers.mode.includes("production"))
        }

        // 2. 校验 UI 参数
        if (!UIVersions.includes(ui)) {
            console.log(chalk.red(`Error: 无效的 UI 版本 "${ui}".\n支持列表: \n${UIVersionToName}`))
            process.exit(1)
        }

        // 3. 组装环境变量
        // 这里对应你在 package.json 里原本写的 VUE_APP_UI=ce 这种
        const envVars = {
            ...process.env, // 保留原有的环境变量
            APP_UI_TYPE: ui,
            APP_IS_DEVTOOLS: devtools ? "true" : "false"
            // 你可以根据 options 动态添加更多
        }

        // 4. 确定要运行的基础命令
        // 假设开发是 npm run serve，构建是 npm run build
        const script = prod ? "build" : "serve"
        // 这里的 'npm' 在 Windows 下需要改为 'npm.cmd'，execa 会自动处理，但为了保险通常直接运行构建工具如 'vue-cli-service'
        // 为了通用，我们这里直接调用 npm run [script]
        const command = "npm"
        const args = ["run", script]

        console.log(chalk.green("\n🚀 准备执行..."))
        console.log(chalk.cyan(`> UI版本: ${chalk.bold(ui)}`))
        console.log(chalk.cyan(`> 模式: ${chalk.bold(prod ? "Production Build" : "Development Server")}`))
        console.log(chalk.cyan(`> 测试环境: ${chalk.bold(devtools ? "Yes" : "No")}`))
        console.log(chalk.gray(`> 实际指令: ${command} ${args.join(" ")} (with env vars)`))
        console.log("---")

        // 5. 执行命令
        try {
            // stdio: 'inherit' 让子进程的日志直接输出到当前终端，保留颜色
            await execa(command, args, {
                env: envVars,
                stdio: "inherit"
            })
        } catch (error) {
            // 错误通常已经通过 stdio: inherit 打印出来了，这里只需捕获退出码
            process.exit(error.exitCode || 1)
        }
    })

program.parse(process.argv)
