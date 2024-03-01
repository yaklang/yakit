import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {
    useCreation,
    useDebounceEffect,
    useGetState,
    useInViewport,
    useMemoizedFn,
    useScroll,
    useSize,
    useUpdateEffect,
    useVirtualList
} from "ahooks"
import {Resizable} from "re-resizable"
import {
    ChatAltIcon,
    PaperPlaneRightIcon,
    YakChatBookIcon,
    YakChatLogIcon,
    YakitChatCSIcon,
    OutlineOpenIcon,
    OutlineViewGridIcon,
    OutlineWebFuzzerIcon,
    OutlineYakRunnerIcon,
    UIKitOutlineBugIcon,
    OutlineChartPieIcon,
    OutlineSparklesIcon,
    UIKitOutlineBugActiveIcon,
    OutlineViewGridActiveIcon,
    OutlineYakRunnerActiveIcon,
    OutlineWebFuzzerActiveIcon,
    OutlineChartPieActiveIcon,
    OutlineSparklesActiveIcon,
    SolidExclamationIcon
} from "./icon"
import {
    ArrowDownIcon,
    ArrowNarrowRightIcon,
    ArrowsExpandIcon,
    ArrowsRetractIcon,
    ClipboardListIcon,
    ClockIcon,
    CogIcon,
    PencilAltIcon,
    PlusIcon,
    QuestionMarkCircleIcon,
    RemoveIcon,
    SolidThumbDownIcon,
    StopIcon,
    ThumbDownIcon,
    ThumbUpIcon,
    TrashIcon
} from "@/assets/newIcon"
import {Divider, Drawer, Input, Progress, Tooltip} from "antd"
import {
    CacheChatCSProps,
    ChatCSAnswerProps,
    ChatCSMultipleInfoProps,
    ChatCSSingleInfoProps,
    ChatInfoProps,
    ChatMeInfoProps,
    ChatPluginListProps
} from "./chatCSType"
import {yakitNotify} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitPopover} from "../yakitUI/YakitPopover/YakitPopover"
import {YakitHint} from "../yakitUI/YakitHint/YakitHint"
import {ArrowRightSvgIcon} from "../layout/icons"
import {YakitModal} from "../yakitUI/YakitModal/YakitModal"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {chatCS, chatCSPlugin, chatGrade, getPromptList} from "@/services/yakChat"
import {CopyComponents, YakitTag} from "../yakitUI/YakitTag/YakitTag"
import {ChatMarkdown} from "./ChatMarkdown"
import {useStore} from "@/store"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {OutlineInformationcircleIcon, OutlinePaperairplaneIcon, OutlineXIcon} from "@/assets/icon/outline"
import {
    SolidCheckCircleIcon,
    SolidPlayIcon,
    SolidShieldexclamationIcon,
    SolidThumbupIcon,
    SolidXcircleIcon
} from "@/assets/icon/solid"
import moment from "moment"
import classNames from "classnames"
import styles from "./chatCS.module.scss"
import {YakitDrawer} from "../yakitUI/YakitDrawer/YakitDrawer"
import {SolidPaperairplaneIcon} from "@/assets/icon/solid"
import {
    SolidCloudpluginIcon,
    SolidPrivatepluginIcon,
    SolidYakitPluginGrayIcon,
    SolidYakitPluginIcon
} from "@/assets/icon/colors"
import {YakitCheckbox} from "../yakitUI/YakitCheckbox/YakitCheckbox"
import {
    HybridScanRequest,
    apiCancelHybridScan,
    apiHybridScan,
    apiStopHybridScan,
    convertHybridScanParams
} from "@/pages/plugins/utils"
import {HybridScanControlAfterRequest} from "@/models/HybridScan"
import useHoldBatchGRPCStream from "@/hook/useHoldBatchGRPCStream/useHoldBatchGRPCStream"
import {
    PluginBatchExecuteExtraFormValue,
    PluginBatchExecutorTaskProps,
    defPluginExecuteTaskValue
} from "@/pages/plugins/pluginBatchExecutor/pluginBatchExecutor"
import {cloneDeep} from "bizcharts/lib/utils"
import {defPluginExecuteFormValue} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {PluginSearchParams} from "@/pages/plugins/baseTemplateType"
import {HoldGRPCStreamInfo, StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {YakitRoute} from "@/routes/newRoute"
import {addToTab} from "@/pages/MainTabs"
import {QueryYakScriptsResponse, YakScript} from "@/pages/invoker/schema"
import {YakParamProps} from "@/pages/plugins/pluginsType"
import {PluginDetailsListItem} from "@/pages/plugins/baseTemplate"
import {SettingOutlined} from "@ant-design/icons"
import {YakitInputNumber} from "../yakitUI/YakitInputNumber/YakitInputNumber"
const {ipcRenderer} = window.require("electron")

/** 将 new Date 转换为日期 */
const formatDate = (i: number) => {
    return moment(i).format("YYYY-MM-DD HH:mm:ss")
}

export interface YakChatCSProps {
    visible: boolean
    setVisible: (v: boolean) => any
}

export interface ScriptsProps {
    script_name: string
    Fields: YakParamProps[]
}

export interface LoadObjProps {
    result: string
    id: string
}

export const YakChatCS: React.FC<YakChatCSProps> = (props) => {
    const {visible, setVisible} = props

    const {userInfo} = useStore()
    const showName = useMemo(() => {
        if (userInfo.platform === "github") return userInfo.githubName
        if (userInfo.platform === "wechat") return userInfo.wechatName
        if (userInfo.platform === "company") return userInfo.companyName
        return "游客"
    }, [userInfo])

    /** 获取缓存中的对话内容 */
    useEffect(() => {
        if (!userInfo.isLogin) return
        getRemoteValue(RemoteGV.ChatCSStorage).then((value: string) => {
            if (!value) return
            try {
                const data: {lists: CacheChatCSProps[]; user_id: number} = JSON.parse(value)
                if (!Array.isArray(data.lists)) return
                if (data.user_id !== userInfo.user_id) {
                    setStorage([])
                    return
                }
                // 不兼容之前版本 - 筛选掉之前缓存的对话内容(依据:之前版本存在baseType必选项)
                // @ts-ignore
                data.lists = data.lists.filter((item) => !item.baseType)

                setHistroy([...data.lists])
                if (data.lists.length > 0) setActive(data.lists[0].token)
            } catch (error) {}
        })
    }, [userInfo])
    useEffect(() => {
        if (visible) scrollToBottom()
    }, [visible])
    /** 缓存对话内容 */
    const setStorage = useMemoizedFn((data: CacheChatCSProps[]) => {
        let cache: string = ""
        if (data.length > 0) cache = JSON.stringify({lists: data, user_id: userInfo.user_id || 0})
        setRemoteValue(RemoteGV.ChatCSStorage, cache)
    })

    const [width, setWidth] = useState<number>(481)
    const divRef = useRef<any>()
    const modalWidth = useMemo(() => {
        if (!+width) return 448
        return +width - 40 > 448 ? 448 : +width - 40
    }, [width])

    const [expand,setExpand] = useState<boolean>(true)
    useEffect(()=>{
        if(Math.abs(window.innerWidth*0.95 - width)<=1){
            setExpand(false)
        }
        if(width<=481){
            setExpand(true)
        }
    },[width])

    const [history, setHistroy] = useState<CacheChatCSProps[]>([])
    const [active, setActive] = useState<string>("")
    const [isShowPrompt, setShowPrompt] = useState<boolean>(false)
    /** 当前对话内容列表 */
    const currentChat = useMemo(() => {
        const filterIndex = history.findIndex((item) => item.token === active)
        if (filterIndex === -1) return []
        else return history[filterIndex].history
    }, [history, active])

    const [addShow, setAddShow] = useState<boolean>(false)
    const onAddChat = useMemoizedFn(() => {
        if (loading) return

        const data = [...history]
        if (data.length >= 5) {
            setAddShow(true)
            return
        }

        const lists: CacheChatCSProps = {
            token: randomString(10),
            name: `临时对话窗-${randomString(4)}`,
            is_bing: isBing,
            is_plugin: isPlugin,
            history: [],
            time: formatDate(+new Date())
        }
        data.push(lists)
        setHistroy([...data])
        setStorage([...data])
        setActive(lists.token)
    })
    const [delLoading, setDelLoading] = useState<boolean>(false)
    /** 删除旧的，创建新的 */
    const delToAdd = useMemoizedFn(() => {
        setDelLoading(true)

        let willDel: CacheChatCSProps | undefined = undefined
        let time: string = ""
        for (let item of history) {
            if (!time) {
                willDel = {...item}
                time = item.time
            } else {
                if (item.time < time) willDel = {...item}
            }
        }

        if (!!willDel) {
            onDel(willDel, () => onAddChat())
        }

        setTimeout(() => {
            setDelLoading(false)
            setAddShow(false)
        }, 300)
    })

    // 搜索引擎增强
    const [isBing, setBing] = useState<boolean>(false)
    // 插件调试执行
    const [isPlugin, setPlugin] = useState<boolean>(false)
    const [question, setQuestion] = useState<string>("")

    const [loading, setLoading] = useState<boolean>(false)
    const [loadingToken, setLoadingToken] = useState<string>("")

    const [resTime, setResTime, getResTime] = useGetState<string>("")
    const resTimeRef = useRef<any>(null)

    const [popoverVisible, setPopoverVisible] = useState<boolean>(false)
    const [maxNumber, setMaxNumber] = useState<number>(5)
    const PlginRunMaxNumber = "PlginRunMaxNumber"

    /** 流输出模式 */
    const controller = useRef<AbortController | null>(null)
    /** 是否人为中断连接(流输出模式) */
    const isBreak = useRef<boolean>(false)
    /** 一次性输出模式 */
    // const controller = useRef<AbortController[]>([])

    const contentRef = useRef<HTMLDivElement>(null)
    const scroll = useScroll(contentRef)
    const contentSize = useSize(contentRef)
    /** 是否显示移动到最下面的功能 */
    const isBottom = useMemo(() => {
        if (!contentSize?.height) return false

        const height = contentSize?.height || 0
        const scrollHeight = contentRef.current?.scrollHeight || 0
        const diff = scrollHeight - height
        const top = scroll?.top || 0

        if (diff > 10 && diff - 3 > top) return true
        else return false
    }, [contentRef, contentSize, scroll])
    const scrollToBottom = useMemoizedFn(() => {
        if (contentRef.current) {
            const scrollHeight = contentRef.current?.scrollHeight || 0
            const top = scroll?.top || 0
            if (scrollHeight - top < 5) return
            ;(contentRef.current as HTMLDivElement).scrollTop = (contentRef.current as HTMLDivElement).scrollHeight
        }
    })
    // 回答结束后，页面展示回答内容的头部
    const scrollToCurrent = useMemoizedFn(() => {
        try {
            if (!contentRef.current) return
            if (!contentSize?.height) return
            const div = contentRef.current
            const height = contentSize.height
            const scrollTop = scroll?.top || 0

            if (div.scrollHeight > height) {
                if (scrollTop === 0) div.scrollTop = 50
                else div.scrollTop = scrollTop + 150
            }
        } catch (error) {}
    })

    useEffect(() => {
        // 读取最大执行数量
        getRemoteValue(PlginRunMaxNumber).then((value: string) => {
            if (!value) return
            try {
                const data: {maxNumber: number} = JSON.parse(value)
                setMaxNumber(data.maxNumber)
            } catch (error) {}
        })
    }, [])

    useDebounceEffect(
        () => {
            // 缓存最大执行数量
            setRemoteValue(PlginRunMaxNumber, JSON.stringify({maxNumber}))
        },
        [maxNumber],
        {wait: 500}
    )

    /** 自定义问题提问 */
    const onBtnSubmit = useMemoizedFn(() => {
        if (loading) return
        if (!question || question.trim() === "") return

        const data: ChatInfoProps = {
            token: randomString(10),
            isMe: true,
            time: formatDate(+new Date()),
            info: {
                content: question,
                is_bing: isBing,
                is_plugin: isPlugin
            }
        }
        onSubmit(data)
    })

    /** Prompt提问 */
    const onPromptSubmit = useMemoizedFn((v: PresetKeywordProps) => {
        if (loading) return
        const {content, is_bing, is_plugin} = v
        if (!content || content.trim() === "") return

        const data: ChatInfoProps = {
            token: randomString(10),
            isMe: true,
            time: formatDate(+new Date()),
            info: {
                content,
                is_bing,
                is_plugin
            }
        }
        onSubmit(data)
    })

    /** 获取历史会话记录 */
    const fetchHistory = useMemoizedFn((list: ChatInfoProps[]) => {
        const chatHistory: {role: string; content: string}[] = []
        const arr = list.map((item) => item).reverse()

        // 新对话，暂无对话历史记录
        if (arr.length === 1) return chatHistory
        // 用户问题未选择cs或vuln，不获取历史记录
        // if (!(arr[0].info as ChatMeInfoProps)?.baseType) return chatHistory
        // 历史记录不包含用户刚问的问题
        arr.shift()

        let stag: string = ""
        for (let item of arr) {
            if (chatHistory.length === 4) break

            if (item.isMe) {
                const info = item.info as ChatMeInfoProps

                // 用户历史操作的问题
                // if (!info.baseType) {
                //     stag = ""
                //     continue
                // } else {
                chatHistory.push({
                    role: "assistant",
                    content: ["暂无可用解答", "该类型请求异常，请稍后重试"].includes(stag)
                        ? "回答中断"
                        : stag || "回答中断"
                })
                chatHistory.push({role: "user", content: info.content})
                // }
            } else {
                const info = item.info as ChatCSMultipleInfoProps
                for (let el of info.content) {
                    // if (el.type === "bing") {
                    stag = el.content
                    break
                    // }
                }
            }
        }
        return chatHistory
    })
    /** 解析后端流内的内容数据 */
    const analysisFlowData: (flow: string) => ChatCSAnswerProps | undefined = useMemoizedFn((flow) => {
        const objects: ChatCSAnswerProps[] = []
        let answer: ChatCSAnswerProps | undefined = undefined
        let loadObj:any = undefined
        // 获取加载中的字符
        flow.split("state:")
        .filter((item) => item.length !== 0)
        .forEach((itemIn,indexIn) => {
            try {
                if(indexIn===0){
                    loadObj = JSON.parse(itemIn) as LoadObjProps
                }
            } catch (error) {}
        })
        if(loadObj){
            answer = {id:loadObj.id,role:"",result:"",loadResult:loadObj.result}
        }
        flow.split("data:")
            .filter((item) => item.length !== 0)
            .forEach((itemIn) => {
                try {
                    objects.push(JSON.parse(itemIn))
                } catch (error) {}
            })
        let resultAll: string = ""
        objects.map((item, index) => {
            const {id = "", role = "", result = ""} = item
            resultAll += result
            if (objects.length === index + 1) {
                answer = {id, role, result: resultAll}
            }
        })
        return answer
        // if (!flow) return undefined
        // const lastIndex = flow.lastIndexOf("data:")
        // if (lastIndex === -1) return undefined
        // console.log("flow---",flow);

        // let chunk = flow
        // chunk = chunk.substring(lastIndex)
        // if (chunk && chunk.startsWith("data:")) chunk = chunk.slice(5)

        // let answer: ChatCSAnswerProps | undefined = undefined
        // try {
        //     answer = JSON.parse(chunk)
        // } catch (error) {}

        // if (!answer) return analysisFlowData(flow.substring(0, lastIndex))
        // console.log("answer---",answer);

        // return answer
    })
    const setContentPluginList = useMemoizedFn(
        (info: ChatCSSingleInfoProps, contents: ChatCSMultipleInfoProps, group: CacheChatCSProps[]) => {
            /** 插件调试执行由于接口不是流式，只存在一项 */
            contents.content = [info]
            setHistroy([...group])
            setStorage([...group])
            /** 流式输出逻辑 */
            scrollToBottom()
        }
    )
    /** 生成 Promise plugin 实例 */
    const generatePluginPromise = useMemoizedFn(
        async (
            params: {
                prompt: string
                is_bing: boolean
                is_plugin: boolean
                scripts: ScriptsProps[]
                history: {role: string; content: string}[]
                signal: AbortSignal
            },
            contents: ChatCSMultipleInfoProps,
            group: CacheChatCSProps[],
            yakData: YakScript[]
        ) => {
            const cs: ChatCSSingleInfoProps = {
                is_bing: params.is_bing,
                is_plugin: params.is_plugin,
                content: "",
                id: ""
            }
            return await new Promise((resolve, reject) => {
                chatCSPlugin({
                    ...params,
                    token: userInfo.token,
                    plugin_scope: maxNumber
                })
                    .then((res) => {
                        const {data} = res
                        const {result, id}: {result: {scripts: string[]; input: string}; id: string} = data
                        const {scripts = [], input = ""} = result

                        if (!cs.id) cs.id = id
                        let mathYakData = yakData.filter((item) => scripts.includes(item.ScriptName))
                        cs.content = JSON.stringify({
                            input,
                            data: mathYakData
                        })
                        setContentPluginList(cs, contents, group)
                    })
                    .finally(() => {
                        resolve(`plugin|success`)
                    })
                    .catch((e) => {
                        reject(`plugin|error|${e}`)
                    })
            })
        }
    )
    const setContentList = useMemoizedFn(
        (info: ChatCSSingleInfoProps, contents: ChatCSMultipleInfoProps, group: CacheChatCSProps[]) => {
            const lastIndex = contents.content.findIndex((item) => item.id === info.id)
            if (lastIndex === -1) contents.content.push(info)
            setHistroy([...group])
            setStorage([...group])
            /** 流式输出逻辑 */
            scrollToBottom()
        }
    )
    /** 生成 Promise 实例 */
    const generatePromise = useMemoizedFn(
        async (
            params: {
                prompt: string
                is_bing: boolean
                is_plugin: boolean
                history: {role: string; content: string}[]
                signal: AbortSignal
            },
            contents: ChatCSMultipleInfoProps,
            group: CacheChatCSProps[]
        ) => {
            const cs: ChatCSSingleInfoProps = {
                is_bing: params.is_bing,
                is_plugin: params.is_plugin,
                content: "",
                id: ""
            }
            let result:string = ""
            return await new Promise((resolve, reject) => {
                chatCS({
                    ...params,
                    token: userInfo.token,
                    /** 流式输出逻辑 */
                    onDownloadProgress: ({event}) => {
                        if (!event.target) return
                        const {responseText} = event.target

                        let answer: ChatCSAnswerProps | undefined = analysisFlowData(responseText)

                        // 正常数据中，如果没有答案，则后端返回的text为空，这种情况数据自动抛弃
                        if (answer && answer?.loadResult && answer.loadResult.length !== 0) {
                            if (cs.content === answer.loadResult) return
                            if (!cs.id) cs.id = answer.id
                            cs.content = answer.loadResult
                            setContentList(cs, contents, group)
                        }
                        if(answer && answer.result.length !== 0){
                            result = answer.result
                        }
                    }
                })
                    .then((res: any) => {
                        /** 一次性输出逻辑 */
                        // const answer: ChatCSAnswerProps | undefined = res?.data
                        // 正常数据中，如果没有答案，则后端返回的text为空，这种情况数据自动抛弃
                        // if (answer) {
                        //     if (!answer.text) cs.content = "暂无可用解答"
                        //     else cs.content = answer.text
                        //     cs.id = answer.id
                        //     setContentList(cs, contents, group)
                        // }
                        /** 流式输出逻辑 */
                        if (!cs.content) {
                            cs.content = "暂无可用解答"
                            setContentList(cs, contents, group)
                        }
                        else{
                            cs.content = result
                            setContentList(cs, contents, group)
                        }
                        resolve(`${params.is_bing && "bing|"}success`)
                    })
                    .catch((e) => {
                        if (!cs.content) {
                            cs.content = "该类型请求异常，请稍后重试"
                            setContentList(cs, contents, group)
                        }
                        resolve(`${params.is_bing && "bing|"}error|${e}`)
                    })
            })
        }
    )
    const onSubmit = useMemoizedFn(async (info: ChatInfoProps) => {
        const group = [...history]
        const filterIndex = group.findIndex((item) => item.token === active)
        // 定位当前对话数据历史对象
        const lists: CacheChatCSProps =
            filterIndex > -1
                ? group[filterIndex]
                : {
                      token: randomString(10),
                      name: `临时对话窗-${randomString(4)}`,
                      is_bing: isBing,
                      is_plugin: isPlugin,
                      history: [],
                      time: formatDate(+new Date())
                  }
        lists.history.push(info)
        if (filterIndex === -1) group.push(lists)
        else lists.time = formatDate(+new Date())

        // 状态变为准备请求，同时保存当前数据
        setLoading(true)
        setHistroy([...group])
        setStorage([...group])
        scrollToBottom()
        if (filterIndex === -1) setActive(lists.token)
        setQuestion("")
        // 开启请求计时器
        if (resTimeRef.current) clearInterval(resTimeRef.current)
        resTimeRef.current = setInterval(() => {
            setResTime(formatDate(+new Date()))
        }, 1000)
        // 初始化请求状态变量
        /** 流式输出逻辑 */
        isBreak.current = false
        controller.current = null
        /** 一次性输出逻辑 */
        // controller.current = []

        // 获取对话历史记录
        const chatHistory = fetchHistory(lists.history)

        const params = info.info as ChatMeInfoProps
        // 创建答案数据对象并保存
        const contents: ChatCSMultipleInfoProps = {
            likeType: "",
            content: []
        }
        const answers: ChatInfoProps = {
            token: randomString(10),
            isMe: false,
            time: formatDate(+new Date()),
            info: contents
        }
        if (params.is_plugin) {
            answers.renderType = "plugin-list"
        }
        setLoadingToken(answers.token)
        lists.history.push(answers)
        lists.time = formatDate(+new Date())
        setHistroy([...group])
        setStorage([...group])
        setTimeout(() => scrollToBottom(), 100)

        if (!params.is_plugin) {
            /** 流式输出逻辑 */
            if (!isBreak.current) {
                chatHistory.reverse()
                const abort = new AbortController()
                controller.current = abort
                await generatePromise(
                    {
                        prompt: params.content,
                        is_bing: params.is_bing,
                        is_plugin: params.is_plugin,
                        history: chatHistory,
                        signal: abort.signal
                    },
                    contents,
                    group
                )
            }
            scrollToBottom()
            /** 一次性输出逻辑 */
            // chatHistory.reverse()
            // const abort = new AbortController()
            // controller.current.push(abort)
            // const promise = generatePromise(
            //     {prompt: params.content, intell_type: params.baseType, history: chatHistory, signal: abort.signal},
            //     contents,
            //     group
            // )
            // promises.push(promise)
        }
        /** 插件调试与执行 - 新接口 */
        if (params.is_plugin) {
            if (!isBreak.current) {
                chatHistory.reverse()
                const abort = new AbortController()
                controller.current = abort
                await new Promise((resolve, reject) => {
                    ipcRenderer.invoke("QueryYakScriptLocalAll").then(async (item: QueryYakScriptsResponse) => {
                        let scripts: ScriptsProps[] = item.Data.map((i) => ({
                            script_name: i.ScriptName,
                            Fields: i.Params
                        }))
                        await generatePluginPromise(
                            {
                                prompt: params.content,
                                is_bing: params.is_bing,
                                is_plugin: params.is_plugin,
                                scripts,
                                history: chatHistory,
                                signal: abort.signal
                            },
                            contents,
                            group,
                            item.Data
                        )
                        resolve(null)
                    })
                })
            }
            scrollToBottom()
        }

        /** 一次性输出逻辑 */
        // Promise.allSettled(promises)
        //     .then((res) => {
        //         // 清除请求计时器
        //         if (resTimeRef.current) {
        //             clearInterval(resTimeRef.current)
        //             resTimeRef.current = null
        //         }
        //         // 记录请求结束的时间,保存数据并更新对话时间
        //         answers.time = getResTime()
        //         lists.time = formatDate(+new Date())
        //         setHistroy([...group])
        //         setStorage([...group])
        //         // 重置请求状态变量
        //         setResTime("")
        //         setLoadingToken("")
        //         setLoading(false)
        //         scrollToCurrent()
        //     })
        //     .catch(() => {})

        /** 流式输出逻辑 */
        setTimeout(() => {
            if (resTimeRef.current) {
                clearInterval(resTimeRef.current)
                resTimeRef.current = null
            }
            answers.time = getResTime()
            lists.time = formatDate(+new Date())
            setHistroy([...group])
            setStorage([...group])

            setResTime("")
            setLoadingToken("")
            setLoading(false)

            scrollToBottom()
        }, 100)
    })

    /** 停止回答(断开请求连接) */
    const onStop = useMemoizedFn(() => {
        if (resTimeRef.current) {
            clearInterval(resTimeRef.current)
            resTimeRef.current = null
        }
        /** 流式输出逻辑 */
        isBreak.current = true
        if (controller.current) {
            controller.current.abort()
        }
    })
    /** 点赞|踩 */
    const generateLikePromise = useMemoizedFn((params: {uid: string; grade: "good" | "bad"}) => {
        return new Promise((resolve, reject) => {
            chatGrade({...params})
                .then(() => {
                    resolve(`success`)
                })
                .catch((e) => {
                    reject(`error|${e}`)
                })
        })
    })
    const onLikes = useMemoizedFn((info: ChatInfoProps, isLike: boolean) => {
        const answers = info.info as ChatCSMultipleInfoProps
        if (answers.likeType) return

        const data = [...history]
        const filterIndex = data.findIndex((item) => item.token === active)
        if (filterIndex === -1) return

        const promises: Promise<any>[] = []
        for (let item of answers.content) {
            if (!item.id) continue
            promises.push(generateLikePromise({uid: item.id, grade: isLike ? "good" : "bad"}))
        }

        Promise.allSettled(promises)

        answers.likeType = isLike ? "good" : "bad"
        const contents = {...info}
        contents.info = answers

        data[filterIndex].history = data[filterIndex].history.map((item) => {
            if (item.token === contents.token) return contents
            return item
        })
        data[filterIndex].time = formatDate(+new Date())
        setHistroy([...data])
        setStorage([...data])
    })
    /** 删除单条问答内容 */
    const onDelContent = useMemoizedFn((info: ChatInfoProps) => {
        const data = [...history]
        const filterIndex = data.findIndex((item) => item.token === active)
        if (filterIndex === -1) return
        const chat = data[filterIndex]
        chat.history = chat.history.filter((item) => item.token !== info.token)
        chat.time = formatDate(+new Date())
        setHistroy([...data])
        setStorage([...data])
    })

    const [historyShow, setHistoryShow] = useState<boolean>(false)
    /** 设置当前展示的对话 */
    const onCurrent = useMemoizedFn((info: CacheChatCSProps) => {
        if (active === info.token) return
        setActive(info.token)
        setHistoryShow(false)
    })
    const [editShow, setEditShow] = useState<boolean>(false)
    const [editInfo, setEditInfo] = useState<CacheChatCSProps>()
    /** 编辑指定对话标题 */
    const onEdit = useMemoizedFn((info: CacheChatCSProps) => {
        setEditInfo(info)
        setEditShow(true)
    })
    /** 编辑指定对话标题(完成编辑) */
    const onEditCallback = useMemoizedFn((name: string) => {
        if (!editInfo) return
        const data = history.map((item) => {
            const info = {...item}
            if (info.token === editInfo?.token) {
                info.name = name
                info.time = formatDate(+new Date())
            }
            return info
        })
        setHistroy([...data])
        setStorage([...data])
        setEditShow(false)
        setEditInfo(undefined)
    })
    /** 删除指定对话 */
    const onDel = useMemoizedFn((info: CacheChatCSProps, callback?: () => any) => {
        const data = [...history]
        if (data.length === 0) return

        // 过滤掉指定对话后的对话组
        const filters = data.filter((item) => item.token !== info.token)

        if (info.token !== active) {
            setHistroy([...filters])
            setStorage([...filters])
            setTimeout(() => {
                if (callback) callback()
            }, 50)
            return
        }

        if (data.length === 1) {
            setHistroy([])
            setStorage([])
            setActive("")
            setTimeout(() => {
                if (callback) callback()
            }, 50)
        } else {
            const length = data.length
            const index = data.findIndex((item) => item.token === info.token)

            let activeKey: string = ""
            if (index === length - 1) {
                activeKey = data[length - 2].token
            } else if (index === 0) {
                activeKey = data[1].token
            } else {
                activeKey = data[index - 1].token
            }

            setHistroy([...filters])
            setStorage([...filters])
            setActive(activeKey)
            setTimeout(() => {
                if (callback) callback()
            }, 50)
        }
    })

    /** 插件调试执行 - 运行结束 - 更改历史/缓存结果 */
    const onPluginEnd = useMemoizedFn(({token, info, status, runtimeId, riskState}: PluginEndProps) => {
        const data = [...history]
        const filterIndex = data.findIndex((item) => item.token === active)
        if (filterIndex === -1) return
        const chat = data[filterIndex]
        chat.history = chat.history.map((item) => {
            if (item.token === token) {
                let itemInfo = item.info as ChatCSMultipleInfoProps
                let content: ChatCSSingleInfoProps[] = itemInfo.content.map((item) => {
                    if (riskState) {
                        return {...item, status, runtimeId, riskState}
                    }
                    return {...item, status, runtimeId}
                })
                let info = {
                    ...item.info,
                    content
                }
                return {...item, info}
            }
            return item
        }) as ChatInfoProps[]
        chat.time = formatDate(+new Date())
        setHistroy([...data])
        setStorage([...data])
    })

    /** 预设词提问 */
    const onSubmitPreset = useMemoizedFn((info: PresetKeywordProps) => {
        if (loading) return

        const data: ChatInfoProps = {
            token: randomString(10),
            isMe: true,
            time: formatDate(+new Date()),
            info: {
                content: info.content,
                is_bing: info.is_bing,
                is_plugin: info.is_plugin
            }
        }

        onSubmit(data)
    })

    useUpdateEffect(() => {
        if (isShowPrompt) {
            const maxWitdh = Math.floor(window.innerWidth*0.95)-1
            setWidth(maxWitdh)
        }
    }, [isShowPrompt])

    return (
        <Resizable
            style={{position: "absolute"}}
            className={classNames(styles["yak-chat-modal"], {[styles["hidden-yak-chat-modal"]]: !visible})}
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
                if (elementRef.clientWidth < 731) {
                    setShowPrompt(false)
                }
                setWidth(elementRef.clientWidth)

            }}
        >
            <div ref={divRef} className={styles["yak-chat-layout"]}>
                <div className={styles["layout-header"]}>
                    <div className={styles["header-title"]}>
                        <YakitChatCSIcon />
                        ChatCS
                        <Tooltip
                            overlayClassName={classNames(styles["tooltip-wrapper"], styles["info-hint-popover"])}
                            overlayStyle={{paddingTop: 4}}
                            title={"ChatCS模型参数：6.5b，训练Token: 1.5T 显卡资源：A40*4，使用文心增强知识推理能力"}
                        >
                            <OutlineInformationcircleIcon className={styles["info-hint"]} />
                        </Tooltip>
                    </div>
                    <div className={styles["header-extra"]}>
                        {history.length !== 0 && (
                            <YakitButton disabled={loading} icon={<PlusIcon />} onClick={onAddChat}>
                                {(+width || 351) < 350 ? undefined : "新会话"}
                            </YakitButton>
                        )}
                        <div className={styles["extra-base-btn"]}>
                            {history.length !== 0 && (
                                <>
                                    <Tooltip overlayClassName={styles["tooltip-wrapper"]} title={"会话历史记录"}>
                                        <div
                                            className={classNames(styles["big-btn"], styles["btn-style"], {
                                                [styles["disable-style"]]: loading
                                            })}
                                            onClick={() => {
                                                if (loading) return
                                                setHistoryShow(true)
                                            }}
                                        >
                                            <ClockIcon />
                                        </div>
                                    </Tooltip>
                                    <div className={styles["divider-style"]}></div>
                                </>
                            )}
                            <div
                                className={classNames(styles["small-btn"], styles["btn-style"], styles["expand-icon"])}
                                onClick={() => {
                                    if(expand){
                                        const maxWitdh = Math.floor(window.innerWidth*0.95)-1
                                        setWidth(maxWitdh)
                                    }
                                    else{
                                        setShowPrompt(false)
                                        setWidth(481)
                                    }
                                }}
                            >
                                {expand?<ArrowsExpandIcon />:<ArrowsRetractIcon />}
                            </div>
                            <div
                                className={classNames(styles["big-btn"], styles["btn-style"], styles["close-icon"])}
                                onClick={() => setVisible(false)}
                            >
                                <RemoveIcon />
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles["layout-main"]}>
                    <div className={styles["layout-body-footer"]}>
                        <div className={styles["layout-body"]}>
                            <div className={styles["body-wrapper"]}>
                                {history.length === 0 || currentChat.length === 0 ? (
                                    <>
                                        {/* 欢迎页 */}
                                        <div className={styles["welcome-header"]}>
                                            <div className={styles["header-title"]}>
                                                <div className={classNames(styles["title-style"], "content-ellipsis")}>
                                                    {`你好,${showName}`}
                                                </div>
                                                👋
                                            </div>
                                            <div className={styles["header-subTitle"]}>有什么我能帮助你的吗？</div>
                                        </div>
                                        <div className={styles["welcome-preset-list"]}>
                                            <div className={styles["list-wrapper"]}>
                                                <div className={styles["info-hint-wrapper"]}>
                                                    <OutlineInformationcircleIcon />
                                                    ChatCS模型参数：6.5b，训练Token: 1.5T
                                                    显卡资源：A40*4，使用文心增强知识推理能力
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div ref={contentRef} className={styles["body-content"]}>
                                        {currentChat.map((item) => {
                                            const {token, isMe, time, info, renderType} = item

                                            if (isMe) {
                                                return (
                                                    <ChatUserContent
                                                        key={token}
                                                        time={time}
                                                        info={info as ChatMeInfoProps}
                                                        onDel={() => onDelContent(item)}
                                                    />
                                                )
                                            } else {
                                                return (
                                                    <ChatCSContent
                                                        onPluginEnd={onPluginEnd}
                                                        key={token}
                                                        token={token}
                                                        loadingToken={loadingToken}
                                                        loading={loading}
                                                        resTime={resTime}
                                                        time={time}
                                                        info={info as ChatCSMultipleInfoProps}
                                                        onStop={onStop}
                                                        onLike={(isLike) => onLikes(item, isLike)}
                                                        onDel={() => onDelContent(item)}
                                                        renderType={renderType}
                                                    />
                                                )
                                            }
                                        })}
                                    </div>
                                )}
                            </div>

                            {currentChat.length !== 0 && isBottom && (
                                <div className={styles["body-to-bottom"]} onClick={scrollToBottom}>
                                    <ArrowDownIcon />
                                </div>
                            )}
                        </div>

                        {!loading && (
                            <div className={styles["layout-footer"]}>
                                {!isShowPrompt && (
                                    <div className={styles["footer-prompt"]}>
                                        <div
                                            className={styles["footer-book"]}
                                            onClick={() => {
                                                setShowPrompt(true)
                                            }}
                                        >
                                            <YakChatBookIcon />
                                            <span className={styles["content"]}>Prompt</span>
                                        </div>
                                    </div>
                                )}
                                <div className={styles["footer-wrapper"]}>
                                    <Input.TextArea
                                        className={styles["text-area-wrapper"]}
                                        bordered={false}
                                        placeholder='问我任何问题...(shift + enter 换行)'
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
                                    <div className={styles["input-footer"]}>
                                        {(+width || 451) < 450 ? (
                                            <YakitPopover
                                                overlayClassName={styles["yakit-popover-type"]}
                                                overlayStyle={{paddingBottom: 4}}
                                                placement='topRight'
                                                trigger={"click"}
                                                content={
                                                    <div className={styles["footer-popover-wrapper"]}>
                                                        <div className={styles["footer-type-wrapper"]}>
                                                            <div className={styles["type-title"]}>
                                                                回答类型
                                                                <Tooltip
                                                                    overlayClassName={styles["tooltip-wrapper"]}
                                                                    title={"ChatCS 将根据选择的类型回答你的问题"}
                                                                >
                                                                    <QuestionMarkCircleIcon />
                                                                </Tooltip>
                                                                :
                                                            </div>
                                                            <div
                                                                className={classNames(styles["single-btn"], {
                                                                    [styles["single-active-btn"]]: isBing
                                                                })}
                                                                onClick={() => setBing(!isBing)}
                                                            >
                                                                搜索引擎增强
                                                            </div>
                                                            <div
                                                                className={classNames(styles["single-btn"], {
                                                                    [styles["single-active-btn"]]: isPlugin
                                                                })}
                                                                onClick={() => setPlugin(!isPlugin)}
                                                            >
                                                                插件调试执行
                                                            </div>
                                                        </div>
                                                        {isPlugin && (
                                                            <div className={styles["plugin-run-max-number-box"]}>
                                                                <div className={styles["title"]}>最大执行数量：</div>
                                                                <div>
                                                                    <YakitInputNumber
                                                                        className={styles["input-left"]}
                                                                        placeholder='Minimum'
                                                                        min={1}
                                                                        value={maxNumber}
                                                                        onChange={(v) => {
                                                                            setMaxNumber(v as number)
                                                                        }}
                                                                        size='small'
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                }
                                            >
                                                <div className={styles["footer-type-mini"]}>
                                                    <CogIcon />
                                                </div>
                                            </YakitPopover>
                                        ) : (
                                            <div className={styles["footer-type-wrapper"]}>
                                                <div className={styles["type-title"]}>
                                                    回答类型
                                                    <Tooltip
                                                        overlayStyle={{paddingBottom: 5}}
                                                        title={"ChatCS 将根据选择的类型回答你的问题"}
                                                    >
                                                        <QuestionMarkCircleIcon />
                                                    </Tooltip>
                                                    :
                                                </div>
                                                <div
                                                    className={classNames(styles["single-btn"], {
                                                        [styles["single-active-btn"]]: isBing
                                                    })}
                                                    onClick={() => setBing(!isBing)}
                                                >
                                                    搜索引擎增强
                                                </div>
                                                <div
                                                    className={classNames(styles["single-btn"], {
                                                        [styles["single-active-btn"]]: isPlugin
                                                    })}
                                                    onClick={() => setPlugin(!isPlugin)}
                                                >
                                                    插件调试执行
                                                </div>
                                                {isPlugin && (
                                                    <YakitPopover
                                                        title={"插件配置"}
                                                        // placement="topLeft"
                                                        overlayClassName={styles["chatcs-plugin-option-popover"]}
                                                        content={
                                                            <div className={styles["option-box"]}>
                                                                <div>最大执行数量：</div>
                                                                <div>
                                                                    <YakitInputNumber
                                                                        className={styles["input-left"]}
                                                                        placeholder='Minimum'
                                                                        min={1}
                                                                        value={maxNumber}
                                                                        onChange={(v) => {
                                                                            setMaxNumber(v as number)
                                                                        }}
                                                                        size='small'
                                                                    />
                                                                </div>
                                                            </div>
                                                        }
                                                        onVisibleChange={(v) => {
                                                            setPopoverVisible(v)
                                                        }}
                                                        overlayInnerStyle={{width: 220}}
                                                        visible={popoverVisible}
                                                    >
                                                        <YakitButton
                                                            icon={<SettingOutlined />}
                                                            type={"text"}
                                                            size={"small"}
                                                        />
                                                    </YakitPopover>
                                                )}
                                            </div>
                                        )}

                                        <div className={styles["footer-divider"]}></div>
                                        <div
                                            className={classNames(styles["footer-submit"], {
                                                [styles["footer-active-submit"]]: !!question
                                            })}
                                            onClick={onBtnSubmit}
                                        >
                                            <PaperPlaneRightIcon />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    {isShowPrompt && (
                        <PromptWidget
                            setShowPrompt={setShowPrompt}
                            onSubmitPreset={onSubmitPreset}
                            onPromptSubmit={onPromptSubmit}
                        />
                    )}
                </div>

                <HistoryDrawer
                    getContainer={divRef.current}
                    visible={historyShow}
                    setVisible={setHistoryShow}
                    active={active}
                    history={history}
                    onCurrent={onCurrent}
                    onEdit={onEdit}
                    onDel={onDel}
                />

                <YakitHint
                    width={modalWidth}
                    getContainer={divRef.current}
                    visible={addShow}
                    title='超过对话框个数限制'
                    content='新建会默认删除最早的对话框，确认新建吗？'
                    okButtonText='仍要新建'
                    okButtonProps={{loading: delLoading}}
                    cancelButtonText='稍后再说'
                    cancelButtonProps={{loading: delLoading}}
                    onOk={delToAdd}
                    onCancel={() => setAddShow(false)}
                />

                <EditNameModal
                    width={width}
                    getContainer={divRef.current}
                    visible={editShow}
                    setVisible={setEditShow}
                    chatName={editInfo ? editInfo.name : ""}
                    onOk={onEditCallback}
                />
            </div>
        </Resizable>
    )
}

interface ChatUserContentProps {
    time: string
    info: ChatMeInfoProps
    onDel: () => any
}
const ChatUserContent: React.FC<ChatUserContentProps> = memo((props) => {
    const {time, info, onDel} = props

    const {userInfo} = useStore()
    const showImg = useMemo(() => {
        if (userInfo.platform === "github") return userInfo.githubHeadImg || ""
        if (userInfo.platform === "wechat") return userInfo.wechatHeadImg || ""
        if (userInfo.platform === "company") return userInfo.companyHeadImg || ""
        return ``
    }, [userInfo])

    return (
        <div className={classNames(styles["content-opt-wrapper"], styles["content-opt-me-wrapper"])}>
            <div className={styles["opt-header"]}>
                <div className={styles["header-left"]}>
                    <img className={styles["img-style"]} src={showImg} />
                    {time}
                </div>
                <div className={styles["header-right"]}>
                    <div className={styles["right-btn"]} onClick={onDel}>
                        <TrashIcon />
                    </div>
                </div>
            </div>
            <div className={styles["opt-content"]}>
                <div className={styles["user-content-style"]}>{info.content}</div>
            </div>
        </div>
    )
})

interface PluginRunStatusProps {
    /*
        loading: 加载中 显示进度
        warn： 执行完成 - 有结果
        succee： 执行完成 - 无结果
        fail： 执行失败
    */
    status: "loading" | "succee" | "fail" | "info"
    pluginNameList: string[]
    progressList?: any
    infoList: StreamResult.Risk[]
    runtimeId?: string
}

const PluginRunStatus: React.FC<PluginRunStatusProps> = memo((props) => {
    const {status, pluginNameList, progressList, infoList, runtimeId} = props

    const containerRef = useRef(null)
    const wrapperRef = useRef(null)
    const [vlistHeigth, setVListHeight] = useState(0)
    const [list] = useVirtualList(infoList, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 28,
        overscan: 5
    })

    useEffect(()=>{
        setVListHeight(infoList.length>10?280:28*infoList.length)
    },[infoList])

    const onDetail = useMemoizedFn(() => {
        let defaultActiveKey: string = ""
        switch (status) {
            case "info":
                defaultActiveKey = "漏洞与风险"
                break
            case "succee":
                defaultActiveKey = "HTTP 流量"
                break
            case "fail":
                defaultActiveKey = "Console"
                break
        }

        addToTab(YakitRoute.BatchExecutorPage, {
            pluginBatchExecutorPageInfo: {
                runtimeId,
                defaultActiveKey
            }
        })
    })

    return (
        <div className={styles["plugin-run-status"]}>
            {status === "loading" && (
                <div className={styles["plugin-run"]}>
                    <div className={styles["title"]}>{pluginNameList.length}个插件执行中，请耐心等待...</div>
                    <div className={styles["sub-title"]}>
                        一般来说，检测将会在 <span className={styles["highlight"]}>10-20s</span> 内结束
                    </div>
                    {progressList && progressList.length === 1 && (
                        <Progress
                            style={{lineHeight: 0}}
                            strokeColor='#F28B44'
                            trailColor='#F0F2F5'
                            showInfo={false}
                            percent={Math.trunc(progressList[0].progress * 100)}
                        />
                    )}
                </div>
            )}
            {status === "info" && (
                <div className={styles["plugin-box"]}>
                    <div className={classNames(styles["header"], styles["warn"])}>
                        <div className={styles["title"]}>
                            <div className={styles["icon"]}>
                                <SolidExclamationIcon />
                            </div>
                            <div className={styles["text"]}>检测到 {(infoList || []).length} 个风险项</div>
                        </div>
                        <div className={styles["extra"]}>
                            <YakitButton type='text' style={{padding: 0}} onClick={onDetail}>
                                查看详情
                            </YakitButton>
                        </div>
                    </div>

                    <div className={styles["content"]}>
                        <div ref={containerRef} style={{height: vlistHeigth, overflow: "auto", overflowAnchor: "none"}}>
                            <div ref={wrapperRef}>
                                {list.map((item) => {
                                    const {data, index} = item
                                    /**获取风险等级的展示tag类型 */
                                    const getSeverity = (type) => {
                                        switch (type) {
                                            case "low":
                                                return "低危"
                                            case "middle":
                                                return "中危"
                                            case "high":
                                                return "高危"
                                            case "critical":
                                                return "严重"
                                            case "info":
                                                return "信息/指纹"
                                            default:
                                                return "未知"
                                        }
                                    }
                                    const getSeverityColor = (type) => {
                                        switch (type) {
                                            case "low":
                                                return "warning"
                                            case "middle":
                                                return "info"
                                            case "high":
                                                return "danger"
                                            case "critical":
                                                return "serious"
                                            case "info":
                                                return "info"
                                            default:
                                                return "warning"
                                        }
                                    }
                                    return (
                                        <div className={styles["item-box"]} key={index}>
                                            <YakitTag color={getSeverityColor(data.Severity)}>
                                                {getSeverity(data.Severity)}
                                            </YakitTag>
                                            <div
                                                className={classNames(styles["text"], "yakit-content-single-ellipsis")}
                                            >
                                                {data.FromYakScript}：{data.Title}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {status === "succee" && (
                <div className={styles["plugin-box"]}>
                    <div className={classNames(styles["header"], styles["succee"])}>
                        <div className={styles["title"]}>
                            <div className={styles["icon"]}>
                                <SolidCheckCircleIcon />
                            </div>
                            <div className={styles["text"]}>执行完成</div>
                        </div>
                        <div className={styles["extra"]}>
                            <YakitButton type='text' style={{padding: 0}} onClick={onDetail}>
                                查看详情
                            </YakitButton>
                        </div>
                    </div>
                    <div className={styles["content"]}>
                        <div className={styles["result"]}>无结果</div>
                    </div>
                </div>
            )}
            {status === "fail" && (
                <div className={styles["plugin-box"]}>
                    <div className={classNames(styles["header"], styles["fail"])}>
                        <div className={styles["title"]}>
                            <div className={styles["icon"]}>
                                <SolidXcircleIcon />
                            </div>
                            <div className={styles["text"]}>执行失败</div>
                        </div>
                        <div className={styles["extra"]}>
                            <YakitButton type='text' style={{padding: 0}} onClick={onDetail}>
                                查看日志
                            </YakitButton>
                        </div>
                    </div>
                    <div className={styles["content"]}>
                        <div className={styles["result"]}>无结果</div>
                    </div>
                </div>
            )}
        </div>
    )
})
interface PluginListContentProps {
    data: string
    setPluginRun: (v: boolean) => void
    onStartExecute: (v: string[], input: string) => void
}
const defPluginBatchExecuteExtraFormValue: PluginBatchExecuteExtraFormValue = {
    ...cloneDeep(defPluginExecuteFormValue),
    ...cloneDeep(defPluginExecuteTaskValue)
}
const PluginListContent: React.FC<PluginListContentProps> = memo((props) => {
    const {data, setPluginRun, onStartExecute} = props
    // 数据
    const [datsSource, setDatsSource] = useState<ChatPluginListProps>({
        input: "",
        data: []
    })
    // 选中项
    const [checkedList, setCheckedList] = useState<string[]>([])
    // 是否显示暂无数据
    const [showNoPlugin, setShowNoPlugin] = useState<boolean>(false)
    // 私有域地址
    const privateDomainRef = useRef<string>("")

    /**获取最新的私有域 */
    const getPrivateDomainAndRefList = useMemoizedFn(() => {
        getRemoteValue(RemoteGV.HttpSetting).then((setting) => {
            if (setting) {
                const values = JSON.parse(setting)
                privateDomainRef.current = values.BaseUrl
            }
            // 私有域获取完成后再解析数据
            try {
                const arr: ChatPluginListProps = JSON.parse(data)
                if (arr.data.length === 0) {
                    setShowNoPlugin(true)
                    return
                }
                setDatsSource(arr)
            } catch (error) {
                yakitNotify("error", `解析失败|${error}`)
            }
        })
    })

    useEffect(() => {
        getPrivateDomainAndRefList()
    }, [])

    /** 单项勾选|取消勾选 */
    const optCheck = useMemoizedFn((data: YakScript, value: boolean) => {
        try {
            // 全选情况时的取消勾选
            if (checkedList.length === datsSource.data.length) {
                setCheckedList(checkedList.filter((item) => item !== data.ScriptName))
                return
            }
            // 单项勾选回调
            if (value) setCheckedList([...checkedList, data.ScriptName])
            else setCheckedList(checkedList.filter((item) => item !== data.ScriptName))
        } catch (error) {
            yakitNotify("error", "勾选失败:" + error)
        }
    })

    const onPluginClick = useMemoizedFn((data: YakScript, index: number) => {
        // 取消选中
        if (checkedList.includes(data.ScriptName)) {
            setCheckedList(checkedList.filter((item) => item !== data.ScriptName))
        }
        // 选中
        else {
            setCheckedList([...checkedList, data.ScriptName])
        }
    })

    /** 单项副标题组件 */
    const optExtra = useMemoizedFn((data: YakScript) => {
        if (privateDomainRef.current !== data.OnlineBaseUrl) return <></>
        if (data.OnlineIsPrivate) {
            return <SolidPrivatepluginIcon className='icon-svg-16' />
        } else {
            return <SolidCloudpluginIcon className='icon-svg-16' />
        }
    })
    return (
        <>
            {showNoPlugin ? (
                <div>暂无匹配插件</div>
            ) : (
                <>
                    <div>好的，我为你匹配到 {datsSource.data.length} 个可用插件，是否要开始执行？</div>
                    <div className={styles["plugin-list-content"]}>
                        <div className={"plugin-details-opt-wrapper"}>
                            {datsSource.data.map((info, i) => {
                                const check = checkedList.includes(info.ScriptName)
                                return (
                                    <PluginDetailsListItem<YakScript>
                                        order={i}
                                        plugin={info}
                                        selectUUId={""} //本地用的ScriptName代替uuid
                                        check={check}
                                        headImg={info.HeadImg || ""}
                                        pluginUUId={info.ScriptName} //本地用的ScriptName代替uuid
                                        pluginName={info.ScriptName}
                                        help={info.Help}
                                        content={info.Content}
                                        optCheck={optCheck}
                                        official={!!info.OnlineOfficial}
                                        isCorePlugin={!!info.IsCorePlugin}
                                        pluginType={info.Type}
                                        onPluginClick={onPluginClick}
                                        extra={optExtra}
                                    />
                                )
                            })}
                        </div>
                        <div className={styles["footer"]}>
                            <div className={styles["count-box"]}>
                                <div className={styles["check-box"]}>
                                    <YakitCheckbox
                                        checked={checkedList.length === datsSource.data.length}
                                        indeterminate={
                                            checkedList.length > 0 && checkedList.length !== datsSource.data.length
                                        }
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                let list = datsSource.data.map((item) => item.ScriptName)
                                                setCheckedList(list)
                                            } else {
                                                setCheckedList([])
                                            }
                                        }}
                                    />
                                    <div className={styles["text"]}>全选</div>
                                </div>
                                <div className={styles["show-box"]}>
                                    <div className={styles["show"]}>
                                        <div className={styles["title"]}>Total</div>
                                        <div className={styles["count"]}>{datsSource.data.length}</div>
                                    </div>
                                    <div className={styles["line"]} />
                                    <div className={styles["show"]}>
                                        <div className={styles["title"]}>Selected</div>
                                        <div className={styles["count"]}>{checkedList.length}</div>
                                    </div>
                                </div>
                            </div>

                            <div className={styles["extra"]}>
                                <YakitButton
                                    disabled={checkedList.length === 0}
                                    icon={<SolidPlayIcon />}
                                    onClick={() => {
                                        onStartExecute(checkedList, datsSource.input)
                                    }}
                                >
                                    开始执行
                                </YakitButton>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    )
})

interface PluginEndProps {
    token: string
    info: ChatCSMultipleInfoProps
    status: "info" | "succee" | "fail"
    runtimeId: string
    riskState?: StreamResult.Risk[]
}

interface ChatCSContentProps {
    /** 用于更改缓存 */
    onPluginEnd: (v: PluginEndProps) => void
    /** 唯一标识符 */
    token: string
    /** 当前正在查询的那个回答的唯一标识符 */
    loadingToken: string
    loading: boolean
    /** 查询的动态运行时间 */
    resTime: string
    time: string
    info: ChatCSMultipleInfoProps
    onStop: () => any
    onLike: (isLike: boolean) => any
    onDel: () => any
    renderType?: "plugin-list"
}
const ChatCSContent: React.FC<ChatCSContentProps> = memo((props) => {
    const {onPluginEnd, token, loadingToken, loading, resTime, time, info, onStop, onLike, onDel, renderType} = props

    const tokenRef = useRef<string>(randomString(40))
    const [runtimeId, setRuntimeId] = useState<string>()
    /**额外参数弹出框 */
    const [extraParamsValue, setExtraParamsValue] = useState<PluginBatchExecuteExtraFormValue>({
        ...cloneDeep(defPluginBatchExecuteExtraFormValue)
    })
    /**是否进入执行 */
    const [pluginRun, setPluginRun] = useState<boolean>(false)
    /**展示类型 */
    const [showType, setShowType] = useState<"loading" | "succee" | "fail" | "info">("loading")
    const [lastRiskState, setLastRiskState] = useState<StreamResult.Risk[]>()
    /**执行的插件名数组 */
    const [pluginNameList, setPluginNameList] = useState<string[]>([])
    // 渲染之前执行过后的状态
    useEffect(() => {
        const {content} = info
        if (Array.isArray(content) && content.length > 0) {
            const {status, runtimeId, riskState} = content[0]
            if (status) {
                setPluginRun(true)
                setShowType(status)
                setRuntimeId(runtimeId)
                riskState && setLastRiskState(riskState)
            }
        }
    }, [])

    /**插件运行结果展示 */
    const [streamInfo, hybridScanStreamEvent] = useHoldBatchGRPCStream({
        taskName: "hybrid-scan",
        apiKey: "HybridScan",
        token: tokenRef.current,
        onEnd: () => {
            hybridScanStreamEvent.stop()
            onTypeByresult("succee")
        },
        onError: () => {
            onTypeByresult("fail")
        },
        setRuntimeId: (rId) => {
            setRuntimeId(rId)
        }
    })
    const onTypeByresult = useMemoizedFn((v: "succee" | "fail") => {
        const newStreamInfo = streamInfo as HoldGRPCStreamInfo
        if (runtimeId) {
            if (newStreamInfo.riskState.length > 0) {
                // 此处更改history为结果
                onPluginEnd({token, info, status: "info", runtimeId, riskState: newStreamInfo.riskState})
                setShowType("info")
            } else {
                onPluginEnd({token, info, status: v, runtimeId})
                setShowType(v)
            }
        }
    })

    const infoList = useCreation(() => {
        const info = streamInfo as HoldGRPCStreamInfo
        return lastRiskState || info.riskState
    }, [streamInfo.riskState, lastRiskState])

    const progressList = useCreation(() => {
        return streamInfo.progressState
    }, [streamInfo.progressState])
    /**开始执行 */
    const onStartExecute = useMemoizedFn((selectPluginName: string[], Input: string) => {
        // 任务配置参数
        const taskParams: PluginBatchExecutorTaskProps = {
            Concurrent: extraParamsValue.Concurrent,
            TotalTimeoutSecond: extraParamsValue.Concurrent,
            Proxy: extraParamsValue.Proxy
        }
        const params: HybridScanRequest = {
            Input,
            ...taskParams,
            HTTPRequestTemplate: {
                ...extraParamsValue,
                IsRawHTTPRequest: false
            }
        }
        const pluginInfo: {selectPluginName: string[]; search: PluginSearchParams} = {
            selectPluginName,
            search: {
                keyword: "",
                userName: "",
                type: "keyword"
            }
        }
        const hybridScanParams: HybridScanControlAfterRequest = convertHybridScanParams(params, pluginInfo, "")
        apiHybridScan(hybridScanParams, tokenRef.current).then(() => {
            setPluginRun(true)
            setPluginNameList(selectPluginName)
            setShowType("loading")
            hybridScanStreamEvent.reset()
            hybridScanStreamEvent.start()
        })
    })
    /**取消执行 */
    const onStopExecute = useMemoizedFn((e) => {
        e.stopPropagation()
        apiStopHybridScan(runtimeId || "", tokenRef.current).then(() => {
            setPluginRun(false)
        })
    })
    const copyContent = useMemo(() => {
        let content: string = ""
        for (let item of info.content) {
            if (item.is_bing) {
                content = `${content}# 搜索引擎增强\n${item.content}\n`
            } else if (item.is_plugin) {
                content = `${content}# "插件调试执行"\n${item.content}\n`
            } else {
                content = `${content}${item.content}\n`
            }
        }
        return content
    }, [resTime, info])

    const showLoading = useMemo(() => {
        return token === loadingToken && loading
    }, [token, loadingToken, loading])

    return (
        <div className={styles["content-opt-wrapper"]}>
            {pluginRun ? (
                <>
                    <div className={styles["opt-header"]}>
                        <div className={styles["header-left"]}>
                            <YakChatLogIcon />
                            {time}
                        </div>

                        {showType === "loading" && (
                            <div style={{display: "flex"}} className={styles["header-right"]}>
                                <YakitButton
                                    type='primary'
                                    colors='danger'
                                    icon={<StopIcon />}
                                    onClick={(e) => {
                                        onStopExecute(e)
                                    }}
                                >
                                    停止
                                </YakitButton>
                            </div>
                        )}
                        {showType !== "loading" && (
                            <div className={styles["header-right"]}>
                                <div className={styles["right-btn"]} onClick={onDel}>
                                    <TrashIcon />
                                </div>
                            </div>
                        )}
                    </div>
                    <div className={styles["opt-content"]}>
                        <PluginRunStatus
                            status={showType}
                            progressList={progressList}
                            infoList={infoList}
                            runtimeId={runtimeId}
                            pluginNameList={pluginNameList}
                        />
                    </div>
                </>
            ) : (
                <>
                    <div className={styles["opt-header"]}>
                        <div className={styles["header-left"]}>
                            <YakChatLogIcon />
                            {showLoading ? resTime : time}
                        </div>
                        <div className={showLoading ? styles["header-right-loading"] : styles["header-right"]}>
                            {showLoading ? (
                                <YakitButton type='primary' colors='danger' icon={<StopIcon />} onClick={onStop}>
                                    停止
                                </YakitButton>
                            ) : (
                                <>
                                    {info.likeType !== "bad" && (
                                        <div
                                            className={styles["right-btn"]}
                                            onClick={() => {
                                                if (info.likeType) return
                                                onLike(true)
                                            }}
                                        >
                                            {info.likeType === "good" ? (
                                                <SolidThumbupIcon className={styles["actived-icon"]} />
                                            ) : (
                                                <ThumbUpIcon />
                                            )}
                                        </div>
                                    )}
                                    {info.likeType !== "good" && (
                                        <div
                                            className={styles["right-btn"]}
                                            onClick={() => {
                                                if (info.likeType) return
                                                onLike(false)
                                            }}
                                        >
                                            {info.likeType === "bad" ? (
                                                <SolidThumbDownIcon className={styles["actived-icon"]} />
                                            ) : (
                                                <ThumbDownIcon />
                                            )}
                                        </div>
                                    )}

                                    {renderType !== "plugin-list" && (
                                        <div className={styles["right-btn"]}>
                                            <CopyComponents
                                                className={classNames(styles["copy-icon-style"])}
                                                copyText={copyContent}
                                                iconColor={"#85899e"}
                                            />
                                        </div>
                                    )}

                                    <div className={styles["right-btn"]} onClick={onDel}>
                                        <TrashIcon />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <div className={styles["opt-content"]}>
                        {token === loadingToken ? (
                            info.content.length !== 0 && (
                                <>
                                    <div className={styles["content-style"]}>
                                        {info.content.map((item, index) => {
                                            return (
                                                <React.Fragment key={item.id + index}>
                                                    {item.is_bing && (
                                                        <div
                                                            className={styles["content-type-title"]}
                                                        >{`# ${"搜索引擎增强"}`}</div>
                                                    )}
                                                    {item.is_plugin && (
                                                        <div
                                                            className={styles["content-type-title"]}
                                                        >{`# ${"插件调试执行"}`}</div>
                                                    )}
                                                    <ChatMarkdown content={item.content} />
                                                </React.Fragment>
                                            )
                                        })}
                                    </div>
                                </>
                            )
                        ) : (
                            <div className={styles["content-style"]}>
                                {info.content.length === 0 ? (
                                    "请求出现错误，请稍候再试"
                                ) : (
                                    <>
                                        <>
                                            {info.content.map((item, index) => {
                                                return (
                                                    <React.Fragment key={index + item.id}>
                                                        {item.is_bing && (
                                                            <div
                                                                className={styles["content-type-title"]}
                                                            >{`# ${"搜索引擎增强"}`}</div>
                                                        )}
                                                        {item.is_plugin && (
                                                            <div
                                                                className={styles["content-type-title"]}
                                                            >{`# ${"插件调试执行"}`}</div>
                                                        )}
                                                        {renderType === "plugin-list" ? (
                                                            <PluginListContent
                                                                setPluginRun={setPluginRun}
                                                                onStartExecute={onStartExecute}
                                                                data={item.content}
                                                            />
                                                        ) : (
                                                            <ChatMarkdown content={item.content} />
                                                        )}
                                                    </React.Fragment>
                                                )
                                            })}
                                        </>
                                    </>
                                )}
                            </div>
                        )}

                        {showLoading && (
                            <div className={styles["loading-wrapper"]}>
                                <div
                                    className={classNames(styles["loading-style"], styles["loading-dot-before"])}
                                ></div>
                                <div className={classNames(styles["loading-style"], styles["loading-dot"])}></div>
                                <div className={classNames(styles["loading-style"], styles["loading-dot-after"])}></div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
})

interface HistoryDrawerProps {
    /** 是否被dom节点包含 */
    getContainer: any
    visible: boolean
    setVisible: (visible: boolean) => any
    active: string
    history: CacheChatCSProps[]
    onCurrent: (info: CacheChatCSProps) => any
    onDel: (info: CacheChatCSProps) => any
    onEdit: (info: CacheChatCSProps) => any
}
const HistoryDrawer: React.FC<HistoryDrawerProps> = memo((props) => {
    const {getContainer, visible, setVisible, active, history, onCurrent, onDel, onEdit} = props

    return (
        <Drawer
            getContainer={getContainer}
            className={styles["drawer-wrapper"]}
            closable={false}
            placement='bottom'
            visible={visible}
            onClose={() => setVisible(false)}
        >
            <div className={styles["drawer-body"]}>
                <div className={styles["body-header"]}>
                    <div className={styles["header-title"]}>会话历史记录</div>
                    <div className={styles["header-close"]} onClick={() => setVisible(false)}>
                        <RemoveIcon />
                    </div>
                </div>

                <div className={styles["body-wrapper"]}>
                    <div className={styles["body-layout"]}>
                        <div className={styles["body-container"]}>
                            {history.map((item) => {
                                return (
                                    <div
                                        key={item.token}
                                        className={classNames(styles["history-container-opt"], {
                                            [styles["history-container-active-opt"]]: active === item.token
                                        })}
                                        onClick={() => onCurrent(item)}
                                    >
                                        <div className={styles["opt-header"]}>
                                            <ChatAltIcon />
                                            <div className={styles["header-info"]}>
                                                <div className={styles["info-title"]}>{item.name}</div>
                                                <div className={styles["info-time"]}>{item.time}</div>
                                            </div>
                                        </div>
                                        <div className={styles["opt-operate"]}>
                                            <Tooltip
                                                overlayClassName={styles["tooltip-wrapper"]}
                                                title={"编辑对话标题"}
                                            >
                                                <div
                                                    className={styles["operate-btn"]}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onEdit(item)
                                                    }}
                                                >
                                                    <PencilAltIcon />
                                                </div>
                                            </Tooltip>
                                            <Tooltip overlayClassName={styles["tooltip-wrapper"]} title={"删除该对话"}>
                                                <div
                                                    className={styles["operate-btn"]}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onDel(item)
                                                    }}
                                                >
                                                    <TrashIcon />
                                                </div>
                                            </Tooltip>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className={styles["body-footer"]}>仅展示最近 5 个对话窗口</div>
                    </div>
                </div>
            </div>
        </Drawer>
    )
})
interface PresetKeywordProps {
    content: string
    is_bing: boolean
    is_plugin: boolean
}

interface PromptWidgetProps {
    setShowPrompt: (v: boolean) => void
    onSubmitPreset: (info: PresetKeywordProps) => void
    onPromptSubmit?: (v: PresetKeywordProps) => void
}

interface PromptListProps {
    title: string
    is_bing: boolean
    is_plugin: boolean
    eg: string[]
    prompt_type: PromptLabelItem
    template: string
    templateArr: string[]
}

interface PromptLabelProps {
    Team_all: number
    RedTeam_vuln: number
    BlueTeam_com: number
    RedTeam_code: number
    BlueTeam_code: number
    Team_other: number
    yak_memo: number
}

type PromptLabelItem =
    | "Team_all"
    | "RedTeam_vuln"
    | "BlueTeam_com"
    | "RedTeam_code"
    | "BlueTeam_code"
    | "yak_memo"
    | "Team_other"

const PromptWidget: React.FC<PromptWidgetProps> = memo((props) => {
    const {setShowPrompt, onSubmitPreset, onPromptSubmit} = props
    const [promptList, setPromptList] = useState<PromptListProps[]>([])
    const [showPromptList, setShowPromptList] = useState<PromptListProps[]>([])
    const [promptLabel, setPromptLabel] = useState<PromptLabelProps>()
    const [selectLabel, setSelectLabel] = useState<PromptLabelItem>("Team_all")
    const [searchValue, setSearchValue] = useState<string>("")
    const [visible, setVisible] = useState<boolean>(false)
    const [selectItem, setSelectItem] = useState<PromptListProps>()
    const promptListRef = useRef<HTMLDivElement>(null)
    // 渲染的label
    const PromptLabelArr: PromptLabelItem[] = [
        "Team_all",
        "RedTeam_vuln",
        "BlueTeam_com",
        "RedTeam_code",
        "BlueTeam_code",
        "yak_memo"
        // "Team_other"
    ]
    useEffect(() => {
        getPromptListPromise()
    }, [])

    // 将字符串中的特定字符中的内容提取出来
    const templateToArr = useMemoizedFn((str: string) => {
        // 使用正则表达式匹配 |` 与 `| 之间的字符
        const regex = /\|`([^`]+)`\|/g
        const matches: string[] = []
        let match
        while ((match = regex.exec(str)) !== null) {
            matches.push(match[1])
        }
        return matches
    })

    const getPromptListPromise = useMemoizedFn((params = {}) => {
        getPromptList({...params})
            .then((result) => {
                const {data} = result
                if (data.status) {
                    let list: PromptListProps[] = []
                    const obj = data.data || {}
                    const label: PromptLabelProps = {
                        Team_all: 0,
                        RedTeam_vuln: 0,
                        BlueTeam_com: 0,
                        RedTeam_code: 0,
                        BlueTeam_code: 0,
                        yak_memo: 0,
                        Team_other: 0
                    }
                    Object.keys(obj).forEach((key) => {
                        const item = obj[key]
                        let PromptListItem: PromptListProps = {
                            title: key,
                            is_bing: item.is_bing,
                            is_plugin: item.is_plugin,
                            eg: item.eg,
                            prompt_type: item.prompt_type,
                            template: item.template,
                            templateArr: templateToArr(item.template)
                        }
                        list.push(PromptListItem)
                        label.Team_all += 1
                        switch (item.prompt_type) {
                            case "RedTeam_vuln":
                                label.RedTeam_vuln += 1
                                break
                            case "BlueTeam_com":
                                label.BlueTeam_com += 1
                                break
                            case "RedTeam_code":
                                label.RedTeam_code += 1
                                break
                            case "BlueTeam_code":
                                label.BlueTeam_code += 1
                                break
                            case "yak_memo":
                                label.yak_memo += 1
                                break
                            default:
                                label.Team_other += 1
                                break
                        }
                    })
                    setPromptLabel(label)
                    setPromptList([...list])
                }
            })
            .catch((e) => {
                yakitNotify("error", `error|${e}`)
            })
    })

    const getLabelText = useMemoizedFn((v: PromptLabelItem) => {
        switch (v) {
            case "Team_all":
                return "全部"
            case "RedTeam_vuln":
                return "漏洞情报"
            case "BlueTeam_com":
                return "应急响应"
            case "RedTeam_code":
                return "代码生成"
            case "BlueTeam_code":
                return "数据研判"
            case "yak_memo":
                return "Yak"
            default:
                return "其他"
        }
    })

    const getLabelIcon = useMemoizedFn((v: PromptLabelItem, isActive: boolean) => {
        switch (v) {
            case "Team_all":
                return isActive ? <OutlineViewGridActiveIcon /> : <OutlineViewGridIcon />
            case "RedTeam_vuln":
                return isActive ? <UIKitOutlineBugActiveIcon /> : <UIKitOutlineBugIcon />
            case "BlueTeam_com":
                return isActive ? <OutlineWebFuzzerActiveIcon /> : <OutlineWebFuzzerIcon />
            case "RedTeam_code":
                return isActive ? <OutlineYakRunnerActiveIcon /> : <OutlineYakRunnerIcon />
            case "BlueTeam_code":
                return isActive ? <OutlineChartPieActiveIcon /> : <OutlineChartPieIcon />
            case "yak_memo":
                return isActive ? <SolidYakitPluginIcon /> : <SolidYakitPluginGrayIcon />
            default:
                return isActive ? <OutlineSparklesActiveIcon /> : <OutlineSparklesIcon />
        }
    })

    const isOther = useMemoizedFn((v: string) => {
        return !["RedTeam_vuln", "BlueTeam_com", "RedTeam_code", "BlueTeam_code", "yak_memo"].includes(v)
    })

    const onPromptListByGroup = useMemoizedFn(() => {
        // 切换置顶
        if (promptListRef.current) {
            promptListRef.current.scrollTop = 0
        }
        if (selectLabel === "Team_all") {
            setShowPromptList(promptList)
        } else if (selectLabel === "Team_other") {
            setShowPromptList(promptList.filter((item) => isOther(item.prompt_type)))
        } else {
            setShowPromptList(promptList.filter((item) => item.prompt_type === selectLabel))
        }
    })

    useUpdateEffect(() => {
        onPromptListByGroup()
    }, [promptList, selectLabel])

    const searchSubmit = useMemoizedFn(() => {
        if (searchValue.length > 0) {
            const searchPromptList = showPromptList.filter((obj) => {
                let concatenatedString = ""
                for (const key in obj) {
                    if (Object.hasOwnProperty.call(obj, key)) {
                        concatenatedString += obj[key].toString()
                    }
                }
                return concatenatedString.indexOf(searchValue) !== -1
            })
            setShowPromptList(searchPromptList)
        } else {
            onPromptListByGroup()
        }
    })

    const onClose = useMemoizedFn(() => {
        setVisible(false)
        setSelectItem(undefined)
    })

    const onClickPromptItem = useMemoizedFn((item: PromptListProps) => {
        setVisible(true)
        setSelectItem(item)
    })

    return (
        <div className={styles["layout-prompt"]}>
            <div className={styles["prompt-title"]}>
                <div className={styles["title"]}>
                    <YakChatBookIcon />
                    <span className={styles["sub-title"]}>Prompt</span>
                </div>
                <div className={styles["extra"]}>
                    <Tooltip placement='left' title='向右收起'>
                        <OutlineOpenIcon
                            className={styles["fold-icon"]}
                            onClick={() => {
                                setShowPrompt(false)
                            }}
                        />
                    </Tooltip>
                </div>
            </div>
            <div className={styles["prompt-search"]}>
                <YakitInput.Search
                    placeholder='请输入关键词搜索'
                    size='large'
                    value={searchValue}
                    onChange={(e) => {
                        setSearchValue(e.target.value)
                    }}
                    onSearch={searchSubmit}
                />
            </div>
            <div className={styles["prompt-label"]}>
                {PromptLabelArr.map((item) => (
                    <div
                        className={classNames(styles["prompt-label-item"], {
                            [styles["prompt-label-item-no-active"]]: item !== selectLabel,
                            [styles["prompt-label-item-active"]]: item === selectLabel
                        })}
                        onClick={() => {
                            setSelectLabel(item)
                        }}
                    >
                        <div className={styles["icon"]}>{getLabelIcon(item, item === selectLabel)}</div>
                        <div className={styles["text"]}>{getLabelText(item)}</div>
                        <div className={styles["count"]}>
                            <span>{promptLabel && promptLabel[item]}</span>
                        </div>
                    </div>
                ))}
            </div>
            <div className={styles["prompt-list"]} ref={promptListRef}>
                {showPromptList.map((item) => (
                    <div
                        className={styles["prompt-item"]}
                        onClick={() => {
                            if (isOther(item.prompt_type)) {
                                onSubmitPreset({content: item.title, is_bing: item.is_bing, is_plugin: item.is_plugin})
                            } else {
                                onClickPromptItem(item)
                            }
                        }}
                    >
                        <div className={styles["title"]}>
                            <div className={styles["icon"]}>{getLabelIcon(item.prompt_type, true)}</div>
                            <div className={styles["text"]}>{item.title}</div>
                        </div>
                        {!isOther(item.prompt_type) && (
                            <>
                                <div className={styles["sub-title"]}>
                                    只需输入
                                    {item.templateArr.map((itemIn) => (
                                        <span className={styles["span-label"]}>{itemIn}</span>
                                    ))}
                                    将自动为你生成 Prompt
                                </div>
                                <ExampleCard content={item.eg[0]} />
                            </>
                        )}
                    </div>
                ))}
            </div>
            <YakitDrawer
                // className={styles['drawer-wrapper']}
                className={classNames([styles["chat-cs-prompt-drawer"], styles["drawer-wrapper"]])}
                visible={visible}
                placement='bottom'
                height={452}
                onClose={() => onClose()}
                maskClosable={true}
                getContainer={false}
                closable={false}
            >
                {selectItem && (
                    <ChatCsPromptForm
                        onPromptSubmit={onPromptSubmit}
                        selectItem={selectItem}
                        onClose={() => onClose()}
                    />
                )}
            </YakitDrawer>
        </div>
    )
})
interface ChatCsPromptFormProps {
    selectItem: PromptListProps
    onClose: () => void
    onPromptSubmit?: (v: PresetKeywordProps) => void
}

interface InputObjProps<T> {
    [key: string]: T
}

const ChatCsPromptForm: React.FC<ChatCsPromptFormProps> = memo((props) => {
    const {selectItem, onClose, onPromptSubmit} = props
    const [inputObj, setInputObj] = useState<InputObjProps<string>>({})

    const onSubmit = useMemoizedFn(() => {
        if (Object.keys(inputObj).length !== selectItem.templateArr.length) {
            let arr = selectItem.templateArr.filter((item) => !Object.keys(inputObj).includes(item))
            yakitNotify("error", `请输入${arr.join()}`)
            return
        }

        let content: string = JSON.parse(JSON.stringify(selectItem.template))
        const replacedStr = content.replace(/\|`([^`]+)`\|/g, (match, key) => {
            return inputObj[key] || match
        })

        onPromptSubmit &&
            onPromptSubmit({content: replacedStr, is_bing: selectItem.is_bing, is_plugin: selectItem.is_plugin})
        setTimeout(() => {
            onClose()
        }, 500)
    })

    return (
        <div className={styles["chat-cs-prompt-form"]}>
            <div className={styles["header"]}>
                <div className={styles["title-box"]}>
                    <div className={styles["title"]}>{selectItem.title}</div>
                    <div className={classNames(styles["close-icon"])} onClick={onClose}>
                        <RemoveIcon />
                    </div>
                </div>
            </div>
            <div className={styles["form-box"]}>
                {selectItem.templateArr.map((item) => {
                    return (
                        <div className={styles["form-item"]}>
                            <div className={styles["title"]}>{item}：</div>
                            <div className={styles["input-text-area"]}>
                                <Input.TextArea
                                    autoSize={true}
                                    bordered={false}
                                    className={styles["text-area-wrapper"]}
                                    placeholder={`请输入${item}`}
                                    onChange={(e) => {
                                        if (e.target.value.length === 0 && inputObj.hasOwnProperty(item)) {
                                            const newInputObj = JSON.parse(JSON.stringify(inputObj))
                                            delete newInputObj[item]
                                            setInputObj(newInputObj)
                                        } else {
                                            setInputObj({
                                                ...inputObj,
                                                [item]: e.target.value
                                            })
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )
                })}

                {/* <div className={styles["form-item"]}>
                    <div className={styles["title"]}>情报需求：</div>
                    <div className={styles["input-text-area"]}>
                        <Input.TextArea
                            autoSize={true}
                            bordered={false}
                            className={styles["text-area-wrapper"]}
                            placeholder='请输入情报需求...'
                        />
                    </div>
                </div> */}
                <ExampleCard content={selectItem.eg[0]} background='#F8F8F8' />
            </div>
            <YakitButton icon={<SolidPaperairplaneIcon />} onClick={onSubmit} className={styles["submit"]} size='large'>
                发送
            </YakitButton>
        </div>
    )
})
interface ExampleCardProps {
    content: string
    background?: string
}

const ExampleCard: React.FC<ExampleCardProps> = memo((props) => {
    const {content, background} = props
    // 将Markdown渲染的数据染色
    const highlightStr = useMemoizedFn((str: string) => {
        const newStr: string = str.replaceAll("|`", "<span style='color: #8863F7;'>").replaceAll("`|", "</span>")
        return newStr
    })
    return (
        <div className={styles["example-card"]} style={background ? {background} : {}}>
            <div className={styles["example"]}>示例</div>
            {/* markdown显示 */}
            <div className={styles["detail-content"]}>
                <ChatMarkdown content={highlightStr(content)} />
            </div>
        </div>
    )
})

interface EditNameModalProps {
    width: number | string
    /** 是否被dom节点包含 */
    getContainer: any
    visible: boolean
    setVisible: (visible: boolean) => any
    chatName: string
    onOk: (name: string) => any
}
const EditNameModal: React.FC<EditNameModalProps> = memo((props) => {
    const {width, getContainer, visible, setVisible, chatName, onOk} = props

    const modalWidth = useMemo(() => {
        if (!+width) return 400
        return +width - 40 > 400 ? 400 : +width - 40
    }, [width])

    const [loading, setLoading] = useState<boolean>(false)
    const [name, setName] = useState<string>("")
    useEffect(() => {
        if (visible) {
            setName(chatName)
            setLoading(false)
        } else setName("")
    }, [visible])

    const onSubmit = useMemoizedFn(() => {
        if (!name) {
            yakitNotify("error", "请输入对话标题")
            return
        }
        setLoading(true)
        onOk(name)
    })

    return (
        <YakitModal
            hiddenHeader={true}
            getContainer={getContainer}
            centered={true}
            closable={false}
            footer={null}
            keyboard={false}
            maskClosable={false}
            width={modalWidth}
            visible={visible}
            onCancel={() => setVisible(false)}
            bodyStyle={{padding: 0}}
        >
            <div className={styles["name-edit-modal"]}>
                <div className={styles["name-edit-modal-heard"]}>
                    <div className={styles["name-edit-modal-title"]}>修改对话标题</div>
                    <div className={styles["close-icon"]} onClick={() => setVisible(false)}>
                        <RemoveIcon />
                    </div>
                </div>
                <div className={styles["name-edit-modal-body"]}>
                    <YakitInput.TextArea
                        autoSize={{minRows: 1, maxRows: 3}}
                        showCount
                        value={name}
                        maxLength={50}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                            const keyCode = e.keyCode ? e.keyCode : e.key
                            if (keyCode === 13) {
                                e.stopPropagation()
                                e.preventDefault()
                            }
                        }}
                    />
                </div>
                <div className={styles["name-edit-modal-footer"]}>
                    <YakitButton type='outline2' loading={loading} onClick={() => setVisible(false)}>
                        取消
                    </YakitButton>
                    <YakitButton type='primary' loading={loading} onClick={onSubmit}>
                        确定
                    </YakitButton>
                </div>
            </div>
        </YakitModal>
    )
})
