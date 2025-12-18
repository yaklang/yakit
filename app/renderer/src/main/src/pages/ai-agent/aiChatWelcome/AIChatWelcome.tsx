import React, {useEffect, useId, useMemo, useRef, useState} from "react"
import {
    AIChatWelcomeProps,
    AIMaterialsData,
    AIRecommendItemProps,
    AIRecommendProps,
    RandomAIMaterialsDataProps,
    SideSettingButtonProps
} from "./type"
import styles from "./AIChatWelcome.module.scss"
import {AIChatTextarea} from "../template/template"
import {useCreation, useDebounceEffect, useDebounceFn, useInViewport, useMemoizedFn} from "ahooks"
import {AIChatTextareaProps} from "../template/type"
import {AIModelSelect} from "../aiModelList/aiModelSelect/AIModelSelect"
import AIReviewRuleSelect from "@/pages/ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineArrowrightIcon,
    OutlineInformationcircleIcon,
    OutlinePinIcon,
    OutlinePinOffIcon,
    OutlineRefreshIcon
} from "@/assets/icon/outline"
import {
    AIDownAngleLeftIcon,
    AIDownAngleRightIcon,
    AIForgeIcon,
    AIKnowledgeBaseIcon,
    AIToolIcon,
    AIUpAngleLeftIcon,
    AIUpAngleRightIcon,
    HoverAIForgeIcon,
    HoverAIKnowledgeBaseIcon,
    HoverAIToolIcon
} from "./icon"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {Divider, Tooltip} from "antd"
import ReactResizeDetector from "react-resize-detector"
import emiter from "@/utils/eventBus/eventBus"
import {AIAgentTabListEnum, SwitchAIAgentTabEventEnum} from "../defaultConstant"
import {YakitRoute} from "@/enums/yakitRoute"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {randomString} from "@/utils/randomUtil"
import {grpcGetRandomAIMaterials} from "../grpc"
import {apiDebugPlugin, DebugPluginRequest} from "@/pages/plugins/utils"
import {GetRandomAIMaterialsResponse} from "@/pages/ai-re-act/hooks/grpcApi"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import classNames from "classnames"
import {defPluginExecuteFormValue} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/constants"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {isEqual} from "lodash"
import {historyStore, loadRemoteHistory} from "../components/aiFileSystemList/store/useHistoryFolder"

import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import FileTreeList from "./FileTreeList/FileTreeList"
import {useCustomFolder} from "../components/aiFileSystemList/store/useCustomFolder"
import FreeDialogFileList from "./FreeDialogFileList/FreeDialogFileList"
import {FileListStoreKey, fileToChatQuestionStore} from "@/pages/ai-re-act/aiReActChat/store"
import OpenFileDropdown, {OpenFileDropdownItem} from "./OpenFileDropdown/OpenFileDropdown"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {OutlinePlusIcon} from "@/assets/newIcon"
import {RemoteAIAgentGV} from "@/enums/aiAgent"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
const getRandomItems = (array, count = 3) => {
    const shuffled = [...array].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, count)
}

const randomAIMaterialsDataIsEmpty = (randObj) => {
    try {
        return (
            randObj.tools.data.length === 0 &&
            randObj.forges.data.length === 0 &&
            randObj.knowledgeBases.data.length === 0
        )
    } catch (error) {
        return true
    }
}

