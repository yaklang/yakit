const { ipcMain } = require("electron")
const { launch, killAll, getChromePath } = require("chrome-launcher")
const fs = require("fs")
const path = require("path")
const { YakitProjectPath } = require("../filePath")
const myUserDataDir = path.join(YakitProjectPath, "chrome-profile")

const disableExtensionsExceptStr = (host, port, username, password) => `
var config = {
    mode: "fixed_servers",
    rules: {
      singleProxy: {
        scheme: "http",
        host: "${host}",
        port: parseInt(${port})
      },
    }
  };

chrome.proxy.settings.set({value: config, scope: "regular"}, function() {});

function callbackFn(details) {
return {
    authCredentials: {
        username: "${username}",
        password: "${password}"
    }
};
}

chrome.webRequest.onAuthRequired.addListener(
        callbackFn,
        {urls: ["<all_urls>"]},
        ['blocking']
);
`

const manifestStr = `
{
    "version": "1.0.0",
    "manifest_version": 2,
    "name": "YakitProxy",
    "permissions": [
        "proxy",
        "tabs",
        "unlimitedStorage",
        "storage",
        "<all_urls>",
        "webRequest",
        "webRequestBlocking"
    ],
    "background": {
        "scripts": ["background.js"]
    },
    "minimum_chrome_version":"22.0.0"
}
`

// 生成临时文件夹
const tempFile = "yakit-proxy"
// 生成临时文件名
const exceptFileName = "background.js"
const manifestFileName = "manifest.json"
// 创建临时文件的完整路径
const exceptFilePath = path.join(YakitProjectPath, tempFile, exceptFileName)
const manifestFilePath = path.join(YakitProjectPath, tempFile, manifestFileName)
// 获取文件夹路径
const commonFilePath = path.dirname(exceptFilePath)
// 是否创建用户名/密码文件
let isCreateFile = false

function deleteFolderRecursive(folderPath) {
    if (fs.existsSync(folderPath)) {
        fs.readdirSync(folderPath).forEach((file) => {
            const filePath = path.join(folderPath, file)
            const stat = fs.statSync(filePath)

            if (stat.isFile()) {
                fs.unlinkSync(filePath)
            } else if (stat.isDirectory()) {
                deleteFolderRecursive(filePath)
            }
        })
        fs.rmdirSync(folderPath)
    }
}

// 删除临时文件夹及文件夹中所有文件
const deleteCreateFile = () => {
    if (isCreateFile) {
        // 判断文件夹是否存在
        if (fs.existsSync(commonFilePath)) {
            // 读取文件夹中的文件和子文件夹
            fs.readdirSync(commonFilePath).forEach((file) => {
                const filePath = path.join(commonFilePath, file)

                // 检查文件类型
                const stat = fs.statSync(filePath)

                if (stat.isFile()) {
                    // 如果是文件，则删除文件
                    fs.unlinkSync(filePath)
                } else if (stat.isDirectory()) {
                    // 如果是文件夹，则递归删除文件夹及其内容
                    deleteFolderRecursive(filePath)
                }
            })

            // 删除空文件夹
            fs.rmdirSync(commonFilePath)
        } else {
            console.log(`not found ${commonFilePath} .`)
        }
        isCreateFile = false
    }
}

function createCustomChromeApp(params) {
    const {appName = "YakitChrome", iconPath, chromePath} = params
    const appBundlePath = path.join(YakitProjectPath, "Chrome",`${appName}.app`)

    // 如果应用已存在，直接返回路径
    if (fs.existsSync(appBundlePath)) {
        return appBundlePath
    }
     // 创建应用程序包结构
     const dirs = [
        `${appBundlePath}/Contents/MacOS`,
        `${appBundlePath}/Contents/Resources`
    ]
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
    })

    // 生成 Info.plist
    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>yakit-chrome-launcher</string>
    <key>CFBundleIconFile</key>
    <string>app.icns</string>
    <key>CFBundleIdentifier</key>
    <string>com.yakit.chrome</string>
    <key>CFBundleName</key>
    <string>${appName}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.10.0</string>
</dict>
</plist>`
    fs.writeFileSync(`${appBundlePath}/Contents/Info.plist`, plistContent)

    // 如果提供了图标，复制图标文件
    if (iconPath && fs.existsSync(iconPath)) {
        const destIcon = `${appBundlePath}/Contents/Resources/app.icns`
        fs.copyFileSync(iconPath, destIcon)
    }

    // 生成启动脚本 - 只需要简单转发所有参数
    const scriptPath = `${appBundlePath}/Contents/MacOS/yakit-chrome-launcher`
    const scriptContent = `#!/bin/bash
exec "${chromePath}" "$@"
`
    fs.writeFileSync(scriptPath, scriptContent)
    fs.chmodSync(scriptPath, 0o755) // 添加执行权限

    // 移除 macOS 隔离属性
    try {
        execSync(`xattr -dr com.apple.quarantine "${appBundlePath}"`)
    } catch (error) {
        console.log("Failed to remove quarantine attribute:", error)
    }


    return appBundlePath
}

function shellEscape(str) {
    return `'${str.replace(/'/g, "'\\''")}'`
}


