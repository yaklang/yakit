const {ipcMain, dialog} = require("electron")
const childProcess = require("child_process")
const process = require("process")
const psList = require("./libs/ps-yak-process")
const _sudoPrompt = require("sudo-prompt")
const fs = require("fs")
const os = require("os")
const path = require("path")
const {setLocalCache} = require("../localCache")
const { async } = require("node-stream-zip")
const isWindows = process.platform === "win32"

if (process.platform === "darwin" || process.platform === "linux") {
    process.env.PATH = process.env.PATH + ":/usr/local/bin/"
}

let dbFile = "default-yakit.db"

function getRandomInt(max) {
    return Math.floor(Math.random() * max)
}

function generateWindowsSudoCommand(file, args) {
    const cmds = args === "" ? `"'${file}'"` : `"'${file}'" "'${args}'"`
    return `powershell.exe start-process -verb runas -WindowStyle hidden -filepath ${cmds}`
}

const getLatestYakLocalEngine = require("./upgradeUtil").getLatestYakLocalEngine

function sudoExec(cmd, opt, callback) {
    if (isWindows) {
        childProcess.exec(cmd, {maxBuffer: 1000 * 1000 * 1000, env: {YAK_DEFAULT_DATABASE_NAME: dbFile}}, (err) => {
            callback(err)
        })
    } else {
        _sudoPrompt.exec(
            cmd,
            {...opt, env: {YAKIT_HOME: path.join(os.homedir(), "yakit-projects/"), YAK_DEFAULT_DATABASE_NAME: dbFile}},
            callback
        )
    }
}

const windowsPidTableNetstatANO = (stdout) => {
    let lines = stdout.split("\n").map((i) => i.trim())
    let pidToPort = new Map()
    if (lines.length > 0) {
        lines
            .map((i) => i.split(/\s+/))
            .forEach((i) => {
                if (i.length !== 5) {
                    return
                }
                const pid = parseInt(i[4] || 1)
                const localPort = i[1]
                const port = parseInt(localPort.substr(localPort.lastIndexOf(":") + 1))
                let portList = pidToPort.get(pid)
                if (portList === undefined) {
                    pidToPort.set(pid, [])
                    portList = pidToPort.get(pid)
                }
                portList.push(port)
            })
    }

    return pidToPort
}

// asyncPsList wrapper
const fetchWindowsYakProcess = () => {
    return new Promise((resolve, reject) => {
        childProcess.exec("netstat /ano | findstr LISTENING", (error, stdout) => {
            if (error) {
                reject(error)
                return
            }

            let pidToPorts = windowsPidTableNetstatANO(stdout)
            psList()
                .then((data) => {
                    let ls = data
                        .filter((i) => {
                            return (i.name || "").includes("yak")
                        })
                        .map((i) => {
                            let portsRaw = "0"
                            try {
                                let ports = pidToPorts.get(i.pid)
                                if (ports.length > 0) {
                                    ports.forEach((i) => {
                                        if (parseInt(i) > 50000) {
                                            return
                                        }
                                        portsRaw = i
                                    })
                                }
                            } catch (e) {
                                console.info(i.cmd)
                            }
                            return {
                                port: portsRaw,
                                ...i
                            }
                        })
                        .map((i) => {
                            return {port: parseInt(i.port), ...i, origin: i}
                        })
                    resolve(ls)
                })
                .catch((e) => reject(e))
        })
    })
}
const fetchGeneralYakProcess = () => {
    return new Promise((resolve, reject) => {
        psList()
            .then((data) => {
                let ls = data
                    .filter((i) => {
                        try {
                            return i.cmd.includes("grpc")
                        } catch (e) {
                            return false
                        }
                    })
                    .map((i) => {
                        // 上一步筛选了 yak.*grpc 的命令, 所以没有 --port 的就是默认 grpc 启动的 8087 端口
                        let portsRaw = "8087"
                        try {
                            portsRaw = new RegExp(/port\s+(\d+)/).exec(i.cmd)[1]
                        } catch (e) {
                            console.info(i.cmd)
                        }
                        return {
                            port: portsRaw,
                            ...i,
                            name: "yak"
                        }
                    })
                    .map((i) => {
                        return {port: parseInt(i.port), ...i, origin: i}
                    })
                resolve(ls)
            })
            .catch((e) => reject(e))
    })
}
const fetchGeneralYakProcessx = () => {
    return new Promise((resolve, reject) => {
        psList()
            .then((data) => {
                let ls = data
                    .filter((i) => {
                        try {
                            return i.cmd.includes("yak xgrpc ")
                        } catch (e) {
                            return false
                        }
                    })
                    .map((i) => {
                        let portsRaw = "0"
                        try {
                            portsRaw = new RegExp(/port\s+(\d+)/).exec(i.cmd)[1]
                        } catch (e) {
                            console.info(i.cmd)
                        }
                        return {
                            port: portsRaw,
                            ...i,
                            name: "yak"
                        }
                    })
                    .map((i) => {
                        return {port: parseInt(i.port), ...i, origin: i}
                    })
                resolve(ls)
            })
            .catch((e) => reject(e))
    })
}

