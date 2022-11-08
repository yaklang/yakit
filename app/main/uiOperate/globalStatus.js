const {ipcMain} = require("electron")
const fs = require("fs")
const {getLocalYaklangEngine} = require("../filePath")

module.exports = (win, getClient) => {
    /** yaklang引擎是否安装 */
    ipcMain.handle("is-yaklang-engine-installed", () => {
        /** @returns {Boolean} */
        return fs.existsSync(getLocalYaklangEngine())
    })
}
