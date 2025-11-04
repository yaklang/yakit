import React, {useEffect, useMemo, useState} from "react"
import {YakRunnerProjectManagerProps} from "./YakRunnerProjectManagerType"
import {useMemoizedFn} from "ahooks"
import styles from "./YakRunnerProjectManager.module.scss"
import {AuditHistoryTable, AuditModalFormModal} from "../yakRunnerAuditCode/AuditCode/AuditCode"
import emiter from "@/utils/eventBus/eventBus"

export const YakRunnerProjectManager: React.FC<YakRunnerProjectManagerProps> = (props) => {
    const [isShowCompileModal, setShowCompileModal] = useState<boolean>(false)
    const [refresh, setRefresh] = useState<boolean>(false)

    const onCloseCompileModal = useMemoizedFn(() => {
        setShowCompileModal(false)
    })

    const onRefresh = () => {
        setRefresh(!refresh)
    }

    const onRefreshProjectManagerFun = useMemoizedFn(()=>{
        setRefresh(!refresh)
    })

    useEffect(()=>{
        emiter.on("onRefreshProjectManager",onRefreshProjectManagerFun)
        return () => {
            emiter.off("onRefreshProjectManager", onRefreshProjectManagerFun)
        }
    },[])

    return (
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
                    onSuccee={onCloseCompileModal}
                    warrpId={document.getElementById("yakrunner-project-manager")}
                    onRefresh={onRefresh}
                />
            )}
        </div>
    )
}
