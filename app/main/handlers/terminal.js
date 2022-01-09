const {ipcMain} = require("electron");
const childProcess = require("child_process");
const process = require("process");
const streamLib = require("stream");
const buffer = require("buffer");

module.exports = (win, getClient) => {
    const streams = new Map();
    ipcMain.handle("terminal", (e, token) => {
        const existed = streams.get(token);
        if (!!existed) {
            return
        }

        switch (process.platform) {
            case "win32":
                return
            case "darwin":
            case "linux":
            default:
                const childProc = childProcess.spawn(
                    `${process.env["SHELL"] || "/bin/bash"}`,
                    ["-i"],
                );

                const stdout = new streamLib.Writable({
                    write(chunk, encoding, callback) {
                        if (win) {
                            win.webContents.send(`${token}-message`, chunk)
                        }
                        callback()
                    }
                });

                childProc.stdout.pipe(stdout)
                childProc.stderr.pipe(stdout)
                streams.set(token, {
                    process: childProc,
                })
        }
    })
    ipcMain.handle("write-terminal", (e, token, buf) => {
        const existed = streams.get(token);
        if (!existed) {
            return
        }
        existed.process.stdin.write(buf)
    })
}