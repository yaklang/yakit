import React, { useMemo } from 'react'
import classNames from 'classnames'
import { useMemoizedFn } from 'ahooks'
import { IconSolidAIIcon, IconSolidAIWhiteIcon } from '@/assets/icon/colors'
import { showResponseViaHTTPFlowID } from '@/components/ShowInBrowser'
import { showByRightContext } from '@/components/yakitUI/YakitMenu/showByRightContext'
import { setClipboardText } from '@/utils/clipboard'
import emiter from '@/utils/eventBus/eventBus'
import { isEnpriTrace } from '@/utils/envfile'
import { getGlobalShortcutKeyEvents, GlobalShortcutKey } from '@/utils/globalShortcutKey/events/global'
import {
  getYakitMultipleShortcutKeyEvents,
  YakitMultipleShortcutKey,
} from '@/utils/globalShortcutKey/events/multiple/yakitMultiple'
import { convertKeyboardToUIKey } from '@/utils/globalShortcutKey/utils'
import { debugToPrintLogs } from '@/utils/logCollection'
import { yakitNotify } from '@/utils/notification'
import { openExternalWebsite, saveABSFileToOpen } from '@/utils/openWebsite'
import type { TFunction } from '@/i18n/useI18nNamespaces'
import type { i18n as I18nInstance } from 'i18next'
import { generateCSRFPocByRequest } from '@/pages/invoker/fromPacketToYakCode'
import { GetPacketScanByCursorMenuItem, packetScanDefaultValue } from '@/pages/packetScanner/DefaultPacketScanGroup'
import { execPacketScan } from '@/pages/packetScanner/PacketScanner'
import { newWebsocketFuzzerTab } from '@/pages/websocket/WebsocketFuzzer'
import { availableColors } from './HTTPFlowTable.availableColors'
import {
  CalloutColor,
  calloutColorBatch,
  onBatchExecPacketScan,
  onRemoveCalloutColor,
  onRemoveCalloutColorBatch,
  onSendToTab,
  toggleHTTPFlowFavorite,
  toggleHTTPFlowFavoriteBatch,
} from './HTTPFlowTable.actions'
import type { HistoryMenuData, HTTPFlow } from './HTTPFlowTable.constants'
import { isHTTPFlowFavorite } from './HTTPFlowTable.utils'
import style from './HTTPFlowTable.module.scss'

const { ipcRenderer } = window.require('electron')

export interface UseHTTPFlowTableContextMenuOptions {
  t: TFunction
  i18n: I18nInstance
  userInfo: { isLogin: boolean }
  data: HTTPFlow[]
  setData: React.Dispatch<React.SetStateAction<HTTPFlow[]>>
  onlyFavorite: boolean
  selected: HTTPFlow | undefined
  selectedRowKeys: string[]
  selectedRows: HTTPFlow[]
  isAllSelect: boolean
  total: number
  downstreamProxyStr: string
  fromMITM: boolean
  setSelected: (row: HTTPFlow) => void
  setSelectedRowKeys: (keys: string[]) => void
  setSelectedRows: (rows: HTTPFlow[]) => void
  setBatchVisible: (visible: boolean) => void
  setCompareLeft: (value: { content: string; language: string }) => void
  setCompareRight: (value: { content: string; language: string }) => void
  getUrlWithoutQuery: (url?: string) => string
  getCodecHistoryPlugin: () => HistoryMenuData[]
  getCodecAIPlugin: () => HistoryMenuData[]
  codecMultipleHistoryPluginCom: unknown
  codecSingleHistoryPluginCom: unknown
  selectedRowKeysCom: unknown
  onRemoveHttpHistory: (query: Record<string, unknown>) => void
  onShareData: (ids: string[], number: number) => void
  onUploadData: (ids: string[]) => void
  onEditTags: (flow: HTTPFlow) => void
  onHTTPFlowTableRowDoubleClick: (flow: HTTPFlow) => void
  onExcelExport: (list: HTTPFlow[]) => void
  onHarExport: (ids: number[]) => void
  onPocMould: (flow: HTTPFlow) => void
  onBatchPocMould: (flow: HTTPFlow) => void
  onShieldRecord: (flow: HTTPFlow) => void
  onShieldURL: (flow: HTTPFlow) => void
  onShieldDomain: (flow: HTTPFlow) => void
  onBatch: (f: (element: HTTPFlow) => void, number: number, all?: boolean) => void
  onViewAttachmentDataRefresh: (id: number) => void
}

