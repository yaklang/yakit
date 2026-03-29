import React, {useEffect, useMemo, useRef, useState} from "react"
import {useGetState, useInterval, useMemoizedFn, useSize, useThrottleFn, useUpdateEffect, useVirtualList} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./MessageCenter.module.scss"
import {failed, success, warn, info, yakitNotify} from "@/utils/notification"
import classNames from "classnames"
import {YakitButton, YakitButtonProp} from "../yakitUI/YakitButton/YakitButton"
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
    apiFetchQueryAllTask,
    apiFetchQueryMessage,
    MessageQueryDataProps,
    MessageQueryParamsProps
} from "./utils"
import emiter from "@/utils/eventBus/eventBus"
import {RollingLoadList} from "../RollingLoadList/RollingLoadList"
import {PageNodeItemProps, PluginHubPageInfoProps, usePageInfo} from "@/store/pageInfo"
import {YakitRoute} from "@/enums/yakitRoute"
import {pluginSupplementJSONConvertToData} from "@/pages/pluginEditor/utils/convert"
import {apiGetNotepadDetail} from "@/pages/notepadManage/notepadManage/utils"
import {useGoEditNotepad} from "@/pages/notepadManage/hook/useGoEditNotepad"
import {LoginMessageIcon, NoLoginMessageIcon} from "./IconMessageCenter"
import {JSONParseLog} from "@/utils/tool"
import {isEnpriTrace} from "@/utils/envfile"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {
    getEnvTypeByProjects,
    ProjectParamsProp,
    ProjectParamsProps,
    ProjectsResponse
} from "@/pages/softwareSettings/ProjectManage"
import {YakitHint} from "../yakitUI/YakitHint/YakitHint"
import moment from "moment"
const {ipcRenderer} = window.require("electron")

export interface MessageItemProps {
    onClose: () => void
    data: API.MessageLogDetail
    onRedTaskItem: (data: API.MessageLogDetail) => void
    isEllipsis?: boolean
    removeItem?: (data: API.MessageLogDetail) => void
}

