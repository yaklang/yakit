import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Tooltip } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { useDebounceFn, useMemoizedFn, useUpdateEffect } from 'ahooks'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { OutlineFilterIcon, OutlineRefreshIcon, OutlineSearchIcon } from '@/assets/icon/outline'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { SystemInfo } from '@/constants/hardware'
import { localMcpDefalutUrl, mcpStreamHooks, remoteMcpDefalutUrl } from '@/components/layout/hooks/useMcp/useMcp'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import {
  GetMCPToolListRequest,
  GetMCPToolListResponse,
  isMCPTierActive,
  MCPTierVisibility,
  MCPToolConfig,
  MCPToolSource,
  hasMultipleMCPToolSources,
  resolveMCPToolListSourceFilter,
} from '@/pages/ai-agent/type/aiMCP'
import { genDefaultPagination } from '@/pages/invoker/schema'
import { ColumnsTypeProps, SortProps } from '@/components/TableVirtualResize/TableVirtualResizeType'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { grpcGetMCPToolList, grpcSetMCPToolEnabled } from '@/pages/ai-agent/aiMCP/utils'
import { TableVirtualResize } from '@/components/TableVirtualResize/TableVirtualResize'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { yakitNotify } from './notification'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { SafeMarkdown } from '@/pages/assetViewer/reportRenders/markdownRender'
import styles from './ConfigSystemProxy.module.scss'
import classNames from 'classnames'
const { ipcRenderer } = window.require('electron')

