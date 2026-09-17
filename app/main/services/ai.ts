import fs from 'node:fs/promises'
import FS from 'node:fs'
import path from 'node:path'
import { getAiImageTemp, getYakProjects } from '../filePath'
import { registerMainMethod } from '../ipc/index'
import type { YakClient } from '../../shared/generated/grpc/types'
import type { StreamFactory } from '../ipc/streams'
import type { LocalMethods } from '../../shared/communication/local-methods'

function segment(value: string) {
  if (!value || value === '.' || value === '..' || value.includes('/') || value.includes('\\'))
    throw new Error('Invalid AI image path component')
  return value
}
function checkAbort(signal: AbortSignal) {
  if (signal.aborted) throw Object.assign(new Error('AI image operation aborted'), { code: 'ABORTED' })
}
export async function saveAIImage(
  params: LocalMethods['save-ai-image']['request'],
  signal: AbortSignal,
  progress: (value: number) => void,
) {
  checkAbort(signal)
  const directory = path.join(
    getAiImageTemp(),
    segment(params.chatDataStoreKey),
    params.sessionID ? segment(params.sessionID) : '',
  )
  const destination = path.join(directory, segment(params.filename))
  if (!(params.buffer instanceof Uint8Array)) throw new Error('Image data must be bytes')
  await fs.mkdir(directory, { recursive: true })
  checkAbort(signal)
  const file = await fs.open(destination, 'wx')
  let complete = false
  try {
    let lastProgress = -1
    for (let offset = 0; offset < params.buffer.length; offset += 50 * 1024) {
      checkAbort(signal)
      const end = Math.min(offset + 50 * 1024, params.buffer.length)
      await file.writeFile(params.buffer.subarray(offset, end))
      const value = Math.round((end / params.buffer.length) * 100)
      if (value !== lastProgress) {
        progress(value)
        lastProgress = value
      }
    }
    checkAbort(signal)
    await file.close()
    complete = true
    if (!params.buffer.length) progress(100)
    return destination
  } finally {
    if (!complete) {
      await file.close().catch(() => {})
      await fs.unlink(destination).catch(() => {})
    }
  }
}

export async function deleteAIImages(
  params: LocalMethods['delete-ai-image']['request'],
  signal: AbortSignal,
  progress: (value: number) => void,
) {
  checkAbort(signal)
  const root = path.join(getAiImageTemp(), segment(params.chatDataStoreKey))
  const sessions = params.sessionID?.filter(Boolean) ?? []
  const targets = sessions.length
    ? sessions.map((id) => path.join(root, segment(id)))
    : (
        await fs.readdir(root).catch((error: NodeJS.ErrnoException) => {
          if (error.code === 'ENOENT') return []
          throw error
        })
      ).map((name) => path.join(root, name))
  const errors: unknown[] = []
  for (const [index, target] of targets.entries()) {
    checkAbort(signal)
    try {
      await fs.rm(target, { recursive: true, force: true })
    } catch (error) {
      errors.push(error)
    }
    progress(Math.round(((index + 1) / targets.length) * 100))
  }
  checkAbort(signal)
  if (!sessions.length && !errors.length) await fs.rm(root, { recursive: true, force: true })
  if (errors.length === 1) throw errors[0]
  if (errors.length)
    throw Object.assign(
      new AggregateError(
        errors,
        errors.map((error) => (error instanceof Error ? error.message : String(error))).join('\n'),
      ),
      { code: 'PARTIAL_DELETE' },
    )
  progress(100)
  return true
}

export function registerAIServices() {
  registerMainMethod('save-ai-image', (params, context) => saveAIImage(params, context.signal, context.progress))
  registerMainMethod('delete-ai-image', (params, context) => deleteAIImages(params, context.signal, context.progress))
}

export const exportAIForgeStream = (getClient: () => YakClient): StreamFactory => ({
  requestStream: false,
  responseStream: true,
  pauseable: true,
  create(params) {
    FS.mkdirSync(getYakProjects(), { recursive: true })
    if (!params || typeof params !== 'object' || Array.isArray(params)) throw new Error('Invalid forge export request')
    return getClient().ExportAIForge(params)
  },
})