export const MessageItem: React.FC<MessageItemProps> = (props) => {
    const {onClose, data, isEllipsis, onRedTaskItem, removeItem} = props
    const {t} = useI18nNamespaces(["layout"])
    const {goEditNotepad} = useGoEditNotepad()
    const getDescription = useMemo(() => {
        switch (data.upPluginType) {
            case "delete":
                return (
                    <>
                        <span className={classNames(styles["tag"], styles["delete"])}>{t("MessageCenter.delete")}</span>
                        <span
                            className={classNames(styles["text"], {
                                "yakit-single-line-ellipsis": isEllipsis
                            })}
                        >
                            {t("MessageCenter.yourPlugin", {scriptName: data.scriptName})}
                        </span>
                    </>
                )
            case "update":
                return (
                    <>
                        <span className={classNames(styles["tag"], styles["merge"])}>{t("MessageCenter.modify")}</span>
                        <span
                            className={classNames(styles["text"], {
                                "yakit-single-line-ellipsis": isEllipsis
                            })}
                        >
                            {t("MessageCenter.yourPlugin", {scriptName: data.scriptName})}
                        </span>
                    </>
                )
            case "check":
                if (data.status === 0) {
                    return (
                        <>
                            <span className={classNames(styles["tag"], styles["merge"])}>{t("MessageCenter.applyModify")}</span>
                            <span
                                className={classNames(styles["text"], {
                                    "yakit-single-line-ellipsis": isEllipsis
                                })}
                            >
                                {t("MessageCenter.yourPlugin", {scriptName: data.scriptName})}
                            </span>
                        </>
                    )
                } else if (data.status === 1) {
                    return (
                        <>
                            <span className={classNames(styles["tag"], styles["check"])}>{t("MessageCenter.approved")}</span>
                            <span
                                className={classNames(styles["text"], {
                                    "yakit-single-line-ellipsis": isEllipsis
                                })}
                            >
                                {t("MessageCenter.yourPlugin", {scriptName: data.scriptName})}
                            </span>
                        </>
                    )
                } else {
                    return (
                        <>
                            <span className={classNames(styles["tag"], styles["delete"])}>{t("MessageCenter.rejected")}</span>
                            <span
                                className={classNames(styles["text"], {
                                    "yakit-single-line-ellipsis": isEllipsis
                                })}
                            >
                                {t("MessageCenter.yourPlugin", {scriptName: data.scriptName})}
                            </span>
                        </>
                    )
                }

            case "applyMerge":
                return (
                    <>
                        <span className={classNames(styles["tag"], styles["merge"])}>{t("MessageCenter.applyModify")}</span>
                        <span
                            className={classNames(styles["text"], {
                                "yakit-single-line-ellipsis": isEllipsis
                            })}
                        >
                            {t("MessageCenter.yourPluginReview", {scriptName: data.scriptName})}
                        </span>
                    </>
                )
            case "comment":
                return (
                    <>
                        <span className={classNames(styles["tag"], styles["merge"])}>{t("MessageCenter.comment")}</span>
                        <span
                            className={classNames(styles["text"], {
                                "yakit-single-line-ellipsis": isEllipsis
                            })}
                        >
                            {t("MessageCenter.yourPlugin", {scriptName: data.scriptName})}
                        </span>
                    </>
                )
            case "merge":
                if (data.status === 1) {
                    return (
                        <>
                            <span className={classNames(styles["tag"], styles["check"])}>{t("MessageCenter.mergeApproved")}</span>
                            <span
                                className={classNames(styles["text"], {
                                    "yakit-single-line-ellipsis": isEllipsis
                                })}
                            >
                                {t("MessageCenter.yourPlugin", {scriptName: data.scriptName})}
                            </span>
                        </>
                    )
                } else {
                    return (
                        <>
                            <span className={classNames(styles["tag"], styles["delete"])}>{t("MessageCenter.mergeRejected")}</span>
                            <span
                                className={classNames(styles["text"], {
                                    "yakit-single-line-ellipsis": isEllipsis
                                })}
                            >
                                {t("MessageCenter.yourPlugin", {scriptName: data.scriptName})}
                            </span>
                        </>
                    )
                }
            case "replyComment":
                return (
                    <>
                        <span className={classNames(styles["tag"], styles["merge"])}>{t("MessageCenter.replied")}</span>
                        <span
                            className={classNames(styles["text"], {
                                "yakit-single-line-ellipsis": isEllipsis
                            })}
                        >
                            {t("MessageCenter.yourComment")}
                        </span>
                    </>
                )
            case "deleteComment":
                const {text, imgs} = pluginSupplementJSONConvertToData(data.description) || {}
                return (
                    <>
                        <span className={classNames(styles["tag"], styles["delete"])}>{t("MessageCenter.deleted")}</span>
                        <span
                            className={classNames(styles["text"], {
                                "yakit-single-line-ellipsis": isEllipsis
                            })}
                        >
                            {t("MessageCenter.yourCommentWithText", {text: String(text || "")})}
                            {imgs && imgs.length > 0 && t("MessageCenter.imageCount", {count: imgs.length})}
                        </span>
                    </>
                )
            case "notepad":
                return (
                    <span
                        className={classNames(styles["text"], {
                            "yakit-single-line-ellipsis": isEllipsis
                        })}
                    >
                        {data.description}
                    </span>
                )
            case "notepadEit":
                return (
                    <span
                        className={classNames(styles["text"], {
                            "yakit-single-line-ellipsis": isEllipsis
                        })}
                    >
                        {t("MessageCenter.atYou", {user: String(data.handlerUserName || ""), title: String(data.notepadTitle || "")})}
                    </span>
                )
            case "task":
                const {status, created_at, updated_at, description, taskName} = data
                if (status === 1) {
                    return (
                        <>
                            <span className={classNames(styles["tag"], styles["merge"])}>{t("MessageCenter.newTask")}</span>
                            <span
                                className={classNames(styles["text"], {
                                    "yakit-single-line-ellipsis": isEllipsis
                                })}
                            >
                                {t("MessageCenter.taskName", {taskName: String(taskName || "")})}；
                                {t("MessageCenter.issueTime", {time: moment.unix(created_at).format("YYYY-MM-DD HH:mm")})}；
                                {description && t("MessageCenter.taskDescription", {description: String(description || "")})}
                            </span>
                        </>
                    )
                } else if (status === 2) {
                    return (
                        <>
                            <span className={classNames(styles["tag"], styles["merge"])}>{t("MessageCenter.endTask")}</span>
                            <span
                                className={classNames(styles["text"], {
                                    "yakit-single-line-ellipsis": isEllipsis
                                })}
                            >
                                {t("MessageCenter.taskName", {taskName: String(taskName || "")})}；
                                {t("MessageCenter.endTime", {time: moment.unix(updated_at).format("YYYY-MM-DD HH:mm")})}；
                            </span>
                        </>
                    )
                } else if (status === 3) {
                    return (
                        <>
                            <span className={classNames(styles["tag"], styles["merge"])}>{t("MessageCenter.taskCanceled")}</span>
                            <span
                                className={classNames(styles["text"], {
                                    "yakit-single-line-ellipsis": isEllipsis
                                })}
                            >
                                {t("MessageCenter.taskName", {taskName: String(taskName || "")})}； {t("MessageCenter.canceledHint")}
                            </span>
                        </>
                    )
                } else {
                    return <></>
                }

            default:
                return <></>
        }
    }, [data, isEllipsis])

    const onItemClick = useMemoizedFn(() => {
        const {upPluginType, status} = data
        // 新任务通知不可直接已读 需要弹窗确认 并在项目引入后置为已读
        if (upPluginType === "task" && status === 1) {
            onRedTaskItem(data)
            return
        }
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
                        case "notepadEit":
                            if (!data.notepadHash) {
                                yakitNotify("error", t("MessageCenter.notepadNotFound"))
                                break
                            }
                            apiGetNotepadDetail(data.notepadHash).then((res) => {
                                goEditNotepad({
                                    notepadHash: res.hash,
                                    title: res.title,
                                    domId: data.mentionId || ""
                                })
                            })

                            break
                        case "task":
                            // task任务已读不含操作
                            removeItem && removeItem(data)
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
                    // task任务类型不关闭消息中心 直接更新数据
                    data.upPluginType !== "task" && onClose()
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
                    {data.handlerRole === "admin" && <div className={styles["role"]}>{t("MessageCenter.admin")}</div>}
                    {data.handlerRole === "auditor" && <div className={styles["role"]}>{t("MessageCenter.auditor")}</div>}
                    {data.handlerRole === "trusted" && <div className={styles["role"]}>{t("MessageCenter.trusted")}</div>}
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
    const {t} = useI18nNamespaces(["layout"])
    const {userInfo} = useStore()
    const [newMessageList, setNewMessageList] = useState<API.MessageLogDetail[]>(messageList)
    const [taskLoading, taskModalInfo, taskErrModalInfo, debugTaskEvent] = useEETaskNotificationHook({})

    useUpdateEffect(() => {
        setNewMessageList(messageList)
    }, [messageList])

    const onRedTaskItem = useMemoizedFn((item: API.MessageLogDetail) => {
        debugTaskEvent.startT({item})
        onClose()
    })

    // 移除列表中的某一项
    const removeItem = useMemoizedFn((item: API.MessageLogDetail) => {
        const newList = newMessageList.filter((i) => i.hash !== item.hash)
        setNewMessageList(newList)
    })

    return (
        <>
            {userInfo.isLogin ? (
                <>
                    {newMessageList.length > 0 ? (
                        <div className={styles["message-center"]}>
                            {newMessageList.map((item) => (
                                <MessageItem
                                    data={item}
                                    key={item.hash}
                                    onClose={onClose}
                                    onRedTaskItem={onRedTaskItem}
                                    removeItem={removeItem}
                                />
                            ))}

                            <div className={styles["footer-btn"]}>
                                <YakitButton type='text2' onClick={getAllMessage}>
                                {t("MessageCenter.viewAll")}
                                </YakitButton>
                            </div>
                        </div>
                    ) : (
                        <div className={styles["meeage-no-data"]}>
                            {/* <img src={LoginMessage} alt='' /> */}
                            <LoginMessageIcon />
                            <div className={styles["text"]}>{t("MessageCenter.noMessages")}</div>
                        </div>
                    )}
                </>
            ) : (
                <div className={styles["meeage-no-login"]}>
                    {/* <img src={LightIconNoLoginMessage} alt='' /> */}
                    <NoLoginMessageIcon />
                    <div className={styles["text"]}>{t("MessageCenter.loginToView")}</div>
                    <div>
                        <YakitButton type='primary' onClick={onLogin}>
                            {t("MessageCenter.loginNow")}
                        </YakitButton>
                    </div>
                </div>
            )}
            {/* 任务通知 */}
            <YakitHint
                visible={taskModalInfo.visible}
                title={taskModalInfo.title}
                content={<TaskNotification taskList={taskModalInfo.data} />}
                okButtonText={taskModalInfo.okButtonText}
                onOk={debugTaskEvent.sureT}
                cancelButtonProps={taskModalInfo.cancelButtonProps}
                okButtonProps={{loading: taskModalInfo.loading}}
                wrapClassName={styles["task-notification-wrap"]}
                width={600}
            />
            {/* 创建任务重名 */}
            <YakitHint
                visible={taskErrModalInfo.visible}
                title={taskErrModalInfo.title}
                content={<TaskErrNotification reNames={taskErrModalInfo.data} />}
                okButtonText={taskErrModalInfo.okButtonText}
                cancelButtonText={taskErrModalInfo.cancelButtonText}
                onOk={debugTaskEvent.coverP}
                onCancel={debugTaskEvent.waitP}
                wrapClassName={styles["task-notification-wrap"]}
                width={600}
            />
        </>
    )
}

export interface MessageCenterModalProps {
    visible: boolean
    setVisible: (v: boolean) => void
}
export const MessageCenterModal: React.FC<MessageCenterModalProps> = (props) => {
    const {visible, setVisible} = props
    const {t} = useI18nNamespaces(["layout"])
    const [loading, setLoading] = useState<boolean>(false)
    const [hasMore, setHasMore] = useState<boolean>(true)
    const [width, setWidth] = useState<number>(481)
    const [activeKey, setActiveKey] = useState<"unread" | "all">("unread")
    const [dataSorce, setDataSorce] = useState<API.MessageLogDetail[]>([])
    const [noRedDataTotal, setNoRedDataTotal] = useState<number>()
    const [isRef, setIsRef] = useState<boolean>(false)

    const refresh = useMemoizedFn(() => {
        update()
    })

    const [taskLoading, taskModalInfo, taskErrModalInfo, debugTaskEvent] = useEETaskNotificationHook({refresh})

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
            const obj: API.MessageLogDetail = JSONParseLog(data, {
                page: "MessageCenterModal",
                fun: "onRefreshMessageSocketFun"
            })
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
            setIsRef((is) => !is)
        } catch (error) {}
    })

    useEffect(() => {
        emiter.on("onRefreshMessageSocket", onRefreshMessageSocketFun)
        return () => {
            emiter.off("onRefreshMessageSocket", onRefreshMessageSocketFun)
        }
    }, [])

    const onRedTaskItem = useMemoizedFn((item: API.MessageLogDetail) => {
        // 此处不可置为false 否则无法打开modal
        // setVisible(false)
        debugTaskEvent.startT({item})
    })

    const removeItem = useMemoizedFn((item: API.MessageLogDetail) => {
        if (activeKey === "unread" && !item.isRead) {
            const newList = dataSorce.filter((i) => i.hash !== item.hash)
            setDataSorce(newList)
        }
    })

    const virtualList = useMemoizedFn(() => {
        return (
            <div className={styles["tab-item-box"]}>
                <RollingLoadList<API.MessageLogDetail>
                    isRef={isRef}
                    data={dataSorce}
                    loadMoreData={loadMore}
                    renderRow={(rowData: API.MessageLogDetail, index: number) => {
                        return (
                            <MessageItem
                                data={rowData}
                                key={rowData.hash}
                                isEllipsis={true}
                                onClose={() => setVisible(false)}
                                onRedTaskItem={onRedTaskItem}
                                removeItem={removeItem}
                            />
                        )
                    }}
                    page={1}
                    hasMore={hasMore}
                    loading={loading}
                    defItemHeight={66}
                    rowKey='hash'
                />
                {/* 任务通知 */}
                <YakitHint
                    visible={taskModalInfo.visible}
                    title={taskModalInfo.title}
                    content={<TaskNotification taskList={taskModalInfo.data} />}
                    okButtonText={taskModalInfo.okButtonText}
                    onOk={debugTaskEvent.sureT}
                    cancelButtonProps={taskModalInfo.cancelButtonProps}
                    okButtonProps={{loading: taskModalInfo.loading}}
                    wrapClassName={styles["task-notification-wrap"]}
                    width={600}
                />
                {/* 创建任务重名 */}
                <YakitHint
                    visible={taskErrModalInfo.visible}
                    title={taskErrModalInfo.title}
                    content={<TaskErrNotification reNames={taskErrModalInfo.data} />}
                    okButtonText={taskErrModalInfo.okButtonText}
                    cancelButtonText={taskErrModalInfo.cancelButtonText}
                    onOk={debugTaskEvent.coverP}
                    onCancel={debugTaskEvent.waitP}
                    wrapClassName={styles["task-notification-wrap"]}
                    width={600}
                />
            </div>
        )
    })

    const onRedAllMessage = useMemoizedFn(() => {
        // 如若是企业版则先需校验任务完成情况 - 执行任务通知 - 校验任务项目是否异常 - 更新状态
        if (isEnpriTrace()) {
            debugTaskEvent.startT({isReadAllOther: true})
        } else {
            apiFetchMessageRead({
                isAll: true,
                hash: ""
            }).then((ok) => {
                if (ok) {
                    update()
                    setNoRedDataTotal(0)
                }
            })
        }
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
                    <div className={styles["title"]}>{t("MessageCenter.title")}</div>
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
                                <YakitButton type='outline2' loading={taskLoading} onClick={onRedAllMessage}>
                                    {t("MessageCenter.markAllRead")}
                                </YakitButton>
                            )}
                            {activeKey === "all" && dataSorce.length > 0 && (
                                <YakitButton type='outline1' colors='danger' onClick={onClearAllMessage}>
                                    {t("MessageCenter.clearAll")}
                                </YakitButton>
                            )}
                        </>
                    }
                >
                    <YakitTabs.YakitTabPane
                        tab={
                            <div className={styles["info-tab"]}>
                                 {t("MessageCenter.unread")}
                                {typeof noRedDataTotal === "number" && (
                                    <div className={styles["info-tab-dot"]}>{noRedDataTotal}</div>
                                )}
                            </div>
                        }
                        key={"unread"}
                    >
                        {virtualList()}
                    </YakitTabs.YakitTabPane>
                    <YakitTabs.YakitTabPane tab={t("MessageCenter.all")} key={"all"}>
                        {virtualList()}
                    </YakitTabs.YakitTabPane>
                </YakitTabs>
            </div>
        </Resizable>
    )
}

