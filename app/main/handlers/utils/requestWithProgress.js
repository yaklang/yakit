const axios = require('axios')
const fs = require('fs')
const { throttle } = require('throttle-debounce')
const path = require('path')

function encodeChineseCharacters(url) {
  return encodeURI(url)
}

/** @type {Map<string, import('fs').WriteStream>} */
const writersByDest = new Map()

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
        onError && onError(new Error(`404 not found in ${downloadUrl}`))
        return
      }

      if (writersByDest.has(dest)) {
        throw new Error(`Download already in progress for ${dest}`)
      }

      const writer = fs.createWriteStream(dest)
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
      onFinished && onFinished()
    })
    .catch((error) => {
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
      // exact dest writer missing — do not guess unrelated writers
      console.info(`engineCancelRequestWithProgress: no writer for ${dest}`)
      settle(resolve)
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
      settle(resolve)
      return
    }
    writer.on('close', () => {
      settle(reject, new Error('Write operation stoped'))
    })
    destroyWriter(destPath, new Error('Write operation cancelled'))
  })
}

module.exports = {
  requestWithProgress,
  engineCancelRequestWithProgress,
  yakitCancelRequestWithProgress,
  cancelRequestProgress,
  buildProgressState,
}
