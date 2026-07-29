import { SystemInfo } from '@/constants/hardware'
import { yakitNotify } from '@/utils/notification'
import { randomString } from '@/utils/randomUtil'
import { useEffect, useState } from 'react'
import { yakitMcp, yakitStream } from '@/services/electronBridge'
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

export interface StartMcpServerResponse {
  Status: 'starting' | 'configured' | 'running' | 'heartbeat' | 'stopped' | 'error'
  Message: string
  ServerUrl: string
}

export const remoteMcpDefalutUrl = '0.0.0.0:11432'
export const localMcpDefalutUrl = '127.0.0.1:11432'

interface useMcpHooks {}
export default function useMcpStream(props: useMcpHooks) {
  const { t } = useI18nNamespaces(['layout'])
  const [mcpToken, setMcpToken] = useState<string>(randomString(40))
  const [mcpCurrent, setMcpCurrent] = useState<StartMcpServerResponse | undefined>(undefined)
  const [mcpServerUrl, setMcpServerUrl] = useState<string>('')
  const [mcpUrl, setMcpUrl] = useState<string>(localMcpDefalutUrl)

  useEffect(() => {
    setMcpUrl(SystemInfo.mode === 'remote' ? remoteMcpDefalutUrl : localMcpDefalutUrl)
  }, [SystemInfo.mode])

  useEffect(() => {
    const offData = yakitStream.onData(mcpToken, async (data: StartMcpServerResponse) => {
      setMcpCurrent(data)
      // 后端只在running状态返回地址，此处单独存
      if (data.Status === 'running' && data.ServerUrl) {
        setMcpServerUrl(data.ServerUrl)
        yakitNotify('success', t('McpHook.started', { serverUrl: data.ServerUrl }))
      } else if (data.Status === 'error') {
        yakitNotify('error', t('McpHook.error', { message: data.Message }))
      } else if (data.Status === 'stopped') {
        yakitNotify('info', t('McpHook.stopped', { message: data.Message }))
      }
    })

    const offError = yakitStream.onError(mcpToken, (error) => {
      setMcpServerUrl('')
      setMcpCurrent({ Status: 'error', Message: error + '', ServerUrl: '' })
      yakitNotify('success', t('McpHook.MCPStopped'))
    })

    const offEnd = yakitStream.onEnd(mcpToken, () => {
      setMcpServerUrl('')
      setMcpCurrent({ Status: 'stopped', Message: t('McpHook.serviceStopped'), ServerUrl: '' })
      yakitNotify('info', `[StartMcpServer] finished`)
    })
    return () => {
      if (mcpToken) {
        yakitStream.cancel('StartMcpServer', mcpToken)
        offData()
        offError()
        offEnd()
        setMcpCurrent(undefined)
        setMcpServerUrl('')
      }
    }
  }, [mcpToken])

  const onStart = (options: StartMcpServerOptions) => {
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

    const token = randomString(40)
    setMcpToken(token)
    yakitMcp.startServer(params, token).catch((err) => {
      yakitNotify('error', t('McpHook.enableFailed', { error: err + '' }))
    })
  }

  const onCancel = () => {
    yakitStream.cancel('StartMcpServer', mcpToken)
  }

  const onSetMcpUrl = (url: string) => {
    setMcpUrl(url)
  }

  return [
    { mcpCurrent, mcpServerUrl, mcpUrl },
    { onStart, onCancel, onSetMcpUrl },
  ] as const
}
