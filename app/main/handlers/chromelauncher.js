const {ipcMain} = require("electron")
const {launch, killAll, getChromePath} = require("chrome-launcher")
const fs = require("fs")
const path = require("path")
const {YakitProjectPath} =require("../filePath")
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
        const {port, host, chromePath, userDataDir, username, password, disableCACertPage} = params
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
                `--no-system-proxy-config-service`, // 禁用系统代理配置服务。
                `--proxy-bypass-list=<-loopback>`, // 为代理设置回避列表，不代理回环地址。
                `--proxy-server=http://${hostRaw}:${portInt}`, // 设置具体的代理服务器地址和端口。

                `--ignore-certificate-errors`, // 忽略 SSL 证书错误。
                `--test-type`, // 表示这是一个测试实例。
                `--no-sandbox`, // https://stackoverflow.com/questions/64788142/nodejs-error-connect-econnrefused-127-0-0-1port-chrome-remote-interface
                `--ignore-urlfetcher-cert-requests`, // 忽略 URL fetcher 的证书请求。
                `--disable-webrtc`, // 禁用 WebRTC。
                `--disable-component-extensions-with-background-pages`, // 禁用带有背景页的组件扩展。
                `--disable-extensions`, // 禁用所有扩展。
                `--disable-notifications`, // 禁用通知。
                `--force-webrtc-ip-handling-policy=default_public_interface_only`, // 强制 WebRTC IP 处理策略仅使用默认的公共接口。
                `--disable-ipc-flooding-protection`, // 禁用 IPC 洪水攻击保护。
                `--disable-xss-auditor`, // 禁用 XSS 审查器。
                `--disable-bundled-ppapi-flash`, // 禁用捆绑的 PPAPI Flash 版本。
                `--disable-plugins-discovery`, // 禁止插件发现。
                `--disable-default-apps`, // 禁用默认应用。
                `--disable-prerender-local-predictor`, // 禁用本地预加载页面的预测功能。
                `--disable-sync`, // 禁用同步功能。
                `--disable-breakpad`, // 禁用 Breakpad 崩溃报告。
                `--disable-crash-reporter`, // 禁用崩溃报告器。
                `--disk-cache-size=0`, // 设置磁盘缓存大小为 0。
                `--disable-settings-window`, // 禁用设置窗口。
                `--disable-speech-api`, // 禁用语音API。
                `--disable-file-system`, // 禁用文件系统API。
                `--disable-presentation-api`, // 禁用演示API。
                `--disable-permissions-api`, // 禁用权限API。
                `--disable-new-zip-unpacker`, // 禁用新 ZIP 解压功能。
                `--disable-media-session-api`, // 禁用媒体会话API。
                `--no-experiments`, // 禁止实验。
                `--no-events`, // 不发送事件。
                `--no-first-run`, // 启动时跳过首次运行向导。
                `--no-default-browser-check`, // 启动时不检查默认浏览器。
                `--no-pings`, // 禁用 ping 跟踪。
                `--no-service-autorun`, // 不自动运行服务。
                `--media-cache-size=0`, // 设置媒体缓存大小为0。
                `--use-fake-device-for-media-stream`, // 使用虚拟设备来捕获媒体流。
                `--dbus-stub`, // 使用 DBus 存根。
                `--disable-background-networking`, // 禁用后台网络活动。
                `--disable-component-update`, // 不要更新 chrome://components/ 中列出的浏览器“组件”
                `--disable-features=ChromeWhatsNewUI,HttpsUpgrades,OptimizationHints` // 禁用特定的功能。
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
                // 屏蔽项
                // `--proxy-server=http://${hostRaw}:${portInt}`,  // 设置具体的代理服务器地址和端口。
                // `--disable-extensions`,  // 禁用所有扩展。
                launchOpt["chromeFlags"] = launchOpt.chromeFlags.filter(
                    (item) => !(item.startsWith("--proxy-server=http://") || item === "--disable-extensions")
                )

                // 要写入的内容
                const exceptContent = disableExtensionsExceptStr(host, port, username, password)
                const manifestContent = manifestStr

                // 创建文件夹 { recursive: true } 选项确保如果文件夹的上级目录也不存在时，一同创建。
                if (!fs.existsSync(commonFilePath)) {
                    fs.mkdirSync(commonFilePath, {recursive: true})
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
