import {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  type WebContents,
  type IpcMainInvokeEvent,
  type IpcMainEvent,
} from 'electron'
import { randomUUID } from 'node:crypto'
import os from 'node:os'
import isDev from 'electron-is-dev'
import { fileURLToPath } from 'node:url'
import {
  REQUEST_CHANNEL,
  EVENT_CHANNEL,
  type GrpcApi,
  type GrpcInput,
  type ProgressOf,
} from '../../shared/communication/protocol'
import { serializeError } from '../../shared/communication/errors'
import { callGrpc, createGrpcMethods, type GrpcClient } from './grpc'
import { Router, type InvocationContext } from './router'
import type { LocalMethods } from '../../shared/communication/local-methods'
import { mainGrpcMethods, linkGrpcMethods } from './methods'
import { rendererPath, resourcePath } from '../paths'
import { sendEvent } from './events'

type Owner = { contents: WebContents; session: string; role: 'main' | 'link' | 'screenshots' }
const owners = new Map<number, Owner>()
const sessions = new Map<string, Owner>()
const localMethodRoles = new Map<keyof LocalMethods, ReadonlySet<Owner['role']>>()
let router: Router | undefined
let attachRenderer: ((contents: WebContents, role: Owner['role']) => void) | undefined
function senderOwner(event: IpcMainInvokeEvent | IpcMainEvent) {
  const owner = owners.get(event.sender.id)
  if (!owner || event.senderFrame !== event.sender.mainFrame || !sessions.has(owner.session))
    throw new Error('Unregistered renderer session')
  const url = new URL(event.senderFrame.url)
  const isDev =
    !app.isPackaged &&
    url.protocol === 'http:' &&
    ['127.0.0.1', 'localhost'].includes(url.hostname) &&
    url.port === (owner.role === 'link' ? '5173' : '3000')
  const file = url.protocol === 'file:' ? fileURLToPath(url) : ''
  const allowedFiles =
    owner.role === 'screenshots'
      ? [rendererPath('screenshots')]
      : owner.role === 'link'
        ? [rendererPath('link')]
        : [rendererPath('main'), rendererPath('aux'), resourcePath('child-window', 'index.html')]
  if (!isDev && !allowedFiles.includes(file)) throw new Error('Untrusted renderer URL')
  return owner
}

export function registerRenderer(contents: WebContents, role: Owner['role']) {
  if (!attachRenderer) throw new Error('Communication must be installed before creating windows')
  attachRenderer(contents, role)
}

export function registerMainMethod<Api extends keyof LocalMethods>(
  api: Api,
  handler: (
    params: LocalMethods[Api]['request'],
    context: Omit<InvocationContext, 'progress'> & { progress(data: ProgressOf<LocalMethods[Api]>): void },
  ) => LocalMethods[Api]['response'] | Promise<LocalMethods[Api]['response']>,
  roles: readonly Owner['role'][] = ['main'],
) {
  if (!router) throw new Error('Communication must be installed before registering business methods')
  router.registerLocal(api, (params, context) => handler(params as LocalMethods[Api]['request'], context))
  localMethodRoles.set(api, new Set(roles))
}

export function invocationRole(context: Pick<InvocationContext, 'owner'>) {
  const role = sessions.get(context.owner)?.role
  if (!role) throw new Error('The invoking page is no longer available')
  return role
}

export function invocationWindow(context: Pick<InvocationContext, 'owner'>) {
  const contents = sessions.get(context.owner)?.contents
  const win = contents && BrowserWindow.fromWebContents(contents)
  if (!win || win.isDestroyed()) throw new Error('The invoking window is no longer available')
  return win
}

