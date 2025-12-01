const {execSync} = require("child_process")
const Custom_Envs=require("./env.js")

const args = process.argv.slice(2)

const isProd = args.includes("prod")
const isDevTools = args.includes("devtools")

function buildCommand() {
    if(isProd){
        const envs={...Custom_Envs["noSourceMap"],...Custom_Envs["devTool"]}
    }else{
        const envs={...Custom_Envs["noBrouser"],...Custom_Envs["devTool"]}
        const suffixCmd ="react-app-rewired start"

    }
}

function runBuild(op, env) {
    try {
        console.log(`🚀 开始构建 ${isProd ? "生产" : "开发"} 环境...`)
        const command = buildCommand()
        console.log("📢 执行命令:", command)
        execSync(command, {stdio: "inherit",{}})
    } catch (error) {
        console.error("❌ 构建失败:", error.message)
        process.exit(1)
    }
}

console.log("当前传入的参数：", args)
