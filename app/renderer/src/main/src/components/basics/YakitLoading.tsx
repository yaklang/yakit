import React, {useEffect, useMemo, useRef} from "react"
import {YakitLoadingSvgIcon, YakitThemeLoadingSvgIcon} from "./icon"
import {Dropdown} from "antd"
import {YaklangEngineMode} from "@/yakitGVDefine"
import {outputToWelcomeConsole} from "@/components/layout/WelcomeConsoleUtil"
import {YakitMenu} from "../yakitUI/YakitMenu/YakitMenu"
import {useGetState, useMemoizedFn} from "ahooks"
import {ArrowRightSvgIcon, ChevronDownSvgIcon} from "../layout/icons"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"

import classnames from "classnames"
import styles from "./yakitLoading.module.scss"

/** 首屏加载蒙层展示语 */
const LoadingTitle: string[] = [
    "没有困难的工作，只有勇敢的打工人。",
    "打工累吗？累！但我不能哭，因为骑电动车擦眼泪不安全。",
    "亲们，起床打工了！",
    "打工不仅能致富，还能交友娶媳妇",
    "今天搬砖不狠，明天地位不稳",
    "打工可能会少活十年，不打工你一天也活不下去。",
    "早点睡，打工人。",
    "有人相爱，有人夜里看海，有人七八个闹钟起不来，早安打工人!",
    "累吗，累就对了，舒服是留给有钱人的，早安，打工人!",
    "爱情不是我生活的全部，打工才是。早安，打工人。",
    "打工人，打工魂，打工人是人上人",
    "@所有人，据说用了Yakit后就不必再卷了！",
    "再不用Yakit，卷王就是别人的了",
    "来用Yakit啦？安全圈还是你最成功",
    "这届网安人，人手一个Yakit，香惨了！"
]

export const EngineModeVerbose = (m: YaklangEngineMode) => {
    switch (m) {
        case "admin":
            return "管理权限"
        case "local":
            return "普通权限"
        case "remote":
            return "远程连接"
        default:
            return "未知模式"
    }
}

export interface YakitLoadingProp {
    loading: boolean
    engineMode: YaklangEngineMode
    localPort: number
    adminPort: number
    onEngineModeChange: (mode: YaklangEngineMode) => any
    showEngineLog: boolean
    setShowEngineLog: (flag: boolean) => any
}

const {ipcRenderer} = window.require("electron")

export const YakitLoading: React.FC<YakitLoadingProp> = (props) => {
    const {loading, showEngineLog, setShowEngineLog} = props

    const [__showLog, setShowLog, getShowLog] = useGetState<number>(0)
    const loadingTime = useRef<any>(null)

    const loadingTitle = useMemo(() => LoadingTitle[Math.floor(Math.random() * (LoadingTitle.length - 0)) + 0], [])

    useEffect(() => {
        if (loading) {
            if (loadingTime.current) {
                clearInterval(loadingTime.current)
                loadingTime.current = null
                setShowLog(0)
            }
        } else {
            if (!loadingTime.current) {
                setShowLog(0)
                loadingTime.current = setInterval(() => {
                    setShowLog(getShowLog() + 1)
                    if (getShowLog() >= 5) {
                        clearInterval(loadingTime.current)
                    }
                }, 1000)
            }
        }
    }, [loading])

    const selectEngineMode = useMemoizedFn((key: string) => {
        if (key === "remote" && props.onEngineModeChange) {
            props.onEngineModeChange("remote")
        }
        if (key === "local") {
            const isAdmin = props.engineMode === "admin"
            ipcRenderer
                .invoke("start-local-yaklang-engine", {
                    port: isAdmin ? props.adminPort : props.localPort,
                    sudo: isAdmin
                })
                .then(() => {
                    outputToWelcomeConsole("手动引擎启动成功！")
                    if (props.onEngineModeChange) {
                        props.onEngineModeChange(props.engineMode)
                    }
                })
                .catch((e) => {
                    outputToWelcomeConsole("手动引擎启动失败！")
                    outputToWelcomeConsole(`失败原因:${e}`)
                })
        }
    })

    const menu = useMemo(() => {
        return (
            <YakitMenu
                width={170}
                selectedKeys={[]}
                data={[
                    {
                        key: "remote",
                        label: "远程模式"
                    },
                    {
                        key: "local",
                        label: `手动启动引擎(${EngineModeVerbose(props.engineMode)})`
                    }
                ]}
                onClick={({key}) => selectEngineMode(key)}
            ></YakitMenu>
        )
    }, [props.engineMode])

    return (
        <div className={styles["yakit-loading-wrapper"]}>
            <div className={styles["yakit-loading-body"]}>
                <div className={styles["yakit-loading-title"]}>
                    <div className={styles["title-style"]}>欢迎使用 Yakit</div>
                    <div className={styles["subtitle-stlye"]}>{loadingTitle}</div>
                </div>

                <div className={styles["yakit-loading-icon-wrapper"]}>
                    <div className={styles["theme-icon-wrapper"]}>
                        <div className={styles["theme-icon"]}>
                            <YakitThemeLoadingSvgIcon />
                        </div>
                    </div>
                    <div className={styles["white-icon"]}>
                        <YakitLoadingSvgIcon />
                    </div>
                </div>

                <div className={styles["yakit-loading-content"]}>
                    <div className={classnames({[styles["time-out-title"]]: getShowLog() >= 5})}>
                        {getShowLog() >= 5 ? "连接超时..." : `正在加载中 (${EngineModeVerbose(props.engineMode)}) ...`}
                    </div>
                    {!showEngineLog && getShowLog() >= 5 && (
                        <YakitButton
                            className={styles["engine-log-btn"]}
                            type='danger'
                            size='max'
                            onClick={() => setShowEngineLog(true)}
                        >
                            查看日志
                            <ArrowRightSvgIcon />
                        </YakitButton>
                    )}
                    <div className={styles["switch-engine-mode"]}>
                        <Dropdown placement='bottom' overlay={menu} overlayClassName={styles["switch-mode-overlay"]}>
                            <div style={{cursor: "pointer"}}>
                                其他连接模式
                                <ChevronDownSvgIcon style={{marginLeft: 4}} />
                            </div>
                        </Dropdown>
                    </div>
                </div>
            </div>
        </div>
    )
}
