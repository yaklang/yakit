import React, {
    forwardRef,
    memo,
    ReactNode,
    Ref,
    RefAttributes,
    useEffect,
    useImperativeHandle,
    useRef,
    useState
} from "react"
import {
    AIChatTextareaProps,
    AIChatTextareaSubmit,
    AIInputInnerFeatureEnum,
    FileToChatQuestionList,
    FooterLeftTypesComponentProps,
    QSInputTextareaProps
} from "./type"
import {Input} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineArrowupIcon, OutlineAtsymbolIcon} from "@/assets/icon/outline"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import {TextAreaRef} from "antd/lib/input/TextArea"
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
import {editorViewCtx} from "@milkdown/kit/core"
import {convertKeyEventToKeyCombination} from "@/utils/globalShortcutKey/utils"
import {YakitKeyBoard} from "@/utils/globalShortcutKey/keyboard"
import {AIModelSelect} from "../aiModelList/aiModelSelect/AIModelSelect"
import AIReviewRuleSelect from "@/pages/ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect"
import {AIFocusMode} from "@/pages/ai-re-act/aiFocusMode/AIFocusMode"
import useAIAgentStore from "../useContext/useStore"
import {isString} from "lodash"
import OpenFileDropdown, {OpenFileDropdownItem} from "../aiChatWelcome/OpenFileDropdown/OpenFileDropdown"
import {UploadFileButton} from "@/pages/ai-re-act/aiReActChat/AIReActComponent"
import {insertAtCurrentPosition} from "../components/aiMilkdownInput/customPlugin"

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
        const {
            loading,
            inputFooterLeft,
            inputFooterRight,
            footer,
            onSubmit,
            className,
            children,
            defaultValue,
            isOpen,
            filterMentionType
        } = props

        const footerLeftTypes: FooterLeftTypesComponentProps[] = useCreation(() => {
            if (!!props.footerLeftTypes?.length) {
                const list = props.footerLeftTypes
                    .map((item) => {
                        let node: FooterLeftTypesComponentProps = {} as FooterLeftTypesComponentProps
                        if (isString(item)) {
                            switch (item) {
                                case AIInputInnerFeatureEnum.AIReviewRuleSelect:
                                    node = {type: AIInputInnerFeatureEnum.AIReviewRuleSelect}
                                    break
                                case AIInputInnerFeatureEnum.AIModelSelect:
                                    node = {type: AIInputInnerFeatureEnum.AIModelSelect, props: {isOpen}}
                                    break
                                case AIInputInnerFeatureEnum.AIFocusMode:
                                    node = {type: AIInputInnerFeatureEnum.AIFocusMode}
                                    break
                                default:
                                    break
                            }
                        } else {
                            node = item
                        }
                        return node
                    })
                    .filter((ele) => !!ele?.type)
                return list
            }
            return [
                {type: AIInputInnerFeatureEnum.AIReviewRuleSelect},
                {type: AIInputInnerFeatureEnum.AIModelSelect, props: {isOpen}},
                {type: AIInputInnerFeatureEnum.AIFocusMode}
            ]
        }, [props.footerLeftTypes, isOpen])

        const {setting} = useAIAgentStore()

        const [disabled, setDisabled] = useState<boolean>(false)

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
                    getValue: () => getMarkdownValue(),
                    editorMilkdown: editorMilkdown.current
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
            if (!qs.trim() || !editorMilkdown.current) return
            const {mentions, plainText} = extractDataWithMilkdown(editorMilkdown.current)
            const value: AIChatTextareaSubmit = {
                qs: plainText,
                mentionList: mentions,
                showQS: qs,
                focusMode
            }
            onSubmit && onSubmit(value)
        })
        // #endregion

        // #region 编辑器-相关逻辑

        const handleSetTextareaFocus = useMemoizedFn(() => {
            editorMilkdown.current?.action((ctx) => {
                const view = ctx.get(editorViewCtx)
                view.focus()
            })
        })

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

        const onUpdateContent = useMemoizedFn((value: string) => {
            setDisabled(!value.trim())
        })
        // #endregion
        const handleTextareaKeyDown = useMemoizedFn((e) => {
            const keys = convertKeyEventToKeyCombination(e)
            if (!e.nativeEvent?.isComposing && keys?.join() === YakitKeyBoard.Enter) {
                e.stopPropagation()
                e.preventDefault()
                handleSubmit()
            }
        })
        const [focusMode, setFocusMode] = useState<string>()

        const onMemfitExtra = useMemoizedFn((value: AIMentionCommandParams) => {
            setFocusMode(value.mentionName)
        })

        const renderFooterLeftTypes = useMemoizedFn((types: FooterLeftTypesComponentProps[]) => {
            let node: ReactNode[] = []
            types?.forEach((item, index) => {
                if (index > 0 && index < types.length) {
                    node.push(<div className={styles["divider-style"]} key={`divider-${index}`} />)
                }
                switch (item.type) {
                    case AIInputInnerFeatureEnum.AIReviewRuleSelect:
                        node.push(
                            item.component || (
                                <AIReviewRuleSelect
                                    key={item.type}
                                    {...item.props}
                                    className={classNames(styles["review-rule-self-adaptive"], item.props?.className)}
                                />
                            )
                        )
                        break
                    case AIInputInnerFeatureEnum.AIModelSelect:
                        node.push(
                            item.component || (
                                <AIModelSelect
                                    key={item.type}
                                    {...item.props}
                                    className={classNames(styles["model-self-adaptive"], item.props?.className)}
                                />
                            )
                        )
                        break
                    case AIInputInnerFeatureEnum.AIFocusMode:
                        node.push(
                            item.component || (
                                <AIFocusMode
                                    key={item.type}
                                    value={focusMode}
                                    onChange={setFocusMode}
                                    {...item.props}
                                    className={classNames(styles["focus-mode-self-adaptive"], item.props?.className)}
                                />
                            )
                        )
                        break
                    default:
                        break
                }
            })
            return node
        })
        const onSetFileMention = useMemoizedFn((data: OpenFileDropdownItem) => {
            onSetMention({
                mentionId: data.path,
                mentionType: data.isFolder ? "folder" : "file",
                mentionName: data.path
            })
        })
        const onMention = useMemoizedFn(() => {
            editorMilkdown.current?.action(callCommand<string>(insertAtCurrentPosition.key, "@"))
        })
        return (
            <div
                className={classNames(
                    styles["ai-chat-textarea"],
                    {
                        [styles["dragging-from-tree"]]: isHovering,
                        [styles["ai-review-chat"]]: setting.ReviewPolicy === "ai"
                    },
                    className
                )}
                onClick={handleSetTextareaFocus}
                ref={dropRef}
            >
                {isHovering && <div className={styles["drag-hint"]}>松开以添加到对话</div>}
                <div className={classNames(styles["textarea-wrapper"])} onKeyDown={handleTextareaKeyDown}>
                    <AIMilkdownInput
                        defaultValue={defaultValue}
                        onUpdateEditor={onUpdateEditor}
                        onUpdateContent={onUpdateContent}
                        onMemfitExtra={onMemfitExtra}
                        filterMode={filterMentionType}
                    />
                    <div className={styles["footer"]}>
                        {inputFooterLeft ?? (
                            <div className={styles["footer-left"]}>
                                <YakitButton
                                    type='text2'
                                    radius='50%'
                                    icon={<OutlineAtsymbolIcon />}
                                    onClick={onMention}
                                />
                                <OpenFileDropdown cb={onSetFileMention}>
                                    <UploadFileButton title='打开文件夹' />
                                </OpenFileDropdown>
                            </div>
                        )}

                        <div className={styles["footer-right"]}>
                            {inputFooterRight}
                            <YakitButton
                                className={styles["round-btn"]}
                                radius='50%'
                                loading={loading}
                                disabled={disabled}
                                icon={<OutlineArrowupIcon />}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleSubmit()
                                }}
                            />
                        </div>
                    </div>
                </div>
                <div className={styles["ai-chat-textarea-footer"]}>
                    {footer ?? <>{renderFooterLeftTypes(footerLeftTypes)}</>}
                </div>
                {children}
            </div>
        )
    })
)
