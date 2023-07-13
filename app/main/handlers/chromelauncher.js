const {ipcMain} = require("electron")
const {launch, killAll, getChromePath} = require("chrome-launcher")
const fs = require("fs")
module.exports = (win, getClient) => {
    let started = false
    ipcMain.handle("IsChromeLaunched", async () => {
        return started
    })

    ipcMain.handle("LaunchChromeWithParams", async (e, params) => {
        const {port, host, chromePath} = params
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
            chromeFlags: [
                `--no-system-proxy-config-service`,
                `--proxy-bypass-list=<-loopback>`,
                `--proxy-server=http://${hostRaw}:${portInt}`,
                // `--ignore-certificate-errors-spki-list`,
                `--ignore-certificate-errors`,
                `--ignore-urlfetcher-cert-requests`,
                `--disable-webrtc`,
                `--force-webrtc-ip-handling-policy=default_public_interface_only`
            ]
        }
        if (chromePath) {
            launchOpt["chromePath"] = chromePath
        }
        return launch(launchOpt).then((chrome) => {
            chrome.process.on("exit", () => {
                // 在这里执行您想要的操作，当所有chrome实例都关闭时
                started = false
            })
            started = true
            return ""
        })
    })

    function canAccess(file) {
        if (!file) {
            return false;
        }
        try {
            fs.accessSync(file);
            return true;
        }
        catch (e) {
            return false;
        }
    }

    function darwinFast() {
        const priorityOptions = [
            process.env.CHROME_PATH,
            process.env.LIGHTHOUSE_CHROMIUM_PATH,
            '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        ];
        for (const chromePath of priorityOptions) {
            if (chromePath && canAccess(chromePath))
                return chromePath;
        }
        return null;
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
        started = false
        return killAll()
    })
}
