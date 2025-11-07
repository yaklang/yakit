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
}

const toolCache = new Map<string, CacheData>()

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
    const [statusColor, statusText] = useMemo(() => {
        if (status === "success") return ["success", "成功"]
        if (status === "fail") return ["danger", "失败"]
        return ["white", "已取消"]
    }, [status])

    const cached = toolCache.get(params)
    const [trafficLen, setTrafficLen] = useState(cached?.trafficLen ?? 0)
    const [risksLen, setRisksLen] = useState(cached?.risksLen ?? 0)

    const fetchData = useCallback(async () => {
        if (cached && cached.fetched) {
            setTrafficLen(cached.trafficLen)
            setRisksLen(cached.risksLen)
            return
        }
        const trafficResult = await grpcQueryHTTPFlows({RuntimeId: params})
        setTrafficLen(trafficResult.Total)

        const riskResult = await apiQueryRisksTotalByRuntimeId(params)
        setRisksLen(riskResult.Total)

        const newData: CacheData = {
            trafficLen: trafficResult?.Total ?? 0,
            risksLen: riskResult?.Total ?? 0,
            fetched: true
        }

        toolCache.set(params, newData)
    }, [cached, params])

    useEffect(() => {
        fetchData()
    }, [fetchData])

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
