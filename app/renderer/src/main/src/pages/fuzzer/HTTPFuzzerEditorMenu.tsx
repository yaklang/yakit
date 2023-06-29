import React, {useEffect, useRef, useState} from "react"
import {} from "antd"
import {} from "@ant-design/icons"
import {useGetState} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./HTTPFuzzerEditorMenu.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
const {ipcRenderer} = window.require("electron")
export interface HTTPFuzzerEditorMenuProps {
    handleClick:()=>void
}
export const HTTPFuzzerEditorMenu: React.FC<HTTPFuzzerEditorMenuProps> = (props) => {
    const {handleClick} = props
    return (
        <div>
            <h1 onClick={handleClick}>Hello, World!22</h1>
        </div>
    )
}
