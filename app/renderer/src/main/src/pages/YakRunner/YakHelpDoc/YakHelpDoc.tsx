import React, {useEffect, useState} from "react"
import {YakHelpDocProps} from "./YakHelpDocType"

import classNames from "classnames"
import styles from "./YakHelpDoc.module.scss"

const {ipcRenderer} = window.require("electron")

export const YakHelpDoc: React.FC<YakHelpDocProps> = (props) => {
    useEffect(() => {
        console.log("我是yak-help-doc")
    }, [])

    return <div className={styles["yak-help-doc"]}>我是yak-help-dic</div>
}
