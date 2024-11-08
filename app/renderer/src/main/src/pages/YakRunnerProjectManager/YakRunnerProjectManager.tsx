import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {} from "antd"
import {} from "@ant-design/icons"
import {YakRunnerProjectManagerProps} from "./YakRunnerProjectManagerType"
import {useGetState, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./YakRunnerProjectManager.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import emiter from "@/utils/eventBus/eventBus"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {OutlineSearchIcon} from "@/assets/icon/outline"
import {AuditHistoryTable} from "../yakRunnerAuditCode/AuditCode/AuditCode"
import {isCommunityEdition} from "@/utils/envfile"
import {WaterMark} from "@ant-design/pro-layout"
const {ipcRenderer} = window.require("electron")

export const YakRunnerProjectManager: React.FC<YakRunnerProjectManagerProps> = (props) => {
    const waterMarkStr = useMemo(() => {
        if (isCommunityEdition()) {
            return "Yakit技术浏览版仅供技术交流使用"
        }
        return " "
    }, [])

    return (
        <WaterMark content={waterMarkStr} style={{overflow: "hidden", height: "100%"}}>
            <div className={styles["yakrunner-project-manager"]}>
                <AuditHistoryTable setShowAuditList={() => {}} />
            </div>
        </WaterMark>
    )
}
