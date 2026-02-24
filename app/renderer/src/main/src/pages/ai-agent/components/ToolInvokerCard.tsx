import {SolidToolIcon} from "@/assets/icon/solid"
import {FC, memo, ReactNode, useCallback, useEffect, useMemo, useRef, useState} from "react"
import ChatCard from "./ChatCard"
import styles from "./ToolInvokerCard.module.scss"
import classNames from "classnames"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import type {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {grpcQueryAIToolDetails, grpcQueryHTTPFlows} from "../grpc"
import {apiQueryRisksTotalByRuntimeId} from "@/pages/risks/YakitRiskTable/utils"
import {
    AIChatQSData,
    AIChatQSDataTypeEnum,
    AIToolResult,
    AIYakExecFileRecord,
    ReActChatBaseInfo
} from "@/pages/ai-re-act/hooks/aiRender"
import FileList from "./FileList"
import ModalInfo, {ModalInfoProps} from "./ModelInfo"
import emiter from "@/utils/eventBus/eventBus"
import {AITabsEnum} from "../defaultConstant"
import {useCreation, useMemoizedFn} from "ahooks"
import {AIAgentGrpcApi, AIEventQueryRequest} from "@/pages/ai-re-act/hooks/grpcApi"
import {isToolStdoutStream} from "@/pages/ai-re-act/hooks/utils"
import {OutlineArrownarrowrightIcon, OutlineRefreshIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Divider, Tooltip} from "antd"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {formatTimestamp} from "@/utils/timeUtil"
import {OperationCardFooter, OperationCardFooterProps} from "./OperationCardFooter/OperationCardFooter"
import useChatIPCDispatcher from "../useContext/ChatIPCContent/useDispatcher"
import useAIAgentStore from "../useContext/useStore"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {AIChatIPCSendParams} from "../useContext/ChatIPCContent/ChatIPCContent"

/** @name AI工具按钮对应图标 */
const AIToolToIconMap: Record<string, ReactNode> = {
    "enough-cancel": <OutlineArrownarrowrightIcon />
}

interface ToolInvokerCardProps {
    titleText?: string
    fileList?: AIYakExecFileRecord[]
    modalInfo?: ModalInfoProps
    operationInfo: OperationCardFooterProps
    data: AIToolResult
    chatType: ReActChatBaseInfo["chatType"]
    token: string
}
interface PreWrapperProps {
    code: ReactNode
    autoScrollBottom?: boolean
}
interface ToolStatusCardProps {
    status: AIToolResult["tool"]["status"] | "purple"
    title: ReactNode
    children?: ReactNode
}
const ToolInvokerCard: FC<ToolInvokerCardProps> = ({
    titleText,
    fileList,
    modalInfo,
    operationInfo,
    data,
    chatType,
    token
}) => {
    const [loading, setLoading] = useState<boolean>(false)

    const {fetchChatDataStore} = useChatIPCDispatcher().chatIPCEvents
    const {handleSend} = useChatIPCDispatcher()
    const {activeChat} = useAIAgentStore()

    const status = useCreation(() => {
        return data?.tool?.status
    }, [data?.tool?.status])

    const params = useCreation(() => {
        return data?.callToolId
    }, [data?.callToolId])

    const summary = useCreation(() => {
        return data?.tool?.summary || ""
    }, [data?.tool?.summary])

    const content = useCreation(() => {
        return data?.tool?.toolStdoutContent?.content || ""
    }, [data?.tool?.toolStdoutContent?.content])

    const resultDetails = useCreation(() => {
        return data?.tool?.resultDetails || ""
    }, [data?.tool?.resultDetails])

    const selectors = useCreation(() => {
        return data?.stream?.selectors
    }, [data?.stream?.selectors])

    const [statusColor, statusText] = useMemo(() => {
        if (status === "success") return ["success", "成功"]
        if (status === "failed") return ["danger", "失败"]
        return ["white", "已取消"]
    }, [status])

    const [trafficLen, setTrafficLen] = useState<number>(0)
    const [risksLen, setRisksLen] = useState<number>(0)

    const getListToolList = useMemoizedFn(() => {
        if (!data?.callToolId || !activeChat) return
        setLoading(true)
        const params: AIEventQueryRequest = {
            ProcessID: data.callToolId
        }
        grpcQueryAIToolDetails(params)
            .then((res) => {
                const chatItem = fetchChatDataStore()?.getContentMap({
                    session: activeChat?.session,
                    chatType,
                    mapKey: token
                })
                if (!!chatItem && chatItem.type === AIChatQSDataTypeEnum.TOOL_RESULT) {
                    chatItem.data.tool.resultDetails = getResultDetails(res)
                }
            })
            .finally(() =>
                setTimeout(() => {
                    setLoading(false)
                }, 100)
            )
    })

    //  HTTP 流量
    const getHTTPTraffic = useCallback(async () => {
        const result = await grpcQueryHTTPFlows({RuntimeId: params})
        setTrafficLen(+result.Total)
    }, [params])

    // 相关漏洞
    const getQueryRisksTotalByRuntimeId = useCallback(async () => {
        const result = await apiQueryRisksTotalByRuntimeId(params)
        setRisksLen(+result.Total)
    }, [params])

    useEffect(() => {
        Promise.all([getHTTPTraffic(), getQueryRisksTotalByRuntimeId()]).catch((error) => {
            console.error("error:", error)
        })
    }, [getHTTPTraffic, getQueryRisksTotalByRuntimeId])

    const switchAIActTab = (key: AITabsEnum) => {
        emiter.emit(
            "switchAIActTab",
            JSON.stringify({
                key,
                value: params
            })
        )
    }

    const getResultDetails = useMemoizedFn((list: AIChatQSData[]) => {
        let desc: string[] = []
        list.forEach((ele) => {
            const {type, data} = ele
            switch (type) {
                case AIChatQSDataTypeEnum.STREAM:
                    if (isToolStdoutStream(data.NodeId)) {
                        desc.push(data.content.slice(-1000))
                    } else {
                        desc.push(data.content)
                    }
                    break
                case AIChatQSDataTypeEnum.TOOL_CALL_RESULT:
                    desc.push(data.content)
                    break
                default:
                    break
            }
        })
        return desc.join("\n")
    })

    const duration = useCreation(() => {
        return Math.round(data.durationSeconds * 10) / 10
    }, [data.durationSeconds])
    const startTime = useCreation(() => {
        return formatTimestamp(data.startTime)
    }, [data.startTime])

    const onToolExtra = useMemoizedFn((item: AIAgentGrpcApi.ReviewSelector) => {
        switch (item.value) {
            case "enough-cancel":
                onSkip(item)
                break
            default:
                break
        }
    })
    const onSkip = useMemoizedFn((item: AIAgentGrpcApi.ReviewSelector) => {
        if (!selectors?.InteractiveId) return
        const jsonInput = {
            suggestion: item.value
        }
        const params: AIChatIPCSendParams = {
            value: JSON.stringify(jsonInput),
            id: selectors.InteractiveId
        }
        handleSend(params)
    })

    const renderContent = useMemoizedFn(() => {
        switch (data.type) {
            case "stream":
                return (
                    <ToolStatusCard status={"purple"} title={<div>{data.toolName}</div>}>
                        <div className={styles["file-system-content"]}>
                            {data?.stream?.content && (
                                <PreWrapper code={data?.stream?.content || ""} autoScrollBottom />
                            )}
                        </div>
                    </ToolStatusCard>
                )
            case "result":
                return (
                    <ToolStatusCard
                        status={status}
                        title={
                            <div>
                                {data.toolName}
                                <YakitTag size='small' fullRadius color={statusColor as YakitTagColor}>
                                    {statusText}
                                </YakitTag>
                            </div>
                        }
                    >
                        <YakitSpin spinning={loading}>
                            <div className={styles["file-system-content"]}>
                                {!!resultDetails ? (
                                    <PreWrapper code={resultDetails} />
                                ) : (
                                    <>
                                        <div>{summary}</div>
                                        {content && <PreWrapper code={content} />}
                                    </>
                                )}
                            </div>
                        </YakitSpin>
                    </ToolStatusCard>
                )
            default:
                return null
        }
    })

    const renderTitleMore = useMemoizedFn(() => {
        switch (data.type) {
            case "stream":
                return (
                    <div className={styles["tool-invoker-card-extra"]}>
                        {selectors?.selectors && (
                            <div className={styles["stdout-card-extra"]}>
                                {selectors?.selectors?.map((item) => {
                                    return (
                                        <YakitPopconfirm
                                            title='跳过会取消工具调用，使用当前输出结果进行后续工作决策，是否确认跳过'
                                            key={item.value}
                                            onConfirm={() => onToolExtra(item)}
                                        >
                                            <div key={item.value} className={styles["extra-btn"]}>
                                                <span>{item.prompt}</span>
                                                {AIToolToIconMap[item.value]}
                                            </div>
                                        </YakitPopconfirm>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )
            case "result":
                return (
                    <div className={styles["tool-invoker-card-extra"]}>
                        <div className={styles["tool-invoker-card-extra-time"]}>
                            {!!startTime && (
                                <div>
                                    开始时间:<span>{startTime}</span>
                                </div>
                            )}
                            {!!duration && (
                                <div>
                                    执行时长:<span>{duration}</span>s
                                </div>
                            )}
                        </div>

                        {!!risksLen && (
                            <>
                                <label
                                    onClick={() => {
                                        switchAIActTab(AITabsEnum.Risk)
                                    }}
                                >
                                    相关漏洞 <span>{risksLen}</span>
                                </label>
                                <Divider type='vertical' />
                            </>
                        )}
                        {!!trafficLen && (
                            <label
                                onClick={() => {
                                    switchAIActTab(AITabsEnum.HTTP)
                                }}
                            >
                                HTTP 流量 <span>{trafficLen}</span>
                            </label>
                        )}
                        <Tooltip title='刷新代码块数据'>
                            <YakitButton type='text' icon={<OutlineRefreshIcon />} onClick={getListToolList} />
                        </Tooltip>
                    </div>
                )
            default:
                return null
        }
    })
    return (
        <ChatCard
            titleText={titleText}
            titleIcon={<SolidToolIcon />}
            titleMore={renderTitleMore()}
            titleExtra={<>{modalInfo && <ModalInfo {...modalInfo} />}</>}
            footer={<OperationCardFooter {...operationInfo} />}
        >
            {renderContent()}
            {!!fileList?.length && <FileList fileList={fileList} />}
        </ChatCard>
    )
}

export default memo(ToolInvokerCard)

const ToolStatusCard: React.FC<ToolStatusCardProps> = memo((props) => {
    const {status, title, children} = props
    return (
        <div className={classNames(styles["file-system"], styles[`file-system-${status}`])}>
            <div className={styles["file-system-title"]}>{title}</div>
            {children}
        </div>
    )
})

export const PreWrapper: React.FC<PreWrapperProps> = memo((props) => {
    const {code, autoScrollBottom = false} = props

    const containerRef = useRef<HTMLPreElement>(null)
    const [isAtBottom, setIsAtBottom] = useState(true)

    // 只有开启 autoScrollBottom 才监听滚动
    useEffect(() => {
        if (!autoScrollBottom) return

        const el = containerRef.current
        if (!el) return

        const handleScroll = () => {
            const threshold = 20
            const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
            setIsAtBottom(atBottom)
        }

        el.addEventListener("scroll", handleScroll)
        return () => el.removeEventListener("scroll", handleScroll)
    }, [autoScrollBottom])

    // code 更新时：只有在底部 & 开启时才置底
    useEffect(() => {
        if (!autoScrollBottom) return

        const el = containerRef.current
        if (!el) return

        if (isAtBottom) {
            el.scrollTop = el.scrollHeight
        }
    }, [code, isAtBottom, autoScrollBottom])

    return (
        <pre
            ref={containerRef}
            className={styles["file-system-wrapper"]}
            style={{
                maxHeight: 100,
                overflowY: "auto"
            }}
        >
            <code>{code}</code>
        </pre>
    )
})
