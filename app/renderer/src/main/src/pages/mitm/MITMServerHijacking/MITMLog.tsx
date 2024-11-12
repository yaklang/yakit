import React, {useEffect, useMemo, useRef, useState} from "react"
import emiter from "@/utils/eventBus/eventBus"
import styles from "./MITMServerHijacking.module.scss"
import {HTTPFlowShield, ShieldData, SourceType} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {useMemoizedFn} from "ahooks"
import {yakitFailed, yakitNotify} from "@/utils/notification"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCheckableTag} from "@/components/yakitUI/YakitTag/YakitCheckableTag"
import {setRemoteValue} from "@/utils/kv"
import {MITMConsts} from "../MITMConsts"

const {ipcRenderer} = window.require("electron")
interface MITMLogHeardExtraProps {
    sourceType: string
    onSetSourceType: (s: string) => void
    setShowPluginHistoryList: (s: string[]) => void
}
export const MITMLogHeardExtra: React.FC<MITMLogHeardExtraProps> = React.memo((props) => {
    const {sourceType, onSetSourceType, setShowPluginHistoryList} = props
    // 屏蔽数据
    const [shieldData, setShieldData] = useState<ShieldData>({
        data: []
    })

    useEffect(() => {
        emiter.on("onGetMITMShieldDataEvent", onGetMITMShieldData)
        return () => {
            emiter.off("onGetMITMShieldDataEvent", onGetMITMShieldData)
        }
    }, [])

    const onGetMITMShieldData = useMemoizedFn((str: string) => {
        const value = JSON.parse(str)
        setShieldData(value)
    })

    const cancleFilter = useMemoizedFn((value) => {
        emiter.emit("cancleMitmFilterEvent", JSON.stringify(value))
    })

    const onHistorySourceTypeToMitm = useMemoizedFn((sourceType: string) => {
        onSetSourceType(sourceType)
    })
    useEffect(() => {
        emiter.on("onHistorySourceTypeToMitm", onHistorySourceTypeToMitm)
        return () => {
            emiter.off("onHistorySourceTypeToMitm", onHistorySourceTypeToMitm)
        }
    }, [])

    return (
        <div className={styles["mitm-log-heard"]}>
            <div>
                {SourceType.map((tag) => (
                    <YakitCheckableTag
                        key={tag.value}
                        checked={!!sourceType.split(",").includes(tag.value)}
                        onChange={(checked) => {
                            emiter.emit("onMitmClearFromPlugin")
                            setShowPluginHistoryList([])
                            if (checked) {
                                const selectTypeList = [...(sourceType.split(",") || []), tag.value]
                                onSetSourceType(selectTypeList.join(","))
                            } else {
                                const selectTypeList = (sourceType.split(",") || []).filter((ele) => ele !== tag.value)
                                onSetSourceType(selectTypeList.join(","))
                            }
                        }}
                    >
                        {tag.text}
                    </YakitCheckableTag>
                ))}
            </div>
            <div className={styles["mitm-log-heard-right"]}>
                <YakitButton
                    type='outline1'
                    colors='danger'
                    onClick={() => {
                        // 记录时间戳
                        const nowTime: string = Math.floor(new Date().getTime() / 1000).toString()
                        setRemoteValue(MITMConsts.MITMStartTimeStamp, nowTime)
                        emiter.emit("cleanMitmLogEvent")
                    }}
                >
                    重置
                </YakitButton>
                <HTTPFlowShield shieldData={shieldData} cancleFilter={cancleFilter} />
            </div>
        </div>
    )
})