const TRANSPORT_OPTIONS = [
  { value: 'sse', label: 'SSE' },
  { value: 'mcp', label: 'Streamable HTTP' },
  { value: 'stdio', label: 'STDIO' },
]
type Transport = (typeof TRANSPORT_OPTIONS)[number]['value']
interface ConfigMcpModalProps {
  onClose: () => void
  mcp: mcpStreamHooks
}
export const ConfigMcpModal: React.FC<ConfigMcpModalProps> = (props) => {
  const {
    onClose,
    mcp: { mcpStreamInfo, mcpStreamEvent },
  } = props
  const { t, i18n } = useI18nNamespaces(['utils', 'yakitUi'])

  // MCP 是否已启用
  const enableMcp = useMemo(() => {
    if (!mcpStreamInfo.mcpCurrent) return false
    if (['stopped', 'error'].includes(mcpStreamInfo.mcpCurrent.Status)) {
      return false
    }
    if (!mcpStreamInfo.mcpServerUrl) return false
    return true
  }, [mcpStreamInfo])

  const isRemoteEngine = SystemInfo.mode === 'remote'

  const [transport, setTransport] = useState<Transport>('sse')
  const [enginePath, setEnginePath] = useState<string>('')

  useEffect(() => {
    if (isRemoteEngine && transport === 'stdio') {
      setTransport('sse')
    }
  }, [isRemoteEngine, transport])

  const transportOptions = useMemo(() => {
    return TRANSPORT_OPTIONS.map((item) => {
      if (item.value !== 'stdio' || !isRemoteEngine) {
        return item
      }
      return {
        ...item,
        disabled: true,
        label: <Tooltip title={t('ConfigSystemMcp.stdio_remote_disabled_tip')}>{item.label}</Tooltip>,
      }
    })
  }, [isRemoteEngine, i18n.language])

  useEffect(() => {
    ipcRenderer
      .invoke('fetch-local-engine-path')
      .then((path) => {
        setEnginePath(path)
      })
      .catch(() => {
        setEnginePath('')
      })
  }, [])

  const sseMarkdownSource = useMemo(() => {
    const jsonData = {
      mcpServers: {
        yakit: {
          type: 'sse',
          url: mcpStreamInfo.mcpServerUrl,
        },
      },
    }
    return `\`\`\`json\n${JSON.stringify(jsonData, null, 2)}\n\`\`\``
  }, [mcpStreamInfo.mcpServerUrl])
  const mcpMarkdownSource = useMemo(() => {
    const mcpUrl = mcpStreamInfo.mcpServerUrl?.replace(/\/sse$/, '/mcp') ?? ''
    const jsonData = {
      mcpServers: {
        yakit: {
          type: 'streamable-http',
          url: mcpUrl,
        },
      },
    }
    return `\`\`\`json\n${JSON.stringify(jsonData, null, 2)}\n\`\`\``
  }, [mcpStreamInfo.mcpServerUrl])
  const stdioMarkdownSource = useMemo(() => {
    const jsonData = {
      mcpServers: {
        yakit: {
          type: 'stdio',
          command: enginePath,
          args: ['mcp', '--transport', 'stdio'],
        },
      },
    }
    return `\`\`\`json\n${JSON.stringify(jsonData, null, 2)}\n\`\`\``
  }, [enginePath])

  const renderTransportInfo = useMemoizedFn(() => {
    const getStartAddress = () => {
      if (transport === 'sse') return mcpStreamInfo.mcpServerUrl
      if (transport === 'mcp') return mcpStreamInfo.mcpServerUrl?.replace(/\/sse$/, '/mcp') ?? ''
      return null
    }

    const getMarkdownSource = () => {
      if (transport === 'sse') return sseMarkdownSource
      if (transport === 'mcp') return mcpMarkdownSource
      return stdioMarkdownSource
    }

    const startAddress = getStartAddress()

    return (
      <div className={styles['transport-info']}>
        {startAddress && (
          <div className={styles['transport-info-item']}>
            <span className={styles['transport-info-item-label']}>{t('ConfigSystemMcp.startAddress')}</span>
            <YakitTag enableCopy color="blue" copyText={startAddress} />
          </div>
        )}
        <div className={classNames(styles['transport-info-item'], styles['flex-start'])}>
          <span className={styles['transport-info-item-label']}>{t('ConfigSystemMcp.detailed_config')}</span>
          <div className={styles['transport-info-item-json']}>
            <SafeMarkdown source={getMarkdownSource()} />
          </div>
        </div>
      </div>
    )
  })

  const [enableLegacyMcpTools, setEnableLegacyMcpTools] = useState<boolean>(true)
  const [enableAIToolFramework, setEnableAIToolFramework] = useState<boolean>(false)
  const [enableBridgeExternalMcp, setEnableBridgeExternalMcp] = useState<boolean>(false)
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
  const [isRefresh, setIsRefresh] = useState<boolean>(false)
  const [forceSyncLoading, setForceSyncLoading] = useState<boolean>(false)
  const isInitRequestRef = useRef<boolean>(true)
  const [query, setQuery] = useState<GetMCPToolListRequest>({
    Keyword: '',
    Source: 'builtin',
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
        width: 110,
        render: (text: MCPToolSource) => <YakitTag>{getSourceLabel(text)}</YakitTag>,
        filterProps: {
          filterKey: 'Source',
          filtersType: 'select',
          filtersSelectAll: {
            isAll: hasMultipleMCPToolSources(tierVisibilityRef.current),
          },
          filters: sourceFilterOptions,
          filterIcon: <OutlineFilterIcon className={styles['filter-icon']} />,
        },
      },
      {
        title: t('ConfigSystemMcp.tool_name'),
        dataKey: 'ToolName',
        width: 540,
        ellipsis: true,
        render: (text, record) => (
          <YakitPopover
            placement="right"
            content={<AIMCPToolDetailPopover item={record} />}
            overlayStyle={{ maxWidth: 440 }}
          >
            <div className={styles['tool-name-wrap']}>
              <div className={styles['tool-name']}>{text}</div>
              <div className={styles['tool-description']}>{record.Description}</div>
            </div>
          </YakitPopover>
        ),
        filterProps: {
          filterKey: 'Keyword',
          filtersType: 'input',
          filterIcon: <OutlineSearchIcon className={styles['filter-icon']} />,
        },
      },
      {
        title: t('ConfigSystemMcp.enable_tool'),
        dataKey: 'Enable',
        render: (text, record) => <YakitSwitch checked={text} onChange={(v) => handleToggle(v, record)} />,
      },
    ]
  }, [enableLegacyMcpTools, enableAIToolFramework, enableBridgeExternalMcp, i18n.language])

  const queyChangeUpdateData = useDebounceFn(
    () => {
      if (!isInitRequestRef.current) {
        getToolList(1)
      }
    },
    { wait: 300 },
  ).run

  useEffect(() => {
    if (!enableMcp) {
      getToolList(1)
    }
  }, [enableMcp])

  useUpdateEffect(() => {
    queyChangeUpdateData()
  }, [query])

  const getToolList = useMemoizedFn(async (page: number) => {
    if (!isMCPTierActive(tierVisibilityRef.current)) {
      setResponse({
        Tools: [],
        Pagination: {
          ...genDefaultPagination(20),
          OrderBy: 'created_at',
        },
        Total: 0,
      })
      return
    }

    const params: GetMCPToolListRequest = {
      ...query,
      Pagination: {
        ...query.Pagination,
        Page: page,
      },
    }
    const isInit = page === 1
    isInitRequestRef.current = false
    if (isInit) {
      if (query.ForceSync) {
        setForceSyncLoading(true)
      } else {
        setLoading(true)
      }
    }
    try {
      console.log('params', params)
      const res = await grpcGetMCPToolList(params)
      const tools = res.Tools || []
      setResponse((prev) => ({
        Tools: isInit ? tools : prev.Tools.concat(tools),
        Pagination: res.Pagination,
        Total: res.Total,
      }))
      if (isInit) {
        setIsRefresh((prev) => !prev)
      }
    } finally {
      if (isInit) {
        if (query.ForceSync) {
          setForceSyncLoading(false)
        } else {
          setLoading(false)
        }
      }
    }
  })

  const onRefreshTools = useMemoizedFn(() => {
    setQuery((prev) => ({ ...prev, ForceSync: false }))
  })

  const onForceSyncTools = useMemoizedFn(() => {
    setQuery((prev) => ({ ...prev, ForceSync: true }))
  })

  const resetAndFetchTools = useMemoizedFn((tiers: MCPTierVisibility, forceSync = false) => {
    tierVisibilityRef.current = tiers
    setResponse({
      Tools: [],
      Pagination: {
        ...query.Pagination,
        Page: 1,
      },
      Total: 0,
    })
    if (!isMCPTierActive(tiers)) {
      return
    }
    setQuery((prev) => ({ ...prev, Source: resolveMCPToolListSourceFilter(tiers), ForceSync: forceSync }))
  })

  const onLegacyTierChange = useMemoizedFn((checked: boolean) => {
    const tiers = {
      ...tierVisibilityRef.current,
      enableLegacyMcpTools: checked,
    }
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
    if (!checked) {
      setEnableBridgeExternalMcp(false)
    }
    resetAndFetchTools(tiers)
  })

  const onBridgeTierChange = useMemoizedFn((checked: boolean) => {
    const tiers = {
      ...tierVisibilityRef.current,
      enableBridgeExternalMcp: checked,
    }
    setEnableBridgeExternalMcp(checked)
    resetAndFetchTools(tiers, checked)
  })

  const onTableChange = useMemoizedFn((page: number, limit: number, sort: SortProps, filter: GetMCPToolListRequest) => {
    setQuery((prev) => ({
      ...prev,
      ...filter,
    }))
  })

  const handleToggle = useMemoizedFn((checked: boolean, record: MCPToolConfig) => {
    grpcSetMCPToolEnabled({ ToolName: record.ToolName, Enable: checked }, true)
      .then(() => {
        setResponse((prev) => ({
          ...prev,
          Tools: prev.Tools.map((tool) => (tool.ToolName === record.ToolName ? { ...tool, Enable: checked } : tool)),
        }))
        const messageKey = checked ? 'ConfigSystemMcp.enable_tool_success' : 'ConfigSystemMcp.disable_tool_success'
        yakitNotify('success', t(messageKey, { name: record.ToolName }))
      })
      .catch(() => {
        const messageKey = checked ? 'ConfigSystemMcp.enable_tool_failed' : 'ConfigSystemMcp.disable_tool_failed'
        yakitNotify('error', t(messageKey, { name: record.ToolName }))
      })
  })

  const onSetMcp = useMemoizedFn(() => {
    if (!hasActiveToolTier) {
      return
    }
    mcpStreamEvent.onStart({
      EnableAll: enableLegacyMcpTools,
      EnableAIToolFramework: enableAIToolFramework,
      EnableBridgeExternalMCP: enableBridgeExternalMcp,
    })
  })

  const onCloseModal = useMemoizedFn(() => {
    if (!enableMcp) {
      mcpStreamEvent.onSetMcpUrl(SystemInfo.mode === 'remote' ? remoteMcpDefalutUrl : localMcpDefalutUrl)
    }
    onClose()
  })

  return (
    <YakitModal
      visible={true}
      width={800}
      title={'Yak Mcp'}
      footer={null}
      closable={true}
      onCloseX={onCloseModal}
      centered={true}
      bodyStyle={{ padding: enableMcp ? 0 : undefined }}
    >
      <div className={styles['config-mcp-wrap']}>
        {enableMcp ? (
          <>
            <div className={styles['config-mcp-status-success']}>
              <span>{t('YakitButton.enabled')}</span>
            </div>
            <div className={styles['config-mcp-transport']}>
              <YakitRadioButtons
                value={transport}
                onChange={(e) => {
                  const next = e.target.value as Transport
                  if (next === 'stdio' && isRemoteEngine) return
                  setTransport(next)
                }}
                buttonStyle="solid"
                options={transportOptions}
              />
              {renderTransportInfo()}
              <div className={styles['config-mcp-btns']}>
                <YakitButton type="outline2" onClick={onCloseModal}>
                  {t('YakitButton.cancel')}
                </YakitButton>
                <YakitButton
                  colors="danger"
                  onClick={() => {
                    mcpStreamEvent.onCancel()
                  }}
                >
                  {t('YakitButton.deactivated')}
                </YakitButton>
              </div>
            </div>
          </>
        ) : (
          <div className={styles['beforeEnableMcp-wrap']}>
            <div className={styles['mcp-url-input']}>
              <span className={styles['mcp-url-input-label']}>{t('ConfigSystemMcp.startAddress')}</span>
              <YakitInput
                addonBefore="http://"
                value={mcpStreamInfo.mcpUrl}
                onChange={(e) => {
                  mcpStreamEvent.onSetMcpUrl(e.target.value)
                }}
              />
            </div>

            <div className={styles['mcp-tier-switches']}>
              <div className={styles['mcp-ai-tool-framework']}>
                <div className={styles['mcp-ai-tool-framework-label']}>
                  <span>{t('ConfigSystemMcp.enable_legacy_mcp_tools')}</span>
                  <span className={styles['mcp-ai-tool-framework-desc']}>
                    {t('ConfigSystemMcp.enable_legacy_mcp_tools_desc')}
                  </span>
                </div>
                <YakitSwitch checked={enableLegacyMcpTools} onChange={onLegacyTierChange} />
              </div>
              <div className={styles['mcp-ai-tool-framework']}>
                <div className={styles['mcp-ai-tool-framework-label']}>
                  <span>{t('ConfigSystemMcp.enable_ai_tool_framework')}</span>
                  <span className={styles['mcp-ai-tool-framework-desc']}>
                    {t('ConfigSystemMcp.enable_ai_tool_framework_desc')}
                  </span>
                </div>
                <YakitSwitch checked={enableAIToolFramework} onChange={onAIToolFrameworkChange} />
              </div>
              {enableAIToolFramework && (
                <div className={classNames(styles['mcp-ai-tool-framework'], styles['mcp-tier-sub'])}>
                  <div className={styles['mcp-ai-tool-framework-label']}>
                    <span>{t('ConfigSystemMcp.enable_bridge_external_mcp')}</span>
                    <span className={styles['mcp-ai-tool-framework-desc']}>
                      {t('ConfigSystemMcp.enable_bridge_external_mcp_desc')}
                    </span>
                  </div>
                  <YakitSwitch checked={enableBridgeExternalMcp} onChange={onBridgeTierChange} />
                </div>
              )}
            </div>

            <div className={styles['mcp-tool-list']}>
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
                  titleHeight={30}
                  size="middle"
                  isShowTitle={true}
                  renderTitle={
                    <div className={styles['virtual-table-header-wrap']}>
                      <div className={styles['virtual-table-header-left']}>
                        <span className={styles['virtual-table-heard-label']}>
                          {t('ConfigSystemMcp.tool_config_title')}
                        </span>
                        <span className={styles['virtual-table-heard-desc']}>
                          {t('ConfigSystemMcp.tool_config_desc')}
                        </span>
                      </div>
                      <div className={styles['virtual-table-header-actions']}>
                        <YakitButton
                          type="text"
                          icon={<OutlineRefreshIcon />}
                          loading={loading}
                          onClick={onRefreshTools}
                        >
                          {t('ConfigSystemMcp.refresh_tools')}
                        </YakitButton>
                        <YakitButton
                          type="text"
                          loading={forceSyncLoading}
                          disabled={!enableBridgeExternalMcp}
                          onClick={onForceSyncTools}
                        >
                          {t('ConfigSystemMcp.force_sync')}
                        </YakitButton>
                      </div>
                    </div>
                  }
                  data={response.Tools}
                  enableDrag={false}
                  renderKey="ToolName"
                  columns={columns}
                  useUpAndDown
                  pagination={{
                    total: response.Total,
                    limit: response.Pagination.Limit,
                    page: response.Pagination.Page,
                    onChange: (page) => {
                      getToolList(page)
                    },
                  }}
                  onChange={onTableChange}
                />
              )}
            </div>
            <div className={styles['config-mcp-btns']}>
              <YakitButton type="outline2" onClick={onCloseModal}>
                {t('YakitButton.cancel')}
              </YakitButton>
              <YakitButton colors="primary" disabled={!hasActiveToolTier} onClick={onSetMcp}>
                {t('YakitButton.enable')}
              </YakitButton>
            </div>
          </div>
        )}
      </div>
    </YakitModal>
  )
}

interface AIMCPToolDetailPopoverProps {
  item: MCPToolConfig
}
const AIMCPToolDetailPopover: React.FC<AIMCPToolDetailPopoverProps> = React.memo((props) => {
  const { item } = props
  const { t } = useI18nNamespaces(['utils'])

  return (
    <div className={styles['mcp-tool-detail-popover']}>
      <div className={styles['detail-title']}>{item.ToolName}</div>
      <div className={styles['detail-description']}>{item.Description}</div>
      {item.Params && item.Params.length > 0 && (
        <div className={styles['param-section']}>
          <div className={styles['param-section-title']}>{t('ConfigSystemMcp.parameters_title')}</div>
          <div className={styles['param-list']}>
            {item.Params.map((p) => (
              <div key={p.Name} className={styles['param-item']}>
                <div
                  className={classNames(styles['param-item-header'], {
                    [styles['param-item-required']]: p.Required,
                  })}
                >
                  <span>{p.Name}</span>
                  <YakitTag color="green">{p.Type}</YakitTag>
                </div>
                <div className={styles['param-description']}>{p.Description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})
