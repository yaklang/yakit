import type React from 'react'
import {
  forwardRef,
  memo,
  type ReactNode,
  type Ref,
  type RefAttributes,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import {
  type AIChatTextareaProps,
  type AIChatTextareaSubmit,
  AIInputFooterRightEnum,
  AIInputInnerFeatureEnum,
  type FileToChatQuestionList,
  type FooterLeftTypesComponentProps,
  type FooterRightTypesComponentProps,
  type QSInputTextareaProps,
} from './type'
import { Input } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { ArrowUpOutlined, CogOutlined, Log2Outlined, XOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { useCreation, useInViewport, useMemoizedFn } from 'ahooks'
import type { TextAreaRef } from 'antd/lib/input/TextArea'
import classNames from 'classnames'
import styles from './template.module.scss'
import { AIMilkdownInput } from '../components/aiMilkdownInput/AIMilkdownInput'
import type { EditorMilkdownProps } from '@/components/MilkdownEditor/MilkdownEditorType'
import { callCommand, getMarkdown } from '@milkdown/kit/utils'
import useAIChatDrop from '../aiChatWelcome/hooks/useAIChatDrop'
import {
  aiMentionCommand,
  type AIMentionCommandParams,
} from '../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import emiter from '@/utils/eventBus/eventBus'
import type { AIAgentTriggerEventInfo } from '../aiAgentType'
import { extractDataWithMilkdown, setEditorValue, unescapeUnderscoreInPath } from '../components/aiMilkdownInput/utils'
import { editorViewCtx, serializerCtx } from '@milkdown/kit/core'
import { convertKeyEventToKeyCombination } from '@/utils/globalShortcutKey/utils'
import { YakitKeyBoard } from '@/utils/globalShortcutKey/keyboard'
import { AIModelSelect } from '../aiModelList/aiModelSelect/AIModelSelect'
import AIReviewRuleSelect from '@/pages/ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect'
import { AIFocusMode } from '@/pages/ai-re-act/aiFocusMode/AIFocusMode'
import { AIReasoningEffortSelect } from '@/pages/ai-re-act/aiReasoningEffortSelect/AIReasoningEffortSelect'
import { isString } from 'lodash'
import OpenFileDropdown, { type OpenFileDropdownItem } from '../aiChatWelcome/OpenFileDropdown/OpenFileDropdown'
import { UploadFileButton } from '@/pages/ai-re-act/aiReActChat/AIReActComponent'
import { AIInputSettingPopover } from '@/pages/ai-re-act/aiReActTaskChat/AIReActTaskChat'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { AIMilkdownInputRef } from '../components/aiMilkdownInput/type'
import type { AICodeBlockCommandParams } from '../components/aiMilkdownInput/aiCodeBlock/aiCustomCodeBlockPlugin'
import AIRunModeSelect from '../aiRunModeSelect/AIRunModeSelect'
import {
  aiHttpFlowCustomSchema,
  type AIHttpFlowCommandParams,
} from '../components/aiMilkdownInput/aiMilkdownHttpFlow/aiHttpFlowPlugin'

const HTTP_FLOW_SUMMARY_THRESHOLD = 3

/** @name AI-Agent专用Textarea组件,行高为20px */
export const QSInputTextarea: React.FC<QSInputTextareaProps & RefAttributes<TextAreaRef>> = memo(
  forwardRef((props, ref: Ref<TextAreaRef>) => {
    const { className, ...rest } = props

    return (
      <Input.TextArea
        {...rest}
        ref={ref}
        className={classNames(styles['qs-input-textarea'], className)}
        variant="borderless"
        autoSize={true}
      />
    )
  }),
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
      milkdownClassName,
      children,
      defaultValue,
      isOpen,
      filterMentionType,
      chatDataStoreKey,
      onHttpFlowRemove,
    } = props
    const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])

    const [inputSettingVisible, setInputSettingVisible] = useState<boolean>(false)

    const footerLeftTypes: FooterLeftTypesComponentProps[] = useCreation(() => {
      if (props.footerLeftTypes?.length) {
        const list = props.footerLeftTypes
          .map((item) => {
            let node: FooterLeftTypesComponentProps = {} as FooterLeftTypesComponentProps
            if (isString(item)) {
              switch (item) {
                case AIInputInnerFeatureEnum.AIReviewRuleSelect:
                  node = { type: AIInputInnerFeatureEnum.AIReviewRuleSelect }
                  break
                case AIInputInnerFeatureEnum.AIModelSelect:
                  node = { type: AIInputInnerFeatureEnum.AIModelSelect, props: { isOpen } }
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
        { type: AIInputInnerFeatureEnum.AIReviewRuleSelect },
        { type: AIInputInnerFeatureEnum.AIModelSelect, props: { isOpen } },
      ]
    }, [props.footerLeftTypes, isOpen])

    const footerRightTypes: FooterRightTypesComponentProps[] = useCreation(() => {
      if (props.footerRightTypes?.length) {
        const list = props.footerRightTypes
          .map((item) => {
            let node: FooterRightTypesComponentProps = {} as FooterRightTypesComponentProps
            if (isString(item)) {
              switch (item) {
                case AIInputFooterRightEnum.AIFocusMode:
                  node = { type: AIInputFooterRightEnum.AIFocusMode }
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
      return [{ type: AIInputFooterRightEnum.AIFocusMode }]
    }, [props.footerRightTypes, isOpen])

    const [disabled, setDisabled] = useState<boolean>(!defaultValue?.trim())
    const [selectedHttpFlowIds, setSelectedHttpFlowIds] = useState<string[]>([])
    const httpFlowReference: AIHttpFlowCommandParams = {
      flowIds: [...selectedHttpFlowIds],
      displayText:
        selectedHttpFlowIds.length < HTTP_FLOW_SUMMARY_THRESHOLD
          ? selectedHttpFlowIds.map((id) => `#${id}`).join(', ')
          : t('AIMilkdownInput.selectedHttpFlowSummary', { count: selectedHttpFlowIds.length }),
      isSummary: selectedHttpFlowIds.length >= HTTP_FLOW_SUMMARY_THRESHOLD,
    }

    const { isHovering, dropRef } = useAIChatDrop({
      onFilesChange: (v) => onFilesChange(v),
    })
    const [inViewport = true] = useInViewport(dropRef)
    const editorMilkdown = useRef<EditorMilkdownProps>()

    useImperativeHandle(ref, () => {
      return {
        setMention: (v) => onSetMention(v),
        setValue: (v) => onSetValue(v),
        setHttpFlow: (ids) => onSetHttpFlow(ids),
        getValue: () => getMarkdownValue(),
        editorMilkdown: editorMilkdown.current,
      }
    }, [])
    // #region question-相关逻辑
    useEffect(() => {
      if (inViewport) {
        emiter.on('setAIInputByType', onSetAIInputByType)
        return () => {
          emiter.off('setAIInputByType', onSetAIInputByType)
        }
      }
    }, [inViewport])

    const onSetAIInputByType = useMemoizedFn((res) => {
      try {
        const data: AIAgentTriggerEventInfo = JSON.parse(res)
        const { type } = data
        switch (type) {
          case 'mention': {
            const params = data.params as AIMentionCommandParams
            onSetMention(params)
            break
          }
          case 'codeBlockTag':
            aiMilkdownInputRef.current?.setCodeRef(data.params as AICodeBlockCommandParams)
            handleSetTextareaFocus()
            break

          default:
            break
        }
      } catch (error) {}
    })

    const aiMilkdownInputRef = useRef<AIMilkdownInputRef>(null)
    const handleSubmit = useMemoizedFn(() => {
      let qs = getMarkdownValue()
      if ((!qs.trim() && !selectedHttpFlowIds.length) || !editorMilkdown.current) return
      const { mentions, imageList, httpFlowList, codeBlockList } = extractDataWithMilkdown(editorMilkdown.current)
      if (selectedHttpFlowIds.length) {
        // 为了回显勾选的流量数据，需要在发送消息前将流量数据拼接到用户输入的文本中
        const referenceMarkdown = editorMilkdown.current.action((ctx) => {
          const { schema } = ctx.get(editorViewCtx).state
          const reference = aiHttpFlowCustomSchema
            .type(ctx)
            .create(httpFlowReference, schema.text(httpFlowReference.displayText))
          const doc = schema.topNodeType.create(null, schema.nodes.paragraph.create(null, reference))
          return ctx.get(serializerCtx)(doc).trim()
        })
        qs = [referenceMarkdown, qs].filter(Boolean).join('\n\n')
        httpFlowList.push(httpFlowReference)
      }
      const value: AIChatTextareaSubmit = {
        qs,
        mentionList: mentions,
        imageList,
        httpFlowList,
        codeBlockList,
        showQS: qs,
        focusMode,
        sessionId: aiMilkdownInputRef.current?.getSessionId(),
      }
      onSubmit && onSubmit(value)
    })
    // #endregion

    // #region 编辑器-相关逻辑

    const handleSetTextareaFocus = useMemoizedFn(() => {
      editorMilkdown.current?.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        if (view.isDestroyed) return
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
          mentionType: item.isFolder ? 'folder' : 'file',
          mentionName: item.path,
        })
      }
    })
    /**插入提及数据 */
    const onSetMention = useMemoizedFn((params: AIMentionCommandParams) => {
      switch (params.mentionType) {
        case 'focusMode':
          onMemfitExtra(params)
          break
        default:
          editorMilkdown.current?.action(callCommand<AIMentionCommandParams>(aiMentionCommand.key, params))
          break
      }
    })
    const onSetHttpFlow = useMemoizedFn((ids: string[]) => {
      setSelectedHttpFlowIds([...new Set(ids.filter(Boolean))])
    })
    const onHttpFlowTagClose = useMemoizedFn((event: React.MouseEvent, id: string) => {
      event.stopPropagation()
      onHttpFlowRemove?.(id, httpFlowReference.isSummary)
    })
    const onHttpFlowItemClose = useMemoizedFn((event: React.MouseEvent, id: string) => {
      event.preventDefault()
      event.stopPropagation()
      onHttpFlowRemove?.(id, false)
    })
    /**设置编辑器值 */
    const onSetValue = useMemoizedFn((value: string) => {
      if (!value) setSelectedHttpFlowIds([])
      if (!editorMilkdown.current) return
      setEditorValue(editorMilkdown.current, value)
    })
    const getMarkdownValue = useMemoizedFn(() => {
      const value = editorMilkdown.current?.action(getMarkdown()) || ''
      // remark-stringify 会将下划线 _ 转义为 \_（强调字符），
      // 导致路径等含下划线的纯文本被破坏，此处仅对路径上下文反转义还原
      return unescapeUnderscoreInPath(value.replace(/\n+$/, ''))
    })

    const onUpdateContent = useMemoizedFn((value: string) => {
      setDisabled(!value.trim())
    })
    // #endregion
    const handleTextareaKeyDown = useMemoizedFn((e) => {
      const keys = convertKeyEventToKeyCombination(e)
      e.stopPropagation()
      if (!e.nativeEvent?.isComposing && keys?.join() === YakitKeyBoard.Enter) {
        e.preventDefault()
        handleSubmit()
      }
    })
    const [focusMode, setFocusMode] = useState<string>()

    const onMemfitExtra = useMemoizedFn((value: AIMentionCommandParams) => {
      setFocusMode(value.mentionName)
    })

    const renderFooterLeftTypes = useMemoizedFn((types: FooterLeftTypesComponentProps[]) => {
      const node: ReactNode[] = []
      types?.forEach((item, index) => {
        switch (item.type) {
          case AIInputInnerFeatureEnum.AIReviewRuleSelect:
            node.push(
              item.component || (
                <AIReviewRuleSelect
                  key={item.type}
                  {...item.props}
                  className={classNames(styles['review-rule-self-adaptive'], item.props?.className)}
                />
              ),
            )
            node.push(<div className={styles['divider-style']} key={`divider-${index}`} />)
            break
          case AIInputInnerFeatureEnum.AIModelSelect:
            node.push(
              item.component || (
                <AIModelSelect
                  key={item.type}
                  {...item.props}
                  className={classNames(styles['model-self-adaptive'], item.props?.className)}
                />
              ),
            )
            break

          default:
            break
        }
      })
      return node
    })
    const renderFooterRightTypes = useMemoizedFn((types: FooterRightTypesComponentProps[]) => {
      const node: ReactNode[] = []
      types?.forEach((item, index) => {
        switch (item.type) {
          case AIInputFooterRightEnum.AIFocusMode:
            node.push(
              item.component || (
                <AIFocusMode
                  key={item.type}
                  value={focusMode}
                  onChange={setFocusMode}
                  {...item.props}
                  className={classNames(styles['focus-mode-self-adaptive'], item.props?.className)}
                />
              ),
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
        mentionType: data.isFolder ? 'folder' : 'file',
        mentionName: data.path,
      })
    })

    const onSelectImage = useMemoizedFn(() => {
      aiMilkdownInputRef.current?.setImage()
    })

    const renderHttpFlowTag = (id: string) => (
      <div key={id} className={styles['http-flow-reference']}>
        <Log2Outlined className={styles['http-flow-reference-icon']} size={16} />
        <span className={styles['http-flow-reference-label']}>
          {httpFlowReference.isSummary ? httpFlowReference.displayText : `#${id}`}
        </span>

        <XOutlined
          size={16}
          className={styles['http-flow-reference-close']}
          onClick={(event) => onHttpFlowTagClose(event, id)}
        />
      </div>
    )

    return (
      <div
        className={classNames(
          styles['ai-chat-textarea'],
          {
            [styles['dragging-from-tree']]: isHovering,
          },
          className,
        )}
        onClick={handleSetTextareaFocus}
        ref={dropRef}
      >
        {isHovering && <div className={styles['drag-hint']}>{t('AIChatTextarea.dropToAddToChat')}</div>}
        <div className={classNames(styles['textarea-wrapper'])} onKeyDown={handleTextareaKeyDown}>
          {selectedHttpFlowIds.length > 0 && (
            <div className={styles['http-flow-references']}>
              {httpFlowReference.isSummary ? (
                <YakitPopover
                  trigger="hover"
                  placement="topLeft"
                  classNames={{ root: styles['http-flow-reference-popover'] }}
                  content={
                    <div className={styles['http-flow-reference-ids']} role="list">
                      <div className={styles['http-flow-reference-items']}>
                        {selectedHttpFlowIds.map((id) => (
                          <YakitTag
                            key={id}
                            className={styles['http-flow-reference-id']}
                            role="listitem"
                            closable
                            onClose={(event) => onHttpFlowItemClose(event, id)}
                          >
                            <span title={`#${id}`}>#{id}</span>
                          </YakitTag>
                        ))}
                      </div>
                    </div>
                  }
                >
                  {renderHttpFlowTag(selectedHttpFlowIds.join(','))}
                </YakitPopover>
              ) : (
                selectedHttpFlowIds.map((id) => renderHttpFlowTag(id))
              )}
            </div>
          )}
          <AIMilkdownInput
            ref={aiMilkdownInputRef}
            classNameWrapper={milkdownClassName}
            defaultValue={defaultValue}
            onUpdateEditor={onUpdateEditor}
            onUpdateContent={onUpdateContent}
            onMemfitExtra={onMemfitExtra}
            filterMode={filterMentionType}
            chatDataStoreKey={chatDataStoreKey}
          />
          <div className={styles['footer']}>
            {inputFooterLeft ?? (
              <div className={styles['footer-left']}>
                <AIRunModeSelect />
                <AIReasoningEffortSelect />

                <OpenFileDropdown cb={onSetFileMention} onSelectImage={onSelectImage}>
                  <UploadFileButton title={t('YakitButton.openFolder')} className={styles['btn-base']} />
                </OpenFileDropdown>
                <AIInputSettingPopover visible={inputSettingVisible} setVisible={setInputSettingVisible}>
                  <YakitButton
                    type="text2"
                    radius="50%"
                    icon={<CogOutlined color="currentColor" />}
                    onClick={(e) => e.stopPropagation()}
                    className={styles['btn-base']}
                    isHover={inputSettingVisible}
                  />
                </AIInputSettingPopover>
              </div>
            )}

            <div className={styles['footer-right']}>
              {inputFooterRight}
              <YakitButton
                className={styles['round-btn']}
                radius="50%"
                loading={loading}
                disabled={disabled && !selectedHttpFlowIds.length}
                icon={<ArrowUpOutlined color="currentColor" />}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSubmit()
                }}
              />
            </div>
          </div>
        </div>
        <div className={styles['ai-chat-textarea-footer']}>
          {footer ?? (
            <>
              <div className={styles['footer-left']}>{renderFooterLeftTypes(footerLeftTypes)}</div>
              <div className={styles['footer-right']}>{renderFooterRightTypes(footerRightTypes)}</div>
            </>
          )}
        </div>
        {children}
      </div>
    )
  }),
)
