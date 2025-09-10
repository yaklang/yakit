import React from "react"
import {RightBugAuditResult} from "@/pages/risks/YakitRiskTable/YakitRiskTable"
import {SSARisk} from "@/pages/yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTableType"

interface HoleBugDetailProps {
    info?: SSARisk
}

export const HoleBugDetail: React.FC<HoleBugDetailProps> = React.memo((props) => {
    const {info} = props
    return <>{info && <RightBugAuditResult info={info} columnSize={1} />}</>
})
