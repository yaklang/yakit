const {ipcMain} = require("electron");

module.exports = (win, getClient) => {
    const exportTasks = new Map();

    ipcMain.handle("ExtractDataToFile", async (e, request) => {
        const {token, params} = request;
        if (token === undefined || !token) {
            return
        }

        let currentStream = exportTasks.get(token);
        if (currentStream === undefined) {
            currentStream = getClient().ExtractDataToFile()
            currentStream.on("error", e => {
                if (win) {
                    win.webContents.send(`${token}-error`, `${e}`)
                }
            })
            currentStream.on("data", data => {
                if (win) {
                    win.webContents.send(`${token}-data`, data)
                }
            })
            currentStream.on("end", () => {
                if (win) {
                    win.webContents.send(`${token}-end`)
                }
                exportTasks.delete(token)
            })
            exportTasks.set(token, currentStream)
        }
        currentStream.write(params)
    })
}