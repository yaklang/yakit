const axios = require("axios")
const fs = require("fs")
const {throttle} = require("throttle-debounce")
const path = require("path")
const {yaklangEngineDir} = require("../../filePath")

// 函数用于编码URL中的中文字符
function encodeChineseCharacters(url) {
    // 实现URL中中文字符的编码逻辑
    return encodeURI(url)
}

let writer = null
let downloadedLength = 0
// 目前只有笔记本中的上传的文件和下载笔记本不需要额外的编码(因为这个地方可能会出现特殊字符,例如文件名:15w+)
function requestWithProgress(
    downloadUrl,
    dest,
    options = {},
    onProgress = undefined,
    onFinished = undefined,
    onError = undefined,
    isEncodeURI = true
) {
    // 设置axios请求配置
    const config = {
        ...options,
        responseType: "stream"
    }

    let u = downloadUrl
    if (isEncodeURI) {
        u = encodeChineseCharacters(downloadUrl)
    }

    console.info(`start download ${u} to ${dest}`)
    axios
        .get(u, config)
        .then((response) => {
            if (response.status === 404) {
                onError && onError(new Error(`404 not found in ${downloadUrl}`))
                return
            }

            writer = fs.createWriteStream(dest)
            const totalLength = response.headers["content-length"]
            downloadedLength = 0
            const startedAt = Date.now()
            let getProgressState = () => {
                const state = {
                    time: {
                        elapsed: (Date.now() - startedAt) / 1000,
                        remaining: 0
                    },
                    speed: 0,
                    percent: 0,
                    size: {
                        total: Number(totalLength) || 0,
                        transferred: downloadedLength
                    }
                }
                if (state.time.elapsed >= 1) {
                    state.speed = state.size.transferred / state.time.elapsed
                }

                if (state.size.total > 0) {
                    state.percent = Math.min(state.size.transferred, state.size.total) / state.size.total
                    if (state.speed > 0) {
                        state.time.remaining =
                            state.percent !== 1 ? state.size.total / state.speed - state.time.elapsed : 0
                        state.time.remaining = Math.round(state.time.remaining * 1000) / 1000
                    }
                }
                return state
            }

            const updateProgress = throttle(options.throttle || 1000, () => {
                const percentage = (downloadedLength / totalLength) * 100
                // 你可以替换这里的逻辑来更新进度，例如发送到前端
                const state = getProgressState()
                console.log(`Downloaded: `, state.percent)
                onProgress && onProgress(state)
            })

            response.data.on("data", (chunk) => {
                downloadedLength += chunk.length
                updateProgress()
            })

            response.data.pipe(writer)

            return new Promise((resolve, reject) => {
                writer.on("finish", () => {
                    writer = null
                    onProgress && onProgress(100)
                    resolve()
                })
                writer.on("error", reject)
            })
        })
        .then(() => {
            // 下载完成后的处理
            onFinished && onFinished()
        })
        .catch((error) => {
            // 错误处理
            console.info(error.message)
            onError && onError(error)
        })
}

/**
 * TODO 待优化整合
 * 取消下载并删除不完整的文件
 */
function cancelRequestProgress(path) {
    return new Promise((resolve, reject) => {
        if (writer) {
            writer.on("close", () => {
                try {
                    fs.unlinkSync(path)
                } catch (e) {}
                reject(new Error("Write operation cancelled"))
            })
            writer.destroy(new Error("Write operation cancelled"))
            resolve()
        } else {
            resolve()
        }
    })
}

function engineCancelRequestWithProgress(version) {
    return new Promise((resolve, reject) => {
        if (version === "") reject(new Error("Version number does not exist"))
        if (writer) {
            writer.on("close", () => {
                // 主动点取消销毁流会触发 删掉不完整的引擎版本
                const dest = path.join(
                    yaklangEngineDir,
                    version.startsWith("dev/") ? "yak-" + version.replace("dev/", "dev-") : `yak-${version}`
                )
                try {
                    fs.unlinkSync(dest)
                } catch (e) {}
                reject(new Error("Write operation cancelled"))
            })
            writer.destroy(new Error("Write operation cancelled"))
        } else {
            resolve()
        }
    })
}

function yakitCancelRequestWithProgress() {
    return new Promise((resolve, reject) => {
        if (writer) {
            writer.on("close", () => {
                reject(new Error("Write operation stoped"))
            })
            writer.destroy(new Error("Write operation cancelled"))
        } else {
            resolve()
        }
    })
}

module.exports = {
    requestWithProgress,
    engineCancelRequestWithProgress,
    yakitCancelRequestWithProgress,
    cancelRequestProgress
}
