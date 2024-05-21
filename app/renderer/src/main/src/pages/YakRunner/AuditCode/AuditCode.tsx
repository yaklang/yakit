import React, {useEffect, useState} from "react"
import {AuditCodeProps} from "./AuditCodeType"

import classNames from "classnames"
import styles from "./AuditCode.module.scss"

const {ipcRenderer} = window.require("electron")

export const AuditCode: React.FC<AuditCodeProps> = (props) => {
    useEffect(() => {
        console.log("我是audit-code")
    }, [])
    return <div className={styles["audit-code"]}>我是audit-code</div>
}
