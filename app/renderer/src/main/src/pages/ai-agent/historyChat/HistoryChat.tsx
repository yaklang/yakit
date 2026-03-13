import {memo, useState} from "react"
import useAIAgentStore from "../useContext/useStore"
import useAIAgentDispatcher from "../useContext/useDispatcher"
import {useDebounce, useMemoizedFn} from "ahooks"
import {yakitNotify} from "@/utils/notification"
import {ReActChatEventEnum} from "../defaultConstant"
import {OutlineMessageCirclePlusIcon, OutlineSearchIcon} from "@/assets/icon/outline"
import {Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitRoundCornerTag} from "@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import styles from "./HistoryChat.module.scss"
import {AIAgentTriggerEventInfo} from "../aiAgentType"
import emiter from "@/utils/eventBus/eventBus"
import {grpcDeleteAISession} from "../grpc"
import {AIChatInfo} from "../type/aiChat"
import {SideSettingButton} from "../aiChatWelcome/AIChatWelcome"
import HistoryChatList, {DAY_MS, getChatTimestamp} from "./HistoryChatList/HistoryChatList"

const clearLocalChats = (sessions: AIChatInfo[]) =>
    emiter.emit("onDelChats", JSON.stringify(sessions.map((item) => item.SessionID)))

const renderClearConfirm = (label: string, title: string, onConfirm: () => void) => {
    return (
        <YakitPopconfirm placement='bottomRight' title={title} onConfirm={onConfirm}>
            <div className={styles["clear-confirm-trigger"]} onClick={(e) => e.stopPropagation()}>
                {label}
            </div>
        </YakitPopconfirm>
    )
}

/** 向对话框组件进行事件触发的通信 */
export const onNewChat = () => {
    const info: AIAgentTriggerEventInfo = {type: ReActChatEventEnum.NEW_CHAT}
    emiter.emit("onReActChatEvent", JSON.stringify(info))
}
const HistoryChat = memo(() => {
    const {chats, activeChat} = useAIAgentStore()
    const {setChats, setActiveChat} = useAIAgentDispatcher()

    const [search, setSearch] = useState("")
    const searchDebounce = useDebounce(search, {wait: 500})

    const [clearLoading, setClearLoading] = useState(false)
    const handleClearAllChat = useMemoizedFn(async () => {
        if (clearLoading) return
        if (chats.length === 0) {
            yakitNotify("info", "暂无可清除的会话")
            return
        }

        setClearLoading(true)
        try {
            await grpcDeleteAISession({DeleteAll: true}, true)
            clearLocalChats(chats)
            onNewChat()
            setActiveChat?.(undefined)
            setChats?.([])
            setSearch("")
            yakitNotify("success", "已清空全部会话")
        } catch (e) {
            yakitNotify("error", "清除会话失败:" + e)
        } finally {
            setClearLoading(false)
        }
    })

    const handleClearChatByDays = useMemoizedFn(async (days: number) => {
        if (clearLoading) return

        const beforeTimestamp = Date.now() - days * DAY_MS
        const deletedChats = chats.filter((item) => getChatTimestamp(item) <= beforeTimestamp)

        if (deletedChats.length === 0) {
            yakitNotify("info", `暂无${days}天前的会话`)
            return
        }

        setClearLoading(true)
        try {
            await grpcDeleteAISession({Filter: {BeforeTimestamp: beforeTimestamp}}, true)

            clearLocalChats(deletedChats)

            const nextChats = chats.filter((item) => getChatTimestamp(item) > beforeTimestamp)
            const activeDeleted = !!activeChat && deletedChats.some((item) => item.SessionID === activeChat.SessionID)

            if (nextChats.length === 0) {
                onNewChat()
                setActiveChat?.(undefined)
                setSearch("")
            } else if (activeDeleted) {
                setActiveChat?.(nextChats[0])
            }

            setChats?.(nextChats)
            yakitNotify("success", `已清除${days}天前的会话`)
        } catch (e) {
            yakitNotify("error", "清除会话失败:" + e)
        } finally {
            setClearLoading(false)
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
                        <YakitDropdownMenu
                            menu={{
                                data: [
                                    {
                                        key: "1",
                                        label: renderClearConfirm(
                                            "一天前",
                                            "确定要清除一天前的会话吗？此操作不可恢复",
                                            () => handleClearChatByDays(1)
                                        )
                                    },
                                    {
                                        key: "7",
                                        label: renderClearConfirm(
                                            "一周前",
                                            "确定要清除一周前的会话吗？此操作不可恢复",
                                            () => handleClearChatByDays(7)
                                        )
                                    },
                                    {
                                        key: "30",
                                        label: renderClearConfirm(
                                            "30天前",
                                            "确定要清除30天前的会话吗？此操作不可恢复",
                                            () => handleClearChatByDays(30)
                                        )
                                    },
                                    {type: "divider"},
                                    {
                                        key: "all",
                                        label: renderClearConfirm(
                                            "清空全部",
                                            "确定要清除全部会话吗？此操作不可恢复",
                                            handleClearAllChat
                                        )
                                    }
                                ]
                            }}
                            dropdown={{
                                trigger: ["click"],
                                placement: "bottomRight",
                                disabled: clearLoading || chats.length === 0
                            }}
                        >
                            <Tooltip title='清除会话' placement='topRight'>
                                <YakitButton
                                    disabled={clearLoading || chats.length === 0}
                                    colors='danger'
                                    type='outline1'
                                    loading={clearLoading}
                                >
                                    删除
                                </YakitButton>
                            </Tooltip>
                        </YakitDropdownMenu>
                        <Tooltip title='新建会话' placement='topRight'>
                            <YakitButton icon={<OutlineMessageCirclePlusIcon />} onClick={() => onNewChat()} />
                        </Tooltip>
                        <SideSettingButton />
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
                <HistoryChatList search={searchDebounce} />
            </div>
        </div>
    )
})

export default HistoryChat
