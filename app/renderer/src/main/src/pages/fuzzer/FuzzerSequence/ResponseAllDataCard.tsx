import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import React, {useMemo, useState} from "react"
import {ResponseAllDataCardProps} from "./FuzzerSequenceType"
import styles from "./FuzzerSequence.module.scss"
import {OutlineReplyIcon} from "@/assets/icon/outline"
import {CurrentHttpFlow} from "@/pages/yakitStore/viewers/base"

const ResponseAllDataCard: React.FC<ResponseAllDataCardProps> = React.memo((props) => {
    const {showAllDataRes, setShowAllDataRes, runtimeId} = props
    const [onlyShowFirstNode, setOnlyShowFirstNode] = useState<boolean>(true)
    const [refresh, setRefresh] = useState<boolean>(false)

    const isShow = useMemo(() => {
        setOnlyShowFirstNode(true)
        setRefresh(!refresh)
        return showAllDataRes
    }, [showAllDataRes])

    return isShow ? (
        <div className={styles["all-sequence-response-list"]} style={{display: ""}}>
            <div className={styles["all-sequence-response-heard"]}>
                <div className={styles["display-flex-center"]}>
                    <span style={{marginRight: 8}}>Responses runtimeId: {runtimeId}</span>
                </div>
                <div className={styles["all-sequence-response-heard-extra"]}>
                    <YakitButton
                        onClick={() => {
                            setShowAllDataRes()
                        }}
                        type='text2'
                        icon={<OutlineReplyIcon />}
                    >
                        返回
                    </YakitButton>
                </div>
            </div>
            <div className={styles["all-sequence-response-table"]}>
                <CurrentHttpFlow
                    runtimeId={runtimeId}
                    isOnlyTable={onlyShowFirstNode}
                    onIsOnlyTable={setOnlyShowFirstNode}
                    refresh={refresh}
                ></CurrentHttpFlow>
            </div>
        </div>
    ) : (
        <></>
    )
})

export default ResponseAllDataCard
