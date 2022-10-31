const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    /**
     * @name 全局反连服务器配置
     */
    let globalConfigServer = null

    /**
     * @name 判断是否开启全局反连
     */
    ipcMain.handle("is-global-reverse-status", () => {
        /**
         * @returns {Boolean}
         */
        return !!globalConfigServer
    })
    /**
     * @name 取消全局反连
     */
    ipcMain.handle("cancel-global-reverse-status", () => {
        if (globalConfigServer) {
            globalConfigServer.cancel()
            console.info("取消全局反连配置")
            globalConfigServer = null
        }
        return
    })
}
