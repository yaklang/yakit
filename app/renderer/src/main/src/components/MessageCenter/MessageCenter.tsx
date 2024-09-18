import React, {useEffect, useMemo, useRef, useState} from "react"
import {} from "antd"
import {} from "@ant-design/icons"
import {useGetState, useMemoizedFn, useSize, useThrottleFn, useVirtualList} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./MessageCenter.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {Resizable} from "re-resizable"
import YakitTabs from "../yakitUI/YakitTabs/YakitTabs"
import ReactResizeDetector from "react-resize-detector"
import {formatTimestampJudge} from "@/utils/timeUtil"
import {RemoveIcon} from "@/assets/newIcon"
const {ipcRenderer} = window.require("electron")

export interface MessageItemProps {
    isEllipsis?: boolean
}

export const MessageItem: React.FC<MessageItemProps> = (props) => {
    const {isEllipsis} = props
    return (
        <div className={styles["message-item"]}>
            <div className={styles["message-item-author"]}>
                <img src={""} className={styles["author-img"]} />
                <div className={styles["dot"]}>
                    <div className={styles["circle"]}></div>
                </div>
            </div>
            <div className={styles["message-item-main"]}>
                <div className={styles["header"]}>
                    <div className={styles["user-name"]}>桔子爱吃橘子</div>
                    <div className={styles["role"]}>管理员</div>
                    <div className={styles["split"]}>·</div>
                    <div className={styles["time"]}>
                        {
                            // formatTimestampJudge()
                        }
                        2022-10-08 15:46:21
                    </div>
                </div>
                <div
                    className={classNames(styles["content"], {
                        [styles["content-ellipsis"]]: isEllipsis
                    })}
                >
                    <span className={classNames(styles["tag"], styles["pass"])}>审核通过</span>
                    <span
                        className={classNames(styles["text"], {
                            "yakit-single-line-ellipsis": isEllipsis
                        })}
                    >
                        了你的插件：领空技术WIFISKY7层流控路由器存在弱口令漏洞
                    </span>
                </div>
            </div>
        </div>
    )
}

export interface MessageCenterProps {
    getAllMessage: () => void
}
export const MessageCenter: React.FC<MessageCenterProps> = (props) => {
    const {getAllMessage} = props
    return (
        <div className={styles["message-center"]}>
            <MessageItem />

            <div className={styles["footer-btn"]}>
                <YakitButton type='text2' onClick={getAllMessage}>
                    查看全部
                </YakitButton>
            </div>
        </div>
    )
}

export interface MessageCenterVirtualListProps {}

export const MessageCenterVirtualList: React.FC<MessageCenterVirtualListProps> = (props) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const [vlistHeigth, setVListHeight] = useState(600)
    const originalList = useMemo(() => Array.from(Array(20).keys()), [])

    const [list, scrollTo] = useVirtualList(originalList, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 66,
        overscan: 10
    })

    const isVerticalScrollRef = useRef<boolean>(false)
    const size = useSize(wrapperRef)

    const handleScroll = useThrottleFn(
        () => {
            if (containerRef.current) {
                const {scrollTop, scrollHeight, clientHeight} = containerRef.current
                const isVerticalScroll = scrollHeight > clientHeight
                // 校验是否有垂直滚动条
                isVerticalScrollRef.current = isVerticalScroll
                const bottom = scrollHeight - clientHeight - scrollTop
                if (isVerticalScroll && bottom <= 20) {
                    console.log("滚轮到底")
                }
                if (isVerticalScroll && scrollTop < 10) {
                    // 注：滚轮到顶部时 监听是否有新增缓存数据(此数据socket通知) 有则拼接上
                    console.log("滚轮到顶")
                }
            }
        },
        {wait: 200, leading: false}
    ).run

    useEffect(() => {
        const container = containerRef.current
        if (container) {
            container.addEventListener("scroll", handleScroll)
        }
        return () => {
            if (container) {
                container.removeEventListener("scroll", handleScroll)
            }
        }
    }, [originalList])

    useEffect(() => {
        handleScroll()
    }, [size?.width])

    // 如果没有滚轮 新数据进来时直接头部插入

    return (
        <>
            <ReactResizeDetector
                onResize={(width, height) => {
                    if (!width || !height) {
                        return
                    }
                    setVListHeight(height)
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <div ref={containerRef} style={{height: vlistHeigth, overflow: "auto"}}>
                <div ref={wrapperRef}>
                    {list.map((ele) => (
                        <MessageItem key={ele.index} isEllipsis={true} />
                    ))}
                </div>
            </div>
        </>
    )
}

export interface MessageCenterModalProps {
    visible: boolean
    setVisible: (v: boolean) => void
}
export const MessageCenterModal: React.FC<MessageCenterModalProps> = (props) => {
    const {visible, setVisible} = props
    const [width, setWidth] = useState<number>(481)

    const onSetWidth = useThrottleFn(
        (value) => {
            setWidth(value)
        },
        {wait: 50, leading: false}
    ).run
    
    return (
        <Resizable
            style={{position: "absolute"}}
            className={classNames(styles["message-center-modal"], {[styles["hidden-message-center-modal"]]: !visible})}
            defaultSize={{width: 481, height: "100%"}}
            size={{width: width, height: "100%"}}
            minWidth={320}
            minHeight={"100%"}
            maxWidth={"95vw"}
            enable={{
                top: false,
                right: false,
                bottom: false,
                left: true,
                topRight: false,
                bottomRight: false,
                bottomLeft: false,
                topLeft: false
            }}
            onResize={(event, direction, elementRef, delta) => {
                onSetWidth(elementRef.clientWidth)
            }}
        >
            <div className={styles["message-center-layout"]}>
                <div className={styles["message-header"]}>
                    <div className={styles["title"]}>消息中心</div>
                    <div className={styles["extra"]}>
                        <YakitButton
                            size='small'
                            type='text2'
                            icon={<RemoveIcon />}
                            onClick={() => setVisible(false)}
                        />
                    </div>
                </div>
                <YakitTabs
                    // activeKey={activeKey}
                    // onChange={(v) => setActiveKey(v)}
                    tabBarStyle={{marginBottom: 5}}
                    className={styles["message-center-tab"]}
                >
                    <YakitTabs.YakitTabPane
                        tab={
                            <div className={styles["info-tab"]}>
                                未读
                                <div className={styles["info-tab-dot"]}>8</div>
                            </div>
                        }
                        key={"unread"}
                    >
                        <div className={styles["tab-item-box"]}>
                            <MessageItem isEllipsis={true} />
                        </div>
                    </YakitTabs.YakitTabPane>
                    <YakitTabs.YakitTabPane tab={"全部"} key={"all"}>
                        <div className={styles["tab-item-box"]}>
                            <MessageCenterVirtualList />
                        </div>
                    </YakitTabs.YakitTabPane>
                </YakitTabs>
            </div>
        </Resizable>
    )
}
