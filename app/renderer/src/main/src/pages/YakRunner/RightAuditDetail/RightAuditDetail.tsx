import React, {useEffect} from "react"
import classNames from "classnames"
import styles from "./RightAuditDetail.module.scss"
import {useMemoizedFn} from "ahooks"
import {AuditEmiterYakUrlProps} from "../YakRunnerType"
import { StringToUint8Array } from "@/utils/str"
import { loadAuditFromYakURLRaw } from "../utils"

interface RightSideBarProps {
    auditRightParams: AuditEmiterYakUrlProps | undefined
    isUnShowAuditDetail: boolean
}

export const RightAuditDetail: React.FC<RightSideBarProps> = (props) => {
    const {auditRightParams, isUnShowAuditDetail} = props
    useEffect(() => {
        if (!isUnShowAuditDetail && auditRightParams) {
            initData(auditRightParams)
        }
    }, [isUnShowAuditDetail, auditRightParams])

    const initData = useMemoizedFn(async (params: AuditEmiterYakUrlProps) => {
        const {Schema,Location,Path,Body} = params
        const body = StringToUint8Array(Body)
        const result = await loadAuditFromYakURLRaw({Schema,Location,Path}, body)
        console.log("iniaaa", params,result)
    })
    return <div className={classNames(styles["right-audit-detail"])}>RightAuditDetail</div>
}
