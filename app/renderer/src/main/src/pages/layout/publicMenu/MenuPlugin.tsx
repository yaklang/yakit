import React, { useEffect, useMemo, useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon, SMViewGridAddIcon } from '@/assets/newIcon'
import { PublicDefaultPluginIcon } from '@/routes/publicIcon'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { useMemoizedFn } from 'ahooks'
import { EnhancedPublicRouteMenuProps } from './utils'
import { Avatar, Tooltip } from 'antd'
import { YakitRoute } from '@/enums/yakitRoute'
import { RouteToPageProps } from './PublicMenu'
import { LoadingOutlined } from '@ant-design/icons'
import { CodeGV, RemoteGV } from '@/yakitGV'
import { yakitNotify } from '@/utils/notification'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'

import classNames from 'classnames'
import styles from './MenuPlugin.module.scss'
import { YakitHint } from '@/components/yakitUI/YakitHint/YakitHint'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { JSONParseLog } from '@/utils/tool'
import {
  getPluginExecutionHistoryPageInfo,
  PLUGIN_EXECUTION_HISTORY_LIMIT,
  PluginExecutionHistoryItem,
  queryPluginExecutionHistory,
} from '@/pages/plugins/pluginExecutionHistory'
import emiter from '@/utils/eventBus/eventBus'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { OutlineArrowleftIcon, OutlileHistoryIcon } from '@/assets/icon/outline'
import { formatTimestamp } from '@/utils/timeUtil'

const { ipcRenderer } = window.require('electron')

interface MenuPluginProps {
  children?: React.ReactNode
  loading: boolean
  pluginList: EnhancedPublicRouteMenuProps[]
  onMenuSelect: (route: RouteToPageProps) => void
  onRestore: () => any
}

