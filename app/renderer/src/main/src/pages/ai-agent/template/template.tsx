import React, {
    ChangeEventHandler,
    forwardRef,
    KeyboardEventHandler,
    memo,
    Ref,
    RefAttributes,
    useEffect,
    useMemo,
    useRef
} from "react"
import {AIChatTextareaProps, QSInputTextareaProps} from "./type"
import {Input} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineArrowupIcon} from "@/assets/icon/outline"
import {useControllableValue, useDebounceFn, useMemoizedFn} from "ahooks"
import {TextAreaRef} from "antd/lib/input/TextArea"
import {v4 as uuidv4} from "uuid"

import classNames from "classnames"
import styles from "./template.module.scss"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {AIChatMention} from "../components/aiChatMention/AIChatMention"
import {AIMentionTabsEnum} from "../defaultConstant"
import useListenWidth from "@/pages/pluginHub/hooks/useListenWidth"

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

    // #region question-相关逻辑
    const [question, setQuestion] = useControllableValue<string>(props, {
        defaultValue: "",
        valuePropName: "question",
        trigger: "setQuestion"
    })
    const isQuestion = useMemo(() => {
        return !!(question && question.trim())
    }, [question])

    const handleSubmit = useMemoizedFn(() => {
        if (!isQuestion) return
        onSubmit && onSubmit(question.trim())
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
    const textRectRef = useRef<DOMRect | null>(null)
    const mentionRef = useRef<{
        destroy: () => void
    }>()
    const wrapperWidth = useListenWidth(document.body)
    useEffect(() => {
        if (wrapperWidth) getTextRect()
    }, [wrapperWidth])
    const getTextRect = useMemoizedFn(() => {
        onResetMention()
        if (textareaRef.current) {
            // 目前只需要获取初始的位置即可
            const rect = textareaRef.current.resizableTextArea?.textArea.getBoundingClientRect()
            if (rect) textRectRef.current = rect
        }
    })
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
        if (!textRectRef.current || !!mentionRef.current) return
        const x = textRectRef.current.x
        const y = textRectRef.current.y + 20
        mentionRef.current = showByRightContext(<AIChatMention onSelect={onSetMention} />, x, y)
    })

    const onSetMention = useMemoizedFn((type: AIMentionTabsEnum, value: string) => {
        let typeString: string = ""
        switch (type) {
            case AIMentionTabsEnum.Forge_Name:
                typeString = "智能体"
                break

            case AIMentionTabsEnum.Tool:
                typeString = "工具"
                break

            case AIMentionTabsEnum.KnowledgeBase:
                typeString = "知识库"
                break
            default:
                break
        }
        setQuestion(`请使用${typeString}${value}回答 `)
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

    return (
        <div className={classNames(styles["ai-chat-textarea"], className)} onClick={handleSetTextareaFocus}>
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
