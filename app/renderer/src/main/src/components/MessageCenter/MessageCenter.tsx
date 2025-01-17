import React, {useEffect, useMemo, useRef, useState} from "react"
import {useGetState, useInterval, useMemoizedFn, useSize, useThrottleFn, useVirtualList} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./MessageCenter.module.scss"
import {failed, success, warn, info, yakitNotify} from "@/utils/notification"
import classNames from "classnames"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {Resizable} from "re-resizable"
import YakitTabs from "../yakitUI/YakitTabs/YakitTabs"
import ReactResizeDetector from "react-resize-detector"
import {formatTimestampJudge} from "@/utils/timeUtil"
import {RemoveIcon} from "@/assets/newIcon"
import {useStore} from "@/store"
import {AuthorImg} from "@/pages/plugins/funcTemplate"
import {
    apiFetchMessageClear,
    apiFetchMessageRead,
    apiFetchQueryMessage,
    MessageQueryDataProps,
    MessageQueryParamsProps
} from "./utils"
import emiter from "@/utils/eventBus/eventBus"
import {YakitSpin} from "../yakitUI/YakitSpin/YakitSpin"
import {RollingLoadList} from "../RollingLoadList/RollingLoadList"
import {PageNodeItemProps, PluginHubPageInfoProps, usePageInfo} from "@/store/pageInfo"
import {YakitRoute} from "@/enums/yakitRoute"
import {pluginSupplementJSONConvertToData} from "@/pages/pluginEditor/utils/convert"
import IconNoLoginMessage from "@/assets/no_login_message.png"
import LoginMessage from "@/assets/login_message.png"
import {toEditNotepad} from "@/pages/notepadManage/notepadManage/NotepadManage"
import {shallow} from "zustand/shallow"
import {apiGetNotepadDetail} from "@/pages/notepadManage/notepadManage/utils"
const {ipcRenderer} = window.require("electron")

export interface MessageItemProps {
    onClose: () => void
    data: API.MessageLogDetail
    isEllipsis?: boolean
    notepadPageList?: PageNodeItemProps[]
}

