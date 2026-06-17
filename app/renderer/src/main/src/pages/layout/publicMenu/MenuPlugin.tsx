import React, { useMemo, useState } from 'react'
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
import { getPluginUsageCache, markPluginRestoreOnOpen } from '@/utils/pluginUsageCache'
import { FuncSearch } from '@/pages/plugins/funcTemplate'
import { PluginSearchParams } from '@/pages/plugins/baseTemplateType'
import {
  apiFetchOnlineList,
  convertLocalPluginsRequestParams,
  convertPluginsRequestParams,
} from '@/pages/plugins/utils'
import { defaultFilter } from '@/pages/plugins/builtInData'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { grpcDownloadOnlinePlugin } from '@/pages/pluginHub/utils/grpc'
import emiter from '@/utils/eventBus/eventBus'

const { ipcRenderer } = window.require('electron')
const defaultSearch: PluginSearchParams = {
  type: 'fieldKeywords',
  keyword: '',
  userName: '',
  fieldKeywords: '',
  tag: '',
}
type SearchPluginItem = { name: string; id?: number; headImg?: string; uuid?: string }

interface MenuPluginProps {
  children?: React.ReactNode
  loading: boolean
  pluginList: EnhancedPublicRouteMenuProps[]
  onMenuSelect: (route: RouteToPageProps) => void
  onRestore: () => any
}

