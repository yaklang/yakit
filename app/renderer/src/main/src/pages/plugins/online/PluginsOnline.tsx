import React, {useState, useRef, useMemo, useEffect} from "react"
import {PluginManage} from "../manage/PluginManage"
import styles from "./PluginsOnline.module.scss"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {funcSearchType} from "../funcTemplate"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {OutlineRefreshIcon, OutlineSearchIcon, OutlineXIcon} from "@/assets/icon/outline"
import classNames from "classnames"
import {
    useMemoizedFn,
    useInViewport,
    useEventListener,
    useSize,
    useThrottleFn,
    useScroll,
    useNetwork,
    useDebounceFn,
    useUpdateEffect
} from "ahooks"
import {openExternalWebsite} from "@/utils/openWebsite"
import card1 from "./card1.png"
import card2 from "./card2.png"
import card3 from "./card3.png"
import qrCode from "./qrCode.png"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {SolidYakCattleNoBackColorIcon} from "@/assets/icon/colors"
import {OnlineJudgment} from "../onlineJudgment/OnlineJudgment"

interface PluginsOnlineProps {}
export const PluginsOnline: React.FC<PluginsOnlineProps> = React.memo((props) => {
    const pluginsOnlineRef = useRef<HTMLDivElement>(null)
    const pluginsOnlineHeardRef = useRef<HTMLDivElement>(null)
    const pluginsOnlineListRef = useRef<HTMLDivElement>(null)

    const [isShowRoll, setIsShowRoll] = useState<boolean>(true)

    useEffect(() => {
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((change) => {
                    // console.log("change", change)
                    if (change.intersectionRatio <= 0) {
                        setIsShowRoll(false)
                        // pluginsOnlineListRef.current?.focus()
                    } else {
                        setIsShowRoll(true)
                    }
                })
            },
            {
                root: pluginsOnlineRef.current
            }
        )
        setTimeout(() => {
            if (pluginsOnlineHeardRef.current) {
                io.observe(pluginsOnlineHeardRef.current)
            }
        }, 1000)
        return () => {
            io.disconnect()
        }
    }, [pluginsOnlineHeardRef])
    useEffect(() => {
        window.addEventListener("scroll", handleScroll, true)
        return () => {
            window.removeEventListener("scroll", handleScroll, true)
        }
    }, [])
    const handleScroll = useDebounceFn(
        useMemoizedFn((e) => {
            e.stopPropagation()
            if (e.target.id === "online-list" || e.target.id === "online-grid") {
                const {scrollTop} = e.target
                // console.log("scrollTop", scrollTop)
                if (scrollTop === 0) {
                    setIsShowRoll(true)
                    pluginsOnlineRef.current?.focus()
                }
            }
        }),
        {wait: 200, leading: true}
    ).run
    return (
        <OnlineJudgment>
            <div
                className={classNames(styles["plugins-online"], {
                    [styles["plugins-online-overflow-hidden"]]: !isShowRoll
                })}
            >
                <div ref={pluginsOnlineRef} className={classNames(styles["plugins-online-body"])}>
                    <div ref={pluginsOnlineHeardRef}>
                        <PluginsOnlineHeard />
                    </div>
                    <div
                        className={classNames(styles["plugins-online-list"], {
                            [styles["plugins-online-list-no-roll"]]: isShowRoll
                        })}
                        ref={pluginsOnlineListRef}
                    >
                        <PluginManage />
                    </div>
                </div>
            </div>
        </OnlineJudgment>
    )
})

const cardImg = [
    {
        id: "1",
        imgUrl: card1,
        link: "https://yaklang.com/products/intro/",
        isQRCode: false
    },
    {
        id: "2",
        imgUrl: card2,
        link: "https://yaklang.com/products/intro/",
        isQRCode: true
    },
    {
        id: "3",
        imgUrl: card3,
        link: "https://space.bilibili.com/437503777",
        isQRCode: false
    }
]
interface PluginsOnlineHeardProps {}
const PluginsOnlineHeard: React.FC<PluginsOnlineHeardProps> = React.memo((props) => {
    const [visibleQRCode, setVisibleQRCode] = useState<boolean>(false)
    const [codeUrl, setCodeUrl] = useState<string>("")
    const onImgClick = useMemoizedFn((ele) => {
        if (ele.isQRCode) {
            setCodeUrl(ele.link)
            setVisibleQRCode(true)
        } else {
            openExternalWebsite(ele.link)
        }
    })
    return (
        <div className={styles["plugin-online-heard"]}>
            <div className={styles["plugin-online-heard-bg"]} />
            <div className={styles["plugin-online-heard-content"]}>
                <div className={styles["plugin-online-heard-content-top"]}>
                    <div className={styles["plugin-online-heard-content-top-tip"]}>Hello everyone! 👋</div>
                    <div className={styles["plugin-online-heard-content-top-title"]}>Yakit 插件商店</div>
                    <div className={styles["plugin-online-heard-content-top-subTitle"]}>
                        这里可以写一句对于插件的 slogan
                    </div>
                    <YakitCombinationSearchCircle />
                </div>
            </div>
            <div className={styles["plugin-online-heard-card"]}>
                {cardImg.map((ele) => (
                    <img
                        key={ele.id}
                        className={styles["plugin-online-heard-card-img"]}
                        src={ele.imgUrl}
                        alt=''
                        onClick={() => onImgClick(ele)}
                    />
                ))}
            </div>
            <YakitModal visible={visibleQRCode} title={null} footer={null} centered={true} width={368}>
                <div className={styles["yakit-modal-code"]}>
                    <div className={styles["yakit-modal-code-heard"]}>
                        <div className={styles["yakit-modal-code-heard-title"]}>
                            <SolidYakCattleNoBackColorIcon className={styles["yakit-modal-code-heard-title-icon"]} />
                            <span className={styles["yakit-modal-code-heard-title-text"]}>Yak Project</span>
                        </div>
                        <div
                            className={styles["yakit-modal-code-heard-remove"]}
                            onClick={() => setVisibleQRCode(false)}
                        >
                            <OutlineXIcon />
                        </div>
                    </div>
                    <div className={styles["yakit-modal-code-content"]}>
                        <img alt='' src={qrCode} className={styles["yakit-modal-code-content-url"]} />
                        <span className={styles["yakit-modal-code-content-tip"]}>微信扫码关注公众号</span>
                    </div>
                </div>
            </YakitModal>
        </div>
    )
})
interface YakitCombinationSearchCircleProps {}
const YakitCombinationSearchCircle: React.FC<YakitCombinationSearchCircleProps> = React.memo((props) => {
    return (
        <div className={styles["yakit-combination-search-circle"]}>
            <YakitSelect
                defaultValue='keyword'
                wrapperStyle={{width: 75}}
                wrapperClassName={styles["yakit-combination-search-circle-select-wrapper"]}
                bordered={false}
                options={funcSearchType}
            />
            <div className={styles["yakit-combination-search-circle-line"]} />
            <YakitInput
                className={styles["yakit-combination-search-circle-input"]}
                wrapperClassName={styles["yakit-combination-search-circle-input-wrapper"]}
                bordered={false}
                placeholder='请输入关键词搜索插件'
            />
            <div className={classNames(styles["yakit-combination-search-circle-icon"])}>
                <OutlineSearchIcon />
            </div>
        </div>
    )
})
