const {Command, Option} = require("commander")
const {execSync} = require("child_process")

/**
 * 参考 api 文件
 * url: https://github.com/tj/commander.js/blob/master/typings/index.d.ts
 */

const program = new Command("render-cli")

const ENV_FILE = "./.env-cmdrc"

const commandMap = {
    start: {
        envs: ["noBrouser", "devTool"],
        desc: "启动渲染端项目",
        extraEnvMaps: {}
    },
    build: {
        envs: ["noSourceMap"],
        desc: "构建渲染端项目",
        extraEnvMaps: {
            devTool: {desc: "展示开发者工具", value: ["devTool"]},
            analyzer: {desc: "启动包大小分析", value: ["analyzer"]}
        }
    }
}
const DefaultEnv = "ce"
// 软件版本环境(互斥逻辑)
const versionEnvMaps = {
    ce: {desc: "社区版", value: []},
    ee: {desc: "企业版", value: ["enterprise"]},
    se: {desc: "简易版", value: ["simpleEE"]}
}

function buildCommand(op, env) {
    let baseCommand = `react-app-rewired ${op}`
    if (env && env.length > 0) {
        baseCommand = `env-cmd -e ${env.join(",")} -f ${ENV_FILE} ${baseCommand}`
    }
    return baseCommand
}

function runBuild(op, env) {
    try {
        console.log(`🚀 开始构建 ${op} ${env} 环境...`)
        const command = buildCommand(op, env)
        console.log("📢 执行命令:", command)
        execSync(command, {stdio: "inherit"})
    } catch (error) {
        console.error("❌ 构建失败:", error.message)
        process.exit(1)
    }
}

Object.entries(commandMap).forEach(([cmd, config]) => {
    const cmdObj = program.command(cmd).description(config.desc).allowUnknownOption(false)

    const envAll = {...versionEnvMaps, ...config.extraEnvMaps}
    const envsKey = Object.keys(envAll)

    const option = new Option("-e, --env [envs...]", `可选环境参数(逗号分隔)：${envsKey.join(" | ")}`)
        // .choices(envsKey) // 单值选项(自带校验), 不适合多值选项，检验需要自定义
        .argParser((value) => {
            try {
                const val = value.trim()
                if (!val) return []
                const parts = val
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean)
                    .filter((v, i, arr) => arr.indexOf(v) === i)
                const allEnv = {...versionEnvMaps, ...config.extraEnvMaps}

                // 验证值的有效性
                const validKeys = Object.keys(allEnv)
                const invalid = parts.find((p) => !validKeys.includes(p))
                if (invalid) {
                    throw new Error(`无效环境参数: ${invalid}，可用值：${validKeys.join(", ")}`)
                }

                // 验证是否有互斥的环境变量
                const MUTUALLY_EXCLUSIVE = Object.keys(versionEnvMaps)
                const exclusiveParams = parts.filter((p) => MUTUALLY_EXCLUSIVE.includes(p))
                if (exclusiveParams.length > 1) {
                    throw new Error(
                        `互斥参数错误：不能同时指定 [${exclusiveParams.join(", ")}]，` +
                            `只能选择 ${MUTUALLY_EXCLUSIVE.join(" / ")} 中的一个`
                    )
                }

                return parts
            } catch (error) {
                console.error("❌ 错误:", error.message)
                process.exit(1)
            }
        })
        .default([DefaultEnv])
    option.defaultValueDescription = DefaultEnv

    // 添加环境选项（多选）
    cmdObj
        .addOption(option)
        .configureHelp({showGlobalOptions: true})
        .addHelpOption(new Option("-h, --help", "显示帮助信息"))

    // 动态生成帮助信息
    cmdObj.addHelpText("after", () => {
        const extraHelp = []

        if (envsKey.length > 0) {
            extraHelp.push("\n额外环境参数说明:")
            Object.entries(envAll).forEach(([key, {desc}]) => {
                extraHelp.push(`  ${key.padEnd(15)} ${desc}`)
            })
        }

        return extraHelp.join("\n")
    })

    // 执行逻辑
    cmdObj.action((options) => {
        const {env} = options
        let envs = env === true ? ["ce"] : env
        const baseEnvs = config.envs
        const envCMD = envs.flatMap((e) => envAll[e].value)
        runBuild(cmd, [...baseEnvs, ...envCMD])
    })
})

const example = [
    {
        cmd: "yarn render-cli start -e ce",
        desc: "启动 ce版本 渲染端项目"
    },
    {
        cmd: "yarn render-cli build -e analyzer",
        desc: "构建渲染端包大小分析"
    },
    {
        cmd: "yarn render-cli build -e ee,devTool",
        desc: "构建 ee版本 渲染端项目, 同时展示开发者工具"
    }
]
const exampleCMDMaxLength = Math.max(...example.map((e) => e.cmd.length))
// 全局帮助定制
program.addHelpText(
    "afterAll",
    `
使用示例:
${example
    .map((item) => {
        return `  ${item.cmd.padEnd(exampleCMDMaxLength)} → ${item.desc}`
    })
    .join("\n")}
`
)

// 自定义 help 命令
program
    .addHelpCommand(new Command("help").description("显示帮助信息"))
    .addHelpOption(new Option("-h, --help", "显示帮助信息"))

program.parse(process.argv)
