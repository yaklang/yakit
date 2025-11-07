import {SolidToolIcon} from "@/assets/icon/solid"
import {FC, useCallback, useEffect, useMemo, useState} from "react"
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
interface ToolInvokerCardProps {
    titleText?: string
    status: "default" | "success" | "failed" | "user_cancelled"
    name: string
    content?: string
    desc?: string
    params: string
    fileList?: AIYakExecFileRecord[]
    modalInfo?: ModalInfoProps
}

interface CacheData {
    trafficLen: number
    risksLen: number
    fetched: boolean
    timestamp: number
}

// 全局缓存（key = params）
const toolCache = new Map<string, CacheData>()
// 缓存有效期 5 分钟
const CACHE_EXPIRE =  60 * 1000

let clearTimer: NodeJS.Timeout | null = null
function startCacheAutoClear() {
    if (clearTimer) return
    clearTimer = setInterval(() => {
        toolCache.clear()
    }, CACHE_EXPIRE)
}

function stopCacheAutoClear() {
    if (clearTimer) {
        clearInterval(clearTimer)
        clearTimer = null
    }
}

const ToolInvokerCard: FC<ToolInvokerCardProps> = ({
    titleText,
    name,
    params,
    content,
    desc,
    status = "fail",
    fileList,
    modalInfo
}) => {
    useEffect(() => {
        startCacheAutoClear()
        return () => stopCacheAutoClear()
    }, [])

    const [trafficLen, setTrafficLen] = useState<number>(() => toolCache.get(params)?.trafficLen ?? 0)
    const [risksLen, setRisksLen] = useState<number>(() => toolCache.get(params)?.risksLen ?? 0)

    const [statusColor, statusText] = useMemo(() => {
        if (status === "success") return ["success", "成功"]
        if (status === "fail") return ["danger", "失败"]
        return ["white", "已取消"]
    }, [status])

    const fetchData = useCallback(async () => {
        const current = toolCache.get(params)
        const now = Date.now()
        if (current && current.fetched && now - current.timestamp < CACHE_EXPIRE) {
            setTrafficLen(current.trafficLen)
            setRisksLen(current.risksLen)
            return
        }

        try {
            const [trafficResult, riskResult] = await Promise.all([
                grpcQueryHTTPFlows({RuntimeId: params}),
                apiQueryRisksTotalByRuntimeId(params)
            ])
            const test = Math.random() * 100
            const newData: CacheData = {
                trafficLen: test ?? 0,
                risksLen: riskResult?.Total ?? 0,
                fetched: true,
                timestamp: now
            }

            toolCache.set(params, newData)
            setTrafficLen(newData.trafficLen)
            setRisksLen(newData.risksLen)
        } catch (error) {
            console.error(`ToolInvokerCard(${params}) fetchData error:`, error)
        }
    }, [params])

    useEffect(() => {
        if (!params) return
        const current = toolCache.get(params)
        const now = Date.now()
        if (current?.fetched && now - current.timestamp < CACHE_EXPIRE) {
            setTrafficLen(current.trafficLen)
            setRisksLen(current.risksLen)
        } else {
            fetchData()
        }
    }, [params, fetchData])

    return (
        <ChatCard
            titleText={titleText}
            titleIcon={<SolidToolIcon />}
            titleExtra={
                <div className={styles["tool-invoker-card-extra"]}>
                    相关漏洞 <span>{risksLen}</span> <span>|</span> HTTP 流量 <span>{trafficLen}</span>
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
                    {content && (
                        <pre className={styles["file-system-wrapper"]}>
                            <code>{content}</code>
                        </pre>
                    )}
                </div>
            </div>
            {!!fileList?.length && <FileList fileList={fileList} />}
        </ChatCard>
    )
}

export default ToolInvokerCard