export function installCommunication(getClient: () => GrpcClient, log: (error: unknown) => void) {
  if (router) return router
  const methods = createGrpcMethods(getClient)
  const current = new Router(
    methods,
    (owner, namespace, api) => {
      const session = sessions.get(owner)
      if (!session) return false
      if (namespace === 'local')
        return (
          localMethodRoles.get(api as keyof LocalMethods)?.has(session.role) ||
          (session.role !== 'screenshots' &&
            ['fetch-system-name', 'fetch-cpu-arch', 'fetch-system-and-arch', 'is-dev'].includes(api))
        )
      return (
        session.role !== 'screenshots' &&
        (session.role === 'main' ? mainGrpcMethods : linkGrpcMethods).has(api as GrpcApi)
      )
    },
    (owner, event) => {
      const session = sessions.get(owner)
      if (session && !session.contents.isDestroyed()) session.contents.send(EVENT_CHANNEL, event)
    },
    log,
    (owner) => String(sessions.get(owner)?.contents.id ?? owner),
  )
  router = current
  current.registerLocal('fetch-system-name', () => os.type())
  current.registerLocal('fetch-cpu-arch', () => process.arch)
  current.registerLocal('fetch-system-and-arch', () => `${process.platform}-${process.arch}`)
  current.registerLocal('is-dev', () => isDev)
  const desktop: typeof import('../services/desktop') = require('../services/desktop')
  desktop.registerDesktopServices()
  const hardware: typeof import('../services/hardware') = require('../services/hardware')
  hardware.registerHardwareServices()
  const network: typeof import('../services/network') = require('../services/network')
  network.registerNetworkServices()
  const fingerprint: typeof import('../services/files') = require('../services/files')
  current.registerStream('ExportFingerprint', fingerprint.exportFingerprintStream(getClient))
  const aiAgent: typeof import('../services/ai') = require('../services/ai')
  current.registerStream('ExportAIForge', aiAgent.exportAIForgeStream(getClient))
  const syntaxFlow: typeof import('../services/syntaxFlow') = require('../services/syntaxFlow')
  current.registerStream('ExportSyntaxFlows', syntaxFlow.exportSyntaxFlowsStream(getClient))
  const plugins: typeof import('../services/plugins') = require('../services/plugins')
  current.registerStream('SaveYakScriptToOnline', plugins.pluginUploadStream(getClient))
  current.registerStream('DownloadOnlinePlugins', plugins.pluginDownloadStream(getClient))
  current.registerStream('ImportYakScriptStream', plugins.pluginImportStream(getClient))
  registerMainMethod('DownloadOnlinePluginById', async (input, context) => {
    const params = input as GrpcInput<'DownloadOnlinePluginById'>
    const data = await plugins.downloadPlugin(getClient, 'DownloadOnlinePluginById', params, context.signal)
    const contents = sessions.get(context.owner)?.contents
    if (contents && !contents.isDestroyed() && params.OnlineID && params.UUID)
      sendEvent(contents, 'ref-plugin-operator', { pluginOnlineId: params.OnlineID, pluginUUID: params.UUID })
    return data
  })
  registerMainMethod('DownloadOnlinePluginBatch', (params, context) =>
    plugins.downloadPlugin(
      getClient,
      'DownloadOnlinePluginBatch',
      params as GrpcInput<'DownloadOnlinePluginBatch'>,
      context.signal,
    ),
  )
  registerMainMethod('DownloadOnlinePluginByPluginName', (params, context) =>
    plugins.downloadPlugin(
      getClient,
      'DownloadOnlinePluginByPluginName',
      params as GrpcInput<'DownloadOnlinePluginByPluginName'>,
      context.signal,
    ),
  )
  registerMainMethod('ExportAILogs', async (params, context) => {
    const data = await callGrpc(getClient, 'ExportAILogs', params as GrpcInput<'ExportAILogs'>, context.signal)
    if (data.FilePath && !context.signal.aborted) shell.showItemInFolder(data.FilePath)
    return data
  })
  const upload: typeof import('../services/uploadToTemporaryFile') = require('../services/uploadToTemporaryFile')
  registerMainMethod('UploadLocalFileToEngine', (input, context) =>
    upload.uploadLocalFileToEngine(
      getClient,
      (input as { FilePath: string }).FilePath,
      undefined,
      undefined,
      context.signal,
    ),
  )
  const httpFlows: typeof import('../services/httpFlows') = require('../services/httpFlows')
  registerMainMethod('QueryHTTPFlowsWithTiming', (params, context) =>
    httpFlows.queryHTTPFlowsWithTiming(getClient, params as GrpcInput<'QueryHTTPFlows'>, context.signal),
  )
  registerMainMethod('SaveHTTPFlowBody', (params, context) =>
    httpFlows.saveHTTPFlowBody(getClient, params as GrpcInput<'GetHTTPFlowBodyById'>, context.signal),
  )
  const mitm: typeof import('../services/mitm') = require('../services/mitm')
  current.registerStream('MITM', mitm.mitmStream(getClient))
  current.registerStream('MITMV2', mitm.mitmV2Stream(getClient))
  registerMainMethod('GetMITMSession', (input, context) => {
    const { api } = input as LocalMethods['GetMITMSession']['request']
    if (api !== 'MITM' && api !== 'MITMV2') throw new Error('Invalid MITM API')
    const params = current.streams.persistentParams(context.owner, api)
    if (!params) return { haveStream: false, host: '', port: 0, downstreamProxy: '' }
    if (api === 'MITM') {
      const value = params as GrpcInput<'MITM'>
      return {
        haveStream: true,
        host: value.host || '',
        port: value.port || 0,
        downstreamProxy: value.downstreamProxy || '',
      }
    }
    const value = params as GrpcInput<'MITMV2'>
    return {
      haveStream: true,
      host: value.Host || '',
      port: value.Port || 0,
      downstreamProxy: value.DownstreamProxy || '',
      downstreamProxyRuleId: value.DownstreamProxyRuleId || '',
    }
  })
  registerMainMethod('ReplaceMITMRequestFile', (input, context) => {
    const params = input as LocalMethods['ReplaceMITMRequestFile']['request']
    return current.streams.withStream(
      context.owner,
      { namespace: 'grpc', api: 'MITMV2', token: params.token, instanceId: params.instanceId },
      (stream) => {
        if (!(stream instanceof mitm.MITMV2Session)) throw new Error('Invalid MITM session')
        return stream.upload(params, context.signal)
      },
    )
  })
  current.registerStream('StartAIReAct', {
    ...methods.stream('StartAIReAct'),
    async initialize(params, write) {
      await write(params)
      await write({ IsSyncMessage: true, SyncType: 'ping' })
    },
  })
  // DuplexConnection 流创建后挂载 Yakit 页面水印截图（master 的 yakitScreenshot 功能迁移）。
  const { attachYakitScreenshot } = require('../yakitScreenshot') as typeof import('../yakitScreenshot')
  current.registerStream('DuplexConnection', {
    ...methods.stream('DuplexConnection'),
    onStream(owner, stream) {
      try {
        attachYakitScreenshot(invocationWindow({ owner }), stream as Parameters<typeof attachYakitScreenshot>[1])
      } catch {
        // 发起窗口已销毁时静默跳过，流仍可正常工作。
      }
    },
  })
  attachRenderer = (contents: WebContents, role: Owner['role']) => {
    if (owners.has(contents.id)) return
    const owner: Owner = { contents, session: randomUUID(), role }
    owners.set(contents.id, owner)
    sessions.set(owner.session, owner)
    const close = (preserveMITM = false) => {
      current.closeOwner(owner.session, preserveMITM)
      sessions.delete(owner.session)
    }
    contents.on('did-start-navigation', (_event, _url, isInPlace, isMainFrame) => {
      if (!isMainFrame || isInPlace) return
      close(true)
      owner.session = randomUUID()
      sessions.set(owner.session, owner)
    })
    contents.on('render-process-gone', () => close(true))
    contents.once('destroyed', () => {
      close()
      current.streams.cancelGroup(String(contents.id))
      owners.delete(contents.id)
    })
  }
  ipcMain.handle(REQUEST_CHANNEL, async (event, input: unknown) => {
    try {
      const owner = senderOwner(event)
      return await current.handle(owner.session, input, event)
    } catch (error) {
      log(error)
      return { ok: false, error: serializeError(error, 'ipc', '', '') }
    }
  })
  return current
}

export function engineChanged() {
  router?.engineChanged()
}
