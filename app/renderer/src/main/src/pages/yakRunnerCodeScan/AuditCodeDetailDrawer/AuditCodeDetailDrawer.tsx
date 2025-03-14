import React, {useEffect, useState} from "react"
import {RightBugAuditResult} from "@/pages/risks/YakitRiskTable/YakitRiskTable"
import {QuerySSARisksResponse, SSARisk} from "@/pages/yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTableType"
const {ipcRenderer} = window.require("electron")

interface HoleBugDetailProps {
    bugHash: string
}

export const HoleBugDetail: React.FC<HoleBugDetailProps> = React.memo((props) => {
    const {bugHash} = props
    const [info, setInfo] = useState<SSARisk>()
    useEffect(() => {
        ipcRenderer
            .invoke("QuerySSARisks", {
                Filter: {
                    Hash: [bugHash]
                }
            })
            .then((res: QuerySSARisksResponse) => {
                const {Data} = res
                if (Data.length > 0) {
                    setInfo(Data[0])
                }
            })
            .catch((err) => {})
    }, [bugHash])
    return <>{info && <RightBugAuditResult info={info} columnSize={1} />}</>
})
