import React, {memo, ReactNode, Suspense, useEffect, useState} from "react"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {DesktopComputerSvgIcon, YakitLogoSvgIcon} from "@/assets/newIcon"
import {Typography} from "antd"
import {useMemoizedFn} from "ahooks"
import {SoftwareRemoteSvgIcon} from "./icon"
import {YaklangEngineMode} from "@/yakitGVDefine"
import {ProjectManageProp} from "./ProjectManage"

import classNames from "classnames"
import styles from "./SoftwareSettings.module.scss"
import {isEnpriTrace, isEnpriTraceAgent, isIRify} from "@/utils/envfile"
import yakitEEProject from "@/assets/yakitFontEE.png"
import yakitSEProject from "@/assets/yakitFontSE.png"
import yakitSSProject from "@/assets/yakitFontSS.png"
import yakitEEMiniProject from "@/assets/yakitEE.png"
import yakitSEMiniProject from "@/assets/yakitSE.png"
import yakitSSMiniProject from "@/assets/yakitMiniSS.png"

const ProjectManage = React.lazy(() => import("./ProjectManage"))

const {ipcRenderer} = window.require("electron")

const {Text} = Typography

interface SettingsMenuProp {
    key: string
    name: string
    icon: ReactNode
}
const ProjectLogo = (showMini: boolean) => {
    if (isIRify()) {
        return <img style={{height: "100%"}} src={showMini ? yakitSSMiniProject : yakitSSProject} alt='暂无图片' />
    } else if (isEnpriTrace()) {
        return <img style={{height: "100%"}} src={showMini ? yakitEEMiniProject : yakitEEProject} alt='暂无图片' />
    } else if (isEnpriTraceAgent()) {
        return <img style={{height: "100%"}} src={showMini ? yakitSEMiniProject : yakitSEProject} alt='暂无图片' />
    } else {
        return <YakitLogoSvgIcon />
    }
}
const SettingsMenu: SettingsMenuProp[] = [
    {
        key: "project",
        name: "项目管理",
        icon: <DesktopComputerSvgIcon />
    }
]

const switchSettings: (type: string, params: SoftwareSettingsProp) => ReactNode = (type, params) => {
    switch (type) {
        case "project":
            return (
                <Suspense fallback={<div>loading</div>}>
                    <ProjectManage {...(params as ProjectManageProp)} />
                </Suspense>
            )

        default:
            return <></>
    }
}

export interface SoftwareSettingsProp {
    engineMode: YaklangEngineMode
    onEngineModeChange: (mode: YaklangEngineMode, keepalive?: boolean) => any
    onFinish: () => any
}

export const SoftwareSettings: React.FC<SoftwareSettingsProp> = memo((props) => {
    const {onEngineModeChange} = props

    const [hostName, setHostName] = useState<string>("")
    const [currentKey, setCurrentKey] = useState<string>("project")

    const [showMini, setShowMini] = useState<boolean>(false)

    const wrapperResize = useMemoizedFn((e: UIEvent) => {
        const win: Window = e.target as any
        if (win && win.innerWidth <= 1300) {
            setShowMini(true)
        } else {
            setShowMini(false)
        }
    })

    /** 获取计算机名称 */
    useEffect(() => {
        ipcRenderer
            .invoke("fetch-computer-name")
            .then((name: string) => setHostName(name || ""))
            .catch(() => {})

        if (window) {
            setShowMini(window.innerWidth <= 1300)
        }

        window.addEventListener("resize", wrapperResize)

        return () => {
            window.removeEventListener("resize", wrapperResize)
        }
    }, [])

    return (
        <div className={styles["software-settings-wrapper"]}>
            <div className={styles["software-settings-container"]}>
                <div
                    className={classNames(styles["left-wrapper"], {
                        [styles["left-body"]]: !showMini,
                        [styles["left-mini-body"]]: showMini
                    })}
                >
                    <div className={styles["navbar-logo"]}>{ProjectLogo(showMini)}</div>

                    <div className={styles["navbar-list-wrapper"]}>
                        <div className={styles["list-body"]}>
                            {SettingsMenu.map((item) => {
                                return (
                                    <div
                                        key={item.key}
                                        className={classNames(
                                            styles["list-opt-body"],
                                            currentKey === item.key ? styles["list-opt-selected"] : styles["list-opt"]
                                        )}
                                        onClick={() => {
                                            if (currentKey !== item.key) setCurrentKey(item.key)
                                        }}
                                    >
                                        <div className={styles["opt-title"]}>
                                            {item.icon}
                                            {showMini ? <></> : item.name}
                                        </div>
                                        {!showMini && (
                                            <div className={styles["opt-notes"]}>
                                                {hostName ? (
                                                    <Text
                                                        className={styles["text-style"]}
                                                        ellipsis={{
                                                            tooltip: true
                                                        }}
                                                    >
                                                        {hostName}
                                                    </Text>
                                                ) : (
                                                    ""
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <YakitButton
                        className={styles["navbar-footer"]}
                        size='max'
                        type='outline2'
                        onClick={() => onEngineModeChange("remote")}
                    >
                        {showMini ? <SoftwareRemoteSvgIcon /> : "远程模式"}
                    </YakitButton>
                </div>

                <div className={styles["right-wrapper"]}>{switchSettings(currentKey, props)}</div>
            </div>
        </div>
    )
})
