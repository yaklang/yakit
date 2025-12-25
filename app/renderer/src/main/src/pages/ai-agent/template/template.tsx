import React, {
    ChangeEventHandler,
    forwardRef,
    KeyboardEventHandler,
    memo,
    Ref,
    RefAttributes,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react"
import {AIChatTextareaProps, AIChatTextareaSubmit, QSInputTextareaProps} from "./type"
import {Input} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineArrowupIcon} from "@/assets/icon/outline"
import {useControllableValue, useCreation, useDebounceEffect, useDebounceFn, useInViewport, useMemoizedFn} from "ahooks"
import {TextAreaRef} from "antd/lib/input/TextArea"
import {v4 as uuidv4} from "uuid"

import classNames from "classnames"
import styles from "./template.module.scss"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {AIChatMention} from "../components/aiChatMention/AIChatMention"
import {AIMentionTabsEnum} from "../defaultConstant"
import {FreeDialogTagList} from "../aiChatWelcome/FreeDialogList/FreeDialogList"
import FreeDialogFileList from "../aiChatWelcome/FreeDialogFileList/FreeDialogFileList"
import {FileListStoreKey, fileToChatQuestionStore, useFileToQuestion} from "@/pages/ai-re-act/aiReActChat/store"
import emiter from "@/utils/eventBus/eventBus"
import {AIAgentTriggerEventInfo} from "../aiAgentType"
import {AIChatMentionSelectItem} from "../components/aiChatMention/type"
import {isArray} from "lodash"
import useChatIPCStore from "../useContext/ChatIPCContent/useStore"
import useChatIPCDispatcher from "../useContext/ChatIPCContent/useDispatcher"

/** @name AI-Agent专用Textarea组件,行高为20px */
export const QSInputTextarea: React.FC<QSInputTextareaProps & RefAttributes<TextAreaRef>> = memo(
    forwardRef((props, ref: Ref<TextAreaRef>) => {
        const {className, ...rest} = props

        return (
            <Input.TextArea
                {...rest}
                ref={ref}
                className={classNames(styles["qs-input-textarea"], className)}
                bordered={false}
                autoSize={true}
            />
        )
    })
)

/**
 * @name chat-问题输入框(带提交按钮)
 * @description
 * - 默认行高是20px, 默认最大行数是5行,
 * - 想调整最大行数，需在 textareaProps 里传入 className 控制 maxHeight(注意，需要带上!important修饰)
 * - !!! 调整行数只能通过 className 控制，style 会被 antd 逻辑覆盖
 */
