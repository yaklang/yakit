import classNames from "classnames"
import {System} from "../../types"
import React, {useState} from "react"
import {useMemoizedFn} from "ahooks"
import {OutlineQuestionmarkcircleIcon} from "@/assets/outline"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {WebsiteGV} from "@/enums/website"
import {ipcEventPre} from "@/utils/ipcEventPre"
import styles from "./HelpDoc.module.scss"

const {ipcRenderer} = window.require("electron")

interface HelpDocProps {
    system: System
}

/** @name Yakit软件更新下载弹窗 */
export const HelpDoc: React.FC<HelpDocProps> = React.memo((props) => {
    const {system} = props

    const [show, setShow] = useState<boolean>(false)
    const menu = (
        <YakitMenu
            data={[
                {
                    key: "official_website",
                    label: "官方网站"
                },
                {
                    key: "Github",
                    label: "Github",
                    children: [
                        {label: "功能建议", key: "feature_request"},
                        {label: "BUG", key: "report_bug"}
                    ]
                }
            ]}
            onClick={({key}) => menuSelect(key)}
        ></YakitMenu>
    )
    const menuSelect = useMemoizedFn((type: string) => {
        if (show) setShow(false)
        switch (type) {
            case "report_bug":
                ipcRenderer.invoke(
                    `${ipcEventPre}open-url`,
                    `https://github.com/yaklang/yakit/issues/new?template=bug_report.yml`
                )
                return
            case "feature_request":
                ipcRenderer.invoke(
                    `${ipcEventPre}open-url`,
                    `https://github.com/yaklang/yakit/issues/new?template=feature_request.yml`
                )
                return
            case "official_website":
                ipcRenderer.invoke(`${ipcEventPre}open-url`, WebsiteGV.YakHelpDocAddress)
                return
            default:
                return
        }
    })

    return (
        <YakitPopover
            overlayClassName={classNames(styles["ui-op-dropdown"], styles["ui-op-setting-dropdown"])}
            trigger={"click"}
            placement={system === "Darwin" ? "bottomRight" : "bottom"}
            content={menu}
            visible={show}
            onVisibleChange={(visible) => setShow(visible)}
        >
            <div className={styles["ui-op-btn-wrapper"]}>
                <div
                    className={classNames(styles["op-btn-body"], {
                        [styles["op-btn-body-hover"]]: show
                    })}
                >
                    <OutlineQuestionmarkcircleIcon className={styles["icon-style"]} />
                </div>
            </div>
        </YakitPopover>
    )
})
