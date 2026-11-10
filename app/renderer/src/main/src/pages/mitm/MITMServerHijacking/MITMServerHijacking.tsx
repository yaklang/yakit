import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Divider, Tooltip, Typography } from 'antd'
import emiter from '@/utils/eventBus/eventBus'
import ChromeLauncherButton from '@/pages/mitm/MITMChromeLauncher'
import { info, yakitNotify } from '@/utils/notification'
import { useCreation, useMemoizedFn, useSize } from 'ahooks'
import { MITMServer, type TipPart } from '@/pages/mitm/MITMPage'
import style from './MITMServerHijacking.module.scss'
import { QuitIcon } from '@yakit-libs/yakit-ui-icons/oldicon'
import classNames from 'classnames'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitMenu } from '@/components/yakitUI/YakitMenu/YakitMenu'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { setRemoteValue } from '@/utils/kv'
import { MITMConsts } from '../MITMConsts'
import { defHost, defPort, maskProxyPassword } from '../MITMServerStartForm/MITMServerStartForm'
import { type PageNodeItemProps, usePageInfo } from '@/store/pageInfo'
import { shallow } from 'zustand/shallow'
import { YakitRoute } from '@/enums/yakitRoute'
import MITMContext, { MITMVersion } from '../Context/MITMContext'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import {
  type MITMEnablePluginModeRequest,
  type MITMFilterWebsocketRequest,
  type MITMHotPortRequest,
  grpcMITMEnablePluginMode,
  grpcMITMFilterWebsocket,
  grpcMITMHotPort,
  grpcMITMSetDownstreamProxy,
  grpcMITMGetFilter,
  grpcMITMSetDisableSystemProxy,
  grpcMITMStopCall,
  grpcMITMRemoveHook,
  type MITMRemoveHookRequest,
} from '../MITMHacker/utils'
import { convertMITMFilterUI } from '../MITMServerStartForm/utils'
import { getMitmHijackFilter } from '../MITMServerStartForm/MITMFiltersModal'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import ProxyRulesConfig, { ProxyTest } from '@/components/configNetwork/ProxyRulesConfig'
import { checkProxyVersion, isValidUrlWithProtocol } from '@/utils/proxyConfigUtil'
import { useStore } from '@/store/mitmState'
import { useProxy } from '@/hook/useProxy'
import { debugToPrintLogs } from '@/utils/logCollection'
import { ChevronDownOutlined, ChevronUpOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useGlobalHotPatchTag, useGlobalHotPatch } from '@/store/globalHotPatch'
import type { HoldGRPCStreamInfo } from '@/hook/useHoldGRPCStream/useHoldGRPCStreamType'
import type { ManualHijackTypeProps } from '../MITMManual/MITMManualType'
import type { StreamUpdateState } from './PluginsOutput/StreamProcessor'
import { loadAdvancedConfig, updateAdvancedConfig } from '../MITMAdvancedConfig'
import { apiGetSystemProxy, type GetSystemProxyResult } from '@/utils/ConfigSystemProxy'

type MITMStatus = 'hijacking' | 'hijacked' | 'idle'
const { Text } = Typography

export interface MITMServerHijackingProp {
  showPort: string[]
  host: string
  port: number
  disableCACertPage: boolean
  status: MITMStatus
  enableInitialMITMPlugin?: boolean
  defaultPlugins?: string[]
  setStatus: (status: MITMStatus) => any
  autoForward: ManualHijackTypeProps
  setAutoForward: React.Dispatch<React.SetStateAction<ManualHijackTypeProps>>
  onLoading?: (loading: boolean) => any
  setVisible: (b: boolean) => void
  tipParts: TipPart[]
  setTipParts: React.Dispatch<React.SetStateAction<TipPart[]>>
  downstreamProxyStr: string
  setDownstreamProxyStr: (proxy: string) => void
  isHasParams: boolean
  onIsHasParams: (isHasParams: boolean) => void
  showPluginHistoryList: string[]
  setShowPluginHistoryList: (l: string[]) => void
  tempShowPluginHistory: string
  setTempShowPluginHistory: (t: string) => void
  pluginStreamInfo: Record<string, HoldGRPCStreamInfo>
  showPluginStream: string
  setShowPluginStream: React.Dispatch<React.SetStateAction<string>>
  hasPluginsStreamUpdate: boolean
  updatesPlugins?: Map<string, StreamUpdateState>
  pluginOutputRef: React.RefObject<HTMLDivElement>
}