export const AIChatTextarea: React.FC<AIChatTextareaProps> = memo((props) => {
    const {loading, extraFooterLeft, extraFooterRight, onSubmit, textareaProps, className, children} = props

    // icon的唯一id生成
    const iconId = useRef(uuidv4())
    const fileToQuestion = useFileToQuestion(FileListStoreKey.FileList)
    // #region question-相关逻辑
    const [question, setQuestion] = useControllableValue<string>(props, {
        defaultValue: "",
        valuePropName: "question",
        trigger: "setQuestion"
    })
    const {selectForges, selectTools, selectKnowledgeBases} = useChatIPCStore()
    const {setSelectForges, setSelectTools, setSelectKnowledgeBases} = useChatIPCDispatcher()
    const aiChatTextareaRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(aiChatTextareaRef)
    useEffect(() => {
        if (!inViewport) return
        emiter.on("settingInputCard", onSettingInputCard)
        return () => {
            emiter.off("settingInputCard", onSettingInputCard)
        }
    }, [inViewport])
    useDebounceEffect(
        () => {
            const value: AIAgentTriggerEventInfo = {
                type: AIMentionTabsEnum.KnowledgeBase,
                params: selectKnowledgeBases
            }
            emiter.emit("updateOfInputCard", JSON.stringify(value))
        },
        [selectKnowledgeBases],
        {wait: 200, leading: true}
    )
    const isQuestion = useMemo(() => {
        return !!(question && question.trim())
    }, [question])

    const handleSubmit = useMemoizedFn(() => {
        if (!isQuestion) return
        const value: AIChatTextareaSubmit = {
            qs: question.trim(),
            selectForges,
            selectTools,
            selectKnowledgeBases,
            fileToQuestion
        }
        onSubmit && onSubmit(value)
        setSelectForges([])
        setSelectTools([])
        setSelectKnowledgeBases([])
        fileToChatQuestionStore.clear(FileListStoreKey.FileList)
    })
    const onSettingInputCard = useMemoizedFn((res) => {
        if (!inViewport) return
        try {
            const data: AIAgentTriggerEventInfo = JSON.parse(res)
            const {type, params} = data
            switch (type as AIMentionTabsEnum) {
                case AIMentionTabsEnum.KnowledgeBase:
                    if (isArray(params)) {
                        setSelectKnowledgeBases(params)
                    }
                    break

                default:
                    break
            }
        } catch (error) {}
    })
    // #endregion

    // #region textarea-相关逻辑
    const {
        className: textareaClassName,
        onChange: onTextareaChange,
        onKeyDown: onTextareaKeyDown,
        onFocus: onTextareaFocus,
        ...textareaRest
    } = textareaProps || {}

    const textareaRef = useRef<TextAreaRef>(null)

    const mentionRef = useRef<{
        destroy: () => void
    }>()
    const mentionPerActiveRef = useRef<AIMentionTabsEnum>() // 提及上一次激活的tab

    const handleSetTextareaFocus = useMemoizedFn(() => {
        if (textareaRef && textareaRef.current) {
            textareaRef.current.focus()
        }
    })
    const handleTextareaChange: ChangeEventHandler<HTMLTextAreaElement> = useMemoizedFn((e) => {
        const content = e.target.value
        setQuestion(content)
        onTextareaChange && onTextareaChange(e)
        if (content.length === 1 && content === "@") {
            // 内容为空时, 触发mention,后期待优化
            omMention()
        } else if (mentionRef.current) {
            onResetMention()
        }
    })

    const handleTextareaFocus = useMemoizedFn((e) => {
        omMentionByFocus()
        onTextareaFocus && onTextareaFocus(e)
    })
    const omMentionByFocus = useDebounceFn(
        () => {
            if (question.length === 1 && question === "@") omMention()
        },
        {wait: 200}
    ).run

    const onResetMention = useMemoizedFn(() => {
        if (mentionRef.current) {
            mentionRef.current.destroy()
            mentionRef.current = undefined
        }
    })

    const omMention = useMemoizedFn(() => {
        if (!textareaRef.current || !!mentionRef.current) return
        const rect = textareaRef.current.resizableTextArea?.textArea.getBoundingClientRect()
        if (rect) {
            const x = rect.x
            const y = rect.y + 20
            mentionRef.current = showByRightContext(
                <AIChatMention
                    selectForge={selectForges}
                    selectTool={selectTools}
                    selectKnowledgeBase={selectKnowledgeBases}
                    onSelect={onSetMention}
                    defaultActiveTab={mentionPerActiveRef.current}
                />,
                x,
                y
            )
        }
    })

    const onSetMention = useMemoizedFn((type: AIMentionTabsEnum, value?: AIChatMentionSelectItem) => {
        switch (type) {
            case AIMentionTabsEnum.Forge_Name:
                if (value)
                    setSelectForges((perv) => {
                        const index = perv.findIndex((item) => item.id === value.id)
                        return index === -1 ? [...perv, value] : perv.filter((item) => item.id !== value.id)
                    })
                break

            case AIMentionTabsEnum.Tool:
                if (value)
                    setSelectTools((perv) => {
                        const index = perv.findIndex((item) => item.id === value.id)
                        return index === -1 ? [...perv, value] : perv.filter((item) => item.id !== value.id)
                    })
                break

            case AIMentionTabsEnum.KnowledgeBase:
                if (value)
                    setSelectKnowledgeBases((perv) => {
                        const index = perv.findIndex((item) => item.id === value.id)
                        return index === -1 ? [...perv, value] : perv.filter((item) => item.id !== value.id)
                    })
                break
            case AIMentionTabsEnum.File_System:
                break
            default:
                break
        }
        if (question === "@") {
            setQuestion("")
        }
        mentionPerActiveRef.current = type
        onResetMention()
        handleSetTextareaFocus()
    })

    const handleTextareaKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = useMemoizedFn((e) => {
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
            handleSubmit()
        }
        onTextareaKeyDown && onTextareaKeyDown(e)
    })
    // #endregion

    const isShowSelectList = useCreation(() => {
        return (
            selectForges.length > 0 ||
            selectTools.length > 0 ||
            selectKnowledgeBases.length > 0 ||
            fileToQuestion.length > 0
        )
    }, [selectForges, selectTools, selectKnowledgeBases, fileToQuestion])
    return (
        <div
            className={classNames(styles["ai-chat-textarea"], className)}
            onClick={handleSetTextareaFocus}
            ref={aiChatTextareaRef}
        >
            {isShowSelectList && (
                <div>
                    <FreeDialogFileList storeKey={FileListStoreKey.FileList} />
                    {selectForges.length > 0 && (
                        <FreeDialogTagList
                            type='forge'
                            title='智能体列表'
                            select={selectForges}
                            setSelect={setSelectForges}
                        />
                    )}
                    {selectTools.length > 0 && (
                        <FreeDialogTagList
                            type='tool'
                            title='工具列表'
                            select={selectTools}
                            setSelect={setSelectTools}
                        />
                    )}
                    {selectKnowledgeBases.length > 0 && (
                        <FreeDialogTagList
                            type='knowledgeBase'
                            title='知识库列表'
                            select={selectKnowledgeBases}
                            setSelect={setSelectKnowledgeBases}
                        />
                    )}
                </div>
            )}
            <div className={styles["textarea-body"]}>
                <div className={styles["textarea-icon"]}>
                    {/* 先直接使用 svg，后期这里会替换成一个动画 icon */}
                    <svg xmlns='http://www.w3.org/2000/svg' width='17' height='16' viewBox='0 0 17 16' fill='none'>
                        <path
                            d='M3.83333 2V4.66667M2.5 3.33333H5.16667M4.5 11.3333V14M3.16667 12.6667H5.83333M9.16667 2L10.6905 6.57143L14.5 8L10.6905 9.42857L9.16667 14L7.64286 9.42857L3.83333 8L7.64286 6.57143L9.16667 2Z'
                            stroke={`url(#${iconId.current})`}
                            strokeLinecap='round'
                            strokeLinejoin='round'
                        />
                        <defs>
                            <linearGradient
                                id={iconId.current}
                                x1='2.5'
                                y1='2'
                                x2='16.8935'
                                y2='6.75561'
                                gradientUnits='userSpaceOnUse'
                            >
                                <stop stopColor='var(--Colors-Use-Magenta-Primary)' />
                                <stop offset='0.639423' stopColor='var(--Colors-Use-Purple-Primary)' />
                                <stop offset='1' stopColor='var(--Colors-Use-Blue-Primary)' />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>

                <QSInputTextarea
                    ref={textareaRef}
                    {...textareaRest}
                    className={classNames(styles["textarea-textarea"], textareaClassName)}
                    value={question}
                    onChange={handleTextareaChange}
                    onKeyDown={handleTextareaKeyDown}
                    onFocus={handleTextareaFocus}
                />
                {/* <MilkdownInput/> */}
            </div>

            <div className={styles["textarea-footer"]}>
                <div
                    className={styles["footer-left"]}
                    onClick={(e) => {
                        if (!!extraFooterLeft) e.stopPropagation()
                    }}
                >
                    {extraFooterLeft || null}
                </div>
                <div
                    className={styles["footer-right"]}
                    onClick={(e) => {
                        if (!!extraFooterRight) e.stopPropagation()
                    }}
                >
                    {extraFooterRight || null}
                    <YakitButton
                        className={styles["round-btn"]}
                        radius='50%'
                        loading={loading}
                        disabled={!isQuestion}
                        icon={<OutlineArrowupIcon />}
                        onClick={(e) => {
                            e.stopPropagation()
                            handleSubmit()
                        }}
                    />
                </div>
            </div>
            {children}
        </div>
    )
})
