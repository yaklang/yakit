import React, {memo, useMemo, useRef, useState} from "react"
import {HistoryChatProps} from "./aiAgentType"
import useStore from "./useContext/useStore"
import useDispatcher from "./useContext/useDispatcher"
import {useMemoizedFn} from "ahooks"
import {yakitNotify} from "@/utils/notification"
import {AIChatInfo} from "./type/aiChat"
import {EditChatNameModal} from "./UtilModals"
import {YakitAIAgentPageID} from "./defaultConstant"
import {SolidChatalt2Icon} from "@/assets/icon/solid"
import {OutlinePencilaltIcon, OutlinePlussmIcon, OutlineSearchIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitRoundCornerTag} from "@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"

import classNames from "classnames"
import styles from "./AIAgent.module.scss"

export const HistoryChat: React.FC<HistoryChatProps> = memo((props) => {
    const {onNewChat} = props

    const {chats, activeChat} = useStore()
    const {setChats, setActiveChat} = useDispatcher()
    const activeID = useMemo(() => {
        return activeChat?.id || ""
    }, [activeChat])

    const [searchShow, setSearchShow] = useState(false)
    const [search, setSearch] = useState("")

    const showHistory = useMemo(() => {
        if (!search) return chats
        return chats.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
    }, [chats, search])

    const handleSetActiveChat = useMemoizedFn((info: AIChatInfo) => {
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
    const handleDeleteChat = useMemoizedFn((info: AIChatInfo) => {
        const {id} = info
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
        setTimeout(() => {
            setDelLoading((old) => old.filter((el) => el !== id))
        }, 200)
    })

    return (
        <div className={styles["history-chat"]}>
            <div className={styles["header"]}>
                <div className={styles["header-title"]}>
                    历史会话
                    <YakitRoundCornerTag>{chats.length}</YakitRoundCornerTag>
                </div>

                <div className={styles["header-extra"]}>
                    <YakitPopover
                        trigger='click'
                        overlayStyle={{paddingTop: 2}}
                        placement='bottom'
                        content={
                            <YakitInput.Search allowClear={true} placeholder='请输入关键词' onSearch={setSearch} />
                        }
                        visible={searchShow}
                        onVisibleChange={setSearchShow}
                    >
                        <YakitButton type='text2' icon={<OutlineSearchIcon />} />
                    </YakitPopover>

                    <YakitButton icon={<OutlinePlussmIcon />} onClick={onNewChat} />
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
