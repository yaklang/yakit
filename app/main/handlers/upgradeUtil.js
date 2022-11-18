const {ipcMain, shell, dialog} = require("electron");
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

const basicDir = path.join(homeDir, "base");
const yakEngineDir = path.join(homeDir, "yak-engine")
const codeDir = path.join(homeDir, "code");
const secretFile = path.join(secretDir, "yakit-remote.json");
const authMeta = [];
const basicKvPath = path.join(basicDir, "yakit-local.json")
const extraKvPath = path.join(basicDir, "yakit-extra-local.json")

const initMkbaseDir = async () => {
    return new Promise((resolve, reject) => {
        try {
            fs.mkdirSync(secretDir, {recursive: true})
            fs.mkdirSync(basicDir, {recursive: true})
            fs.mkdirSync(yakEngineDir, {recursive: true})
            fs.mkdirSync(codeDir, {recursive: true})
            resolve()
        } catch (e) {
            reject(e)
        }
    })
}

const kvpairs = new Map();
const extrakvpairs = new Map();

const getKVPair = (callback) => {
    kvpairs.clear()

    try {
        fs.readFile(basicKvPath, (err, data) => {
            if (!!err) {
                callback(err)
                return
            }

            JSON.parse(data.toString()).forEach(i => {
                if (i["key"]) {
                    kvpairs.set(i["key"], i["value"])
                }
            })

            if (callback) {
                callback(null)
            }
        })
    } catch (e) {
        console.info(e)
    }
}

const getExtraKVPair = (callback) => {
    extrakvpairs.clear()

    try {
        fs.readFile(extraKvPath, (err, data) => {
            if (!!err) {
                callback(err)
                return
            }

            JSON.parse(data.toString()).forEach(i => {
                if (i["key"]) {
                    extrakvpairs.set(i["key"], i["value"])
                }
            })

            if (callback) {
                callback(null)
            }
        })
    } catch (e) {
        console.info(e)
    }
}

const setKVPair = (k, v) => {
    kvpairs.set(`${k}`, v)

    try {
        fs.unlinkSync(basicKvPath)
    } catch (e) {
    }

    const pairs = []
    kvpairs.forEach((v, k) => {
        pairs.push({key: k, value: v})
    })
    pairs.sort((a, b) => a.key.localeCompare(b.key))
    fs.writeFileSync(basicKvPath, new Buffer(JSON.stringify(pairs), "utf8"))
}

const setExtraKVPair = (k, v) => {
    extrakvpairs.set(`${k}`, v)

    try {
        fs.unlinkSync(extraKvPath)
    } catch (e) {
    }

    const pairs = []
    extrakvpairs.forEach((v, k) => {
        pairs.push({key: k, value: v})
    })
    pairs.sort((a, b) => a.key.localeCompare(b.key))
    fs.writeFileSync(extraKvPath, new Buffer(JSON.stringify(pairs), "utf8"))
}

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

const isWindows = process.platform === "win32";

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

const getLatestYakLocalEngine = () => {
    switch (process.platform) {
        case "darwin":
        case "linux":
            return path.join(yakEngineDir, "yak")
        case "win32":
            return path.join(yakEngineDir, "yak.exe")
    }
}

const getYakitDownloadUrl = (version,isEnterprise=false) => {
    if(isEnterprise){
        switch (process.platform) {
            case "darwin":
                if (process.arch === "arm64") {
                    return `https://yaklang.oss-cn-beijing.aliyuncs.com/yak/${version}/Yakit-ee-${version}-darwin-arm64.dmg`
                } else {
                    return `https://yaklang.oss-cn-beijing.aliyuncs.com/yak/${version}/Yakit-ee-${version}-darwin-x64.dmg`
                }
            case "win32":
                return `https://yaklang.oss-cn-beijing.aliyuncs.com/yak/${version}/Yakit-ee-${version}-windows-amd64.exe`
            case "linux":
                return `https://yaklang.oss-cn-beijing.aliyuncs.com/yak/${version}/Yakit-ee-${version}-linux-amd64.AppImage`
            }
    }
    else{
        switch (process.platform) {
        case "darwin":
            if (process.arch === "arm64") {
                return `https://yaklang.oss-cn-beijing.aliyuncs.com/yak/${version}/Yakit-${version}-darwin-arm64.dmg`
            } else {
                return `https://yaklang.oss-cn-beijing.aliyuncs.com/yak/${version}/Yakit-${version}-darwin-x64.dmg`
            }
        case "win32":
            return `https://yaklang.oss-cn-beijing.aliyuncs.com/yak/${version}/Yakit-${version}-windows-amd64.exe`
        case "linux":
            return `https://yaklang.oss-cn-beijing.aliyuncs.com/yak/${version}/Yakit-${version}-linux-amd64.AppImage`
    }
    }
    
}

