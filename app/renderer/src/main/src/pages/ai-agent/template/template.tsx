import type React from 'react'
import { Fragment, forwardRef, memo, useContext, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { ReactNode, Ref, RefAttributes } from 'react'
import { AIInputFooterRightEnum, AIInputInnerFeatureEnum, defaultFooterLeftTypes } from './type'
import type {
  AIChatDraftMaterials,
  AIChatTextareaProps,
  AIChatTextareaSubmit,
  AIResourceIds,
  FileToChatQuestionList,
  QSInputTextareaProps,
} from './type'
import { Input } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import {
  AdjustmentsOutlined,
  ArrowUpOutlined,
  DotsHorizontalOutlined,
  PlusSmOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { useCreation, useInViewport, useMemoizedFn, useUpdateEffect } from 'ahooks'
import type { TextAreaRef } from 'antd/lib/input/TextArea'
import classNames from 'classnames'
import styles from './template.module.scss'
import { AIMilkdownInput } from '../components/aiMilkdownInput/AIMilkdownInput'
import type { EditorMilkdownProps } from '@/components/MilkdownEditor/MilkdownEditorType'
import { callCommand, getMarkdown } from '@milkdown/kit/utils'
import useAIChatDrop from '../aiChatWelcome/hooks/useAIChatDrop'
import {
  aiMentionCustomId,
  aiMentionCustomSchema,
} from '../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import type { AIMentionCommandParams } from '../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import emiter from '@/utils/eventBus/eventBus'
import type { AIAgentTriggerEventInfo } from '../aiAgentType'
import {
  extractDataWithMilkdown,
  setEditorValue,
  normalizeSubmittedMarkdown,
} from '../components/aiMilkdownInput/utils'
import { insertAIMention, insertAIShortcutCommand } from '../components/aiMilkdownInput/customPlugin'
import { EditorStatus, editorViewCtx, serializerCtx } from '@milkdown/kit/core'
import type { Node as ProseMirrorNode } from '@milkdown/kit/prose/model'
import { convertKeyEventToKeyCombination } from '@/utils/globalShortcutKey/utils'
import { YakitKeyBoard } from '@/utils/globalShortcutKey/keyboard'
import { AIModelSelect } from '../aiModelList/aiModelSelect/AIModelSelect'
import AIReviewRuleSelect from '@/pages/ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect'
import { AIFocusMode } from '@/pages/ai-re-act/aiFocusMode/AIFocusMode'
import isEqual from 'lodash/isEqual'
import AIAddMaterialsPopover from './aiAddMaterialsPopover/AIAddMaterialsPopover'
import InputSummaryRow from './InputSummaryRow/InputSummaryRow'
import { ChatContentWidthContext } from '../aiAgentChat/AIAgentChatLayout/ChatContentWidthContext'
import { useStrategySetupTags } from './StrategySetupTags'
import type { AddMaterialsControls, MaterialShortcut } from './aiAddMaterialsPopover/type'
import { AIInputSettingPopover } from '@/pages/ai-re-act/aiReActTaskChat/AIReActTaskChat'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { yakitNotify } from '@/utils/notification'
import type { AIMilkdownInputRef } from '../components/aiMilkdownInput/type'
import type { AICodeBlockCommandParams } from '../components/aiMilkdownInput/aiCodeBlock/aiCustomCodeBlockPlugin'
import AIRunModeSelect from '../aiRunModeSelect/AIRunModeSelect'
import AIContextUsage from './AIContextUsage/AIContextUsage'
import { useCurrentModelContextReset } from '../useContext/useAIModelContext'
import AIRunningStatus from './AIRunningStatus/AIRunningStatus'
import { RoundedStopButton } from '@/pages/ai-re-act/aiReActChat/AIReActComponent'
import { aiResourceReferenceCustomSchema } from '../components/aiMilkdownInput/aiMilkdownResourceReference/aiResourceReferencePlugin'
import type { AIResourceReferenceParams } from '../components/aiMilkdownInput/aiMilkdownResourceReference/aiResourceReferencePlugin'
import { parseResourceReferenceIds } from '../components/aiMilkdownInput/aiMilkdownResourceReference/resourceReferenceIds'
import { AI_RESOURCE_REFERENCE_SUMMARY_THRESHOLD } from '../components/aiMilkdownInput/constants'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { AIInputEventSyncTypeEnum, AITaskStatus } from '@/pages/ai-re-act/hooks/grpcApi'
import type { AIInputEvent } from '@/pages/ai-re-act/hooks/grpcApi'
import useAIAgentStore from '../useContext/useStore'
import useAIAgentDispatcher from '../useContext/useDispatcher'
import { randomString } from '@/utils/randomUtil'
import { useStore } from 'zustand'
import useListenWidth from '@/pages/pluginHub/hooks/useListenWidth'
import { globalSessionEngine } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'
import { getWorkspaceAddedCounts, type WorkspaceAddedCounts } from './aiAddMaterialsPopover/workspaceAddedCounts'

const isSameMaterial = (first: AIMentionCommandParams, second: AIMentionCommandParams) =>
  first.mentionType === second.mentionType && first.mentionId === second.mentionId

const getMaterialKey = ({ mentionType, mentionSource, mentionId }: AIMentionCommandParams) =>
  `${mentionType}:${mentionSource ?? ''}:${mentionId}`

const resourceTypes = ['http', 'risk'] as const
const defaultFooterRightTypes = [
  AIInputFooterRightEnum.AIContextUsage,
  // AIInputFooterRightEnum.AIRunningStatus,
]

const getResourceIds = (references: AIResourceReferenceParams[]): AIResourceIds => {
  const ids: AIResourceIds = { http: [], risk: [] }
  for (const reference of references) ids[reference.type].push(...reference.ids)
  return { http: parseResourceReferenceIds(ids.http), risk: parseResourceReferenceIds(ids.risk) }
}

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
      onSubmitWithDraft,
      className,
      milkdownClassName,
      children,
      initialDraft,
      isOpen,
      filterMentionType,
      chatDataStoreKey,
      showScenarioCapabilities,
      onWorkspaceAddedChange,
    } = props
    const defaultValue = initialDraft?.markdown ?? props.defaultValue
    const widthMode = useContext(ChatContentWidthContext)
    const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])

    const sessionId = useCurrentSessionId()
    const { pendingChat } = useAIAgentStore()
    const { onSend, cancelPendingChat } = useAIAgentDispatcher()
    const store = useCurrentStore()
    const running = useStore(
      store,
      (state) => !onSubmitWithDraft && state.currentChatStatus.status === AITaskStatus.inProgress,
    )
    const stopLoading = useStore(store, (state) => state.cancelChatLoading)
    const strategyTags = useStrategySetupTags()
    const onStop = useMemoizedFn(() => {
      if (pendingChat) {
        cancelPendingChat()
        return
      }
      const { execute, currentChatStatus, updateState } = store.getState()
      if (!execute || !currentChatStatus.questionID) return

      updateState({ cancelChatLoading: true })
      const params: AIInputEvent = {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CANCEL_TASK,
        SyncJsonInput: JSON.stringify({ task_id: currentChatStatus.questionID }),
        SyncID: randomString(8),
      }
      onSend({ token: sessionId, type: 'casual', params })
    })
    const [inputSettingVisible, setInputSettingVisible] = useState<boolean>(false)
    const [footerMoreOpen, setFooterMoreOpen] = useState(false)
    const footerLeftRef = useRef<HTMLDivElement>(null)

    const [disabled, setDisabled] = useState<boolean>(!defaultValue?.trim())
    const [draftMaterials, setDraftMaterials] = useState<AIChatDraftMaterials>({
      resourceIds: { http: [], risk: [] },
      mentions: [],
      selectedMaterials: initialDraft?.selectedMaterials ?? [],
      hiddenInlineKeys: initialDraft?.hiddenInlineKeys ?? [],
    })

    const { selectedMaterials } = draftMaterials
    const selectedResourceIds: AIResourceIds = {
      http: props.selectedHttpFlowIds ?? [],
      risk: props.selectedRiskIds ?? [],
    }

    const { isHovering, dropRef } = useAIChatDrop({
      onFilesChange: (v) => onFilesChange(v),
    })
    const footerLeftWidth = useListenWidth(footerLeftRef)
    const compactFooterLeft = footerLeftWidth > 0 && footerLeftWidth < 360
    const [inputVisible] = useInViewport(dropRef)
    const inViewport = inputVisible ?? true
    useCurrentModelContextReset(inputVisible === true)
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
        emiter.on('removeAIFileMaterial', onRemoveFileMaterial)
        return () => {
          emiter.off('setAIInputByType', onSetAIInputByType)
          emiter.off('removeAIFileMaterial', onRemoveFileMaterial)
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
    const enabledCapabilitiesRef = useRef(initialDraft?.enabledCapabilities)
    const onEnabledCapabilitiesChange = useMemoizedFn(
      (items: NonNullable<AIChatTextareaSubmit['enabledCapabilities']>) => {
        enabledCapabilitiesRef.current = items
      },
    )
    const handleSubmit = useMemoizedFn(() => {
      if (!editorMilkdown.current) return
      const { mentions, imageList, resourceReferences, codeBlockList } = extractDataWithMilkdown(editorMilkdown.current)
      // 保存完成事件写回图片路径前，不能将 blob 地址交给会话绑定和图片采纳流程。
      if (imageList.some((src) => src.startsWith('blob:'))) {
        yakitNotify('warning', t('AIMilkdownInput.imagesNotSaved'))
        return
      }
      const markdown = getMarkdownValue()
      let qs = markdown
      const additionalMentions = selectedMaterials.filter(
        (material) => !mentions.some((mention) => isSameMaterial(mention, material)),
      )
      const inlineResourceIds = getResourceIds(resourceReferences)
      const additionalReferences = resourceTypes.flatMap((type): AIResourceReferenceParams[] => {
        const inlineIds = new Set(inlineResourceIds[type])
        const ids = parseResourceReferenceIds(selectedResourceIds[type]).filter((id) => !inlineIds.has(id))
        if (!ids.length) return []
        const isSummary = ids.length >= AI_RESOURCE_REFERENCE_SUMMARY_THRESHOLD
        const displayText = isSummary
          ? t(type === 'http' ? 'AIMilkdownInput.selectedHttpFlowSummary' : 'AIMilkdownInput.selectedRiskSummary', {
              count: ids.length,
            })
          : ids.map((id) => '#' + id).join(', ')
        return [{ type, ids, displayText, isSummary }]
      })
      if (!qs.trim() && !additionalReferences.length && !additionalMentions.length) return
      if (additionalReferences.length || additionalMentions.length) {
        // 独立选择的资料只在提交时序列化，供历史消息回显。
        const referenceMarkdown = editorMilkdown.current.action((ctx) => {
          const { schema } = ctx.get(editorViewCtx).state
          const paragraphs: ProseMirrorNode[] = []
          for (const reference of additionalReferences) {
            const node = aiResourceReferenceCustomSchema.type(ctx).create(reference, schema.text(reference.displayText))
            paragraphs.push(schema.nodes.paragraph.create(null, node))
          }
          if (additionalMentions.length) {
            const mentionType = aiMentionCustomSchema.type(ctx)
            const references = additionalMentions.map((item) => mentionType.create(item, schema.text(item.mentionName)))
            paragraphs.push(schema.nodes.paragraph.create(null, references))
          }
          const doc = schema.topNodeType.create(null, paragraphs)
          return ctx.get(serializerCtx)(doc).trim()
        })
        qs = [referenceMarkdown, qs].filter(Boolean).join('\n\n')
      }
      const value: AIChatTextareaSubmit = {
        ...(showScenarioCapabilities ? { enabledCapabilities: enabledCapabilitiesRef.current ?? [] } : {}),
        qs,
        mentionList: [...additionalMentions, ...mentions],
        imageList,
        resourceReferences: [...resourceReferences, ...additionalReferences],
        codeBlockList,
        showQS: qs,
        focusMode,
        sessionId: aiMilkdownInputRef.current?.getSessionId(),
      }
      if (!onSubmitWithDraft) {
        onSubmit?.(value)
        return
      }
      onSubmitWithDraft(value, {
        markdown,
        selectedMaterials,
        hiddenInlineKeys: draftMaterials.hiddenInlineKeys,
        selectedResourceIds,
        focusMode,
        enabledCapabilities: value.enabledCapabilities,
      })
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

    // 编辑器未就绪时的 mention 先排队，就绪后补插（挂载即注入场景）
    const pendingMentionsRef = useRef<AIMentionCommandParams[]>([])
    const pendingShortcutRef = useRef<MaterialShortcut>()
    const onInsertShortcut = useMemoizedFn((shortcut: MaterialShortcut) => {
      const editor = editorMilkdown.current
      if (editor?.status !== EditorStatus.Created) {
        pendingShortcutRef.current = shortcut
        return
      }
      editor.action(callCommand(insertAIShortcutCommand.key, shortcut))
    })

    const updateDraftMaterials = (editor: EditorMilkdownProps) => {
      const { mentions, draftMentions: materials, resourceReferences } = extractDataWithMilkdown(editor)
      if (sessionId) {
        const { draftMaterials: sessionDraftMaterials } = globalSessionEngine.ensureSession(sessionId).rawData
        const files = [
          ...new Map(
            mentions
              .filter((item) => ['file', 'folder'].includes(item.mentionType) && item.mentionSource !== 'attachment')
              .map((item) => [
                item.mentionId,
                sessionDraftMaterials.files.find((file) => file.path === item.mentionId) || {
                  path: item.mentionId,
                  name: item.mentionName,
                  isFolder: item.mentionType === 'folder',
                },
              ]),
          ).values(),
        ]
        if (!isEqual(sessionDraftMaterials.files, files)) {
          globalSessionEngine.updateDraftMaterials(sessionId, 'files', files)
        }
      }
      const resourceIds = getResourceIds(resourceReferences)
      setDraftMaterials((current) => {
        if (isEqual(current.mentions, materials)) {
          return isEqual(current.resourceIds, resourceIds) ? current : { ...current, resourceIds }
        }

        const inlineKeys = materials.map(getMaterialKey)
        const previousKeys = current.mentions.map(getMaterialKey)
        return {
          resourceIds,
          mentions: materials,
          selectedMaterials: current.selectedMaterials.filter(
            (material) => !inlineKeys.includes(getMaterialKey(material)),
          ),
          hiddenInlineKeys: current.hiddenInlineKeys.filter((key) => {
            const occurrences = inlineKeys.filter((item) => item === key).length
            return (
              occurrences > 0 &&
              (occurrences <= previousKeys.filter((item) => item === key).length || !previousKeys.length)
            )
          }),
        }
      })
    }
    const onUpdateEditor = useMemoizedFn((editor: EditorMilkdownProps) => {
      editorMilkdown.current = editor
      const pending = pendingMentionsRef.current
      pendingMentionsRef.current = []
      pending.forEach((item) => insertAIMention(editor, item))
      updateDraftMaterials(editor)
      const shortcut = pendingShortcutRef.current
      pendingShortcutRef.current = undefined
      if (shortcut) onInsertShortcut(shortcut)
    })

    const onFilesChange = useMemoizedFn((files: FileToChatQuestionList[]) => {
      for (const item of files) {
        onSetMention({
          mentionId: item.path,
          mentionType: item.isFolder ? 'folder' : 'file',
          mentionName: item.path,
          mentionSource: item.mentionSource,
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
          if (!editorMilkdown.current) {
            pendingMentionsRef.current.push(params)
            break
          }
          insertAIMention(editorMilkdown.current, params)
          updateDraftMaterials(editorMilkdown.current)
          break
      }
    })
    const onAddMaterial = useMemoizedFn((material: AIMentionCommandParams) => {
      const key = getMaterialKey(material)
      if (draftMaterials.hiddenInlineKeys.includes(key)) {
        setDraftMaterials((current) => ({
          ...current,
          hiddenInlineKeys: current.hiddenInlineKeys.filter((hiddenKey) => hiddenKey !== key),
        }))
        return
      }

      if (
        material.mentionType === 'forge' ||
        material.mentionType === 'knowledgeBase' ||
        material.mentionType === 'tool'
      ) {
        setDraftMaterials((current) => ({
          ...current,
          selectedMaterials: [...current.mentions, ...current.selectedMaterials].some((item) =>
            isSameMaterial(item, material),
          )
            ? current.selectedMaterials
            : [...current.selectedMaterials, material],
        }))
      } else {
        onSetMention(material)
      }
    })
    const onRemoveFileMaterial = useMemoizedFn((value: string) => {
      const data: { sessionId: string; path: string } = JSON.parse(value)
      if (!sessionId || data.sessionId !== sessionId) return
      const editor = editorMilkdown.current
      if (!editor) return
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        const { doc, tr } = view.state
        doc.descendants((node, position) => {
          if (
            node.type.name === aiMentionCustomId &&
            ['file', 'folder'].includes(node.attrs.mentionType) &&
            node.attrs.mentionSource !== 'attachment' &&
            node.attrs.mentionId === data.path &&
            !node.attrs.lock
          ) {
            tr.delete(tr.mapping.map(position), tr.mapping.map(position + node.nodeSize))
            return false
          }
        })
        view.dispatch(tr)
      })
      updateDraftMaterials(editor)
    })
    const onRemoveMaterials = (materials: AIMentionCommandParams[]) => {
      const keys = new Set(materials.filter((material) => !material.lock).map(getMaterialKey))
      setDraftMaterials((current) => {
        // 列表删除仅隐藏资料栏中的正文提及，保留编辑器节点。
        const hiddenInlineKeys = new Set(current.hiddenInlineKeys)
        for (const mention of current.mentions) {
          const key = getMaterialKey(mention)
          if (!mention.lock && keys.has(key)) hiddenInlineKeys.add(key)
        }
        return {
          ...current,
          selectedMaterials: current.selectedMaterials.filter(
            (mention) => mention.lock || !keys.has(getMaterialKey(mention)),
          ),
          hiddenInlineKeys: [...hiddenInlineKeys],
        }
      })
    }
    /** 整体替换正文时一并清空旧草稿的隐藏记录，避免新正文中的同一 ID 被隐藏。 */
    const onSetValue = useMemoizedFn((value: string) => {
      setDraftMaterials((current) =>
        current.selectedMaterials.length || current.hiddenInlineKeys.length
          ? { ...current, selectedMaterials: [], hiddenInlineKeys: [] }
          : current,
      )
      const editor = editorMilkdown.current
      if (!editor) return
      setEditorValue(editor, value)
      if (editor.status === EditorStatus.Created) updateDraftMaterials(editor)
    })
    const getMarkdownValue = useMemoizedFn(() => {
      const value = editorMilkdown.current?.action(getMarkdown()) || ''
      return normalizeSubmittedMarkdown(value)
    })

    const onUpdateContent = useMemoizedFn((value: string) => {
      setDisabled(!value.trim())
      const editor = editorMilkdown.current
      if (editor?.status === EditorStatus.Created) updateDraftMaterials(editor)
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
    const [focusMode, setFocusMode] = useState(initialDraft?.focusMode)

    const onMemfitExtra = useMemoizedFn(({ mentionName }: AIMentionCommandParams) => {
      setFocusMode(mentionName)
    })

    const { inlineItems, moreItems, footerRightItems, showFooterMore } = useCreation(() => {
      const footerLeftItems = (props.footerLeftTypes ?? defaultFooterLeftTypes).map((item) =>
        typeof item === 'string' ? { type: item, props: undefined, component: undefined } : item,
      )
      const inlineItems: typeof footerLeftItems = []
      const moreItems: typeof footerLeftItems = []
      for (const item of footerLeftItems) {
        const { type } = item
        const inMoreMenu =
          compactFooterLeft &&
          (type === AIInputInnerFeatureEnum.AIModelSelect ||
            type === AIInputInnerFeatureEnum.AIFocusMode ||
            type === AIInputInnerFeatureEnum.AIInputSettings)
        const items = inMoreMenu ? moreItems : inlineItems
        items.push(item)
      }

      const footerRightItems = (props.footerRightTypes ?? defaultFooterRightTypes).map((item) =>
        typeof item === 'string' ? { type: item } : item,
      )
      return {
        inlineItems,
        moreItems,
        footerRightItems,
        showFooterMore: inputFooterLeft == null && moreItems.length > 0,
      }
    }, [props.footerLeftTypes, props.footerRightTypes, compactFooterLeft, inputFooterLeft])

    useEffect(() => {
      if (!showFooterMore) setFooterMoreOpen(false)
    }, [showFooterMore])
    useUpdateEffect(() => {
      setInputSettingVisible(false)
    }, [compactFooterLeft])

    const showSideAdd =
      widthMode === 'wide' &&
      inputFooterLeft == null &&
      inlineItems.some((item) => item.type === AIInputInnerFeatureEnum.AddMaterials && item.component == null)

    const renderAddMaterialsButton = ({ open, menuOpen, toggle }: AddMaterialsControls, side = false) => (
      <YakitButton
        type="text2"
        className={styles[side ? 'material-side-add' : 'material-add']}
        data-ai-side-material-add={side || undefined}
        data-menu-open={menuOpen || undefined}
        aria-label={t('AIChatTextarea.addMaterials')}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={(event) => {
          event.stopPropagation()
          toggle()
        }}
        onKeyDown={(event) => event.stopPropagation()}
        icon={<PlusSmOutlined size={16} />}
      />
    )

    const renderFooterLeftTypes = (materialControls: AddMaterialsControls) => {
      const renderItem = (item: (typeof inlineItems)[number]): ReactNode => {
        switch (item.type) {
          case AIInputInnerFeatureEnum.AddMaterials:
            return <Fragment key={item.type}>{item.component ?? renderAddMaterialsButton(materialControls)}</Fragment>
          case AIInputInnerFeatureEnum.AIRunModeSelect:
            return <Fragment key={item.type}>{item.component ?? <AIRunModeSelect />}</Fragment>
          case AIInputInnerFeatureEnum.AIReviewRuleSelect:
            return (
              <Fragment key={item.type}>
                {item.component ?? (
                  <AIReviewRuleSelect
                    {...item.props}
                    className={classNames(styles['review-rule-self-adaptive'], item.props?.className)}
                  />
                )}
                {!compactFooterLeft && <div className={styles['divider-style']} />}
              </Fragment>
            )
          case AIInputInnerFeatureEnum.AIModelSelect:
            return (
              <Fragment key={item.type}>
                {item.component ?? (
                  <AIModelSelect
                    isOpen={isOpen}
                    {...item.props}
                    className={classNames(styles['model-self-adaptive'], item.props?.className)}
                  />
                )}
              </Fragment>
            )
          case AIInputInnerFeatureEnum.AIFocusMode:
            return (
              <Fragment key={item.type}>
                {item.component ?? (
                  <AIFocusMode
                    value={focusMode}
                    {...item.props}
                    onChange={item.props?.onChange ?? setFocusMode}
                    className={classNames(styles['focus-mode-self-adaptive'], item.props?.className)}
                  />
                )}
              </Fragment>
            )
          case AIInputInnerFeatureEnum.AIInputSettings:
            return (
              <Fragment key={item.type}>
                {item.component ?? (
                  <AIInputSettingPopover visible={inputSettingVisible} setVisible={setInputSettingVisible}>
                    <YakitButton
                      type="text2"
                      aria-label={t('AIRightPanel.aiSettings')}
                      aria-expanded={inputSettingVisible}
                      icon={<AdjustmentsOutlined color="currentColor" />}
                      onClick={(event) => event.stopPropagation()}
                      className={styles['settings-button']}
                      isActive={inputSettingVisible}
                    >
                      <span className={styles['settings-label']}>{t('AIRightPanel.aiSettings')}</span>
                    </YakitButton>
                  </AIInputSettingPopover>
                )}
              </Fragment>
            )
          default:
            return null
        }
      }

      return (
        <>
          {inlineItems.map(renderItem)}
          {showFooterMore && (
            <YakitPopover
              open={footerMoreOpen}
              trigger="click"
              placement="topLeft"
              arrow={false}
              destroyOnHidden
              styles={{ root: { width: 180 }, body: { padding: 4, borderRadius: 12 } }}
              onOpenChange={(open) => {
                setFooterMoreOpen(open)
                if (!open) setInputSettingVisible(false)
              }}
              content={
                <div
                  className={styles['footer-more-menu']}
                  role="dialog"
                  aria-label={t('YakitButton.more')}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  {moreItems.map(renderItem)}
                </div>
              }
            >
              <YakitButton
                type="text2"
                isActive={footerMoreOpen}
                className={styles['footer-more-button']}
                aria-label={t('YakitButton.more')}
                aria-expanded={footerMoreOpen}
                aria-haspopup="dialog"
                icon={<DotsHorizontalOutlined color="currentColor" />}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              />
            </YakitPopover>
          )}
        </>
      )
    }
    const renderFooterRightTypes = () =>
      footerRightItems.map((item) => {
        const component = 'component' in item ? item.component : undefined
        switch (item.type) {
          case AIInputFooterRightEnum.AIContextUsage:
            return <Fragment key={item.type}>{component ?? <AIContextUsage key={sessionId} />}</Fragment>
          case AIInputFooterRightEnum.AIRunningStatus:
            return <Fragment key={item.type}>{component ?? <AIRunningStatus />}</Fragment>
          case AIInputFooterRightEnum.Custom:
            return 'key' in item ? <Fragment key={item.key}>{item.component}</Fragment> : null
          default:
            return null
        }
      })
    const visibleInlineMaterials = draftMaterials.mentions.filter(
      (mention) => mention.lock || !draftMaterials.hiddenInlineKeys.includes(getMaterialKey(mention)),
    )
    const workspaceAdded = useCreation(
      () =>
        getWorkspaceAddedCounts({
          mentions: [...selectedMaterials, ...visibleInlineMaterials],
          resourceIds: draftMaterials.resourceIds,
          selectedResourceIds,
        }),
      [
        selectedMaterials,
        draftMaterials.mentions,
        draftMaterials.hiddenInlineKeys,
        draftMaterials.resourceIds,
        props.selectedHttpFlowIds,
        props.selectedRiskIds,
      ],
    )
    const reportedAddedRef = useRef<WorkspaceAddedCounts>()
    useEffect(() => {
      const previous = reportedAddedRef.current
      if (
        previous &&
        previous.risk === workspaceAdded.risk &&
        previous.traffic === workspaceAdded.traffic &&
        previous.fileSystem === workspaceAdded.fileSystem
      ) {
        return
      }
      reportedAddedRef.current = workspaceAdded
      onWorkspaceAddedChange?.(workspaceAdded)
    }, [workspaceAdded, onWorkspaceAddedChange])

    return (
      <div
        data-ai-input-card
        className={classNames(
          styles['ai-chat-textarea'],
          {
            [styles['dragging-from-tree']]: isHovering,
          },
          className,
        )}
        ref={dropRef}
      >
        {isHovering && <div className={styles['drag-hint']}>{t('AIChatTextarea.dropToAddToChat')}</div>}
        <AIAddMaterialsPopover
          strategyTagCount={strategyTags.length}
          showScenarioCapabilities={showScenarioCapabilities}
          initialEnabledCapabilities={initialDraft?.enabledCapabilities}
          onEnabledCapabilitiesChange={onEnabledCapabilitiesChange}
          onShortcut={onInsertShortcut}
          onAdd={onAddMaterial}
          onRemoveMaterials={onRemoveMaterials}
          onClearSelectedResources={props.onClearSelectedResources}
          mentions={[...selectedMaterials, ...visibleInlineMaterials]}
          resourceIds={draftMaterials.resourceIds}
          selectedResourceIds={selectedResourceIds}
        >
          {(materialControls) => (
            <div ref={materialControls.inputLayoutRef} className={styles['input-with-summary']}>
              <InputSummaryRow>
                {showSideAdd && renderAddMaterialsButton(materialControls, true)}
                {materialControls.summary}
                {strategyTags}
              </InputSummaryRow>
              <div
                className={styles['textarea-wrapper']}
                onClick={handleSetTextareaFocus}
                onKeyDown={handleTextareaKeyDown}
              >
                <AIMilkdownInput
                  ref={aiMilkdownInputRef}
                  classNameWrapper={milkdownClassName}
                  defaultValue={defaultValue}
                  onUpdateEditor={onUpdateEditor}
                  onUpdateContent={onUpdateContent}
                  onMemfitExtra={onMemfitExtra}
                  filterMode={filterMentionType}
                  materials={[...selectedMaterials, ...visibleInlineMaterials]}
                  focusMode={focusMode}
                  chatDataStoreKey={chatDataStoreKey}
                />
                <div className={styles['footer']} data-ai-input-footer>
                  <div className={styles['footer-left']} ref={footerLeftRef}>
                    {inputFooterLeft ?? renderFooterLeftTypes(materialControls)}
                  </div>

                  <div className={styles['footer-right']}>
                    <div className={styles['footer-status-items']}>
                      {renderFooterRightTypes()}
                      {inputFooterRight}
                    </div>
                    <YakitButton
                      type={running ? 'outline2' : undefined}
                      className={styles[running ? 'queue-send-btn' : 'round-btn']}
                      aria-label={t(running ? 'AIChatTextarea.queueSend' : 'YakitButton.send')}
                      radius={running ? '16px' : 9999}
                      loading={loading}
                      disabled={
                        disabled &&
                        !resourceTypes.some((type) => selectedResourceIds[type].length) &&
                        !selectedMaterials.length
                      }
                      icon={
                        <ArrowUpOutlined
                          color={running ? 'var(--Colors-Use-Neutral-Text-3-Secondary)' : 'currentColor'}
                        />
                      }
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSubmit()
                      }}
                    >
                      {running && <span className={styles['queue-send-label']}>{t('AIChatTextarea.queueSend')}</span>}
                    </YakitButton>
                    {running && (
                      <RoundedStopButton
                        aria-label={t('YakitButton.stop')}
                        loading={stopLoading}
                        onClick={(event) => {
                          event.stopPropagation()
                          onStop()
                        }}
                        onKeyDown={(event) => event.stopPropagation()}
                        style={{ width: 24, height: 24 }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </AIAddMaterialsPopover>
        {children}
      </div>
    )
  }),
)
