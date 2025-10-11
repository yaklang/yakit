import React, {useEffect, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {
    apiCreateSSARiskDisposals,
    apiGetSSARiskDisposal,
    CreateSSARiskDisposalsRequest,
    SSARiskDisposalData
} from "@/pages/yakRunnerAuditHole/YakitAuditHoleTable/utils"
import {AuditResultHistory} from "@/pages/yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTable"
import {SSARisk} from "@/pages/yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTableType"
import {RightBugAuditResultHeader} from "@/pages/risks/YakitRiskTable/YakitRiskTable"
import styles from "./HoleDispose.module.scss"
import emiter from "@/utils/eventBus/eventBus"
export interface HoleDisposeProps {
    RiskHash: string
    info?: SSARisk
}
export const HoleDispose: React.FC<HoleDisposeProps> = (props) => {
    const {RiskHash, info} = props
    const [disposalData, setDisposalData] = useState<SSARiskDisposalData[]>()
    const getSSARiskDisposal = useMemoizedFn(() => {
        apiGetSSARiskDisposal({RiskHash}).then((data) => {
            setDisposalData(data.Data || [])
        })
    })

    useEffect(() => {
        setDisposalData(undefined)
        getSSARiskDisposal()
    }, [RiskHash])

    return (
        <div className={styles["hole-dispose-container"]}>
            {info && disposalData && (
                <>
                    <RightBugAuditResultHeader info={info} />

                    <AuditResultHistory
                        info={info}
                        disposalData={disposalData}
                        setDisposalData={setDisposalData}
                        style={{padding: 12}}
                        getSSARiskDisposal={getSSARiskDisposal}
                        refreshFileOrRuleTree={()=>{
                            emiter.emit("onRefreshFileOrRuleTree")
                        }}
                    />
                </>
            )}
        </div>
    )
}
