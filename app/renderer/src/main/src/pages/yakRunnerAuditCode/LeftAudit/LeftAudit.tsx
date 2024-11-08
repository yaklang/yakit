import React, {useEffect, useRef, useState} from "react"
import {} from "antd"
import {} from "@ant-design/icons"
import {useCreation, useGetState} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./LeftAudit.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {AuditCode} from "../AuditCode/AuditCode"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {RunnerFileTree} from "../RunnerFileTree/RunnerFileTree"
const {ipcRenderer} = window.require("electron")
export interface LeftAuditProps {
    fileTreeLoad: boolean
}
export const LeftAudit: React.FC<LeftAuditProps> = (props) => {
    const {fileTreeLoad} = props
    const [isOnlyFileTree, setOnlyFileTree] = useState<boolean>(true)
    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "50%",
            secondRatio: "50%",
            firstMinSize: 250,
            secondMinSize: 180,
            lineStyle: {}
        }
        if (isOnlyFileTree) {
            p.secondRatio = "0%"
            p.firstRatio = "100%"
            p.secondMinSize = 0
            p.lineStyle = {display: "none"}
        }
        return p
    }, [isOnlyFileTree])

    return (
        <div className={styles["left-audit"]}>
            <YakitResizeBox
                isVer={true}
                firstNodeStyle={{padding: 0}}
                secondNodeStyle={{padding: 0}}
                firstNode={<RunnerFileTree fileTreeLoad={fileTreeLoad} />}
                secondNode={<AuditCode setOnlyFileTree={setOnlyFileTree} />}
                {...ResizeBoxProps}
            />
        </div>
    )
}