export const useHTTPFlowTableContextMenu = (options: UseHTTPFlowTableContextMenuOptions) => {
  const {
    t,
    i18n,
    userInfo,
    data,
    setData,
    onlyFavorite,
    selected,
    selectedRowKeys,
    selectedRows,
    isAllSelect,
    total,
    downstreamProxyStr,
    fromMITM,
    setSelected,
    setSelectedRowKeys,
    setSelectedRows,
    setBatchVisible,
    setCompareLeft,
    setCompareRight,
    getUrlWithoutQuery,
    getCodecHistoryPlugin,
    getCodecAIPlugin,
    codecMultipleHistoryPluginCom,
    codecSingleHistoryPluginCom,
    selectedRowKeysCom,
    onRemoveHttpHistory,
    onShareData,
    onUploadData,
    onEditTags,
    onHTTPFlowTableRowDoubleClick,
    onExcelExport,
    onHarExport,
    onPocMould,
    onBatchPocMould,
    onShieldRecord,
    onShieldURL,
    onShieldDomain,
    onBatch,
    onViewAttachmentDataRefresh
  } = options

  const menuData = useMemo(() => {
    let menu: HistoryMenuData[] = [
      {
        key: '发送到 Web Fuzzer',
        label: t('HTTPFlowTable.RowContextMenu.sendToWebFuzzer'),
        number: 10,
        default: true,
        webSocket: false,
        children: [
          {
            key: 'sendAndJumpToWebFuzzer',
            label: t('HTTPFlowTable.RowContextMenu.sendAndRedirect'),
            keybindings: getGlobalShortcutKeyEvents()[GlobalShortcutKey.CommonSendAndJumpToWebFuzzer].keys,
          },
          {
            key: 'sendToWebFuzzer',
            label: t('HTTPFlowTable.RowContextMenu.sendOnly'),
            keybindings: getGlobalShortcutKeyEvents()[GlobalShortcutKey.CommonSendToWebFuzzer].keys,
          },
        ],
        onClickBatch: () => {},
      },
      {
        key: '发送到 WS Fuzzer',
        label: t('HTTPFlowTable.RowContextMenu.sendToWSFuzzer'),
        number: 10,
        webSocket: true,
        default: false,
        children: [
          {
            key: 'sendAndJumpToWS',
            label: t('HTTPFlowTable.RowContextMenu.sendAndRedirect'),
            keybindings: getGlobalShortcutKeyEvents()[GlobalShortcutKey.CommonSendAndJumpToWebFuzzer].keys,
          },
          {
            key: 'sendToWS',
            label: t('HTTPFlowTable.RowContextMenu.sendOnly'),
            keybindings: getGlobalShortcutKeyEvents()[GlobalShortcutKey.CommonSendToWebFuzzer].keys,
          },
        ],
        onClickBatch: () => {},
      },
      {
        key: 'favorite',
        label: t('HTTPFlowTable.RowContextMenu.favorite'),
        default: true,
        webSocket: true,
        number: 20,
        onClickSingle: (v) => toggleHTTPFlowFavorite(v, !isHTTPFlowFavorite(v), setData, onlyFavorite),
        onClickBatch: (list, n) =>
          toggleHTTPFlowFavoriteBatch({
            flowList: list,
            number: n!,
            favorite: true,
            data,
            onlyFavorite,
            setData,
            setSelectedRowKeys,
            setSelectedRows,
            t,
          }),
      },
      {
        key: 'cancelFavorite',
        label: t('HTTPFlowTable.RowContextMenu.cancelFavorite'),
        default: false,
        webSocket: false,
        number: 20,
        onClickBatch: (list, n) =>
          toggleHTTPFlowFavoriteBatch({
            flowList: list,
            number: n!,
            favorite: false,
            data,
            onlyFavorite,
            setData,
            setSelectedRowKeys,
            setSelectedRows,
            t,
          }),
      },
      {
        key: '数据包扫描',
        label: t('HTTPFlowTable.RowContextMenu.packetScan'),
        number: 200,
        default: true,
        webSocket: false,
        onClickSingle: () => {},
        onClickBatch: () => {},
        children: GetPacketScanByCursorMenuItem(selected?.Id || 0)?.subMenuItems?.map((ele) => ({
          key: ele.title,
          label: t(ele.title),
        })),
      },
      {
        key: '插件扩展',
        label: t('HTTPFlowTable.RowContextMenu.pluginExtension'),
        default: true,
        webSocket: false,
        onClickSingle: () => {},
        onClickBatch: () => {},
        children: getCodecHistoryPlugin(),
      },
      {
        key: 'AI插件',
        label: (
          <>
            <IconSolidAIIcon className={'ai-plugin-menu-icon-default'} />
            <IconSolidAIWhiteIcon className={'ai-plugin-menu-icon-hover'} />
            {t('HTTPFlowTable.RowContextMenu.aiPlugin')}
          </>
        ),
        default: true,
        webSocket: false,
        onClickSingle: () => {},
        onClickBatch: () => {},
        children: getCodecAIPlugin(),
      },
      {
        key: 'copyUrlWithQuery',
        label: t('YakitEditor.HTTPPacketYakitEditor.copyUrlWithQuery'),
        number: 30,
        webSocket: true,
        default: true,
        keybindings: getYakitMultipleShortcutKeyEvents()[YakitMultipleShortcutKey.TableCopyUrlWithQuery].keys,
        onClickSingle: (v) => setClipboardText(v.Url || ''),
        onClickBatch: (v, number) => {
          if (v.length === 0) {
            yakitNotify('warning', t('HTTPFlowTable.pleaseSelectData'))
            return
          }
          if (v.length < number!) {
            setClipboardText(v.map((ele) => `${ele.Url}`).join('\r\n'))
            setSelectedRowKeys([])
            setSelectedRows([])
          } else {
            yakitNotify('warning', t('HTTPFlowTable.copyLimit', { number }))
          }
        },
      },
      {
        key: 'copyUrlWithoutQuery',
        label: t('YakitEditor.HTTPPacketYakitEditor.copyUrlWithoutQuery'),
        number: 30,
        webSocket: true,
        default: true,
        keybindings: getYakitMultipleShortcutKeyEvents()[YakitMultipleShortcutKey.TableCopyUrlWithoutQuery].keys,
        onClickSingle: (v) => {
          const nextUrl = getUrlWithoutQuery(v.Url)
          if (!nextUrl) {
            yakitNotify('info', t('YakitEditor.HTTPPacketYakitEditor.urlNotExist'))
            return
          }
          setClipboardText(nextUrl)
        },
        onClickBatch: (v, number) => {
          if (v.length === 0) {
            yakitNotify('warning', t('HTTPFlowTable.pleaseSelectData'))
            return
          }
          if (v.length < number!) {
            const urls = v.map((ele) => getUrlWithoutQuery(ele.Url)).filter((url) => !!url)
            if (!urls.length) {
              yakitNotify('info', t('YakitEditor.HTTPPacketYakitEditor.urlNotExist'))
              return
            }
            setClipboardText(urls.join('\r\n'))
            setSelectedRowKeys([])
            setSelectedRows([])
          } else {
            yakitNotify('warning', t('HTTPFlowTable.copyLimit', { number }))
          }
        },
      },
      {
        key: '下载 Response Body',
        label: t('HTTPFlowTable.RowContextMenu.downloadResponseBody'),
        default: true,
        webSocket: false,
        onClickSingle: (v) => {
          ipcRenderer.invoke('GetResponseBodyByHTTPFlowID', { Id: v.Id }).then((bytes: { Raw: Uint8Array }) => {
            saveABSFileToOpen(`response-body.txt`, bytes.Raw)
          })
        },
      },
      {
        key: '浏览器中打开URL',
        label: t('HTTPFlowTable.RowContextMenu.openURLInBrowser'),
        default: true,
        webSocket: false,
        keybindings: getYakitMultipleShortcutKeyEvents()[YakitMultipleShortcutKey.TableOpenUrlInBrowser].keys,
        onClickSingle: (v) => {
          v.Url && openExternalWebsite(v.Url)
        },
      },
      {
        key: '浏览器中查看响应',
        label: t('HTTPFlowTable.RowContextMenu.viewResponseInBrowser'),
        default: true,
        webSocket: false,
        keybindings: getYakitMultipleShortcutKeyEvents()[YakitMultipleShortcutKey.TableViewResponseInBrowser].keys,
        onClickSingle: (v) => {
          showResponseViaHTTPFlowID(v)
        },
      },
      {
        key: '复制为 CSRF Poc',
        label: t('YakitEditor.HTTPPacketYakitEditor.copyAsCsrfPoc'),
        default: true,
        webSocket: false,
        children: [
          {
            key: 'csrfpoc',
            label: t('YakitEditor.HTTPPacketYakitEditor.copyAsCsrfPocBasic'),
            keybindings: getYakitMultipleShortcutKeyEvents()[YakitMultipleShortcutKey.TableCopyAsCsrfPocBasic].keys,
          },
          {
            key: 'auto-submit-csrf-poc',
            label: t('YakitEditor.HTTPPacketYakitEditor.copyAsCsrfPocAutoSubmit'),
            keybindings:
              getYakitMultipleShortcutKeyEvents()[YakitMultipleShortcutKey.TableCopyAsCsrfPocAutoSubmit].keys,
          },
        ],
      },
      {
        key: '复制为 Yak PoC 模版',
        label: t('HTTPFlowTable.RowContextMenu.copyAsYakPoCTemplate'),
        default: true,
        webSocket: false,
        onClickSingle: () => {},
        children: [
          {
            key: '数据包 PoC 模版',
            label: t('HTTPFlowTable.RowContextMenu.packetPoCTemplate'),
          },
          {
            key: '批量检测 PoC 模版',
            label: t('HTTPFlowTable.RowContextMenu.batchTestPoCTemplate'),
          },
        ],
      },
      {
        key: '标注颜色',
        label: t('HTTPFlowTable.RowContextMenu.tagColor'),
        default: true,
        webSocket: false,
        number: 20,
        onClickSingle: () => {},
        onClickBatch: () => {},
        children: availableColors.map((i) => {
          return {
            key: i.title,
            label: i.render(t),
            onClick: (v) => CalloutColor(v, i, data, setData),
            onClickBatch: (list, n) =>
              calloutColorBatch({
                flowList: list,
                number: n!,
                colorItem: i,
                data,
                setData,
                setSelectedRowKeys,
                setSelectedRows,
                t,
              }),
          }
        }),
      },
      {
        key: '移除颜色',
        label: t('HTTPFlowTable.RowContextMenu.removeColor'),
        default: true,
        webSocket: false,
        number: 20,
        onClickSingle: (v) => onRemoveCalloutColor(v, data, setData),
        onClickBatch: (list, n) =>
          onRemoveCalloutColorBatch({
            flowList: list,
            number: n!,
            data,
            setData,
            setSelectedRowKeys,
            setSelectedRows,
            t,
          }),
      },
      {
        key: '发送到对比器',
        label: t('HTTPFlowTable.RowContextMenu.sendToComparer'),
        default: true,
        webSocket: false,
        onClickSingle: () => {},
        children: [
          {
            key: '发送到对比器左侧',
            label: t('HTTPFlowTable.RowContextMenu.sendToComparerLeft'),
            // disabled: [false, true, false][compareState]
          },
          {
            key: '发送到对比器右侧',
            label: t('HTTPFlowTable.RowContextMenu.sendToComparerRight'),
            // disabled: [false, false, true][compareState]
          },
        ],
      },
      {
        key: '屏蔽',
        label: t('HTTPFlowTable.RowContextMenu.block'),
        webSocket: true,
        default: true,
        onClickSingle: () => {},
        children: [
          {
            key: '屏蔽该记录',
            label: t('HTTPFlowTable.RowContextMenu.blockRecord'),
            keybindings: getYakitMultipleShortcutKeyEvents()[YakitMultipleShortcutKey.TableBlockRecord].keys,
          },
          {
            key: '屏蔽URL',
            label: t('HTTPFlowTable.RowContextMenu.blockURL'),
            keybindings: getYakitMultipleShortcutKeyEvents()[YakitMultipleShortcutKey.TableBlockURL].keys,
          },
          {
            key: '屏蔽域名',
            label: t('HTTPFlowTable.RowContextMenu.blockDomain'),
            keybindings: getYakitMultipleShortcutKeyEvents()[YakitMultipleShortcutKey.TableBlockDomain].keys,
          },
        ],
      },
      {
        key: '删除',
        label: t('HTTPFlowTable.RowContextMenu.delete'),
        webSocket: true,
        default: true,
        onClickSingle: () => {},
        onClickBatch: () => {},
        all: true,
        children: [
          {
            key: '删除记录',
            label: t('HTTPFlowTable.RowContextMenu.deleteRecord'),
            keybindings: getYakitMultipleShortcutKeyEvents()[YakitMultipleShortcutKey.TableDeleteRecord].keys,
            onClick: (v) => onRemoveHttpHistory({ Id: [v.Id] }),
            onClickBatch: (list) => {
              onRemoveHttpHistory({ Id: list.map((ele) => ele.Id) })
            },
          },
          {
            key: '删除URL',
            label: t('HTTPFlowTable.RowContextMenu.deleteURL'),
            keybindings: getYakitMultipleShortcutKeyEvents()[YakitMultipleShortcutKey.TableDeleteURL].keys,
            onClick: (v) => onRemoveHttpHistory({ URLPrefix: v.Url }),
            onClickBatch: (list) => {
              const urls = list.map((ele) => ele.Url)
              onRemoveHttpHistory({
                Filter: {
                  IncludeInUrl: urls,
                },
              })
            },
          },
          {
            key: '删除域名',
            label: t('HTTPFlowTable.RowContextMenu.deleteDomain'),
            keybindings: getYakitMultipleShortcutKeyEvents()[YakitMultipleShortcutKey.TableDeleteDomain].keys,
            onClick: (v) => onRemoveHttpHistory({ URLPrefix: v?.HostPort?.split(':')[0] }),
            onClickBatch: (list) => {
              const hosts = list.map((ele) => ele.HostPort?.split(':')[0])
              onRemoveHttpHistory({
                Filter: {
                  IncludeInUrl: hosts,
                },
              })
            },
          },
        ],
      },
      {
        key: '分享数据包',
        label: t('HTTPFlowTable.RowContextMenu.sharePacket'),
        number: 30,
        default: true,
        webSocket: false,
        onClickSingle: (v) => onShareData([v.Id + ''], 50),
        onClickBatch: (list, n) => {
          const ids: string[] = list.map((ele) => ele.Id + '')
          onShareData(ids, n!)
        },
      },
      {
        key: 'viewAttach',
        label: t('HTTPFlowTable.RowContextMenu.viewAttach'),
        default: true,
        webSocket: false,
        onClickSingle: (v) => onViewAttachmentDataRefresh(v.Id),
      },
      {
        key: '导出数据',
        label: t('HTTPFlowTable.RowContextMenu.exportData'),
        default: true,
        webSocket: false,
        onClickSingle: () => {},
        onClickBatch: () => {},
        children: [
          {
            key: '导出为Excel',
            label: t('HTTPFlowTable.RowContextMenu.exportToExcel'),
            onClick: (v) => onExcelExport([v]),
            onClickBatch: (list) => {
              onExcelExport(list)
            },
          },
          {
            key: '导出为HAR',
            label: t('HTTPFlowTable.RowContextMenu.exportToHAR'),
            onClick: (v) => onHarExport([v.Id]),
            onClickBatch: (list) => {
              onHarExport(list.map((item) => item.Id))
            },
          },
        ],
      },
      {
        key: '编辑tag',
        label: t('HTTPFlowTable.RowContextMenu.editTag'),
        default: true,
        webSocket: true,
        onClickSingle: (v) => onEditTags(v),
      },
      {
        key: '新窗口打开',
        label: t('HTTPFlowTable.RowContextMenu.openInNewWindow'),
        default: true,
        webSocket: true,
        onClickSingle: (v) => {
          onHTTPFlowTableRowDoubleClick(v)
        },
      },
    ]
    if (isEnpriTrace() && userInfo.isLogin) {
      menu.push({
        key: '上传数据',
        label: t('HTTPFlowTable.RowContextMenu.uploadData'),
        number: 30,
        default: true,
        webSocket: false,
        onClickSingle: (v) => onUploadData([v.Id + '']),
        onClickBatch: (list) => {
          const ids: string[] = list.map((ele) => ele.Id + '')
          onUploadData(ids)
        },
      })
    }
    return menu
  }, [
    userInfo.isLogin,
    i18n.language,
    codecMultipleHistoryPluginCom,
    codecSingleHistoryPluginCom,
    selectedRowKeysCom,
    selected?.Id,
    onlyFavorite,
    getUrlWithoutQuery,
  ])

  /** 菜单自定义快捷键渲染处理事件 */
  const contextMenuKeybindingHandle = useMemoizedFn((data) => {
    const menus: any = []
    for (let item of data) {
      /** 处理带快捷键的菜单项 */
      const info = { ...item }
      if (info.children && info.children.length > 0) {
        info.children = contextMenuKeybindingHandle(info.children)
      } else {
        if (info.keybindings && info.keybindings.length > 0) {
          const keysContent = convertKeyboardToUIKey(info.keybindings)

          info.label = keysContent ? (
            <div className={style['editor-context-menu-keybind-wrapper']}>
              <div className={style['content-style']}>{info.label}</div>
              <div className={classNames(style['keybind-style'], 'keys-style')}>{keysContent}</div>
            </div>
          ) : (
            info.label
          )
        }
      }
      menus.push(info)
    }
    return menus
  })

  const getRowContextMenu = useMemoizedFn((rowData: HTTPFlow) => {
    return contextMenuKeybindingHandle(menuData)
      .filter((item) => (rowData.IsWebsocket ? item.webSocket : item.default))
      .map((ele) => {
        const isFavoriteMenu = ele.key === 'favorite'
        return {
          label: isFavoriteMenu
            ? isHTTPFlowFavorite(rowData)
              ? t('HTTPFlowTable.RowContextMenu.cancelFavorite')
              : t('HTTPFlowTable.RowContextMenu.favorite')
            : ele.label,
          key: ele.key,
          children: ele.children || [],
        }
      })
  })

  const onRowContextMenu = (rowData: HTTPFlow, _, event: React.MouseEvent) => {
    if (rowData) {
      setSelected(rowData)
    }
    let rowContextmenu: any[] = []
    // 当存在history勾选时，替换为批量菜单
    if (selectedRowKeys.length > 0) {
      rowContextmenu = getBatchContextMenu()
    } else {
      rowContextmenu = getRowContextMenu(rowData)
    }

    showByRightContext(
      {
        width: 180,
        data: rowContextmenu,
        // openKeys:['复制为 Yak PoC 模版',],
        onClick: ({ key, keyPath }) => {
          if (selectedRowKeys.length > 0) {
            onMultipleClick(key, keyPath)
            return
          }
          if (keyPath.length === 2) {
            const menuName = keyPath[1]
            let menuItemName = keyPath[0]
            if (menuName === '插件扩展' || menuName === 'AI插件') {
              // 没有插件 下载codec插件
              if (key === 'Get*plug-in' || key === 'Get*ai-plug-in') {
                emiter.emit('onOpenFuzzerModal', JSON.stringify({ scriptName: key, isAiPlugin: 'isGetPlugin' }))
                return
              }
              if (isAllSelect) {
                yakitNotify('warning', t('HTTPFlowTable.batchOperationNoSelectAll'))
                return
              }
              try {
                rowContextmenu.forEach((item) => {
                  if (item.key === menuName && Array.isArray(item.children)) {
                    item.children.forEach((itemIn: HistoryMenuData) => {
                      if (itemIn.key === menuItemName) {
                        // 由于为保持key值唯一 添加了特定字符 现在移除掉
                        if (menuName === 'AI插件' && menuItemName.startsWith('aiplugin-')) {
                          menuItemName = menuItemName.slice('aiplugin-'.length)
                        }
                        emiter.emit(
                          'onOpenFuzzerModal',
                          JSON.stringify({
                            text: `${rowData.Id}`,
                            scriptName: menuItemName,
                            params: itemIn.params,
                            isAiPlugin: itemIn?.isAiPlugin,
                          }),
                        )
                      }
                    })
                  }
                })
              } catch (error) {}
              return
            }
          }

          if (keyPath.includes('数据包扫描')) {
            const scanItem = packetScanDefaultValue.find((e) => e.Verbose === key || e.VerboseUi === key)
            if (!scanItem) return
            execPacketScan({
              httpFlowIds: [rowData.Id],
              value: scanItem,
              https: rowData.IsHTTPS,
            })
            return
          }
          if (keyPath.includes('标注颜色')) {
            const colorItem = availableColors.find((e) => e.title === key)
            if (!colorItem) return
            CalloutColor(rowData, colorItem, data, setData)
            return
          }
          switch (key) {
            case 'csrfpoc':
              generateCSRFPocByRequest(
                rowData.Request,
                rowData.IsHTTPS,
                (e) => {
                  setClipboardText(e)
                },
                false,
              )
              break
            case 'auto-submit-csrf-poc':
              generateCSRFPocByRequest(
                rowData.Request,
                rowData.IsHTTPS,
                (e) => {
                  setClipboardText(e)
                },
                true,
              )
              break
            case '数据包 PoC 模版':
              onPocMould(rowData)
              break
            case '批量检测 PoC 模版':
              onBatchPocMould(rowData)
              break
            case '屏蔽该记录':
              onShieldRecord(rowData)
              break
            case '屏蔽URL':
              onShieldURL(rowData)
              break
            case '屏蔽域名':
              onShieldDomain(rowData)
              break
            case '删除记录':
              onRemoveHttpHistory({ Id: [rowData.Id] })
              break
            case '删除URL':
              onRemoveHttpHistory({ URLPrefix: rowData.Url })
              break
            case '删除域名':
              onRemoveHttpHistory({ URLPrefix: rowData?.HostPort?.split(':')[0] })
              break
            case '发送到对比器左侧':
              setCompareLeft({
                content: new Buffer(rowData.Request).toString('utf8'),
                language: 'http',
              })
              break
            case '发送到对比器右侧':
              setCompareRight({
                content: new Buffer(rowData.Request).toString('utf8'),
                language: 'http',
              })
              break
            case 'sendAndJumpToWebFuzzer':
              onSendToTab(rowData, true, downstreamProxyStr, fromMITM)
              break
            case 'sendToWebFuzzer':
              onSendToTab(rowData, false, downstreamProxyStr, fromMITM)
              break
            case 'sendAndJumpToWS':
              newWebsocketFuzzerTab(rowData.IsHTTPS, rowData.Request)
              break
            case 'sendToWS':
              newWebsocketFuzzerTab(rowData.IsHTTPS, rowData.Request, false)
              break
            case '导出为Excel':
              onExcelExport([rowData])
              break
            case '导出为HAR':
              onHarExport([rowData.Id])
              break
            default:
              const currentItem = menuData.find((f) => f.key === key)
              if (!currentItem) return
              if (currentItem.onClickSingle) currentItem.onClickSingle(rowData)
              break
          }
        },
      },
      event.clientX,
      event.clientY,
    )
  }

  const getBatchContextMenu = useMemoizedFn(() => {
    return menuData
      .filter((f) => f.onClickBatch)
      .map((m) => {
        return {
          key: m.key,
          label: m.label,
          children: m.children || [],
        }
      })
  })

  const onMultipleClick = useMemoizedFn((key: string, keyPath: string[]) => {
    const batchContextMenu = getBatchContextMenu()
    if (keyPath.length === 2) {
      const menuName = keyPath[1]
      let menuItemName = keyPath[0]
      if (menuName === '插件扩展' || menuName === 'AI插件') {
        // 没有插件 下载codec插件
        if (key === 'Get*plug-in' || key === 'Get*ai-plug-in') {
          emiter.emit('onOpenFuzzerModal', JSON.stringify({ scriptName: key, isAiPlugin: 'isGetPlugin' }))
          return
        }
        if (isAllSelect) {
          yakitNotify('warning', t('HTTPFlowTable.batchOperationNoSelectAll'))
          return
        }
        try {
          batchContextMenu.forEach((item) => {
            if (item.key === menuName && Array.isArray(item.children)) {
              item.children.forEach((itemIn: HistoryMenuData) => {
                if (itemIn.key === menuItemName) {
                  // 由于为保持key值唯一 添加了特定字符 现在移除掉
                  if (menuName === 'AI插件' && menuItemName.startsWith('aiplugin-')) {
                    menuItemName = menuItemName.slice('aiplugin-'.length)
                  }
                  emiter.emit(
                    'onOpenFuzzerModal',
                    JSON.stringify({
                      text: selectedRowKeys.join(','),
                      scriptName: menuItemName,
                      params: itemIn.params,
                      isAiPlugin: itemIn?.isAiPlugin,
                    }),
                  )
                }
              })
            }
          })
          setSelectedRowKeys([])
          setSelectedRows([])
        } catch (error) {
          debugToPrintLogs({
            page: 'HTTPFlowTable',
            fun: 'onMultipleClick',
            content: error,
          })
        }
        return
      }
    }

    if (keyPath.includes('数据包扫描')) {
      let sendIds: string[] = selectedRowKeys
      if (isAllSelect) {
        if (total > 200) {
          yakitNotify('warning', t('HTTPFlowTable.maxSendData', { number: 200 }))
          return
        } else {
          sendIds = data.map((item) => item.Id + '')
        }
      } else {
        if (sendIds.length > 200) {
          yakitNotify('warning', t('HTTPFlowTable.maxSendData', { number: 200 }))
          return
        }
      }
      const currentItemScan = menuData.find((f) => f.onClickBatch && f.key === '数据包扫描')
      const currentItemPacketScan = packetScanDefaultValue.find((f) => f.Verbose === key || f.VerboseUi === key)
      if (!currentItemScan || !currentItemPacketScan) return

      onBatchExecPacketScan({
        httpFlowIds: sendIds,
        maxLength: currentItemScan.number || 0,
        currentPacketScan: currentItemPacketScan,
      })
      return
    }
    if (keyPath.includes('标注颜色')) {
      const currentItemColor = menuData.find((f) => f.onClickBatch && f.key === '标注颜色')
      const colorItem = availableColors.find((e) => e.title === key)
      if (!currentItemColor || !colorItem) return
      calloutColorBatch({
        flowList: selectedRows,
        number: currentItemColor?.number || 0,
        colorItem,
        data,
        setData,
        setSelectedRowKeys,
        setSelectedRows,
        t,
      })
      return
    }
    switch (key) {
      case '删除记录':
        onRemoveHttpHistory({
          Id: selectedRowKeys,
        })
        break
      case '删除URL':
        const urls = selectedRows.map((ele) => ele.Url)
        onRemoveHttpHistory({
          Filter: {
            IncludeInUrl: urls,
          },
        })
        break
      case '删除域名':
        const hosts = selectedRows.map((ele) => ele.HostPort?.split(':')[0])
        onRemoveHttpHistory({
          Filter: {
            IncludeInUrl: hosts,
          },
        })
        break
      case 'sendAndJumpToWebFuzzer':
        const currentItemJumpToFuzzer = menuData.find((f) => f.onClickBatch && f.key === '发送到 Web Fuzzer')
        if (!currentItemJumpToFuzzer) return
        onBatch(
          (el) => onSendToTab(el, true, downstreamProxyStr, fromMITM),
          currentItemJumpToFuzzer?.number || 0,
          selectedRowKeys.length === total,
        )

        break
      case 'sendToWebFuzzer':
        const currentItemToFuzzer = menuData.find((f) => f.onClickBatch && f.key === '发送到 Web Fuzzer')
        if (!currentItemToFuzzer) return
        onBatch(
          (el) => onSendToTab(el, false, downstreamProxyStr, fromMITM),
          currentItemToFuzzer?.number || 0,
          selectedRowKeys.length === total,
        )
        break
      case 'sendAndJumpToWS':
        const currentItemJumpToWS = menuData.find((f) => f.onClickBatch && f.key === '发送到 WS Fuzzer')
        if (!currentItemJumpToWS) return
        onBatch(
          (el) => newWebsocketFuzzerTab(el.IsHTTPS, el.Request),
          currentItemJumpToWS?.number || 0,
          selectedRowKeys.length === total,
        )

        break
      case 'sendToWS':
        const currentItemToWS = menuData.find((f) => f.onClickBatch && f.key === '发送到 WS Fuzzer')
        if (!currentItemToWS) return
        onBatch(
          (el) => newWebsocketFuzzerTab(el.IsHTTPS, el.Request, false),
          currentItemToWS?.number || 0,
          selectedRowKeys.length === total,
        )
        break
      case '导出为Excel':
        onExcelExport(selectedRows)
        break
      case '导出为HAR':
        onHarExport(isAllSelect ? [] : selectedRows.map((item) => item.Id))
        break
      default:
        const currentItem = menuData.find((f) => f.onClickBatch && f.key === key)
        if (!currentItem) return
        if (currentItem.onClickBatch) currentItem.onClickBatch(selectedRows, currentItem.number)
        break
    }
    setBatchVisible(false)
  })
  return {
    menuData,
    getRowContextMenu,
    getBatchContextMenu,
    onMultipleClick,
    onRowContextMenu,
  }
}
