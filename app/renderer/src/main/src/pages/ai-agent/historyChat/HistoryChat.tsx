import React, {memo, useMemo, useRef, useState} from "react"
import {HistoryChatProps} from "./type"
import useAIAgentStore from "../useContext/useStore"
import useAIAgentDispatcher from "../useContext/useDispatcher"
import {useDebounce, useMemoizedFn} from "ahooks"
import {yakitNotify} from "@/utils/notification"
import {AIChatInfo} from "../type/aiChat"
import {EditChatNameModal} from "../UtilModals"
import {ReActChatEventEnum, YakitAIAgentPageID} from "../defaultConstant"
import {SolidChatalt2Icon} from "@/assets/icon/solid"
import {OutlinePencilaltIcon, OutlinePlussmIcon, OutlineSearchIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitRoundCornerTag} from "@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"

import classNames from "classnames"
import styles from "./HistoryChat.module.scss"
import {AIAgentTriggerEventInfo} from "../aiAgentType"
import emiter from "@/utils/eventBus/eventBus"
import {grpcDeleteAIEvent, grpcDeleteAITask} from "../grpc"
import {aiChatDataStore} from "../store/ChatDataStore"

/** 向对话框组件进行事件触发的通信 */
export const onNewChat = () => {
    const info: AIAgentTriggerEventInfo = {type: ReActChatEventEnum.NEW_CHAT}
    emiter.emit("onReActChatEvent", JSON.stringify(info))
}
const HistoryChat: React.FC<HistoryChatProps> = memo((props) => {
    const {chats, activeChat} = useAIAgentStore()
    const {setChats, setActiveChat} = useAIAgentDispatcher()
    const activeID = useMemo(() => {
        return activeChat?.id || ""
    }, [activeChat])

    const [search, setSearch] = useState("")
    const searchDebounce = useDebounce(search, {wait: 500})

    const showHistory = useMemo(() => {
        if (!search) return chats
        return chats.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
    }, [chats, searchDebounce])

    const [clearLoading, setClearLoading] = useState(false)
    const handleClearAllChat = useMemoizedFn(async () => {
        if (clearLoading) return
        setClearLoading(true)
        try {
            onNewChat()
            await grpcDeleteAIEvent({ClearAll: true}, true)
            await grpcDeleteAITask({})
            aiChatDataStore.clear()
            setActiveChat?.(undefined)
            setChats?.([])
            setSearch("")
            yakitNotify("success", "已清除全部会话")
        } catch (e) {
            yakitNotify("error", "清除会话失败:" + e)
        } finally {
            setClearLoading(false)
        }
    })

    const handleSetActiveChat = useMemoizedFn((info: AIChatInfo) => {
        // 暂时性逻辑，因为老版本的对话信息里没有请求参数，导致在新版本无法使用对话里的重新执行功能
        // 所以会提示警告，由用户决定是否删除历史对话
        if (!info.request) {
            yakitNotify("warning", "当前对话无请求参数信息，无法使用重新执行功能")
        }
        setActiveChat && setActiveChat(info)
    })

    const editInfo = useRef<AIChatInfo>()
    const [editShow, setEditShow] = useState(false)
    const handleOpenEditName = useMemoizedFn((info: AIChatInfo) => {
        if (editShow) return
        editInfo.current = info
        setEditShow(true)
    })
    const handleCallbackEditName = useMemoizedFn((result: boolean, info?: AIChatInfo) => {
        if (result && info) {
            setChats &&
                setChats((old) => {
                    return old.map((item) => {
                        if (item.id === info.id) {
                            return info
                        }
                        return item
                    })
                })
        }
        setEditShow(false)
        editInfo.current = undefined
    })

    const [delLoading, setDelLoading] = useState<string[]>([])
    const handleDeleteChat = useMemoizedFn(async (info: AIChatInfo) => {
        const {id, session} = info
        const isLoading = delLoading.includes(id)
        if (isLoading) return
        const findIndex = chats.findIndex((item) => item.id === id)
        if (findIndex === -1) {
            yakitNotify("error", "未找到对应的对话")
            return
        }
        setDelLoading((old) => [...old, id])
        let active: AIChatInfo | undefined =
            findIndex === chats.length - 1 ? chats[findIndex - 1] : chats[findIndex + 1]
        setChats && setChats((old) => old.filter((item) => item.id !== id))

        if (activeID !== id) active = undefined
        active && handleSetActiveChat(active)

        try {
            await grpcDeleteAIEvent(
                {
                    Filter: {
                        SessionID: session
                    }
                },
                true
            )
        } catch (error) {
            yakitNotify("error", "删除会话失败:" + error)
        } finally {
            setDelLoading((old) => old.filter((el) => el !== id))
        }
    })
    return (
        <div className={styles["history-chat"]}>
            <div className={styles["header-wrapper"]}>
                <div className={styles["haeder-first"]}>
                    <div className={styles["first-title"]}>
                        历史会话
                        <YakitRoundCornerTag>{chats.length}</YakitRoundCornerTag>
                    </div>
                    <div className={styles["header-actions"]}>
                        <YakitPopconfirm
                            placement='bottomRight'
                            title='确定要清除全部会话吗？此操作不可恢复'
                            onConfirm={handleClearAllChat}
                        >
                            <Tooltip title='清除会话' placement='topRight'>
                                <YakitButton colors='danger' type='outline1' loading={clearLoading}>
                                    清空
                                </YakitButton>
                            </Tooltip>
                        </YakitPopconfirm>
                        <Tooltip title='新建会话' placement='topRight'>
                            <YakitButton icon={<OutlinePlussmIcon />} onClick={() => onNewChat()} />
                        </Tooltip>
                    </div>
                </div>

                <div className={styles["header-second"]}>
                    <YakitInput
                        prefix={<OutlineSearchIcon className={styles["search-icon"]} />}
                        placeholder='请输入关键词搜索'
                        allowClear
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles["content"]}>
                <div className={styles["history-chat-list"]}>
                    {showHistory.map((item) => {
                        const {id, name, time} = item
                        const delStatus = delLoading.includes(id)
                        return (
                            <div
                                key={id}
                                className={classNames(styles["history-item"], {
                                    [styles["history-item-active"]]: activeID === id
                                })}
                                onClick={() => handleSetActiveChat(item)}
                            >
                                <div className={styles["item-info"]}>
                                    <div className={styles["item-icon"]}>
                                        <SolidChatalt2Icon />
                                    </div>
                                    <div
                                        className={classNames(styles["info-title"], "yakit-content-single-ellipsis")}
                                        title={name}
                                    >
                                        {name}
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
                                    <Tooltip
                                        title={"删除任务"}
                                        placement='topRight'
                                        overlayClassName={styles["history-item-extra-tooltip"]}
                                    >
                                        <YakitButton
                                            loading={delStatus}
                                            type='text2'
                                            icon={<OutlineTrashIcon className={styles["del-icon"]} />}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleDeleteChat(item)
                                            }}
                                        />
                                    </Tooltip>
                                </div>
                            </div>
                        )
                    })}

                    {editInfo.current && (
                        <EditChatNameModal
                            getContainer={document.getElementById(YakitAIAgentPageID) || undefined}
                            info={editInfo.current}
                            visible={editShow}
                            onCallback={handleCallbackEditName}
                        />
                    )}
                </div>
            </div>
        </div>
    )
})

export default HistoryChat
