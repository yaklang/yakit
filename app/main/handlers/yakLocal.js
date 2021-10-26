const {ipcMain, Notification} = require("electron");
const childProcess = require("child_process");
const process = require("process");
const psList = require("ps-list");
const treeKill = require("tree-kill");
const sudoPrompt = require("sudo-prompt");

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function notification(msg) {
    new Notification({title: msg}).show()
}

module.exports = {
    clearing: () => {

    },
    register: (win, getClient) => {
        // asyncPsList wrapper
        ipcMain.handle("ps-yak-grpc", async (e, params) => {
            let ls = (await psList()).filter(i => {
                try {
                    return i.name === "yak" && i.cmd.includes("yak grpc");
                } catch (e) {
                    return false
                }
            }).map(i => {
                try {
                    return {
                        port: new RegExp(/--port\s+(\d+)/).exec(i.cmd)[1],
                        ...i,
                    }
                } catch (e) {
                    return {
                        port: 0,
                        ...i
                    }
                }
            }).map(i => {
                return {port: parseInt(i.port), ...i}
            });
            return ls;
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
                    return -1
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