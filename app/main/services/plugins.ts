import fs from 'node:fs/promises'
import { callGrpc, type GrpcClient } from '../ipc/grpc'
import type { StreamFactory } from '../ipc/streams'
import type { GrpcInput } from '../../shared/communication/protocol'
import { USER_INFO } from '../state'

export function downloadPlugin<
  A extends 'DownloadOnlinePluginById' | 'DownloadOnlinePluginBatch' | 'DownloadOnlinePluginByPluginName',
>(getClient: () => GrpcClient, api: A, params: GrpcInput<A>, signal: AbortSignal) {
  return callGrpc(getClient, api, { ...params, Token: USER_INFO.token || '' }, signal)
}

/** 上传和下载使用主进程当前登录凭据。 */
export function pluginUploadStream(getClient: () => GrpcClient): StreamFactory {
  return {
    requestStream: false,
    responseStream: true,
    pauseable: true,
    create(params) {
      return getClient().SaveYakScriptToOnline({
        ...(params as GrpcInput<'SaveYakScriptToOnline'>),
        Token: USER_INFO.token || '',
      })
    },
  }
}
export function pluginDownloadStream(getClient: () => GrpcClient): StreamFactory {
  return {
    requestStream: false,
    responseStream: true,
    pauseable: true,
    create(params) {
      return getClient().DownloadOnlinePlugins({
        ...(params as GrpcInput<'DownloadOnlinePlugins'>),
        Token: USER_INFO.token || '',
      })
    },
  }
}
export function pluginImportStream(getClient: () => GrpcClient): StreamFactory {
  return {
    requestStream: false,
    responseStream: true,
    pauseable: true,
    async prepare(input, signal) {
      const params = input as GrpcInput<'ImportYakScriptStream'>
      if (!params?.Filename) throw new Error('Filename is required')
      return { ...params, Data: await fs.readFile(params.Filename, { signal }) }
    },
    create(params) {
      return getClient().ImportYakScriptStream(params as GrpcInput<'ImportYakScriptStream'>)
    },
  }
}
