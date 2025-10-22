import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {NewHTTPPacketEditor} from "@/utils/editors"
import {Divider} from "antd"
import React, {useEffect, useState, useMemo} from "react"
import {MITMStatus} from "./MITMHijackedContent"
import styles from "./MITMServerHijacking.module.scss"
import classNames from "classnames"
import {OtherMenuListProps} from "@/components/yakitUI/YakitEditor/YakitEditorType"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {availableColors} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {EditorMenuItemType} from "@/components/yakitUI/YakitEditor/EditorMenu"
import {TraceInfo} from "../MITMPage"
import {useMemoizedFn} from "ahooks"
import {openPacketNewWindow} from "@/utils/openWebsite"
import {grpcMITMDropRequestById, grpcMITMDropResponseById} from "../MITMHacker/utils"
import {ManualHijackTypeProps} from "../MITMManual/MITMManualType"
import {YakitKeyBoard, YakitKeyMod} from "@/utils/globalShortcutKey/keyboard"
import {YakEditorOptionShortcutKey} from "@/utils/globalShortcutKey/events/page/yakEditor"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

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
    const {t, i18n} = useI18nNamespaces(["mitm", "yakitUi"])
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
                        {t("MITMManualHeardExtra.labelColor")}
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
                            <div style={{paddingLeft: 20}}>{t("MITMManualHeardExtra.none")}</div>
                        </YakitSelect.Option>
                        {availableColors.map((item) => (
                            <YakitSelect.Option value={item.searchWord} key={item.searchWord}>
                                {item.render(t)}
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
                        {t("YakitButton.beautify")}
                    </YakitButton>
                </div>
                <div className={styles["manual-select"]}>
                    <span className={styles["manual-select-label"]}>{t("MITMManualHeardExtra.hijackResponse")}</span>
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
                    {t("MITMManualHeardExtra.discardData")}
                </YakitButton>
                <YakitButton disabled={status === "hijacking"} onClick={() => onSubmitData(true)}>
                    {t("MITMManualHeardExtra.submitData")}
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
    const {t, i18n} = useI18nNamespaces(["mitm"])

    return (
        <div className={classNames(styles["autoForward-manual-urlInfo"], className)}>
            <div className={classNames(styles["manual-url-info"], "content-ellipsis")}>
                {status === "hijacking" ? t("ManualUrlInfo.targetListening") : `${t("ManualUrlInfo.target")}${urlInfo}`}
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
                    Websocket {currentIsForResponse ? t("ManualUrlInfo.response") : t("ManualUrlInfo.request")}
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
                    {t("ManualUrlInfo.httpResponse")}
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
                        {t("ManualUrlInfo.httpRequest")}
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
    modifiedPacket: string
    setModifiedPacket: (u: string) => void
    forResponse: boolean
    currentPacketId: number
    handleAutoForward: (v: ManualHijackTypeProps) => void
    autoForward: ManualHijackTypeProps
    forward: (isManual: boolean) => void
    hijacking: () => void
    status: MITMStatus
    onSetHijackResponseType: (s: string) => void
    currentIsForResponse: boolean
    requestPacket: string
    beautifyTriggerRefresh: boolean
    taskId?: string
}
export const MITMManualEditor: React.FC<MITMManualEditorProps> = React.memo((props) => {
    const {
        urlInfo,
        isHttp,
        currentIsWebsocket,
        currentPacket,
        modifiedPacket,
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
    const {t, i18n} = useI18nNamespaces(["mitm"])
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
                    label: t("MITMManualEditor.switchToAutoHijackMode"),
                    keybindings: YakEditorOptionShortcutKey.TriggerAutoHijacked
                },
                {
                    key: "forward-response",
                    label: t("MITMManualEditor.allowThisHttpResponse")
                },
                {
                    key: "drop-response",
                    label: t("MITMManualEditor.discardThisHttpResponse")
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
                    label: t("MITMManualEditor.switchToAutoHijackMode"),
                    keybindings: YakEditorOptionShortcutKey.TriggerAutoHijacked
                },
                {
                    key: "forward-response",
                    label: t("MITMManualEditor.allowThisHttpResponse"),
                    keybindings: YakEditorOptionShortcutKey.ForwardResponse
                },
                {
                    key: "drop-response",
                    label: t("MITMManualEditor.discardThisHttpResponse")
                },
                {
                    key: "hijack-current-response",
                    label: t("MITMManualEditor.hijackResponseOfRequest")
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
    }, [forResponse, autoForward, currentPacketId, i18n.language])

    return (
        <NewHTTPPacketEditor
            defaultHttps={isHttp}
            url={urlInfo === t("MITMManualEditor.listening") ? "" : urlInfo}
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
            onClickOpenPacketNewWindowMenu={useMemoizedFn(() => {
                openPacketNewWindow({
                    request: {
                        originValue: modifiedPacket
                    }
                })
            })}
        />
    )
})

export const dropRequest = (id: number) => {
    return grpcMITMDropRequestById(id, true)
}

export const dropResponse = (id: number) => {
    return grpcMITMDropResponseById(id, true)
}
