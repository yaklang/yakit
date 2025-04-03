import React, {memo, useMemo, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {ServerChatInfo, ServerChatProps} from "./aiAgentType"
import {formatTime} from "./utils"
import {OutlineClockIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {AIAgentTask, EditChatNameModal} from "./UtilModals"
import {yakitNotify} from "@/utils/notification"
import cloneDeep from "lodash/cloneDeep"
import {Input, Tooltip} from "antd"
import {SolidChatalt2Icon, SolidPaperairplaneIcon} from "@/assets/icon/solid"
import useChatData from "./useChatData"
import useStore from "./useContext/useStore"
import useDispatcher from "./useContext/useDispatcher"

import classNames from "classnames"
import styles from "./AIAgent.module.scss"

export const ServerChat: React.FC<ServerChatProps> = memo((props) => {
    const {getContainer} = props

    const [chats, setChats] = useState<ServerChatInfo[]>([
        {id: "1", name: "测试1", time: Date.now()},
        {id: "2", name: "测试2", time: Date.now()},
        {id: "3", name: "测试3", time: Date.now()}
    ])
    const [activeChat, setActiveChat] = useState<string>("1")

    // #region 历史对话框相关功能
    const [showHistory, setShowHistory] = useState(false)
    const handleChangeShowHistory = useMemoizedFn(() => {
        setShowHistory((old) => !old)
    })

    const editInfo = useRef<ServerChatInfo>()
    const [editShow, setEditShow] = useState(false)
    // 没有编辑名称，如果需求完成还没有调整，直接删除编辑名称功能的相关代码
    const handleOpenEditName = useMemoizedFn((info: ServerChatInfo) => {
        if (editShow) return
        editInfo.current = info
        setEditShow(true)
    })
    const handleCallbackEditName = useMemoizedFn((result: boolean, info?: ServerChatInfo) => {
        if (result && info) {
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
    const handleDeleteChat = useMemoizedFn((id: string) => {
        const isLoading = delLoading.includes(id)
        if (isLoading) return
        const findIndex = chats.findIndex((item) => item.id === id)
        if (findIndex === -1) {
            yakitNotify("error", "未找到对应的对话")
            return
        }
        setDelLoading((old) => [...old, id])
        let active = findIndex === chats.length - 1 ? chats[findIndex - 1].id : chats[findIndex + 1].id
        setChats((old) => {
            old.splice(findIndex, 1)
            return [...old]
        })
        if (activeChat !== id) active = ""
        active && setActiveChat(active)
        setTimeout(() => {
            setDelLoading((old) => old.filter((el) => el !== id))
        }, 200)
    })
    // #endregion

    const [strs, events] = useChatData()

    const [loading, setLoading] = useState(false)
    const [question, setQuestion] = useState("")
    const isQuestion = useMemo(() => {
        return question && question.trim()
    }, [question])
    const [isExec, setIsExec] = useState(false)

    /** 自定义问题提问 */
    const onBtnSubmit = useMemoizedFn(() => {
        if (loading || !isQuestion) return
        events.onStart("123", {
            IsStart: true,
            Params: {
                UserQuery: "找出文件夹 /Users/nonight/yakit-projects 下最大的文件是谁",
                EnableSystemFileSystemOperator: true,
                UseDefaultAIConfig: true
            }
        })
    })

    return (
        <div className={styles["server-chat"]}>
            <div className={styles["server-chat-header"]}>
                <div className={styles["header-title"]}>AI-Agent</div>
                <div className={styles["header-extra"]}>
                    {/* <YakitButton icon={<OutlinePlusIcon />}>新会话</YakitButton> */}
                    <YakitButton
                        type='text2'
                        icon={<OutlineClockIcon />}
                        title='历史对话'
                        onClick={handleChangeShowHistory}
                    />
                </div>
            </div>

            <div className={styles["server-chat-body"]}>
                <div className={styles["chat-wrapper"]}>
                    <div className={styles["chat-answer"]}>
                        {/* <AIAgentEmpty /> */}
                        <AIAgentTask strs={[]} />
                    </div>

                    <div className={styles["chat-question"]}>
                        <div className={styles["question-box"]}>
                            <Input.TextArea
                                className={styles["question-textArea"]}
                                bordered={false}
                                placeholder='请下发任务, AI-Agent将执行(shift + enter 换行)'
                                value={question}
                                autoSize={true}
                                onChange={(e) => setQuestion(e.target.value)}
                                onKeyDown={(e) => {
                                    const keyCode = e.keyCode ? e.keyCode : e.key
                                    const shiftKey = e.shiftKey
                                    if (keyCode === 13 && shiftKey) {
                                        e.stopPropagation()
                                        e.preventDefault()
                                        setQuestion(`${question}\n`)
                                    }
                                    if (keyCode === 13 && !shiftKey) {
                                        e.stopPropagation()
                                        e.preventDefault()
                                        onBtnSubmit()
                                    }
                                }}
                            />

                            <div className={styles["question-footer"]}>
                                <div
                                    className={classNames(styles["single-btn"], {
                                        [styles["single-btn-active"]]: isExec
                                    })}
                                    onClick={() => setIsExec((old) => !old)}
                                >
                                    直接执行,不询问
                                </div>
                                <div className={styles["footer-divider"]}></div>
                                <YakitButton
                                    disabled={!isQuestion}
                                    icon={<SolidPaperairplaneIcon />}
                                    onClick={onBtnSubmit}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className={classNames(styles["history-wrapper"], {[styles["history-hidden"]]: !showHistory})}>
                    {chats.map((item) => {
                        const {id, name, time} = item
                        const delStatus = delLoading.includes(id)
                        return (
                            <div
                                key={id}
                                className={classNames(styles["history-item"], {
                                    [styles["history-item-active"]]: activeChat === id
                                })}
                                onClick={() => setActiveChat(id)}
                            >
                                <div className={styles["item-info"]}>
                                    <div className={styles["item-icon"]}>
                                        <SolidChatalt2Icon />
                                    </div>
                                    <div className={styles["info-wrapper"]}>
                                        <div
                                            className={classNames(
                                                styles["info-title"],
                                                "yakit-content-single-ellipsis"
                                            )}
                                            title={name}
                                        >
                                            {name}
                                        </div>
                                        <div className={styles["info-time"]}>{formatTime(time)}</div>
                                    </div>
                                </div>

                                <div className={styles["item-extra"]}>
                                    {/* <Tooltip
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
                                    </Tooltip> */}
                                    <Tooltip
                                        title={"删除任务"}
                                        placement='topRight'
                                        overlayClassName={styles["history-item-extra-tooltip"]}
                                    >
                                        <YakitButton
                                            loading={delStatus}
                                            type='text2'
                                            icon={<OutlineTrashIcon />}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleDeleteChat(id)
                                            }}
                                        />
                                    </Tooltip>
                                </div>
                            </div>
                        )
                    })}
                    {editInfo.current && (
                        <EditChatNameModal
                            getContainer={getContainer}
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
