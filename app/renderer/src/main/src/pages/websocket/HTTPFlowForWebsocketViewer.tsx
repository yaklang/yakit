import React, {useEffect, useMemo, useState} from "react"
import {Card} from "antd"
import {HTTPFlow} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {Uint8ArrayToString} from "@/utils/str"
import {ThunderboltOutlined} from "@ant-design/icons"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {HighLightText, OtherMenuListProps} from "@/components/yakitUI/YakitEditor/YakitEditorType"
import {yakitNotify} from "@/utils/notification"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {useMemoizedFn} from "ahooks"
import emiter from "@/utils/eventBus/eventBus"
import {HTTPHistorySourcePageType} from "@/components/HTTPHistory"
import {OutlineLog2Icon} from "@/assets/icon/outline"
import {newWebsocketFuzzerTab} from "./WebsocketFuzzer"
import {HistoryHighLightText} from "@/components/HTTPFlowDetail"
import styles from "./HTTPFlowForWebsocketViewer.module.scss"
import {IMonacoEditor} from "@/utils/editors"
import {YakEditorOptionShortcutKey} from "@/utils/globalShortcutKey/events/page/yakEditor"
import {useSelectionByteCount} from "@/components/yakitUI/YakitEditor/useSelectionByteCount"
export interface HTTPFlowForWebsocketViewerProp {
    pageType?: HTTPHistorySourcePageType
    historyId?: string
    flow: HTTPFlow
    highLightText?: HistoryHighLightText[]
    highLightItem?: HistoryHighLightText
    highLightFindClass?: string
    showJumpTree?: boolean
}

export const HTTPFlowForWebsocketViewer: React.FC<HTTPFlowForWebsocketViewerProp> = (props) => {
    const [mode, setMode] = useState<"request" | "response">("request")
    const {flow, historyId, pageType, highLightText, highLightItem, highLightFindClass, showJumpTree} = props
    const [reqEditor, setReqEditor] = useState<IMonacoEditor>()
    const [resEditor, setResEditor] = useState<IMonacoEditor>()
    const resSelectionByteCount = useSelectionByteCount(resEditor, 500)
    const reqSelectionByteCount = useSelectionByteCount(reqEditor, 500)

    const onScrollTo = useMemoizedFn(() => {
        if (historyId) {
            emiter.emit("onScrollToByClick", JSON.stringify({historyId, id: flow.Id}))
        }
    })

    const handleJumpWebTree = useMemoizedFn(() => {
        try {
            let url = new URL(flow.Url)
            emiter.emit("onHistoryJumpWebTree", JSON.stringify({host: url.host}))
        } catch (error) {
            return ""
        }
    })

    return (
        <Card
            size={"small"}
            className={styles["hTTPFlow-websocket-viewer"]}
            headStyle={{
                height: 32,
                minHeight: 32,
                boxSizing: "content-box"
            }}
            bodyStyle={{padding: 0, width: "100%", height: "calc(100% - 32px)"}}
            title={
                <div className={styles["hTTPFlow-websocket-viewer-title-wrap"]}>
                    <div className={styles["hTTPFlow-websocket-viewer-title-wrap-label"]}>Websocket</div>
                    <YakitTag color={"info"} style={{cursor: "pointer", marginRight: 0}} onClick={onScrollTo}>
                        id：{flow.Id}
                    </YakitTag>
                    <YakitRadioButtons
                        size='small'
                        buttonStyle='solid'
                        value={mode}
                        options={[
                            {value: "request", label: "请求"},
                            {value: "response", label: "响应"}
                        ]}
                        onChange={(e) => setMode(e.target.value)}
                    />
                    <YakitTag color={"info"}>
                        {mode === "request"
                            ? `请求大小：${flow.RequestSizeVerbose}`
                            : `Body大小: ${flow.BodySizeVerbose}`}
                    </YakitTag>
                    {["History"].includes(pageType || "") && showJumpTree && (
                        <OutlineLog2Icon className={styles["jump-web-tree"]} onClick={handleJumpWebTree} />
                    )}
                    {mode === "request" ? (
                        <>{reqSelectionByteCount > 0 && <YakitTag>{reqSelectionByteCount} bytes</YakitTag>}</>
                    ) : (
                        <>{resSelectionByteCount > 0 && <YakitTag>{resSelectionByteCount} bytes</YakitTag>}</>
                    )}
                </div>
            }
            extra={
                <div style={{display: "flex", gap: 2, alignItems: "center"}}>
                    <YakitButton
                        type={"primary"}
                        size={"small"}
                        icon={<ThunderboltOutlined />}
                        onClick={() => {
                            newWebsocketFuzzerTab(flow.IsHTTPS, flow.Request)
                        }}
                    >
                        FUZZ
                    </YakitButton>
                </div>
            }
        >
            <div style={{flex: 1, overflow: "hidden", height: "100%"}}>
                {mode === "request" && (
                    <WebSocketEditor
                        flow={flow}
                        value={Uint8ArrayToString(flow.Request)}
                        highLightText={highLightText?.filter((i) => i.IsMatchRequest)}
                        highLightFind={highLightItem?.IsMatchRequest ? [highLightItem] : []}
                        highLightFindClass={highLightFindClass}
                        isPositionHighLightCursor={highLightItem?.IsMatchRequest ? true : false}
                        onSetEditor={setReqEditor}
                    />
                )}
                {mode === "response" && (
                    <WebSocketEditor
                        flow={flow}
                        value={Uint8ArrayToString(flow.Response)}
                        highLightText={highLightText?.filter((i) => !i.IsMatchRequest)}
                        highLightFind={highLightItem ? (highLightItem.IsMatchRequest ? [] : [highLightItem]) : []}
                        highLightFindClass={highLightFindClass}
                        isPositionHighLightCursor={highLightItem?.IsMatchRequest ? false : true}
                        onSetEditor={setResEditor}
                    />
                )}
            </div>
        </Card>
    )
}

