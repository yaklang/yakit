import React from "react"
import {PluginManage} from "../manage/PluginManage"
import styles from "./PluginsOnline.module.scss"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"

interface PluginsOnlineProps {}
export const PluginsOnline: React.FC<PluginsOnlineProps> = React.memo((props) => {
    return (
        <div>
            <PluginsOnlineHeard />
            <PluginManage />
        </div>
    )
})

interface PluginsOnlineHeardProps {}
const PluginsOnlineHeard: React.FC<PluginsOnlineHeardProps> = React.memo((props) => {
    return (
        <div className={styles["plugin-online-heard"]}>
            <div className={styles["plugin-online-heard-content"]}>
                <div className={styles["plugin-online-heard-content-tip"]}>Hello everyone! 👋</div>
            </div>
        </div>
    )
})