module.exports = {
    getLatestYakLocalEngine,
    initial: async () => {
        return await initMkbaseDir();
    },
    extrakvpairs,
    getExtraKVPair,
    setExtraKVPair,
    register: (win, getClient) => {
        ipcMain.handle("save-yakit-remote-auth", async (e, params) => {
            let {name, host, port, tls, caPem, password} = params;
            name = name || `${host}:${port}`
            saveAllSecret([...authMeta.filter(i => {
                return i.name !== name
            })]);
            loadSecrets()
            saveSecret(name, host, port, tls, password, caPem)
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
        });

        // asyncQueryLatestYakEngineVersion wrapper
        const asyncQueryLatestNotification = (params) => {
            return new Promise((resolve, reject) => {
                let rsp = https.get("https://yaklang.oss-cn-beijing.aliyuncs.com/yak/latest/notification.md")
                rsp.on("response", rsp => {
                    rsp.on("data", data => {
                        const passage = Buffer.from(data).toString();
                        if (passage.startsWith("# Yakit Notification")) {
                            resolve(passage)
                        } else {
                            resolve("")
                        }

                    }).on("error", err => reject(err))
                })
                rsp.on("error", reject)
            })
        }
        ipcMain.handle("query-latest-notification", async (e, params) => {
            return await asyncQueryLatestNotification(params)
        })

        // asyncQueryLatestYakEngineVersion wrapper
        const asyncQueryLatestYakitEngineVersion = (params) => {
            return new Promise((resolve, reject) => {
                let rsp = https.get("https://yaklang.oss-cn-beijing.aliyuncs.com/yak/latest/yakit-version.txt")
                rsp.on("response", rsp => {
                    rsp.on("data", data => {
                        resolve(`v${Buffer.from(data).toString("utf8")}`.trim())
                    }).on("error", err => reject(err))
                })
                rsp.on("error", reject)
            })
        }
        ipcMain.handle("query-latest-yakit-version", async (e, params) => {
            return await asyncQueryLatestYakitEngineVersion(params)
        })

        // asyncQueryLatestYakEngineVersion wrapper
        const asyncGetCurrentLatestYakVersion = (params) => {
            return new Promise((resolve, reject) => {
                try {
                    childProcess.execFile(getLatestYakLocalEngine(), ["-v"], (err, stdout) => {
                        if (err) {
                            reject(err)
                            return
                        }
                        // const version = stdout.replaceAll("yak version ()", "").trim();
                        const version = /.*?yak(\.exe)?\s+version\s+([^\s]+)/.exec(stdout)[2];
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
                } catch (e) {
                    reject(e)
                }
            })
        }
        ipcMain.handle("get-current-yak", async (e, params) => {
            return await asyncGetCurrentLatestYakVersion(params)
        })

        // asyncDownloadLatestYak wrapper
        const asyncDownloadLatestYak = (version) => {
            return new Promise((resolve, reject) => {
                const dest = path.join(yakEngineDir, `yak-${version}`);
                try {
                    fs.unlinkSync(dest)
                } catch (e) {

                }

                const downloadUrl = getYakDownloadUrl();
                // https://github.com/IndigoUnited/node-request-progress
                // The options argument is optional so you can omit it
                requestProgress(request(downloadUrl), {
                    // throttle: 2000,                    // Throttle the progress event to 2000ms, defaults to 1000ms
                    // delay: 1000,                       // Only start to emit after 1000ms delay, defaults to 0ms
                    // lengthHeader: 'x-transfer-length'  // Length header to use, defaults to content-length
                })
                    .on('progress', function (state) {
                        win.webContents.send("download-yak-engine-progress", state)
                    })
                    .on('error', function (err) {
                        reject(err)
                    })
                    .on('end', function () {
                        resolve()
                    }).pipe(fs.createWriteStream(dest));
            })
        }
        ipcMain.handle("download-latest-yak", async (e, version) => {
            return await asyncDownloadLatestYak(version)
        })

        // asyncDownloadLatestYakit wrapper
        const asyncDownloadLatestYakit = (version,isEnterprise) => {
            return new Promise((resolve, reject) => {
                if (version.startsWith("v")) {
                    version = version.substr(1)
                }
                const downloadUrl = getYakitDownloadUrl(version,isEnterprise);

                const dest = path.join(yakEngineDir, path.basename(downloadUrl));
                try {
                    fs.unlinkSync(dest)
                } catch (e) {

                }
                // https://github.com/IndigoUnited/node-request-progress
                // The options argument is optional so you can omit it
                requestProgress(request(downloadUrl), {
                    // throttle: 2000,                    // Throttle the progress event to 2000ms, defaults to 1000ms
                    // delay: 1000,                       // Only start to emit after 1000ms delay, defaults to 0ms
                    // lengthHeader: 'x-transfer-length'  // Length header to use, defaults to content-length
                })
                    .on('progress', function (state) {
                        win.webContents.send("download-yakit-engine-progress", state)
                    })
                    .on('error', function (err) {
                        reject(err)
                    })
                    .on('end', function () {
                        resolve()
                    }).pipe(fs.createWriteStream(dest));
            })
        }
        ipcMain.handle("download-latest-yakit", async (e, version,isEnterprise) => {
            return await asyncDownloadLatestYakit(version,isEnterprise)
        })

        ipcMain.handle("get-windows-install-dir", async (e) => {
            return getLatestYakLocalEngine();
            //systemRoot := os.Getenv("WINDIR")
            // 			if systemRoot == "" {
            // 				systemRoot = os.Getenv("windir")
            // 			}
            // 			if systemRoot == "" {
            // 				systemRoot = os.Getenv("SystemRoot")
            // 			}
            //
            // 			if systemRoot == "" {
            // 				return utils.Errorf("cannot fetch windows system root dir")
            // 			}
            //
            // 			installed = filepath.Join(systemRoot, "System32", "yak.exe")
            // if (process.platform !== "win32") {
            //     return "%WINDIR%\\System32\\yak.exe"
            // }
            // return getWindowsInstallPath();

        });

        const installYakEngine = (version) => {
            return new Promise((resolve, reject) => {
                let origin = path.join(yakEngineDir, `yak-${version}`);
                origin = origin.replaceAll(`"`, `\"`);

                let dest = getLatestYakLocalEngine(); //;isWindows ? getWindowsInstallPath() : "/usr/local/bin/yak";
                dest = dest.replaceAll(`"`, `\"`)

                try {
                    fs.unlinkSync(dest)
                } catch (e) {
                }


                childProcess.exec(
                    isWindows ?
                        `copy "${origin}" "${dest}"`
                        : `cp "${origin}" "${dest}" && chmod +x "${dest}"`,
                    err => {
                        if (err) {
                            reject(err)
                            return
                        }
                        resolve()
                    }
                )
            })
        }

        ipcMain.handle("install-yak-engine", async (e, version) => {
            return await installYakEngine(version);
        })

        // 获取当前是否是 arm64？
        ipcMain.handle("get-platform-and-arch", (e) => {
            return `${process.platform}-${process.arch}`;
        })

        ipcMain.handle("install-yakit", async (e, params) => {
            return shell.openPath(yakEngineDir)
        })


        ipcMain.handle("set-value", (e, key, value) => {
            setKVPair(key, value)
        })

        const asyncGetValueByKey = (key) => {
            return new Promise((resolve, reject) => {
                getKVPair((err) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(kvpairs.get(key))
                    }
                })
            })
        }
        ipcMain.handle("get-value", async (e, key) => {
            return await asyncGetValueByKey(key)
        })

        // 获取yak code文件根目录路径
        ipcMain.handle("fetch-code-path", () => {
            return codeDir
        });

        // 打开指定路径文件
        ipcMain.handle("open-specified-file", async (e, path) => {
            return shell.showItemInFolder(path)
        })
    },
}