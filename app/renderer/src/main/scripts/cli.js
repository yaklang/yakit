#!/usr/bin/env node
const {execSync} = require("child_process")
const yargs = require("yargs/yargs")
const {hideBin} = require("yargs/helpers")

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

// 详细说明
const epilogue = `
环境配置说明：
互斥环境（必须且只能选其一）:
${Object.keys(versionEnvMaps)
    .map((k) => `  ${k.padEnd(10)} → ${versionEnvMaps[k].desc || "无"}`)
    .join(`\n`)}

可组合环境:
${Object.keys(commandMap)
    .map((k) => {
        const envs = commandMap[k].extraEnvMaps
        if (Object.keys(envs).length === 0) return ""
        let content = `  ${k}: \n`
        Object.keys(envs).map((el) => {
            content += `    ${el.padEnd(10)} → ${envs[el].desc || "无"}\n`
            return ""
        })
        return content
    })
    .filter(Boolean)
    .join(`\n`)}
更多信息请参考项目 cli.js 文件配置项
`

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

const cli = Object.entries(commandMap).reduce(
    (sum, [cmd, config]) => {
        return sum.command(
            cmd,
            config.desc,
            (yargs) => {
                return yargs.option("env", {
                    alias: "e",
                    type: "string",
                    choices: Object.keys({...versionEnvMaps, ...config.extraEnvMaps}).filter((e) => {
                        return cmd === "start" ? e !== "devTool" : true
                    }),
                    describe: "选择环境配置(可多选，用逗号分隔)",
                    default: DefaultEnv,
                    coerce: (value) => {
                        if (!value) return []
                        const parts = value
                            .split(",")
                            .map((s) => s.trim())
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
                    }
                })
            },
            (argv) => {
                // 合并环境变量
                const baseEnvs = config.envs
                const extraEnvs = argv.env.flatMap((e) => ({...versionEnvMaps, ...config.extraEnvMaps})[e].value)
                runBuild(cmd, [...baseEnvs, ...extraEnvs])
            }
        )
    },
    yargs(hideBin(process.argv))
)

cli.scriptName("render-cli")
    .usage("$0 <operate> [env]")
    .demandCommand(1, "A valid command must be specified")
    .strictCommands()
    .recommendCommands()
    .option("help", {
        alias: "h",
        description: "显示帮助信息"
    })
    .example([
        ["$0 start", "启动 ce版本 渲染端"],
        ["$0 start -e ee", "启动 ee版本 渲染端"],
        ["$0 build -e ee,devTool", "构建 ee版本 加显示开发者工具的渲染端"]
    ])
    .epilogue(epilogue)
    .help()
    .alias("h", "help")
    .version(false)
    .parse()