export const MessageItem: React.FC<MessageItemProps> = (props) => {
    const {onClose, data, isEllipsis, notepadPageList} = props

    const getDescription = useMemo(() => {
        switch (data.upPluginType) {
            case "delete":
                return (
                    <>
                        <span className={classNames(styles["tag"], styles["delete"])}>删除</span>
                        <span
                            className={classNames(styles["text"], {
                                "yakit-single-line-ellipsis": isEllipsis
                            })}
                        >
                            了您的插件：{data.scriptName}
                        </span>
                    </>
                )
            case "update":
                return (
                    <>
                        <span className={classNames(styles["tag"], styles["merge"])}>修改</span>
                        <span
                            className={classNames(styles["text"], {
                                "yakit-single-line-ellipsis": isEllipsis
                            })}
                        >
                            了您的插件：{data.scriptName}
                        </span>
                    </>
                )
            case "check":
                if (data.status === 0) {
                    return (
                        <>
                            <span className={classNames(styles["tag"], styles["merge"])}>申请修改</span>
                            <span
                                className={classNames(styles["text"], {
                                    "yakit-single-line-ellipsis": isEllipsis
                                })}
                            >
                                了您的插件：{data.scriptName}
                            </span>
                        </>
                    )
                } else if (data.status === 1) {
                    return (
                        <>
                            <span className={classNames(styles["tag"], styles["check"])}>审核通过</span>
                            <span
                                className={classNames(styles["text"], {
                                    "yakit-single-line-ellipsis": isEllipsis
                                })}
                            >
                                了您的插件：{data.scriptName}
                            </span>
                        </>
                    )
                } else {
                    return (
                        <>
                            <span className={classNames(styles["tag"], styles["delete"])}>审核不通过</span>
                            <span
                                className={classNames(styles["text"], {
                                    "yakit-single-line-ellipsis": isEllipsis
                                })}
                            >
                                了您的插件：{data.scriptName}
                            </span>
                        </>
                    )
                }

            case "applyMerge":
                return (
                    <>
                        <span className={classNames(styles["tag"], styles["merge"])}>申请修改</span>
                        <span
                            className={classNames(styles["text"], {
                                "yakit-single-line-ellipsis": isEllipsis
                            })}
                        >
                            了你的插件：{data.scriptName}，请在日志中审核
                        </span>
                    </>
                )
            case "comment":
                return (
                    <>
                        <span className={classNames(styles["tag"], styles["merge"])}>评论</span>
                        <span
                            className={classNames(styles["text"], {
                                "yakit-single-line-ellipsis": isEllipsis
                            })}
                        >
                            了您的插件：{data.scriptName}
                        </span>
                    </>
                )
            case "merge":
                if (data.status === 1) {
                    return (
                        <>
                            <span className={classNames(styles["tag"], styles["check"])}>通过合并</span>
                            <span
                                className={classNames(styles["text"], {
                                    "yakit-single-line-ellipsis": isEllipsis
                                })}
                            >
                                了您的插件：{data.scriptName}
                            </span>
                        </>
                    )
                } else {
                    return (
                        <>
                            <span className={classNames(styles["tag"], styles["delete"])}>拒绝合并</span>
                            <span
                                className={classNames(styles["text"], {
                                    "yakit-single-line-ellipsis": isEllipsis
                                })}
                            >
                                了您的插件：{data.scriptName}
                            </span>
                        </>
                    )
                }
            case "replyComment":
                return (
                    <>
                        <span className={classNames(styles["tag"], styles["merge"])}>回复了</span>
                        <span
                            className={classNames(styles["text"], {
                                "yakit-single-line-ellipsis": isEllipsis
                            })}
                        >
                            您的评论
                        </span>
                    </>
                )
            case "deleteComment":
                const {text, imgs} = pluginSupplementJSONConvertToData(data.description) || {}
                return (
                    <>
                        <span className={classNames(styles["tag"], styles["delete"])}>删除了</span>
                        <span
                            className={classNames(styles["text"], {
                                "yakit-single-line-ellipsis": isEllipsis
                            })}
                        >
                            您的评论：{text}
                            {imgs && imgs.length > 0 && `[图片] * ${imgs.length}`}
                        </span>
                    </>
                )
            case "notepad":
                return <>{data.description}</>
            default:
                return <></>
        }
    }, [data, isEllipsis])

    const onItemClick = useMemoizedFn(() => {
        apiFetchMessageRead({
            isAll: false,
            hash: data.hash
        })
            .then((ok) => {
                if (ok) {
                    switch (data.upPluginType) {
                        // 跳转到插件仓库回收站
                        case "delete":
                            emiter.emit(
                                "openPage",
                                JSON.stringify({
                                    route: YakitRoute.Plugin_Hub,
                                    params: {tabActive: "recycle"} as PluginHubPageInfoProps
                                })
                            )
                            break
                        // 跳转到插件日志-审核
                        case "check":
                            emiter.emit(
                                "openPage",
                                JSON.stringify({
                                    route: YakitRoute.Plugin_Hub,
                                    params: {
                                        tabActive: "online",
                                        detailInfo: {uuid: data.uuid, name: data.scriptName, tabActive: "log/check"}
                                    } as PluginHubPageInfoProps
                                })
                            )
                            break
                        // 跳转到插件日志-修改
                        case "update":
                        case "applyMerge":
                        case "merge":
                            emiter.emit(
                                "openPage",
                                JSON.stringify({
                                    route: YakitRoute.Plugin_Hub,
                                    params: {
                                        tabActive: "online",
                                        detailInfo: {uuid: data.uuid, name: data.scriptName, tabActive: "log/update"}
                                    } as PluginHubPageInfoProps
                                })
                            )
                            break
                        // 跳转到插件日志-评论
                        case "comment":
                        case "replyComment":
                        case "deleteComment":
                            emiter.emit(
                                "openPage",
                                JSON.stringify({
                                    route: YakitRoute.Plugin_Hub,
                                    params: {
                                        tabActive: "online",
                                        detailInfo: {uuid: data.uuid, name: data.scriptName, tabActive: "log/comment"}
                                    } as PluginHubPageInfoProps
                                })
                            )
                            break
                        // 跳转到笔记本编辑页面
                        case "notepad":
                            if (!data.notepadHash) {
                                yakitNotify("error", "未找到笔记本信息")
                                break
                            }
                            apiGetNotepadDetail(data.notepadHash).then((res) => {
                                toEditNotepad({
                                    notepadHash: res.hash,
                                    title: res.title,
                                    notepadPageList: notepadPageList || []
                                })
                            })

                            break
                        // 其余跳转到插件日志
                        default:
                            emiter.emit(
                                "openPage",
                                JSON.stringify({
                                    route: YakitRoute.Plugin_Hub,
                                    params: {
                                        tabActive: "online",
                                        detailInfo: {uuid: data.uuid, name: data.scriptName}
                                    } as PluginHubPageInfoProps
                                })
                            )
                            break
                    }
                    onClose()
                }
            })
            .catch((err) => {
                failed(err)
            })
    })

    return (
        <div className={styles["message-item"]} onClick={onItemClick}>
            <div className={styles["message-item-author"]}>
                <AuthorImg src={data.handlerHeadImag} />
                {!data.isRead && (
                    <div className={styles["dot"]}>
                        <div className={styles["circle"]}></div>
                    </div>
                )}
            </div>
            <div className={styles["message-item-main"]}>
                <div className={styles["header"]}>
                    <div className={styles["user-name"]}>{data.handlerUserName}</div>
                    {data.handlerRole === "admin" && <div className={styles["role"]}>管理员</div>}
                    {data.handlerRole === "auditor" && <div className={styles["role"]}>审核员</div>}
                    {data.handlerRole === "trusted" && <div className={styles["role"]}>信任用户</div>}
                    <div className={styles["split"]}>·</div>
                    <div className={styles["time"]}>{formatTimestampJudge(data.created_at * 1000)}</div>
                </div>
                <div
                    className={classNames(styles["content"], {
                        [styles["content-ellipsis"]]: isEllipsis
                    })}
                >
                    {getDescription}
                </div>
            </div>
        </div>
    )
}

