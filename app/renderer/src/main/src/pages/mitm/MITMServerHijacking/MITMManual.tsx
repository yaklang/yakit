import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {NewHTTPPacketEditor} from "@/utils/editors"
import {Divider} from "antd"
import React, {useEffect, useState, useMemo} from "react"
import {MITMStatus} from "./MITMHijackedContent"
import styles from "./MITMServerHijacking.module.scss"
import classNames from "classnames"
import {OtherMenuListProps, YakitEditorKeyCode} from "@/components/yakitUI/YakitEditor/YakitEditorType"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {availableColors} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {EditorMenuItemType} from "@/components/yakitUI/YakitEditor/EditorMenu"
import {TraceInfo} from "../MITMPage"

const {ipcRenderer} = window.require("electron")

interface MITMManualHeardExtraProps {
    urlInfo: string
    ipInfo: string
    status: MITMStatus
    currentIsWebsocket: boolean
    currentIsForResponse: boolean
    hijackResponseType: "onlyOne" | "all" | "never"
    traceInfo: TraceInfo
    setHijackResponseType: (v: "onlyOne" | "all" | "never") => void
    onDiscardRequest: () => void
    onSubmitData: (isManual: boolean) => void
    width: number
    calloutColor: string
    onSetCalloutColor: (calloutColor: string) => void
    beautifyTriggerRefresh: boolean
    onSetBeautifyTrigger: (beautifyTriggerRefresh: boolean) => void
}
export const MITMManualHeardExtra: React.FC<MITMManualHeardExtraProps> = React.memo((props) => {
    const {
        urlInfo,
        ipInfo,
        status,
        currentIsWebsocket,
        currentIsForResponse,
        hijackResponseType,
        setHijackResponseType,
        onDiscardRequest,
        onSubmitData,
        width,
        calloutColor,
        onSetCalloutColor,
        beautifyTriggerRefresh,
        onSetBeautifyTrigger,
        traceInfo
    } = props
    return (
        <div className={styles["autoForward-manual"]}>
            {width > 900 && (
                <ManualUrlInfo
                    urlInfo={urlInfo}
                    ipInfo={ipInfo}
                    status={status}
                    traceInfo={traceInfo}
                    currentIsWebsocket={currentIsWebsocket}
                    currentIsForResponse={currentIsForResponse}
                />
            )}
            <div
                className={classNames(styles["autoForward-manual-right"], {
                    [styles["autoForward-manual-right-sm"]]: width < 900
                })}
            >
                <div className={styles["manual-select"]}>
                    <div className={styles["manual-select-label"]} style={{minWidth: 60}}>
                        标注颜色:
                    </div>
                    <YakitSelect
                        size='small'
                        value={calloutColor}
                        wrapperStyle={{width: 100}}
                        onChange={(value) => {
                            onSetCalloutColor(value || "")
                        }}
                    >
                        <YakitSelect.Option value={""}>
                            <div style={{paddingLeft: 20}}>无</div>
                        </YakitSelect.Option>
                        {availableColors.map((item) => (
                            <YakitSelect.Option value={item.searchWord} key={item.searchWord}>
                                {item.render}
                            </YakitSelect.Option>
                        ))}
                    </YakitSelect>
                </div>
                <div className={styles["manual-select"]}>
                    <YakitButton
                        type='primary'
                        size='small'
                        onClick={() => onSetBeautifyTrigger(!beautifyTriggerRefresh)}
                    >
                        美化
                    </YakitButton>
                </div>
                <div className={styles["manual-select"]}>
                    <span className={styles["manual-select-label"]}>劫持响应:</span>
                    <YakitSwitch
                        checked={hijackResponseType === "all"}
                        onChange={(val: boolean) => {
                            if (val) setHijackResponseType("all")
                            else setHijackResponseType("never")
                        }}
                    />
                </div>
                <YakitButton
                    type='outline1'
                    colors='danger'
                    disabled={status === "hijacking"}
                    onClick={() => onDiscardRequest()}
                >
                    丢弃数据
                </YakitButton>
                <YakitButton disabled={status === "hijacking"} onClick={() => onSubmitData(true)}>
                    提交数据
                </YakitButton>
            </div>
        </div>
    )
})

