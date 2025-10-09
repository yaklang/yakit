import React, {
    ChangeEventHandler,
    forwardRef,
    KeyboardEventHandler,
    memo,
    Ref,
    RefAttributes,
    useMemo,
    useRef
} from "react"
import {AIChatTextareaProps, QSInputTextareaProps} from "./type"
import {Input} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineArrowupIcon} from "@/assets/icon/outline"
import {useControllableValue, useMemoizedFn} from "ahooks"
import {TextAreaRef} from "antd/lib/input/TextArea"
import {v4 as uuidv4} from "uuid"

import classNames from "classnames"
import styles from "./template.module.scss"

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
    const {loading, extraFooterLeft, extraFooterRight, onSubmit, textareaProps} = props

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
        ...textareaRest
    } = textareaProps || {}

    const textareaRef = useRef<TextAreaRef>(null)
    const handleSetTextareaFocus = useMemoizedFn(() => {
        if (textareaRef && textareaRef.current) {
            textareaRef.current.focus()
        }
    })

    const handleTextareaChange: ChangeEventHandler<HTMLTextAreaElement> = useMemoizedFn((e) => {
        const content = e.target.value
        setQuestion(content)
        onTextareaChange && onTextareaChange(e)
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
        <div className={styles["ai-chat-textarea"]} onClick={handleSetTextareaFocus}>
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
                                <stop stopColor='#DC5CDF' />
                                <stop offset='0.639423' stopColor='#8862F8' />
                                <stop offset='1' stopColor='#4493FF' />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>

                <QSInputTextarea
                    ref={textareaRef}
                    placeholder='请输入内容...(shift + enter 换行)'
                    {...textareaRest}
                    className={classNames(styles["textarea-textarea"], textareaClassName)}
                    value={question}
                    onChange={handleTextareaChange}
                    onKeyDown={handleTextareaKeyDown}
                />
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
        </div>
    )
})
