import React, {useEffect, useRef, useState} from "react"
import {} from "antd"
import {} from "@ant-design/icons"
import {useGetState} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./YakRunnerCodeScan.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
const {ipcRenderer} = window.require("electron")
export interface YakRunnerCodeScanProps {
}
export const YakRunnerCodeScan: React.FC<YakRunnerCodeScanProps> = (props) => {
return(<div>YakRunnerCodeScan</div>)
}