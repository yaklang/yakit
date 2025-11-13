import React, {useEffect, useId, useRef, useState} from "react"
import {AIChatWelcomeProps, AIRecommendItemProps, AIRecommendProps} from "./type"
import styles from "./AIChatWelcome.module.scss"
import {ColorsChatIcon} from "@/assets/icon/colors"
import {AIChatTextarea} from "../template/template"
import {useCreation, useMemoizedFn} from "ahooks"
import {AIChatTextareaProps} from "../template/type"
import {AIModelSelect} from "../aiModelList/aiModelSelect/AIModelSelect"
import AIReviewRuleSelect from "@/pages/ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineArrowrightIcon, OutlineInformationcircleIcon, OutlineRefreshIcon} from "@/assets/icon/outline"
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
import {Tooltip} from "antd"
import ReactResizeDetector from "react-resize-detector"
import emiter from "@/utils/eventBus/eventBus"
import {AIAgentTabListEnum} from "../defaultConstant"
import {YakitRoute} from "@/enums/yakitRoute"

const AIChatWelcome: React.FC<AIChatWelcomeProps> = React.memo((props) => {
    const {onTriageSubmit} = props
    // #region 问题相关逻辑
    const textareaProps: AIChatTextareaProps["textareaProps"] = useCreation(() => {
        return {
            placeholder: "请告诉我，你想做什么...(shift + enter 换行)"
        }
    }, [])

    const [question, setQuestion] = useState<string>("")
    const [lineStartDOMRect, setLineStartDOMRect] = useState<DOMRect>()
    const [checkItems, setCheckItems] = useState<string[]>([])
    const lineStartRef = useRef<HTMLDivElement>(null)

    const resizeUpdate = useMemoizedFn(() => {
        if (!lineStartRef.current) return
        const lineStartRect = lineStartRef.current.getBoundingClientRect()
        setLineStartDOMRect(lineStartRect) // 确定初始定位点位置
    })

    const handleTriageSubmit = useMemoizedFn((qs: string) => {
        onTriageSubmit(qs)
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
        emiter.emit("switchAIAgentTab", AIAgentTabListEnum.Forge_Name)
    })
    const onKnowledgeBaseMore = useMemoizedFn(() => {
        emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.AI_REPOSITORY}))
    })
    const onToolMore = useMemoizedFn(() => {
        emiter.emit("switchAIAgentTab", AIAgentTabListEnum.Tool)
    })

    const onCheckItem = useMemoizedFn((item: string) => {
        if (checkItems.includes(item)) {
            setCheckItems((c) => c.filter((i) => i !== item))
        } else {
            setCheckItems([...checkItems, item])
        }
    })

    return (
        <div className={styles["ai-chat-welcome-wrapper"]}>
            <div className={styles["content"]}>
                <div className={styles["content-absolute"]}>
                    <div className={styles["input-wrapper"]}>
                        <div className={styles["input-heard"]}>
                            <div className={styles["title"]}>AI-Agent 安全助手</div>
                            <div className={styles["subtitle"]}>专注于安全编码与漏洞分析的智能助手</div>
                        </div>
                        <div className={styles["input-body-wrapper"]}>
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
                                className={styles["input-body"]}
                            >
                                {/* svg 定位点1/left */}
                                <div className={styles["line"]} ref={lineStartRef} />
                            </AIChatTextarea>
                        </div>
                        {checkItems.length > 0 ? (
                            <div className={styles["suggestion-tips-wrapper"]}>
                                <div className={styles["suggestion-tips-title"]}>
                                    <span>你可能想问:</span>
                                    <YakitButton
                                        icon={<OutlineRefreshIcon />}
                                        size='small'
                                        type='text'
                                        className={styles["line2-btn"]}
                                    >
                                        换一换
                                    </YakitButton>
                                </div>
                                <div className={styles["suggestion-tips-list"]}>
                                    {["这里是 AI 推荐选项 1", "这里是推荐选项 2", "这里是 AI 推荐选项 333333"].map(
                                        (item) => (
                                            <div key={item} className={styles["suggestion-tips-item"]}>
                                                <div className={styles["suggestion-tips-item-text"]}>{item}</div>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>

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
                            >
                                换一换
                            </YakitButton>
                        </div>
                        <div className={styles["recommend-body"]}>
                            {["工具", "知识库", "智能体"].map((item) => (
                                <AIRecommend
                                    icon={<AIToolIcon />}
                                    hoverIcon={<HoverAIToolIcon />}
                                    key={item}
                                    title={item}
                                    data={[
                                        `${item}1查询当前目录中的 Yak 文件包查询当`,
                                        `${item}2查询当前目录中的 Yak 文件包查询当`,
                                        `${item}3查询当前目录中的 Yak 文件包查询当`
                                    ]}
                                    lineStartDOMRect={lineStartDOMRect}
                                    onMore={() => onMore(item)}
                                    onCheckItem={onCheckItem}
                                    checkItems={checkItems}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
})

export default AIChatWelcome

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
                        key={item}
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
            <span className={styles["text"]}>{item}</span>
            <Tooltip title={item}>
                <OutlineInformationcircleIcon className={styles["info-icon"]} />
            </Tooltip>
        </div>
    )
})
