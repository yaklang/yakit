import React, {Dispatch, SetStateAction} from "react"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import lightTheme from "@/assets/light-theme.png"
import darkTheme from "@/assets/dark-theme.png"
import {SolidCheckCircleIcon} from "@/assets/solid"
import {Theme} from "@/hooks/useTheme"
import classNames from "classnames"
import styles from "./SoftwareBasics.module.scss"

const yakitSoftMode = ["classic", "securityExpert", "scan"] as const
export type YakitSoftMode = (typeof yakitSoftMode)[number]
const YAKIT_MODE_CONFIG: Record<
    YakitSoftMode,
    {
        label: string
        desc: string
    }
> = {
    classic: {
        label: "经典模式",
        desc: "该模式就是之前的菜单首页布局"
    },
    securityExpert: {
        label: "安全专家模式",
        desc: "将菜单栏和固定页面调整为渗透常用功能，整体更简洁明了"
    },
    scan: {
        label: "扫描模式",
        desc: "将菜单栏和首页重点放在扫描性功能上，方便快捷"
    }
}

export type Lange = "zh" | "zn"

export interface SoftwareBasicsProps {
    softTheme: Theme
    setSoftTheme: Dispatch<SetStateAction<Theme>>
    softMode: YakitSoftMode
    setSoftMode: Dispatch<SetStateAction<YakitSoftMode>>
    softLang: Lange
    setSoftLang: Dispatch<SetStateAction<Lange>>
}

export const SoftwareBasics: React.FC<SoftwareBasicsProps> = React.memo((props) => {
    const {softTheme, setSoftTheme, softMode, setSoftMode} = props

    return (
        <div className={styles["softwareBasics"]}>
            <div className={styles["softwareBasics-item"]}>
                <div className={styles["softwareBasics-item-title"]}>请选择您的主题</div>
                <div className={styles["softwareBasics-item-cont"]}>
                    <div className={styles["softwareBasics-flex"]}>
                        <div
                            className={classNames(styles["softwareBasics-theme-item"], {
                                [styles["softwareBasics-theme-item-active"]]: softTheme === "light"
                            })}
                            onClick={() => setSoftTheme("light")}
                        >
                            <img src={lightTheme} />
                            <div className={styles["softwareBasics-flex"]}>
                                <div className={styles["softwareBasics-theme-text"]}>亮色</div>
                                {softTheme === "light" && (
                                    <SolidCheckCircleIcon className={styles["CheckCircleIcon"]} />
                                )}
                            </div>
                        </div>
                        <div
                            className={classNames(styles["softwareBasics-theme-item"], {
                                [styles["softwareBasics-theme-item-active"]]: softTheme === "dark"
                            })}
                            onClick={() => setSoftTheme("dark")}
                        >
                            <img src={darkTheme} />
                            <div className={styles["softwareBasics-flex"]}>
                                <div className={styles["softwareBasics-theme-text"]}>暗色</div>
                                {softTheme === "dark" && <SolidCheckCircleIcon className={styles["CheckCircleIcon"]} />}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className={styles["softwareBasics-item"]}>
                <div className={styles["softwareBasics-item-title"]}>模式设置</div>
                <div className={styles["softwareBasics-item-cont"]}>
                    <div className={styles["softwareBasics-flex"]}>
                        {yakitSoftMode.map((mode) => (
                            <div
                                key={mode}
                                className={classNames(
                                    styles["softwareBasics-mode-item"],
                                    softMode === mode && styles["softwareBasics-mode-item-active"]
                                )}
                                onClick={() => setSoftMode(mode)}
                            >
                                {YAKIT_MODE_CONFIG[mode].label}
                            </div>
                        ))}
                    </div>
                    <div className={styles["softwareBasics-mode-desc"]}>{YAKIT_MODE_CONFIG[softMode].desc}</div>
                </div>
            </div>
            {/* <div className={styles["softwareBasics-item"]}>
                <div className={styles["softwareBasics-item-title"]}>语言设置</div>
                <div className={styles["softwareBasics-item-cont"]}>
                    <YakitSelect
                        value={newLang}
                        options={[
                            {
                                label: "Chinese（Simplified）简体中文",
                                value: "zh"
                            },
                            {
                                label: "English",
                                value: "en"
                            }
                        ]}
                        onChange={setNewLang}
                    ></YakitSelect>
                </div>
            </div> */}
        </div>
    )
})
