const {ipcMain} = require("electron");
const {launch, killAll} = require("chrome-launcher");

module.exports = () => {
    let started = false;
    ipcMain.handle("IsChromeLaunched", async () => {
        return started
    })

    ipcMain.handle("LaunchChromeWithParams", async (e, params) => {
        const {port, host} = params;
        const portInt = parseInt(`${port}`);
        const hostRaw = `${host}`;
        if (hostRaw === "undefined" || hostRaw.includes("/") || hostRaw.split(":").length > 1) {
            throw Error(`host: ${hostRaw} is invalid or illegal`)
        }

        // https://peter.sh/experiments/chromium-command-line-switches/
        // opts:
        //   --no-system-proxy-config-service ⊗	Do not use system proxy configuration service.
        //   --no-proxy-server ⊗	Don't use a proxy server, always make direct connections. Overrides any other proxy server flags that are passed. ↪
        return launch({
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
        }).then(value => {
            started = true
            return ""
        })
    })

    ipcMain.handle("StopAllChrome", async (e) => {
        started = false;
        return killAll()
    })
}