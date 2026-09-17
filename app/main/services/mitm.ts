import { EventEmitter } from 'node:events'
import type { GrpcClient } from '../ipc/grpc'
import type { GrpcStream, StreamFactory } from '../ipc/streams'
import type { GrpcInput, GrpcOutput } from '../../shared/communication/protocol'
import { createMessageSender } from './mitmSender'
import { createMITMV2ReplacementUploadController, type ReplacementParams } from './mitmV2LargeRequestUpload'

export class MITMV2Session extends EventEmitter implements GrpcStream {
  private readonly backend: ReturnType<GrpcClient['MITMV2']>
  private readonly sender: ReturnType<typeof createMessageSender>
  private readonly uploads: ReturnType<typeof createMITMV2ReplacementUploadController>
  private closed = false

  constructor(getClient: () => GrpcClient) {
    super()
    this.backend = getClient().MITMV2()
    this.sender = createMessageSender(this.backend)
    this.uploads = createMITMV2ReplacementUploadController({
      isStreamRunning: () => !this.closed,
      getSendMessageAndWait: () => (this.closed ? undefined : this.sender.sendAndWait),
    })
    this.backend.on('data', (data) => {
      if (!this.closed) this.emit('data', data)
    })
    this.backend.on('error', (error) => {
      if (!this.closed) {
        this.emit('error', error)
        this.cancel()
      }
    })
    this.backend.on('end', () => {
      if (!this.closed) {
        this.emit('end')
        this.cancel()
      }
    })
  }

  write(data: GrpcInput<'MITMV2'>, callback: (error?: Error | null) => void) {
    const work = async () => {
      // 所有普通劫持操作都要等待替换文件的 EOF，不能提前放行半个文件。
      if (data.ManualHijackControl && !data.ManualHijackMessage?.IsLargeRequestFileChunk)
        await this.uploads.waitForIdle()
      await this.sender.sendAndWait(data)
    }
    void work().then(() => callback(), callback)
    return true
  }

  upload(params: ReplacementParams, signal: AbortSignal) {
    return this.uploads.replace(params, signal)
  }
  end() {
    this.backend.end()
  }
  cancel() {
    if (this.closed) return
    this.closed = true
    this.sender.destroy()
  }
}

export function mitmStream(getClient: () => GrpcClient): StreamFactory {
  return {
    requestStream: true,
    responseStream: true,
    pauseable: false,
    persistent: true,
    isControl(data) {
      return !(data as GrpcOutput<'MITM'>).haveMessage
    },
    create() {
      return getClient().MITM()
    },
  }
}

export function mitmV2Stream(getClient: () => GrpcClient): StreamFactory {
  return {
    requestStream: true,
    responseStream: true,
    pauseable: false,
    persistent: true,
    isControl(data) {
      return !(data as GrpcOutput<'MITMV2'>).HaveMessage
    },
    snapshotKey(value) {
      const data = value as GrpcOutput<'MITMV2'>
      // 只有纯统计帧可合并，混有劫持、通知或业务输出的帧必须完整交付。
      if (
        data.PipelineStats &&
        !data.ManualHijackListAction &&
        !data.ManualHijackList.length &&
        !data.HaveMessage &&
        !data.HaveNotification &&
        !data.HaveLoadingSetter &&
        !data.GetCurrentHook &&
        !data.JustFilter &&
        !data.JustContentReplacer &&
        !data.Replacers.length
      )
        return 'pipeline'
    },
    create() {
      return new MITMV2Session(getClient)
    },
  }
}