interface TaskErrNotificationProps {
    reNames: string[]
}

export const TaskErrNotification: React.FC<TaskErrNotificationProps> = (props) => {
    const {reNames} = props
    const {t} = useI18nNamespaces(["layout"])
    return (
        <div className={styles["task-err-notification"]}>
            <div className={styles["title"]}>{t("MessageCenter.duplicateProjectTitle")}</div>
            <div className={styles["content"]}>
                {reNames.map((item) => (
                    <div key={item} className={styles["task-err-item"]}>
                        {t("MessageCenter.taskName", {taskName: item})}
                    </div>
                ))}
            </div>
            <div className={styles["hint"]}>
                {t("MessageCenter.duplicateProjectHint")}
            </div>
        </div>
    )
}

interface TaskNotificationProps {
    taskList: API.MessageLogDetail[]
}

export const TaskNotification: React.FC<TaskNotificationProps> = (props) => {
    const {taskList} = props
    const {t} = useI18nNamespaces(["layout"])

    // 新任务列表
    const newTaskList = useMemo(() => {
        return taskList.filter((item) => item.status === 1)
    }, [taskList])

    // 结束任务列表
    const endTaskList = useMemo(() => {
        return taskList.filter((item) => item.status === 2)
    }, [taskList])

    return (
        <div className={styles["task-notification"]}>
            {newTaskList.length > 0 && (
                <div className={styles["new-task"]}>
                    <div className={styles["title"]}>{t("MessageCenter.receivedNewTasks")}</div>
                    <div className={styles["content"]}>
                        {newTaskList.map((item) => (
                            <div key={item.id} className={styles["task-item"]}>
                                <div className={classNames("yakit-single-line-ellipsis")}>
                                    {t("MessageCenter.taskName", {taskName: String(item.taskName || "")})}；
                                    {t("MessageCenter.issueTime", {time: moment.unix(item.created_at).format("YYYY-MM-DD HH:mm")})}；
                                    {item.description && t("MessageCenter.taskDescription", {description: String(item.description || "")})}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {endTaskList.length > 0 && (
                <div className={styles["end-task"]} style={{marginTop: newTaskList.length > 0 ? 8 : 0}}>
                    <div className={styles["title"]}>{t("MessageCenter.endTasks")}</div>
                    <div className={styles["content"]}>
                        {endTaskList.map((item) => (
                            <div key={item.id} className={styles["task-item"]}>
                                <div className={classNames("yakit-single-line-ellipsis")}>
                                    {t("MessageCenter.taskName", {taskName: String(item.taskName || "")})}；
                                    {t("MessageCenter.endTime", {time: moment.unix(item.updated_at).format("YYYY-MM-DD HH:mm")})}；
                                    {item.description && t("MessageCenter.taskDescription", {description: String(item.description || "")})}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

interface TaskModalInfoProps {
    visible: boolean
    loading: boolean
    title: string
    data: API.MessageLogDetail[]
    okButtonText?: string
    cancelButtonText?: string
    cancelButtonProps?: YakitButtonProp
}

interface TaskErrorModalInfoProps {
    visible: boolean
    loading: boolean
    title: string
    data: string[]
    okButtonText?: string
    cancelButtonText?: string
    cancelButtonProps?: YakitButtonProp
}

interface StartTProps {
    // 如若有值则为任务单个已读，没有值则为全部任务已读
    item?: API.MessageLogDetail
    // 是否全部已读其余消息
    isReadAllOther?: boolean
}

interface useEETaskNotificationHookProps {
    refresh?: () => void
}

/** @name 企业版任务通知 */
export const useEETaskNotificationHook = (props: useEETaskNotificationHookProps) => {
    const {refresh} = props
    const {t} = useI18nNamespaces(["layout"])
    const {userInfo} = useStore()
    const [params, setParams, getParams] = useGetState<ProjectParamsProp>({
        Type: "all",
        Pagination: {Page: 1, Limit: 1000, Order: "desc", OrderBy: "updated_at"}
    })
    const [loading, setLoading] = useState<boolean>(false)
    const [taskList, setTaskList] = useState<API.MessageLogDetail[]>([])
    // 名称重复的taskList
    const [reNames, setReNames] = useState<string[]>([])

    // 任务通知的展示Modal控制
    const [taskModalInfo, setTaskModalInfo] = useState<TaskModalInfoProps>({
        visible: false,
        loading: false,
        title: t("MessageCenter.taskNotification"),
        data: [],
        okButtonText: t("MessageCenter.ok"),
        cancelButtonProps: {
            style: {display: "none"}
        }
    })

    // 创建任务重名异常的Modal控制
    const [taskErrModalInfo, setTaskErrModalInfo] = useState<TaskErrorModalInfoProps>({
        visible: false,
        loading: false,
        title: t("MessageCenter.createTaskError"),
        data: [],
        okButtonText: t("MessageCenter.coverProject"),
        cancelButtonText: t("MessageCenter.later")
    })

    /** @name 校验任务重名 */
    const onJudgeRepeat: (names: string[]) => Promise<string[]> = useMemoizedFn((names: string[]) => {
        return new Promise(async (resolve, reject) => {
            if (names.length === 0) return resolve([])
            const param: ProjectParamsProp = {
                ...getParams(),
                Pagination: {
                    ...getParams().Pagination,
                    Page: getParams().Pagination.Page,
                    Limit: getParams().Pagination.Limit
                },
                ProjectName: names.join(",")
            }
            ipcRenderer
                .invoke("GetProjects", param)
                .then((rsp: ProjectsResponse) => {
                    let newReNames = rsp.Projects.map((item) => {
                        return item.ProjectName
                    })
                    resolve(newReNames)
                })
                .catch((err) => {
                    yakitNotify("error", t("MessageCenter.judgeRepeatError", {err: String(err)}))
                    reject(err)
                })
        })
    })

    /** @name 获取任务通知 */
    const getTaskNotification = useMemoizedFn(async (obj?: StartTProps) => {
        try {
            const {item, isReadAllOther} = obj || {}
            // 获取需要操作的任务
            let data: API.MessageLogDetail[] = item ? [item] : []
            if (!item) {
                data = (await apiFetchQueryAllTask())?.data || []
            }
            // 全部已读其余消息
            if (isReadAllOther) {
                // 已取消的任务直接进行已读操作
                const excludeHash = data
                    .filter((task) => task.status !== 3)
                    .map((i) => i.hash)
                    .join(",")
                await apiFetchMessageRead({
                    isAll: true,
                    hash: "",
                    excludeHash
                })
                setLoading(false)
            }
            const newTaskList = data.filter((task) => task.status === 1)
            const endTaskList = data.filter((task) => task.status === 2)
            // 如若没有数据则无需进行任务通知
            if (newTaskList.length === 0 && endTaskList.length === 0) {
                refresh?.()
                return
            }

            setTaskList(data)
            // 此处还需校验新任务是否在项目管理中已存在，如若存在后续还将提示用户存在重名项目
            let names = newTaskList.map((item) => item.taskName || "").filter((name) => name !== "")
            const newReNames = await onJudgeRepeat(names)
            setReNames(newReNames)
            // 打开任务通知Modal
            setTaskModalInfo((v) => ({...v, visible: true, data}))
        } catch (error: any) {
            yakitNotify("error", t("MessageCenter.getTaskNotificationError", {error: String(error?.message || error)}))
            setLoading(false)
        }
    })

    /** @name 新建项目 */
    const createP = useMemoizedFn((list: API.MessageLogDetail[]) => {
        return new Promise(async (resolve, reject) => {
            try {
                const promiseList = list.map((item) => {
                    const params = {
                        ProjectName: item.taskName,
                        Type: getEnvTypeByProjects(),
                        ExternalModule: "",
                        ExternalProjectCode: "",
                        // 是否为线上任务项目
                        OnlineSubTaskID: item.subTaskId,
                        Description: item.description || ""
                    }

                    return ipcRenderer
                        .invoke("NewProject", params)
                        .then((res) => ({
                            status: "fulfilled",
                            value: res,
                            data: item
                        }))
                        .catch((err) => ({
                            status: "rejected",
                            reason: err,
                            data: item
                        }))
                })
                // 批量创建项目
                const results = await Promise.all(promiseList)
                const success = results
                    .filter((item) => item.status === "fulfilled")
                    .map((item) => item.data) as API.MessageLogDetail[]
                const failed = results
                    .filter((item) => item.status === "rejected")
                    .map((item) => item.data) as API.MessageLogDetail[]
                // 创建成功的项目置为已读
                if (success.length > 0) {
                    const successHashes = success.map((item) => item.hash)
                    const successInfo = success.map((item) => `${item.taskName}`).join("，")
                    yakitNotify("success", t("MessageCenter.createTaskProjectSuccess", {successInfo}))
                    await apiFetchMessageRead({
                        isAll: false,
                        hash: successHashes.join(",")
                    })
                    emiter.emit("onRefreshProjectList")
                    refresh?.()
                }
                // 创建失败的项目提示错误
                if (failed.length > 0) {
                    const failedInfo = failed.map((item) => `${item.taskName}`).join("，")
                    yakitNotify("error", t("MessageCenter.createTaskProjectFailed", {failedInfo}))
                }
                resolve(null)
            } catch (error) {
                reject(error)
            }
        })
    })

    /** @name 启动任务通知 */
    const startT = useMemoizedFn((obj?: StartTProps) => {
        if (!isEnpriTrace() || !userInfo.isLogin) return
        setLoading(true)
        getTaskNotification(obj)
    })

    /** @name 任务通知确认 */
    const sureT = useMemoizedFn(async () => {
        try {
            setTaskModalInfo((v) => ({...v, loading: true}))

            // 非重名项目新建
            const projectList = taskList.filter(
                (item) =>
                    item.status === 1 && (item.taskName || "").length > 0 && !reNames.includes(item.taskName || "")
            )
            await createP(projectList)
            // 将结束的任务已读
            const endTaskList = taskList.filter((item) => item.status === 2 && (item.taskName || "").length > 0)
            if (endTaskList.length > 0) {
                await apiFetchMessageRead({
                    isAll: false,
                    hash: endTaskList.map((item) => item.hash).join(",")
                })
                refresh?.()
            }

            // 新建完成后才考虑关闭
            setTaskModalInfo((v) => ({...v, visible: false, loading: false, data: []}))
            // 如若存在重名项目
            if (reNames.length > 0) {
                setTaskErrModalInfo((v) => ({...v, visible: true, data: reNames}))
            }

            // PS: 目前第一版仅处理新建任务项目，后续可考虑结束任务项目等操作
            // 项目管理操作按键的显隐根据接口请求的数据来控制

            // 结束任务项目处理
            // const endTaskList = taskList.filter((item) => item.status === 2 && (item.taskName || "").length > 0 )

            // 取消任务项目处理
            // const cancelTaskList = taskList.filter((item) => item.status === 3 && (item.taskName || "").length > 0 )
        } catch (error) {}
    })

    /** @name 覆盖项目 */
    const coverP = useMemoizedFn(async () => {
        try {
            // 需考虑当前打开项目是否存在于重名列表中
            const projectReNamesList = taskList.filter(
                (item) => item.status === 1 && (item.taskName || "").length > 0 && reNames.includes(item.taskName || "")
            )
            await createP(projectReNamesList)
            // 覆盖完成后才考虑关闭
            setTaskErrModalInfo((v) => ({...v, visible: false}))
        } catch (error) {}
    })

    /** @name 稍后处理 */
    const waitP = useMemoizedFn(() => {
        // 直接关闭，不做已读处理
        setTaskErrModalInfo((v) => ({...v, visible: false}))
    })

    return [loading, taskModalInfo, taskErrModalInfo, {startT, sureT, coverP, waitP}] as const
}
