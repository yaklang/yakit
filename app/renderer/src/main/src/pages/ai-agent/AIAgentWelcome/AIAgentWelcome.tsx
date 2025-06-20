import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {useControllableValue, useDebounceEffect, useMemoizedFn, useSize} from "ahooks"
import {Input} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {SolidPaperairplaneIcon, SolidTemplateIcon, SolidToolIcon} from "@/assets/icon/solid"
import YakitRunQuickly from "@/assets/aiAgent/yakit_run_quickly.gif"
import {AIAgentWelcomeProps} from "./type"
import {AIForge, QueryAIForgeRequest} from "../type/aiChat"
import {grpcQueryAIForge} from "../grpc"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {OutlineArrowleftIcon, OutlineArrowrightIcon} from "@/assets/icon/outline"

import classNames from "classnames"
import styles from "./AIAgentWelcome.module.scss"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import useDispatcher from "../useContext/useDispatcher"

export const AIAgentWelcome: React.FC<AIAgentWelcomeProps> = memo((props) => {
    const {onSearch} = props

    const {onSendTriage} = useDispatcher()

    // #region 问题相关逻辑
    const [question, setQuestion] = useControllableValue<string>(props, {
        defaultValue: "",
        valuePropName: "question",
        trigger: "setQuestion"
    })
    const isQuestion = useMemo(() => {
        return !!(question && question.trim())
    }, [question])

    useDebounceEffect(
        () => {
            onSendTriage && onSendTriage(question)
        },
        [question],
        {wait: 500}
    )
    // #endregion

    // #region  AI-Forge 模板相关逻辑
    const [forges, setForges] = useState<AIForge[]>([])
    const forgesLength = useMemo(() => {
        return forges.length
    }, [forges])
    const fetchForges = useMemoizedFn((names?: string[]) => {
        const request: QueryAIForgeRequest = {
            Pagination: {
                Page: 1,
                Limit: 9,
                Order: "desc",
                OrderBy: "id"
            }
        }
        if (names && Array.isArray(names) && names.length > 0) {
            request.Filter = {ForgeNames: names}
        }
        grpcQueryAIForge(request)
            .then((res) => {
                currentForgeIndex.current = 0
                console.log("re111s", request, res)
                setForges(res.Data || [])
            })
            .catch(() => {})
    })
    useEffect(() => {
        fetchForges()
    }, [])

    // 当前Forge轮播切换的页数(开头的第一个下标)
    const currentForgeIndex = useRef(3)
    // Forge轮播每屏显示数量(默认为3)
    const [forgeColNum, setForgeColNum, getForgeColNum] = useGetSetState(3)

    // 往前翻页按钮的 disabled 状态
    const [isPrevDisabled, setIsPrevDisabled] = useGetSetState(false)
    // 往后翻页按钮的 disabled 状态
    const [isNextDisabled, setIsNextDisabled] = useGetSetState(false)
    const handleJudgeBtnsDisabled = useMemoizedFn(() => {
        setIsPrevDisabled(currentForgeIndex.current === 0)
        setIsNextDisabled((prev) => {
            return currentForgeIndex.current + forgeColNum >= forgesLength
        })
    })

    const forgesCarousel = useRef<HTMLDivElement>(null)
    const carouselSize = useSize(forgesCarousel)

    const handleUpdateForgeCarousel = useMemoizedFn(() => {
        if (forgesCarousel && forgesCarousel.current) {
            if (forgesCarousel.current.children.length === 0) {
                currentForgeIndex.current = 0
            } else {
                const itemWidth = forgesCarousel.current.children[0].getBoundingClientRect().width
                const offset = -currentForgeIndex.current * itemWidth
                forgesCarousel.current.style.transform = `translateX(${offset}px)`
            }
        }
        handleJudgeBtnsDisabled()
    })
    const handleChangeForgeIndex = useMemoizedFn((isNext?: boolean) => {
        const newValue = currentForgeIndex.current + (isNext ? getForgeColNum() : -getForgeColNum())
        if (newValue <= 0) currentForgeIndex.current = 0
        else if (newValue >= forgesLength) {
            currentForgeIndex.current = currentForgeIndex.current
        } else {
            currentForgeIndex.current = newValue
        }

        handleUpdateForgeCarousel()
    })
    useDebounceEffect(
        () => {
            if (forgesCarousel && forgesCarousel.current) {
                const carouselWidth = forgesCarousel.current.getBoundingClientRect().width
                const newForgeColNum = carouselWidth > 700 ? 3 : carouselWidth > 350 ? 2 : 1
                setForgeColNum(newForgeColNum)

                handleUpdateForgeCarousel()
            }
        },
        [carouselSize],
        {wait: 100}
    )
    // #endregion

    return (
        <div className={styles["ai-agent-welcome"]}>
            <div className={styles["welcome-header"]}>
                <img className={styles["img-wrapper"]} src={YakitRunQuickly} alt='牛牛快跑' />
                <div className={styles["title"]}>AI-Agent 安全助手</div>
                <div className={styles["sub-title"]}>专注于安全编码与漏洞分析的智能助手</div>
            </div>

            <div className={styles["welcome-input"]}>
                <div className={styles["ai-agent-input"]}>
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
                                onSearch()
                            }
                        }}
                    />

                    <div className={styles["question-footer"]}>
                        <YakitButton disabled={!isQuestion} icon={<SolidPaperairplaneIcon />} onClick={onSearch} />
                    </div>
                </div>
            </div>

            <div className={styles["welcome-line"]}>
                <svg xmlns='http://www.w3.org/2000/svg' width='201' height='2' viewBox='0 0 201 2' fill='none'>
                    <path d='M0.5 1H200.5' stroke='url(#paint0_linear_41757_32575)' />
                    <defs>
                        <linearGradient
                            id='paint0_linear_41757_32575'
                            x1='0.5'
                            y1='1.5'
                            x2='200.5'
                            y2='1.5'
                            gradientUnits='userSpaceOnUse'
                        >
                            <stop stop-color='#F8F9FA' />
                            <stop offset='1' stop-color='#E6E8ED' />
                        </linearGradient>
                    </defs>
                </svg>
                <div className={styles["line-title"]}>以下模版可能有你需要的</div>
                <svg xmlns='http://www.w3.org/2000/svg' width='201' height='2' viewBox='0 0 201 2' fill='none'>
                    <path d='M0.5 1H200.5' stroke='url(#paint0_linear_41757_32572)' />
                    <defs>
                        <linearGradient
                            id='paint0_linear_41757_32572'
                            x1='0.5'
                            y1='1.5'
                            x2='200.5'
                            y2='1.5'
                            gradientUnits='userSpaceOnUse'
                        >
                            <stop stop-color='#E6E8ED' />
                            <stop offset='1' stop-color='#F8F9FA' />
                        </linearGradient>
                    </defs>
                </svg>

                <div className={styles["forge-switch-btns"]}>
                    <YakitButton
                        className={styles["btn-style"]}
                        type='outline2'
                        icon={<OutlineArrowleftIcon />}
                        disabled={isPrevDisabled}
                        onClick={() => handleChangeForgeIndex()}
                    />
                    <YakitButton
                        className={styles["btn-style"]}
                        type='outline2'
                        icon={<OutlineArrowrightIcon />}
                        disabled={isNextDisabled}
                        onClick={() => handleChangeForgeIndex(true)}
                    />
                </div>
            </div>

            <div className={styles["welcome-forge"]}>
                <div className={styles["ai-forges-carousel"]}>
                    <div ref={forgesCarousel} className={styles["ai-forges-carousel-container"]}>
                        {forges.map((forge) => {
                            const {Id, ForgeName, Description, ToolNames} = forge
                            const tools = (ToolNames || []).filter(Boolean)
                            return (
                                <div
                                    key={Id}
                                    className={classNames(styles["ai-forge-template"], {
                                        [styles["one-template"]]: forgeColNum === 1,
                                        [styles["two-template"]]: forgeColNum === 2,
                                        [styles["three-template"]]: forgeColNum === 3
                                    })}
                                >
                                    <div className={styles["template-wrapper"]}>
                                        <div className={styles["template-name"]}>
                                            <SolidTemplateIcon />
                                            <div
                                                className={classNames(
                                                    styles["name-style"],
                                                    "yakit-content-single-ellipsis"
                                                )}
                                                title={ForgeName}
                                            >
                                                {ForgeName}
                                            </div>
                                        </div>

                                        <div className={styles["template-data"]}>
                                            <div
                                                className={classNames(
                                                    styles["data-description"],
                                                    "yakit-content-multiLine-ellipsis"
                                                )}
                                                title={Description || "-"}
                                            >
                                                {Description || "-"}
                                            </div>

                                            {tools.length > 0 && (
                                                <div className={styles["data-tools"]}>
                                                    <div className={styles["tools-header"]}>
                                                        <SolidToolIcon />
                                                        关联工具
                                                    </div>

                                                    <div className={styles["tools-body"]}>
                                                        {tools.map((tool) => {
                                                            return (
                                                                <YakitTag key={tool} className={styles["tool-tag"]}>
                                                                    {tool}
                                                                </YakitTag>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
})
