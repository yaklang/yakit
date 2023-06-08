const {ipcMain} = require("electron");
const {launch, killAll, getChromePath} = require("chrome-launcher");
module.exports = (win, getClient) => {
    let started = false;
    ipcMain.handle("IsChromeLaunched", async () => {
        return started
    })

    ipcMain.handle("LaunchChromeWithParams", async (e, params) => {
        const {port, host, chromePath} = params;
        const portInt = parseInt(`${port}`);
        const hostRaw = `${host}`;
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
                `--force-webrtc-ip-handling-policy=default_public_interface_only`,
            ]
        }
        if (chromePath) {
            launchOpt["chromePath"] = chromePath
        }
        return launch(launchOpt).then(value => {
            started = true
            return ""
        })
    })

    ipcMain.handle("GetChromePath", async () => {
        try {
            return getChromePath()
        } catch (e) {
            console.log(e)
            return null
        }
    })

    ipcMain.handle("StopAllChrome", async (e) => {
        started = false;
        return killAll()
    })
}