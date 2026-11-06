import { useEffect, useMemo, useRef, useState } from 'react'
import { Tooltip } from 'antd'
import { useDebounceFn, useMemoizedFn, useUpdateEffect } from 'ahooks'
import classNames from 'classnames'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { YakitSegmented } from '@/components/yakitUI/YakitSegmented/YakitSegmented'
import { CopyComponents, YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { TableVirtualResize } from '@/components/TableVirtualResize/TableVirtualResize'
import type { ColumnsTypeProps } from '@/components/TableVirtualResize/TableVirtualResizeType'
import { QuestionMarkCircleOutlined, RefreshOutlined, SearchOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { SystemInfo } from '@/constants/hardware'
import { RemoteAIAgentGV } from '@/enums/aiAgent'
import { useYakMcpStream } from '@/store/yakMcpStream'
import {
  defaultMcpStartConfig,
  localMcpDefalutUrl,
  parseMcpStartConfig,
  type YakMCPStartConfig,
} from '@/components/layout/hooks/useMcp/useMcp'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { AIMCPToolDetailPopover } from './AIMCPToolDetailPopover'
import {
  type GetMCPToolListRequest,
  isMCPTierActive,
  type MCPTierVisibility,
  type MCPToolConfig,
  type MCPToolSource,
  resolveMCPToolListSourceFilter,
} from '@/pages/ai-agent/type/aiMCP'
import { genDefaultPagination } from '@/pages/invoker/schema'
import { grpcGetMCPToolList, grpcSetMCPToolEnabled, resolveMCPToolDescriptionLabel } from '@/pages/ai-agent/aiMCP/utils'
import useAINodeLabel from '@/pages/ai-re-act/hooks/useAINodeLabel'
import { yakitNotify } from '@/utils/notification'
import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { SettingsSections } from '../../constants'
import styles from './YakMcpSettings.module.scss'

const TRANSPORT_OPTIONS = [
  { value: 'sse', label: 'SSE' },
  { value: 'mcp', label: 'Streamable HTTP' },
  { value: 'stdio', label: 'STDIO' },
]
type Transport = (typeof TRANSPORT_OPTIONS)[number]['value']

const { ipcRenderer } = window.require('electron')

export const YakMcpSettings: React.FC = () => {
  const { t, i18nRefresh } = useI18nNamespaces(['setting', 'utils', 'yakitUi'])
  const { getLabelByParams } = useAINodeLabel()
  const { mcpStreamInfo, mcpStreamEvent } = useYakMcpStream()

  const enableMcp = useMemo(() => {
    if (!mcpStreamInfo.mcpCurrent) return false
    if (['stopped', 'error'].includes(mcpStreamInfo.mcpCurrent.Status)) return false
    if (!mcpStreamInfo.mcpServerUrl) return false
    return true
  }, [mcpStreamInfo])

  const isRemoteEngine = SystemInfo.mode === 'remote'
  const [transport, setTransport] = useState<Transport>('sse')
  const [enginePath, setEnginePath] = useState('')

  useEffect(() => {
    if (isRemoteEngine && transport === 'stdio') setTransport('sse')
  }, [isRemoteEngine, transport])

  const transportOptions = useMemo(() => {
    return TRANSPORT_OPTIONS.map((item) => {
      if (item.value !== 'stdio' || !isRemoteEngine) return item
      return {
        ...item,
        disabled: true,
        label: <Tooltip title={t('ConfigSystemMcp.stdio_remote_disabled_tip')}>{item.label}</Tooltip>,
      }
    })
  }, [isRemoteEngine, i18nRefresh])

  useEffect(() => {
    ipcRenderer
      .invoke('fetch-local-engine-path')
      .then((path) => setEnginePath(path))
      .catch(() => setEnginePath(''))
  }, [])

  // 缓存加载完成前阻止 effect 以默认 state 覆盖用户配置
  const configLoadedRef = useRef(false)
  const [configLoaded, setConfigLoaded] = useState(false)

  useEffect(() => {
    getRemoteValue(RemoteAIAgentGV.YakMCPStartConfig)
      .then((raw) => {
        const config = parseMcpStartConfig(raw)
        const merged = config ? { ...defaultMcpStartConfig, ...config } : defaultMcpStartConfig
        setEnableLegacyMcpTools(merged.enableLegacyMcpTools)
        setEnableAIToolFramework(merged.enableAIToolFramework)
        setEnableBridgeExternalMcp(merged.enableBridgeExternalMcp)
        setAutoStartMcp(merged.autoStart)
        tierVisibilityRef.current = merged
        configLoadedRef.current = true
        setConfigLoaded(true)
      })
      .catch(() => setConfigLoaded(true))
  }, [])

  const sseJson = useMemo(
    () => JSON.stringify({ mcpServers: { yakit: { type: 'sse', url: mcpStreamInfo.mcpServerUrl } } }, null, 2),
    [mcpStreamInfo.mcpServerUrl],
  )
  const mcpJson = useMemo(() => {
    const mcpUrl = mcpStreamInfo.mcpServerUrl?.replace(/\/sse$/, '/mcp') ?? ''
    return JSON.stringify({ mcpServers: { yakit: { type: 'streamable-http', url: mcpUrl } } }, null, 2)
  }, [mcpStreamInfo.mcpServerUrl])
  const stdioJson = useMemo(
    () =>
      JSON.stringify(
        {
          mcpServers: {
            yakit: { type: 'stdio', command: enginePath, args: ['mcp', '--transport', 'stdio'] },
          },
        },
        null,
        2,
      ),
    [enginePath],
  )

  const startAddress = useMemo(() => {
    if (transport === 'sse') return mcpStreamInfo.mcpServerUrl
    if (transport === 'mcp') return mcpStreamInfo.mcpServerUrl?.replace(/\/sse$/, '/mcp') ?? ''
    return ''
  }, [transport, mcpStreamInfo.mcpServerUrl])

  const detailJson = transport === 'sse' ? sseJson : transport === 'mcp' ? mcpJson : stdioJson

  const [enableLegacyMcpTools, setEnableLegacyMcpTools] = useState(true)
  const [enableAIToolFramework, setEnableAIToolFramework] = useState(true)
  const [enableBridgeExternalMcp, setEnableBridgeExternalMcp] = useState(false)
  const [autoStartMcp, setAutoStartMcp] = useState(false)
  const pendingMcpStartConfigRef = useRef<YakMCPStartConfig | null>(null)
  const tierVisibilityRef = useRef<MCPTierVisibility>({
    enableLegacyMcpTools,
    enableAIToolFramework,
    enableBridgeExternalMcp,
  })
  const hasActiveToolTier = useMemo(
    () =>
      isMCPTierActive({
        enableLegacyMcpTools,
        enableAIToolFramework,
        enableBridgeExternalMcp,
      }),
    [enableLegacyMcpTools, enableAIToolFramework, enableBridgeExternalMcp],
  )

  const canToggleMcp = useMemo(
    () => !!mcpStreamInfo.mcpUrl?.trim() && (enableMcp || hasActiveToolTier),
    [mcpStreamInfo.mcpUrl, enableMcp, hasActiveToolTier],
  )

  // 当主启用/自启动开关被禁用时，强制关闭自启动并同步缓存
  useEffect(() => {
    if (!canToggleMcp && autoStartMcp) {
      setAutoStartMcp(false)
      saveMcpStartConfig({ autoStart: false })
    }
  }, [canToggleMcp])

  // 启动地址变更时同步到缓存（远程模式不缓存地址）
  useUpdateEffect(() => {
    saveMcpStartConfig()
  }, [mcpStreamInfo.mcpUrl])

  const [isRefresh, setIsRefresh] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [sourceFilter, setSourceFilter] = useState<MCPToolSource | ''>('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [tools, setTools] = useState<MCPToolConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [forceSyncLoading, setForceSyncLoading] = useState(false)
  const forceSyncNextRef = useRef(false)
  const requestIdRef = useRef(0)
  const mutationRef = useRef(false)
  const [updatingTool, setUpdatingTool] = useState('')
  const [batchProgress, setBatchProgress] = useState<{ completed: number; total: number } | null>(null)
  const busy = loading || forceSyncLoading || !!updatingTool || !!batchProgress

  // Search the full catalog, including the bilingual descriptions returned as live metadata.
  // Filtering only an API page would miss Chinese keywords and limit batch actions to loaded rows.
  const filteredTools = useMemo(() => {
    const search = keyword.trim().toLowerCase()
    return tools.filter((tool) => {
      if (sourceFilter && tool.Source !== sourceFilter) return false
      if (statusFilter === 'enabled' && !tool.Enable) return false
      if (statusFilter === 'disabled' && tool.Enable) return false
      return (
        !search ||
        [tool.ToolName, tool.Description, tool.DescriptionI18n?.Zh, tool.DescriptionI18n?.En, tool.ServerName].some(
          (text) => text?.toLowerCase().includes(search),
        )
      )
    })
  }, [tools, keyword, sourceFilter, statusFilter])
  const enabledCount = filteredTools.filter((tool) => tool.Enable).length
  const hasFilters = !!keyword || !!sourceFilter || statusFilter !== 'all'

  useUpdateEffect(() => {
    setIsRefresh((prev) => !prev)
  }, [keyword, sourceFilter, statusFilter])

  const clearFilters = useMemoizedFn(() => {
    setKeyword('')
    setSourceFilter('')
    setStatusFilter('all')
  })

  const getSourceLabel = useMemoizedFn((source: MCPToolSource) => {
    switch (source) {
      case 'builtin':
        return t('ConfigSystemMcp.source_legacy')
      case 'aitool':
        return t('ConfigSystemMcp.source_aitool')
      case 'bridge':
        return t('ConfigSystemMcp.source_bridge')
      default:
        return source
    }
  })

  const resolveToolDescription = useMemoizedFn((record: MCPToolConfig) =>
    resolveMCPToolDescriptionLabel(record, getLabelByParams),
  )

  const sourceFilterOptions = useMemo(
    () => [
      { value: '', label: t('SettingsPage.yakMcp.allSources') },
      ...(enableLegacyMcpTools ? [{ value: 'builtin', label: getSourceLabel('builtin') }] : []),
      ...(enableAIToolFramework ? [{ value: 'aitool', label: getSourceLabel('aitool') }] : []),
      ...(enableBridgeExternalMcp ? [{ value: 'bridge', label: getSourceLabel('bridge') }] : []),
    ],
    [enableLegacyMcpTools, enableAIToolFramework, enableBridgeExternalMcp, i18nRefresh],
  )

  const columns: ColumnsTypeProps[] = useMemo(() => {
    return [
      {
        title: t('ConfigSystemMcp.tool_source'),
        dataKey: 'Source',
        width: 100,
        render: (text: MCPToolSource) => (
          <YakitTag color={text === 'aitool' ? 'purple' : text === 'bridge' ? 'info' : undefined}>
            {getSourceLabel(text)}
          </YakitTag>
        ),
      },
      {
        title: t('ConfigSystemMcp.tool_name'),
        dataKey: 'ToolName',
        width: 220,
        ellipsis: true,
        render: (text, record) => (
          <div className={styles['tool-name']}>
            <Tooltip title={text}>
              <span>{text}</span>
            </Tooltip>
            <YakitPopover
              placement="right"
              content={<AIMCPToolDetailPopover item={record} />}
              styles={{ root: { maxWidth: 440 } }}
            >
              <QuestionMarkCircleOutlined className={styles['help-icon']} color="currentColor" />
            </YakitPopover>
          </div>
        ),
      },
      {
        title: t('ConfigSystemMcp.tool_description'),
        dataKey: 'DescriptionI18n',
        ellipsis: true,
        render: (_text, record: MCPToolConfig) => {
          const description = resolveToolDescription(record)
          if (!description) return '-'
          return (
            <Tooltip title={description} styles={{ root: { maxWidth: 480 } }}>
              <div className={styles['tool-description-cell']}>{description}</div>
            </Tooltip>
          )
        },
      },
      {
        title: t('SettingsPage.yakMcp.enableColumn'),
        dataKey: 'Enable',
        width: 80,
        fixed: 'right',
        render: (text, record) => (
          <YakitSwitch
            checked={text}
            disabled={busy || loadFailed}
            loading={updatingTool === record.ToolName}
            aria-label={record.ToolName}
            onChange={(v) => handleToggle(v, record)}
          />
        ),
      },
    ]
  }, [busy, loadFailed, updatingTool, resolveToolDescription, i18nRefresh])

  const getToolList = useMemoizedFn(async (forceSync = false) => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setForceSyncLoading(forceSync)
    setLoadFailed(false)
    try {
      const catalog = new Map<string, MCPToolConfig>()
      let received = 0
      for (let page = 1; ; page++) {
        const params: GetMCPToolListRequest = {
          Keyword: '',
          Source: resolveMCPToolListSourceFilter(tierVisibilityRef.current).toString(),
          ServerName: '',
          OnlyEnabled: false,
          Pagination: { ...genDefaultPagination(200), Page: page, OrderBy: 'id', Order: 'asc' },
          ForceSync: forceSync && page === 1,
        }
        const res = await grpcGetMCPToolList(params, true)
        if (requestId !== requestIdRef.current) return
        const pageTools = res.Tools || []
        pageTools.forEach((tool) => catalog.set(tool.ToolName, tool))
        received += pageTools.length
        if (received >= res.Total) break
        // An incomplete catalog must never become an actionable batch scope.
        if (!pageTools.length) throw new Error('Incomplete MCP tool catalog')
      }
      setTools([...catalog.values()])
      setIsRefresh((prev) => !prev)
    } catch {
      if (requestId === requestIdRef.current) {
        setTools([])
        setLoadFailed(true)
        yakitNotify('error', t('SettingsPage.yakMcp.loadFailed'))
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
        setForceSyncLoading(false)
      }
    }
  })

  useEffect(() => {
    if (!configLoaded || enableMcp) return
    if (hasActiveToolTier) {
      const forceSync = forceSyncNextRef.current
      forceSyncNextRef.current = false
      getToolList(forceSync)
    }
    return () => {
      requestIdRef.current++
    }
  }, [configLoaded, enableMcp, enableLegacyMcpTools, enableAIToolFramework, enableBridgeExternalMcp])

  const resetAndFetchTools = useMemoizedFn((tiers: MCPTierVisibility, forceSync = false) => {
    tierVisibilityRef.current = tiers
    forceSyncNextRef.current = forceSync
    setSourceFilter('')
    setTools([])
    setLoading(false)
    setForceSyncLoading(false)
    setLoadFailed(false)
  })

  const onLegacyTierChange = useMemoizedFn((checked: boolean) => {
    const tiers = { ...tierVisibilityRef.current, enableLegacyMcpTools: checked }
    setEnableLegacyMcpTools(checked)
    saveMcpStartConfig({ enableLegacyMcpTools: checked })
    resetAndFetchTools(tiers)
  })

  const onAIToolFrameworkChange = useMemoizedFn((checked: boolean) => {
    const tiers = {
      ...tierVisibilityRef.current,
      enableAIToolFramework: checked,
      enableBridgeExternalMcp: checked ? tierVisibilityRef.current.enableBridgeExternalMcp : false,
    }
    setEnableAIToolFramework(checked)
    if (!checked) setEnableBridgeExternalMcp(false)
    saveMcpStartConfig({
      enableAIToolFramework: checked,
      enableBridgeExternalMcp: checked ? tierVisibilityRef.current.enableBridgeExternalMcp : false,
    })
    resetAndFetchTools(tiers)
  })

  const onBridgeTierChange = useMemoizedFn((checked: boolean) => {
    const tiers = { ...tierVisibilityRef.current, enableBridgeExternalMcp: checked }
    setEnableBridgeExternalMcp(checked)
    saveMcpStartConfig({ enableBridgeExternalMcp: checked })
    resetAndFetchTools(tiers, checked)
  })

  const handleToggle = useMemoizedFn(async (checked: boolean, record: MCPToolConfig) => {
    if (busy || mutationRef.current) return
    mutationRef.current = true
    setUpdatingTool(record.ToolName)
    try {
      const result = await grpcSetMCPToolEnabled({ ToolName: record.ToolName, Enable: checked }, true)
      if (!result.Ok) throw new Error(result.Reason)
      setTools((prev) => prev.map((tool) => (tool.ToolName === record.ToolName ? { ...tool, Enable: checked } : tool)))
      yakitNotify(
        'success',
        t(checked ? 'ConfigSystemMcp.enable_tool_success' : 'ConfigSystemMcp.disable_tool_success', {
          name: record.ToolName,
        }),
      )
    } catch {
      yakitNotify(
        'error',
        t(checked ? 'ConfigSystemMcp.enable_tool_failed' : 'ConfigSystemMcp.disable_tool_failed', {
          name: record.ToolName,
        }),
      )
    } finally {
      mutationRef.current = false
      setUpdatingTool('')
    }
  })

  const handleBatchToggle = useMemoizedFn(async (enable: boolean) => {
    if (busy || loadFailed || mutationRef.current) return
    const targets = filteredTools.filter((tool) => tool.Enable !== enable)
    if (!targets.length) return
    mutationRef.current = true
    setBatchProgress({ completed: 0, total: targets.length })
    const succeeded = new Set<string>()
    // Bound IPC concurrency so a large tool group does not flood the engine.
    try {
      for (let offset = 0; offset < targets.length; offset += 5) {
        const group = targets.slice(offset, offset + 5)
        const results = await Promise.allSettled(
          group.map(async (tool) => {
            const result = await grpcSetMCPToolEnabled({ ToolName: tool.ToolName, Enable: enable }, true)
            if (!result.Ok) throw new Error(result.Reason)
            return tool.ToolName
          }),
        )
        results.forEach((result) => {
          if (result.status === 'fulfilled') succeeded.add(result.value)
        })
        setBatchProgress({ completed: Math.min(offset + group.length, targets.length), total: targets.length })
      }
      setTools((prev) => prev.map((tool) => (succeeded.has(tool.ToolName) ? { ...tool, Enable: enable } : tool)))
      const failed = targets.length - succeeded.size
      yakitNotify(
        failed ? 'error' : 'success',
        t('SettingsPage.yakMcp.batchResult', {
          success: succeeded.size,
          failed,
        }),
      )
    } finally {
      mutationRef.current = false
      setBatchProgress(null)
    }
  })

  const flushMcpStartConfig = useMemoizedFn(() => {
    if (!pendingMcpStartConfigRef.current) return
    setRemoteValue(RemoteAIAgentGV.YakMCPStartConfig, JSON.stringify(pendingMcpStartConfigRef.current))
    pendingMcpStartConfigRef.current = null
  })

  const debouncedSaveMcpStartConfig = useDebounceFn(flushMcpStartConfig, { wait: 500 }).run

  const saveMcpStartConfig = useMemoizedFn((override?: Partial<YakMCPStartConfig>) => {
    if (!configLoadedRef.current) return
    pendingMcpStartConfigRef.current = {
      autoStart: autoStartMcp,
      url: isRemoteEngine ? '' : mcpStreamInfo.mcpUrl || localMcpDefalutUrl,
      enableLegacyMcpTools,
      enableAIToolFramework,
      enableBridgeExternalMcp,
      ...override,
    }
    debouncedSaveMcpStartConfig()
  })

  const onToggleEnable = useMemoizedFn((checked: boolean) => {
    if (checked) {
      if (!hasActiveToolTier) return
      mcpStreamEvent.onStart({
        EnableAll: enableLegacyMcpTools,
        EnableAIToolFramework: enableAIToolFramework,
        EnableBridgeExternalMCP: enableBridgeExternalMcp,
      })
    } else {
      mcpStreamEvent.onCancel()
    }
  })

  useEffect(() => {
    if (enableMcp) {
      saveMcpStartConfig()
    }
  }, [enableMcp])

  const onToggleAutoStart = useMemoizedFn((checked: boolean) => {
    setAutoStartMcp(checked)
    saveMcpStartConfig({ autoStart: checked })
  })

  const onOpenHistory = useMemoizedFn(() => {
    emiter.emit('menuOpenPage', JSON.stringify({ route: YakitRoute.MCP_History }))
  })

  return (
    <div className={styles['yak-mcp']}>
      <div className={styles['page-head']}>
        <div className={styles['page-title']}>{t('SettingsPage.item.yak-mcp')}</div>
        <div className={styles['page-actions']}>
          <YakitButton type="text" onClick={onOpenHistory}>
            {t('SettingsPage.yakMcp.openHistory')}
          </YakitButton>
          <div className={styles['divider']} />
          <div className={styles['page-status']}>
            <span>{enableMcp ? t('YakitButton.enabled') : t('YakitButton.notEnabled')}</span>
            <YakitSwitch
              size="large"
              checked={enableMcp}
              disabled={!canToggleMcp || !!updatingTool || !!batchProgress}
              onChange={onToggleEnable}
            />
          </div>
        </div>
      </div>

      {enableMcp ? (
        <div className={styles['transport']}>
          <YakitSegmented
            size="small"
            value={transport}
            options={transportOptions}
            onChange={(v) => {
              const next = v as Transport
              if (next === 'stdio' && isRemoteEngine) return
              setTransport(next)
            }}
          />
          <div className={styles['list-panel']}>
            {startAddress ? (
              <div className={styles['setting-row']}>
                <div className={styles['setting-row-text']}>
                  <div className={styles['setting-row-title']}>{t('ConfigSystemMcp.startAddress')}</div>
                </div>
                <div className={classNames(styles['setting-row-control'], styles['setting-row-control-wide'])}>
                  <div className={styles['copy-addr']}>
                    <span>{startAddress}</span>
                    <CopyComponents copyText={startAddress} />
                  </div>
                </div>
              </div>
            ) : null}
            <div className={classNames(styles['setting-row'], styles['setting-row-top'])}>
              <div className={styles['setting-row-text']}>
                <div className={styles['setting-row-title']}>{t('ConfigSystemMcp.detailed_config')}</div>
              </div>
              <div className={classNames(styles['setting-row-control'], styles['setting-row-control-wide'])}>
                <div className={styles['json-wrap']}>
                  <pre className={styles['json-block']}>{detailJson}</pre>
                  <CopyComponents copyText={detailJson} className={styles['json-copy']} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className={styles['list-panel']}>
            <div className={styles['setting-row']}>
              <div className={styles['setting-row-text']}>
                <div className={styles['setting-row-title']}>{t('ConfigSystemMcp.startAddress')}</div>
              </div>
              <div className={classNames(styles['setting-row-control'], styles['setting-row-control-wide'])}>
                <YakitInput
                  addonBefore="http://"
                  value={mcpStreamInfo.mcpUrl}
                  onChange={(e) => mcpStreamEvent.onSetMcpUrl(e.target.value)}
                />
              </div>
            </div>
            <div className={styles['setting-row']}>
              <div className={styles['setting-row-text']}>
                <div className={styles['setting-row-title']}>{t('ConfigSystemMcp.enable_legacy_mcp_tools')}</div>
                <div className={styles['setting-row-desc']}>{t('ConfigSystemMcp.enable_legacy_mcp_tools_desc')}</div>
              </div>
              <div className={styles['setting-row-control']}>
                <YakitSwitch
                  checked={enableLegacyMcpTools}
                  disabled={!!updatingTool || !!batchProgress}
                  onChange={onLegacyTierChange}
                />
              </div>
            </div>
            <div className={styles['setting-row']}>
              <div className={styles['setting-row-text']}>
                <div className={styles['setting-row-title']}>{t('ConfigSystemMcp.enable_ai_tool_framework')}</div>
                <div className={styles['setting-row-desc']}>{t('ConfigSystemMcp.enable_ai_tool_framework_desc')}</div>
              </div>
              <div className={styles['setting-row-control']}>
                <YakitSwitch
                  checked={enableAIToolFramework}
                  disabled={!!updatingTool || !!batchProgress}
                  onChange={onAIToolFrameworkChange}
                />
              </div>
            </div>
            <div className={styles['setting-row']}>
              <div className={styles['setting-row-text']}>
                <div className={styles['setting-row-title']}>{t('ConfigSystemMcp.enable_bridge_external_mcp')}</div>
                <div className={styles['setting-row-desc']}>{t('ConfigSystemMcp.enable_bridge_external_mcp_desc')}</div>
              </div>
              <div className={styles['setting-row-control']}>
                <YakitSwitch
                  checked={enableBridgeExternalMcp}
                  disabled={!enableAIToolFramework || !!updatingTool || !!batchProgress}
                  onChange={onBridgeTierChange}
                />
              </div>
            </div>
            <div className={styles['setting-row']}>
              <div className={styles['setting-row-text']}>
                <div className={styles['setting-row-title']}>{t('ConfigSystemMcp.auto_start')}</div>
                <div className={styles['setting-row-desc']}>{t('ConfigSystemMcp.auto_start_desc')}</div>
              </div>
              <div className={styles['setting-row-control']}>
                <YakitSwitch checked={autoStartMcp} disabled={!canToggleMcp} onChange={onToggleAutoStart} />
              </div>
            </div>
          </div>

          <div className={styles['section']} data-settings-section={SettingsSections['yak-mcp'].toolConfig}>
            <div className={styles['section-head']}>
              <div className={styles['section-head-text']}>
                <div className={styles['section-title']}>{t('ConfigSystemMcp.tool_config_title')}</div>
                <div className={styles['section-desc']}>{t('SettingsPage.yakMcp.toolConfigHint')}</div>
              </div>
              <div className={styles['section-actions']}>
                <YakitButton
                  type="text"
                  loading={forceSyncLoading}
                  disabled={!enableBridgeExternalMcp || busy}
                  onClick={() => getToolList(true)}
                >
                  {t('ConfigSystemMcp.force_sync')}
                </YakitButton>
                <YakitButton
                  type="text2"
                  icon={<RefreshOutlined color="currentColor" />}
                  loading={loading && !forceSyncLoading}
                  disabled={!hasActiveToolTier || busy}
                  aria-label={t('SettingsPage.yakMcp.refreshTools')}
                  onClick={() => getToolList()}
                >
                  {t('SettingsPage.yakMcp.refreshTools')}
                </YakitButton>
              </div>
            </div>
            <div className={styles['tool-filters']}>
              <YakitInput
                wrapperClassName={styles['tool-search']}
                prefix={<SearchOutlined color="currentColor" />}
                allowClear
                value={keyword}
                disabled={!hasActiveToolTier || !!batchProgress || !!updatingTool}
                placeholder={t('SettingsPage.yakMcp.searchPlaceholder')}
                aria-label={t('SettingsPage.yakMcp.searchPlaceholder')}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <YakitSelect
                wrapperClassName={styles['tool-filter-select']}
                value={sourceFilter}
                options={sourceFilterOptions}
                disabled={!hasActiveToolTier || !!batchProgress || !!updatingTool}
                aria-label={t('ConfigSystemMcp.tool_source')}
                onChange={setSourceFilter}
              />
              <YakitSelect
                wrapperClassName={styles['tool-filter-select']}
                value={statusFilter}
                disabled={!hasActiveToolTier || !!batchProgress || !!updatingTool}
                aria-label={t('SettingsPage.yakMcp.statusFilter')}
                options={[
                  { value: 'all', label: t('SettingsPage.yakMcp.allStatuses') },
                  { value: 'enabled', label: t('SettingsPage.yakMcp.enabledOnly') },
                  { value: 'disabled', label: t('SettingsPage.yakMcp.disabledOnly') },
                ]}
                onChange={setStatusFilter}
              />
              {hasFilters && (
                <YakitButton type="text" disabled={!!batchProgress || !!updatingTool} onClick={clearFilters}>
                  {t('SettingsPage.yakMcp.clearFilters')}
                </YakitButton>
              )}
            </div>
            <div className={styles['tool-batch-bar']}>
              <span className={styles['tool-count']} role="status" aria-live="polite">
                {batchProgress
                  ? t('SettingsPage.yakMcp.batchProgress', batchProgress)
                  : loading
                    ? t('SettingsPage.yakMcp.loadingTools')
                    : t('SettingsPage.yakMcp.resultCount', { count: filteredTools.length, enabled: enabledCount })}
              </span>
              <div className={styles['tool-batch-actions']}>
                <span className={styles['section-desc']}>{t('SettingsPage.yakMcp.batchScope')}</span>
                <YakitButton
                  type="outline2"
                  disabled={busy || loadFailed || filteredTools.length === enabledCount}
                  onClick={() => handleBatchToggle(true)}
                >
                  {t('SettingsPage.yakMcp.enableResults')}
                </YakitButton>
                <YakitButton
                  type="outline2"
                  disabled={busy || loadFailed || enabledCount === 0}
                  onClick={() => handleBatchToggle(false)}
                >
                  {t('SettingsPage.yakMcp.disableResults')}
                </YakitButton>
              </div>
            </div>
            <div className={styles['list-panel']}>
              <div className={styles['tool-list']}>
                {!hasActiveToolTier ? (
                  <YakitEmpty
                    title={t('ConfigSystemMcp.no_tool_tier_title')}
                    description={t('ConfigSystemMcp.no_tool_tier_desc')}
                  />
                ) : loadFailed ? (
                  <YakitEmpty title={t('SettingsPage.yakMcp.loadFailed')}>
                    <YakitButton onClick={() => getToolList()}>{t('SettingsPage.yakMcp.retry')}</YakitButton>
                  </YakitEmpty>
                ) : !loading && !filteredTools.length ? (
                  <YakitEmpty
                    title={t('SettingsPage.yakMcp.noResults')}
                    description={t('SettingsPage.yakMcp.noResultsHint')}
                  >
                    {hasFilters && (
                      <YakitButton type="text" onClick={clearFilters}>
                        {t('SettingsPage.yakMcp.clearFilters')}
                      </YakitButton>
                    )}
                  </YakitEmpty>
                ) : (
                  <TableVirtualResize<MCPToolConfig>
                    loading={loading || forceSyncLoading}
                    isRefresh={isRefresh}
                    titleHeight={0}
                    size="middle"
                    isShowTitle={false}
                    data={filteredTools}
                    enableDrag={false}
                    renderKey="ToolName"
                    columns={columns}
                    useUpAndDown
                    pagination={{
                      total: filteredTools.length,
                      limit: filteredTools.length || 20,
                      page: 1,
                      onChange: () => {},
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
