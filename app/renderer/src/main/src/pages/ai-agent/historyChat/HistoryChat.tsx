import React, {memo, useState} from "react"
import {HistoryChatProps} from "./type"
import useAIAgentStore from "../useContext/useStore"
import useAIAgentDispatcher from "../useContext/useDispatcher"
import {useDebounce, useMemoizedFn} from "ahooks"
import {yakitNotify} from "@/utils/notification"
import {ReActChatEventEnum} from "../defaultConstant"
import {OutlineMessageCirclePlusIcon, OutlineSearchIcon} from "@/assets/icon/outline"
import {Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitRoundCornerTag} from "@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import styles from "./HistoryChat.module.scss"
import {AIAgentTriggerEventInfo} from "../aiAgentType"
import emiter from "@/utils/eventBus/eventBus"
import {grpcDeleteAISession} from "../grpc"
import {aiChatDataStore} from "../store/ChatDataStore"
import {SideSettingButton} from "../aiChatWelcome/AIChatWelcome"
import HistoryChatList from "./HistoryChatList/HistoryChatList"

/** 向对话框组件进行事件触发的通信 */
export const onNewChat = () => {
    const info: AIAgentTriggerEventInfo = {type: ReActChatEventEnum.NEW_CHAT}
    emiter.emit("onReActChatEvent", JSON.stringify(info))
}
const HistoryChat: React.FC<HistoryChatProps> = memo((props) => {
    const {chats} = useAIAgentStore()
    const {setChats, setActiveChat} = useAIAgentDispatcher()

    const [search, setSearch] = useState("")
    const searchDebounce = useDebounce(search, {wait: 500})

    const [clearLoading, setClearLoading] = useState(false)
    const handleClearAllChat = useMemoizedFn(async () => {
        if (clearLoading) return
        setClearLoading(true)
        try {
            onNewChat()
            await grpcDeleteAISession({DeleteAll: true}, true)
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
