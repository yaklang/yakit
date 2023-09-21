import {ArrowsExpandIcon, ArrowsRetractIcon} from "@/assets/newIcon"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {failed, info, yakitFailed} from "@/utils/notification"
import {useCreation, useGetState, useInViewport, useLatest, useMemoizedFn} from "ahooks"
import React, {useEffect, useRef, useState} from "react"
import {MITMResponse} from "../MITMPage"
import styles from "./MITMServerHijacking.module.scss"
import {MITMManualHeardExtra, MITMManualEditor, dropResponse, dropRequest, ManualUrlInfo} from "./MITMManual"
import {MITMLog, MITMLogHeardExtra} from "./MITMLog"
import {ShieldData} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {MITMPluginLogViewer} from "../MITMPluginLogViewer"
import {ExecResultLog} from "@/pages/invoker/batch/ExecMessageViewer"
import {StatusCardProps} from "@/pages/yakitStore/viewers/base"
import ReactResizeDetector from "react-resize-detector"
import classNames from "classnames"
import {useHotkeys} from "react-hotkeys-hook"
import {useStore} from "@/store/mitmState"

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

// 保留数组中非重复数据
const filterNonUnique = (arr) => arr.filter((i) => arr.indexOf(i) === arr.lastIndexOf(i))

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
    const {currentPacket, currentPacketId, isHttp,requestPacket,isResponse} = currentPacketInfo

    const [modifiedPacket, setModifiedPacket] = useState<Uint8Array>(new Buffer([]))

    // 屏蔽数据
    const [shieldData, setShieldData] = useState<ShieldData>({
        data: []
    })

    const [width, setWidth] = useState<number>(0)

    const hijackedContentRef = useRef<any>()
    const [inViewport] = useInViewport(hijackedContentRef)

    const {setIsRefreshHistory} = useStore()

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
    useEffect(() => {
        //获取屏蔽数据
        getRemoteValue("HTTP_FLOW_TABLE_SHIELD_DATA")
            .then((data) => {
                if (!data) return
                try {
                    const cacheData = JSON.parse(data)
                    setShieldData({
                        data: cacheData?.data || []
                    })
                } catch (e) {
                    yakitFailed(`加载屏蔽参数失败: ${e}`)
                }
            })
            .finally(() => {})
    }, [inViewport])
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
                    currentPacket: msg.response,
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
                        currentPacket: msg.request,
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
            ipcRenderer.invoke("mitm-forward-modified-request", modifiedPacket, currentPacketId).finally(() => {
                clearCurrentPacket()
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
    const execFuzzer = useMemoizedFn((value: string) => {
        ipcRenderer.invoke("send-to-tab", {
            type: "fuzzer",
            data: {
                isHttps: isHttp,
                request: isResponse ? requestPacket : value
            }
        })
    })
    const cancleFilter = useMemoizedFn((value) => {
        const newArr = filterNonUnique([...shieldData.data, value])
        const newObj = {...shieldData, data: newArr}
        setShieldData(newObj)
        // 持久化存储
        setRemoteValue("HTTP_FLOW_TABLE_SHIELD_DATA", JSON.stringify(newObj))
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
     * @description 丢弃请求
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
                    />
                )
            case "log":
                return <MITMLogHeardExtra shieldData={shieldData} cancleFilter={cancleFilter} />
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
                                currentPacket={currentPacket}
                                setModifiedPacket={setModifiedPacket}
                                forResponse={forResponse}
                                currentPacketId={currentPacketId}
                                handleAutoForward={handleAutoForward}
                                autoForward={autoForward}
                                forward={forward}
                                hijacking={hijacking}
                                execFuzzer={execFuzzer}
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
                    <MITMLog
                        shieldData={shieldData}
                        setShieldData={(lists) => {
                            setRemoteValue("HTTP_FLOW_TABLE_SHIELD_DATA", JSON.stringify(lists))
                            setShieldData(lists)
                        }}
                    />
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
    return (
        <div className={styles["mitm-hijacked-content"]} ref={hijackedContentRef}>
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
                <div className={styles["mitm-hijacked-heard-right"]}>
                    {onRenderHeardExtra()}
                    {isFullScreen ? (
                        <ArrowsRetractIcon className={styles["expand-icon"]} onClick={() => setIsFullScreen(false)} />
                    ) : (
                        <ArrowsExpandIcon
                            className={styles["expand-icon"]}
                            onClick={() => {
                                setIsFullScreen(true)
                            }}
                        />
                    )}
                </div>
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
