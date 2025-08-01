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
import { getGlobalShortcutKeyEvents, GlobalShortcutKey } from "@/utils/globalShortcutKey/events/global"
import { YakEditorOptionShortcutKey } from "@/utils/globalShortcutKey/events/page/yakEditor"
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
    url?: string
    pageId?: string
    downbodyParams?: HTTPFlowBodyByIdRequest
    onlyBasicMenu?: boolean // 是否只展示最基础菜单 默认不是
    showDownBodyMenu?: boolean
    onClickUrlMenu?: () => void
    onClickOpenBrowserMenu?: () => void
    onClickOpenPacketNewWindowMenu?: () => void
}

export const HTTPPacketYakitEditor: React.FC<HTTPPacketYakitEditor> = React.memo((props) => {
    const {
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
        onClickUrlMenu,
        onClickOpenBrowserMenu,
        onClickOpenPacketNewWindowMenu,
        onlyBasicMenu = false,
        ...restProps
    } = props
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
                menu: [{key: "copy-as-curl", label: "复制 curl 命令"}],
                onRun: (editor, key) => {
                    switch (key) {
                        case "copy-as-curl":
                            const text = editor.getModel()?.getValue() || ""
                            if (!text) {
                                info("数据包为空")
                                return
                            }
                            execCodec("packet-to-curl", text, undefined, undefined, undefined, [
                                {Key: "https", Value: defaultHttps ? "true" : ""}
                            ]).then((data) => {
                                setClipboardText(data, {hintText: "复制到剪贴板"})
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
                        label: "复制 URL"
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
                        label: "复制为 CSRF PoC"
                    }
                ],
                onRun: (editor: YakitIMonacoEditor, key: string) => {
                    try {
                        const text = editor.getModel()?.getValue() || ""
                        if (!text) {
                            info("数据包为空")
                            return
                        }
                        generateCSRFPocByRequest(StringToUint8Array(text, "utf8"), defaultHttps, (code) => {
                            setClipboardText(code)
                        })
                    } catch (e) {
                        failed("自动生成 CSRF 失败")
                    }
                }
            },
            copyNotepad: {
                menu: [
                    {
                        key: "copy-to-notepad",
                        label: `复制到${getNotepadNameByEdition()}${
                            !userInfo.isLogin && GetReleaseEdition() === PRODUCT_RELEASE_EDITION.EnpriTrace
                                ? "请登录"
                                : ""
                        }`,
                        disabled: !userInfo.isLogin && GetReleaseEdition() === PRODUCT_RELEASE_EDITION.EnpriTrace
                    }
                ],
                onRun: (editor: YakitIMonacoEditor, key: string) => {
                    const text = editor.getModel()?.getValue() || ""
                    if (!text) {
                        info("数据包为空")
                        return
                    }
                    let content = "```" + text + "\n```"
                    goAddNotepad({
                        title: `数据包-${Date.now()}`,
                        content
                    })
                }
            },
            exportTxt: {
                menu: [
                    {
                        key: "export-txt",
                        label: "导出为 txt 文件"
                    }
                ],
                onRun: (editor: YakitIMonacoEditor, key: string) => {
                    const text = editor.getModel()?.getValue() || ""
                    if (!text) {
                        info("数据包为空")
                        return
                    }
                    saveABSFileToOpen(`数据包-${Date.now()}.txt`, text)
                }
            },
            openURLBrowser: {
                menu: [
                    {
                        key: "open-url-in-browser",
                        label: "浏览器中打开URL"
                    }
                ],
                onRun: (editor: YakitIMonacoEditor, key: string) => {
                    if (onClickOpenBrowserMenu) {
                        onClickOpenBrowserMenu()
                    } else if (url) {
                        openExternalWebsite(url)
                    } else {
                        yakitNotify("info", "url 不存在")
                    }
                }
            },
            openPacketNewWindow: {
                menu: [
                    {
                        key: "open-packet-new-window",
                        label: "在新窗口打开"
                    }
                ],
                onRun: (editor: YakitIMonacoEditor, key: string) => {
                    if (noOpenPacketNewWindow) {
                        yakitNotify("info", "展示原始编辑器内部")
                    } else {
                        if (onClickOpenPacketNewWindowMenu) {
                            onClickOpenPacketNewWindowMenu()
                        } else {
                            yakitNotify("info", "展示原始编辑器内部")
                        }
                    }
                }
            },
            openBrowser: {
                menu: [
                    {
                        key: "open-in-browser",
                        label: "浏览器中查看响应"
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
                            failed("无法获取数据包内容")
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
                        label: "智能自动解码（Inspector）"
                    }
                ],
                onRun: (editor: YakitIMonacoEditor, key: string) => {
                    try {
                        const text = editor.getModel()?.getValueInRange(editor.getSelection() as any) || ""
                        if (!text) {
                            Modal.info({
                                title: "自动解码失败",
                                content: <>{"文本为空，请选择文本再自动解码"}</>
                            })
                            return
                        }
                        execAutoDecode(text)
                    } catch (e) {
                        failed("editor exec auto-decode failed")
                    }
                }
            },
            disableUnicodeDecode: {
                menu: [
                    {
                        key: "disable-unicode-decode",
                        label: disableUnicodeDecode ? "启用自动 Unicode 解码" : "禁用自动 Unicode 解码"
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
                                label: "下载 Body"
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
                                            yakitNotify("success", "下载成功")
                                        })
                                        .catch((e) => {
                                            yakitNotify("error", `下载body：${e}`)
                                        })
                                    return
                                }
                                const text = editor.getModel()?.getValue()
                                if (!text) {
                                    yakitNotify("info", "无数据包-无法下载 Body")
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
                                label: "复制body（base64）"
                            }
                        ],
                        onRun: (editor: YakitIMonacoEditor, key: string) => {
                            const text = editor.getModel()?.getValue()
                            if (!text) {
                                yakitNotify("info", "无数据包-无法复制 Body")
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
                        label: "发送到WS Fuzzer",
                        children: [
                            {
                                key: "发送并跳转",
                                label: "发送并跳转",
                                keybindings: YakEditorOptionShortcutKey.CommonSendAndJumpToWebFuzzer
                            },
                            {
                                key: "仅发送",
                                label: "仅发送",
                                keybindings: YakEditorOptionShortcutKey.CommonSendToWebFuzzer
                            }
                        ]
                    }
                ],
                onRun: (editor, key) => {
                    try {
                        const text = webSocketValue || editor.getModel()?.getValue() || ""
                        if (!text) {
                            info("数据包为空")
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
                        label: "发送到 Web Fuzzer",
                        children: [
                            {
                                key: "发送并跳转",
                                label: "发送并跳转",
                                keybindings: YakEditorOptionShortcutKey.CommonSendAndJumpToWebFuzzer
                            },
                            {
                                key: "仅发送",
                                label: "仅发送",
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
                                advancedConfigShow = JSON.parse(resShow)
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
                                        info("发送成功")
                                    }
                                    webFuzzerCallBack && webFuzzerCallBack()
                                })
                        }
                    } else {
                        try {
                            const text = webFuzzerValue || editor.getModel()?.getValue() || ""
                            if (!text) {
                                info("数据包为空")
                                return
                            }
                            if (key === "发送并跳转") {
                                newWebFuzzerTab({
                                    isHttps: defaultHttps || false,
                                    request: text,
                                    downstreamProxyStr,
                                    openFlag: true
                                }).finally(() => {
                                    webFuzzerCallBack && webFuzzerCallBack()
                                })
                            } else if (key === "仅发送") {
                                newWebFuzzerTab({
                                    isHttps: defaultHttps || false,
                                    request: text,
                                    downstreamProxyStr,
                                    openFlag: false
                                }).finally(() => {
                                    info("发送成功")
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
        userInfo.isLogin
    ])

    return (
        <YakitEditor
            menuType={rightMenuType}
            readOnly={readOnly}
            contextMenu={rightContextMenu}
            disableUnicodeDecode={disableUnicodeDecode}
            {...restProps}
            {...extraEditorProps}
        />
    )
})
