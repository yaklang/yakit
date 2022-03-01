const {ipcMain, dialog} = require("electron");
const childProcess = require("child_process");
const process = require("process");
const psList = require("./libs/ps-yak-process");
const _sudoPrompt = require("sudo-prompt");
const fs = require("fs");
const os = require("os");
const path = require("path");

const isWindows = process.platform === "win32";

if (process.platform === "darwin" || process.platform === "linux") {
    process.env.PATH = process.env.PATH + ":/usr/local/bin/"
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function generateWindowsSudoCommand(file, args) {
    const cmds = args === "" ? `"'${file}'"` : `"'${file}'" "'${args}'"`
    return `powershell.exe start-process -verb runas -WindowStyle hidden -filepath ${cmds}`
}

const getLatestYakLocalEngine = require("./upgradeUtil").getLatestYakLocalEngine;

function sudoExec(cmd, opt, callback) {
    if (isWindows) {
        childProcess.exec(
            cmd,
            {maxBuffer: 1000 * 1000 * 1000},
            (err) => {
                callback(err)
            })
    } else {
        _sudoPrompt.exec(cmd, opt, callback)
    }
}


const windowsPidTableNetstatANO = (stdout) => {
    let lines = stdout.split("\n").map(i => i.trim());
    let pidToPort = new Map();
    if (lines.length > 0) {
        lines.map(i => i.split(/\s+/)).forEach(i => {
            if (i.length !== 5) {
                return
            }
            const pid = parseInt(i[4] || 1)
            const localPort = i[1];
            const port = parseInt(localPort.substr(localPort.lastIndexOf(":") + 1))
            let portList = pidToPort.get(pid);
            if (portList === undefined) {
                pidToPort.set(pid, [])
                portList = pidToPort.get(pid)
            }
            portList.push(port)
        })
    }

    return pidToPort
};


module.exports = {
    clearing: () => {
    },
    register: (win, getClient) => {
        // asyncPsList wrapper
        const fetchWindowsYakProcess = () => {
            return new Promise((resolve, reject) => {
                childProcess.exec("netstat /ano | findstr LISTENING", ((error, stdout) => {
                    if (error) {
                        reject(error)
                        return
                    }

                    let pidToPorts = windowsPidTableNetstatANO(stdout);
                    psList().then(data => {
                        let ls = data.filter(i => {
                            return (i.name || "").includes("yak")
                        }).map(i => {
                            let portsRaw = "0";
                            try {
                                let ports = pidToPorts.get(i.pid);
                                if (ports.length > 0) {
                                    ports.forEach(i => {
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
                                ...i,
                            }
                        }).map(i => {
                            return {port: parseInt(i.port), ...i, origin: i}
                        });
                        resolve(ls);
                    }).catch(e => reject(e))
                }))
            })
        }
        const fetchGeneralYakProcess = () => {
            return new Promise((resolve, reject) => {
                psList().then(data => {
                    let ls = data.filter(i => {
                        try {
                            return i.cmd.includes("yak grpc --port ");
                        } catch (e) {
                            return false
                        }
                    }).map(i => {
                        let portsRaw = "0";
                        try {
                            portsRaw = new RegExp(/port\s+(\d+)/).exec(i.cmd)[1];
                        } catch (e) {
                            console.info(i.cmd)
                        }
                        return {
                            port: portsRaw,
                            ...i,
                            name: "yak",
                        }
                    }).map(i => {
                        return {port: parseInt(i.port), ...i, origin: i}
                    });
                    resolve(ls);
                }).catch(e => reject(e))
            });
        }

        ipcMain.handle("ps-yak-grpc", async (e, params) => {
            if (isWindows) {
                return await fetchWindowsYakProcess();
            } else {
                return await fetchGeneralYakProcess();
            }
        });

        // asyncKillYakGRPC wrapper
        const asyncKillYakGRPC = (pid) => {
            return new Promise((resolve, reject) => {
                if (process.platform === 'win32') {
                    childProcess.exec(`taskkill /F /PID ${pid}`, error => {
                        if (!error) {
                            resolve(true)
                        } else {
                            sudoExec(
                                generateWindowsSudoCommand("taskkill", `/F /PID ${pid}`), undefined,
                                error => {
                                    if (!error) {
                                        resolve(true)
                                    } else {
                                        reject(`${error}`)
                                    }
                                }
                            )
                        }
                    })
                } else {
                    childProcess.exec(`kill -9 ${pid}`, error => {
                        if (!error) {
                            resolve(true)
                        } else {
                            sudoExec(`kill -9 ${pid}`, {
                                name: `kill SIGKILL PID ${pid}`
                            }, error => {
                                if (!error) {
                                    resolve(true)
                                } else {
                                    reject(`${error}`)
                                }
                            })
                        }
                    })
                }
            })
        }
        ipcMain.handle("kill-yak-grpc", async (e, pid) => {
            try {
                return await asyncKillYakGRPC(pid)
            } catch (e) {
                return ""
            }
        })

        // asyncStartLocalYakGRPCServer wrapper
        const asyncStartLocalYakGRPCServer = (params) => {
            return new Promise((resolve, reject) => {
                const {sudo} = params;

                let randPort = 40000 + getRandomInt(9999);
                try {
                    if (sudo) {
                        if (isWindows) {
                            childProcess.exec(
                                generateWindowsSudoCommand(
                                    getLatestYakLocalEngine(), `grpc --port ${randPort}`,
                                ),
                                {maxBuffer: 1000 * 1000 * 1000},
                            ).on("error", err => {
                                if (err) {
                                    reject(err)
                                }
                            }).on("spawn", () => {
                                resolve()
                            })
                        } else {
                            const cmd = `${getLatestYakLocalEngine()} grpc --port ${randPort}`;
                            sudoExec(cmd, {
                                    name: `yak grpc port ${randPort}`,
                                },
                                function (error) {
                                    if (error) {
                                        reject(error)
                                    } else {
                                        resolve()
                                    }
                                }
                            )
                        }
                    } else {
                        childProcess.spawn(
                            getLatestYakLocalEngine(),
                            ["grpc", "--port", `${randPort}`],
                            {stdio: ["ignore", "ignore", "ignore"]},
                        ).on("error", err => {
                            if (err) {
                                fs.writeFileSync("/tmp/yakit-yak-process-from-callback.txt", new Buffer(`${err}`))
                                reject(err)
                            }
                        }).on("spawn", () => resolve())
                    }
                } catch (e) {
                    reject(e)
                }

                return randPort
            })
        }
        ipcMain.handle("start-local-yak-grpc-server", async (e, params) => {
            return await asyncStartLocalYakGRPCServer(params)
        })

        ipcMain.handle("is-yak-engine-installed", e => {
            return fs.existsSync(getLatestYakLocalEngine())

            // if (!isWindows) {
            //     // 如果是 mac/ubuntu
            //     if (!fs.existsSync("/usr/local/bin")) {
            //         return false
            //     }
            //     return fs.existsSync("/usr/local/bin/yak");
            //
            // } else {
            //     return fs.existsSync(getWindowsInstallPath())
            // }
        })

        ipcMain.handle("is-windows", e => {
            return isWindows
        })

        ipcMain.handle("check-local-database", async (e) => {
            return await new Promise(((resolve, reject) => {
                if (isWindows) {
                    resolve("")
                    return
                }
                try {
                    const info = fs.statSync(path.join(os.homedir(), "yakit-projects/default-yakit.db"));
                    if ((info.mode & 0o222) > 0) {
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
            }))
        })


        ipcMain.handle("fix-local-database", async (e) => {
            return await new Promise(((resolve, reject) => {
                if (isWindows) {
                    resolve(true)
                    return
                }
                const databaseFile = path.join(os.homedir(), "yakit-projects/default-yakit.db")

                try {
                    fs.chmodSync(databaseFile, 0o644);
                    resolve(true)
                } catch (e) {
                    try {
                        sudoExec(`chown -R ${os.userInfo().username} ${databaseFile}`, {name: `Fix Owner`}, () => {
                        })
                    } catch (e) {

                    }
                    try {
                        sudoExec(
                            `chmod 0666 ${databaseFile}`,
                            {name: `Fix Write Permission`},
                            () => {
                            }
                        )
                        resolve(true)
                    } catch (e) {
                        reject(e)
                    }
                }
            }))
        })
    },
}