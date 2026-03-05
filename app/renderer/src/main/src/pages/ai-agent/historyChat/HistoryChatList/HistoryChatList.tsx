import {useMemo, useRef, useState, type FC} from "react"
import styles from "./HistoryChatList.module.scss"
import {OutlinePencilaltIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {SolidChatalt2Icon} from "@/assets/icon/solid"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {Tooltip} from "antd"
import classNames from "classnames"
import {YakitAIAgentPageID} from "../../defaultConstant"
import {EditChatNameModal} from "../../UtilModals"
import {AIChatInfo} from "../../type/aiChat"
import {useInfiniteScroll, useMemoizedFn} from "ahooks"
import { grpcDeleteAISession, grpcUpdateAISessionTitle} from "../../grpc"
import useAIAgentStore from "../../useContext/useStore"
import useAIAgentDispatcher from "../../useContext/useDispatcher"
import {yakitNotify} from "@/utils/notification"
import {aiChatDataStore} from "../../store/ChatDataStore"
import {onNewChat} from "../HistoryChat"

const HistoryChatList: FC<{
    search: string
}> = ({search}) => {
    const {chats, activeChat} = useAIAgentStore()
    const {setChats, setActiveChat, loadHistoryData} = useAIAgentDispatcher()
    const listRef = useRef<HTMLDivElement | null>(null)
    const chatTotalRef = useRef(0)
    const editInfo = useRef<AIChatInfo>()
    const [delLoading, setDelLoading] = useState<string[]>([])
    const [editShow, setEditShow] = useState(false)

    const activeSessionId = useMemo(() => {
        return activeChat?.SessionID || ""
    }, [activeChat])

    const {loading} = useInfiniteScroll(
        async () => {
            const total = await loadHistoryData?.(true)
            chatTotalRef.current = total ?? 0
            return {list: []}
        },
        {
            target: listRef,
            isNoMore: () => chats.length >= chatTotalRef.current,
            threshold: 100
        }
    )

    const handleOpenEditName = useMemoizedFn((info: AIChatInfo) => {
        if (editShow) return
        editInfo.current = info
        setEditShow(true)
    })

    const showHistory = useMemo(() => {
        if (!search) return chats
        return chats.filter((item) => item.Title.toLowerCase().includes(search.toLowerCase()))
    }, [chats, search])

    const handleCallbackEditName = useMemoizedFn(async (result: boolean, info?: AIChatInfo) => {
        if (result && info) {
            try {
                await grpcUpdateAISessionTitle({SessionID: info.SessionID, Title: info.Title})
                setChats?.((old) => {
                    return old.map((item) => {
                        if (item.SessionID === info.SessionID) {
                            return info
                        }
                        return item
                    })
                })
            } catch (error) {
                yakitNotify("error", "修改对话标题失败:" + error)
            }
        }
        setEditShow(false)
        editInfo.current = undefined
    })

    const handleDeleteChat = useMemoizedFn(async (info: AIChatInfo) => {
        const {SessionID} = info
        const isLoading = delLoading.includes(SessionID)
        if (isLoading) return
        const findIndex = chats.findIndex((item) => item.SessionID === SessionID)
        if (findIndex === -1) {
            yakitNotify("error", "未找到对应的对话")
            return
        }
        setDelLoading((old) => [...old, SessionID])

        const newChats = chats.filter((item) => item.SessionID !== SessionID)
        let active: AIChatInfo | undefined
        if (newChats.length === 0) {
            onNewChat()
        } else {
            const prev = chats[findIndex - 1]
            const next = chats[findIndex + 1]
            active = prev ?? next
        }

        setChats && setChats(newChats)

        if (activeSessionId === SessionID && active) {
            handleSetActiveChat(active)
        }

        try {
            grpcDeleteAISession({Filter: {SessionID: [SessionID]}}, true)
            aiChatDataStore.remove(SessionID)
        } catch (error) {
            yakitNotify("error", "删除会话失败:" + error)
        } finally {
            setDelLoading((old) => old.filter((el) => el !== SessionID))
        }
    })

    const handleSetActiveChat = useMemoizedFn((info: AIChatInfo) => {
        // 暂时性逻辑，因为老版本的对话信息里没有请求参数，导致在新版本无法使用对话里的重新执行功能
        // 所以会提示警告，由用户决定是否删除历史对话
        // if (!info.request) {
        //     yakitNotify("warning", "当前对话无请求参数信息，无法使用重新执行功能")
        // }
        setActiveChat && setActiveChat(info)
    })

    return (
        <div ref={listRef} className={styles["history-chat-list"]}>
            {showHistory.map((item) => {
                const {SessionID, Title} = item
                const delStatus = delLoading.includes(SessionID)
                return (
                    <div
                        key={SessionID}
                        className={classNames(styles["history-item"], {
                            [styles["history-item-active"]]: activeSessionId === SessionID
                        })}
                        onClick={() => handleSetActiveChat(item)}
                    >
                        <div className={styles["item-info"]}>
                            <div className={styles["item-icon"]}>
                                <SolidChatalt2Icon />
                            </div>
                            <div
                                className={classNames(styles["info-title"], "yakit-content-single-ellipsis")}
                                title={Title}
                            >
                                {Title}
                            </div>
                        </div>

                        <div className={styles["item-extra"]}>
                            <Tooltip
                                title={"编辑对话标题"}
                                placement='topRight'
                                overlayClassName={styles["history-item-extra-tooltip"]}
                            >
                                <YakitButton
                                    type='text2'
                                    icon={<OutlinePencilaltIcon />}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleOpenEditName(item)
                                    }}
                                />
                            </Tooltip>
                            <YakitPopconfirm
                                title='是否确认删除该历史对话，删除后将无法恢复'
                                placement='bottom'
                                onConfirm={(e) => {
                                    e?.stopPropagation()
                                    handleDeleteChat(item)
                                }}
                            >
                                <YakitButton
                                    loading={delStatus}
                                    type='text2'
                                    icon={<OutlineTrashIcon className={styles["del-icon"]} />}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </YakitPopconfirm>
                        </div>
                    </div>
                )
            })}
            {loading && <div className={styles["history-loading"]}>加载中...</div>}

            {editInfo.current && (
                <EditChatNameModal
                    getContainer={document.getElementById(YakitAIAgentPageID) || undefined}
                    info={editInfo.current}
                    visible={editShow}
                    onCallback={handleCallbackEditName}
                />
            )}
        </div>
    )
}

export default HistoryChatList
