const axios = require('axios')
const fs = require('fs')
const { throttle } = require('throttle-debounce')
const path = require('path')

function encodeChineseCharacters(url) {
  return encodeURI(url)
}

/** @type {Map<string, import('fs').WriteStream>} */
const writersByDest = new Map()

/**
 * axios 在途 / 尚未建 writer 时占用 dest，防止第二路下载在建流前抢 dest
 *（含 upgradeUtil 侧对同路径的 unlinkSync 竞态）。
 */
const pendingByDest = new Set()

/**
 * 取消先于下载流建立（URL 解析 / axios 在途）时记录的取消意图，按 dest 暂存；
 * requestWithProgress 在建 writer 前消费，保证「取消永远有效」。
 * 任务收尾（requestWithProgress 出口 / upgradeUtil onError）时清理，
 * 避免残留意图毒化用户下一次同 dest 的下载。
 */
const cancelRequestedByDest = new Set()

function isDestBusy(dest) {
  return writersByDest.has(dest) || pendingByDest.has(dest)
}

function reserveDest(dest) {
  if (isDestBusy(dest)) return false
  pendingByDest.add(dest)
  return true
}

function releaseDest(dest) {
  pendingByDest.delete(dest)
}

function buildProgressState({ startedAt, totalLength, downloadedLength }) {
  const total = Number(totalLength) || 0
  const state = {
    time: {
      elapsed: (Date.now() - startedAt) / 1000,
      remaining: 0,
    },
    speed: 0,
    percent: 0,
    size: {
      total,
      transferred: downloadedLength,
    },
  }
  if (state.time.elapsed >= 1) {
    state.speed = state.size.transferred / state.time.elapsed
  }
  if (state.size.total > 0) {
    state.percent = Math.min(state.size.transferred, state.size.total) / state.size.total
    if (state.speed > 0 && state.percent !== 1) {
      state.time.remaining = Math.round((state.size.total / state.speed - state.time.elapsed) * 1000) / 1000
    }
  } else if (state.size.transferred > 0) {
    state.percent = Math.min(0.95, 1 - 1 / (1 + state.size.transferred / (5 * 1024 * 1024)))
  }
  return state
}

function destroyWriter(dest, err) {
  const writer = writersByDest.get(dest)
  if (!writer) return
  writersByDest.delete(dest)
  try {
    writer.destroy(err || new Error('Write operation cancelled'))
  } catch (e) {}
}

function requestWithProgress(
  downloadUrl,
  dest,
  options = {},
  onProgress = undefined,
  onFinished = undefined,
  onError = undefined,
  isEncodeURI = true,
) {
  // 在 axios.get 之前占用 dest，避免第二路下载在流建立前 unlink / 抢写同一文件
  if (writersByDest.has(dest) || pendingByDest.has(dest)) {
    onError && onError(new Error(`Download already in progress for ${dest}`))
    return
  }
  pendingByDest.add(dest)

  const config = {
    ...options,
    responseType: 'stream',
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
        // 404 不建 writer：清理窗口期暂存的取消意图与 pending，避免毒化下次同 dest 下载
        pendingByDest.delete(dest)
        cancelRequestedByDest.delete(dest)
        onError && onError(new Error(`404 not found in ${downloadUrl}`))
        return
      }

      if (writersByDest.has(dest)) {
        pendingByDest.delete(dest)
        throw new Error(`Download already in progress for ${dest}`)
      }

      // 取消先于流建立到达：消费暂存的取消意图，不建 writer 直接失败
      if (cancelRequestedByDest.has(dest)) {
        cancelRequestedByDest.delete(dest)
        pendingByDest.delete(dest)
        throw new Error('Write operation cancelled')
      }

      const writer = fs.createWriteStream(dest)
      pendingByDest.delete(dest)
      writersByDest.set(dest, writer)
      const totalLength = response.headers['content-length']
      let downloadedLength = 0
      const startedAt = Date.now()

      const emitProgress = (override = {}) => {
        const state = {
          ...buildProgressState({ startedAt, totalLength, downloadedLength }),
          ...override,
        }
        if (override.percent != null) state.percent = override.percent
        if (override.size) state.size = { ...state.size, ...override.size }
        onProgress && onProgress(state)
      }

      const updateProgress = throttle(options.throttle || 200, () => {
        const state = buildProgressState({ startedAt, totalLength, downloadedLength })
        console.log(`Downloaded: `, state.percent, state.size)
        onProgress && onProgress(state)
      })

      response.data.on('data', (chunk) => {
        downloadedLength += chunk.length
        updateProgress()
      })

      response.data.pipe(writer)

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          if (writersByDest.get(dest) === writer) writersByDest.delete(dest)
          emitProgress({
            percent: 1,
            size: {
              total: Number(totalLength) || downloadedLength,
              transferred: downloadedLength,
            },
            time: {
              elapsed: (Date.now() - startedAt) / 1000,
              remaining: 0,
            },
            speed: 0,
          })
          resolve()
        })
        writer.on('error', (err) => {
          if (writersByDest.get(dest) === writer) writersByDest.delete(dest)
          reject(err)
        })
      })
    })
    .then(() => {
      pendingByDest.delete(dest)
      onFinished && onFinished()
    })
    .catch((error) => {
      // 窗口期取消后请求失败：同样清理暂存意图与 pending，避免毒化下次同 dest 下载
      pendingByDest.delete(dest)
      cancelRequestedByDest.delete(dest)
      destroyWriter(dest, error)
      console.info(error.message)
      onError && onError(error)
    })
}

