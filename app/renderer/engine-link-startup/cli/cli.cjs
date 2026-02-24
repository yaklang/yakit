const {execSync} = require("child_process")

/**
 * @synchronize [IDENTIFIER_NAME]
 * 注意：此对象必须全局保持一致。
 * 修改此项时，请务必同步修改另外几处。
 */
const versionMap = {
    yakit: "yakit",
    yakitEE: "enterprise",
    yakitSE: "simple-enterprise",
    irify: "irify",
    irifyEE: "irify-enterprise",
    memfit: "memfit"
}

const resolvedVersion = () => {
    const cliVersion = process.env.CLIVersion
    if (!cliVersion || !versionMap[cliVersion]) {
        console.error("未指定版本号或版本号无效, 请传入正确的版本, 例如: (yakit|yakitEE|yakitSE|irify|irifyEE|memfit)")
        return null
    }
    return versionMap[cliVersion]
}

const resolvedBuild = () => {
    const cliBuild = process.env.CLIBuild
    if (cliBuild === "true") return true
    return false
}

const version = resolvedVersion()
const build = resolvedBuild()

// 未知参数, 退出命令执行
if (!version) process.exit(1)

console.log("Execute UI version: ", version)
console.log("Is it a build command: ", build ? "Yes" : "No")

const scriptName = build ? "tsc --noEmit && vite build" : "vite"

try {
    execSync(scriptName, {
        stdio: "inherit",
        env: {
            ...process.env,
            VITE_PLATFORM: version
        }
    })
} catch (error) {
    console.error(`Failed to execute script: ${scriptName}`)
    console.error(error?.message || error)
    process.exit(1)
}