export interface MessageCenterProps {
    messageList: API.MessageLogDetail[]
    getAllMessage: () => void
    onLogin: () => void
    onClose: () => void
}
export const MessageCenter: React.FC<MessageCenterProps> = (props) => {
    const {messageList, getAllMessage, onLogin, onClose} = props
    const {userInfo} = useStore()
    const {notepadPageList} = usePageInfo(
        (s) => ({
            notepadPageList: s.pages.get(YakitRoute.Modify_Notepad)?.pageList || []
        }),
        shallow
    )
    return (
        <>
            {userInfo.isLogin ? (
                <>
                    {messageList.length > 0 ? (
                        <div className={styles["message-center"]}>
                            {messageList.map((item) => (
                                <MessageItem
                                    data={item}
                                    key={item.hash}
                                    onClose={onClose}
                                    notepadPageList={notepadPageList}
                                />
                            ))}

                            <div className={styles["footer-btn"]}>
                                <YakitButton type='text2' onClick={getAllMessage}>
                                    查看全部
                                </YakitButton>
                            </div>
                        </div>
                    ) : (
                        <div className={styles["meeage-no-data"]}>
                            <img src={LoginMessage} alt='' />
                            <div className={styles["text"]}>暂无消息</div>
                        </div>
                    )}
                </>
            ) : (
                <div className={styles["meeage-no-login"]}>
                    <img src={IconNoLoginMessage} alt='' />
                    <div className={styles["text"]}>登录后才可查看消息</div>
                    <div>
                        <YakitButton type='primary' onClick={onLogin}>
                            立即登录
                        </YakitButton>
                    </div>
                </div>
            )}
        </>
    )
}

