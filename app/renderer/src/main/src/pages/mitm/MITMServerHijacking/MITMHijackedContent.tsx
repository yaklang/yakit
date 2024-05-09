import {ArrowsExpandIcon, ArrowsRetractIcon} from "@/assets/newIcon"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {failed, info, yakitFailed} from "@/utils/notification"
import {useCreation, useGetState, useInViewport, useLatest, useMemoizedFn} from "ahooks"
import React, {useEffect, useMemo, useRef, useState} from "react"
import {MITMResponse} from "../MITMPage"
import styles from "./MITMServerHijacking.module.scss"
import {MITMManualHeardExtra, MITMManualEditor, dropResponse, dropRequest, ManualUrlInfo} from "./MITMManual"
import {MITMLogHeardExtra} from "./MITMLog"
import {HTTP_FLOW_TABLE_SHIELD_DATA, ShieldData} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {MITMPluginLogViewer} from "../MITMPluginLogViewer"
import {ExecResultLog} from "@/pages/invoker/batch/ExecMessageViewer"
import {StatusCardProps} from "@/pages/yakitStore/viewers/base"
import ReactResizeDetector from "react-resize-detector"
import classNames from "classnames"
import {useHotkeys} from "react-hotkeys-hook"
import {useStore} from "@/store/mitmState"
import {HTTPHistory} from "@/components/HTTPHistory"
import {RemoteGV} from "@/yakitGV"
import {Alert} from "antd"
import {MITMContentReplacerRule} from "../MITMRule/MITMRuleType"
import emiter from "@/utils/eventBus/eventBus"
import {MITMFilterSchema} from "../MITMServerStartForm/MITMFilters"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineXIcon} from "@/assets/icon/outline"
import {Uint8ArrayToString} from "@/utils/str"
import {prettifyPacketCode} from "@/utils/prettifyPacket"

const {ipcRenderer} = window.require("electron")

export type MITMStatus = "hijacking" | "hijacked" | "idle"
interface MITMHijackedContentProps {
    status: MITMStatus
    setStatus: (status: MITMStatus) => any
    isFullScreen: boolean
    setIsFullScreen: (f: boolean) => void
    logs: ExecResultLog[]
    statusCards: StatusCardProps[]
}

