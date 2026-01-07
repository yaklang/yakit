import React, {forwardRef, memo, Ref, RefAttributes, useEffect, useImperativeHandle, useRef} from "react"
import {AIChatTextareaProps, AIChatTextareaSubmit, FileToChatQuestionList, QSInputTextareaProps} from "./type"
import {Input} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineArrowupIcon} from "@/assets/icon/outline"
import {useInViewport, useMemoizedFn} from "ahooks"
import {TextAreaRef} from "antd/lib/input/TextArea"
import {v4 as uuidv4} from "uuid"

import classNames from "classnames"
import styles from "./template.module.scss"
import {AIMilkdownInput} from "../components/aiMilkdownInput/AIMilkdownInput"
import {EditorMilkdownProps} from "@/components/MilkdownEditor/MilkdownEditorType"
import {callCommand, getMarkdown} from "@milkdown/kit/utils"
import useAIChatDrop from "../aiChatWelcome/hooks/useAIChatDrop"
import {aiMentionCommand, AIMentionCommandParams} from "../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin"
import emiter from "@/utils/eventBus/eventBus"
import {AIAgentTriggerEventInfo} from "../aiAgentType"
import {extractDataWithMilkdown, setEditorValue} from "../components/aiMilkdownInput/utils"

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
 */
export const AIChatTextarea: React.FC<AIChatTextareaProps> = memo(
    forwardRef((props, ref) => {
        const {loading, extraFooterLeft, extraFooterRight, onSubmit, className, children, defaultValue} = props

        // icon的唯一id生成
        const iconId = useRef(uuidv4())

        const {isHovering, dropRef} = useAIChatDrop({
            onFilesChange: (v) => onFilesChange(v)
        })
        const [inViewport = true] = useInViewport(dropRef)
        const editorMilkdown = useRef<EditorMilkdownProps>()

        useImperativeHandle(
            ref,
            () => {
                return {
                    setMention: (v) => onSetMention(v),
                    setValue: (v) => onSetValue(v),
                    getValue: () => getMarkdownValue()
                }
            },
            []
        )
        // #region question-相关逻辑
        useEffect(() => {
            if (inViewport) {
                emiter.on("setAIInputByType", onSetAIInputByType)
                return () => {
                    emiter.off("setAIInputByType", onSetAIInputByType)
                }
            }
        }, [inViewport])

        const onSetAIInputByType = useMemoizedFn((res) => {
            try {
                const data: AIAgentTriggerEventInfo = JSON.parse(res)
                const {type} = data
                switch (type) {
                    case "mention":
                        const params = data.params as AIMentionCommandParams
                        onSetMention(params)
                        break

                    default:
                        break
                }
            } catch (error) {}
        })

        const handleSubmit = useMemoizedFn(() => {
            const qs = getMarkdownValue()
            if (!qs || !editorMilkdown.current) return
            const {mentions, plainText} = extractDataWithMilkdown(editorMilkdown.current)
            const value: AIChatTextareaSubmit = {
                qs: plainText,
                mentionList: mentions,
                showQS: qs
            }
            onSubmit && onSubmit(value)
        })
        // #endregion

        // #region 编辑器-相关逻辑

        const handleSetTextareaFocus = useMemoizedFn(() => {})

        const onUpdateEditor = useMemoizedFn((editor: EditorMilkdownProps) => {
            editorMilkdown.current = editor
        })

        const onFilesChange = useMemoizedFn((files: FileToChatQuestionList[]) => {
            for (const item of files) {
                onSetMention({
                    mentionId: item.path,
                    mentionType: item.isFolder ? "folder" : "file",
                    mentionName: item.path
                })
            }
        })
        /**插入提及数据 */
        const onSetMention = useMemoizedFn((params: AIMentionCommandParams) => {
            editorMilkdown.current?.action(callCommand<AIMentionCommandParams>(aiMentionCommand.key, params))
        })
        /**设置编辑器值 */
        const onSetValue = useMemoizedFn((value: string) => {
            if (!editorMilkdown.current) return
            setEditorValue(editorMilkdown.current, value)
        })
        const getMarkdownValue = useMemoizedFn(() => {
            const value = editorMilkdown.current?.action(getMarkdown()) || ""
            return value
        })
        // #endregion
        return (
            <div
                className={classNames(
                    styles["ai-chat-textarea"],
                    {
                        [styles["dragging-from-tree"]]: isHovering
                    },
                    className
                )}
                onClick={handleSetTextareaFocus}
                ref={dropRef}
            >
                {isHovering && <div className={styles["drag-hint"]}>松开以添加到对话</div>}
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

                    {/* <QSInputTextarea
                    ref={textareaRef}
                    {...textareaRest}
                    className={classNames(styles["textarea-textarea"], textareaClassName)}
                    value={question}
                    onChange={handleTextareaChange}
                    onKeyDown={handleTextareaKeyDown}
                    onFocus={handleTextareaFocus}
                /> */}
                    <AIMilkdownInput defaultValue={defaultValue} onUpdateEditor={onUpdateEditor} />
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
                            disabled={!getMarkdownValue()}
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
)