interface ManualUrlInfoProps {
    urlInfo: string
    ipInfo: string
    status: MITMStatus
    currentIsWebsocket: boolean
    currentIsForResponse: boolean
    className?: string
    traceInfo: TraceInfo
}
export const ManualUrlInfo: React.FC<ManualUrlInfoProps> = React.memo((props) => {
    const {urlInfo, ipInfo, status, currentIsWebsocket, currentIsForResponse, className, traceInfo} = props
    return (
        <div className={classNames(styles["autoForward-manual-urlInfo"], className)}>
            <div className={classNames(styles["manual-url-info"], "content-ellipsis")}>
                {status === "hijacking" ? "目标：监听中..." : `目标：${urlInfo}`}
            </div>
            {ipInfo && status !== "hijacking" && (
                <>
                    <Divider type='vertical' style={{margin: "0 8px", top: 0}} />
                    <span className={styles["manual-ip-info"]}>
                        <span>{ipInfo}</span> <CopyComponents copyText={ipInfo} />
                    </span>
                </>
            )}

            {currentIsWebsocket && status !== "hijacking" ? (
                <YakitTag
                    color='danger'
                    style={{
                        marginLeft: 8,
                        alignSelf: "center",
                        maxWidth: 140,
                        cursor: "pointer"
                    }}
                    size='small'
                >
                    Websocket {currentIsForResponse ? "响应" : "请求"}
                </YakitTag>
            ) : currentIsForResponse && status !== "hijacking" ? (
                <YakitTag
                    color='success'
                    style={{
                        marginLeft: 8,
                        alignSelf: "center",
                        maxWidth: 140,
                        cursor: "pointer"
                    }}
                    size='small'
                >
                    HTTP 响应
                </YakitTag>
            ) : (
                <>
                    <YakitTag
                        color='success'
                        style={{
                            marginLeft: 8,
                            alignSelf: "center",
                            maxWidth: 140,
                            cursor: "pointer"
                        }}
                        size='small'
                    >
                        HTTP 请求
                    </YakitTag>
                </>
            )}
            {traceInfo.DurationMs ? (
                <YakitTag
                    style={{
                        alignSelf: "center",
                        maxWidth: 100,
                        cursor: "pointer",
                        padding: "0 4px"
                    }}
                    size='small'
                >
                    {traceInfo.DurationMs} ms
                </YakitTag>
            ) : (
                <></>
            )}
        </div>
    )
})
interface MITMManualEditorProps {
    urlInfo: string
    isHttp: boolean
    currentIsWebsocket: boolean
    currentPacket: string
    setModifiedPacket: (u: string) => void
    forResponse: boolean
    currentPacketId: number
    handleAutoForward: (v: "manual" | "log" | "passive") => void
    autoForward: "manual" | "log" | "passive"
    forward: (isManual: boolean) => void
    hijacking: () => void
    status: MITMStatus
    onSetHijackResponseType: (s: string) => void
    currentIsForResponse: boolean
    requestPacket: string
    beautifyTriggerRefresh: boolean
}
export const MITMManualEditor: React.FC<MITMManualEditorProps> = React.memo((props) => {
    const {
        urlInfo,
        isHttp,
        currentIsWebsocket,
        currentPacket,
        setModifiedPacket,
        forResponse,
        currentPacketId,
        handleAutoForward,
        autoForward,
        forward,
        hijacking,
        status,
        onSetHijackResponseType,
        currentIsForResponse,
        requestPacket,
        beautifyTriggerRefresh
    } = props
    // 操作系统类型
    const [system, setSystem] = useState<string>()

    useEffect(() => {
        ipcRenderer.invoke("fetch-system-name").then((res) => setSystem(res))
    }, [])

    const mitmManualRightMenu: OtherMenuListProps = useMemo(() => {
        if (forResponse) {
            const menu: EditorMenuItemType[] = [
                {type: "divider"},
                {
                    key: "trigger-auto-hijacked",
                    label: "切换为自动劫持模式",
                    keybindings: [
                        YakitEditorKeyCode.Shift,
                        system === "Darwin" ? YakitEditorKeyCode.Meta : YakitEditorKeyCode.Control,
                        YakitEditorKeyCode.KEY_T
                    ]
                },
                {
                    key: "forward-response",
                    label: "放行该 HTTP Response"
                },
                {
                    key: "drop-response",
                    label: "丢弃该 HTTP Response"
                }
            ]
            return {
                forResponseMITMMenu: {
                    menu: menu,
                    onRun: (editor: any, key) => {
                        switch (key) {
                            case "trigger-auto-hijacked":
                                handleAutoForward(autoForward === "manual" ? "log" : "manual")
                                break
                            case "forward-response":
                                forward(autoForward === "manual")
                                break
                            case "drop-response":
                                hijacking()
                                dropResponse(currentPacketId)
                                break
                            default:
                                break
                        }
                    }
                }
            }
        } else {
            const menu: EditorMenuItemType[] = [
                {type: "divider"},
                {
                    key: "trigger-auto-hijacked",
                    label: "切换为自动劫持模式",
                    keybindings: [
                        YakitEditorKeyCode.Shift,
                        system === "Darwin" ? YakitEditorKeyCode.Meta : YakitEditorKeyCode.Control,
                        YakitEditorKeyCode.KEY_T
                    ]
                },
                {
                    key: "forward-response",
                    label: "放行该 HTTP Response",
                    keybindings: [
                        YakitEditorKeyCode.Shift,
                        system === "Darwin" ? YakitEditorKeyCode.Meta : YakitEditorKeyCode.Control,
                        YakitEditorKeyCode.KEY_F
                    ]
                },
                {
                    key: "drop-response",
                    label: "丢弃该 HTTP Response"
                },
                {
                    key: "hijack-current-response",
                    label: "劫持该 Request 对应的响应"
                }
            ]

            return {
                forResponseMITMMenu: {
                    menu: menu,
                    onRun: (editor: any, key) => {
                        switch (key) {
                            case "trigger-auto-hijacked":
                                handleAutoForward(autoForward === "manual" ? "log" : "manual")
                                break
                            case "forward-response":
                                forward(autoForward === "manual")
                                break
                            case "drop-response":
                                hijacking()
                                dropResponse(currentPacketId)
                                break
                            case "hijack-current-response":
                                onSetHijackResponseType("onlyOne")
                                setTimeout(() => {
                                    forward(autoForward === "manual")
                                }, 200)
                                break
                            default:
                                break
                        }
                    }
                }
            }
        }
    }, [forResponse, autoForward, currentPacketId])

    return (
        <NewHTTPPacketEditor
            defaultHttps={isHttp}
            url={urlInfo === "监听中..." ? "" : urlInfo}
            originValue={currentPacket}
            noHeader={true}
            isResponse={currentPacket.substring(0, 5).startsWith("HTTP/")}
            bordered={false}
            onChange={setModifiedPacket}
            noPacketModifier={true}
            readOnly={status === "hijacking"}
            refreshTrigger={
                (forResponse ? `rsp` : `req`) + `${currentPacketId}${currentPacket}${beautifyTriggerRefresh}`
            }
            contextMenu={mitmManualRightMenu}
            editorOperationRecord='MITM_Manual_EDITOR_RECORF'
            isWebSocket={currentIsWebsocket && status !== "hijacking"}
            webSocketValue={requestPacket}
            webSocketToServer={currentPacket}
            webFuzzerValue={currentIsForResponse ? requestPacket : undefined}
            extraEditorProps={{
                isShowSelectRangeMenu: true
            }}
            showDownBodyMenu={false}
        />
    )
})

export const dropRequest = (id: number) => {
    return ipcRenderer.invoke("mitm-drop-request", id)
}

export const dropResponse = (id: number) => {
    return ipcRenderer.invoke("mitm-drop-response", id)
}