const MITMHijackedContent: React.FC<MITMHijackedContentProps> = React.memo((props) => {
    const {status, setStatus, isFullScreen, setIsFullScreen, logs, statusCards} = props
    // 自动转发 与 劫持响应的自动设置
    const [autoForward, setAutoForward, getAutoForward] = useGetState<"manual" | "log" | "passive">("log")

    const [hijackResponseType, setHijackResponseType] = useState<"onlyOne" | "all" | "never">("never") // 劫持类型

    const [forResponse, setForResponse] = useState(false)
    const [urlInfo, setUrlInfo] = useState("监听中...")
    const [ipInfo, setIpInfo] = useState("")

    // 当前正在劫持的请求/响应，是否是 Websocket
    const [currentIsWebsocket, setCurrentIsWebsocket] = useState(false)
    // 当前正在劫持的请求/响应
    const [currentIsForResponse, setCurrentIsForResponse] = useState(false)

    // 存储修改前和修改后的包！
    const [currentPacketInfo, setCurrentPacketInfo] = useState<{
        requestPacket: Uint8Array
        currentPacket: Uint8Array
        currentPacketId: number
        isHttp: boolean
        isResponse: boolean
    }>({
        requestPacket: new Buffer([]),
        currentPacketId: 0,
        currentPacket: new Buffer([]),
        isHttp: true,
        isResponse: false
    })
    const {currentPacket, currentPacketId, isHttp, requestPacket, isResponse} = currentPacketInfo

    const [modifiedPacket, setModifiedPacket] = useState<Uint8Array>(new Buffer([]))

    const [width, setWidth] = useState<number>(0)

    const {setIsRefreshHistory} = useStore()

    const [calloutColor, setCalloutColor] = useState<string>("")

    const [whiteListFlag, setWhiteListFlag] = useState<boolean>(false) // 是否配置过过滤器白名单文案
    const [openRepRuleFlag, setOpenRepRuleFlag] = useState<boolean>(false) // 是否开启过替换规则
    const [alertVisible, setAlertVisible] = useState<boolean>(false)

    const [beautifyOpen, setBeautifyOpen] = useState<boolean>(false)
    const [currentBeautifyPacket, setCurrentBeautifyPacket] = useState<Uint8Array>(new Buffer([]))

    const getMITMFilter = useMemoizedFn(() => {
        ipcRenderer
            .invoke("mitm-get-filter")
            .then((val: MITMFilterSchema) => {
                const includeHostnameFlag = val?.includeHostname ? !!val?.includeHostname.length : false
                const includeUriFlag = val?.includeUri ? !!val?.includeUri.length : false
                const includeSuffixFlag = val?.includeSuffix ? !!val?.includeSuffix.length : false
                const flag = includeHostnameFlag || includeUriFlag || includeSuffixFlag
                setWhiteListFlag(flag)
                if (flag) {
                    setAlertVisible(true)
                }
            })
            .catch((err) => {
                yakitFailed("获取 MITM 过滤器失败:" + err)
            })
    })
    useEffect(() => {
        getMITMFilter()
        const onSetFilterWhiteListEvent = (flag: string) => {
            const val = flag === "true"
            setWhiteListFlag(val)
            if (val) {
                setAlertVisible(true)
            }
        }
        emiter.on("onSetFilterWhiteListEvent", onSetFilterWhiteListEvent)
        return () => {
            emiter.off("onSetFilterWhiteListEvent", onSetFilterWhiteListEvent)
        }
    }, [])

    const getRules = useMemoizedFn(() => {
        ipcRenderer
            .invoke("GetCurrentRules", {})
            .then((rsp: {Rules: MITMContentReplacerRule[]}) => {
                const newRules = rsp.Rules.map((ele) => ({...ele, Id: ele.Index}))
                const findOpenRepRule = newRules.find(
                    (item) => !item.Disabled && (!item.NoReplace || item.Drop || item.ExtraRepeat)
                )
                const flag = findOpenRepRule !== undefined
                setOpenRepRuleFlag(flag)
                if (flag) {
                    setAlertVisible(true)
                }
            })
            .catch((e) => yakitFailed("获取规则列表失败:" + e))
    })
    useEffect(() => {
        getRules()
        const onOpenRepRuleEvent = (flag: string) => {
            const val = flag === "true"
            setOpenRepRuleFlag(val)
            if (val) {
                setAlertVisible(true)
            }
        }
        emiter.on("onOpenRepRuleEvent", onOpenRepRuleEvent)
        return () => {
            emiter.off("onOpenRepRuleEvent", onOpenRepRuleEvent)
        }
    }, [])

    const isManual = useCreation(() => {
        return autoForward === "manual"
    }, [autoForward])
    useEffect(() => {
        ipcRenderer.on("client-mitm-hijacked", forwardHandler)
        return () => {
            ipcRenderer.removeAllListeners("client-mitm-hijacked")
        }
    }, [autoForward])

    useEffect(() => {
        ipcRenderer.invoke("mitm-auto-forward", !isManual).finally(() => {
            console.info(`设置服务端自动转发：${!isManual}`)
        })
    }, [autoForward])
    useEffect(() => {
        if (hijackResponseType === "all" && currentPacketId > 0) {
            allowHijackedResponseByRequest(currentPacketId)
        }
    }, [hijackResponseType, currentPacketId])
    // 自动转发劫持，进行的操作
    const forwardHandler = useMemoizedFn((e: any, msg: MITMResponse) => {
        if (msg?.RemoteAddr) {
            setIpInfo(msg?.RemoteAddr)
        } else {
            setIpInfo("")
        }
        setCurrentIsWebsocket(!!msg?.isWebsocket)
        setCurrentIsForResponse(!!msg?.forResponse)

        if (msg.forResponse) {
            if (!msg.response || !msg.responseId) {
                yakitFailed("BUG: MITM 错误，未能获取到正确的 Response 或 Response ID")
                return
            }
            if (!isManual) {
                forwardResponse(msg.responseId || 0)
                if (!!currentPacket) {
                    clearCurrentPacket()
                }
            } else {
                setForResponse(true)
                setStatus("hijacked")
                setCurrentPacketInfo({
                    currentPacket: !!msg?.isWebsocket ? msg.Payload : msg.response,
                    currentPacketId: msg.responseId,
                    isHttp: msg.isHttps,
                    requestPacket: msg.request,
                    isResponse: true
                })
            }
        } else {
            if (msg.request) {
                if (!isManual) {
                    forwardRequest(msg.id)
                    if (!!currentPacket) {
                        clearCurrentPacket()
                    }
                    // setCurrentPacket(String.fromCharCode.apply(null, msg.request))
                } else {
                    setStatus("hijacked")
                    setForResponse(false)
                    // setCurrentPacket(msg.request)
                    // setCurrentPacketId(msg.id)
                    setCurrentPacketInfo({
                        currentPacket: !!msg?.isWebsocket ? msg.Payload : msg.request,
                        currentPacketId: msg.id,
                        isHttp: msg.isHttps,
                        requestPacket: msg.request,
                        isResponse: true
                    })
                    setUrlInfo(msg.url)
                    // ipcRenderer.invoke("fetch-url-ip", msg.url.split('://')[1].split('/')[0]).then((res) => {
                    //     setIpInfo(res)
                    // })
                }
            }
        }
    })
    const clearCurrentPacket = () => {
        setCurrentPacketInfo({
            currentPacketId: 0,
            currentPacket: new Buffer([]),
            requestPacket: new Buffer([]),
            isHttp: true,
            isResponse: false
        })
    }
    const handleAutoForward = useMemoizedFn((e: "manual" | "log" | "passive") => {
        try {
            if (!isManual) {
                setHijackResponseType("never")
            }
            setAutoForward(e)
            if (currentPacket && currentPacketId) {
                forward()
            }
        } catch (e) {
            console.info(e)
        }
    })
    /**
     * @description 这个 Forward 主要用来转发修改后的内容，同时可以转发请求和响应
     */
    const forward = useMemoizedFn(() => {
        // ID 不存在
        if (!currentPacketId) {
            return
        }
        setIsRefreshHistory(true)
        // setLoading(true);
        setStatus("hijacking")
        if (hijackResponseType !== "all") {
            setHijackResponseType("never")
        }
        setForResponse(false)
        if (forResponse) {
            ipcRenderer.invoke("mitm-forward-modified-response", modifiedPacket, currentPacketId).finally(() => {
                clearCurrentPacket()
                // setTimeout(() => setLoading(false))
            })
        } else {
            ipcRenderer
                .invoke("mitm-forward-modified-request", modifiedPacket, currentPacketId, [calloutColor])
                .finally(() => {
                    clearCurrentPacket()
                    setCalloutColor("")
                    // setTimeout(() => setLoading(false))
                })
        }
    })
    const hijacking = useMemoizedFn(() => {
        // setCurrentPacket(new Buffer([]));
        clearCurrentPacket()
        // setLoading(true);
        setStatus("hijacking")
    })
    /**
     * @description 切换劫持类型
     */
    const onSetHijackResponseType = useMemoizedFn((val) => {
        switch (val) {
            case "onlyOne":
                allowHijackedResponseByRequest(currentPacketId)
                break
            case "all":
                if (currentPacketId > 0) {
                    allowHijackedResponseByRequest(currentPacketId)
                }
                info("劫持所有响应内容")
                break
            case "never":
                cancelHijackedResponseByRequest(currentPacketId)
                info("仅劫持请求")
                break
            default:
                break
        }
        setHijackResponseType(val)
    })
    /**
     * @description 丢弃数据
     */
    const onDiscardRequest = useMemoizedFn(() => {
        hijacking()
        if (forResponse) {
            dropResponse(currentPacketId).finally(() => {
                setTimeout(() => {
                    // setLoading(false)
                }, 300)
            })
        } else {
            dropRequest(currentPacketId).finally(() => {
                // setTimeout(() => setLoading(false), 300)
            })
        }
        setForResponse(false)
        setCalloutColor("")
        setUrlInfo("监听中...")
        setIpInfo("")
    })
    useHotkeys(
        "ctrl+t",
        () => {
            handleAutoForward(isManual ? "manual" : "log")
        },
        [autoForward]
    )

    /**
     * 美化
     */
    useEffect(() => {
        const currentPacketStr = Uint8ArrayToString(currentPacket)
        if (currentPacketStr === "") {
            setCurrentBeautifyPacket(currentPacket)
            return
        }
        const encoder = new TextEncoder()
        const bytes = encoder.encode(currentPacketStr)
        const mb = bytes.length / 1024 / 1024
        if (mb > 0.5) {
            console.log(1);
            setCurrentBeautifyPacket(currentPacket)
        } else {
            console.log(2);
            prettifyPacketCode(currentPacketStr)
                .then((res) => {
                    setCurrentBeautifyPacket(res as Uint8Array)
                })
                .catch(() => {
                    setCurrentBeautifyPacket(currentPacket)
                })
        }
    }, [Uint8ArrayToString(currentPacket)])
    const onSetBeautifyOpen = (flag: boolean) => {
        setBeautifyOpen(flag)
    }

    const onRenderHeardExtra = useMemoizedFn(() => {
        switch (autoForward) {
            case "manual":
                return (
                    <MITMManualHeardExtra
                        urlInfo={urlInfo}
                        ipInfo={ipInfo}
                        status={status}
                        currentIsWebsocket={currentIsWebsocket}
                        currentIsForResponse={currentIsForResponse}
                        hijackResponseType={hijackResponseType}
                        setHijackResponseType={onSetHijackResponseType}
                        onDiscardRequest={onDiscardRequest}
                        onSubmitData={forward}
                        width={width}
                        calloutColor={calloutColor}
                        onSetCalloutColor={setCalloutColor}
                        beautifyOpen={beautifyOpen}
                        onSetBeautifyOpen={onSetBeautifyOpen}
                    />
                )
            case "log":
                return <MITMLogHeardExtra />
            default:
                break
        }
    })

    const onRenderContent = useMemoizedFn(() => {
        switch (autoForward) {
            // 手动劫持
            case "manual":
                return (
                    <div className={styles["mitm-hijacked-manual-content"]}>
                        {width < 900 && (
                            <ManualUrlInfo
                                urlInfo={urlInfo}
                                ipInfo={ipInfo}
                                status={status}
                                currentIsWebsocket={currentIsWebsocket}
                                currentIsForResponse={currentIsForResponse}
                                className={styles["mitm-hijacked-manual-content-url"]}
                            />
                        )}
                        <div className={styles["mitm-hijacked-manual-content-editor"]}>
                            <MITMManualEditor
                                isHttp={isHttp}
                                currentIsWebsocket={currentIsWebsocket}
                                currentPacket={beautifyOpen ? currentBeautifyPacket : currentPacket}
                                beautifyOpen={beautifyOpen}
                                setModifiedPacket={setModifiedPacket}
                                forResponse={forResponse}
                                currentPacketId={currentPacketId}
                                handleAutoForward={handleAutoForward}
                                autoForward={autoForward}
                                forward={forward}
                                hijacking={hijacking}
                                status={status}
                                onSetHijackResponseType={onSetHijackResponseType}
                                currentIsForResponse={currentIsForResponse}
                                requestPacket={requestPacket}
                            />
                        </div>
                    </div>
                )
            // 自动放行
            case "log":
                return (
                    <>
                        <HTTPHistory pageType='MITM' />
                    </>
                )
            // 被动日志
            case "passive":
                return (
                    <div className={styles["mitm-hijacked-passive-content"]}>
                        <MITMPluginLogViewer messages={logs} status={statusCards} />
                    </div>
                )
            default:
                break
        }
    })

    // 提示文案
    const alertMsg = useMemo(() => {
        if (whiteListFlag && openRepRuleFlag) return "检测到配置替换规则和过滤器白名单，如抓包有问题可先将配置关闭"
        if (whiteListFlag) return "检测到配置过滤器白名单，如抓包有问题可先将白名单设置关闭"
        if (openRepRuleFlag) return "检测到配置替换规则，如抓包有问题可先将替换关闭"
        return ""
    }, [openRepRuleFlag, whiteListFlag])
    useEffect(() => {
        if (alertMsg === "") {
            setAlertVisible(false)
        }
    }, [alertMsg])

    return (
        <div className={styles["mitm-hijacked-content"]} style={{paddingLeft: isFullScreen ? 13 : 5}}>
            <ReactResizeDetector
                onResize={(w, h) => {
                    if (!w) {
                        return
                    }
                    setWidth(w)
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <div className={styles["mitm-hijacked-heard"]}>
                <div className={styles["mitm-hijacked-heard-left"]}>
                    <YakitRadioButtons
                        buttonStyle='solid'
                        value={autoForward}
                        options={[
                            {label: "手动劫持", value: "manual"},
                            {label: "自动放行", value: "log"},
                            {label: "被动日志", value: "passive"}
                        ]}
                        onChange={(e) => {
                            handleAutoForward(e.target.value)
                        }}
                    />
                </div>
                <div className={styles["mitm-hijacked-heard-right"]}>{onRenderHeardExtra()}</div>
            </div>
            <div className={styles["mitm-alert-msg"]} style={{display: alertVisible ? "block" : "none"}}>
                {alertMsg}
                <YakitButton
                    style={{float: "right"}}
                    type='text2'
                    size={"middle"}
                    icon={<OutlineXIcon />}
                    onClick={() => setAlertVisible(false)}
                />
            </div>
            {onRenderContent()}
        </div>
    )
})

export default MITMHijackedContent

const forwardRequest = (id: number) => {
    return ipcRenderer.invoke("mitm-forward-request", id)
}

const forwardResponse = (id: number) => {
    return ipcRenderer.invoke("mitm-forward-response", id)
}

export const allowHijackedResponseByRequest = (id: number) => {
    return ipcRenderer.invoke("mitm-hijacked-current-response", id, true)
}
export const cancelHijackedResponseByRequest = (id: number) => {
    return ipcRenderer.invoke("mitm-hijacked-current-response", id, false)
}
