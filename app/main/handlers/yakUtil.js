const {ipcMain, Notification} = require("electron");
const childProcess = require("child_process");
const process = require("process");
const path = require("path");
const os = require("os");
const fs = require("fs");
const https = require("https");
const requestProgress = require("request-progress");
const request = require("request");

const homeDir = path.join(os.homedir(), "yakit-projects");
const secretDir = path.join(homeDir, "auth");
fs.mkdirSync(secretDir, {recursive: true})
const yakEngineDir = path.join(homeDir, "yak-engine")
fs.mkdirSync(yakEngineDir, {recursive: true})

const secretFile = path.join(secretDir, "yakit-remote.json");
const authMeta = [];

const loadSecrets = () => {
    authMeta.splice(0, authMeta.length)
    try {
        const data = fs.readFileSync(path.join(secretDir, "yakit-remote.json"));
        JSON.parse(data).forEach(i => {
            if (!(i["host"] && i["port"])) {
                return
            }

            authMeta.push({
                name: i["name"] || `${i["host"]}:${i["port"]}`,
                host: i["host"],
                port: i["port"],
                tls: i["tls"] | false,
                password: i["password"] || "",
                caPem: i["caPem"] || "",
            })
        })
    } catch (e) {
        console.info(e)
    }
};

function saveSecret(name, host, port, tls, password, caPem) {
    if (!host || !port) {
        throw new Error("empty host or port")
    }

    authMeta.push({
        host, port, tls, password, caPem,
        name: name || `${host}:${port}`,
    })
    saveAllSecret([...authMeta])
};

const saveAllSecret = (authInfos) => {
    try {
        fs.unlinkSync(secretFile)
    } catch (e) {

    }


    const authFileStr = JSON.stringify(
        [...authInfos.filter((v, i, arr) => {
            return arr.findIndex(origin => origin.name === v.name) === i
        })]
    );
    fs.writeFileSync(secretFile, new Buffer(authFileStr, "utf8"))
};

loadSecrets()

const getYakDownloadUrl = () => {
    switch (process.platform) {
        case "darwin":
            return "https://yaklang.oss-cn-beijing.aliyuncs.com/yak/latest/yak_darwin_amd64"
        case "win32":
            return "https://yaklang.oss-cn-beijing.aliyuncs.com/yak/latest/yak_windows_amd64.exe"
        case "linux":
            return "https://yaklang.oss-cn-beijing.aliyuncs.com/yak/latest/yak_linux_amd64"
    }
}

module.exports = {
    register: (win, getClient) => {
        ipcMain.handle("save-yakit-remote-auth", async (e, params) => {
            let {name, host, port, tls, caPem, password} = params;
            name = name || `${host}:${port}`
            saveAllSecret([...authMeta.filter(i => {
                return i.name !== name
            })]);
            loadSecrets()
            saveSecret(name, host, port, tls, caPem, password)
        })
        ipcMain.handle("remove-yakit-remote-auth", async (e, name) => {
            saveAllSecret([...authMeta.filter(i => {
                return i.name !== name
            })]);
            loadSecrets();
        })
        ipcMain.handle("get-yakit-remote-auth-all", async (e, name) => {
            loadSecrets()
            return authMeta;
        })
        ipcMain.handle("get-yakit-remote-auth-dir", async (e, name) => {
            return secretDir;
        })

        // asyncQueryLatestYakEngineVersion wrapper
        const asyncQueryLatestYakEngineVersion = (params) => {
            return new Promise((resolve, reject) => {
                let rsp = https.get("https://yaklang.oss-cn-beijing.aliyuncs.com/yak/latest/version.txt")
                rsp.on("response", rsp => {
                    rsp.on("data", data => {
                        resolve(`v${Buffer.from(data).toString("utf8")}`.trim())
                    }).on("error", err => reject(err))
                })
                rsp.on("error", reject)
            })
        }
        ipcMain.handle("query-latest-yak-version", async (e, params) => {
            return await asyncQueryLatestYakEngineVersion(params)
        })

        // asyncQueryLatestYakEngineVersion wrapper
        const asyncGetCurrentLatestYakVersion = (params) => {
            return new Promise((resolve, reject) => {
                childProcess.exec("yak -v", (err, stdout) => {
                    const version = stdout.replaceAll("yak version ", "").trim();
                    if (!version) {
                        if (err) {
                            reject(err)
                        } else {
                            reject("[unknown reason] cannot fetch yak version (yak -v)")
                        }
                    } else {
                        resolve(version)
                    }
                })
            })
        }
        ipcMain.handle("get-current-yak", async (e, params) => {
            return await asyncGetCurrentLatestYakVersion(params)
        })

        // asyncDownloadLatestYak wrapper
        const asyncDownloadLatestYak = (version) => {
            return new Promise((resolve, reject) => {
                const dest = path.join(yakEngineDir, `yak-${version}`);
                fs.unlinkSync(dest)

                const downloadUrl = getYakDownloadUrl();
                // https://github.com/IndigoUnited/node-request-progress
                // The options argument is optional so you can omit it
                requestProgress(request(downloadUrl), {
                    // throttle: 2000,                    // Throttle the progress event to 2000ms, defaults to 1000ms
                    // delay: 1000,                       // Only start to emit after 1000ms delay, defaults to 0ms
                    // lengthHeader: 'x-transfer-length'  // Length header to use, defaults to content-length
                })
                    .on('progress', function (state) {
                        console.log('progress', state);
                    })
                    .on('error', function (err) {
                        reject(err)
                    })
                    .on('end', function () {
                        // Do something after request finishes
                    }).pipe(fs.createWriteStream(dest));
            })
        }
        ipcMain.handle("download-latest-yak", async (e, version) => {
            return await asyncDownloadLatestYak(version)
        })
    },
}