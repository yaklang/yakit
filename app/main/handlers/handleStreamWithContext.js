module.exports = {
    cancelHandler: (streamMap) => {
        return async (e, token) => {
            const stream = streamMap.get(token)
            stream && stream.cancel()
            streamMap.delete(token)
            console.log('流已经被取消');
        }
    },
    registerHandler: (windows, stream, streamMap, token) => {
        const currentStream = streamMap.get(token)
        if (!!currentStream) {
            return
        }

        streamMap.set(token, stream)
        stream.on("data", (data) => {
            if (!windows) {
                return
            }
            windows.webContents.send(`${token}-data`, data)
        })
        stream.on("error", (error) => {
            if (!windows) {
                return
            }
            windows.webContents.send(`${token}-error`, error && error.details)
        })
        stream.on("end", () => {
            streamMap.delete(token)
            if (!windows) {
                return
            }
            console.log('流结束')
            windows.webContents.send(`${token}-end`)
        })
    }
}
