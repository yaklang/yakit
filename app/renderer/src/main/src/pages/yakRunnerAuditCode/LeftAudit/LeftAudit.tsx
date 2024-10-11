import React, {useEffect, useRef, useState} from "react"
import {} from "antd"
import {} from "@ant-design/icons"
import {useGetState} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./LeftAudit.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {AuditCode} from "../AuditCode/AuditCode"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import { RunnerFileTree } from "../RunnerFileTree/RunnerFileTree"
const {ipcRenderer} = window.require("electron")
export interface LeftAuditProps {}
export const LeftAudit: React.FC<LeftAuditProps> = (props) => {
    return (
        <div className={styles['left-audit']}>
            <YakitResizeBox
                firstRatio='300px'
                isVer={true}
                firstMinSize={250}
                secondMinSize={180}
                firstNodeStyle={{padding: 0}}
                secondNodeStyle={{padding: 0}}
                firstNode={<AuditCode />}
                secondNode={
                    <RunnerFileTree />
                }
            />
        </div>
    )
}
