import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {HTTPPacketEditor, NewHTTPPacketEditor} from "@/utils/editors"
import {Divider} from "antd"
import React, {useEffect, useImperativeHandle, useRef, useState,useMemo} from "react"
import {allowHijackedResponseByRequest, MITMStatus} from "./MITMHijackedContent"
import styles from "./MITMServerHijacking.module.scss"
import * as monaco from "monaco-editor"
import classNames from "classnames"
import {useResponsive} from "ahooks"
import {YakitSegmented} from "@/components/yakitUI/YakitSegmented/YakitSegmented"
import { OtherMenuListProps, YakitEditorKeyCode } from "@/components/yakitUI/YakitEditor/YakitEditorType"

const {ipcRenderer} = window.require("electron")

interface MITMManualHeardExtraProps {
    urlInfo: string
    ipInfo: string
    status: MITMStatus
    currentIsWebsocket: boolean
    currentIsForResponse: boolean
    hijackResponseType: "onlyOne" | "all" | "never"
    setHijackResponseType: (v: "onlyOne" | "all" | "never") => void
    onDiscardRequest: () => void
    onSubmitData: () => void
    width: number
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
        width
    } = props
    return (
        <div className={styles["autoForward-manual"]}>
            {width > 900 && (
                <ManualUrlInfo
                    urlInfo={urlInfo}
                    ipInfo={ipInfo}
                    status={status}
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
                    <span className={styles["manual-select-label"]}>劫持响应:</span>
                    <YakitSegmented
                        value={hijackResponseType}
                        onChange={(v) => {
                            setHijackResponseType(v as "onlyOne" | "all" | "never")
                        }}
                        options={[
                            {
                                label: "当前请求",
                                value: "onlyOne"
                            },
                            {
                                label: "所有",
                                value: "all"
                            },
                            {
                                label: "从不",
                                value: "never"
                            }
                        ]}
                    />
                </div>
                <YakitButton
                    type='outline2'
                    disabled={status === "hijacking"}
                    className='button-text-danger'
                    onClick={() => onDiscardRequest()}
                >
                    丢弃请求
                </YakitButton>
                <YakitButton disabled={status === "hijacking"} onClick={() => onSubmitData()}>
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
}
export const ManualUrlInfo: React.FC<ManualUrlInfoProps> = React.memo((props) => {
    const {urlInfo, ipInfo, status, currentIsWebsocket, currentIsForResponse, className} = props
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
            )}
        </div>
    )
})
interface MITMManualEditorProps {
    currentPacket: Uint8Array
    setModifiedPacket: (u: Uint8Array) => void
    forResponse: boolean
    currentPacketId: number
    handleAutoForward: (v: "manual" | "log" | "passive") => void
    autoForward: "manual" | "log" | "passive"
    forward: () => void
    hijacking: () => void
    execFuzzer: (s: string) => void
    status: MITMStatus
    onSetHijackResponseType: (s: string) => void
    currentIsForResponse: boolean
    requestPacket: Uint8Array
}
export const MITMManualEditor: React.FC<MITMManualEditorProps> = React.memo((props) => {
    const {
        currentPacket,
        setModifiedPacket,
        forResponse,
        currentPacketId,
        handleAutoForward,
        autoForward,
        forward,
        hijacking,
        execFuzzer,
        status,
        onSetHijackResponseType,
        currentIsForResponse,
        requestPacket
    } = props
    // 操作系统类型
    const [system, setSystem] = useState<string>()

    useEffect(() => {
        ipcRenderer.invoke("fetch-system-name").then((res) => setSystem(res))
    }, [])


    const mitmManualRightMenu: OtherMenuListProps  = useMemo(() => {
        if(forResponse){
            return {
                forResponseMITMMenu:{
                    menu: [
                        {type: "divider"},
                        {
                            key:"trigger-auto-hijacked",
                            label: "切换为自动劫持模式",
                            keybindings: [
                                YakitEditorKeyCode.Shift,system === "Darwin"?YakitEditorKeyCode.Meta:YakitEditorKeyCode.Control,YakitEditorKeyCode.KEY_T
                            ],
                        },
                        {
                            key:"forward-response",
                            label: "放行该 HTTP Response",
                        },
                        {
                            key:"drop-response",
                            label: "丢弃该 HTTP Response",
                        },
                    ],
                    onRun: (editor, key) => {
                        switch (key) {
                            case "trigger-auto-hijacked":
                                handleAutoForward(autoForward === "manual" ? "log" : "manual")
                                break;
                            case "forward-response":
                                forward()
                                break;
                            case "drop-response":
                                hijacking()
                                dropResponse(currentPacketId).finally(() => {
                                    // setTimeout(
                                    //     () => setLoading(false),
                                    //     300
                                    // )
                                })
                                break;
                            default:
                                break;
                        }
                    }
                }
            }
        }
        else{
            return {
                forResponseMITMMenu:{
                    menu: [
                        {type: "divider"},
                        {
                            key:"trigger-auto-hijacked",
                            label: "切换为自动劫持模式",
                            keybindings: [
                                YakitEditorKeyCode.Shift,system === "Darwin"?YakitEditorKeyCode.Meta:YakitEditorKeyCode.Control,YakitEditorKeyCode.KEY_T
                            ],
                        },
                        {
                            key:"send-to-fuzzer",
                            label: "发送到 Web Fuzzer",
                            keybindings: [
                                YakitEditorKeyCode.Shift,system === "Darwin"?YakitEditorKeyCode.Meta:YakitEditorKeyCode.Control,YakitEditorKeyCode.KEY_R
                            ],
                        },
                        {
                            key:"forward-response",
                            label: "放行该 HTTP Response",
                            keybindings: [
                                YakitEditorKeyCode.Shift,system === "Darwin"?YakitEditorKeyCode.Meta:YakitEditorKeyCode.Control,YakitEditorKeyCode.KEY_F
                            ],
                        },
                        {
                            key:"drop-response",
                            label: "丢弃该 HTTP Response",
                        },
                        {
                            key:"hijack-current-response",
                            label: "劫持该 Request 对应的响应",
                        },
                    ],
                    onRun: (editor:any, key) => {
                        switch (key) {
                            case "trigger-auto-hijacked":
                                handleAutoForward(autoForward === "manual" ? "log" : "manual")
                                break;
                            case "send-to-fuzzer":
                                execFuzzer(editor.getModel().getValue())
                                break;
                            case "forward-response":
                                forward()
                                break;
                            case "drop-response":
                                hijacking()
                                dropResponse(currentPacketId).finally(() => {
                                    // setTimeout(
                                    //     () => setLoading(false),
                                    //     300
                                    // )
                                })
                                break;
                            case "hijack-current-response":
                                onSetHijackResponseType("onlyOne")
                                break;
                            default:
                                break;
                        }
                    }
                }
            }
        }
        
    },[])
    return (
        <NewHTTPPacketEditor
            originValue={currentPacket}
            noHeader={true}
            isResponse={new Buffer(currentPacket.subarray(0, 5)).toString("utf8").startsWith("HTTP/")}
            bordered={false}
            onChange={setModifiedPacket}
            noPacketModifier={true}
            readOnly={status === "hijacking"}
            refreshTrigger={(forResponse ? `rsp` : `req`) + `${currentPacketId}`}
            contextMenu={mitmManualRightMenu}
            editorOperationRecord="MITM_Manual_EDITOR_RECORF"
            webFuzzerValue={currentIsForResponse?requestPacket:undefined}
        />
    )
})

export const dropRequest = (id: number) => {
    return ipcRenderer.invoke("mitm-drop-request", id)
}

export const dropResponse = (id: number) => {
    return ipcRenderer.invoke("mitm-drop-response", id)
}
