import { useEffect, useMemo, useRef, useState } from 'react'
import { Spin, Tooltip } from 'antd'
import { useMemoizedFn } from 'ahooks'
import cloneDeep from 'lodash/cloneDeep'
import classNames from 'classnames'
import { YakitRouteToPageInfo } from '@/routes/newRoute'
import type { YakitRoute } from '@/enums/yakitRoute'
import {
  pageEventMaps,
  type ShortcutKeyEventInfo,
  type ShortcutKeyPageName,
} from '@/utils/globalShortcutKey/events/pageMaps'
import { convertKeyboardToUIKey, setIsActiveShortcutKeyPage } from '@/utils/globalShortcutKey/utils'
import { isConflictToYakEditor } from '@/utils/globalShortcutKey/events/page/yakEditor'
import { type GlobalShortcutKey } from '@/utils/globalShortcutKey/events/global'
import { YakitKeyBoard } from '@/utils/globalShortcutKey/keyboard'
import emiter from '@/utils/eventBus/eventBus'
import { GetReleaseEdition } from '@/utils/envfile'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { PaintbrushOutlined, RefreshOutlined, SearchOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { failed } from '@/utils/notification'
import { type TFunction, useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import {
  findContextMenuPluginShortcutConflict,
  refreshContextMenuShortcutCache,
} from '@/pages/manageRightClickPlugins/shortcut'
import styles from './ShortcutKeySettings.module.scss'

const getShortcutPageName = (page: ShortcutKeyPageName, t: TFunction) => {
  if (page === 'global') {
    return t('ShortcutKey.global')
  } else if (page === 'yakit-multiple') {
    return t('ShortcutKey.multiple')
  } else if (page === 'chat-cs') {
    return 'ChatCS'
  } else if (page === 'yak-editor') {
    return t('ShortcutKey.editor')
  } else if (page === 'hot-patch-management') {
    return t('ShortcutKey.hotPatchManagement')
  } else {
    return `${YakitRouteToPageInfo[page as YakitRoute].label}`
  }
}

const getEventKeys = (data: Record<string, ShortcutKeyEventInfo>) => {
  return Object.keys(data).filter((item) => {
    const key = item as GlobalShortcutKey
    return !data[key].scopeShow || (data[key].scopeShow || []).includes(GetReleaseEdition())
  })
}

export const ShortcutKeySettings: React.FC = () => {
  const { t, i18nRefresh } = useI18nNamespaces(['shortcutKey', 'setting', 'utils', 'yakitUi', 'history'])
  const wrapper = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [groups, setGroups] = useState<Record<string, Record<string, ShortcutKeyEventInfo>>>({})

  const visiblePages = useMemo(() => {
    return (Object.keys(pageEventMaps) as ShortcutKeyPageName[]).filter((item) => {
      return !pageEventMaps[item].scopeShow || (pageEventMaps[item].scopeShow || []).includes(GetReleaseEdition())
    })
  }, [])

  const getData = useMemoizedFn(() => {
    try {
      setLoading(true)
      visiblePages.forEach((page) => {
        pageEventMaps[page].getStorage()
      })
      setTimeout(() => {
        const next: Record<string, Record<string, ShortcutKeyEventInfo>> = {}
        visiblePages.forEach((page) => {
          next[page] = pageEventMaps[page].getEvents()
        })
        setGroups(next)
        setLoading(false)
      }, 200)
    } catch (error) {
      failed(t('ShortcutKey.loadFailed'))
      setGroups({})
      setLoading(false)
    }
  })

  useEffect(() => {
    getData()
  }, [])

  const editInfo = useRef<{ page: ShortcutKeyPageName; key: string } | null>(null)
  const [keyShow, setKeyShow] = useState(false)
  const [inputKeys, setInputKeys] = useState<YakitKeyBoard[]>([])
  const [warnInfo, setWarnInfo] = useState<string>()

  const handleOpenKeyShow = useMemoizedFn(async (page: ShortcutKeyPageName, key: string) => {
    if (keyShow) return
    // 录制比对依赖右键插件快捷键缓存：先刷新完成再打开弹窗，避免 grpc 未返回时用旧缓存漏报冲突
    await refreshContextMenuShortcutCache()
    setIsActiveShortcutKeyPage(true)
    editInfo.current = { page, key }
    setKeyShow(true)
  })

  const handleCallbackKeyShow = useMemoizedFn((show: boolean) => {
    if (show && inputKeys.length > 0 && editInfo.current) {
      const { page, key } = editInfo.current
      setGroups((old) => {
        const infos = cloneDeep(old[page] || {})
        if (!infos[key]) return old
        infos[key].keys = inputKeys as YakitKeyBoard[]
        pageEventMaps[page].setStorage(infos)
        return { ...old, [page]: infos }
      })
    }
    setIsActiveShortcutKeyPage(false)
    setKeyShow(false)
    editInfo.current = null
    setInputKeys([])
    setWarnInfo(undefined)
  })

  const handleShortcutKey = useMemoizedFn((name: string) => {
    if (name.indexOf('setShortcutKey') > -1) {
      const regex = /\(([^)]+)\)/
      const result = name.match(regex)
      if (result && result[1]) {
        if (result[1] === YakitKeyBoard.Escape) {
          handleCallbackKeyShow(false)
        } else if (result[1] === YakitKeyBoard.Enter) {
          handleCallbackKeyShow(true)
        } else {
          const keys = result[1].split('|') as YakitKeyBoard[]
          const info =
            isConflictToYakEditor(keys) || findContextMenuPluginShortcutConflict(keys, editInfo.current?.page)
          setWarnInfo(info)
          setInputKeys(keys)
        }
      }
    }
  })

  useEffect(() => {
    emiter.on('onGlobalShortcutKey', handleShortcutKey)
    return () => {
      emiter.off('onGlobalShortcutKey', handleShortcutKey)
    }
  }, [])

  const resetPage = useMemoizedFn((page: ShortcutKeyPageName) => {
    pageEventMaps[page].resetEvents()
    pageEventMaps[page].getStorage()
    setTimeout(() => {
      setGroups((old) => ({ ...old, [page]: pageEventMaps[page].getEvents() }))
    }, 200)
  })

  const resetOne = useMemoizedFn((page: ShortcutKeyPageName, key: string) => {
    const current = cloneDeep(pageEventMaps[page].getEvents())
    pageEventMaps[page].resetEvents()
    const defaults = pageEventMaps[page].getEvents()
    const next = { ...current, [key]: cloneDeep(defaults[key]) }
    pageEventMaps[page].setStorage(next)
    setGroups((old) => ({ ...old, [page]: next }))
  })

  const resetAll = useMemoizedFn(() => {
    visiblePages.forEach((page) => {
      pageEventMaps[page].resetEvents()
    })
    getData()
  })

  const sections = useMemo(() => {
    const k = keyword.trim().toLowerCase()
    return visiblePages
      .map((page) => {
        const data = groups[page] || {}
        const items = getEventKeys(data)
          .map((key) => {
            const info = data[key]
            return {
              key,
              name: t(info.name),
              keys: info.keys,
            }
          })
          .filter((item) => !k || item.name.toLowerCase().includes(k))
        return {
          page,
          title: getShortcutPageName(page, t),
          items,
        }
      })
      .filter((section) => section.items.length > 0)
  }, [groups, keyword, visiblePages, t, i18nRefresh])

  const editingKey = editInfo.current && keyShow ? `${editInfo.current.page}:${editInfo.current.key}` : ''

  const getModalContainer = useMemoizedFn(() => {
    return (
      (wrapper.current?.closest('[data-settings-content]') as HTMLElement | null) || wrapper.current || document.body
    )
  })

  return (
    <div ref={wrapper} className={styles['shortcut']}>
      <Spin spinning={loading}>
        <div className={styles['shortcut-body']}>
          <div className={styles['head-block']}>
            <div className={styles['page-head']}>
              <div className={styles['page-title']}>{t('SettingsPage.item.shortcut-key')}</div>
              <YakitButton
                type="outline1"
                colors="danger"
                icon={<RefreshOutlined color="currentColor" />}
                onClick={resetAll}
              >
                {t('ShortcutKey.resetAll')}
              </YakitButton>
            </div>
            <div className={styles['search-input']}>
              <YakitInput
                size="large"
                allowClear
                placeholder={t('SettingsPage.searchPlaceholder')}
                prefix={<SearchOutlined color="currentColor" />}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
          </div>

          {sections.map((section) => (
            <div key={section.page} className={styles['section']}>
              <div className={styles['section-head']}>
                <div className={styles['section-title']}>{section.title}</div>
                <YakitButton
                  type="text2"
                  size="small"
                  icon={<RefreshOutlined color="currentColor" />}
                  onClick={() => resetPage(section.page)}
                />
              </div>
              <div className={styles['list-panel']}>
                {section.items.map((item) => {
                  const active = editingKey === `${section.page}:${item.key}`
                  return (
                    <div key={item.key} className={styles['setting-row']}>
                      <div className={styles['setting-row-title']}>{item.name}</div>
                      <YakitTag
                        border
                        className={styles['key-tag']}
                        color={active ? 'main' : undefined}
                        onClick={() => handleOpenKeyShow(section.page, item.key)}
                      >
                        {convertKeyboardToUIKey(item.keys)}
                      </YakitTag>
                      <Tooltip title={t('ShortcutKey.restoreDefaultItem')}>
                        <YakitButton
                          type="text2"
                          size="small"
                          icon={<PaintbrushOutlined color="currentColor" />}
                          onClick={() => resetOne(section.page, item.key)}
                        />
                      </Tooltip>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          <YakitModal
            getContainer={getModalContainer}
            rootClassName={styles['shortcut-modal-root']}
            type="white"
            title={t('ShortcutKey.editShortcut')}
            centered
            keyboard={false}
            footer={null}
            maskClosable={false}
            styles={{ mask: { backgroundColor: 'transparent' } }}
            open={keyShow}
            onCancel={() => {
              handleCallbackKeyShow(false)
            }}
          >
            <div className={styles['set-shortcut-key-wrapper']}>
              <div className={styles['modal-title']}>{t('ShortcutKey.hint')}</div>
              <div className={classNames(styles['input'], { [styles['empty']]: inputKeys.length === 0 })}>
                {inputKeys.join(' ')}
              </div>
              <div className={styles['keys-ui']}>
                {convertKeyboardToUIKey(inputKeys) && (
                  <YakitTag className={styles['key-tag']} color="main">
                    {convertKeyboardToUIKey(inputKeys)}
                  </YakitTag>
                )}
                {warnInfo && <span className={styles['warn']}>（{warnInfo}）</span>}
              </div>
            </div>
          </YakitModal>
        </div>
      </Spin>
    </div>
  )
}
