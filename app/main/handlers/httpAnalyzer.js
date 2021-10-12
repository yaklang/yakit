const {ipcMain} = require("electron");

module.exports = (win, getClient) => {
    ipcMain.handle("http-analyze", (e, data) => {
        getClient().HTTPRequestAnalyzer(data, (err, result) => {
        })
    })
}