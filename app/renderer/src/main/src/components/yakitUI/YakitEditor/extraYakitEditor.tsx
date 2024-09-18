import React, {useEffect, useMemo, useState} from "react"
import {
    OtherMenuListProps,
    YakitEditorExtraRightMenuType,
    YakitEditorKeyCode,
    YakitEditorProps,
    YakitIMonacoEditor
} from "./YakitEditorType"
import {YakitEditor} from "./YakitEditor"
import {failed, info, yakitNotify} from "@/utils/notification"
import {ShareValueProps, newWebFuzzerTab} from "@/pages/fuzzer/HTTPFuzzerPage"
import {generateCSRFPocByRequest} from "@/pages/invoker/fromPacketToYakCode"
import {StringToUint8Array} from "@/utils/str"
import {callCopyToClipboard} from "@/utils/basic"
import {showResponseViaResponseRaw} from "@/components/ShowInBrowser"
import {openExternalWebsite, saveABSFileToOpen} from "@/utils/openWebsite"
import {Modal} from "antd"
import {execAutoDecode} from "@/utils/encodec"
import {YakitSystem} from "@/yakitGVDefine"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitRoute} from "@/enums/yakitRoute"
import {defaultAdvancedConfigShow} from "@/defaultConstants/HTTPFuzzerPage"
import {v4 as uuidv4} from "uuid"
import {newWebsocketFuzzerTab} from "@/pages/websocket/WebsocketFuzzer"
const {ipcRenderer} = window.require("electron")

interface HTTPPacketYakitEditor extends Omit<YakitEditorProps, "menuType"> {
    defaultHttps?: boolean
    originValue: string
    noPacketModifier?: boolean
    extraEditorProps?: YakitEditorProps | any
    isWebSocket?: boolean
    webSocketValue?: string
    webFuzzerValue?: string
    webSocketToServer?: string
    webFuzzerCallBack?: () => void
    downstreamProxyStr?: string
    url?: string
    pageId?: string
    historyId?: number
    isRequestFlag?: boolean
}

export const HTTPPacketYakitEditor: React.FC<HTTPPacketYakitEditor> = React.memo((props) => {
    const {
        defaultHttps = false,
        originValue,
        noPacketModifier = false,
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
        historyId,
        isRequestFlag = false,
        ...restProps
    } = props

    const {queryPagesDataById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )

    const [system, setSystem] = useState<YakitSystem>("Darwin")

    useEffect(() => {
        ipcRenderer.invoke("fetch-system-name").then((systemType: YakitSystem) => {
            setSystem(systemType)
        })
    }, [])

    const rightMenuType: YakitEditorExtraRightMenuType[] = useMemo(() => {
        if (noPacketModifier) {
            return []
        } else {
            return ["http", "customcontextmenu", "aiplugin"]
        }
    }, [noPacketModifier])

    const rightContextMenu: OtherMenuListProps = useMemo(() => {
        const originValueBytes = StringToUint8Array(originValue)
        let menuItems: OtherMenuListProps = {
            ...(contextMenu || {}),
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
                            callCopyToClipboard(code)
                        })
                    } catch (e) {
                        failed("自动生成 CSRF 失败")
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
            downloadBody: {
                menu: [
                    {
                        key: "download-body",
                        label: "下载 Body"
                    }
                ],
                onRun: (editor: YakitIMonacoEditor, key: string) => {
                    try {
                        if (readOnly && historyId) {
                            ipcRenderer
                                .invoke("GetHTTPFlowBodyById", {
                                    Id: historyId,
                                    IsRequest: isRequestFlag,
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
                        ipcRenderer.invoke("GetHTTPPacketBody", {Packet: text}).then((bytes: {Raw: Uint8Array}) => {
                            saveABSFileToOpen("packet-body.txt", bytes.Raw)
                        })
                    } catch (e) {
                        failed("editor exec download body failed")
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
            }
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
                                keybindings: [YakitEditorKeyCode.Control, YakitEditorKeyCode.KEY_R]
                            },
                            {
                                key: "仅发送",
                                label: "仅发送",
                                keybindings: [
                                    YakitEditorKeyCode.Control,
                                    YakitEditorKeyCode.Shift,
                                    YakitEditorKeyCode.KEY_R
                                ]
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
                        label: "发送到 WebFuzzer",
                        children: [
                            {
                                key: "发送并跳转",
                                label: "发送并跳转",
                                keybindings: [YakitEditorKeyCode.Control, YakitEditorKeyCode.KEY_R]
                            },
                            {
                                key: "仅发送",
                                label: "仅发送",
                                keybindings: [
                                    YakitEditorKeyCode.Control,
                                    YakitEditorKeyCode.Shift,
                                    YakitEditorKeyCode.KEY_R
                                ]
                            }
                        ]
                    }
                ],
                onRun: (editor: YakitIMonacoEditor, key: string) => {
                    if (pageId) {
                        const pageInfo: PageNodeItemProps | undefined = queryPagesDataById(
                            YakitRoute.HTTPFuzzer,
                            pageId
                        )
                        if (pageInfo && pageInfo.pageParamsInfo.webFuzzerPageInfo) {
                            const {advancedConfigValue, request} = pageInfo.pageParamsInfo.webFuzzerPageInfo
                            const params: ShareValueProps = {
                                advancedConfigShow: defaultAdvancedConfigShow,
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

        if (url) {
            menuItems = Object.keys(menuItems).reduce((ac, a) => {
                if (a === "copyCSRF") {
                    ac["copyUrl"] = {
                        menu: [
                            {
                                key: "copyUrl",
                                label: "复制 URL"
                            }
                        ],
                        onRun: (editor: YakitIMonacoEditor, key: string) => {
                            callCopyToClipboard(url || "")
                        }
                    }
                }

                if (a === "openBrowser") {
                    ac["openURLBrowser"] = {
                        menu: [
                            {
                                key: "open-url-in-browser",
                                label: "浏览器中打开URL"
                            }
                        ],
                        onRun: (editor: YakitIMonacoEditor, key: string) => {
                            url && openExternalWebsite(url)
                        }
                    }
                }
                ac[a] = menuItems[a]
                return ac
            }, {}) as OtherMenuListProps
        }

        return menuItems
    }, [
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
        historyId,
        isRequestFlag
    ])

    return (
        <YakitEditor
            menuType={["code", "decode", ...rightMenuType]}
            readOnly={readOnly}
            contextMenu={{...rightContextMenu}}
            {...restProps}
            {...extraEditorProps}
        />
    )
})
