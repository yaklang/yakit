import React, {useMemo} from "react"
import {YakitStatusType} from "@/yakitGVDefine"
import {
    getReleaseEditionName,
    isCommunityEdition,
    isCommunityMemfit,
    isEnpriTrace,
    isEnpriTraceAgent,
    isIRify,
    isMemfit
} from "@/utils/envfile"
import {Tooltip} from "antd"
import {OutlineQuestionmarkcircleIcon} from "@/assets/icon/outline"

import yakitSE from "@/assets/yakitSE.png"
import yakitEE from "@/assets/yakitEE.png"
import yakitCE from "@/assets/yakit.jpg"
import styles from "./newYakitLoading.module.scss"
import {useTheme} from "@/hook/useTheme"
import classNames from "classnames"
import {SolidIrifyMiniLogoIcon, SolidMemfitMiniLogoIcon} from "@/assets/icon/colors"

const {ipcRenderer} = window.require("electron")

/** 首屏加载蒙层展示语 */
const LoadingTitle: string[] = [
    "没有困难的工作，只有勇敢的打工人。",
    "打工累吗？累！但我不能哭，因为骑电动车擦眼泪不安全。",
    "打工不仅能致富，还能交友娶媳妇",
    "今天搬砖不狠，明天地位不稳",
    "打工可能会少活十年，不打工你一天也活不下去。",
    "有人相爱，有人夜里看海，有人七八个闹钟起不来，早安打工人!",
    "打工人，打工魂，打工人是人上人",
    `@所有人，据说用了${getReleaseEditionName()}后就不必再卷了！`,
    `再不用${getReleaseEditionName()}，卷王就是别人的了`,
    `来用${getReleaseEditionName()}啦？安全圈还是你最成功`,
    `这届网安人，人手一个${getReleaseEditionName()}，香惨了！`,

    "webfuzzer时根目录插入字典，会有意想不到的收获 ——是果实菌啊",
    `${getReleaseEditionName()}写监听参数时不必写socks的版本号 ——是果实菌啊`,
    "使用热标签，可以中间处理des aes等加密，无需再碰py ——是果实菌啊",
    `${getReleaseEditionName()}，为您提供渗透问题的完美解决方案 ——酒零`,
    "热加载fuzz快速定位，轻松挖洞无压力 ——k1115h0t",
    "别让无聊占据你的时间，来探索新世界吧！——Chelth",
    `<script>alert(‘Hello ${getReleaseEditionName()}!’)</script> ——红炉点雪`,
    "你的鼠标，掌控世界！——Chelth"
]

export interface NewYakitLoadingProp {
    /** yakit模式 */
    yakitStatus: YakitStatusType
    checkLog: string[]
}

export const NewYakitLoading: React.FC<NewYakitLoadingProp> = (props) => {
    const {yakitStatus, checkLog} = props
    const {theme} = useTheme()

    /** 加载页随机宣传语 */
    const loadingTitle = useMemo(() => LoadingTitle[Math.floor(Math.random() * (LoadingTitle.length - 0)) + 0], [])
    /** Title */
    const Title = useMemo(
        () => (yakitStatus === "control-remote" ? "远程控制中 ..." : `欢迎使用 ${getReleaseEditionName()}`),
        [yakitStatus]
    )

    const startLogo = useMemo(() => {
        /* 社区版 */
        if (isCommunityEdition()) {
            if (isIRify()) {
                return (
                    <div className={styles["yakit-loading-icon-wrapper"]}>
                        <div className={styles["white-icon"]}>
                            <SolidIrifyMiniLogoIcon />
                        </div>
                    </div>
                )
            }
            if (isCommunityMemfit()) {
                return (
                    <div className={styles["yakit-loading-icon-wrapper"]}>
                        <div className={styles["white-icon"]}>
                            <SolidMemfitMiniLogoIcon />
                        </div>
                    </div>
                )
            }
            return (
                <div className={styles["yakit-loading-icon-wrapper"]}>
                    <div className={styles["white-icon"]}>
                        <img src={yakitCE} alt='暂无图片' />
                    </div>
                </div>
            )
        }

        /* 企业版 */
        if (isEnpriTrace()) {
            if (isIRify()) {
                return (
                    <div className={styles["yakit-loading-icon-wrapper"]}>
                        <div className={styles["white-icon"]}>
                            <SolidIrifyMiniLogoIcon />
                        </div>
                    </div>
                )
            }
            if (isMemfit()) {
                return (
                    <div className={styles["yakit-loading-icon-wrapper"]}>
                        <div className={styles["white-icon"]}>
                            <SolidMemfitMiniLogoIcon />
                        </div>
                    </div>
                )
            }
            return (
                <div className={styles["yakit-loading-icon-wrapper"]}>
                    <div className={styles["white-icon"]}>
                        <img src={yakitEE} alt='暂无图片' />
                    </div>
                </div>
            )
        }

        /* 便携版 */
        if (isEnpriTraceAgent()) {
            return (
                <div className={styles["yakit-loading-icon-wrapper"]}>
                    <div className={styles["white-icon"]}>
                        <img src={yakitSE} alt='暂无图片' />
                    </div>
                </div>
            )
        }

        return null
    }, [])

    return (
        <div className={styles["yakit-loading-wrapper"]}>
            <div className={styles["yakit-loading-body"]}>
                <div className={styles["body-content"]}>
                    {startLogo}

                    <div className={styles["yakit-loading-title"]}>
                        <div className={styles["title-style"]}>{Title}</div>
                        {isCommunityEdition() && <div className={styles["subtitle-stlye"]}>{loadingTitle}</div>}
                    </div>

                    <div className={styles["yakit-loading-content"]}>
                        <div
                            className={classNames(styles["loading-box-wrapper"], {
                                [styles["light-boder"]]: theme === "light"
                            })}
                        >
                            <div
                                className={classNames(styles["loading-box"], {
                                    [styles["light-bg"]]: theme === "light"
                                })}
                            >
                                <div className={styles["loading-bar"]}>
                                    <div className={styles["shine"]}></div>
                                </div>
                            </div>
                        </div>

                        <div className={styles["log-wrapper"]}>
                            <div className={styles["log-body"]}>
                                {checkLog.map((item, index) => {
                                    return (
                                        <div key={item} className={styles["log-item"]}>
                                            {item}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        <div className={styles["engine-log-btn"]}>
                            <div
                                className={styles["engine-help-wrapper"]}
                                onClick={() => {
                                    ipcRenderer.invoke("open-yaklang-path")
                                }}
                                style={{position: "fixed", bottom: 32}}
                            >
                                打开引擎所在文件
                                <Tooltip title={`打开文件夹后运行'start-engine-grpc'，命令行启动引擎查看具体问题`}>
                                    <OutlineQuestionmarkcircleIcon />
                                </Tooltip>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
