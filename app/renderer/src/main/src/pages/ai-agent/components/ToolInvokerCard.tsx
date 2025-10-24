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
        getHTTPTraffic()
        getQueryRisksTotalByRuntimeId()
    }, [getHTTPTraffic, getQueryRisksTotalByRuntimeId])

    return (
        <ChatCard
            titleText={titleText}
            titleIcon={<SolidToolIcon />}
            titleExtra={
                <div className={styles["tool-invoker-card-extra"]}>
                    相关漏洞 <span>{risksLen}</span> <span>|</span> HTTP 流量 <span>{trafficLen}</span>
                </div>
            }
            footer={modalInfo?.time && <ModalInfo {...modalInfo} />}
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