// asyncKillYakGRPC wrapper
const asyncKillYakGRPC = (pid) => {
    return new Promise((resolve, reject) => {
        if (process.platform === "win32") {
            childProcess.exec(`taskkill /F /PID ${pid}`, (error) => {
                if (!error) {
                    resolve("")
                } else {
                    sudoExec(generateWindowsSudoCommand("taskkill", `/F /PID ${pid}`), undefined, (error) => {
                        if (!error) {
                            resolve("")
                        } else {
                            reject(`${error}`)
                        }
                    })
                }
            })
        } else {
            childProcess.exec(`kill -9 ${pid}`, (error) => {
                if (!error) {
                    resolve("")
                } else {
                    sudoExec(
                        `kill -9 ${pid}`,
                        {
                            name: `kill SIGKILL PID ${pid}`
                        },
                        (error) => {
                            if (!error) {
                                resolve("")
                            } else {
                                reject(`${error}`)
                            }
                        }
                    )
                }
            })
        }
    })
}
module.exports = {
    killYakGRPC:asyncKillYakGRPC,
    psYakList:async()=>{
        if (isWindows) {
            return await fetchWindowsYakProcess()
        } else {
            return await fetchGeneralYakProcessx()
        }
    },
    clearing: () => {},
    register: (win, getClient) => {
        ipcMain.handle("set-release-edition-raw", (e, type) => {
            setLocalCache("REACT_APP_PLATFORM", type)
            dbFile = type === "enterprise" ? "company-default-yakit.db" : "default-yakit.db"
            return ""
        })

        ipcMain.handle("ps-yak-grpc", async (e, params) => {
            if (isWindows) {
                return await fetchWindowsYakProcess()
            } else {
                return await fetchGeneralYakProcess()
            }
        })

        
        ipcMain.handle("kill-yak-grpc", async (e, pid) => {
            try {
                return await asyncKillYakGRPC(pid)
            } catch (e) {
                return "failed"
            }
        })

        ipcMain.handle("is-yak-engine-installed", (e) => {
            return fs.existsSync(getLatestYakLocalEngine())
        })

        ipcMain.handle("is-windows", (e) => {
            return isWindows
        })

        ipcMain.handle("check-local-database", async (e) => {
            return await new Promise((resolve, reject) => {
                if (isWindows) {
                    resolve("")
                    return
                }
                try {
                    const info = fs.statSync(path.join(os.homedir(), `yakit-projects/${dbFile}`))
                    if ((info.mode & 0o200) > 0) {
                        resolve("")
                    } else {
                        resolve("not allow to write")
                    }
                } catch (e) {
                    if (`${e}`.includes("no such file or directory")) {
                        // 这个问题就不管了。。。
                        resolve("")
                    } else {
                        reject(e)
                    }
                }
            })
        })

        ipcMain.handle("fix-local-database", async (e) => {
            return await new Promise((resolve, reject) => {
                if (isWindows) {
                    resolve(true)
                    return
                }
                const databaseFile = path.join(os.homedir(), `yakit-projects/${dbFile}`)

                try {
                    fs.chmodSync(databaseFile, 0o644)
                    resolve(true)
                } catch (e) {
                    try {
                        sudoExec(`chown -R ${os.userInfo().username} ${databaseFile}`, {name: `Fix Owner`}, () => {})
                    } catch (e) {}
                    try {
                        sudoExec(`chmod 0666 ${databaseFile}`, {name: `Fix Write Permission`}, () => {})
                        resolve(true)
                    } catch (e) {
                        reject(e)
                    }
                }
            })
        })
    }
}