function cancelRequestProgress(destPath) {
  return new Promise((resolve, reject) => {
    let settled = false
    const settle = (fn, arg) => {
      if (settled) return
      settled = true
      fn(arg)
    }
    const writer = writersByDest.get(destPath)
    if (!writer) {
      settle(resolve)
      return
    }
    writer.on('close', () => {
      try {
        fs.unlinkSync(destPath)
      } catch (e) {}
      settle(reject, new Error('Write operation cancelled'))
    })
    destroyWriter(destPath, new Error('Write operation cancelled'))
  })
}

function engineCancelRequestWithProgress(version) {
  return new Promise((resolve, reject) => {
    let settled = false
    const settle = (fn, arg) => {
      if (settled) return
      settled = true
      fn(arg)
    }
    if (version === '') {
      settle(reject, new Error('Version number does not exist'))
      return
    }
    const { getYaklangEngineDir } = require('../../filePath')
    const { getLocalEngineCacheName } = require('./engineVersion')
    const dest = path.join(getYaklangEngineDir(), getLocalEngineCacheName(version))
    const writer = writersByDest.get(dest)
    if (writer) {
      writer.on('close', () => {
        try {
          fs.unlinkSync(dest)
        } catch (e) {}
        settle(reject, new Error('Write operation cancelled'))
      })
      destroyWriter(dest, new Error('Write operation cancelled'))
    } else {
      // exact dest writer missing — 与 yakitCancel 对齐：暂存取消意图并 reject，
      // 避免 URL/版本解析窗口期内取消静默 resolve
      console.info(`engineCancelRequestWithProgress: no writer for ${dest}`)
      cancelRequestedByDest.add(dest)
      settle(reject, new Error('Write operation cancelled'))
    }
  })
}

function yakitCancelRequestWithProgress(destPath) {
  return new Promise((resolve, reject) => {
    let settled = false
    const settle = (fn, arg) => {
      if (settled) return
      settled = true
      fn(arg)
    }
    if (!destPath) {
      settle(resolve)
      return
    }
    const writer = writersByDest.get(destPath)
    if (!writer) {
      // 流尚未建立：暂存取消意图（requestWithProgress 建 writer 前消费），
      // 并与下载中取消同样 reject，避免取消按钮在窗口期静默失效；
      // 意图随任务收尾清理（requestWithProgress 出口 / upgradeUtil onFinished/onError）。
      cancelRequestedByDest.add(destPath)
      settle(reject, new Error('Write operation stoped'))
      return
    }
    writer.on('close', () => {
      settle(reject, new Error('Write operation stoped'))
    })
    destroyWriter(destPath, new Error('Write operation cancelled'))
  })
}

/** 任务收尾兜底：清除该 dest 暂存的取消意图（upgradeUtil onFinished/onError 调用） */
function clearCancelIntent(destPath) {
  if (destPath) cancelRequestedByDest.delete(destPath)
}

module.exports = {
  requestWithProgress,
  engineCancelRequestWithProgress,
  yakitCancelRequestWithProgress,
  cancelRequestProgress,
  buildProgressState,
  clearCancelIntent,
  isDestBusy,
  reserveDest,
  releaseDest,
}
