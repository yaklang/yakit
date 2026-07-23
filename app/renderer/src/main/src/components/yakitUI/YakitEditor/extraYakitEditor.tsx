import React, { useEffect, useMemo, useState } from 'react'
import {
  OtherMenuListProps,
  YakitEditorExtraRightMenuType,
  YakitEditorProps,
  YakitIMonacoEditor,
} from './YakitEditorType'
import { YakitEditor } from './YakitEditor'
import { failed, info, yakitNotify } from '@/utils/notification'
import { ShareValueProps, newWebFuzzerTab } from '@/pages/fuzzer/HTTPFuzzerPage'
import { generateCSRFPocByRequest } from '@/pages/invoker/fromPacketToYakCode'
import { StringToUint8Array } from '@/utils/str'
import { showResponseViaResponseRaw } from '@/components/ShowInBrowser'
import { openExternalWebsite, saveABSFileToOpen } from '@/utils/openWebsite'
import { Modal } from 'antd'
import { execAutoDecode, execCodec } from '@/utils/encodec'
import { YakitSystem } from '@/yakitGVDefine'
import { useStore } from '@/store'
import { PageNodeItemProps, usePageInfo } from '@/store/pageInfo'
import { shallow } from 'zustand/shallow'
import { YakitRoute } from '@/enums/yakitRoute'
import { defaultAdvancedConfigShow } from '@/defaultConstants/HTTPFuzzerPage'
import { v4 as uuidv4 } from 'uuid'
import { newWebsocketFuzzerTab } from '@/pages/websocket/WebsocketFuzzer'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { HTTPFlowBodyByIdRequest } from '@/components/HTTPHistory'
import { setClipboardText } from '@/utils/clipboard'
import { FuzzerRemoteGV } from '@/enums/fuzzer'
import { GetReleaseEdition, PRODUCT_RELEASE_EDITION } from '@/utils/envfile'
import { getNotepadNameByEditionMulLang } from '@/pages/layout/NotepadMenu/utils'
import { useGoEditNotepad } from '@/pages/notepadManage/hook/useGoEditNotepad'
import { YakEditorOptionShortcutKey } from '@/utils/globalShortcutKey/events/page/yakEditor'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useHttpFlowStore } from '@/store/httpFlow'
import { JSONParseLog } from '@/utils/tool'
import { fetchCursorContent, fetchEditorFullContent } from './editorUtils'
const { ipcRenderer } = window.require('electron')

const HTTP_PACKET_EDITOR_DisableUnicodeDecode = 'HTTP_PACKET_EDITOR_DisableUnicodeDecode'

interface HTTPPacketYakitEditor extends Omit<YakitEditorProps, 'menuType'> {
  defaultHttps?: boolean
  originValue: string
  noPacketModifier?: boolean
  noOpenPacketNewWindow?: boolean
  extraEditorProps?: YakitEditorProps | any
  isWebSocket?: boolean
  webSocketValue?: string
  webFuzzerValue?: string
  webSocketToServer?: string
  webFuzzerCallBack?: () => void
  downstreamProxyStr?: string
  keepSearchName?: string
  url?: string
  pageId?: string
  downbodyParams?: HTTPFlowBodyByIdRequest
  onlyBasicMenu?: boolean // 是否只展示最基础菜单 默认不是
  showDownBodyMenu?: boolean
  noSendToComparer?: boolean // 是否隐藏内置的发送到对比器菜单 默认false
  onClickUrlMenu?: () => void
  onClickUrlWithoutQueryMenu?: () => void
  onClickOpenBrowserMenu?: () => void
  onClickOpenPacketNewWindowMenu?: () => void
  fromMITM?: boolean // 是否来自 MITM 页面
}