const { ipcRenderer } = window.require('electron')

export interface CaCertData {
  CaCerts: Uint8Array
  LocalFile: string
}

const MITMFiltersModal = React.lazy(() => import('../MITMServerStartForm/MITMFiltersModal'))
const MITMCertificateDownloadModal = React.lazy(() => import('../MITMServerStartForm/MITMCertificateDownloadModal'))

export const MITMServerHijacking: React.FC<MITMServerHijackingProp> = React.memo((props) => {
  const {
    host,
    port,
    disableCACertPage,
    showPort,
    status,
    setStatus,
    autoForward,
    setAutoForward,
    setVisible,
    tipParts,
    setTipParts,
    downstreamProxyStr,
    setDownstreamProxyStr,
    isHasParams,
    onIsHasParams,
    showPluginHistoryList,
    setShowPluginHistoryList,
    tempShowPluginHistory,
    setTempShowPluginHistory,
    pluginStreamInfo,
    showPluginStream,
    setShowPluginStream,
    hasPluginsStreamUpdate,
    updatesPlugins,
    pluginOutputRef,
  } = props
  const { t, i18n } = useI18nNamespaces(['webFuzzer', 'mitm'])

  const { queryPagesDataById, removePagesDataCacheById } = usePageInfo(
    (s) => ({
      queryPagesDataById: s.queryPagesDataById,
      removePagesDataCacheById: s.removePagesDataCacheById,
    }),
    shallow,
  )
  const initPageInfo = useMemoizedFn(() => {
    const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPHacker, YakitRoute.HTTPHacker)
    if (currentItem && currentItem.pageParamsInfo.hTTPHackerPageInfo) {
      return currentItem.pageParamsInfo.hTTPHackerPageInfo
    }
  })
  const initV2PageInfo = useMemoizedFn(() => {
    const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.MITMHacker, YakitRoute.MITMHacker)
    if (currentItem && currentItem.pageParamsInfo.mitmHackerPageInfo) {
      return currentItem.pageParamsInfo.mitmHackerPageInfo
    }
  })

  const [downloadVisible, setDownloadVisible] = useState<boolean>(false)
  const [filtersVisible, setFiltersVisible] = useState<boolean>(false)
  const [isFilter, setIsFilter] = useState(false)
  const [filterWebsocket, setFilterWebsocket] = useState<boolean>(false)
  const [disableSystemProxy, setDisableSystemProxy] = useState<boolean>(false)
  const { proxyRouteOptions, getProxyValue, checkProxyEndpoints, comparePointUrl } = useProxy()

  const mitmContent = useContext(MITMContext)

  const mitmVersion = useCreation(() => {
    return mitmContent.mitmStore.version
  }, [mitmContent.mitmStore.version])

  /** 下游代理是否正在生效（标签在 = 已开启） */
  const downstreamProxyEnabled = useMemo(() => tipParts.some((item) => item.key === 'downstreamProxy'), [tipParts])

  useEffect(() => {
    if (!!props.enableInitialMITMPlugin && (props?.defaultPlugins || []).length > 0) {
      enableMITMPluginMode({
        initPluginNames: props.defaultPlugins || [],
        version: mitmVersion,
      }).then(() => {
        info(t('MITMServerHijacking.initial_mitm_plugin_started_successfully'))
      })
    }
  }, [props.enableInitialMITMPlugin, props.defaultPlugins])

  const onStartMitmChangeInfo = useMemoizedFn((infoStr = '') => {
    try {
      const info =
        mitmVersion === MITMVersion.V2
          ? infoStr
            ? JSON.parse(infoStr)
            : initV2PageInfo()?.immediatelyLaunchedInfo
          : initPageInfo()?.immediatelyLaunchedInfo
      if (info && status !== 'idle') {
        if (info.host && info.port) {
          ipcRenderer.invoke('IsChromeLaunched').then((e) => {
            if (e) {
              const value: MITMHotPortRequest = {
                host: info?.host!,
                port: +info?.port!,
                version: mitmVersion,
              }
              grpcMITMHotPort(value)
            }
          })
          emiter.emit(
            'onChangeAddrAndEnableInitialPlugin',
            JSON.stringify({
              version: mitmVersion,
              host: info.host,
              port: info.port,
              enableInitialPlugin: info.enableInitialPlugin,
            }),
          )
        }

        // 前面所有步骤操作完成后移除缓存
        if (mitmVersion === MITMVersion.V2) {
          removePagesDataCacheById(YakitRoute.MITMHacker, YakitRoute.MITMHacker)
        } else {
          removePagesDataCacheById(YakitRoute.HTTPHacker, YakitRoute.HTTPHacker)
        }
      }
    } catch (error) {}
  })
  useEffect(() => {
    onStartMitmChangeInfo()
  }, [status, mitmVersion])
  useEffect(() => {
    emiter.on('onStartMitm', onStartMitmChangeInfo)
    return () => {
      emiter.off('onStartMitm', onStartMitmChangeInfo)
    }
  }, [])
  const stopFun = useMemoizedFn(() => {
    // setLoading(true)
    return new Promise((resolve, reject) => {
      grpcMITMStopCall(mitmVersion)
        .then(() => {
          onIsHasParams(false)
          setShowPluginHistoryList([])
          setTempShowPluginHistory('')
          setStatus('idle')
          resolve('ok')
        })
        .catch((e: any) => {
          reject(e)
          yakitNotify('error', t('MITMServerHijacking.stop_mitm_hijack_failed', { e }))
          debugToPrintLogs({
            page: 'MITMServerHijacking',
            fun: 'stopFun',
            content: e,
          })
        })
        .finally(() => {
          // setLoading(false)
        })
    })
  })

  const { tunSessionState, mitmHotStatus, setMitmHotStatus } = useStore()
  const stop = useMemoizedFn(() => {
    if (tunSessionState?.deviceName) {
      emiter.emit('onCloseTunHijackConfirmModal', 'mitm')
    } else {
      stopFun()
    }
  })

  const onCloseChromeByTunHijack = useMemoizedFn(() => {
    stopFun()
  })

  useEffect(() => {
    emiter.on('onCloseTunHijackCallback', onCloseChromeByTunHijack)
    return () => {
      emiter.off('onCloseTunHijackCallback', onCloseChromeByTunHijack)
    }
  }, [])

  useEffect(() => {
    loadAdvancedConfig().then((config) => {
      setFilterWebsocket(config.filterWebsocket)
      setDisableSystemProxy(config.DisableSystemProxy)
    })
  }, [])

  const updateDisableSystemProxy = useMemoizedFn((disabled: boolean) => {
    setDisableSystemProxy(disabled)
    updateAdvancedConfig({ DisableSystemProxy: disabled })
    grpcMITMSetDisableSystemProxy({
      version: mitmVersion,
      setDisableSystemProxy: disabled,
    })
  })

  useEffect(() => {
    grpcMITMGetFilter(true)
      .then((res) => {
        const fd = res?.FilterData
        if (!fd) {
          setIsFilter(false)
          return
        }
        const { baseFilter, advancedFilters } = convertMITMFilterUI(fd)
        setIsFilter(getMitmHijackFilter(baseFilter, advancedFilters))
      })
      .catch(() => setIsFilter(false))
  }, [])

  const onSetFilterFlag = useMemoizedFn((flag: boolean) => {
    setIsFilter(flag)
  })

  const heardRef = useRef<HTMLDivElement>(null)
  const heardSize = useSize(heardRef)
  const isNarrow = useCreation(() => {
    return (heardSize?.width || 0) < 1150
  }, [heardSize?.width])

  const [morePopoverVisible, setMorePopoverVisible] = useState<boolean>(false)
  const [rulesVisible, setRulesVisible] = useState(false)
  const [proxyPopoverOpen, setProxyPopoverOpen] = useState(false)
  const [proxyRequired, setProxyRequired] = useState(false)
  const downstreamProxyList = downstreamProxyStr
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  const knownProxyValues = new Set(proxyRouteOptions.map(({ value }) => value))
  const downstreamProxyError = downstreamProxyList.some(
    (item) => !knownProxyValues.has(item) && !isValidUrlWithProtocol(item),
  )
    ? t('ProxyConfig.valid_proxy_address_tip')
    : proxyRequired && !downstreamProxyList.length
      ? t('ProxyConfig.valid_proxy_address_tip')
      : ''
  const { globalEnabledTemplateName, onDisableGlobalHotPatch } = useGlobalHotPatchTag()

  useEffect(() => {
    if (!useGlobalHotPatch.getState().globalHotPatchConfig) {
      useGlobalHotPatch.getState().loadGlobalHotPatchConfig()
    }
  }, [])

  const saveDownstreamProxy = useMemoizedFn((value: string[]) => {
    const next = value.length > 1 ? [value[value.length - 1]] : value
    if (next.length) setProxyRequired(false)
    const text = next.join(',')
    setDownstreamProxyStr(text)
    setRemoteValue(MITMConsts.MITMDownStreamProxy, text)
  })

  /** 开关只控制是否生效。关掉时输入内容还留着。 */
  const applyDownstreamProxy = useMemoizedFn((list: string[], active: boolean) => {
    // 与启动页一致：只有真正生效时才把新地址写入代理节点
    if (active) checkProxyEndpoints(list)
    const { proxyEndpoints, ProxyRuleIds } = active ? getProxyValue(list) : { proxyEndpoints: '', ProxyRuleIds: '' }
    grpcMITMSetDownstreamProxy({
      downstreamProxy: proxyEndpoints,
      downstreamProxyRuleId: ProxyRuleIds,
      version: mitmVersion,
    })
    setTipParts((prev) => {
      const others = prev.filter((item) => item.key !== 'downstreamProxy')
      if (!active) return others
      const tip = list
        .map((item) => {
          if (!item.startsWith('route') && !item.startsWith('ep')) return item
          const option = proxyRouteOptions.find(({ value }) => value === item)
          if (item.startsWith('ep')) return `${comparePointUrl(item)}${option?.disabled ? '(已禁用)' : ''}`
          return option?.tagLabel || item
        })
        .map((item) => maskProxyPassword(item || ''))
        .join(',')
      return tip ? [...others, { key: 'downstreamProxy', value: tip }] : others
    })
  })

  const onDownstreamProxySwitch = useMemoizedFn((checked: boolean) => {
    if (!checked) {
      applyDownstreamProxy(downstreamProxyList, false)
      return
    }
    if (downstreamProxyError || !downstreamProxyList.length) {
      setProxyRequired(true)
      return
    }
    if (downstreamProxyList.some((item) => proxyRouteOptions.find(({ value }) => value === item)?.disabled)) {
      yakitNotify('warning', t('ProxyConfig.select_disabled_tip'))
    }
    applyDownstreamProxy(downstreamProxyList, true)
  })

  const mapProxyValue = (value: string) => {
    if (value.includes('规则组')) {
      return value.replace('规则组', t('MITMRuleFromModal.rule_group'))
    }
    if (value.includes('已禁用')) {
      return value.replace('已禁用', t('ProxyConfig.disabled'))
    }
    if (value.includes('代理节点')) {
      return value.replace('代理节点', t('ProxyConfig.Points'))
    }
    return value
  }

  const [systemProxy, setSystemProxy] = useState<GetSystemProxyResult>()
  useEffect(() => {
    getConfigSystemProxy()
    emiter.on('onRefConfigSystemProxy', getConfigSystemProxy)
    return () => {
      emiter.off('onRefConfigSystemProxy', getConfigSystemProxy)
    }
  }, [])
  const getConfigSystemProxy = useMemoizedFn(() => {
    apiGetSystemProxy().then((res: GetSystemProxyResult) => {
      setSystemProxy({
        ...res,
        CurrentProxy: res.CurrentProxy ? res.CurrentProxy : `${defHost}:${defPort}`,
      })
    })
  })

  const showAddr = useMemo(() => {
    const maxDisplay = 5 // 最多显示5个端口
    const displayData = showPort.slice(0, maxDisplay).join(', ') // 取前5个
    const remainingCount = showPort.length - maxDisplay // 剩余数量
    const showPortText = remainingCount > 0 ? `${displayData} +${remainingCount}...` : displayData
    return `${host}:${showPortText}`
  }, [host, showPort])

  return (
    <div className={style['mitm-server']}>
      <div className={style['mitm-server-heard']} ref={heardRef}>
        <div className={style['mitm-server-title']}>
          <div className={style['mitm-server-heard-name']}>劫持 HTTP Request</div>
          <div className={style['mitm-server-heard-addr']}>
            <span className={style['mitm-server-heard-addr-text']}>
              <Tooltip title={`${host}:${showPort}`}>{showAddr}</Tooltip>
            </span>
            <div className={style['mitm-server-heard-addr-tags']}>
              {(tipParts || [])
                .map((p, idx) => {
                  if (p.key === 'downstreamProxy') {
                    return (
                      <YakitTag
                        closable={true}
                        onClose={() => applyDownstreamProxy(downstreamProxyList, false)}
                        key={`tip-${idx}`}
                      >
                        {`${t('ProxyConfig.downstream_agent')}: ${mapProxyValue(p.value as string)}`}
                      </YakitTag>
                    )
                  }
                  if (p.key === 'onlyEnableGMTLS') {
                    return (
                      <YakitTag color="success" key={`tip-${idx}`}>
                        仅国密 TLS
                      </YakitTag>
                    )
                  }
                  if (p.key === 'enableProxyAuth') {
                    return (
                      <YakitTag color="success" key={`tip-${idx}`}>
                        开启代理认证
                      </YakitTag>
                    )
                  }
                  return null
                })
                .filter(Boolean)}
              {!disableSystemProxy &&
                systemProxy?.Enable &&
                tipParts.findIndex((item) => item.key === 'downstreamProxy') === -1 && (
                  <YakitTag
                    color="green"
                    closable={true}
                    onClose={() => {
                      updateDisableSystemProxy(true)
                    }}
                  >
                    {t('MITMServerHijacking.system_proxy')}
                    {systemProxy?.CurrentProxy}
                  </YakitTag>
                )}
              {globalEnabledTemplateName && (
                <YakitTag closable onClose={onDisableGlobalHotPatch}>
                  <Tooltip title={globalEnabledTemplateName}>
                    {t('GlobalHotPatch.Global_hot_template')}
                    {t('GlobalHotPatch.started')}
                  </Tooltip>
                </YakitTag>
              )}
              {globalEnabledTemplateName && mitmHotStatus === 'success' ? '->' : ''}
              {mitmHotStatus === 'success' && (
                <YakitTag
                  style={{ marginLeft: 6 }}
                  closable
                  onClose={() => {
                    const value: MITMRemoveHookRequest = {
                      HookName: [],
                      RemoveHookID: ['@HotPatchCode'],
                      version: mitmVersion,
                    }
                    grpcMITMRemoveHook(value).then(() => {
                      setMitmHotStatus('end')
                    })
                  }}
                >
                  {t('GlobalHotPatch.MITM_hot_patch')}
                  {t('GlobalHotPatch.started')}
                </YakitTag>
              )}
            </div>
          </div>
        </div>
        <div className={style['mitm-server-extra']}>
          <div className={style['mitm-server-links']}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label>
                过滤WebSocket：
                <YakitSwitch
                  size="middle"
                  checked={filterWebsocket}
                  onChange={(value) => {
                    setFilterWebsocket(value)
                    updateAdvancedConfig({ filterWebsocket: value })
                    const params: MITMFilterWebsocketRequest = {
                      filterWebsocket: value,
                      version: mitmVersion,
                    }
                    grpcMITMFilterWebsocket(params)
                  }}
                />
              </label>
            </div>
            <Divider type="vertical" style={{ margin: '0 4px', top: 1 }} />
            <YakitPopover
              trigger="click"
              placement="bottom"
              open={proxyPopoverOpen}
              onOpenChange={setProxyPopoverOpen}
              classNames={{ root: style['proxy-configuration-popover'] }}
              content={
                <div className={style['proxy-configuration-panel']}>
                  <div className={style['proxy-configuration-row']}>
                    <span className={style['proxy-configuration-label']}>{t('ProxyConfig.downstream_agent')}</span>
                    <YakitSwitch size="large" checked={downstreamProxyEnabled} onChange={onDownstreamProxySwitch} />
                  </div>
                  <YakitSelect
                    allowClear
                    status={downstreamProxyError ? 'error' : ''}
                    disabled={downstreamProxyEnabled}
                    options={proxyRouteOptions}
                    mode="tags"
                    maxTagCount={1}
                    value={downstreamProxyList}
                    placeholder={t('ProxyConfig.example_proxy_address')}
                    onChange={(value) => saveDownstreamProxy((value || []) as string[])}
                    getPopupContainer={(node) => node.parentElement || document.body}
                  />
                  {downstreamProxyError ? (
                    <div className={style['proxy-configuration-error']}>{downstreamProxyError}</div>
                  ) : null}
                  <div className={style['proxy-configuration-extra']}>
                    <div
                      className={style['agent-down-stream-proxy']}
                      onClick={async () => {
                        if (!(await checkProxyVersion())) return
                        setProxyPopoverOpen(false)
                        setRulesVisible(true)
                      }}
                    >
                      {t('AgentConfigModal.proxy_configuration')}
                    </div>
                    <Divider type="vertical" />
                    <ProxyTest
                      btnDisabled={downstreamProxyEnabled}
                      onEchoNode={(proxy) => saveDownstreamProxy(proxy || [])}
                    />
                  </div>
                  <div className={classNames(style['proxy-configuration-row'], style['proxy-configuration-row-split'])}>
                    <span className={style['proxy-configuration-label']}>
                      {t('HttpQueryAdvancedConfig.disable_system_proxy')}
                    </span>
                    <YakitSwitch
                      size="large"
                      checked={disableSystemProxy}
                      onChange={(checked) => updateDisableSystemProxy(checked)}
                    />
                  </div>
                </div>
              }
            >
              <div className={style['link-item']}>{t('AgentConfigModal.proxy_configuration')}</div>
            </YakitPopover>
            <Divider type="vertical" style={{ margin: '0 4px', top: 1 }} />
            {!isNarrow && (
              <>
                <div className={style['link-item']} onClick={() => setVisible(true)}>
                  规则配置
                </div>
                <Divider type="vertical" style={{ margin: '0 4px', top: 1 }} />
              </>
            )}
            <div className={style['link-item']} onClick={() => setFiltersVisible(true)}>
              过滤器
            </div>
            {/* 产品要求暂时下掉 */}
            {/* {isFilter && (
                            <YakitTag color={"success"} style={{margin: '0 4px'}}>
                                {t("HttpQueryAdvancedConfig.configured")}
                                <OutlineCheckIcon className={style["check-icon"]} />
                            </YakitTag>
                        )} */}
            {!isNarrow && (
              <>
                <Divider type="vertical" style={{ margin: '0 4px', top: 1 }} />
                <div className={style['link-item']} onClick={() => setDownloadVisible(true)}>
                  证书下载
                </div>
              </>
            )}
          </div>
          {/*<YakitButton*/}
          {/*    onClick={() => {*/}
          {/*        showConfigSystemProxyForm(`${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}`)*/}
          {/*    }}*/}
          {/*    type='outline2'*/}
          {/*>*/}
          {/*    系统代理*/}
          {/*</YakitButton>*/}
          <div className={style['mitm-server-chrome']}>
            <ChromeLauncherButton isStartMITM={true} host={host} port={port} disableCACertPage={disableCACertPage} />
          </div>
          {isNarrow && (
            <YakitPopover
              classNames={{ root: classNames(style['more-popover']) }}
              placement="bottomRight"
              trigger="click"
              open={morePopoverVisible}
              onOpenChange={setMorePopoverVisible}
              content={
                <YakitMenu
                  selectedKeys={[]}
                  data={[
                    { key: 'rule-config', label: t('MITMServerHijacking.rule_configuration') },
                    {
                      key: 'cert-download',
                      label: t('MITMFormAdvancedConfiguration.certificateDownload'),
                    },
                  ]}
                  onClick={({ key }) => {
                    setMorePopoverVisible(false)
                    switch (key) {
                      case 'rule-config':
                        setVisible(true)
                        break
                      case 'cert-download':
                        setDownloadVisible(true)
                        break
                    }
                  }}
                />
              }
            >
              <YakitButton type="outline2" style={{ marginLeft: 8 }}>
                更多
                {morePopoverVisible ? (
                  <ChevronUpOutlined color="currentColor" />
                ) : (
                  <ChevronDownOutlined color="currentColor" />
                )}
              </YakitButton>
            </YakitPopover>
          )}
          <div
            className={style['mitm-server-quit-icon']}
            data-testid="mitm-stop"
            role="button"
            tabIndex={0}
            aria-label="Stop MITM"
            onClick={() => stop()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') stop()
            }}
          >
            <QuitIcon />
          </div>
        </div>
      </div>
      <ProxyRulesConfig visible={rulesVisible} onClose={() => setRulesVisible(false)} />
      <Divider style={{ margin: '8px 0 0 0' }} />
      <div className={style['mitm-server-body']}>
        <MITMServer
          isHasParams={isHasParams}
          onIsHasParams={onIsHasParams}
          status={status}
          setStatus={setStatus}
          autoForward={autoForward}
          setAutoForward={setAutoForward}
          downstreamProxyStr={downstreamProxyEnabled ? downstreamProxyStr : ''}
          showPluginHistoryList={showPluginHistoryList}
          setShowPluginHistoryList={setShowPluginHistoryList}
          tempShowPluginHistory={tempShowPluginHistory}
          setTempShowPluginHistory={setTempShowPluginHistory}
          setVisible={setVisible}
          setFiltersVisible={setFiltersVisible}
          pluginStreamInfo={pluginStreamInfo}
          showPluginStream={showPluginStream}
          setShowPluginStream={setShowPluginStream}
          hasPluginsStreamUpdate={hasPluginsStreamUpdate}
          updatesPlugins={updatesPlugins}
          pluginOutputRef={pluginOutputRef}
        />
      </div>
      <React.Suspense fallback={<div>loading...</div>}>
        <MITMFiltersModal
          filterType="filter"
          visible={filtersVisible}
          setVisible={setFiltersVisible}
          isStartMITM={true}
          onSetFilterFlag={onSetFilterFlag}
        />
        <MITMCertificateDownloadModal visible={downloadVisible} setVisible={setDownloadVisible} />
      </React.Suspense>
    </div>
  )
})

export const enableMITMPluginMode = (params: MITMEnablePluginModeRequest) => {
  return grpcMITMEnablePluginMode(params)
}
