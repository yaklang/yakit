import { registerMainMethod } from '../ipc/index'
import type { InvocationContext } from '../ipc/router'
import type { UploadProgress, UploadParams, UploadReply, FileUpload } from '../../shared/communication/local-methods'
import { requestWithProgress } from './downloadTask'
import { getYakitInstallDir } from '../filePath'
import type { BrowserWindow, IpcMainInvokeEvent } from 'electron'
import { appPath } from '../paths'
import { httpApi } from '../httpServer'
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import FormData from 'form-data'
import axios from 'axios'
import { hashChunk, formatApiErrorDetail } from '../toolsFunc'

function readUploadReply(value: unknown): UploadReply {
  if (!value || typeof value !== 'object' || !('code' in value) || typeof value.code !== 'number')
    throw new Error('上传接口未返回有效状态')
  return value as UploadReply
}
function uploadReply(value: unknown): UploadReply {
  const result = readUploadReply(value)
  if (result.code !== 200) {
    const data = result.data && typeof result.data === 'object' ? (result.data as Record<string, unknown>) : undefined
    throw new Error(
      `code ${result.code}: ${formatApiErrorDetail(data?.reason ?? result.data ?? result.message ?? '未知错误')}`,
    )
  }
  return result
}
const imageBytes = (base64: string) => Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ''), 'base64')

export function registerTransferServices() {
  registerMainMethod(
    'DownloadFingerprint',
    (savePath, context) =>
      new Promise<string>((resolve, reject) => {
        requestWithProgress(
          'https://yaklang.oss-cn-beijing.aliyuncs.com/fingerprints.zip',
          savePath,
          { signal: context.signal },
          undefined,
          () => resolve(savePath),
          reject,
        )
      }),
  )
  const runUpload = async (
    params: UploadParams,
    context: Omit<InvocationContext, 'progress'> & { progress(data: UploadProgress): void },
    oss: boolean,
  ) => {
    if (!params.type) throw new Error('type必传')
    if (!params.path && !params.base64) throw new Error('上传文件路径不能为空')
    const signal = context.signal
    {
      const base64 = params.base64 && params.imgInfo ? imageBytes(params.base64) : undefined
      const file = params.path || ''
      const size = base64 ? base64.length : (await fs.promises.stat(file)).size
      if (size > 5 * 1024 ** 3) throw new Error('上传大小不可大于5GB')
      const chunkSize = (oss ? 20 : 60) * 1024 ** 2
      const totalChunks = base64 ? 1 : Math.max(1, Math.ceil(size / chunkSize))
      const fileHashTime = oss ? `${await hashChunk({ path: file, signal: signal })}-${Date.now()}` : ''
      const resArr: UploadReply[] = []
      for (let index = 0; index < totalChunks; index++) {
        signal.throwIfAborted()
        const form = new FormData()
        // ReadStream.end is inclusive. Adjacent chunks must neither overlap nor skip a byte.
        const start = index * chunkSize
        const source =
          base64 ||
          (size === 0
            ? Buffer.alloc(0)
            : fs.createReadStream(file, {
                start,
                end: Math.min(start + chunkSize, size) - 1,
                signal: signal,
              }))
        form.append('file', source, base64 ? params.imgInfo : { filename: path.basename(file) })
        form.append('index', String(index))
        form.append('totalChunks', String(totalChunks))
        form.append('type', params.type)
        if (oss) form.append('hash', fileHashTime)
        else form.append('fileName', base64 ? '' : path.basename(file))
        if (params.filedHash || oss) form.append('fileHash', params.filedHash || '')
        try {
          // Multipart streams cannot be replayed after consumption. Retry requires a new stream.
          const res = uploadReply(
            await httpApi({
              method: 'post',
              url: params.url,
              data: form,
              headers: form.getHeaders(),
              signal: signal,
              timeout: index === totalChunks - 1 && totalChunks > 3 ? 600_000 : 60_000,
            }),
          )
          resArr.push(res)
          context.progress({
            res,
            progress: Math.floor(((index + 1) / totalChunks) * 100),
          })
        } finally {
          if (source instanceof fs.ReadStream) source.destroy()
        }
      }
      return { TaskStatus: true, resArr }
    }
  }
  registerMainMethod('split-upload', (params, context) => runUpload(params, context, false))
  registerMainMethod('oss-split-upload', (params, context) => runUpload(params, context, true))
  registerMainMethod('download-url-to-path', async (params, context) => {
    const dest = params.path || path.join(getYakitInstallDir(), path.basename(params.fileName || ''))
    if (!params.path && !params.fileName) throw new Error('Download filename is required')
    await fs.promises.mkdir(path.dirname(dest), { recursive: true })
    context.signal.throwIfAborted()
    return new Promise<string>((resolve, reject) =>
      requestWithProgress(
        params.url,
        dest,
        { signal: context.signal },
        (state) => context.progress({ state, openPath: dest }),
        () => resolve(dest),
        reject,
        params.isEncodeURI !== false,
      ),
    )
  })
  registerMainMethod('get-template-file', async () =>
    (await fs.promises.readFile(appPath('app', 'assets', '导入模板.xlsx'))).toString('base64'),
  )
  registerMainMethod('get-http-file-link-info', async (url, context) => {
    const response = await axios.head(url, { signal: context.signal })
    return {
      fileName: path.basename(new URL(url).pathname),
      size: Number(response.headers['content-length']) || 0,
      type: String(response.headers['content-type'] || ''),
    }
  })
  const upload = async (url: string, params: FileUpload, kind: 'image' | 'file' | 'group', signal: AbortSignal) => {
    const form = new FormData()
    const source = params.base64 ? imageBytes(params.base64) : fs.createReadStream(params.path || '', { signal })
    if (kind === 'image') {
      for (const [key, value] of Object.entries(params))
        if (!['path', 'url', 'base64', 'imgInfo'].includes(key) && value !== undefined && value !== null)
          form.append(key, typeof value === 'string' ? value : String(value))
    }
    form.append(kind === 'image' ? 'file_name' : 'file', source, params.imgInfo)
    if (kind === 'file') form.append('fileName', params.name || '')
    try {
      return readUploadReply(await httpApi({ method: 'post', url, data: form, headers: form.getHeaders(), signal }))
    } finally {
      if (source instanceof fs.ReadStream) source.destroy()
    }
  }
  registerMainMethod('upload-group-data', (params, context) =>
    upload('update/plugins/group', params, 'group', context.signal),
  )
  registerMainMethod('http-upload-file', (params, context) => upload('upload/file', params, 'file', context.signal))
  for (const name of ['http-upload-img-path', 'http-upload-img-base64'] as const)
    registerMainMethod(name, (params, context) => upload('upload/img', params, 'image', context.signal))
}
