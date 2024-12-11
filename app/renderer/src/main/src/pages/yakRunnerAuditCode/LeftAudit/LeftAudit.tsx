import React, {useEffect, useMemo, useRef, useState} from "react"
import {useCreation, useGetState, useSize} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./LeftAudit.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {AuditCode} from "../AuditCode/AuditCode"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {RunnerFileTree} from "../RunnerFileTree/RunnerFileTree"
import useStore from "../hooks/useStore"
import { ShowItemType } from "../BottomEditorDetails/BottomEditorDetailsType"
const {ipcRenderer} = window.require("electron")
export interface LeftAuditProps {
    fileTreeLoad: boolean
    onOpenEditorDetails: (v: ShowItemType) => void
}
export const LeftAudit: React.FC<LeftAuditProps> = (props) => {
    const {fileTreeLoad,onOpenEditorDetails} = props
    const {pageInfo} = useStore()
    const [isOnlyFileTree, setOnlyFileTree] = useState<boolean>(true)
    const ref = useRef(null)
    const getContainerSize = useSize(ref)
    // 抽屉展示高度
    const boxHeight = useMemo(() => {
        return getContainerSize?.height || 400
    }, [getContainerSize])
    
    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "50%",
            secondRatio: "50%",
            firstMinSize: 250,
            secondMinSize: 180,
            lineStyle: {}
        }
        // 因需求变动暂屏蔽隐藏
        // if (isOnlyFileTree) {
        //     p.secondRatio = "0%"
        //     p.firstRatio = "100%"
        //     p.secondMinSize = 0
        //     p.lineStyle = {display: "none"}
        // }
        return p
    }, [isOnlyFileTree])

    // 当跳转打开时，没有则关闭
    useEffect(() => {
        if (!pageInfo?.Query) {
            setOnlyFileTree(true)
        }
    }, [pageInfo])

    return (
        <div className={styles["left-audit"]} ref={ref}>
            <YakitResizeBox
                isVer={true}
                firstNodeStyle={{padding: 0}}
                secondNodeStyle={{padding: 0}}
                firstNode={<RunnerFileTree fileTreeLoad={fileTreeLoad} boxHeight={boxHeight}/>}
                secondNode={<AuditCode setOnlyFileTree={setOnlyFileTree} onOpenEditorDetails={onOpenEditorDetails}/>}
                {...ResizeBoxProps}
            />
        </div>
    )
}
