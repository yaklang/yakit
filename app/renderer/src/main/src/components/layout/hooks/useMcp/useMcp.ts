import { SystemInfo } from '@/constants/hardware'
import { yakitNotify } from '@/utils/notification'
import { randomString } from '@/utils/randomUtil'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { ipc, type GrpcOutput } from '@/services/ipc'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

export interface mcpStreamHooks {
  mcpStreamInfo: {
    mcpUrl: string
    mcpCurrent: StartMcpServerResponse | undefined
    mcpServerUrl: string
  }
  mcpStreamEvent: {
    onCancel: () => void
    onStart: (options: StartMcpServerOptions) => void
    onSetMcpUrl: (url: string) => void
  }
}

export interface StartMcpServerOptions {
  /** Legacy MCP toolsets (port_scan, httpflow, etc.) */
  EnableAll?: boolean
  /** AITool-framework builtin tools (fs, ssa, yakscript, etc.) */
  EnableAIToolFramework?: boolean
  /** Bridge external MCP servers enabled in AI Agent */
  EnableBridgeExternalMCP?: boolean
}

interface StartMcpServerRequest {
  Host: string
  Port: number
  Tool?: string[]
  DisableTool?: string[]
  Resource?: string[]
  DisableResource?: string[]
  Script?: string[]
  EnableAll: boolean
  EnableAIToolFramework?: boolean
  EnableBridgeExternalMCP?: boolean
}

export type StartMcpServerResponse = GrpcOutput<'StartMcpServer'>

export const remoteMcpDefalutUrl = '0.0.0.0:11432'
export const localMcpDefalutUrl = '127.0.0.1:11432'

interface useMcpHooks {}
export default function useMcpStream(props: useMcpHooks) {
  const { t } = useI18nNamespaces(['layout'])
  // MCP gRPC stream token，仅驱动订阅/取消，不暴露 UI，用 ref 避免无效重渲染
  const mcpTokenRef = useRef<string>(randomString(40))
  const controllerRef = useRef<AbortController>()
  const [mcpCurrent, setMcpCurrent] = useState<StartMcpServerResponse | undefined>(undefined)
  const [mcpServerUrl, setMcpServerUrl] = useState<string>('')
  const [mcpUrl, setMcpUrl] = useState<string>(localMcpDefalutUrl)

  useEffect(() => {
    setMcpUrl(SystemInfo.mode === 'remote' ? remoteMcpDefalutUrl : localMcpDefalutUrl)
  }, [SystemInfo.mode])

  const handEnd = useMemoizedFn(() => {
    setMcpServerUrl('')
    setMcpCurrent({ Status: 'stopped', Message: t('McpHook.serviceStopped'), ServerUrl: '', StreamableHttpUrl: '' })
    yakitNotify('info', `[StartMcpServer] finished`)
  })

  const onData = useMemoizedFn((data: StartMcpServerResponse) => {
    setMcpCurrent(data)
    if (data.Status === 'running' && data.ServerUrl) {
      setMcpServerUrl(data.ServerUrl)
      yakitNotify('success', t('McpHook.started', { serverUrl: data.ServerUrl }))
    } else if (data.Status === 'error') {
      setMcpServerUrl('')
      yakitNotify('error', t('McpHook.error', { message: data.Message }))
    } else if (data.Status === 'stopped') {
      setMcpServerUrl('')
      yakitNotify('info', t('McpHook.stopped', { message: data.Message }))
    }
  })
  useEffect(() => () => controllerRef.current?.abort(), [])

  const onStart = useMemoizedFn((options: StartMcpServerOptions) => {
    if (mcpUrl.trim() === '') {
      yakitNotify('error', t('McpHook.urlRequired'))
      return
    }
    // 校验 host:port 格式
    const match = mcpUrl.match(/^([a-zA-Z0-9.\-]+):(\d{1,5})$/)
    if (!match) {
      yakitNotify('error', t('McpHook.urlFormatError'))
      return
    }
    const host = match[1]
    const port = parseInt(match[2], 10)
    if (port < 1 || port > 65535) {
      yakitNotify('error', t('McpHook.portRangeError'))
      return
    }

    const params: StartMcpServerRequest = {
      Host: host,
      Port: port,
      EnableAll: !!options?.EnableAll,
      EnableAIToolFramework: !!options?.EnableAIToolFramework,
      EnableBridgeExternalMCP: !!options?.EnableBridgeExternalMCP,
    }

    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const token = randomString(40)
    mcpTokenRef.current = token
    setMcpServerUrl('')
    const onError = (error: unknown) => {
      if (controller.signal.aborted) return
      setMcpServerUrl('')
      setMcpCurrent({ Status: 'error', Message: String(error), ServerUrl: '', StreamableHttpUrl: '' })
      yakitNotify('error', t('McpHook.enableFailed', { error: String(error) }))
    }
    void ipc
      .openStream('grpc', 'StartMcpServer', params, {
        token,
        signal: controller.signal,
        onData(data) {
          if (!controller.signal.aborted) onData(data)
        },
        onError,
        onEnd() {
          if (!controller.signal.aborted) handEnd()
        },
      })
      .catch(onError)
  })
  const onCancel = useMemoizedFn(() => {
    controllerRef.current?.abort()
    handEnd()
  })

  const onSetMcpUrl = useMemoizedFn((url: string) => {
    setMcpUrl(url)
  })

  const mcpStreamInfo = useMemo(() => ({ mcpCurrent, mcpServerUrl, mcpUrl }), [mcpCurrent, mcpServerUrl, mcpUrl])

  // 稳定引用，避免 useSyncYakMcpStream 因对象重建触发无效 store 同步
  const mcpStreamEvent = useMemo(() => ({ onStart, onCancel, onSetMcpUrl }), [onStart, onCancel, onSetMcpUrl])

  return [mcpStreamInfo, mcpStreamEvent] as const
}
