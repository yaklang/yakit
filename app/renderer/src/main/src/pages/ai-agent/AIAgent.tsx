import React, {useEffect, useMemo, useRef, useState} from "react"
import {AIAgentProps, AIAgentSetting} from "./aiAgentType"
import {AIAgentSideList} from "./AIAgentSideList"
import AIAgentContext, {AIAgentContextDispatcher, AIAgentContextStore} from "./useContext/AIAgentContext"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteAIAgentGV} from "@/enums/aiAgent"
import useGetSetState from "../pluginHub/hooks/useGetSetState"
import {AIChatData, AIChatInfo} from "./type/aiChat"
import {
    useDebounceFn,
    useInViewport,
    useMemoizedFn,
    useRequest,
    useSize,
    useThrottleEffect,
    useUpdateEffect
} from "ahooks"
import {AIAgentSettingDefault, SwitchAIAgentTabEventEnum, YakitAIAgentPageID} from "./defaultConstant"
import cloneDeep from "lodash/cloneDeep"
import {AIAgentChat} from "./aiAgentChat/AIAgentChat"
import {loadRemoteHistory} from "./components/aiFileSystemList/store/useHistoryFolder"
import {initCustomFolderStore} from "./components/aiFileSystemList/store/useCustomFolder"
import {KnowledgeBaseContentProps} from "../KnowledgeBase/TKnowledgeBase"
import {useKnowledgeBase} from "../KnowledgeBase/hooks/useKnowledgeBase"
import {failed} from "@/utils/notification"
import {mergeKnowledgeBaseList} from "../KnowledgeBase/utils"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"

import emiter from "@/utils/eventBus/eventBus"
import classNames from "classnames"
import styles from "./AIAgent.module.scss"

/** 清空用户缓存的固定值 */
export const AIAgentCacheClearValue = "20260113"

const {ipcRenderer} = window.require("electron")