export interface MessageCenterModalProps {
    visible: boolean
    setVisible: (v: boolean) => void
}
export const MessageCenterModal: React.FC<MessageCenterModalProps> = (props) => {
    const {visible, setVisible} = props
    const [loading, setLoading] = useState<boolean>(false)
    const [hasMore, setHasMore] = useState<boolean>(true)
    const [width, setWidth] = useState<number>(481)
    const [activeKey, setActiveKey] = useState<"unread" | "all">("unread")
    const [dataSorce, setDataSorce] = useState<API.MessageLogDetail[]>([])
    const [noRedDataTotal, setNoRedDataTotal] = useState<number>()
    const onSetWidth = useThrottleFn(
        (value) => {
            setWidth(value)
        },
        {wait: 50, leading: false}
    ).run

    const update = useMemoizedFn((data?: MessageQueryDataProps, isAdd?: boolean) => {
        setLoading(true)
        if (!isAdd) {
            setDataSorce([])
        }
        const newQueryData: MessageQueryDataProps = {
            isRead: activeKey === "unread" ? "false" : undefined,
            ...data
        }
        apiFetchQueryMessage(
            {
                page: 1,
                limit: 20
            },
            {
                ...newQueryData
            }
        )
            .then((res) => {
                if (newQueryData?.isRead === "false") {
                    setNoRedDataTotal(res.pagemeta.total)
                }

                if (!res.data) {
                    setHasMore(false)
                    return
                }

                const newData = isAdd ? [...dataSorce, ...(res.data || [])] : res.data
                setDataSorce(newData)
                if (res.pagemeta.total !== newData.length) {
                    setHasMore(true)
                } else {
                    setHasMore(false)
                }
            })
            .finally(() => {
                setLoading(false)
            })
    })

    useEffect(() => {
        // 初次加载数据
        update()
    }, [activeKey])

    const loadMore = useMemoizedFn(() => {
        update(
            {
                beforeId: dataSorce[dataSorce.length - 1].id
            },
            true
        )
    })

    const onRefreshMessageSocketFun = useMemoizedFn((data: string) => {
        try {
            const obj: API.MessageLogDetail = JSON.parse(data)
            if (obj.isRead === false) {
                setNoRedDataTotal((prev) => {
                    return (prev || 0) + 1
                })
            }
            if (activeKey === "all") {
                setDataSorce((prev) => {
                    return [obj, ...prev]
                })
            }
            if (activeKey === "unread" && obj.isRead === false) {
                setDataSorce((prev) => {
                    return [obj, ...prev]
                })
            }
        } catch (error) {}
    })

    useEffect(() => {
        emiter.on("onRefreshMessageSocket", onRefreshMessageSocketFun)
        return () => {
            emiter.off("onRefreshMessageSocket", onRefreshMessageSocketFun)
        }
    }, [])

    const virtualList = useMemoizedFn(() => {
        return (
            <div className={styles["tab-item-box"]}>
                <RollingLoadList<API.MessageLogDetail>
                    data={dataSorce}
                    loadMoreData={loadMore}
                    renderRow={(rowData: API.MessageLogDetail, index: number) => {
                        return (
                            <MessageItem
                                data={rowData}
                                key={rowData.hash}
                                isEllipsis={true}
                                onClose={() => setVisible(false)}
                            />
                        )
                    }}
                    page={1}
                    hasMore={hasMore}
                    loading={loading}
                    defItemHeight={66}
                    rowKey='hash'
                />
            </div>
        )
    })

    const onRedAllMessage = useMemoizedFn(() => {
        apiFetchMessageRead({
            isAll: true,
            hash: ""
        }).then((ok) => {
            if (ok) {
                update()
                setNoRedDataTotal(0)
            }
        })
    })

    const onClearAllMessage = useMemoizedFn(() => {
        apiFetchMessageClear({
            isAll: true,
            hash: ""
        }).then((ok) => {
            if (ok) {
                update()
            }
        })
    })

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
                    activeKey={activeKey}
                    onChange={(v: any) => setActiveKey(v)}
                    tabBarStyle={{marginBottom: 5}}
                    className={styles["message-center-tab"]}
                    tabBarExtraContent={
                        <>
                            {activeKey === "unread" && dataSorce.length > 0 && (
                                <YakitButton type='outline2' onClick={onRedAllMessage}>
                                    全部已读
                                </YakitButton>
                            )}
                            {activeKey === "all" && dataSorce.length > 0 && (
                                <YakitButton type='outline1' colors='danger' onClick={onClearAllMessage}>
                                    全部清空
                                </YakitButton>
                            )}
                        </>
                    }
                >
                    <YakitTabs.YakitTabPane
                        tab={
                            <div className={styles["info-tab"]}>
                                未读
                                {typeof noRedDataTotal === "number" && (
                                    <div className={styles["info-tab-dot"]}>{noRedDataTotal}</div>
                                )}
                            </div>
                        }
                        key={"unread"}
                    >
                        {virtualList()}
                    </YakitTabs.YakitTabPane>
                    <YakitTabs.YakitTabPane tab={"全部"} key={"all"}>
                        {virtualList()}
                    </YakitTabs.YakitTabPane>
                </YakitTabs>
            </div>
        </Resizable>
    )
}
