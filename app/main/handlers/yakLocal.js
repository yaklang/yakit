const {ipcMain, dialog} = require("electron");
const childProcess = require("child_process");
const process = require("process");
const psList = require("ps-list");
const _sudoPrompt = require("sudo-prompt");
const fs = require("fs");

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
        childProcess.exec(cmd, callback)
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
                                        reject(`${err}`)
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
                            }, err => {
                                console.info(err)
                                if (!error) {
                                    resolve(true)
                                } else {
                                    reject(`${err}`)
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

                // if (process.platform === "darwin" || process.platform === "linux") {
                //     process.env.PATH = process.env.PATH + ":/usr/local/bin/"
                // }
                // if (!isWindows) {
                //     // 如果是 mac/ubuntu
                //     if (!fs.existsSync("/usr/local/bin")) {
                //         reject(new Error("cannot find '/usr/local/bin'"))
                //         return
                //     }
                //
                //     if (!fs.existsSync("/usr/local/bin/yak")) {
                //         reject(new Error("uninstall yak engine"))
                //         return
                //     }
                // }


                let randPort = 40000 + getRandomInt(9999);
                try {
                    if (sudo) {
                        if (isWindows) {
                            childProcess.exec(generateWindowsSudoCommand(
                                getLatestYakLocalEngine(), `grpc --port ${randPort}`),
                                err => {
                                    if (err) {
                                        dialog.showErrorBox("sudo start yak error", `${err}`)
                                        reject(error)
                                    } else {
                                        resolve()
                                    }
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
                        const progress = childProcess.execFile(
                            getLatestYakLocalEngine(),
                            ["grpc", "--port", `${randPort}`],
                            err => {
                                if (err) {
                                    fs.writeFileSync("/tmp/yakit-yak-process-from-callback.txt", new Buffer(`${err}`))
                                    reject(err)
                                } else {
                                    resolve()
                                }
                            }
                        )
                        if (process.platform === "darwin") {
                            // progress.on("error", err => {
                            //     console.info(err)
                            //     fs.writeFileSync("/tmp/yakit-yak-process-error.txt", `${err}`)
                            // })
                            // progress.on("exit", (code, sig) => {
                            //     fs.writeFileSync("/tmp/yakit-yak-process-message.txt", `code:${code} sig:${sig}`)
                            // })
                            // progress.on("message", msg => {
                            //     fs.writeFileSync("/tmp/yakit-yak-process-message.txt", `${msg}`)
                            // })
                            // progress.stdout.pipe(fs.createWriteStream("/tmp/yakit-yak-stdout.txt"))
                            // progress.stderr.pipe(fs.createWriteStream("/tmp/yakit-yak-stderr.txt"))
                        }
                        // childProcess.exec(cmd, err => {
                        //     if (err) {
                        //         reject(err)
                        //     } else {
                        //         resolve()
                        //     }
                        // })
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
    },
}