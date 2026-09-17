import axios, { type AxiosRequestConfig } from 'axios'
import fs from 'node:fs'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import type { Readable } from 'node:stream'
import { throttle } from 'throttle-debounce'
import { getYaklangEngineDir } from '../filePath'
import { getLocalEngineCacheName } from './engineVersion'

export interface DownloadProgress {
  time: { elapsed: number; remaining: number }
  speed: number
  percent: number
  size: { total: number; transferred: number }
}
export type ProgressHandler = (state: DownloadProgress | 100) => void
export type DownloadOptions = AxiosRequestConfig & {
  throttle?: number
  category?: 'engine' | 'yakit' | 'file'
}
interface DownloadTask {
  controller: AbortController
  category: DownloadOptions['category']
  finished: Promise<void>
}
const downloads = new Map<string, DownloadTask>()

export function requestWithProgress(
  downloadUrl: string,
  dest: string,
  options: DownloadOptions = {},
  onProgress?: ProgressHandler,
  onFinished?: () => void,
  onError?: (error: unknown) => void,
  isEncodeURI = true,
): void {
  const destination = path.resolve(dest)
  if (downloads.has(destination)) {
    onError?.(new Error('该路径已有正在进行的下载'))
    return
  }
  const controller = new AbortController()
  const task: DownloadTask = { controller, category: options.category ?? 'file', finished: Promise.resolve() }
  const abort = () => controller.abort()
  options.signal?.addEventListener?.('abort', abort, { once: true })
  if (options.signal?.aborted) controller.abort()
  downloads.set(destination, task)
  task.finished = (async () => {
    let updateProgress: ReturnType<typeof throttle> | undefined
    let startedWriting = false
    try {
      controller.signal.throwIfAborted()
      const { throttle: interval = 1000, category, ...config } = options
      const response = await axios.get<Readable>(isEncodeURI ? encodeURI(downloadUrl) : downloadUrl, {
        ...config,
        responseType: 'stream',
        signal: controller.signal,
      })
      // Axios may finish handing the response over at the same time as cancellation.
      if (controller.signal.aborted) {
        response.data.destroy()
        throw new Error('Write operation cancelled')
      }
      const total = Number(response.headers['content-length']) || 0
      let transferred = 0
      const startedAt = Date.now()
      updateProgress = throttle(interval, () => {
        const elapsed = (Date.now() - startedAt) / 1000
        const speed = elapsed >= 1 ? transferred / elapsed : 0
        const percent = total > 0 ? Math.min(transferred, total) / total : 0
        onProgress?.({
          time: {
            elapsed,
            remaining: speed > 0 ? Math.max(0, Math.round(((total - transferred) / speed) * 1000) / 1000) : 0,
          },
          speed,
          percent,
          size: { total, transferred },
        })
      })
      response.data.on('data', (chunk: Buffer) => {
        transferred += chunk.length
        updateProgress?.()
      })
      startedWriting = true
      await pipeline(response.data, fs.createWriteStream(destination), { signal: controller.signal })
      updateProgress.cancel()
      onProgress?.(100)
      onFinished?.()
    } catch (error) {
      // Wait for pipeline to close the file before removing this task's partial download.
      if (controller.signal.aborted && startedWriting) {
        await fs.promises.rm(destination, { force: true }).catch(() => {})
      }
      onError?.(error)
    } finally {
      updateProgress?.cancel()
      options.signal?.removeEventListener?.('abort', abort)
      if (downloads.get(destination) === task) downloads.delete(destination)
    }
  })()
  // Existing download entry points deliver failure through onError.
  void task.finished.catch((error) => console.error('Download callback failed', error))
}

export async function cancelRequestProgress(destination: string): Promise<void> {
  const task = downloads.get(path.resolve(destination))
  if (!task) return
  task.controller.abort()
  await task.finished
}

export async function engineCancelRequestWithProgress(version: string): Promise<void> {
  if (!version) throw new Error('Version number does not exist')
  await cancelRequestProgress(path.join(getYaklangEngineDir(), getLocalEngineCacheName(version)))
}

export async function yakitCancelRequestWithProgress(): Promise<void> {
  await Promise.all(
    [...downloads.entries()]
      .filter(([, task]) => task.category === 'yakit')
      .map(([destination]) => cancelRequestProgress(destination)),
  )
}
