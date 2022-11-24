import React, {useMemo} from "react"

import styles from "./yakitLoading.module.scss"
import {YakitLoadingSvgIcon, YakitThemeLoadingSvgIcon} from "./icon"

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

export interface YakitLoadingProp {
    loading: boolean
    title?: string
}

export const YakitLoading: React.FC<YakitLoadingProp> = (props) => {
    const {loading, title} = props

    const loadingTitle = useMemo(() => LoadingTitle[Math.floor(Math.random() * (LoadingTitle.length - 0)) + 0], [])

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

                <div className={styles["yakit-loading-content"]}>{title || "正在加载中..."}</div>
            </div>
        </div>
    )
}