export const HTTPPacketYakitEditor: React.FC<HTTPPacketYakitEditor> = React.memo((props) => {
  const {
    keepSearchName,
    defaultHttps = false,
    originValue,
    noPacketModifier = false,
    noOpenPacketNewWindow = false,
    extraEditorProps,
    contextMenu,
    readOnly,
    isWebSocket = false,
    webSocketValue,
    webFuzzerValue,
    webSocketToServer,
    webFuzzerCallBack,
    downstreamProxyStr = '',
    url,
    pageId,
    downbodyParams,
    showDownBodyMenu = true,
    noSendToComparer = false,
    onClickUrlMenu,
    onClickUrlWithoutQueryMenu,
    onClickOpenBrowserMenu,
    onClickOpenPacketNewWindowMenu,
    onlyBasicMenu = false,
    fromMITM = false,
    ...restProps
  } = props
  const { t, i18nRefresh } = useI18nNamespaces(['yakitUi', 'history'])
  const { goAddNotepad } = useGoEditNotepad()
  const { queryPagesDataById } = usePageInfo(
    (s) => ({
      queryPagesDataById: s.queryPagesDataById,
    }),
    shallow,
  )
  const { userInfo } = useStore()
  const [system, setSystem] = useState<YakitSystem>('Darwin')
  const [disableUnicodeDecode, setDisableUnicodeDecode] = useState<boolean>(false)
  const { setCompareLeft, setCompareRight } = useHttpFlowStore()

  useEffect(() => {
    ipcRenderer.invoke('fetch-system-name').then((systemType: YakitSystem) => {
      setSystem(systemType)
    })

    getRemoteValue(HTTP_PACKET_EDITOR_DisableUnicodeDecode)
      .then((res) => {
        const boolValue = res === 'true' || res === true
        setDisableUnicodeDecode(boolValue)
      })
      .catch((error) => {
        setDisableUnicodeDecode(false)
      })
  }, [])

  const rightMenuType: YakitEditorExtraRightMenuType[] = useMemo(() => {
    if (onlyBasicMenu) {
      // 只展示最基础菜单
      return []
    }
    const init: YakitEditorExtraRightMenuType[] = ['code', 'decode', 'http']
    if (noPacketModifier) {
      return init
    } else {
      return init.concat(['customcontextmenu'])
    }
  }, [noPacketModifier, onlyBasicMenu])

  const rightContextMenu: OtherMenuListProps = useMemo(() => {
    if (onlyBasicMenu) {
      // 只展示最基础菜单
      return {}
    }
    const originValueBytes = StringToUint8Array(originValue)
    let menuItems: OtherMenuListProps = {
      ...(contextMenu || {}),
      copyActions: {
        menu: [
          {
            key: 'copy-actions',
            label: t('YakitEditor.copy'),
            children: [
              {
                key: 'copy',
                label: t('YakitEditor.copy'),
              },
              {
                key: 'copy-as-curl',
                label: t('YakitEditor.HTTPPacketYakitEditor.copyCurlCommand'),
                keybindings: YakEditorOptionShortcutKey.CopyAsCurl,
              },
              ...(showDownBodyMenu
                ? [
                    {
                      key: 'copyBodyBase64',
                      label: t('YakitEditor.HTTPPacketYakitEditor.copyBodyBase64'),
                      keybindings: YakEditorOptionShortcutKey.CopyBodyBase64,
                    },
                  ]
                : []),
              {
                key: 'copy-to-notepad',
                label: `${t('YakitEditor.HTTPPacketYakitEditor.copyTo')}${getNotepadNameByEditionMulLang()}${
                  !userInfo.isLogin && GetReleaseEdition() === PRODUCT_RELEASE_EDITION.EnpriTrace
                    ? t('YakitEditor.HTTPPacketYakitEditor.pleaseLogin')
                    : ''
                }`,
                disabled: !userInfo.isLogin && GetReleaseEdition() === PRODUCT_RELEASE_EDITION.EnpriTrace,
              },
            ],
          },
        ],
        onRun: (editor, key) => {
          switch (key) {
            case 'copy':
              setClipboardText(`${fetchCursorContent(editor, true)}`)
              return
            case 'copy-as-curl': {
              const text = editor.getModel()?.getValue() || ''
              if (!text) {
                info(t('YakitEditor.HTTPPacketYakitEditor.packetEmpty'))
                return
              }
              execCodec('packet-to-curl', text, undefined, undefined, undefined, [
                { Key: 'https', Value: defaultHttps ? 'true' : '' },
              ]).then((data) => {
                setClipboardText(data, {
                  hintText: t('YakitEditor.HTTPPacketYakitEditor.copyToClipboard'),
                })
              })
              return
            }
            case 'copyBodyBase64': {
              if (readOnly && downbodyParams?.Id) {
                ipcRenderer
                  .invoke('EncodeHTTPPacketContent', {
                    HTTPFlowId: downbodyParams.Id,
                    IsRequest: downbodyParams.IsRequest,
                    Position: 'body',
                    EncodingType: 'base64',
                  })
                  .then((obj) => {
                    if (obj.EncodedText) {
                      setClipboardText(obj.EncodedText)
                    } else if (obj.Error) {
                      yakitNotify('info', `${obj.Error}`)
                    }
                  })
                  .catch((err) => {
                    yakitNotify('error', `${err}`)
                  })
              } else {
                const text = editor.getModel()?.getValue()
                if (!text) {
                  yakitNotify('info', t('YakitEditor.HTTPPacketYakitEditor.noPacketCannotCopyBody'))
                  return
                }
                ipcRenderer
                  .invoke('GetHTTPPacketBody', { Packet: text, ForceRenderFuzztag: true })
                  .then((bytes: { Raw: Uint8Array }) => {
                    ipcRenderer
                      .invoke('BytesToBase64', {
                        Bytes: bytes.Raw,
                      })
                      .then((res: { Base64: string }) => {
                        setClipboardText(res.Base64)
                      })
                      .catch((err) => {
                        yakitNotify('error', `${err}`)
                      })
                  })
              }
              return
            }
            case 'copy-to-notepad': {
              const text = editor.getModel()?.getValue() || ''
              if (!text) {
                info(t('YakitEditor.HTTPPacketYakitEditor.packetEmpty'))
                return
              }
              let content = '```' + text + '\n```'
              goAddNotepad({
                title: `${t('YakitEditor.HTTPPacketYakitEditor.packet')}-${Date.now()}`,
                content,
              })
              return
            }
            default:
              break
          }
        },
      },
      copyUrl: {
        menu: [
          {
            key: 'copy-url',
            label: t('YakitEditor.HTTPPacketYakitEditor.copyUrl'),
            children: [
              {
                key: 'copyUrlWithQuery',
                label: t('YakitEditor.HTTPPacketYakitEditor.copyUrlWithQuery'),
                keybindings: YakEditorOptionShortcutKey.CopyUrlWithQuery,
              },
              {
                key: 'copyUrlWithoutQuery',
                label: t('YakitEditor.HTTPPacketYakitEditor.copyUrlWithoutQuery'),
                keybindings: YakEditorOptionShortcutKey.CopyUrlWithoutQuery,
              },
            ],
          },
        ],
        onRun: (editor, key) => {
          if (key === 'copyUrlWithoutQuery') {
            if (onClickUrlWithoutQueryMenu) {
              onClickUrlWithoutQueryMenu()
            } else if (url) {
              try {
                const u = new URL(url)
                u.search = ''
                u.hash = ''
                setClipboardText(u.toString())
              } catch {
                setClipboardText(url.split('?')[0].split('#')[0])
              }
            } else {
              yakitNotify('info', t('YakitEditor.HTTPPacketYakitEditor.urlNotExist'))
            }
            return
          }
          if (onClickUrlMenu) {
            onClickUrlMenu()
          } else {
            setClipboardText(url || '')
          }
        },
      },
      copyAsCsrfPoc: {
        menu: [
          {
            key: 'copy-as-csrf-poc',
            label: t('YakitEditor.HTTPPacketYakitEditor.copyAsCsrfPoc'),
            children: [
              {
                key: 'csrfpoc',
                label: t('YakitEditor.HTTPPacketYakitEditor.copyAsCsrfPocBasic'),
                keybindings: YakEditorOptionShortcutKey.CopyAsCsrfPocBasic,
              },
              {
                key: 'auto-submit-csrf-poc',
                label: t('YakitEditor.HTTPPacketYakitEditor.copyAsCsrfPocAutoSubmit'),
                keybindings: YakEditorOptionShortcutKey.CopyAsCsrfPocAutoSubmit,
              },
            ],
          },
        ],
        onRun: (editor, key) => {
          try {
            const text = editor.getModel()?.getValue() || ''
            if (!text) {
              info(t('YakitEditor.HTTPPacketYakitEditor.packetEmpty'))
              return
            }
            generateCSRFPocByRequest(
              StringToUint8Array(text, 'utf8'),
              defaultHttps,
              (code) => {
                setClipboardText(code)
              },
              key === 'auto-submit-csrf-poc',
            )
          } catch (e) {
            failed(t('YakitEditor.HTTPPacketYakitEditor.autoGenerateCsrfFailed'))
          }
        },
      },
      exportTxt: {
        menu: [
          {
            key: 'export-txt',
            label: t('YakitEditor.HTTPPacketYakitEditor.exportAsTxtFile'),
          },
        ],
        onRun: (editor: YakitIMonacoEditor, key: string) => {
          const text = editor.getModel()?.getValue() || ''
          if (!text) {
            info(t('YakitEditor.HTTPPacketYakitEditor.packetEmpty'))
            return
          }
          saveABSFileToOpen(`${t('YakitEditor.HTTPPacketYakitEditor.packet')}-${Date.now()}.txt`, text)
        },
      },
      viewInBrowser: {
        menu: [
          {
            key: 'view-in-browser',
            label: t('HTTPFlowTable.RowContextMenu.viewInBrowser'),
            children: [
              {
                key: 'viewResponseInBrowser',
                label: t('YakitEditor.HTTPPacketYakitEditor.viewResponseInBrowser'),
                keybindings: YakEditorOptionShortcutKey.ViewResponseInBrowser,
              },
              {
                key: 'openURLInBrowser',
                label: t('YakitEditor.HTTPPacketYakitEditor.openUrlInBrowser'),
                keybindings: YakEditorOptionShortcutKey.OpenUrlInBrowser,
              },
            ],
          },
        ],
        onRun: (editor: YakitIMonacoEditor, key: string) => {
          if (key === 'openURLInBrowser') {
            if (onClickOpenBrowserMenu) {
              onClickOpenBrowserMenu()
            } else if (url) {
              openExternalWebsite(url)
            } else {
              yakitNotify('info', t('YakitEditor.HTTPPacketYakitEditor.urlNotExist'))
            }
            return
          }
          try {
            if (readOnly && originValueBytes) {
              showResponseViaResponseRaw(originValueBytes)
              return
            }
            const text = editor.getModel()?.getValue()
            if (!text) {
              failed(t('YakitEditor.HTTPPacketYakitEditor.cannotRetrievePacketContent'))
              return
            }
            showResponseViaResponseRaw(originValueBytes)
          } catch (e) {
            failed('editor exec show in browser failed')
          }
        },
      },
      openPacketNewWindow: {
        menu: [
          {
            key: 'open-packet-new-window',
            label: t('YakitEditor.HTTPPacketYakitEditor.openInNewWindow'),
          },
        ],
        onRun: (editor: YakitIMonacoEditor, key: string) => {
          if (noOpenPacketNewWindow) {
            yakitNotify('info', t('YakitEditor.HTTPPacketYakitEditor.showRawInEditor'))
          } else {
            if (onClickOpenPacketNewWindowMenu) {
              onClickOpenPacketNewWindowMenu()
            } else {
              yakitNotify('info', t('YakitEditor.HTTPPacketYakitEditor.showRawInEditor'))
            }
          }
        },
      },
      autoDecode: {
        menu: [
          {
            key: 'auto-decode',
            label: t('YakitEditor.HTTPPacketYakitEditor.smartAutoDecodeInspector'),
          },
        ],
        onRun: (editor: YakitIMonacoEditor, key: string) => {
          try {
            const text = editor.getModel()?.getValueInRange(editor.getSelection() as any) || ''
            if (!text) {
              Modal.info({
                title: t('YakitEditor.HTTPPacketYakitEditor.autoDecodeFailed'),
                content: <>{t('YakitEditor.HTTPPacketYakitEditor.textEmptySelectToAutoDecode')}</>,
              })
              return
            }
            execAutoDecode(text)
          } catch (e) {
            failed('editor exec auto-decode failed')
          }
        },
        order: 6,
      },
      disableUnicodeDecode: {
        menu: [
          {
            key: 'disable-unicode-decode',
            label: disableUnicodeDecode
              ? t('YakitEditor.HTTPPacketYakitEditor.enableAutoUnicodeDecode')
              : t('YakitEditor.HTTPPacketYakitEditor.disableAutoUnicodeDecode'),
          },
        ],
        onRun: (editor: YakitIMonacoEditor, key: string) => {
          setDisableUnicodeDecode(!disableUnicodeDecode)

          setRemoteValue(HTTP_PACKET_EDITOR_DisableUnicodeDecode, `${!disableUnicodeDecode}`)
        },
      },
    }

    if (showDownBodyMenu) {
      menuItems = Object.keys(menuItems).reduce((ac, a) => {
        if (a === 'autoDecode') {
          ac['downloadBody'] = {
            menu: [
              {
                key: 'download-body',
                label: t('YakitEditor.HTTPPacketYakitEditor.downloadBody'),
              },
            ],
            onRun: (editor: YakitIMonacoEditor, key: string) => {
              try {
                if (readOnly && downbodyParams) {
                  ipcRenderer
                    .invoke('GetHTTPFlowBodyById', {
                      ...downbodyParams,
                      uuid: uuidv4(),
                    })
                    .then(() => {
                      yakitNotify('success', t('YakitNotification.downloaded'))
                    })
                    .catch((e) => {
                      yakitNotify('error', t('YakitNotification.downloadFailed', { error: e + '' }))
                    })
                  return
                }
                const text = editor.getModel()?.getValue()
                if (!text) {
                  yakitNotify('info', t('YakitEditor.HTTPPacketYakitEditor.noPacketCannotDownloadBody'))
                  return
                }
                ipcRenderer.invoke('GetHTTPPacketBody', { Packet: text }).then((bytes: { Raw: Uint8Array }) => {
                  saveABSFileToOpen('packet-body.txt', bytes.Raw)
                })
              } catch (e) {
                failed('editor exec download body failed')
              }
            },
          }
        }
        ac[a] = menuItems[a]
        return ac
      }, {}) as OtherMenuListProps
    }
    if (isWebSocket) {
      menuItems.newSocket = {
        menu: [
          {
            key: 'new-web-socket-tab',
            label: t('YakitEditor.HTTPPacketYakitEditor.sendToWsFuzzer'),
            children: [
              {
                key: 'send-and-redirect',
                label: t('YakitEditor.HTTPPacketYakitEditor.sendAndRedirect'),
                keybindings: YakEditorOptionShortcutKey.CommonSendAndJumpToWebFuzzer,
              },
              {
                key: 'send-only',
                label: t('YakitEditor.HTTPPacketYakitEditor.sendOnly'),
                keybindings: YakEditorOptionShortcutKey.CommonSendToWebFuzzer,
              },
            ],
          },
        ],
        onRun: (editor, key) => {
          try {
            const text = webSocketValue || editor.getModel()?.getValue() || ''
            if (!text) {
              info(t('YakitEditor.HTTPPacketYakitEditor.packetEmpty'))
              return
            }
            if (key === 'send-and-redirect') {
              newWebsocketFuzzerTab(
                defaultHttps || false,
                StringToUint8Array(text),
                true,
                StringToUint8Array(webSocketToServer || ''),
              )
            } else if (key === 'send-only') {
              newWebsocketFuzzerTab(
                defaultHttps || false,
                StringToUint8Array(text),
                false,
                StringToUint8Array(webSocketToServer || ''),
              )
            }
          } catch (e) {
            failed('editor exec new-open-fuzzer failed')
          }
        },
      }
    } else {
      menuItems.newFuzzer = {
        menu: [
          {
            key: 'new-web-fuzzer-tab',
            label: t('YakitEditor.HTTPPacketYakitEditor.sendToWebFuzzer'),
            children: [
              {
                key: 'send-and-redirect',
                label: t('YakitEditor.HTTPPacketYakitEditor.sendAndRedirect'),
                keybindings: YakEditorOptionShortcutKey.CommonSendAndJumpToWebFuzzer,
              },
              {
                key: 'send-only',
                label: t('YakitEditor.HTTPPacketYakitEditor.sendOnly'),
                keybindings: YakEditorOptionShortcutKey.CommonSendToWebFuzzer,
              },
            ],
          },
        ],
        onRun: async (editor: YakitIMonacoEditor, key: string) => {
          if (pageId) {
            const pageInfo: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, pageId)
            if (pageInfo && pageInfo.pageParamsInfo.webFuzzerPageInfo) {
              const { advancedConfigValue, request } = pageInfo.pageParamsInfo.webFuzzerPageInfo
              let advancedConfigShow = defaultAdvancedConfigShow
              try {
                const resShow = await getRemoteValue(FuzzerRemoteGV.WebFuzzerAdvancedConfigShow)
                advancedConfigShow = JSONParseLog(resShow, { page: 'extraYakitEditor' })
              } catch (error) {}
              const params: ShareValueProps = {
                advancedConfigShow,
                request,
                advancedConfiguration: advancedConfigValue,
              }
              const openFlag = key === 'send-and-redirect'
              ipcRenderer
                .invoke('send-to-tab', {
                  type: 'fuzzer',
                  data: {
                    shareContent: JSON.stringify(params),
                    openFlag,
                  },
                })
                .then(() => {
                  if (!openFlag) {
                    info(t('YakitNotification.sendSuccess'))
                  }
                  webFuzzerCallBack && webFuzzerCallBack()
                })
            }
          } else {
            try {
              const text = webFuzzerValue || fetchEditorFullContent(editor)
              if (!text) {
                info(t('YakitEditor.HTTPPacketYakitEditor.packetEmpty'))
                return
              }
              if (key === 'send-and-redirect') {
                newWebFuzzerTab({
                  isHttps: defaultHttps || false,
                  request: text,
                  downstreamProxyStr,
                  openFlag: true,
                  fromMITM,
                }).finally(() => {
                  webFuzzerCallBack && webFuzzerCallBack()
                })
              } else if (key === 'send-only') {
                newWebFuzzerTab({
                  isHttps: defaultHttps || false,
                  request: text,
                  downstreamProxyStr,
                  openFlag: false,
                  fromMITM,
                }).finally(() => {
                  info(t('YakitNotification.sendSuccess'))
                  webFuzzerCallBack && webFuzzerCallBack()
                })
              }
            } catch (e) {
              failed('editor exec new-open-fuzzer failed')
            }
          }
        },
      }
    }

    // 发送到对比器
    if (!noSendToComparer) {
      menuItems.sendToComparer = {
        menu: [
          {
            key: 'sendToComparer',
            label: t('HTTPFlowTable.RowContextMenu.sendToComparer'),
            children: [
              {
                key: 'sendToComparerLeft',
                label: t('HTTPFlowTable.RowContextMenu.sendToComparerLeft'),
              },
              {
                key: 'sendToComparerRight',
                label: t('HTTPFlowTable.RowContextMenu.sendToComparerRight'),
              },
            ],
          },
        ],
        onRun: (editor: YakitIMonacoEditor, key: string) => {
          const text = editor.getModel()?.getValue() || ''
          if (!text) {
            info(t('YakitEditor.HTTPPacketYakitEditor.packetEmpty'))
            return
          }

          switch (key) {
            case 'sendToComparerLeft':
              setCompareLeft({
                content: text,
                language: 'http',
              })
              break
            case 'sendToComparerRight':
              setCompareRight({
                content: text,
                language: 'http',
              })
              webFuzzerCallBack?.()
              break
            default:
              break
          }
        },
        order: 15,
      }
    }

    return menuItems
  }, [
    onlyBasicMenu,
    defaultHttps,
    system,
    originValue,
    url,
    contextMenu,
    readOnly,
    isWebSocket,
    webSocketValue,
    webFuzzerValue,
    webSocketToServer,
    downstreamProxyStr,
    disableUnicodeDecode,
    JSON.stringify(downbodyParams),
    onClickUrlMenu,
    onClickUrlWithoutQueryMenu,
    onClickOpenBrowserMenu,
    noOpenPacketNewWindow,
    userInfo.isLogin,
    i18nRefresh,
    setCompareLeft,
    setCompareRight,
    noSendToComparer,
  ])

  return (
    <YakitEditor
      keepSearchName={keepSearchName}
      menuType={rightMenuType}
      readOnly={readOnly}
      contextMenu={rightContextMenu}
      hiddenDefaultContextMenuKeys={['copy']}
      disableUnicodeDecode={disableUnicodeDecode}
      {...restProps}
      {...extraEditorProps}
    />
  )
})
