import React, {useEffect, useMemo, useState} from "react"
import {
    OtherMenuListProps,
    YakitEditorExtraRightMenuType,
    YakitEditorProps,
    YakitIMonacoEditor
} from "./YakitEditorType"
import {YakitEditor} from "./YakitEditor"
import {failed, info, yakitNotify} from "@/utils/notification"
import {ShareValueProps, newWebFuzzerTab} from "@/pages/fuzzer/HTTPFuzzerPage"
import {generateCSRFPocByRequest} from "@/pages/invoker/fromPacketToYakCode"
import {StringToUint8Array} from "@/utils/str"
import {showResponseViaResponseRaw} from "@/components/ShowInBrowser"
import {openExternalWebsite, saveABSFileToOpen} from "@/utils/openWebsite"
import {Modal} from "antd"
import {execAutoDecode, execCodec} from "@/utils/encodec"
import {YakitSystem} from "@/yakitGVDefine"
import {useStore} from "@/store"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute} from "@/enums/yakitRoute"
import {defaultAdvancedConfigShow} from "@/defaultConstants/HTTPFuzzerPage"
import {v4 as uuidv4} from "uuid"
import {newWebsocketFuzzerTab} from "@/pages/websocket/WebsocketFuzzer"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {HTTPFlowBodyByIdRequest} from "@/components/HTTPHistory"
import {setClipboardText} from "@/utils/clipboard"
import {FuzzerRemoteGV} from "@/enums/fuzzer"
import {GetReleaseEdition, PRODUCT_RELEASE_EDITION} from "@/utils/envfile"
import {getNotepadNameByEdition} from "@/pages/layout/NotepadMenu/utils"
import {useGoEditNotepad} from "@/pages/notepadManage/hook/useGoEditNotepad"
import {YakEditorOptionShortcutKey} from "@/utils/globalShortcutKey/events/page/yakEditor"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {useHttpFlowStore} from "@/store/httpFlow"
import { JSONParseLog } from "@/utils/tool"
const {ipcRenderer} = window.require("electron")

const HTTP_PACKET_EDITOR_DisableUnicodeDecode = "HTTP_PACKET_EDITOR_DisableUnicodeDecode"