interface WebSocketEditorProps {
    value: string
    flow: HTTPFlow
    contextMenu?: OtherMenuListProps
    highLightText?: HighLightText[]
    highLightFind?: HighLightText[]
    highLightFindClass?: string
    isPositionHighLightCursor?: boolean
    onSetEditor?: (editor: IMonacoEditor) => void
}
export const WebSocketEditor: React.FC<WebSocketEditorProps> = (props) => {
    const {
        flow,
        value,
        contextMenu = {},
        highLightText,
        highLightFind,
        highLightFindClass,
        isPositionHighLightCursor,
        onSetEditor
    } = props

    // 发送到WS Fuzzer
    const sendWebSocketMenuItem: OtherMenuListProps = useMemo(() => {
        return {
            newSocket: {
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
                        const text = flow.Request
                        if (!Uint8ArrayToString(text)) {
                            yakitNotify("info", "数据包为空")
                            return
                        }
                        if (key === "发送并跳转") {
                            newWebsocketFuzzerTab(flow.IsHTTPS, text)
                        } else if (key === "仅发送") {
                            newWebsocketFuzzerTab(flow.IsHTTPS, text, false)
                        }
                    } catch (e) {
                        yakitNotify("error", "editor exec new-open-fuzzer failed")
                    }
                }
            }
        }
    }, [flow.Request, flow.IsHTTPS])

    return (
        <YakitEditor
            type='http'
            value={value}
            readOnly={true}
            noMiniMap={true}
            highLightText={highLightText}
            highLightFind={highLightFind}
            highLightFindClass={highLightFindClass}
            isPositionHighLightCursor={isPositionHighLightCursor}
            contextMenu={{
                ...contextMenu,
                ...sendWebSocketMenuItem
            }}
            editorDidMount={(editor) => {
                onSetEditor && onSetEditor(editor)
            }}
        />
    )
}