export const AIAgent: React.FC<AIAgentProps> = (props) => {
    // #region ai-agent页面全局缓存
    // ai-agent-chat 全局配置
    const [setting, setSetting, getSetting] = useGetSetState<AIAgentSetting>(cloneDeep(AIAgentSettingDefault))

    /** 历史会话对应的数据集合 */
    const chatDataRef = useRef<Map<string, AIChatData>>(new Map())
    const getChatData = useMemoizedFn((session: string) => {
        return chatDataRef.current.get(session)
    })
    const setChatData = useMemoizedFn((session: string, data: AIChatData) => {
        chatDataRef.current.set(session, data)
    })
    const removeChatData = useMemoizedFn((session: string) => {
        chatDataRef.current.delete(session)
    })
    const clearChatData = useMemoizedFn(() => {
        chatDataRef.current.clear()
    })

    // 历史对话
    const [chats, setChats, getChats] = useGetSetState<AIChatInfo[]>([])
    // 当前展示对话
    const [activeChat, setActiveChat] = useState<AIChatInfo>()

    const [show, setShow] = useState<boolean>(false)

    const sideHiddenModeRef = useRef<string>()

    const {initialize, knowledgeBases} = useKnowledgeBase()
    const welcomeRef = useRef<HTMLDivElement>(null)
    const [inViewPort = true] = useInViewport(welcomeRef)

    // #region 新版本删除缓存提示框
    const [delCacheVisible, setDelCacheVisible] = useState(false)
    const [delCacheLoading, setDelCacheLoading] = useState(false)
    const handleDelCache = useMemoizedFn(() => {
        setDelCacheLoading(true)
        // 清空无效的用户缓存数据-全局配置数据
        setRemoteValue(RemoteAIAgentGV.AIAgentChatSetting, "")
        // 清空无效的用户缓存数据-taskChat历史对话数据
        setRemoteValue(RemoteAIAgentGV.AIAgentChatHistory, "")
        // 设置清空标志位
        setRemoteValue(RemoteAIAgentGV.AIAgentCacheClear, AIAgentCacheClearValue)
        setDelCacheVisible(false)
        setTimeout(() => {
            setDelCacheLoading(false)
        }, 300)
    })
    // #endregion

    // 缓存全局配置数据
    useUpdateEffect(() => {
        setRemoteValue(RemoteAIAgentGV.AIAgentChatSetting, JSON.stringify(getSetting()))
    }, [setting])
    // 缓存历史对话数据
    useUpdateEffect(() => {
        setRemoteValue(RemoteAIAgentGV.AIAgentChatHistory, JSON.stringify(getChats()))
    }, [chats])

    const store: AIAgentContextStore = useMemo(() => {
        return {
            setting: setting,
            chats: chats,
            activeChat: activeChat
        }
    }, [setting, chats, activeChat])
    const dispatcher: AIAgentContextDispatcher = useMemo(() => {
        return {
            getSetting: getSetting,
            setSetting: setSetting,
            setChats: setChats,
            getChats: getChats,
            setActiveChat: setActiveChat,
            getChatData,
            setChatData,
            removeChatData,
            clearChatData
        }
    }, [])

    /**
     * 读取缓存并设置数据
     * 读取全局配置setting和历史会话chats
     */
    const initToCacheData = useMemoizedFn(async () => {
        try {
            const res = await getRemoteValue(RemoteAIAgentGV.AIAgentCacheClear)
            if (!res) return

            if (res >= AIAgentCacheClearValue) {
                // 获取缓存的历史对话数据
                getRemoteValue(RemoteAIAgentGV.AIAgentChatHistory)
                    .then((res) => {
                        if (!res) return
                        try {
                            const cache = JSON.parse(res) as AIChatInfo[]
                            if (!Array.isArray(cache) || cache.length === 0) return
                            setChats(cache)
                        } catch (error) {}
                    })
                    .catch(() => {})
                // 获取缓存的全局配置数据
                getRemoteValue(RemoteAIAgentGV.AIAgentChatSetting)
                    .then((res) => {
                        if (!res) return
                        try {
                            const cache = JSON.parse(res) as AIAgentSetting
                            if (typeof cache !== "object") return
                            setSetting(cache)
                        } catch (error) {}
                    })
                    .catch(() => {})
            } else {
                setDelCacheVisible(true)
            }
        } catch (error) {}
    })

    useEffect(() => {
        initToCacheData().catch(() => {})

        // 加载历史文件数据
        const bootstrap = async () => {
            await loadRemoteHistory()
            await initCustomFolderStore()
        }
        bootstrap().catch(() => {})

        return () => {}
    }, [])
    // #endregion

    const wrapperSize = useSize(document.getElementById(YakitAIAgentPageID))
    const [isMini, setIsMini] = useState(false)
    useThrottleEffect(
        () => {
            const width = wrapperSize?.width || 0
            if (!!width) {
                setIsMini(width <= 1300)
            }
        },
        [wrapperSize],
        {wait: 100, trailing: false}
    )
    useEffect(() => {
        initSideHiddenMode()
        emiter.on("switchSideHiddenMode", switchSideHiddenMode)
        return () => {
            emiter.off("switchSideHiddenMode", switchSideHiddenMode)
        }
    }, [])
    const switchSideHiddenMode = useMemoizedFn((data) => {
        sideHiddenModeRef.current = data
    })
    const initSideHiddenMode = useMemoizedFn(() => {
        getRemoteValue(RemoteAIAgentGV.AIAgentSideShowMode)
            .then((data) => {
                sideHiddenModeRef.current = data
            })
            .catch(() => {})
    })

    const onSendSwitchAIAgentTab = useDebounceFn(
        useMemoizedFn(() => {
            if (!show) return
            if (sideHiddenModeRef.current !== "false") {
                emiter.emit(
                    "switchAIAgentTab",
                    JSON.stringify({
                        type: SwitchAIAgentTabEventEnum.SET_TAB_SHOW,
                        params: {
                            show: false
                        }
                    })
                )
            }
        }),
        {wait: 200, leading: true}
    ).run

    // 获取数据库 列表数据
    const {run} = useRequest(
        async (Keyword?: string) => {
            const result: KnowledgeBaseContentProps = await ipcRenderer.invoke("GetKnowledgeBase", {
                Keyword,
                Pagination: {Limit: 9999, Page: 1, OrderBy: "updated_at", Sort: "desc"}
            })
            const {KnowledgeBases} = result
            return KnowledgeBases
        },
        {
            onError: (error) => {
                failed("获取知识库列表失败:" + error)
            },
            onSuccess: (value) => {
                if (value) {
                    const initKnowledgeBase = mergeKnowledgeBaseList(value, knowledgeBases)
                    initialize(initKnowledgeBase)
                }
            }
        }
    )

    useEffect(() => {
        if (inViewPort) {
            run()
        }
    }, [inViewPort])

    return (
        <AIAgentContext.Provider value={{store, dispatcher}}>
            <div id={YakitAIAgentPageID} className={styles["ai-agent"]} ref={welcomeRef}>
                <div className={classNames(styles["ai-side-list"], {[styles["ai-side-list-mini"]]: isMini})}>
                    <AIAgentSideList show={show} setShow={setShow} />
                </div>

                <div
                    className={classNames(styles["ai-agent-chat"], {[styles["ai-agent-chat-mini"]]: isMini})}
                    onClick={onSendSwitchAIAgentTab}
                >
                    <AIAgentChat />
                </div>

                <YakitHint
                    getContainer={welcomeRef.current || undefined}
                    visible={delCacheVisible}
                    title='提示'
                    content='Memfit会话数据升级，会删除系统内的所有历史会话记录'
                    cancelButtonProps={{style: {display: "none"}}}
                    okButtonProps={{loading: delCacheLoading}}
                    onOk={handleDelCache}
                ></YakitHint>
            </div>
        </AIAgentContext.Provider>
    )
}
