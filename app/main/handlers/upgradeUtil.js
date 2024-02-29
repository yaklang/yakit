const {app, ipcMain, shell} = require("electron");
const childProcess = require("child_process");
const process = require("process");
const path = require("path");
const os = require("os");
const fs = require("fs");
const https = require("https");
const requestProgress = require("request-progress");
const request = require("request");

const zip = require('node-stream-zip');
const {
    YakitProjectPath,
    remoteLinkDir,
    yaklangEngineDir,
    basicDir,
    remoteLinkFile,
    codeDir,
    loadExtraFilePath,
    yakitInstallDir
} = require("../filePath")

const userChromeDataDir = path.join(YakitProjectPath, "chrome-profile");
const authMeta = [];

const initMkbaseDir = async () => {
    return new Promise((resolve, reject) => {
        try {
            fs.mkdirSync(remoteLinkDir, {recursive: true})
            fs.mkdirSync(basicDir, {recursive: true})
            fs.mkdirSync(userChromeDataDir, {recursive: true})
            fs.mkdirSync(yaklangEngineDir, {recursive: true})
            fs.mkdirSync(codeDir, {recursive: true})

            try {
                console.info("Start checking bins/resources")
                const extraResources = loadExtraFilePath(path.join("bins", "resources"));
                const resourceBase = basicDir;
                if (!fs.existsSync(path.join(resourceBase, "flag.txt"))) {
                    console.info("Start to load bins/resources ...")
                    fs.readdirSync(extraResources).forEach(value => {
                        if (value.endsWith(".txt")) {
                            try {
                                fs.copyFileSync(path.join(extraResources, value), path.join(resourceBase, value))
                            } catch (e) {
                                console.info(e)
                            }
                        }
                    })
                }
            } catch (e) {
                console.error(e)
            }

            resolve()
        } catch (e) {
            reject(e)
        }
    })
}

const loadSecrets = () => {
    authMeta.splice(0, authMeta.length)
    try {
        const data = fs.readFileSync(path.join(remoteLinkDir, "yakit-remote.json"));
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
        fs.unlinkSync(remoteLinkFile)
    } catch (e) {

    }


    const authFileStr = JSON.stringify(
        [...authInfos.filter((v, i, arr) => {
            return arr.findIndex(origin => origin.name === v.name) === i
        })]
    );
    fs.writeFileSync(remoteLinkFile, new Buffer(authFileStr, "utf8"))
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
            return path.join(yaklangEngineDir, "yak")
        case "win32":
            return path.join(yaklangEngineDir, "yak.exe")
    }
}

