const childProcess = require("child_process")
const {getLocalYaklangEngine} = require("../filePath")
const {psYakList} = require("../handlers/yakLocal")
const {killYakGRPC} = require("../handlers/yakLocal")
const isWindows = process.platform === "win32"
/** @name 生成windows系统的管理员权限命令 */
function generateWindowsSudoCommand(file, args) {
    const cmds = args === "" ? `${file}` : `${file} ${args}`
    return `${cmds}`
}
// 当前服务ppid
let ppid = null

const asyncKillDynamicControl = () => {
    return new Promise(async (resolve, reject) => {
        if (ppid) {
            const yakList = await psYakList()
            const processItem = yakList.find((element) => {
                if (isWindows) {
                    return element.ppid === ppid
                } else {
                    return element.pid === ppid
                }
            })
            if (processItem) {
                killYakGRPC(processItem.pid)
                    .then(() => {
                        ppid = null
                        console.log("colse-colse-colse-colse-colse-")
                    })
                    .finally(() => {
                        resolve()
                    })
            } else {
                resolve()
            }
        } else {
            resolve()
        }
    })
}

const asyncStartDynamicControl = (win, params) => {
    // 如果已启用服务 则跳过启用服务 若10S内未获取到密钥则杀掉进程重启
    if (ppid) {
        return new Promise((resolve, reject) => resolve({alive:true}))
    }
    const {note, secret, server, gen_tls_crt} = params
    return new Promise((resolve, reject) => {
        try {
            const subprocess = childProcess.exec(
                generateWindowsSudoCommand(
                    getLocalYaklangEngine(),
                    `xgrpc  --server  ${server} --gen-tls-crt ${gen_tls_crt} --secret ${secret} --note ${note}`
                ),
                {
                    maxBuffer: 1000 * 1000 * 1000,
                    stdio: "pipe"
                }
            )
            subprocess.stdout.on("data", (stdout) => {
                console.log("start-data", stdout)
                if (stdout.includes("yak grpc ok")) {
                    setTimeout(() => {
                        resolve({alive:false})
                    }, 1000)
                    // 当前启用服务id
                    ppid = subprocess.pid
                }
            })
            subprocess.stderr.on("data", (stderr) => {
                if (stderr) {
                    ppid = null
                    reject(stderr.toString("utf-8"))
                }
            })
            subprocess.on("error", (err) => {
                if (err) {
                    ppid = null
                    reject(err)
                }
            })

            subprocess.on("close", async (e) => {
                if (e) reject(e)
                ppid = null
            })
        } catch (e) {
            reject(e)
        }
    })
}

const asyncAliveDynamicControlStatus = () => {
    return new Promise((resolve, reject) => resolve(!!ppid))
}

module.exports = {
    asyncKillDynamicControl,
    asyncStartDynamicControl,
    asyncAliveDynamicControlStatus,
}