interface HTTPPacketYakitEditor extends Omit<YakitEditorProps, "menuType"> {
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
        downstreamProxyStr = "",
        url,
        pageId,
        downbodyParams,
        showDownBodyMenu = true,
        noSendToComparer = false,
        onClickUrlMenu,
        onClickOpenBrowserMenu,
        onClickOpenPacketNewWindowMenu,
        onlyBasicMenu = false,
        fromMITM = false,
        ...restProps
    } = props
    const {t, i18n} = useI18nNamespaces(["yakitUi", "history"])
    const {goAddNotepad} = useGoEditNotepad()
    const {queryPagesDataById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )
    const {userInfo} = useStore()
    const [system, setSystem] = useState<YakitSystem>("Darwin")
    const [disableUnicodeDecode, setDisableUnicodeDecode] = useState<boolean>(false)
    const {setCompareLeft, setCompareRight} = useHttpFlowStore()

    useEffect(() => {
        ipcRenderer.invoke("fetch-system-name").then((systemType: YakitSystem) => {
            setSystem(systemType)
        })

        getRemoteValue(HTTP_PACKET_EDITOR_DisableUnicodeDecode)
            .then((res) => {
                const boolValue = res === "true" || res === true
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
        const init: YakitEditorExtraRightMenuType[] = ["code", "decode", "http"]
        if (noPacketModifier) {
            return init
        } else {
            return init.concat(["customcontextmenu", "aiplugin"])
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
            copyCURL: {
                menu: [{key: "copy-as-curl", label: t("YakitEditor.HTTPPacketYakitEditor.copyCurlCommand")}],
                onRun: (editor, key) => {
                    switch (key) {
                        case "copy-as-curl":
                            const text = editor.getModel()?.getValue() || ""
                            if (!text) {
                                info(t("YakitEditor.HTTPPacketYakitEditor.packetEmpty"))
                                return
                            }
                            execCodec("packet-to-curl", text, undefined, undefined, undefined, [
                                {Key: "https", Value: defaultHttps ? "true" : ""}
                            ]).then((data) => {
                                setClipboardText(data, {
                                    hintText: t("YakitEditor.HTTPPacketYakitEditor.copyToClipboard")
                                })
                            })
                            return
                        default:
                            break
                    }
                }
            },
            copyUrl: {
                menu: [
                    {
                        key: "copyUrl",
                        label: t("YakitEditor.HTTPPacketYakitEditor.copyUrl")
                    }
                ],
                onRun: (editor: YakitIMonacoEditor, key: string) => {
                    if (onClickUrlMenu) {
                        onClickUrlMenu()
                    } else {
                        setClipboardText(url || "")
                    }
                }
            },
            copyCSRF: {
                menu: [
                    {
                        key: "csrfpoc",
                        label: t("YakitEditor.HTTPPacketYakitEditor.copyAsCsrfPoc")
                    }
                ],
                onRun: (editor: YakitIMonacoEditor, key: string) => {
                    try {
                        const text = editor.getModel()?.getValue() || ""
                        if (!text) {
                            info(t("YakitEditor.HTTPPacketYakitEditor.packetEmpty"))
                            return
                        }
                        generateCSRFPocByRequest(StringToUint8Array(text, "utf8"), defaultHttps, (code) => {
                            setClipboardText(code)
                        })
                    } catch (e) {
                        failed(t("YakitEditor.HTTPPacketYakitEditor.autoGenerateCsrfFailed"))
                    }
                }
            },
            copyNotepad: {
                menu: [
                    {
                        key: "copy-to-notepad",
                        label: `${t("YakitEditor.HTTPPacketYakitEditor.copyTo")}${getNotepadNameByEdition()}${
                            !userInfo.isLogin && GetReleaseEdition() === PRODUCT_RELEASE_EDITION.EnpriTrace
                                ? t("YakitEditor.HTTPPacketYakitEditor.pleaseLogin")
                                : ""
                        }`,
                        disabled: !userInfo.isLogin && GetReleaseEdition() === PRODUCT_RELEASE_EDITION.EnpriTrace
                    }
                ],
                onRun: (editor: YakitIMonacoEditor, key: string) => {
                    const text = editor.getModel()?.getValue() || ""
                    if (!text) {
                        info(t("YakitEditor.HTTPPacketYakitEditor.packetEmpty"))
                        return
                    }
                    let content = "```" + text + "\n```"
                    goAddNotepad({
                        title: `${t("YakitEditor.HTTPPacketYakitEditor.packet")}-${Date.now()}`,
                        content
                    })
                }
            },
            exportTxt: {
                menu: [
                    {
                        key: "export-txt",
                        label: t("YakitEditor.HTTPPacketYakitEditor.exportAsTxtFile")
                    }
                ],
                onRun: (editor: YakitIMonacoEditor, key: string) => {
                    const text = editor.getModel()?.getValue() || ""
                    if (!text) {
                        info(t("YakitEditor.HTTPPacketYakitEditor.packetEmpty"))
                        return
                    }
                    saveABSFileToOpen(`${t("YakitEditor.HTTPPacketYakitEditor.packet")}-${Date.now()}.txt`, text)
                }
            },
            openURLBrowser: {
                menu: [
                    {
                        key: "open-url-in-browser",
                        label: t("YakitEditor.HTTPPacketYakitEditor.openUrlInBrowser")
                    }
                ],
                onRun: (editor: YakitIMonacoEditor, key: string) => {
                    if (onClickOpenBrowserMenu) {
                        onClickOpenBrowserMenu()
                    } else if (url) {
                        openExternalWebsite(url)
                    } else {
                        yakitNotify("info", t("YakitEditor.HTTPPacketYakitEditor.urlNotExist"))
                    }
                }
            },
            openPacketNewWindow: {
                menu: [
                    {
                        key: "open-packet-new-window",
                        label: t("YakitEditor.HTTPPacketYakitEditor.openInNewWindow")
                    }
                ],
                onRun: (editor: YakitIMonacoEditor, key: string) => {
                    if (noOpenPacketNewWindow) {
                        yakitNotify("info", t("YakitEditor.HTTPPacketYakitEditor.showRawInEditor"))
                    } else {
                        if (onClickOpenPacketNewWindowMenu) {
                            onClickOpenPacketNewWindowMenu()
                        } else {
                            yakitNotify("info", t("YakitEditor.HTTPPacketYakitEditor.showRawInEditor"))
                        }
                    }
                }
            },
            openBrowser: {
                menu: [
                    {
                        key: "open-in-browser",
                        label: t("YakitEditor.HTTPPacketYakitEditor.viewResponseInBrowser")
                    }
                ],
                onRun: (editor: YakitIMonacoEditor, key: string) => {
                    try {
                        if (readOnly && originValueBytes) {
                            showResponseViaResponseRaw(originValueBytes)
                            return
                        }
                        const text = editor.getModel()?.getValue()
                        if (!text) {
                            failed(t("YakitEditor.HTTPPacketYakitEditor.cannotRetrievePacketContent"))
                            return
                        }
                        showResponseViaResponseRaw(originValueBytes)
                    } catch (e) {
                        failed("editor exec show in browser failed")
                    }
                }
            },
            autoDecode: {
                menu: [
                    {
                        key: "auto-decode",
                        label: t("YakitEditor.HTTPPacketYakitEditor.smartAutoDecodeInspector")
                    }
                ],
                onRun: (editor: YakitIMonacoEditor, key: string) => {
                    try {
                        const text = editor.getModel()?.getValueInRange(editor.getSelection() as any) || ""
                        if (!text) {
                            Modal.info({
                                title: t("YakitEditor.HTTPPacketYakitEditor.autoDecodeFailed"),
                                content: <>{t("YakitEditor.HTTPPacketYakitEditor.textEmptySelectToAutoDecode")}</>
                            })
                            return
                        }
                        execAutoDecode(text)
                    } catch (e) {
                        failed("editor exec auto-decode failed")
                    }
                },
                order: 6
            },
            disableUnicodeDecode: {
                menu: [
                    {
                        key: "disable-unicode-decode",
                        label: disableUnicodeDecode
                            ? t("YakitEditor.HTTPPacketYakitEditor.enableAutoUnicodeDecode")
                            : t("YakitEditor.HTTPPacketYakitEditor.disableAutoUnicodeDecode")
                    }
                ],
                onRun: (editor: YakitIMonacoEditor, key: string) => {
                    setDisableUnicodeDecode(!disableUnicodeDecode)

                    setRemoteValue(HTTP_PACKET_EDITOR_DisableUnicodeDecode, `${!disableUnicodeDecode}`)
                }
            }
        }

        if (showDownBodyMenu) {
            menuItems = Object.keys(menuItems).reduce((ac, a) => {
                if (a === "autoDecode") {
                    ac["downloadBody"] = {
                        menu: [
                            {
                                key: "download-body",
                                label: t("YakitEditor.HTTPPacketYakitEditor.downloadBody")
                            }
                        ],
                        onRun: (editor: YakitIMonacoEditor, key: string) => {
                            try {
                                if (readOnly && downbodyParams) {
                                    ipcRenderer
                                        .invoke("GetHTTPFlowBodyById", {
                                            ...downbodyParams,
                                            uuid: uuidv4()
                                        })
                                        .then(() => {
                                            yakitNotify("success", t("YakitNotification.downloaded"))
                                        })
                                        .catch((e) => {
                                            yakitNotify(
                                                "error",
                                                `${t("YakitNotification.downloadFailed", {colon: true})}${e}`
                                            )
                                        })
                                    return
                                }
                                const text = editor.getModel()?.getValue()
                                if (!text) {
                                    yakitNotify(
                                        "info",
                                        t("YakitEditor.HTTPPacketYakitEditor.noPacketCannotDownloadBody")
                                    )
                                    return
                                }
                                ipcRenderer
                                    .invoke("GetHTTPPacketBody", {Packet: text})
                                    .then((bytes: {Raw: Uint8Array}) => {
                                        saveABSFileToOpen("packet-body.txt", bytes.Raw)
                                    })
                            } catch (e) {
                                failed("editor exec download body failed")
                            }
                        }
                    }
                }
                ac[a] = menuItems[a]
                return ac
            }, {}) as OtherMenuListProps

            menuItems = Object.keys(menuItems).reduce((ac, a) => {
                if (a === "downloadBody") {
                    ac["copyBodyBase64"] = {
                        menu: [
                            {
                                key: "copyBodyBase64",
                                label: t("YakitEditor.HTTPPacketYakitEditor.copyBodyBase64")
                            }
                        ],
                        onRun: (editor: YakitIMonacoEditor, key: string) => {
                            const text = editor.getModel()?.getValue()
                            if (!text) {
                                yakitNotify("info", t("YakitEditor.HTTPPacketYakitEditor.noPacketCannotCopyBody"))
                                return
                            }
                            ipcRenderer
                                .invoke("GetHTTPPacketBody", {Packet: text, ForceRenderFuzztag: true})
                                .then((bytes: {Raw: Uint8Array}) => {
                                    ipcRenderer
                                        .invoke("BytesToBase64", {
                                            Bytes: bytes.Raw
                                        })
                                        .then((res: {Base64: string}) => {
                                            setClipboardText(res.Base64)
                                        })
                                        .catch((err) => {
                                            yakitNotify("error", `${err}`)
                                        })
                                })
                        }
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
                        key: "new-web-socket-tab",
                        label: t("YakitEditor.HTTPPacketYakitEditor.sendToWsFuzzer"),
                        children: [
                            {
                                key: "发送并跳转",
                                label: t("YakitEditor.HTTPPacketYakitEditor.sendAndRedirect"),
                                keybindings: YakEditorOptionShortcutKey.CommonSendAndJumpToWebFuzzer
                            },
                            {
                                key: "仅发送",
                                label: t("YakitEditor.HTTPPacketYakitEditor.sendOnly"),
                                keybindings: YakEditorOptionShortcutKey.CommonSendToWebFuzzer
                            }
                        ]
                    }
                ],
                onRun: (editor, key) => {
                    try {
                        const text = webSocketValue || editor.getModel()?.getValue() || ""
                        if (!text) {
                            info(t("YakitEditor.HTTPPacketYakitEditor.packetEmpty"))
                            return
                        }
                        if (key === "发送并跳转") {
                            newWebsocketFuzzerTab(
                                defaultHttps || false,
                                StringToUint8Array(text),
                                true,
                                StringToUint8Array(webSocketToServer || "")
                            )
                        } else if (key === "仅发送") {
                            newWebsocketFuzzerTab(
                                defaultHttps || false,
                                StringToUint8Array(text),
                                false,
                                StringToUint8Array(webSocketToServer || "")
                            )
                        }
                    } catch (e) {
                        failed("editor exec new-open-fuzzer failed")
                    }
                }
            }
        } else {
            menuItems.newFuzzer = {
                menu: [
                    {
                        key: "new-web-fuzzer-tab",
                        label: t("YakitEditor.HTTPPacketYakitEditor.sendToWebFuzzer"),
                        children: [
                            {
                                key: "发送并跳转",
                                label: t("YakitEditor.HTTPPacketYakitEditor.sendAndRedirect"),
                                keybindings: YakEditorOptionShortcutKey.CommonSendAndJumpToWebFuzzer
                            },
                            {
                                key: "仅发送",
                                label: t("YakitEditor.HTTPPacketYakitEditor.sendOnly"),
                                keybindings: YakEditorOptionShortcutKey.CommonSendToWebFuzzer
                            }
                        ]
                    }
                ],
                onRun: async (editor: YakitIMonacoEditor, key: string) => {
                    if (pageId) {
                        const pageInfo: PageNodeItemProps | undefined = queryPagesDataById(
                            YakitRoute.HTTPFuzzer,
                            pageId
                        )
                        if (pageInfo && pageInfo.pageParamsInfo.webFuzzerPageInfo) {
                            const {advancedConfigValue, request} = pageInfo.pageParamsInfo.webFuzzerPageInfo
                            let advancedConfigShow = defaultAdvancedConfigShow
                            try {
                                const resShow = await getRemoteValue(FuzzerRemoteGV.WebFuzzerAdvancedConfigShow)
                                advancedConfigShow = JSONParseLog(resShow, {page:"extraYakitEditor"})
                            } catch (error) {}
                            const params: ShareValueProps = {
                                advancedConfigShow,
                                request,
                                advancedConfiguration: advancedConfigValue
                            }
                            const openFlag = key === "发送并跳转"
                            ipcRenderer
                                .invoke("send-to-tab", {
                                    type: "fuzzer",
                                    data: {
                                        shareContent: JSON.stringify(params),
                                        openFlag
                                    }
                                })
                                .then(() => {
                                    if (!openFlag) {
                                        info(t("YakitNotification.sendSuccess"))
                                    }
                                    webFuzzerCallBack && webFuzzerCallBack()
                                })
                        }
                    } else {
                        try {
                            const text = webFuzzerValue || editor.getModel()?.getValue() || ""
                            if (!text) {
                                info(t("YakitEditor.HTTPPacketYakitEditor.packetEmpty"))
                                return
                            }
                            if (key === "发送并跳转") {
                                newWebFuzzerTab({
                                    isHttps: defaultHttps || false,
                                    request: text,
                                    downstreamProxyStr,
                                    openFlag: true,
                                    fromMITM
                                }).finally(() => {
                                    webFuzzerCallBack && webFuzzerCallBack()
                                })
                            } else if (key === "仅发送") {
                                newWebFuzzerTab({
                                    isHttps: defaultHttps || false,
                                    request: text,
                                    downstreamProxyStr,
                                    openFlag: false,
                                    fromMITM
                                }).finally(() => {
                                    info(t("YakitNotification.sendSuccess"))
                                    webFuzzerCallBack && webFuzzerCallBack()
                                })
                            }
                        } catch (e) {
                            failed("editor exec new-open-fuzzer failed")
                        }
                    }
                }
            }
        }

        // 发送到对比器
        if (!noSendToComparer) {
            menuItems.sendToComparer = {
                menu: [
                    {
                        key: "sendToComparer",
                        label: t("HTTPFlowTable.RowContextMenu.sendToComparer"),
                        children: [
                            {
                                key: "sendToComparerLeft",
                                label: t("HTTPFlowTable.RowContextMenu.sendToComparerLeft")
                            },
                            {
                                key: "sendToComparerRight",
                                label: t("HTTPFlowTable.RowContextMenu.sendToComparerRight")
                            }
                        ]
                    }
                ],
                onRun: (editor: YakitIMonacoEditor, key: string) => {
                    const text = editor.getModel()?.getValue() || ""
                    if (!text) {
                        info(t("YakitEditor.HTTPPacketYakitEditor.packetEmpty"))
                        return
                    }

                    switch (key) {
                        case "sendToComparerLeft":
                            setCompareLeft({
                                content: text,
                                language: "http"
                            })
                            break
                        case "sendToComparerRight":
                            setCompareRight({
                                content: text,
                                language: "http"
                            })
                            webFuzzerCallBack?.()
                            break
                        default:
                            break
                    }
                },
                order: 15
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
        onClickOpenBrowserMenu,
        noOpenPacketNewWindow,
        userInfo.isLogin,
        i18n.language,
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
            disableUnicodeDecode={disableUnicodeDecode}
            {...restProps}
            {...extraEditorProps}
        />
    )
})