const getYakitDownloadUrl = (version, isEnterprise = false) => {
    if (isEnterprise) {
        switch (process.platform) {
            case "darwin":
                if (process.arch === "arm64") {
                    return `https://yaklang.oss-cn-beijing.aliyuncs.com/yak/${version}/Yakit-EE-${version}-darwin-arm64.dmg`
                } else {
                    return `https://yaklang.oss-cn-beijing.aliyuncs.com/yak/${version}/Yakit-EE-${version}-darwin-x64.dmg`
                }
            case "win32":
                return `https://yaklang.oss-cn-beijing.aliyuncs.com/yak/${version}/Yakit-EE-${version}-windows-amd64.exe`
            case "linux":
                return `https://yaklang.oss-cn-beijing.aliyuncs.com/yak/${version}/Yakit-EE-${version}-linux-amd64.AppImage`
        }
    } else {
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

// 获取Yakit所处平台
const getYakitPlatform = () => {
    switch (process.platform) {
        case "darwin":
            if (process.arch === "arm64") {
                return `darwin-arm64`
            } else {
                return `darwin-x64`
            }
        case "win32":
            return `windows-amd64`
        case "linux":
            return `linux-amd64`
    }
}

module.exports = {
    getLatestYakLocalEngine,
    initial: async () => {
        return await initMkbaseDir();
    },
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
            return remoteLinkDir;
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

        /** 获取Yakit Yaklang本地版本号 操作系统 架构 */
        ipcMain.handle("fetch-local-basic-info", async (e) => {
            const localYakit = app.getVersion()
            const localYaklang = await asyncGetCurrentLatestYakVersion()
            return {
                system:process.platform,
                arch:process.arch,
                localYakit,
                localYaklang
            }
        })

        // asyncDownloadLatestYak wrapper
        const asyncDownloadLatestYak = (version) => {
            return new Promise((resolve, reject) => {
                const dest = path.join(yaklangEngineDir, `yak-${version}`);
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

        // 正则匹配url 将url中的中文项进行编码
        function encodeChineseCharacters(str) {
            const pattern = /[\u4e00-\u9fa5]/g; // 匹配中文字符的正则表达式
            const matches = str.match(pattern); // 找到所有中文字符的匹配项
            if (matches) {
              for (const match of matches) {
                const encodedMatch = encodeURIComponent(match);
                str = str.replace(match, encodedMatch);
              }
            }
            return str;
        }

        const downloadYakitByDownloadUrl = (resolve,reject,downloadUrl) => {
            // 可能存在中文的下载文件夹，就判断下Downloads文件夹是否存在，不存在则新建一个
            if(!fs.existsSync(yakitInstallDir)) fs.mkdirSync(yakitInstallDir, {recursive: true})
            const dest = path.join(yakitInstallDir, path.basename(downloadUrl));
            try {
                fs.unlinkSync(dest)
            } catch (e) {

            }
            // https://github.com/IndigoUnited/node-request-progress
            // The options argument is optional so you can omit it
            requestProgress(
                request(encodeChineseCharacters(downloadUrl)), {
                    // throttle: 2000,                    // Throttle the progress event to 2000ms, defaults to 1000ms
                    // delay: 1000,                       // Only start to emit after 1000ms delay, defaults to 0ms
                    // lengthHeader: 'x-transfer-length'  // Length header to use, defaults to content-length
                })
                .on("response",function (resp){
                    if (resp.statusCode === 404) {
                        reject("暂无最新安装包")
                    }
                })
                .on("progress", function (state) {
                    win.webContents.send("download-yakit-engine-progress", state)
                })
                .on("error", function (err) {
                    reject(err)
                })
                .on("end", function () {
                    resolve()
                })
                .pipe(fs.createWriteStream(dest))
        }

        // asyncDownloadLatestYakit wrapper
        const asyncDownloadLatestYakit = (version, isEnterprise) => {
            return new Promise((resolve, reject) => {
                if (version.startsWith("v")) {
                    version = version.substr(1)
                }
                const downloadUrl = getYakitDownloadUrl(version, isEnterprise);
                downloadYakitByDownloadUrl(resolve,reject,downloadUrl)
            })
        }

        ipcMain.handle("download-latest-yakit", async (e, version, isEnterprise) => {
            return await asyncDownloadLatestYakit(version, isEnterprise)
        })

        ipcMain.handle("download-enpriTrace-latest-yakit", async (e, url) => {
            return await new Promise((resolve, reject) => {
                downloadYakitByDownloadUrl(resolve,reject,url)
            }) 
        })

        ipcMain.handle("update-enpritrace-info", async () => {
            return await {version:getYakitPlatform()}
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
                let origin = path.join(yaklangEngineDir, `yak-${version}`);
                origin = origin.replaceAll(`"`, `\"`);

                let dest = getLatestYakLocalEngine(); //;isWindows ? getWindowsInstallPath() : "/usr/local/bin/yak";
                dest = dest.replaceAll(`"`, `\"`)

                try {
                    fs.unlinkSync(dest)
                } catch (e) {
                    if (e.message.indexOf("operation not permitted") > -1) reject("operation not permitted")
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

        // 获取yak code文件根目录路径
        ipcMain.handle("fetch-code-path", () => {
            return codeDir
        });

        // 打开指定路径文件
        ipcMain.handle("open-specified-file", async (e, path) => {
            return shell.showItemInFolder(path)
        })

        // asyncInitBuildInEngine wrapper
        const asyncInitBuildInEngine = (params) => {
            return new Promise((resolve, reject) => {
                if (!fs.existsSync(loadExtraFilePath(path.join("bins", "yak.zip")))) {
                    reject("BuildIn Engine Not Found!")
                    return
                }

                console.info("Start to Extract yak.zip")
                const zipHandler = new zip({
                    file: loadExtraFilePath(path.join("bins", "yak.zip")),
                    storeEntries: true,
                })
                console.info("Start to Extract yak.zip: Set `ready`")
                zipHandler.on("ready", () => {
                    const buildInPath = path.join(yaklangEngineDir, "yak.build-in");

                    console.log('Entries read: ' + zipHandler.entriesCount);
                    for (const entry of Object.values(zipHandler.entries())) {
                        const desc = entry.isDirectory ? 'directory' : `${entry.size} bytes`;
                        console.log(`Entry ${entry.name}: ${desc}`);
                    }

                    console.info("we will extract file to: " + buildInPath)
                    const extractedFile = (() => {
                        switch (os.platform()) {
                            case "darwin":
                                return "bins/yak_darwin_amd64"
                            case "win32":
                                return "bins/yak_windows_amd64.exe"
                            case "linux":
                                switch (os.arch()) {
                                    case "arm64":
                                        return "bins/yak_linux_arm64"
                                    default:
                                        return "bins/yak_linux_amd64"
                                }
                            default:
                                return ""
                        }
                    })()
                    zipHandler.extract(extractedFile, buildInPath, (err, res) => {
                        if (!fs.existsSync(buildInPath)) {
                            reject(`Extract BuildIn Engine Failed`)
                        } else {

                            /**
                             * 复制引擎到真实地址
                             * */
                            try {
                                let targetEngine = path.join(yaklangEngineDir, isWindows ? "yak.exe" : "yak")
                                if (!isWindows) {
                                    fs.copyFileSync(buildInPath, targetEngine)
                                    fs.chmodSync(targetEngine, 0o755)
                                } else {
                                    fs.copyFileSync(buildInPath, targetEngine)
                                }
                                resolve()
                            } catch (e) {
                                reject(e)
                            }
                        }
                        console.info("zipHandler closing...")
                        zipHandler.close();
                    })
                })
                console.info("Start to Extract yak.zip: Set `error`")
                zipHandler.on("error", err => {
                    console.info(err)
                    reject(`${err}`)
                    zipHandler.close()
                })
            })
        }
        ipcMain.handle("InitBuildInEngine", async (e, params) => {
            return await asyncInitBuildInEngine(params)
        })

        // 尝试初始化数据库
        ipcMain.handle("InitCVEDatabase", async (e) => {
            const targetFile = path.join(YakitProjectPath, "default-cve.db.gzip")
            if (fs.existsSync(targetFile)) {
                return
            }
            const buildinDBFile = loadExtraFilePath(path.join("bins", "database", "default-cve.db.gzip"));
            if (fs.existsSync(buildinDBFile)) {
                fs.copyFileSync(buildinDBFile, targetFile)
            }
        })

        // 获取内置引擎版本
        ipcMain.handle("GetBuildInEngineVersion"
            /*"IsBinsExisted"*/,
            async (e) => {
                const yakZipName = path.join("bins", "yak.zip")
                if (!fs.existsSync(loadExtraFilePath(yakZipName))) {
                    throw Error(`Cannot found yak.zip, bins: ${loadExtraFilePath(yakZipName)}`)
                }
                return fs.readFileSync(loadExtraFilePath(path.join("bins", "engine-version.txt"))).toString("utf8")
            })

        // asyncRestoreEngineAndPlugin wrapper
        ipcMain.handle("RestoreEngineAndPlugin", async (e, params) => {
            const engineTarget = isWindows ? path.join(yaklangEngineDir, "yak.exe") : path.join(yaklangEngineDir, "yak")
            const buidinEngine = path.join(yaklangEngineDir, "yak.build-in")
            const cacheFlagLock = path.join(basicDir, "flag.txt")
            try {
                // remove old engine
                if (fs.existsSync(buidinEngine)) {
                    fs.unlinkSync(buidinEngine)
                }
                if (isWindows && fs.existsSync(engineTarget)) {
                    // access write will fetch delete!
                    fs.accessSync(engineTarget, fs.constants.F_OK | fs.constants.W_OK)
                }
                if (fs.existsSync(engineTarget)) {
                    fs.unlinkSync(engineTarget)
                }

                if (fs.existsSync(cacheFlagLock)) {
                    fs.unlinkSync(cacheFlagLock)
                }

            } catch (e) {
                throw e
            }
            return await asyncInitBuildInEngine({})
        })
    },
}