export const MenuPlugin: React.FC<MenuPluginProps> = React.memo((props) => {
  const { loading, pluginList, onMenuSelect, onRestore: restoreCallback } = props
  const { t } = useI18nNamespaces(['yakitRoute', 'layout', 'yakitUi'])

  const [executionHistory, setExecutionHistory] = useState<PluginExecutionHistoryItem[]>([])
  const [historyVisible, setHistoryVisible] = useState<boolean>(false)
  const refreshExecutionHistory = useMemoizedFn(() => {
    queryPluginExecutionHistory()
      .then(setExecutionHistory)
      .catch(() => setExecutionHistory([]))
  })
  useEffect(() => {
    refreshExecutionHistory()
    emiter.on('refreshPluginExecutionHistory', refreshExecutionHistory)
    return () => emiter.off('refreshPluginExecutionHistory', refreshExecutionHistory)
  }, [refreshExecutionHistory])

  /** 转换成菜单组件统一处理的数据格式，插件是否下载的验证由菜单组件处理，这里不处理 */
  const onMenu = useMemoizedFn((pluginId: number, pluginName: string) => {
    if (!pluginName) return

    onMenuSelect({
      route: YakitRoute.Plugin_OP,
      pluginId: pluginId || 0,
      pluginName: pluginName || '',
    })
    setListShow(false)
  })

  const onHistoryMenu = useMemoizedFn((item: PluginExecutionHistoryItem) => {
    onMenuSelect({
      route: YakitRoute.Plugin_OP,
      pluginId: item.pluginId,
      pluginName: item.pluginName,
      pluginOpPageInfo: getPluginExecutionHistoryPageInfo(item),
    })
    setListShow(false)
  })

  const onCustom = useMemoizedFn(() => {
    setListShow(false)
    ipcRenderer.invoke('open-customize-menu')
  })

  const [restoreVisible, setRestoreVisible] = useState<boolean>(false)
  const handleRestoreHint = () => {
    onRestore()
    setRestoreVisible(false)
  }
  const onClickRestore = useMemoizedFn(() => {
    setListShow(false)
    setRestoreVisible(true)
  })
  const onRestore = useMemoizedFn(() => {
    ipcRenderer
      .invoke('DeleteAllNavigation', { Mode: CodeGV.PublicMenuModeValue })
      .then(() => {
        restoreCallback()
        let deleteCache: any = {}
        getRemoteValue(RemoteGV.UserDeleteMenu)
          .then((val) => {
            if (val !== '{}') {
              try {
                deleteCache = JSONParseLog(val, { page: 'MenuPlugin', fun: 'onRestore' }) || {}
                delete deleteCache[CodeGV.PublicMenuModeValue]
              } catch (error) {}
            }
          })
          .finally(() => {
            setRemoteValue(RemoteGV.UserDeleteMenu, JSON.stringify(deleteCache)).finally(() => {
              setTimeout(() => {
                ipcRenderer.invoke('refresh-public-menu')
              }, 50)
            })
          })
      })
      .catch((e: any) => {
        yakitNotify('error', `更新菜单失败:${e}`)
      })
  })

  const [listShow, setListShow] = useState<boolean>(false)
  const onOpenHistory = useMemoizedFn(() => {
    refreshExecutionHistory()
    setHistoryVisible(true)
  })
  const historyDom = useMemo(() => {
    return (
      <div className={styles['plugin-list-wrapper']}>
        <div className={styles['history-body']}>
          <div className={styles['history-header']}>
            <YakitButton type="text2" icon={<OutlineArrowleftIcon />} onClick={() => setHistoryVisible(false)} />
            <div className={styles['history-title']}>{t('Layout.MenuPlugin.pluginHistory')}</div>
            <div className={styles['history-count']}>
              {t('Layout.MenuPlugin.pluginHistoryRecent', {
                count: executionHistory.length,
                limit: PLUGIN_EXECUTION_HISTORY_LIMIT,
              })}
            </div>
          </div>
          <div className={styles['history-list']}>
            {executionHistory.length > 0 ? (
              executionHistory.map((item) => (
                <div className={styles['history-item']} key={item.id}>
                  <Avatar className={styles['history-avatar']} src={item.headImg} icon={<PublicDefaultPluginIcon />} />
                  <div className={styles['history-info']}>
                    <div className={classNames(styles['history-name'], 'content-ellipsis')} title={item.pluginName}>
                      {item.pluginName}
                    </div>
                    <div className={styles['history-meta']}>
                      <span>
                        {item.source === 'plugin-hub'
                          ? t('Layout.MenuPlugin.pluginHistorySourceHub')
                          : t('Layout.MenuPlugin.pluginHistorySourceExecution')}
                      </span>
                      <span>
                        {item.resultStatus === 'stopped'
                          ? t('Layout.MenuPlugin.pluginHistoryStatusStopped')
                          : t('Layout.MenuPlugin.pluginHistoryStatusFinished')}
                      </span>
                      <span>{formatTimestamp(Math.floor(item.executedAt / 1000))}</span>
                    </div>
                  </div>
                  <YakitButton type="outline1" onClick={() => onHistoryMenu(item)}>
                    {t('Layout.MenuPlugin.pluginHistoryRestore')}
                  </YakitButton>
                </div>
              ))
            ) : (
              <div className={styles['history-empty']}>
                <OutlileHistoryIcon />
                <span>{t('Layout.MenuPlugin.pluginHistoryEmpty')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }, [executionHistory, onHistoryMenu, t])
  const listDom = useMemo(() => {
    if (historyVisible) return historyDom
    return (
      <div className={styles['plugin-list-wrapper']}>
        <div className={styles['list-body']}>
          {pluginList.map((item, index) => {
            if (item.children && item.children.length > 0)
              return (
                <React.Fragment key={item.label}>
                  <div className={styles['plugins-wrapper']}>
                    <div className={styles['plugins-title']}>{item.label}</div>
                    <div className={styles['plugins-body']}>
                      {(item.children || []).map((subItem) => {
                        return (
                          <Tooltip key={subItem.menuName} placement="bottom" title={subItem.label}>
                            <div
                              key={subItem.menuName}
                              className={classNames(styles['plugins-opt'], {
                                [styles['disable-style']]: !subItem.yakScriptId,
                              })}
                              onClick={() => onMenu(subItem.yakScriptId || 0, subItem.yakScripName || '')}
                            >
                              {loading && (
                                <div className={styles['loading-style']} onClick={(e) => e.stopPropagation()}>
                                  <LoadingOutlined />
                                </div>
                              )}
                              <Avatar
                                className={styles['avatar-style']}
                                src={subItem.headImg}
                                icon={<PublicDefaultPluginIcon />}
                              />
                              <div
                                className={classNames(styles['opt-title'], 'content-ellipsis')}
                                title={subItem.label}
                              >
                                {subItem.label}
                              </div>
                            </div>
                          </Tooltip>
                        )
                      })}
                    </div>
                  </div>
                  {index !== pluginList.length - 1 && (
                    <div className={styles['plugin-divider']}>
                      <div className={styles['divider-style']}></div>
                    </div>
                  )}
                </React.Fragment>
              )
            return null
          })}
        </div>

        <div className={styles['list-custom']}>
          <div className={classNames(styles['btn-style'], styles['add-list'])} onClick={onCustom}>
            <SMViewGridAddIcon />
            {t('YakitButton.custom')}...
          </div>
          <div className={styles['list-actions']}>
            <div className={classNames(styles['btn-style'], styles['history-entry'])} onClick={onOpenHistory}>
              <OutlileHistoryIcon />
              {t('Layout.MenuPlugin.pluginHistory')}
            </div>
            <div className={classNames(styles['btn-style'], styles['restore-style'])} onClick={onClickRestore}>
              {t('Layout.MenuPlugin.restoreMenu')}
            </div>
          </div>
        </div>
      </div>
    )
  }, [historyVisible, historyDom, pluginList, loading, onMenu, onCustom, onOpenHistory, onClickRestore, t])

  if (props.children) {
    return (
      <div className={classNames(styles['plugin-btn'], { [styles['plugin-active-btn']]: listShow })}>
        <YakitPopover
          overlayClassName={styles['plugin-list-popover']}
          overlayStyle={{ paddingTop: 6 }}
          placement="bottomRight"
          trigger={'click'}
          content={listDom}
          visible={listShow}
          onVisibleChange={(visible) => {
            setListShow(visible)
            if (!visible) setHistoryVisible(false)
          }}
        >
          <div className={styles['body-style']}>{props.children}</div>
        </YakitPopover>
      </div>
    )
  }

  return (
    <div className={styles['menu-plugin-wrapper']}>
      <div className={styles['plugin-header']}>{t('Layout.MenuPlugin.commonPlugins')}</div>
      <div className={styles['plugin-wrapper']}>
        <div className={styles['plugin-content']}>
          <div className={styles['plugin-body']}>
            {pluginList.map((item, index) => {
              const child = item.children || []
              if (child.length === 0) return null
              else {
                return (
                  <React.Fragment key={item.label}>
                    {child.map((subItem) => {
                      return (
                        <Tooltip key={subItem.menuName} placement="bottom" title={subItem.label}>
                          <div
                            key={subItem.menuName}
                            className={classNames(styles['plugin-opt'], {
                              [styles['disable-style']]: !subItem.yakScriptId,
                            })}
                            onClick={() => onMenu(subItem.yakScriptId || 0, subItem.yakScripName || '')}
                          >
                            {loading && (
                              <div className={styles['loading-style']} onClick={(e) => e.stopPropagation()}>
                                <LoadingOutlined />
                              </div>
                            )}
                            <Avatar
                              className={styles['avatar-style']}
                              src={subItem.headImg}
                              icon={<PublicDefaultPluginIcon />}
                            />
                            <div className={classNames(styles['plugin-title'], 'content-ellipsis')}>
                              {subItem.label}
                            </div>
                          </div>
                        </Tooltip>
                      )
                    })}
                    {index !== pluginList.length - 1 && (
                      <div className={styles['plugin-divider']}>
                        <div className={styles['divider-style']}></div>
                      </div>
                    )}
                  </React.Fragment>
                )
              }
            })}
          </div>
          <div className={classNames(styles['plugin-btn'], { [styles['plugin-active-btn']]: listShow })}>
            <YakitPopover
              overlayClassName={styles['plugin-list-popover']}
              overlayStyle={{ paddingTop: 6 }}
              placement="bottomRight"
              trigger={'click'}
              content={listDom}
              visible={listShow}
              onVisibleChange={(visible) => {
                setListShow(visible)
                if (!visible) setHistoryVisible(false)
              }}
            >
              <div className={styles['body-style']}>{listShow ? <ChevronUpIcon /> : <ChevronDownIcon />}</div>
            </YakitPopover>
          </div>
        </div>
      </div>
      {/* 复原菜单提醒 */}
      <YakitHint
        visible={restoreVisible}
        title={t('Layout.MenuPlugin.restoreMenuTip')}
        content={t('Layout.MenuPlugin.confirmRestoreMenu')}
        onOk={handleRestoreHint}
        onCancel={() => {
          setRestoreVisible(false)
        }}
      />
    </div>
  )
})
