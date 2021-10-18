module.exports = {
    cancelHandler: (streamMap)=>{
        return async (e, token) => {
            const stream = streamMap.get(token);
            stream && stream.cancel()
            streamMap.delete(token)
        }
    },
    registerHandler: (windows, stream, streamMap, token)=>{
        streamMap.set(token, stream);
        stream.on("data", data => {
            if (!windows) {
                return
            }
            windows.webContents.send(`${token}-data`, data)
        })
        stream.on("error", error => {
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
            windows.webContents.send(`${token}-end`)
        })
    }
}