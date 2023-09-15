const {ipcMain} = require("electron")
const childProcess = require("child_process")

/**
 * @name 判断当前网络通信状态
 * @returns {boolean} true可用
 */
const asyncNetworkJudgment = (win, params) => {
    return new Promise((resolve, reject) => {
        try {
            const ip = 'www.baidu.com';
            const child = childProcess.exec(
                "ping " + ip,
                { encoding: binaryEncoding },
                (error, stdout, stderr) => {
                    if (error) {
                        console.log("ip is inactive.");
                        item.checked = false;
                        if (this.showCmd) {
                            // Message.alert("该IP地址暂不可用！", "tip");
                            resolve(false)
                        }
                        // this.msgList.push(iconv.decode(error, encodings));
                        // console.log(iconv.decode(error, encodings));
                    } else {
                        if (
                            this.msgList.some((item) => {
                                // return item.indexOf("无法访问目标主机") != -1;
                                resolve(item.indexOf("无法访问目标主机") != -1)
                            })
                        ) {
                            item.checked = false;
                            if (this.showCmd) {
                                // Message.alert("该IP地址暂不可用！", "tip");
                                resolve(false)
                            }
                        } else {
                            console.log("ip is active.");
                            console.log(iconv.decode(stdout, encodings));
                            // console.log(iconv.decode(stderr, encodings));
                            item.checked = true;
                            if (this.showCmd) {
                                resolve(true)
                            }
                        }
                    }
                }
            );

        } catch (e) {
            reject(e)
        }
    })
}

 /** 获取当前网络状态 */
 ipcMain.handle("fetch-netWork-status", async (e, params) => {
    return await asyncNetworkJudgment(win, params)
})