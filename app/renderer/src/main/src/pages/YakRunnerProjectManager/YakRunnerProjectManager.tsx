import React, {memo, useEffect, useRef, useState} from "react"
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
import { AuditHistoryTable } from "../yakRunnerAuditCode/AuditCode/AuditCode"
const {ipcRenderer} = window.require("electron")


export const YakRunnerProjectManager: React.FC<YakRunnerProjectManagerProps> = (props) => {
    return <div className={styles["yakrunner-project-manager"]}>

        <AuditHistoryTable setShowAuditList={() => {}} />
    </div>
}
