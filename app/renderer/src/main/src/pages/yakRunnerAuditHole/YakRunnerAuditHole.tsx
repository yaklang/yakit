import React, {useEffect, useRef, useState} from "react"
import {} from "antd"
import {} from "@ant-design/icons"
import {useGetState} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./YakRunnerAuditHole.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {YakRunnerAuditHoleProps} from "./YakRunnerAuditHoleType"
import {RiskPage} from "../risks/RiskPage"
const {ipcRenderer} = window.require("electron")
export const YakRunnerAuditHole: React.FC<YakRunnerAuditHoleProps> = (props) => {
    return <RiskPage />
}