function launchMacChrome(appBundlePath, customChromeFlags) {
    return new Promise((resolve, reject) => {
        // 使用 spawn 而不是 execSync，这样我们可以获取进程引用
        const child = spawn('open', [
            appBundlePath,
            '--args',
            ...customChromeFlags.map(flag => shellEscape(flag))
        ], {
            detached: true
        })

        // 监听错误
        child.on('error', (err) => {
            reject(err)
        })

        // 等待进程启动
        child.on('close', (code) => {
            if (code === 0) {
                // 获取 Chrome 进程 ID
                const getChromeProcess = spawn('pgrep', ['-f', appBundlePath])
                let pid = ''

                getChromeProcess.stdout.on('data', (data) => {
                    pid += data.toString()
                })

                getChromeProcess.on('close', () => {
                    if (pid) {
                        // 监听 Chrome 进程
                        const chromeProcess = spawn('ps', ['-p', pid.trim()])
                        chromeProcess.on('close', () => {
                            // Chrome 进程退出时
                            startNum -= 1
                            if (startNum <= 0) {
                                started = false
                                deleteCreateFile()
                            }
                        })
                        resolve({
                            process: chromeProcess
                        })
                    } else {
                        resolve(null)
                    }
                })
            } else {
                reject(new Error(`Failed to launch Chrome: ${code}`))
            }
        })
    })
}

module.exports = (win, getClient) => {
    // 启动的数量
    let startNum = 0
    // 启动的状态
    let started = false
    ipcMain.handle("IsChromeLaunched", async () => {
        return started
    })

    ipcMain.handle("getDefaultUserDataDir", async () => {
        return myUserDataDir
    })

    ipcMain.handle("LaunchChromeWithParams", async (e, params) => {
        const { port, host, chromePath, userDataDir, username, password, disableCACertPage, chromeFlags } = params
        const portInt = parseInt(`${port}`)
        const hostRaw = `${host}`
        if (hostRaw === "undefined" || hostRaw.includes("/") || hostRaw.split(":").length > 1) {
            throw Error(`host: ${hostRaw} is invalid or illegal`)
        }

        // https://peter.sh/experiments/chromium-command-line-switches/
        // opts:
        //   --no-system-proxy-config-service ⊗	Do not use system proxy configuration service.
        //   --no-proxy-server ⊗	Don't use a proxy server, always make direct connections. Overrides any other proxy server flags that are passed. ↪
            
        let launchOpt = {
            startingUrl: disableCACertPage === false ? "http://mitm" : "chrome://newtab", // 确保在启动时打开 chrome://newtab 页面。
            chromeFlags: [
                `--proxy-server=http://${hostRaw}:${portInt}`, // 设置具体的代理服务器地址和端口。
                ...chromeFlags.filter(item => !item.disabled).map(item => {
                    if (item.variableValues) {
                        return item.parameterName + "=" + item.variableValues
                    } else {
                        return item.parameterName
                    }
                })
            ]
        }
        if (userDataDir) {
            launchOpt["userDataDir"] = userDataDir
        }
        if (chromePath) {
            launchOpt["chromePath"] = chromePath
        }
        // 用户名/密码 参数重构
        if (username.length > 0 && password.length > 0) {
            try {
                // 要写入的内容
                const exceptContent = disableExtensionsExceptStr(host, port, username, password)
                const manifestContent = manifestStr

                // 创建文件夹 { recursive: true } 选项确保如果文件夹的上级目录也不存在时，一同创建。
                if (!fs.existsSync(commonFilePath)) {
                    fs.mkdirSync(commonFilePath, { recursive: true })
                }

                // 使用 fs.writeFileSync创建文件 写入内容到临时文件
                fs.writeFileSync(exceptFilePath, exceptContent)
                fs.writeFileSync(manifestFilePath, manifestContent)

                isCreateFile = true

                launchOpt["chromeFlags"].unshift(
                    `--disable-extensions-except=${commonFilePath}`,
                    `--load-extension=${commonFilePath}`
                )
            } catch (error) {
                console.log(`操作失败：${error}`)
            }
        }

        if (process.platform === "darwin") {
            const appBundlePath = createCustomChromeApp({
                appName: "Yakit-Chrome",
                iconPath: path.join(__dirname, "../resources/yakit-chrome.icns"),
                chromePath: chromePath
            })
            const customChromeFlags = launchOpt["chromeFlags"].map(item => shellEscape(item)).join(" ")
            // 使用 open 命令启动应用并传递参数
            return launchMacChrome(appBundlePath, customChromeFlags).then((chrome) => {
                if (chrome && chrome.process) {
                    startNum += 1
                    started = true
                }
                return ""
            }).catch((error) => {
                console.error('Failed to launch Chrome:', error)
                throw error
            })
            
        } else {
            return launch(launchOpt).then((chrome) => {
                chrome.process.on("exit", () => {
                    // 在这里执行您想要的操作，当所有chrome实例都关闭时
                    startNum -= 1
                    if (startNum <= 0) {
                        started = false
                        deleteCreateFile()
                    }
                })
                startNum += 1
                started = true
                return ""
            })
    }
    })

    function canAccess(file) {
        if (!file) {
            return false
        }
        try {
            fs.accessSync(file)
            return true
        } catch (e) {
            return false
        }
    }

    function darwinFast() {
        const priorityOptions = [
            process.env.CHROME_PATH,
            process.env.LIGHTHOUSE_CHROMIUM_PATH,
            "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        ]
        for (const chromePath of priorityOptions) {
            if (chromePath && canAccess(chromePath)) return chromePath
        }
        return null
    }

    const judgePath = () => {
        switch (process.platform) {
            // mac存在卡顿问题 因此需单独处理
            case "darwin":
                return darwinFast()
            case "win32":
                return getChromePath()
            case "linux":
                return getChromePath()
        }
    }

    ipcMain.handle("GetChromePath", async () => {
        try {
            return judgePath()
        } catch (e) {
            return null
        }
    })

    ipcMain.handle("StopAllChrome", async (e) => {
        deleteCreateFile()
        startNum = 0
        started = false
        return killAll()
    })
}