const AIChatWelcome: React.FC<AIChatWelcomeProps> = React.memo((props) => {
    const {t, i18n} = useI18nNamespaces(["AIAgent"])
    const {onTriageSubmit, onSetReAct} = props

    const {queryPagesDataById, removePagesDataCacheById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById,
            updatePagesDataCacheById: s.updatePagesDataCacheById,
            removePagesDataCacheById: s.removePagesDataCacheById
        }),
        shallow
    )

    const initKnowledgeStr = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.AI_Agent, YakitRoute.AI_Agent)
        return currentItem?.pageParamsInfo.AIRepository?.inputString ?? ""
    })

    // #region 问题相关逻辑
    const textareaProps: AIChatTextareaProps["textareaProps"] = useCreation(() => {
        return {
            placeholder: "请告诉我，你想做什么...(shift + enter 换行)"
        }
    }, [])

    useEffect(() => {
        const konwledgeInputStringFn = (params: string) => {
            try {
                const data: PageNodeItemProps["pageParamsInfo"]["AIRepository"] = JSON.parse(params)
                setQuestion(data?.inputString ?? "")
                removePagesDataCacheById(YakitRoute.AI_Agent, YakitRoute.AI_Agent)
            } catch (error) {}
        }
        emiter.on("konwledgeInputString", konwledgeInputStringFn)
        return () => {
            emiter.off("konwledgeInputString", konwledgeInputStringFn)
        }
    }, [])

    const [randomAIMaterials, setRandomAIMaterials] = useState<GetRandomAIMaterialsResponse>()
    const [question, setQuestion] = useState<string>(initKnowledgeStr())
    const [lineStartDOMRect, setLineStartDOMRect] = useState<DOMRect>()
    const [checkItems, setCheckItems] = useState<AIRecommendItemProps["item"][]>([])
    const [questionList, setQuestionList] = useState<string[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [loadingAIMaterials, setLoadingAIMaterials] = useState<boolean>(false)

    // 控制下拉菜单
    const [openDrawer, setOpenDrawer] = useState<boolean>(false)

    const lineStartRef = useRef<HTMLDivElement>(null)
    const welcomeRef = useRef<HTMLDivElement>(null)
    const questionListAllRef = useRef<StreamResult.Log[]>([])

    const [inViewPort = true] = useInViewport(welcomeRef)

    const tokenRef = useRef<string>(randomString(40))
    const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
        taskName: "debug-plugin",
        apiKey: "DebugPlugin",
        token: tokenRef.current,
        isShowError: false,
        isShowEnd: false,
        isLimitLogs: false,
        onEnd: () => {
            setLoading(false)
            debugPluginStreamEvent.stop()
        }
    })

    useEffect(() => {
        if (inViewPort) {
            getRandomAIMaterials()
        }
    }, [inViewPort])

    useDebounceEffect(
        () => {
            const list = streamInfo.logState.filter((i) => i.level === "text").map((i) => i.data)
            questionListAllRef.current = [...list]
            const randList = list.slice(0, 3)
            if (list.length > 0 && !isEqual(randList, questionList)) {
                setQuestionList([...randList])
            }
        },
        [streamInfo.logState],
        {wait: 500, leading: true}
    )

    useDebounceEffect(
        () => {
            if (checkItems.length > 0) {
                onStartExecute()
            }
        },
        [checkItems],
        {wait: 500, leading: true}
    )
    const onStartExecute = useMemoizedFn(() => {
        debugPluginStreamEvent.cancel()
        debugPluginStreamEvent.stop()
        debugPluginStreamEvent.reset()
        const toolNames: string[] = []
        const forgeNames: string[] = []
        const knowledgeNames: string[] = []
        checkItems.forEach((item) => {
            switch (item.type) {
                case "工具":
                    toolNames.push(item.name)
                    break
                case "智能体":
                    forgeNames.push(item.name)
                    break
                case "知识库":
                    knowledgeNames.push(item.name)
                    break
                default:
                    break
            }
        })
        const params: DebugPluginRequest = {
            Code: "",
            PluginType: "yak",
            Input: "",
            HTTPRequestTemplate: {
                ...defPluginExecuteFormValue
            },
            ExecParams: [
                {
                    Key: "query",
                    Value: JSON.stringify({
                        tools: toolNames,
                        forges: forgeNames,
                        knowledge_bases: knowledgeNames
                    })
                }
            ],
            PluginName: "简易意图识别"
        }
        apiDebugPlugin({
            params: params,
            token: tokenRef.current,
            isShowStartInfo: false
        }).then(() => {
            debugPluginStreamEvent.start()
            setTimeout(() => {
                setLoading(true)
            }, 100)
        })
    })

    const getRandomAIMaterials = useMemoizedFn(() => {
        if (loadingAIMaterials) return
        setLoadingAIMaterials(true)
        grpcGetRandomAIMaterials({Limit: 3})
            .then((res) => {
                debugPluginStreamEvent.stop()
                setRandomAIMaterials(res)
                setCheckItems([])
                setQuestionList([])
                questionListAllRef.current = []
            })
            .finally(() =>
                setTimeout(() => {
                    setLoadingAIMaterials(false)
                }, 200)
            )
    })

    const resizeUpdate = useMemoizedFn(() => {
        if (!lineStartRef.current) return
        const lineStartRect = lineStartRef.current.getBoundingClientRect()
        setLineStartDOMRect(lineStartRect) // 确定初始定位点位置
    })

    const handleTriageSubmit = useMemoizedFn((qs: string) => {
        onTriageSubmit(qs)
        fileToChatQuestionStore.clear(FileListStoreKey.FileList)
        setQuestion("")
    })
    const onMore = useMemoizedFn((item: string) => {
        switch (item) {
            case "智能体":
                onForgeMore()
                break
            case "知识库":
                onKnowledgeBaseMore()
                break
            case "工具":
                onToolMore()
                break
            default:
                break
        }
    })
    const onForgeMore = useMemoizedFn(() => {
        emiter.emit(
            "switchAIAgentTab",
            JSON.stringify({
                type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE,
                params: {
                    active: AIAgentTabListEnum.Forge_Name,
                    show: true
                }
            })
        )
    })
    const onKnowledgeBaseMore = useMemoizedFn(() => {
        emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.AI_REPOSITORY}))
    })
    const onToolMore = useMemoizedFn(() => {
        emiter.emit(
            "switchAIAgentTab",
            JSON.stringify({
                type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE,
                params: {
                    active: AIAgentTabListEnum.Tool,
                    show: true
                }
            })
        )
    })

    const onCheckItem = useMemoizedFn((item: AIRecommendItemProps["item"]) => {
        if (checkItems.includes(item)) {
            setCheckItems((c) => c.filter((i) => i.name !== item.name))
        } else {
            setCheckItems([...checkItems, item])
        }
    })

    const randomAIMaterialsData: RandomAIMaterialsDataProps = useCreation(() => {
        const tools: AIMaterialsData = {
            type: "工具",
            data: (randomAIMaterials?.AITools || []).map((tool) => ({
                type: "工具",
                name: tool.VerboseName || tool.Name,
                description: tool.Description || ""
            })),
            icon: <AIToolIcon />,
            hoverIcon: <HoverAIToolIcon />
        }
        const forges: AIMaterialsData = {
            type: "智能体",
            data: (randomAIMaterials?.AIForges || []).map((forge) => ({
                type: "智能体",
                name: forge.ForgeVerboseName || forge.ForgeName,
                description: forge.Description || ""
            })),
            icon: <AIForgeIcon />,
            hoverIcon: <HoverAIForgeIcon />
        }
        const knowledgeBases: AIMaterialsData = {
            type: "知识库",
            data: (randomAIMaterials?.KnowledgeBaseEntries || []).map((knowledgeBase) => ({
                type: "知识库",
                name: knowledgeBase.KnowledgeTitle || knowledgeBase.Summary,
                description: knowledgeBase.KnowledgeDetails || ""
            })),
            icon: <AIKnowledgeBaseIcon />,
            hoverIcon: <HoverAIKnowledgeBaseIcon />
        }
        return {
            tools,
            forges,
            knowledgeBases
        }
    }, [randomAIMaterials])
    const isEmptyAIMaterials = useCreation(() => {
        return randomAIMaterialsDataIsEmpty(randomAIMaterialsData)
    }, [randomAIMaterials])
    const onSwitchQuestion = useMemoizedFn(() => {
        setCheckItems([])
        setQuestionList(getRandomItems(questionListAllRef.current))
    })

    const customFolder = useCustomFolder()

    const onOpenFileFolder = async (data: OpenFileDropdownItem) => {
        if (!data.path) return
        loadRemoteHistory().then(() => {
            historyStore.addHistoryItem(data)
            setOpenDrawer(true)
        })
    }

    return (
        <div className={styles["ai-chat-welcome-wrapper"]} ref={welcomeRef}>
            <div className={styles["open-file-tree-button"]}>
                {!customFolder.length ? (
                    <OpenFileDropdown cb={onOpenFileFolder}>
                        <YakitButton type='outline1'>打开文件夹管理</YakitButton>
                    </OpenFileDropdown>
                ) : (
                    <YakitButton onClick={() => setOpenDrawer(!openDrawer)} type='outline1'>
                        {openDrawer ? "收起" : "展开"}
                    </YakitButton>
                )}
                <Divider type='vertical' />
                <SideSettingButton />
            </div>
            <div
                className={`${styles["file-tree-list"]} ${
                    customFolder.length && openDrawer ? styles["open"] : styles["close"]
                }`}
            >
                <div className={styles["file-tree-list-inner"]}>
                    <FileTreeList />
                </div>
            </div>
            <div className={styles["content"]}>
                <div className={styles["content-absolute"]}>
                    <div className={styles["input-wrapper"]}>
                        <div className={styles["input-heard"]}>
                            <div className={styles["title"]}>Memfit AI Agent</div>
                            <div className={styles["subtitle"]}>{t("AIAgent.WelcomeHomeSubTitle")}</div>
                        </div>
                        <div className={styles["input-body-wrapper"]}>
                            <FreeDialogFileList storeKey={FileListStoreKey.FileList} />
                            <ReactResizeDetector
                                onResize={(_, height) => {
                                    if (!height) return
                                    resizeUpdate()
                                }}
                                handleWidth={false}
                                handleHeight={true}
                                refreshMode={"debounce"}
                                refreshRate={50}
                            />
                            <AIChatTextarea
                                question={question}
                                setQuestion={setQuestion}
                                textareaProps={textareaProps}
                                onSubmit={handleTriageSubmit}
                                extraFooterLeft={
                                    <>
                                        <AIModelSelect />
                                        <React.Suspense fallback={<div>loading...</div>}>
                                            <AIReviewRuleSelect />
                                        </React.Suspense>
                                    </>
                                }
                                className={classNames({
                                    [styles["input-body"]]: !isEmptyAIMaterials
                                })}
                            >
                                {/* svg 定位点1/left */}
                                <div className={styles["line"]} ref={lineStartRef} />
                            </AIChatTextarea>
                        </div>

                        {checkItems.length > 0 ? (
                            <div className={styles["suggestion-tips-wrapper"]}>
                                <div className={styles["suggestion-tips-title"]}>
                                    <span>你可能想问:</span>
                                    {loading ? (
                                        <YakitSpin size='small' wrapperClassName={styles["loading-spinner"]} />
                                    ) : (
                                        questionList.length > 2 && (
                                            <YakitButton
                                                icon={<OutlineRefreshIcon />}
                                                size='small'
                                                type='text'
                                                className={styles["line2-btn"]}
                                                onClick={onSwitchQuestion}
                                            >
                                                换一换
                                            </YakitButton>
                                        )
                                    )}
                                </div>
                                <div className={styles["suggestion-tips-list"]}>
                                    {questionList.map((item) => (
                                        <div
                                            key={item}
                                            className={styles["suggestion-tips-item"]}
                                            onClick={() => setQuestion(item)}
                                        >
                                            <div className={styles["suggestion-tips-item-text"]}>{item}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>
                    {!isEmptyAIMaterials && (
                        <div className={styles["recommend-wrapper"]}>
                            <AIDownAngleLeftIcon className={styles["recommend-down-left"]} />
                            <AIDownAngleRightIcon className={styles["recommend-down-right"]} />
                            <AIUpAngleLeftIcon className={styles["recommend-up-left"]} />
                            <AIUpAngleRightIcon className={styles["recommend-up-right"]} />
                            <div className={styles["recommend-heard"]}>
                                <div className={styles["title"]}>首页推荐</div>
                                <YakitButton
                                    icon={<OutlineRefreshIcon />}
                                    size='small'
                                    type='text'
                                    className={styles["line2-btn"]}
                                    onClick={getRandomAIMaterials}
                                >
                                    换一换
                                </YakitButton>
                            </div>
                            <YakitSpin spinning={loadingAIMaterials}>
                                <div className={styles["recommend-body"]}>
                                    {Object.keys(randomAIMaterialsData).map((key) => {
                                        const aiItem: AIMaterialsData =
                                            randomAIMaterialsData[key as keyof typeof randomAIMaterialsData]
                                        return aiItem.data.length > 0 ? (
                                            <AIRecommend
                                                icon={aiItem.icon}
                                                hoverIcon={aiItem.hoverIcon}
                                                key={aiItem.type}
                                                title={aiItem.type}
                                                data={aiItem.data}
                                                lineStartDOMRect={lineStartDOMRect}
                                                onMore={() => onMore(aiItem.type)}
                                                onCheckItem={onCheckItem}
                                                checkItems={checkItems}
                                            />
                                        ) : (
                                            <React.Fragment key={aiItem.type}></React.Fragment>
                                        )
                                    })}
                                </div>
                            </YakitSpin>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
})

export default AIChatWelcome

export const SideSettingButton: React.FC<SideSettingButtonProps> = React.memo((props) => {
    const [isAutoHidden, setIsAutoHidden] = useState<boolean>(true)
    useEffect(() => {
        onGetSideSetting()
    }, [])
    const onGetSideSetting = useMemoizedFn(() => {
        getRemoteValue(RemoteAIAgentGV.AIAgentSideShowMode)
            .then((res) => {
                setIsAutoHidden(res !== "false")
            })
            .catch(() => {})
    })
    const onSideSetting = useDebounceFn(
        useMemoizedFn((e) => {
            e.stopPropagation()
            const checked = !isAutoHidden
            setIsAutoHidden(checked)
            setRemoteValue(RemoteAIAgentGV.AIAgentSideShowMode, `${checked}`)
        }),
        {wait: 200, leading: true}
    ).run
    return (
        <Tooltip
            title={
                isAutoHidden
                    ? "已开启固定菜单栏，点击icon则可关闭"
                    : "点击icon高亮后则开启固定菜单栏，菜单栏不会在失焦后自动关闭"
            }
        >
            <YakitButton
                type={isAutoHidden ? "text2" : "outline1"}
                icon={isAutoHidden ? <OutlinePinOffIcon /> : <OutlinePinIcon />}
                onClick={onSideSetting}
                {...props}
            />
        </Tooltip>
    )
})

const AIRecommend: React.FC<AIRecommendProps> = React.memo((props) => {
    const {icon, hoverIcon, title, data, lineStartDOMRect, onMore, onCheckItem, checkItems} = props
    return (
        <div className={styles["recommend-list-wrapper"]}>
            <AIDownAngleLeftIcon className={styles["down-left"]} />
            <AIDownAngleRightIcon className={styles["down-right"]} />
            <AIUpAngleLeftIcon className={styles["up-left"]} />
            <AIUpAngleRightIcon className={styles["up-right"]} />
            <div className={styles["recommend-list-heard"]}>
                <div className={styles["title"]}>
                    <div className={styles["icon"]}>{icon}</div>
                    <div className={styles["hover-icon"]}>{hoverIcon}</div>
                    {title}
                </div>
                <YakitButton className={styles["more-btn"]} type='text' size='small' onClick={onMore}>
                    更多
                    <OutlineArrowrightIcon />
                </YakitButton>
            </div>
            <div className={styles["recommend-list"]}>
                {data.map((item, index) => (
                    <AIRecommendItem
                        key={index} //不需要缓存，每次刷新重新渲染
                        item={item}
                        lineStartDOMRect={lineStartDOMRect}
                        onCheckItem={onCheckItem}
                        checkItems={checkItems}
                    />
                ))}
            </div>
        </div>
    )
})

const AIRecommendItem: React.FC<AIRecommendItemProps> = React.memo((props) => {
    const {item, lineStartDOMRect, onCheckItem, checkItems} = props
    const [svgBox, setSvgBox] = useState({width: 0, height: 0, isUp: true})
    const dotRef = useRef<HTMLDivElement>(null)
    const colorLineIconId = useId()

    useEffect(() => {
        const linePointLeft = lineStartDOMRect
        const linePointRight = dotRef.current?.getBoundingClientRect()
        if (!linePointLeft || !linePointRight) return
        const isUp = (linePointRight.y || 0) < (linePointLeft.y || 0)
        const svgWidth = Math.abs(linePointRight.left - linePointLeft.right) - 4
        const svgHeight = isUp
            ? Math.abs(linePointRight.top - linePointLeft.bottom)
            : Math.abs(linePointRight.top - linePointLeft.bottom) + 3

        setSvgBox({width: svgWidth, height: svgHeight, isUp})
    }, [lineStartDOMRect])
    const generatePath = useMemoizedFn(() => {
        const height = svgBox.height
        const width = svgBox.width
        const curvature = 0.8

        if (svgBox.isUp) {
            const startX = -2
            const startY = height
            const endX = width
            const endY = 0

            const control1X = width * curvature
            const control1Y = height

            const control2X = width * (1 - curvature)
            const control2Y = 0

            return `M ${startX} ${startY} 
                C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`
        } else {
            const startX = 0
            const startY = 0
            const endX = width
            const endY = height

            // 控制点1：向右下方弯曲
            const control1X = width * curvature
            const control1Y = 0

            // 控制点2：向左下方弯曲（形成S形）
            const control2X = width * (1 - curvature)
            const control2Y = height

            return `M ${startX} ${startY} 
                    C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`
        }
    })
    const svgStyle = useCreation(() => {
        return {
            top: svgBox.isUp ? `calc(50%)` : undefined,
            bottom: svgBox.isUp ? undefined : `calc(50% - 3px)`,
            left: `calc(${-svgBox.width}px + -16px)`
        }
    }, [svgBox.isUp, svgBox.width])

    const colorLineIcon = useCreation(() => {
        return (
            <svg
                width={svgBox.width}
                height={svgBox.height}
                style={svgStyle}
                viewBox={`0 0 ${svgBox.width} ${svgBox.height}`}
                xmlns='http://www.w3.org/2000/svg'
                className={styles["color-line-svg"]}
            >
                <path d={generatePath()} stroke={`url(#${colorLineIconId})`} strokeLinecap='round' />
                <defs>
                    <linearGradient
                        id={colorLineIconId}
                        x1='0.5'
                        y1='0.5'
                        x2='64.6787'
                        y2='8.55444'
                        gradientUnits='userSpaceOnUse'
                    >
                        <stop stopColor='#DC5CDF' />
                        <stop offset='0.639423' stopColor='#8862F8' />
                        <stop offset='1' stopColor='#4493FF' />
                    </linearGradient>
                </defs>
            </svg>
        )
    }, [svgBox.width, svgBox.height, svgStyle])
    const lineIcon = useCreation(() => {
        return (
            <svg
                width={svgBox.width}
                height={svgBox.height}
                style={svgStyle}
                viewBox={`0 0 ${svgBox.width} ${svgBox.height}`}
                xmlns='http://www.w3.org/2000/svg'
                className={styles["line-svg"]}
            >
                <path d={generatePath()} stroke='var(--Colors-Use-Neutral-Border)' strokeLinecap='round' />
            </svg>
        )
    }, [svgBox.width, svgBox.height, svgStyle])
    return (
        <div className={styles["recommend-list-item"]} onClick={() => onCheckItem(item)}>
            <div className={styles["line-container"]} onClick={(e) => e.stopPropagation()}>
                {lineIcon}
                {colorLineIcon}
            </div>
            <div className={styles["line-dot"]} onClick={(e) => e.stopPropagation()}>
                {/* svg 定位点2/right */}
                <div className={styles["line-end"]} ref={dotRef} />
            </div>
            <YakitCheckbox checked={checkItems.includes(item)} onChange={() => onCheckItem(item)} />
            <span className={styles["text"]}>{item.name}</span>
            <Tooltip title={item.description}>
                <OutlineInformationcircleIcon className={styles["info-icon"]} />
            </Tooltip>
        </div>
    )
})
