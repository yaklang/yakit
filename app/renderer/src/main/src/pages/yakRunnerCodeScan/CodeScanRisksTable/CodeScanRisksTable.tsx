import React, {useEffect, useRef, useState} from "react"
import {} from "antd"
import {} from "@ant-design/icons"
import {useGetState} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./CodeScanRisksTable.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
const {ipcRenderer} = window.require("electron")
export interface CodeScanRisksTableProps {
    runtimeId: string
    allTotal: number
    setAllTotal: (n: number) => void
}
export const CodeScanRisksTable: React.FC<CodeScanRisksTableProps> = (props) => {
return(<div className={styles["code-scan-risk-table"]}></div>)
}