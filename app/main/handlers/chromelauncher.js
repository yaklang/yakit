const {ipcMain} = require("electron");
const {launch, killAll} = require("chrome-launcher");

module.exports = (win, getClient) => {
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

        return launch({
            chromeFlags: [
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