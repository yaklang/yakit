import {SolidToolIcon} from "@/assets/icon/solid"
import {FC, memo, ReactNode, useCallback, useEffect, useMemo, useRef, useState} from "react"
import ChatCard from "./ChatCard"
import styles from "./ToolInvokerCard.module.scss"
import classNames from "classnames"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import type {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {grpcQueryHTTPFlows} from "../grpc"
import {apiQueryRisksTotalByRuntimeId} from "@/pages/risks/YakitRiskTable/utils"
import {AIYakExecFileRecord} from "@/pages/ai-re-act/hooks/aiRender"
import FileList from "./FileList"
import ModalInfo, {ModalInfoProps} from "./ModelInfo"
import emiter from "@/utils/eventBus/eventBus"
import {AITabsEnum} from "../defaultConstant"
interface ToolInvokerCardProps {
    titleText?: string
    status: "default" | "success" | "failed" | "user_cancelled"
    name: string
    content?: string
    desc?: string
    params: string
    fileList?: AIYakExecFileRecord[]
    modalInfo?: ModalInfoProps
    execError?: string
}
interface PreWrapperProps {
    code: ReactNode
    autoScrollBottom?: boolean
}
const ToolInvokerCard: FC<ToolInvokerCardProps> = ({
    titleText,
    name,
    params,
    content,
    desc,
    status = "fail",
    fileList,
    modalInfo,
    execError
}) => {
    const [statusColor, statusText] = useMemo(() => {
        if (status === "success") return ["success", "成功"]
        if (status === "fail") return ["danger", "失败"]
        return ["white", "已取消"]
    }, [status])

    const [trafficLen, setTrafficLen] = useState(0)
    const [risksLen, setRisksLen] = useState(0)

    //  HTTP 流量
    const getHTTPTraffic = useCallback(async () => {
        const result = await grpcQueryHTTPFlows({RuntimeId: params})
        setTrafficLen(result.Total)
    }, [params])

    // 相关漏洞
    const getQueryRisksTotalByRuntimeId = useCallback(async () => {
        const result = await apiQueryRisksTotalByRuntimeId(params)
        setRisksLen(result.Total)
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

    return (
        <ChatCard
            titleText={titleText}
            titleIcon={<SolidToolIcon />}
            titleExtra={
                <div className={styles["tool-invoker-card-extra"]}>
                    <label
                        onClick={() => {
                            switchAIActTab(AITabsEnum.Risk)
                        }}
                    >
                        相关漏洞 <span>{risksLen}</span>
                    </label>
                    <span>|</span>
                    <label
                        onClick={() => {
                            switchAIActTab(AITabsEnum.HTTP)
                        }}
                    >
                        HTTP 流量 <span>{trafficLen}</span>
                    </label>
                </div>
            }
            footer={<>{modalInfo && <ModalInfo {...modalInfo} />}</>}
        >
            <div className={classNames(styles["file-system"], styles[`file-system-${status}`])}>
                <div className={styles["file-system-title"]}>
                    <div>
                        {name}
                        <YakitTag size='small' fullRadius color={statusColor as YakitTagColor}>
                            {statusText}
                        </YakitTag>
                    </div>
                </div>
                <div className={styles["file-system-content"]}>
                    <div>{desc}</div>
                    {content && <PreWrapper code={content} />}
                    {execError && <PreWrapper code={execError} />}
                </div>
            </div>
            {!!fileList?.length && <FileList fileList={fileList} />}
        </ChatCard>
    )
}

export default memo(ToolInvokerCard)

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
            const atBottom =
                el.scrollHeight - el.scrollTop - el.clientHeight < threshold
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