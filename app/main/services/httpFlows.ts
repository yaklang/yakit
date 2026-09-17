import { callGrpc, type GrpcClient } from '../ipc/grpc'
import type { GrpcInput } from '../../shared/communication/protocol'
import type { GetHTTPFlowBodyByIdResponse__Output } from '../../shared/generated/grpc/types'
import { shell } from 'electron'
import fs from 'node:fs'
import type { FileHandle } from 'node:fs/promises'
import { handleSaveFileSystem } from './fileDialog'

export async function queryHTTPFlowsWithTiming(
  getClient: () => GrpcClient,
  params: GrpcInput<'QueryHTTPFlows'>,
  signal: AbortSignal,
) {
  const received = Date.now()
  const started = process.hrtime.bigint()
  const data = await callGrpc(getClient, 'QueryHTTPFlows', params, signal)
  return {
    ...data,
    YakitMainProcessTiming: {
      MainReceivedAtUnixMs: received,
      GRPCStartedAtUnixMs: received,
      GRPCFinishedAtUnixMs: Date.now(),
      GRPCElapsedUs: Number((process.hrtime.bigint() - started) / 1000n),
    },
  }
}

export async function saveHTTPFlowBody(
  getClient: () => GrpcClient,
  params: GrpcInput<'GetHTTPFlowBodyById'>,
  signal: AbortSignal,
) {
  if (signal.aborted) throw new Error('Operation aborted')
  const query = params
  const stream = getClient().GetHTTPFlowBodyById(query)
  let output: FileHandle | undefined
  let filePath: string | undefined
  let receivedEOF = false
  const cancel = () => stream.cancel()
  signal.addEventListener('abort', cancel, { once: true })
  try {
    // Async iteration keeps read buffering bounded while the save dialog or disk write is pending.
    for await (const value of stream) {
      const chunk: GetHTTPFlowBodyByIdResponse__Output = value
      if (!output) {
        if (!chunk.Filename) throw new Error('HTTP body stream did not provide a filename')
        const selection = await handleSaveFileSystem({ defaultPath: chunk.Filename })
        if (selection.canceled || !selection.filePath || signal.aborted) return false
        filePath = selection.filePath
        output = await fs.promises.open(filePath, 'w')
      }
      if (chunk.Data.length) await output.writeFile(chunk.Data)
      if (chunk.EOF) {
        receivedEOF = true
        break
      }
    }
    if (!receivedEOF || !filePath) throw new Error('HTTP body stream ended before EOF')
    await output?.close()
    output = undefined
    shell.showItemInFolder(filePath)
    return true
  } finally {
    signal.removeEventListener('abort', cancel)
    stream.cancel()
    await output?.close()
  }
}
