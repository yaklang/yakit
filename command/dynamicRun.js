const {exec} = require("child_process")
const process = require("process")

// 命令参数
const args = process.argv.slice(2).filter((el) => !!el)
console.log("Dynamic Run Script", process.argv, args, args.join("-"))

//
const commands = [
    {
        command: "start-render",
        description: "start-up render process"
    },
    {
        command: "start-electron",
        description: "start-up yakit process"
    },
    {
        command: "build-render",
        description: "build render package"
    },
    {
        command: "build-electron",
        description: "build yakit package"
    }
]

//
const flags = [
    {option: "-ce", description: "Belong to command <start-render|build-render>", details: "Community Edition Version"},
    {
        option: "-ee",
        description: "Belong to command <start-render|build-render>",
        details: "Enterprise Edition Version"
    },
    {option: "-se", description: "Belong to command <start-render|build-render>", details: "Simple Edition Version"},
    {option: "-d", description: "Belong to command <build-render[flags]>", details: "Show Developer Tools"},
    {option: "-w", description: "Belong to command <build-electron>", details: "Window System"},
    {option: "-l", description: "Belong to command <build-electron>", details: "Linux System"},
    {option: "-m", description: "Belong to command <build-electron>", details: "Mac System"},
    {option: "-mwl", description: "Belong to command <build-electron>", details: "Mac Window Linux System"},
]

console.log(`Usage: yakit [Options] [Flags]\n\n`)

console.log(`Commands:\n`)
const maxCommandLength = Math.max(...commands.map((cmd) => cmd.command.length)) + 2
const maxDescriptionLength = Math.max(...commands.map((cmd) => cmd.description.length)) + 2
commands.forEach((cmd) => {
    console.log(`   ` + cmd.command.padEnd(maxCommandLength) + cmd.description.padEnd(maxDescriptionLength))
})

console.log(`\nFlags:\n`)
const maxOptionLength = Math.max(...flags.map((flag) => flag.option.length)) + 2
const maxDescriptionsLength = Math.max(...flags.map((flag) => flag.description.length)) + 2
const maxDetailsLength = Math.max(...flags.map((flag) => flag.details.length)) + 2
flags.forEach((flag) => {
    console.log(
        `   ` +
            flag.option.padEnd(maxOptionLength) +
            flag.description.padEnd(maxDescriptionsLength) +
            flag.details.padEnd(maxDetailsLength)
    )
})
console.log(`\n\n`)

return

/**
 * 第一参数: 启动选项, 必须接第二参数, 否则直接抛出错误并停止
 * - start: 启动开发环境项目
 * - build: 打包项目
 */
const bootOption = args[0]
if (!["start", "build"].includes(bootOption)) {
    console.error("%cerror %s", "color: yellow;", "Invalid boot option, Usage: start/build")

    console.error("Invalid boot option, Usage: start/build")
    console.error("Usage: node dynamicRun.js <bootOption> <environment> <action>")
    return
}

/**
 * 第二参数: 环境选项, 必须接第三参数, 否则直接抛出错误并停止
 * - dev: 开发环境
 * - build: 打包环境
 */
const environment = args[1]
/**
 * 第三参数: 配置版本
 */
const version = args[1] // 第二个参数作为操作，比如 start 或 build

if (!environment || !action) {
    console.error("Usage: node dynamicRun.js <environment> <action>")
    console.error("Example: node dynamicRun.js dev start")
    process.exit(1)
}

// 根据用户输入的环境映射到环境变量
const envMap = {
    dev: "development",
    prod: "production",
    staging: "staging"
}

// 检查环境是否有效
const env = envMap[environment]
if (!env) {
    console.error(`Invalid environment: ${environment}`)
    console.error(`Valid environments are: ${Object.keys(envMap).join(", ")}`)
    process.exit(1)
}

// 生成对应的命令
const command = `cross-env REACT_APP_ENV=${env} react-scripts ${action}`

// 执行命令
exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error: ${error.message}`)
        return
    }
    if (stderr) {
        console.error(`Stderr: ${stderr}`)
        return
    }
    console.log(stdout)
})
