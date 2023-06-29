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
export interface HTTPFuzzerEditorMenuProps {}
export const HTTPFuzzerEditorMenu: React.FC<HTTPFuzzerEditorMenuProps> = (props) => {
    return (
        <div>
            <div>
                <div onClick={(e) => {
                    console.log("ppp")
                    }}>Menu item 1</div>
                <li>Menu item 2</li>
                <li>Menu item 3</li>
            </div>
        </div>
    )
}
