import React, {useEffect, useMemo, useState} from "react"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitSystem} from "@/yakitGVDefine"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {ReportBug, FeatureRequest, LocalInfoProps} from "@/utils/template/issues"
import {useMemoizedFn} from "ahooks"
import {OutlineQuestionmarkcircleIcon} from "@/assets/icon/outline"
import {grpcFetchLocalYakitVersion, grpcFetchLocalYakVersion} from "@/apiUtils/grpc"
import {WebsiteGV} from "@/enums/website"
import {SystemInfo} from "@/constants/hardware"

import classNames from "classnames"
import styles from "./HelpDoc.module.scss"

const {ipcRenderer} = window.require("electron")

interface HelpDocProps {
    system: YakitSystem
    engineLink: boolean
}

/** @name Yakit软件更新下载弹窗 */
export const HelpDoc: React.FC<HelpDocProps> = React.memo((props) => {
    const {system, engineLink} = props

    const [currentYakit, setCurrentYakit] = useState<string>("")
    const [currentYaklang, setCurrentYaklang] = useState<string>("")

    const info = useMemo(() => {
        const info: LocalInfoProps = {
            system: system,
            arch: SystemInfo.architecture || "",
            localYakit: currentYakit,
            localYaklang: currentYaklang
        }
        return info
    }, [system, currentYakit, currentYaklang])

    useEffect(() => {
        grpcFetchLocalYakitVersion(true)
            .then((res) => {
                setCurrentYakit(res)
            })
            .catch(() => {})
    }, [])

    useEffect(() => {
        grpcFetchLocalYakVersion(true)
            .then((data: string) => {
                setCurrentYaklang(data)
            })
            .catch(() => {})
    }, [engineLink])

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
                    "open-url",
                    `https://github.com/yaklang/yakit/issues/new?template=bug_report.yml`
                )
                return
            case "feature_request":
                ipcRenderer.invoke(
                    "open-url",
                    `https://github.com/yaklang/yakit/issues/new?template=feature_request.yml`
                )
                return
            case "official_website":
                ipcRenderer.invoke("open-url", WebsiteGV.YakHelpDocAddress)
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
