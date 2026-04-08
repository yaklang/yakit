import React, {
  forwardRef,
  memo,
  ReactNode,
  Ref,
  RefAttributes,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import {
  AIChatTextareaProps,
  AIChatTextareaSubmit,
  AIGlobalCommandProps,
  AIGlobalCommandRefProps,
  AIInputInnerFeatureEnum,
  AIManualAdditionProps,
  FileToChatQuestionList,
  FooterLeftTypesComponentProps,
  QSInputTextareaProps,
} from './type'
import { Input } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { OutlineArrowupIcon, OutlineAtsymbolIcon, OutlineCodeIcon, OutlineHandIcon } from '@/assets/icon/outline'
import { useCreation, useInViewport, useMemoizedFn, useUpdateEffect } from 'ahooks'
import { TextAreaRef } from 'antd/lib/input/TextArea'
import classNames from 'classnames'
import styles from './template.module.scss'
import { AIMilkdownInput } from '../components/aiMilkdownInput/AIMilkdownInput'
import { EditorMilkdownProps } from '@/components/MilkdownEditor/MilkdownEditorType'
import { callCommand, getMarkdown } from '@milkdown/kit/utils'
import useAIChatDrop from '../aiChatWelcome/hooks/useAIChatDrop'
import {
  aiMentionCommand,
  AIMentionCommandParams,
} from '../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import emiter from '@/utils/eventBus/eventBus'
import { AIAgentTriggerEventInfo } from '../aiAgentType'
import { extractDataWithMilkdown, setEditorValue } from '../components/aiMilkdownInput/utils'
import { editorViewCtx } from '@milkdown/kit/core'
import { convertKeyEventToKeyCombination } from '@/utils/globalShortcutKey/utils'
import { YakitKeyBoard } from '@/utils/globalShortcutKey/keyboard'
import { AIModelSelect } from '../aiModelList/aiModelSelect/AIModelSelect'
import AIReviewRuleSelect from '@/pages/ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect'
import { AIFocusMode } from '@/pages/ai-re-act/aiFocusMode/AIFocusMode'
import useAIAgentStore from '../useContext/useStore'
import { isString } from 'lodash'
import OpenFileDropdown, { OpenFileDropdownItem } from '../aiChatWelcome/OpenFileDropdown/OpenFileDropdown'
import { UploadFileButton } from '@/pages/ai-re-act/aiReActChat/AIReActComponent'
import { insertAtCurrentPosition } from '../components/aiMilkdownInput/customPlugin'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import useAIAgentDispatcher from '../useContext/useDispatcher'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import useChatIPCStore from '../useContext/ChatIPCContent/useStore'
import useChatIPCDispatcher from '../useContext/ChatIPCContent/useDispatcher'
import { AIInputEventSyncTypeEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import { randomString } from '@/utils/randomUtil'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import useAIGlobalConfig from '@/pages/ai-re-act/hooks/useAIGlobalConfig'

/** @name AI-Agent专用Textarea组件,行高为20px */
export const QSInputTextarea: React.FC<QSInputTextareaProps & RefAttributes<TextAreaRef>> = memo(
  forwardRef((props, ref: Ref<TextAreaRef>) => {
    const { className, ...rest } = props

    return (
      <Input.TextArea
        {...rest}
        ref={ref}
        className={classNames(styles['qs-input-textarea'], className)}
        bordered={false}
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
      children,
      defaultValue,
      isOpen,
      filterMentionType,
    } = props

    const { chatIPCData } = useChatIPCStore()
    const execute = useCreation(() => chatIPCData.execute, [chatIPCData.execute])

    const [visible, setVisible] = useState<boolean>(false)
    const [manualAdditionVisible, setManualAdditionVisible] = useState<boolean>(false)

    const footerLeftTypes: FooterLeftTypesComponentProps[] = useCreation(() => {
      if (!!props.footerLeftTypes?.length) {
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
                case AIInputInnerFeatureEnum.AIFocusMode:
                  node = { type: AIInputInnerFeatureEnum.AIFocusMode }
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
        { type: AIInputInnerFeatureEnum.AIFocusMode },
      ]
    }, [props.footerLeftTypes, isOpen])

    const { setting } = useAIAgentStore()
    const { setSetting } = useAIAgentDispatcher()
    const [disabled, setDisabled] = useState<boolean>(false)

    const { isHovering, dropRef } = useAIChatDrop({
      onFilesChange: (v) => onFilesChange(v),
    })
    const [inViewport = true] = useInViewport(dropRef)
    const editorMilkdown = useRef<EditorMilkdownProps>()

    useImperativeHandle(ref, () => {
      return {
        setMention: (v) => onSetMention(v),
        setValue: (v) => onSetValue(v),
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
          case 'mention':
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
      const { mentions, plainText } = extractDataWithMilkdown(editorMilkdown.current)
      const value: AIChatTextareaSubmit = {
        qs,
        mentionList: mentions,
        showQS: qs,
        focusMode,
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
    /**设置编辑器值 */
    const onSetValue = useMemoizedFn((value: string) => {
      if (!editorMilkdown.current) return
      setEditorValue(editorMilkdown.current, value)
    })
    const getMarkdownValue = useMemoizedFn(() => {
      const value = editorMilkdown.current?.action(getMarkdown()) || ''
      return value.replace(/\n+$/, '')
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
          node.push(<div className={styles['divider-style']} key={`divider-${index}`} />)
        }
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
          case AIInputInnerFeatureEnum.AIFocusMode:
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
    const onMention = useMemoizedFn(() => {
      editorMilkdown.current?.action(callCommand<string>(insertAtCurrentPosition.key, '@'))
    })

    const [{ aiGlobalConfig }, { setAIGlobalConfig }] = useAIGlobalConfig()

    const onSave = useMemoizedFn((prompt: string) => {
      setVisible(false)
      setAIGlobalConfig({ AIPresetPrompt: prompt })
    })
    const aiGlobalCommandRef = useRef<AIGlobalCommandRefProps>({ value: '' })
    const onGlobalCommandVisibleChange = useMemoizedFn((visible: boolean) => {
      if (!visible) {
        onSave(aiGlobalCommandRef.current?.value || '')
      } else {
        setVisible(true)
      }
    })
    return (
      <div
        className={classNames(
          styles['ai-chat-textarea'],
          {
            [styles['dragging-from-tree']]: isHovering,
            [styles['ai-review-chat']]: setting.ReviewPolicy === 'ai',
          },
          className,
        )}
        onClick={handleSetTextareaFocus}
        ref={dropRef}
      >
        {isHovering && <div className={styles['drag-hint']}>松开以添加到对话</div>}
        <YakitPopover
          visible={visible}
          content={<AIGlobalCommand ref={aiGlobalCommandRef} onCancel={() => setVisible(false)} onSave={onSave} />}
          destroyTooltipOnHide={true}
          onVisibleChange={onGlobalCommandVisibleChange}
          trigger={'click'}
        >
          <div
            onClick={(e) => {
              e.stopPropagation()
              setVisible(true)
            }}
            className={styles['code-btn-wrapper']}
          >
            <YakitTag color="purple" size="small" border={false} fullRadius className={styles['preset-prompt-tag']}>
              <OutlineCodeIcon className={styles['code-icon']} />
              <span className="content-ellipsis">{aiGlobalConfig.AIPresetPrompt || '自定义 AI 指令'}</span>
            </YakitTag>
          </div>
        </YakitPopover>
        <div className={classNames(styles['textarea-wrapper'])} onKeyDown={handleTextareaKeyDown}>
          <AIMilkdownInput
            defaultValue={defaultValue}
            onUpdateEditor={onUpdateEditor}
            onUpdateContent={onUpdateContent}
            onMemfitExtra={onMemfitExtra}
            filterMode={filterMentionType}
          />
          <div className={styles['footer']}>
            {inputFooterLeft ?? (
              <div className={styles['footer-left']}>
                <YakitButton
                  type="text2"
                  radius="50%"
                  icon={<OutlineAtsymbolIcon />}
                  onClick={onMention}
                  className={styles['btn-base']}
                />
                <OpenFileDropdown cb={onSetFileMention}>
                  <UploadFileButton title="打开文件夹" className={styles['btn-base']} />
                </OpenFileDropdown>

                <YakitPopover
                  visible={manualAdditionVisible}
                  content={<AIManualAddition onCancel={() => setManualAdditionVisible(false)} />}
                  onVisibleChange={setManualAdditionVisible}
                  trigger={'click'}
                >
                  <YakitButton
                    type="text2"
                    radius="50%"
                    isHover={manualAdditionVisible}
                    icon={<OutlineHandIcon />}
                    disabled={!execute}
                    className={styles['btn-base']}
                    onClick={(e) => {
                      e.stopPropagation()
                    }}
                  />
                </YakitPopover>
              </div>
            )}

            <div className={styles['footer-right']}>
              {inputFooterRight}
              <YakitButton
                className={styles['round-btn']}
                radius="50%"
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
        <div className={styles['ai-chat-textarea-footer']}>
          {footer ?? <>{renderFooterLeftTypes(footerLeftTypes)}</>}
        </div>
        {children}
      </div>
    )
  }),
)

const AIGlobalCommand: React.FC<AIGlobalCommandProps> = React.memo(
  forwardRef((props, ref) => {
    const { onCancel, onSave } = props
    const [{ aiGlobalConfig }] = useAIGlobalConfig()
    const [prompt, setPrompt] = useState<string>(aiGlobalConfig.AIPresetPrompt || '')
    useImperativeHandle(ref, () => ({ value: prompt }), [prompt])
    return (
      <div className={styles['ai-global-command']} onClick={(e) => e.stopPropagation()}>
        <div className={styles['ai-global-command-heard']}>全局命令</div>
        <YakitInput.TextArea
          rows={5}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          isShowResize={false}
          onPressEnter={() => onSave(prompt)}
          placeholder="全局命令将对所有会话生效..."
        />
        <div className={styles['ai-global-command-footer']}>
          <YakitButton type="outline2" onClick={onCancel}>
            取消
          </YakitButton>
          <YakitButton
            onClick={() => {
              onSave(prompt)
            }}
          >
            保存
          </YakitButton>
        </div>
      </div>
    )
  }),
)

const AIManualAddition: React.FC<AIManualAdditionProps> = React.memo((props) => {
  const { onCancel } = props
  const { handleSendSyncMessage, chatIPCEvents } = useChatIPCDispatcher()
  const { chatIPCData, syncIdInfoMap } = useChatIPCStore()
  const [prompt, setPrompt] = useState<string>()

  const currentCoordinatorIdRef = useRef<string>('')
  const syncIdOfAddToContext = useRef<string>('')
  const syncIdOfAddAndReExecute = useRef<string>('')

  const taskStatus = useCreation(() => chatIPCData?.taskStatus, [chatIPCData?.taskStatus])

  useUpdateEffect(() => {
    if (!taskStatus.loading && currentCoordinatorIdRef.current) {
      onSendRecover(currentCoordinatorIdRef.current)
    }
  }, [taskStatus.loading])

  useEffect(() => {
    if (
      (syncIdOfAddToContext.current && !syncIdInfoMap?.get(syncIdOfAddToContext.current)) ||
      (syncIdOfAddAndReExecute.current && !syncIdInfoMap?.get(syncIdOfAddAndReExecute.current))
    ) {
      onCancel()
      setPrompt('')
      if (syncIdOfAddToContext.current) syncIdOfAddToContext.current = ''
      if (syncIdOfAddAndReExecute.current) syncIdOfAddAndReExecute.current = ''
    }
  }, [syncIdInfoMap])

  const onAddAndReExecute = useMemoizedFn(() => {
    if (!prompt?.trim()) return
    // 加入上下文后，停止任务再恢复任务
    syncIdOfAddAndReExecute.current = randomString(8)
    onAddToContext(syncIdOfAddAndReExecute.current)
    const info = chatIPCEvents.fetchTaskChatID()
    const taskId = info?.taskID
    const coordinatorId = info?.coordinatorId
    if (!coordinatorId) return
    currentCoordinatorIdRef.current = coordinatorId
    chatIPCEvents.handleCancelLoadingChange('task', true)
    if (taskStatus?.loading && taskId) {
      // 选停止当前任务，等待任务停止成功后，再发送恢复的数据
      handleSendSyncMessage({
        syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CANCEL_TASK,
        SyncJsonInput: JSON.stringify({ task_id: taskId }),
      })
    } else {
      onSendRecover(coordinatorId)
    }
  })
  const onSendRecover = useMemoizedFn((coordinatorId: string) => {
    handleSendSyncMessage({
      syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_RECOVERY_PLAN_AND_EXEC,
      SyncJsonInput: JSON.stringify({ coordinator_id: coordinatorId }),
    })
    currentCoordinatorIdRef.current = ''
  })
  const onAddToContext = useMemoizedFn((syncID: string) => {
    if (!prompt?.trim()) return
    handleSendSyncMessage({
      syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_USER_INTERVENTION,
      SyncJsonInput: JSON.stringify({ content: prompt }),
      syncID: syncID,
    })
  })
  return (
    <div className={styles['ai-manual-addition']} onClick={(e) => e.stopPropagation()}>
      <div className={styles['ai-manual-addition-heard']}>手动介入</div>
      <YakitInput.TextArea
        rows={5}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        isShowResize={false}
        placeholder="输入补充内容会加入上下文影响任务执行"
      />
      <div className={styles['ai-manual-addition-footer']}>
        <YakitPopconfirm title="如果当前有任务正在执行,确认后会停止当前任务并重新执行" onConfirm={onAddAndReExecute}>
          <YakitButton
            type="outline2"
            onClick={(e) => e.stopPropagation()}
            loading={!!syncIdInfoMap?.get(syncIdOfAddAndReExecute.current)}
            className={styles['add-and-reexecute-btn']}
            disabled={!!syncIdInfoMap?.get(syncIdOfAddToContext.current)}
          >
            加入并重新执行
          </YakitButton>
        </YakitPopconfirm>
        <YakitButton
          onClick={() => {
            syncIdOfAddToContext.current = randomString(8)
            onAddToContext(syncIdOfAddToContext.current)
          }}
          loading={!!syncIdInfoMap?.get(syncIdOfAddToContext.current)}
          disabled={!!syncIdInfoMap?.get(syncIdOfAddAndReExecute.current)}
        >
          加入上下文
        </YakitButton>
      </div>
    </div>
  )
})
