import React, {memo, useEffect, useMemo, useRef, useState} from "react"
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
import {AuditHistoryTable, AuditModalFormModal} from "../yakRunnerAuditCode/AuditCode/AuditCode"
import {isCommunityEdition} from "@/utils/envfile"
import {WaterMark} from "@ant-design/pro-layout"
const {ipcRenderer} = window.require("electron")

export const YakRunnerProjectManager: React.FC<YakRunnerProjectManagerProps> = (props) => {
    const [isShowCompileModal, setShowCompileModal] = useState<boolean>(false)
    const [refresh, setRefresh] = useState<boolean>(false)
    const waterMarkStr = useMemo(() => {
        if (isCommunityEdition()) {
            return "Yakit技术浏览版仅供技术交流使用"
        }
        return " "
    }, [])

    const onCloseCompileModal = useMemoizedFn(() => {
        setShowCompileModal(false)
    })

    const onSuccee = () => {
        onCloseCompileModal()
        setRefresh(!refresh)
    }

    return (
        <WaterMark content={waterMarkStr} style={{overflow: "hidden", height: "100%"}}>
            <div className={styles["yakrunner-project-manager"]} id='yakrunner-project-manager'>
                <AuditHistoryTable
                    pageType='projectManager'
                    onExecuteAudit={() => {
                        setShowCompileModal(true)
                    }}
                    refresh={refresh}
                    setRefresh={setRefresh}
                />
                {isShowCompileModal && (
                    <AuditModalFormModal
                        onCancel={onCloseCompileModal}
                        onSuccee={onSuccee}
                        warrpId={document.getElementById("yakrunner-project-manager")}
                    />
                )}
            </div>
        </WaterMark>
    )
}
