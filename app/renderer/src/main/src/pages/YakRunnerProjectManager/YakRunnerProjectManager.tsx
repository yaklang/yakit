import React, {useMemo, useState} from "react"
import {YakRunnerProjectManagerProps} from "./YakRunnerProjectManagerType"
import {useMemoizedFn} from "ahooks"
import styles from "./YakRunnerProjectManager.module.scss"
import {AuditHistoryTable, AuditModalFormModal} from "../yakRunnerAuditCode/AuditCode/AuditCode"

export const YakRunnerProjectManager: React.FC<YakRunnerProjectManagerProps> = (props) => {
    const [isShowCompileModal, setShowCompileModal] = useState<boolean>(false)
    const [refresh, setRefresh] = useState<boolean>(false)

    const onCloseCompileModal = useMemoizedFn(() => {
        setShowCompileModal(false)
    })

    const onSuccee = () => {
        onCloseCompileModal()
        setRefresh(!refresh)
    }

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
                    onSuccee={onSuccee}
                    warrpId={document.getElementById("yakrunner-project-manager")}
                />
            )}
        </div>
    )
}
