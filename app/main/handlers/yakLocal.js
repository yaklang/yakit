const {ipcMain, Notification} = require("electron");
const childProcess = require("child_process");
const process = require("process");
const psList = require("ps-list");
const treeKill = require("tree-kill");
const sudoPrompt = require("sudo-prompt");
const net = require("net");

const isWindows = process.platform === "win32"

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function notification(msg) {
    new Notification({title: msg}).show()
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
                                    portsRaw = ports[0];
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
                            return i.name === "yak" && i.cmd.includes("yak grpc");
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
                            sudoPrompt.exec(`taskkill /F /PID ${pid}`, {
                                "name": `taskkill F PID ${pid}`,
                            }, err => {
                                if (!error) {
                                    resolve(true)
                                } else {
                                    reject(`${err}`)
                                }
                            })
                        }
                    })
                } else {
                    childProcess.exec(`kill -9 ${pid}`, error => {
                        if (!error) {
                            resolve(true)
                        } else {
                            sudoPrompt.exec(`kill -9 ${pid}`, {
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

                let randPort = 50000 + getRandomInt(10000);
                const cmd = `yak grpc --port ${randPort}`;
                try {
                    if (sudo) {
                        sudoPrompt.exec(cmd, {
                                name: `yak grpc port ${randPort}`,
                            },
                            function (error, stdout, stderr) {
                            }
                        )
                    } else {
                        childProcess.exec(cmd, err => {
                        })
                    }
                } catch (e) {
                    reject(e)
                }

                return randPort
            })
        }
        ipcMain.handle("start-local-yak-grpc-server", async (e, params) => {
            try {
                return await asyncStartLocalYakGRPCServer(params)
            } catch (e) {
                return -1
            }
        })
    },
}