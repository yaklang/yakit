import { useEffect, useMemo, useRef, useState } from 'react'
import { Tooltip } from 'antd'
import { useDebounceFn, useMemoizedFn, useUpdateEffect } from 'ahooks'
import classNames from 'classnames'
import { cloneDeep } from 'lodash'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { YakitSegmented } from '@/components/yakitUI/YakitSegmented/YakitSegmented'
import { CopyComponents, YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { TableVirtualResize } from '@/components/TableVirtualResize/TableVirtualResize'
import type { ColumnsTypeProps, SortProps } from '@/components/TableVirtualResize/TableVirtualResizeType'
import {
  FilterOutlined,
  QuestionMarkCircleOutlined,
  RefreshOutlined,
  SearchOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { SystemInfo } from '@/constants/hardware'
import { useYakMcpStream } from '@/store/yakMcpStream'
import { AIMCPToolDetailPopover } from './AIMCPToolDetailPopover'
import {
  type GetMCPToolListRequest,
  type GetMCPToolListResponse,
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
  const [isRefresh, setIsRefresh] = useState(false)
  const [forceSyncLoading, setForceSyncLoading] = useState(false)
  const isInitRequestRef = useRef(true)
  const [query, setQuery] = useState<GetMCPToolListRequest>({
    Keyword: '',
    Source: ['builtin', 'aitool'],
    ServerName: '',
    OnlyEnabled: false,
    Pagination: {
      ...genDefaultPagination(20),
      OrderBy: 'created_at',
    },
  })
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<GetMCPToolListResponse>({
    Tools: [],
    Pagination: {
      ...genDefaultPagination(20),
      OrderBy: 'created_at',
    },
    Total: 0,
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

  const columns: ColumnsTypeProps[] = useMemo(() => {
    const sourceFilterOptions: { value: MCPToolSource; label: string }[] = []
    if (enableLegacyMcpTools) {
      sourceFilterOptions.push({ value: 'builtin', label: t('ConfigSystemMcp.source_legacy') })
    }
    if (enableAIToolFramework) {
      sourceFilterOptions.push({ value: 'aitool', label: t('ConfigSystemMcp.source_aitool') })
    }
    if (enableBridgeExternalMcp) {
      sourceFilterOptions.push({ value: 'bridge', label: t('ConfigSystemMcp.source_bridge') })
    }
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
        filterProps: {
          filterKey: 'Source',
          filtersType: 'select',
          filterMultiple: true,
          filters: sourceFilterOptions,
          filterIcon: <FilterOutlined className={styles['filter-icon']} color="currentColor" />,
        },
      },
      {
        title: t('ConfigSystemMcp.tool_name'),
        dataKey: 'ToolName',
        width: 220,
        ellipsis: true,
        render: (text, record) => (
          <div className={styles['tool-name']}>
            <span>{text}</span>
            <YakitPopover
              placement="right"
              content={<AIMCPToolDetailPopover item={record} />}
              styles={{ root: { maxWidth: 440 } }}
            >
              <QuestionMarkCircleOutlined className={styles['help-icon']} color="currentColor" />
            </YakitPopover>
          </div>
        ),
        filterProps: {
          filterKey: 'Keyword',
          filtersType: 'input',
          filterIcon: <SearchOutlined className={styles['filter-icon']} color="currentColor" />,
        },
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
        render: (text, record) => <YakitSwitch checked={text} onChange={(v) => handleToggle(v, record)} />,
      },
    ]
  }, [enableLegacyMcpTools, enableAIToolFramework, enableBridgeExternalMcp, resolveToolDescription, i18nRefresh])

  const queyChangeUpdateData = useDebounceFn(
    () => {
      if (!isInitRequestRef.current) getToolList(1)
    },
    { wait: 300 },
  ).run

  useEffect(() => {
    if (!enableMcp) getToolList(1)
  }, [enableMcp])

  useUpdateEffect(() => {
    queyChangeUpdateData()
  }, [query])

  const getToolList = useMemoizedFn(async (page: number) => {
    if (!hasActiveToolTier) {
      setResponse({
        Tools: [],
        Pagination: { ...genDefaultPagination(20), OrderBy: 'created_at' },
        Total: 0,
      })
      return
    }
    const params: GetMCPToolListRequest = {
      ...cloneDeep(query),
      Pagination: { ...query.Pagination, Page: page },
    }
    params.Source = params.Source + ''
    const isInit = page === 1
    isInitRequestRef.current = false
    if (isInit) {
      if (query.ForceSync) setForceSyncLoading(true)
      else setLoading(true)
    }
    try {
      const res = await grpcGetMCPToolList(params)
      const tools = res.Tools || []
      setResponse((prev) => ({
        Tools: isInit ? tools : prev.Tools.concat(tools),
        Pagination: res.Pagination,
        Total: res.Total,
      }))
      if (isInit) setIsRefresh((prev) => !prev)
    } finally {
      if (isInit) {
        if (query.ForceSync) setForceSyncLoading(false)
        else setLoading(false)
      }
    }
  })

  const resetAndFetchTools = useMemoizedFn((tiers: MCPTierVisibility, forceSync = false) => {
    tierVisibilityRef.current = tiers
    setResponse({
      Tools: [],
      Pagination: { ...query.Pagination, Page: 1 },
      Total: 0,
    })
    if (!isMCPTierActive(tiers)) return
    setQuery((prev) => ({ ...prev, Source: resolveMCPToolListSourceFilter(tiers), ForceSync: forceSync }))
  })

  const onLegacyTierChange = useMemoizedFn((checked: boolean) => {
    const tiers = { ...tierVisibilityRef.current, enableLegacyMcpTools: checked }
    setEnableLegacyMcpTools(checked)
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
    resetAndFetchTools(tiers)
  })

  const onBridgeTierChange = useMemoizedFn((checked: boolean) => {
    const tiers = { ...tierVisibilityRef.current, enableBridgeExternalMcp: checked }
    setEnableBridgeExternalMcp(checked)
    resetAndFetchTools(tiers, checked)
  })

  const onTableChange = useMemoizedFn((page: number, limit: number, sort: SortProps, filter: GetMCPToolListRequest) => {
    setQuery((prev) => ({ ...prev, ...filter }))
  })

  const handleToggle = useMemoizedFn((checked: boolean, record: MCPToolConfig) => {
    grpcSetMCPToolEnabled({ ToolName: record.ToolName, Enable: checked }, true)
      .then(() => {
        setResponse((prev) => ({
          ...prev,
          Tools: prev.Tools.map((tool) => (tool.ToolName === record.ToolName ? { ...tool, Enable: checked } : tool)),
        }))
        yakitNotify(
          'success',
          t(checked ? 'ConfigSystemMcp.enable_tool_success' : 'ConfigSystemMcp.disable_tool_success', {
            name: record.ToolName,
          }),
        )
      })
      .catch(() => {
        yakitNotify(
          'error',
          t(checked ? 'ConfigSystemMcp.enable_tool_failed' : 'ConfigSystemMcp.disable_tool_failed', {
            name: record.ToolName,
          }),
        )
      })
  })

  const onToggleEnable = useMemoizedFn((checked: boolean) => {
    if (checked) {
      if (!hasActiveToolTier) return
      mcpStreamEvent.onStart({
        EnableAll: enableLegacyMcpTools,
        EnableAIToolFramework: enableAIToolFramework,
        EnableBridgeExternalMCP: enableBridgeExternalMcp,
      })
      return
    }
    mcpStreamEvent.onCancel()
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
              disabled={!enableMcp && !hasActiveToolTier}
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
                <pre className={styles['json-block']}>{detailJson}</pre>
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
                <YakitSwitch checked={enableLegacyMcpTools} onChange={onLegacyTierChange} />
              </div>
            </div>
            <div className={styles['setting-row']}>
              <div className={styles['setting-row-text']}>
                <div className={styles['setting-row-title']}>{t('ConfigSystemMcp.enable_ai_tool_framework')}</div>
                <div className={styles['setting-row-desc']}>{t('ConfigSystemMcp.enable_ai_tool_framework_desc')}</div>
              </div>
              <div className={styles['setting-row-control']}>
                <YakitSwitch checked={enableAIToolFramework} onChange={onAIToolFrameworkChange} />
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
                  disabled={!enableAIToolFramework}
                  onChange={onBridgeTierChange}
                />
              </div>
            </div>
          </div>

          <div className={styles['section']}>
            <div className={styles['section-head']}>
              <div className={styles['section-head-text']}>
                <div className={styles['section-title']}>{t('ConfigSystemMcp.tool_config_title')}</div>
                <div className={styles['section-desc']}>{t('ConfigSystemMcp.tool_config_desc')}</div>
              </div>
              <div className={styles['section-actions']}>
                <YakitButton
                  type="text"
                  loading={forceSyncLoading}
                  disabled={!enableBridgeExternalMcp}
                  onClick={() => setQuery((prev) => ({ ...prev, ForceSync: true }))}
                >
                  {t('ConfigSystemMcp.force_sync')}
                </YakitButton>
                <YakitButton
                  type="text2"
                  icon={<RefreshOutlined color="currentColor" />}
                  loading={loading}
                  onClick={() => setQuery((prev) => ({ ...prev, ForceSync: false }))}
                />
              </div>
            </div>
            <div className={styles['list-panel']}>
              <div className={styles['tool-list']}>
                {!hasActiveToolTier ? (
                  <YakitEmpty
                    title={t('ConfigSystemMcp.no_tool_tier_title')}
                    description={t('ConfigSystemMcp.no_tool_tier_desc')}
                  />
                ) : (
                  <TableVirtualResize<MCPToolConfig>
                    loading={loading || forceSyncLoading}
                    query={query}
                    isRefresh={isRefresh}
                    titleHeight={0}
                    size="middle"
                    isShowTitle={false}
                    data={response.Tools}
                    enableDrag={false}
                    renderKey="ToolName"
                    columns={columns}
                    useUpAndDown
                    pagination={{
                      total: response.Total,
                      limit: response.Pagination.Limit,
                      page: response.Pagination.Page,
                      onChange: (page) => getToolList(page),
                    }}
                    onChange={onTableChange}
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
