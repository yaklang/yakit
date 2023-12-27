import React, {useEffect, useMemo, useRef, useState} from "react"
import emiter from "@/utils/eventBus/eventBus"
import styles from "./MITMServerHijacking.module.scss"
import {
    HTTPFlowShield,
    ShieldData
} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {
    useMemoizedFn,
} from "ahooks"
import {yakitFailed, yakitNotify} from "@/utils/notification"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

const {ipcRenderer} = window.require("electron")
interface MITMLogHeardExtraProps {
}
export const MITMLogHeardExtra: React.FC<MITMLogHeardExtraProps> = React.memo((props) => {
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

    const onGetMITMShieldData = useMemoizedFn((str:string)=>{
        const value = JSON.parse(str)
        setShieldData(value)
    })

    const cancleFilter = useMemoizedFn((value)=>{
        emiter.emit("cancleMitmFilterEvent",JSON.stringify(value))
    })

    const cleanMitmLogTableData = useMemoizedFn((params: {DeleteAll: boolean; Filter?: {}}) => {
        ipcRenderer
            .invoke("DeleteHTTPFlows", params)
            .then(() => {
                emiter.emit("cleanMitmLogEvent")
            })
            .catch((e: any) => {
                yakitNotify("error", `历史记录删除失败: ${e}`)
            })
            .finally(() => {
                emiter.emit("onDeleteToUpdate",JSON.stringify({sourcePage:"MITM"}))
            })
    })

    return (
        <div className={styles["mitm-log-heard"]}>
            <YakitDropdownMenu
                menu={{
                    data: [
                        {
                            key: "resetId",
                            label: "重置请求 ID"
                        },
                        {
                            key: "noResetId",
                            label: "不重置请求 ID"
                        }
                    ],
                    onClick: ({key}) => {
                        switch (key) {
                            case "resetId":
                                cleanMitmLogTableData({DeleteAll: true})
                                break
                            case "noResetId":
                                cleanMitmLogTableData({Filter: {}, DeleteAll: false})
                                break
                            default:
                                break
                        }
                    }
                }}
                dropdown={{
                    trigger: ["click"],
                    placement: "bottom"
                }}
            >
                <YakitButton type='outline1' colors='danger'>
                    清空
                </YakitButton>
            </YakitDropdownMenu>
            <HTTPFlowShield shieldData={shieldData} cancleFilter={cancleFilter} />
        </div>
    )
})
