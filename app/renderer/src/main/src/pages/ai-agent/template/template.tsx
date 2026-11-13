import type React from 'react'
import { Fragment, forwardRef, memo, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { ReactNode, Ref, RefAttributes } from 'react'
import { AIInputFooterRightEnum, AIInputInnerFeatureEnum } from './type'
import type {
  AIChatDraftMaterials,
  AIChatTextareaProps,
  AIChatTextareaSubmit,
  AIResourceIds,
  FileToChatQuestionList,
  FooterLeftTypesComponentProps,
  FooterRightTypesComponentProps,
  QSInputTextareaProps,
} from './type'
import { Input } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { AdjustmentsOutlined, ArrowUpOutlined, PlusSmOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { useCreation, useInViewport, useMemoizedFn } from 'ahooks'
import type { TextAreaRef } from 'antd/lib/input/TextArea'
import classNames from 'classnames'
import styles from './template.module.scss'
import { AIMilkdownInput } from '../components/aiMilkdownInput/AIMilkdownInput'
import type { EditorMilkdownProps } from '@/components/MilkdownEditor/MilkdownEditorType'
import { getMarkdown } from '@milkdown/kit/utils'
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
  insertAIMention,
  setEditorValue,
  unescapeUnderscoreInPath,
} from '../components/aiMilkdownInput/utils'
import { EditorStatus, editorViewCtx, serializerCtx } from '@milkdown/kit/core'
import type { Node as ProseMirrorNode } from '@milkdown/kit/prose/model'
import { convertKeyEventToKeyCombination } from '@/utils/globalShortcutKey/utils'
import { YakitKeyBoard } from '@/utils/globalShortcutKey/keyboard'
import { AIModelSelect } from '../aiModelList/aiModelSelect/AIModelSelect'
import AIReviewRuleSelect from '@/pages/ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect'
import isString from 'lodash/isString'
import isEqual from 'lodash/isEqual'
import AIAddMaterialsPopover from './aiAddMaterialsPopover/AIAddMaterialsPopover'
import { AIInputSettingPopover } from '@/pages/ai-re-act/aiReActTaskChat/AIReActTaskChat'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { yakitNotify } from '@/utils/notification'
import type { AIMilkdownInputRef } from '../components/aiMilkdownInput/type'
import type { AICodeBlockCommandParams } from '../components/aiMilkdownInput/aiCodeBlock/aiCustomCodeBlockPlugin'
import AIRunModeSelect from '../aiRunModeSelect/AIRunModeSelect'
import { aiResourceReferenceCustomSchema } from '../components/aiMilkdownInput/aiMilkdownResourceReference/aiResourceReferencePlugin'
import type { AIResourceReferenceParams } from '../components/aiMilkdownInput/aiMilkdownResourceReference/aiResourceReferencePlugin'
import { parseResourceReferenceIds } from '../components/aiMilkdownInput/aiMilkdownResourceReference/resourceReferenceIds'
import { AI_RESOURCE_REFERENCE_SUMMARY_THRESHOLD } from '../components/aiMilkdownInput/constants'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import { globalSessionEngine } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'

const isSameMaterial = (first: AIMentionCommandParams, second: AIMentionCommandParams) =>
  first.mentionType === second.mentionType && first.mentionId === second.mentionId

const getMaterialKey = ({ mentionType, mentionSource, mentionId }: AIMentionCommandParams) =>
  `${mentionType}:${mentionSource ?? ''}:${mentionId}`

const resourceTypes = ['http', 'risk'] as const

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
    } = props
    const defaultValue = initialDraft?.markdown ?? props.defaultValue
    const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])

    const sessionId = useCurrentSessionId()
    const [inputSettingVisible, setInputSettingVisible] = useState<boolean>(false)
    const [runModeOpen, setRunModeOpen] = useState(false)

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
      return [{ type: AIInputInnerFeatureEnum.AIReviewRuleSelect }]
    }, [props.footerLeftTypes, isOpen])

    const footerRightTypes: FooterRightTypesComponentProps[] = props.footerRightTypes ?? [
      { type: AIInputFooterRightEnum.AIModelSelect, props: { isOpen } },
    ]

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
    const onRemoveMaterial = (material: AIMentionCommandParams) => {
      const key = getMaterialKey(material)
      const matchesMaterial = (mention: AIMentionCommandParams) => getMaterialKey(mention) === key
      setDraftMaterials((current) => {
        // 列表删除仅隐藏资料栏中的正文提及，保留编辑器节点。
        const shouldHideInline = !current.hiddenInlineKeys.includes(key) && current.mentions.some(matchesMaterial)
        return {
          ...current,
          selectedMaterials: current.selectedMaterials.filter((mention) => !matchesMaterial(mention)),
          hiddenInlineKeys: shouldHideInline ? [...current.hiddenInlineKeys, key] : current.hiddenInlineKeys,
        }
      })
    }
    /**设置编辑器值 */
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
      // remark-stringify 会将下划线 _ 转义为 \_（强调字符），
      // 导致路径等含下划线的纯文本被破坏，此处仅对路径上下文反转义还原
      return unescapeUnderscoreInPath(value.replace(/\n+$/, ''))
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

          default:
            break
        }
      })
      return node
    })
    const renderFooterRightTypes = useMemoizedFn((types: FooterRightTypesComponentProps[]) => {
      const node: ReactNode[] = []
      types?.forEach((item) => {
        switch (item.type) {
          case AIInputFooterRightEnum.AIModelSelect:
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
          case AIInputFooterRightEnum.Custom:
            node.push(<Fragment key={item.key}>{item.component}</Fragment>)
            break
          default:
            break
        }
      })
      return node
    })

    const visibleInlineMaterials = draftMaterials.mentions.filter(
      (mention) => !draftMaterials.hiddenInlineKeys.includes(getMaterialKey(mention)),
    )

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
        onClick={handleSetTextareaFocus}
        ref={dropRef}
      >
        {isHovering && <div className={styles['drag-hint']}>{t('AIChatTextarea.dropToAddToChat')}</div>}
        <AIAddMaterialsPopover
          showScenarioCapabilities={showScenarioCapabilities}
          initialEnabledCapabilities={initialDraft?.enabledCapabilities}
          onEnabledCapabilitiesChange={onEnabledCapabilitiesChange}
          onAdd={onAddMaterial}
          onRemove={onRemoveMaterial}
          mentions={[...selectedMaterials, ...visibleInlineMaterials]}
          resourceIds={draftMaterials.resourceIds}
          selectedResourceIds={selectedResourceIds}
          focusMode={focusMode}
          onFocusModeChange={setFocusMode}
          filterMode={filterMentionType}
        >
          {(materialsOpen, toggleMaterials, summary, materialsMenuOpen) => (
            <div className={classNames(styles['textarea-wrapper'])} onKeyDown={handleTextareaKeyDown}>
              <div className={styles['materials-row']}>
                <YakitButton
                  type="text2"
                  className={styles['material-add']}
                  data-menu-open={materialsMenuOpen || undefined}
                  aria-label={t('AIChatTextarea.addMaterials')}
                  aria-expanded={materialsOpen}
                  aria-haspopup="dialog"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleMaterials()
                  }}
                  onKeyDown={(e) => e.stopPropagation()}
                  icon={<PlusSmOutlined />}
                />
                {summary ?? (
                  <div
                    className={styles['material-add-label']}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleMaterials()
                    }}
                  >
                    {t('AIChatTextarea.addMaterials')}
                  </div>
                )}
              </div>
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
                onModeChangeComplete={() => setRunModeOpen(true)}
              />
              <div className={styles['footer']}>
                {inputFooterLeft ?? (
                  <div className={styles['footer-left']}>
                    {renderFooterLeftTypes(footerLeftTypes)}
                    <AIRunModeSelect open={runModeOpen} onOpenChange={setRunModeOpen} />
                    <AIInputSettingPopover visible={inputSettingVisible} setVisible={setInputSettingVisible}>
                      <YakitButton
                        type="text2"
                        icon={<AdjustmentsOutlined color="currentColor" />}
                        onClick={(e) => e.stopPropagation()}
                        className={styles['btn-base']}
                        isActive={inputSettingVisible}
                      />
                    </AIInputSettingPopover>
                  </div>
                )}

                <div className={styles['footer-right']}>
                  {renderFooterRightTypes(footerRightTypes)}
                  {inputFooterRight}
                  <YakitButton
                    className={styles['round-btn']}
                    aria-label={t('YakitButton.send')}
                    radius="50%"
                    loading={loading}
                    disabled={
                      disabled &&
                      !resourceTypes.some((type) => selectedResourceIds[type].length) &&
                      !selectedMaterials.length
                    }
                    icon={<ArrowUpOutlined color="currentColor" />}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSubmit()
                    }}
                  />
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
