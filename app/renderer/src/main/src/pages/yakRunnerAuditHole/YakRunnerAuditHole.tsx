import React, {useEffect, useRef, useState} from "react"
import {} from "antd"
import {} from "@ant-design/icons"
import {useGetState, useInViewport, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./YakRunnerAuditHole.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {YakRunnerAuditHoleProps} from "./YakRunnerAuditHoleType"
import {RiskPage, RiskQuery} from "../risks/RiskPage"
import {usePageInfo} from "@/store/pageInfo"
import {QueryRisksRequest} from "../risks/YakitRiskTable/YakitRiskTableType"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitRiskTable} from "../risks/YakitRiskTable/YakitRiskTable"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import { defQueryRisksRequest } from "../risks/YakitRiskTable/constants"

export const YakRunnerAuditHole: React.FC<YakRunnerAuditHoleProps> = (props) => {
    const [advancedQuery, setAdvancedQuery] = useState<boolean>(true)
    const [riskLoading, setRiskLoading] = useState<boolean>(false)
    const [query, setQuery] = useState<QueryRisksRequest>({
        ...defQueryRisksRequest
    })
    const riskBodyRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(riskBodyRef)

    // 获取筛选展示状态
    useEffect(() => {
        getRemoteValue(RemoteGV.AuditHoleShow).then((value: string) => {
            setAdvancedQuery(value !== "false")
        })
    }, [])
    const onSetQueryShow = useMemoizedFn((val) => {
        setAdvancedQuery(val)
        setRemoteValue(RemoteGV.AuditHoleShow, `${val}`)
    })
    return (
        <YakitSpin spinning={riskLoading}>
            <div className={styles["audit-hole-page"]} ref={riskBodyRef}>
                <RiskQuery
                    inViewport={inViewport}
                    advancedQuery={advancedQuery}
                    setAdvancedQuery={onSetQueryShow}
                    query={query}
                    setQuery={setQuery}
                />
                <YakitRiskTable
                    query={query}
                    setQuery={setQuery}
                    advancedQuery={advancedQuery}
                    setAdvancedQuery={onSetQueryShow}
                    setRiskLoading={setRiskLoading}
                    // excludeColumnsKey={["IP"]}
                />
            </div>
        </YakitSpin>
    )
}