export const MenuPlugin: React.FC<MenuPluginProps> = React.memo((props) => {
  const { loading, pluginList, onMenuSelect, onRestore: restoreCallback } = props
  const { t, i18n } = useI18nNamespaces(['yakitRoute', 'layout', 'yakitUi'])

  /** 转换成菜单组件统一处理的数据格式，插件是否下载的验证由菜单组件处理，这里不处理 */
  const onMenu = useMemoizedFn((pluginId: number, pluginName: string, fromRecent?: boolean) => {
    if (!pluginName) return

    if (fromRecent) {
      markPluginRestoreOnOpen(pluginName)
      emiter.emit('onRestorePluginLastExecute', pluginName)
    }

    onMenuSelect({
      route: YakitRoute.Plugin_OP,
      pluginId: pluginId || 0,
      pluginName: pluginName || '',
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
  const [recentPlugins, setRecentPlugins] = useState<{ name: string; id?: number; headImg?: string }[]>([])
  const [search, setSearch] = useState<PluginSearchParams>(defaultSearch)
  const [searchedKeyword, setSearchedKeyword] = useState('')
  const [searchLocal, setSearchLocal] = useState<SearchPluginItem[]>([])
  const [searchOnline, setSearchOnline] = useState<SearchPluginItem[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  const getSearchKeyword = useMemoizedFn((s: PluginSearchParams) => {
    switch (s.type) {
      case 'userName':
        return s.userName || ''
      case 'tag':
        return s.tag || ''
      case 'fieldKeywords':
        return s.fieldKeywords || ''
      default:
        return s.keyword || ''
    }
  })

  const jumpOnlinePlugin = useMemoizedFn((item: SearchPluginItem) => {
    if (!item.uuid) return
    setListShow(false)
    grpcDownloadOnlinePlugin({ uuid: item.uuid }).then((res) => {
      onMenu(+res.Id || 0, res.ScriptName || item.name)
    })
  })

  const onSearch = useMemoizedFn(async (value: PluginSearchParams) => {
    const keyword = getSearchKeyword(value).trim()
    setSearchedKeyword(keyword)
    if (!keyword) {
      setSearchLocal([])
      setSearchOnline([])
      setSearchLoading(false)
      return
    }
    setSearchLoading(true)
    try {
      const pageParams = { page: 1, limit: 9999 }
      const [localRes, onlineRes] = await Promise.all([
        ipcRenderer.invoke(
          'QueryYakScript',
          convertLocalPluginsRequestParams({ filter: defaultFilter, search: value, pageParams }),
        ),
        apiFetchOnlineList(convertPluginsRequestParams(defaultFilter, value, pageParams), true),
      ])
      setSearchLocal(
        (localRes?.Data || []).map((item: any) => ({
          name: item.ScriptName,
          id: item.Id,
          headImg: item.HeadImg,
        })),
      )
      setSearchOnline(
        (onlineRes?.data || []).map((item: any) => ({
          name: item.script_name,
          uuid: item.uuid,
          headImg: item.head_img,
        })),
      )
    } finally {
      setSearchLoading(false)
    }
  })

  const renderPluginOpt = useMemoizedFn(
    (
      item: { name: string; headImg?: string; id?: number; label?: string },
      onClick: () => void,
      disabled?: boolean,
      showLoading?: boolean,
    ) => (
      <Tooltip key={item.name} placement="bottom" title={item.label || item.name}>
        <div
          className={classNames(styles['plugins-opt'], {
            [styles['disable-style']]: !!disabled,
          })}
          onClick={(e) => {
            if (disabled) {
              e.preventDefault()
              e.stopPropagation()
              return
            }
            onClick()
          }}
        >
          {showLoading && (
            <div className={styles['loading-style']} onClick={(e) => e.stopPropagation()}>
              <LoadingOutlined />
            </div>
          )}
          <Avatar className={styles['avatar-style']} src={item.headImg} icon={<PublicDefaultPluginIcon />} />
          <div className={classNames(styles['opt-title'], 'content-ellipsis')} title={item.label || item.name}>
            {item.label || item.name}
          </div>
        </div>
      </Tooltip>
    ),
  )

  const onListVisibleChange = useMemoizedFn((visible: boolean) => {
    setListShow(visible)
    if (!visible) return
    getPluginUsageCache().then((usage) => {
      setRecentPlugins(
        Object.entries(usage)
          .sort((a, b) => b[1].lastUsedAt - a[1].lastUsedAt)
          .slice(0, 10)
          .map(([name, item]) => ({ name, id: item.id, headImg: item.headImg })),
      )
    })
  })

  const renderSearchListDom = useMemo(
    () => (
      <YakitSpin spinning={searchLoading}>
        <div className={styles['plugins-wrapper']}>
          <div className={styles['plugins-title']}>{t('Layout.ExtraMenu.localPlugin')}</div>
          <div className={styles['plugins-body']}>
            {searchLocal.map((item) => renderPluginOpt(item, () => onMenu(item.id || 0, item.name)))}
            {!searchLoading && !searchLocal.length && (
              <div className={styles['search-empty']}>{t('YakitEmpty.noData')}</div>
            )}
          </div>
        </div>
        <div className={styles['plugin-search-divider']} />
        <div className={styles['plugins-wrapper']}>
          <div className={styles['plugins-title']}>{t('Layout.MenuPlugin.allPlugin')}</div>
          <div className={styles['plugins-body']}>
            {searchOnline.map((item) =>
              renderPluginOpt({ name: item.uuid || item.name, label: item.name, headImg: item.headImg }, () =>
                jumpOnlinePlugin(item),
              ),
            )}
            {!searchLoading && !searchOnline.length && (
              <div className={styles['search-empty']}>{t('YakitEmpty.noData')}</div>
            )}
          </div>
        </div>
      </YakitSpin>
    ),
    [searchLocal, searchOnline, searchLoading, i18n.language, jumpOnlinePlugin, renderPluginOpt, onMenu],
  )

  const renderRecentPluginsDom = useMemo(() => {
    if (!recentPlugins.length) return null
    return (
      <>
        <div className={styles['plugins-wrapper']}>
          <div className={styles['plugins-title']}>{t('Layout.MenuPlugin.recentUsed')}</div>
          <div className={styles['plugins-body']}>
            {recentPlugins.map((item) =>
              renderPluginOpt(item, () => onMenu(item.id || 0, item.name, true), !item.id, loading),
            )}
          </div>
        </div>
        {pluginList.length > 0 && (
          <div className={styles['plugin-divider']}>
            <div className={styles['divider-style']}></div>
          </div>
        )}
      </>
    )
  }, [recentPlugins, pluginList, loading, renderPluginOpt, onMenu, i18n.language])

  const listDom = useMemo(() => {
    const hasSearch = !!searchedKeyword
    return (
      <div className={styles['plugin-list-wrapper']}>
        <div className={styles['list-body']}>
          <div className={styles['list-body-search']}>
            <FuncSearch value={search} onChange={setSearch} onSearch={onSearch} />
          </div>
          {hasSearch && renderSearchListDom}
          {!hasSearch && renderRecentPluginsDom}
          {!hasSearch &&
            pluginList.map((item, index) => {
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
          <div className={classNames(styles['btn-style'], styles['restore-style'])} onClick={onClickRestore}>
            {t('Layout.MenuPlugin.restoreMenu')}
          </div>
        </div>
      </div>
    )
  }, [pluginList, loading, i18n.language, search, renderRecentPluginsDom, renderSearchListDom, searchedKeyword])

  if (props.children) {
    return (
      <div className={classNames(styles['plugin-btn'], { [styles['plugin-active-btn']]: listShow })}>
        <YakitPopover
          classNames={{ root: styles['plugin-list-popover'] }}
          styles={{ root: { paddingTop: 6 } }}
          placement="bottom"
          trigger={'click'}
          content={listDom}
          open={listShow}
          onOpenChange={onListVisibleChange}
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
              classNames={{ root: styles['plugin-list-popover'] }}
              placement="bottomRight"
              trigger={'click'}
              content={listDom}
              open={listShow}
              onOpenChange={onListVisibleChange}
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
