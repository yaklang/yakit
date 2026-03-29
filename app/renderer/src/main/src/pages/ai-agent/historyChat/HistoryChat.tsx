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
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

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
    const {t} = useI18nNamespaces(["aiAgent"])
    const {chats, activeChat} = useAIAgentStore()
    const {setChats, setActiveChat} = useAIAgentDispatcher()

    const [search, setSearch] = useState("")
    const searchDebounce = useDebounce(search, {wait: 500})

    const [clearLoading, setClearLoading] = useState(false)
    const handleClearAllChat = useMemoizedFn(async () => {
        if (clearLoading) return
        if (chats.length === 0) {
            yakitNotify("info", t("HistoryChat.noChatsToClear"))
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
            yakitNotify("success", t("HistoryChat.allChatsCleared"))
        } catch (e) {
            yakitNotify("error", t("HistoryChat.clearFailed", {error: String(e)}))
        } finally {
            setClearLoading(false)
        }
    })

    const handleClearChatByDays = useMemoizedFn(async (days: number) => {
        if (clearLoading) return

        const beforeTimestamp = Date.now() - days * DAY_MS
        const deletedChats = chats.filter((item) => getChatTimestamp(item) <= beforeTimestamp)

        if (deletedChats.length === 0) {
            yakitNotify("info", t("HistoryChat.noChatsBeforeDays", {days}))
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
            yakitNotify("success", t("HistoryChat.clearedBeforeDays", {days}))
        } catch (e) {
            yakitNotify("error", t("HistoryChat.clearFailed", {error: String(e)}))
        } finally {
            setClearLoading(false)
        }
    })

    return (
        <div className={styles["history-chat"]}>
            <div className={styles["header-wrapper"]}>
                <div className={styles["haeder-first"]}>
                    <div className={styles["first-title"]}>
                        {t("HistoryChat.title")}
                        <YakitRoundCornerTag>{chats.length}</YakitRoundCornerTag>
                    </div>
                    <div className={styles["header-actions"]}>
                        <YakitDropdownMenu
                            menu={{
                                data: [
                                    {
                                        key: "1",
                                        label: renderClearConfirm(
                                            t("HistoryChat.oneDay"),
                                            t("HistoryChat.clearConfirm", {days: t("HistoryChat.oneDay")}),
                                            () => handleClearChatByDays(1)
                                        )
                                    },
                                    {
                                        key: "7",
                                        label: renderClearConfirm(
                                            t("HistoryChat.oneWeek"),
                                            t("HistoryChat.clearConfirm", {days: t("HistoryChat.oneWeek")}),
                                            () => handleClearChatByDays(7)
                                        )
                                    },
                                    {
                                        key: "30",
                                        label: renderClearConfirm(
                                            t("HistoryChat.thirtyDays"),
                                            t("HistoryChat.clearConfirm", {days: t("HistoryChat.thirtyDays")}),
                                            () => handleClearChatByDays(30)
                                        )
                                    },
                                    {type: "divider"},
                                    {
                                        key: "all",
                                        label: renderClearConfirm(
                                            t("HistoryChat.clearAll"),
                                            t("HistoryChat.clearAllConfirm"),
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
                            <Tooltip title={t("HistoryChat.clearChats")} placement='topRight'>
                                <YakitButton
                                    disabled={clearLoading || chats.length === 0}
                                    colors='danger'
                                    type='outline1'
                                    loading={clearLoading}
                                >
                                    {t("HistoryChat.delete")}
                                </YakitButton>
                            </Tooltip>
                        </YakitDropdownMenu>
                        <Tooltip title={t("HistoryChat.newChat")} placement='topRight'>
                            <YakitButton icon={<OutlineMessageCirclePlusIcon />} onClick={() => onNewChat()} />
                        </Tooltip>
                        <SideSettingButton />
                    </div>
                </div>

                <div className={styles["header-second"]}>
                    <YakitInput
                        prefix={<OutlineSearchIcon className={styles["search-icon"]} />}
                        placeholder={t("HistoryChat.searchPlaceholder")}
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
