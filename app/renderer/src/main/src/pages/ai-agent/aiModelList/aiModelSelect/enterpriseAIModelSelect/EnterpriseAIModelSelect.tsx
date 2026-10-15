import React, { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import type {
  AIModelEditContentItemProps,
  AIModelEditContentProps,
  AIModelItemProps,
  AIModelSelectListProps,
  AIModelSelectListRef,
  ModelNameListRef,
  ModelNameOptionLabelProps,
} from './EnterpriseAIModelSelectType'
import type { AIModelSelectProps } from '../AIModelSelectType'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { useCreation, useDebounceFn, useInViewport, useMemoizedFn, useUpdateEffect } from 'ahooks'
import {
  type AIModelConfig,
  type AIModelTypeFileName,
  getModelName,
  grpcListAiModel,
  isForcedSetAIModal,
  isFreeEnd,
  isMemfitStart,
  sortMemfitNameFirst,
} from '../../utils'
import { normalizeReasoningEffort } from '../../aiModelForm/reasoningEffort'
import { providerToListAiModelConfig } from '../../aiModelForm/providerConfig'
import styles from './EnterpriseAIModelSelect.module.scss'
import classNames from 'classnames'
import { AIModelTypeEnum, AIModelTypeInterFileNameEnum, AIOnlineModelIconMap } from '../../../defaultConstant'
import { AIModelFreeTag, OutlineAtomIconByStatus, setAIModal } from '../../AIModelList'
import { AIChatSelect } from '@/pages/ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect'
import {
  BrainOutlined,
  CheckOutlined,
  CogOutlined,
  InformationCircleOutlined,
  PencilAltOutlined,
  RefreshOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { cloneDeep, isEqual, isNil } from 'lodash'
import emiter from '@/utils/eventBus/eventBus'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { Tooltip } from 'antd'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitRoute } from '@/enums/yakitRoute'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import useAIGlobalConfig from '@/pages/ai-re-act/hooks/useAIGlobalConfig'
import { createPortal } from 'react-dom'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { getMainOperatorPageBodyContainer } from '@/utils/getMainOperatorPageBodyContainer'

export const EnterpriseAIModelSelect: React.FC<AIModelSelectProps> = React.memo((props) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const { isOpen = true, mountContainer, className } = props
  //#region AI model

  const [{ aiGlobalConfig, queryLoading }, event] = useAIGlobalConfig()
  const [aiDraftConfig, setAIDraftConfig] = useState(() => cloneDeep(aiGlobalConfig))
  const pendingEditsRef = useRef<
    Array<
      {
        fileName: AIModelTypeFileName
        model: Pick<AIModelConfig, 'ProviderId' | 'ModelName' | 'IsOnline'>
      } & ({ type: 'select' } | { type: 'rename'; modelName: string })
    >
  >([])

  useEffect(() => {
    // 只在最新配置上重放尚未提交的操作，避免旧草稿带回已回滚的字段。
    const next = cloneDeep(aiGlobalConfig)
    for (const edit of pendingEditsRef.current) {
      const list = next[edit.fileName]
      const index = list.findIndex(
        (item) =>
          item.ProviderId === edit.model.ProviderId &&
          item.ModelName === edit.model.ModelName &&
          !!item.IsOnline === !!edit.model.IsOnline,
      )
      if (index < 0) continue
      const model = list[index]
      if (edit.type === 'select') {
        list.splice(index, 1)
        list.unshift(model)
      } else if (model.ModelName !== edit.modelName) {
        model.ModelName = edit.modelName
        delete model.EffortProbed
        delete model.ProbedExtendedEfforts
      }
    }
    setAIDraftConfig(next)
  }, [aiGlobalConfig])
  const [onlineLoading, setOnlineLoading] = useState<boolean>(false)
  const [open, setOpen] = useState<boolean>(false)
  const [modelListSession, setModelListSession] = useState(0)

  const refRef = useRef<HTMLDivElement>(null)
  const dropdownRenderRef = useRef<HTMLDivElement>(null)
  const modelListRef = useRef<AIModelSelectListRef>(null)

  const [inViewport = true] = useInViewport(refRef)

  useEffect(() => {
    if (!inViewport) return
    event.onRefresh(false)
    getAIModelListOption()

    emiter.on('onRefreshAvailableAIModelList', onRefreshAvailableAIModelList)
    return () => {
      emiter.off('onRefreshAvailableAIModelList', onRefreshAvailableAIModelList)
    }
  }, [inViewport])

  const onRefreshAvailableAIModelList = useMemoizedFn(() => {
    setOnlineLoading(true)
    event.onRefresh(false)
    getAIModelListOption()
  })

  const getAIModelListOption = useDebounceFn(
    () => {
      isForcedSetAIModal({
        t,
        pageKey: 'ai-agent',
        isOpen: isOpen,
        mountContainer: getMainOperatorPageBodyContainer(),
      })
        .catch(() => undefined)
        .finally(() => {
          setTimeout(() => {
            setOnlineLoading(false)
          }, 200)
        })
    },
    { wait: 200, leading: true },
  ).run

  const onSetOpen = useMemoizedFn((v: boolean) => {
    // 关闭时子树可能仍被 Select 缓存，直接清理挂在 body 上的编辑浮层。
    if (!v) modelListRef.current?.closeEditor()
    // Select 会缓存关闭后的下拉内容，每次打开重建列表以清理名称缓存和旧请求。
    if (v && !open) setModelListSession((session) => session + 1)
    setOpen(v)

    if (!v) {
      // 本轮操作已提交（或已抵消），后续失败回读只保留重新打开后的新操作。
      pendingEditsRef.current = []
      if (!isEqual(aiGlobalConfig, aiDraftConfig)) onSetAI()
    }
  })
  const closeOnWidthChange = useMemoizedFn(() => onSetOpen(false))
  /**
   * 更新AI配置
   * */
  const onSetAI = useMemoizedFn(() => {
    if (intelligentModels.length === 0) return
    event.setAIGlobalConfig(cloneDeep(aiDraftConfig)).catch(() => undefined)
  })

  const isHaveData = useCreation(() => {
    return (
      aiDraftConfig.IntelligentModels.length > 0 ||
      aiDraftConfig.LightweightModels.length > 0 ||
      aiDraftConfig.VisionModels.length > 0
    )
  }, [aiDraftConfig])

  //#endregion

  const renderContent = useMemoizedFn(() => {
    const modelName = getModelName(selectIntelligentItem?.ModelName)
    return (
      <YakitSelect.Option
        value="select"
        label={
          <div className={styles['select-option']}>
            {getIconByAI(selectIntelligentItem?.Provider.Type)}
            <span className={styles['select-option-text']} title={`${modelName}`}>
              {modelName}
            </span>
          </div>
        }
      >
        {selectList.length}
      </YakitSelect.Option>
    )
  })
  const intelligentModels = useCreation(() => {
    return aiDraftConfig.IntelligentModels
  }, [aiDraftConfig.IntelligentModels])
  const lightweightModels = useCreation(() => {
    return aiDraftConfig.LightweightModels
  }, [aiDraftConfig.LightweightModels])
  const visionModels = useCreation(() => {
    return aiDraftConfig.VisionModels
  }, [aiDraftConfig.VisionModels])

  const selectIntelligentItem = useCreation(() => {
    const intelligentItem = intelligentModels[0]
    return intelligentItem
  }, [intelligentModels])
  const selectList = useCreation(() => {
    const lightweightItem = lightweightModels[0]
    const visionItem = visionModels[0]
    const list: AIModelConfig[] = []
    // 顺序按照高质、轻量、视觉的优先级展示
    selectIntelligentItem && list.push(selectIntelligentItem)
    lightweightItem && list.push(lightweightItem)
    visionItem && list.push(visionItem)
    return list
  }, [selectIntelligentItem, lightweightModels, visionModels])

  const onAddModel = useMemoizedFn(() => {
    setAIModal({
      mountContainer,
      t,
      onSuccess: () => {
        onRefreshAvailableAIModelList()
      },
    })
  })
  const onSelect = useMemoizedFn(
    (
      item: AIModelConfig,
      options: {
        fileName: AIModelTypeFileName
        index: number
      },
    ) => {
      const { fileName, index } = options
      pendingEditsRef.current.push({ type: 'select', fileName, model: item })
      setAIDraftConfig((old) => {
        const newList = [...old[fileName]]
        newList.splice(index, 1)
        newList.unshift(item)
        return {
          ...old,
          [fileName]: newList,
        }
      })
    },
  )
  const onEdit = useMemoizedFn(
    (
      item: AIModelConfig,
      options: {
        fileName: AIModelTypeFileName
        index: number
      },
    ) => {
      const { fileName, index } = options
      const originalModel = aiDraftConfig[fileName][index]
      if (!originalModel) return
      pendingEditsRef.current.push({ type: 'rename', fileName, model: originalModel, modelName: item.ModelName })
      setAIDraftConfig((old) => {
        const newList = [...old[fileName]]
        // 浮层持有的 item 可能已过时，只应用名称修改；新名称需要重新探测。
        const currentModel = newList[index]
        if (!currentModel) return old
        const model = { ...currentModel, ModelName: item.ModelName }
        if (model.ModelName !== currentModel.ModelName) {
          delete model.EffortProbed
          delete model.ProbedExtendedEfforts
        }
        newList.splice(index, 1, model)
        return {
          ...old,
          [fileName]: newList,
        }
      })
    },
  )
  const openModelTab = useMemoizedFn(() => {
    emiter.emit('openPage', JSON.stringify({ route: YakitRoute.Settings, params: { anchor: 'ai-model' } }))
  })

  return (
    <div ref={refRef} className={className}>
      {isHaveData ? (
        <AIChatSelect
          dropdownRender={() => {
            return (
              <div className={styles['drop-select-wrapper']} ref={dropdownRenderRef}>
                <div className={styles['select-title']}>
                  <div className={styles['select-title-left']}>
                    <span>{t('AIModelSelect.selectModel')}</span>
                  </div>
                  <div className={styles['select-title-right']}>
                    <Tooltip title={t('AIModelSelect.openConfigTooltip')}>
                      <YakitButton
                        size="small"
                        type="text2"
                        icon={<CogOutlined color="currentColor" />}
                        onClick={openModelTab}
                      >
                        {t('AIModelSelect.manageModels')}
                      </YakitButton>
                    </Tooltip>
                    <Tooltip title={t('YakitButton.refresh')}>
                      <YakitButton
                        size="small"
                        type="text2"
                        icon={<RefreshOutlined color="currentColor" />}
                        loading={onlineLoading || queryLoading}
                        onClick={() => onRefreshAvailableAIModelList()}
                      />
                    </Tooltip>
                  </div>
                </div>
                <div className={styles['select-content']} onClick={(e) => e.stopPropagation()}>
                  {!!intelligentModels.length && (
                    <AIModelSelectList
                      key={modelListSession}
                      listRef={modelListRef}
                      type={AIModelTypeEnum.TierIntelligent}
                      title={t('AiAgengt.intelligentModels')}
                      subTitle={t('AIModelList.intelligentModelsDesc')}
                      list={intelligentModels}
                      onSelect={(item, index) =>
                        onSelect(item, {
                          fileName: AIModelTypeInterFileNameEnum.IntelligentModels,
                          index,
                        })
                      }
                      onEdit={(item, index) =>
                        onEdit(item, {
                          fileName: AIModelTypeInterFileNameEnum.IntelligentModels,
                          index,
                        })
                      }
                      dropdownRef={dropdownRenderRef}
                      triggerRef={refRef}
                      open={open}
                      onWidthChange={closeOnWidthChange}
                    />
                  )}
                </div>
                <YakitButton type="secondary2" onClick={onAddModel} className={styles['add-model-btn']}>
                  {t('AIModelList.addModel')}
                </YakitButton>
              </div>
            )
          }}
          open={open}
          setOpen={onSetOpen}
          optionLabelProp="label"
          value="select"
          closestClassName={`.${styles['edit-content']}`}
        >
          {renderContent()}
        </AIChatSelect>
      ) : (
        <></>
      )}
    </div>
  )
})

const AIModelSelectList: React.FC<AIModelSelectListProps> = React.memo((props) => {
  const { title, subTitle, list, onSelect, type, onEdit, dropdownRef, triggerRef, open, onWidthChange, listRef } = props
  const [currentSelectIndex, setCurrentSelectIndex] = useState<number>()
  const [currentItem, setCurrentItem] = useState<AIModelConfig>()

  const [editStyle, setEditStyle] = useState<React.CSSProperties>()
  const editContentRef = useRef<HTMLDivElement>(null)
  const editAnchorRef = useRef<DOMRect>()
  const [modelNameListMap, setModelNameListMap] = useState<Map<string, ModelNameListRef>>(() => new Map())

  useLayoutEffect(() => {
    if (isNil(currentSelectIndex)) return
    const dropdownRect = dropdownRef.current?.getBoundingClientRect()
    const contentRect = editContentRef.current?.firstElementChild?.getBoundingClientRect()
    const anchorRect = editAnchorRef.current
    if (!dropdownRect || !contentRect || !anchorRect) return

    const width = 200
    const left = window.innerWidth - dropdownRect.right < width ? dropdownRect.left - width - 6 : dropdownRect.right + 6
    // 名称异步加载后重新测量，贴近编辑按钮并与窗口底部保持至少 8px 间距。
    const top = Math.max(0, Math.min(anchorRect.top, window.innerHeight - contentRect.height - 8))
    setEditStyle({
      transform: `translate(${Math.max(0, left)}px, ${top}px)`,
      width,
    })
  }, [currentSelectIndex, modelNameListMap])

  const hideTimerRef = useRef<NodeJS.Timeout | null>(null)

  const clearHideTimer = useMemoizedFn(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  })
  const closeEditContent = useMemoizedFn(() => {
    clearHideTimer()
    setCurrentItem(undefined)
    setCurrentSelectIndex(undefined)
    setEditStyle(undefined)
  })
  useImperativeHandle(listRef, () => ({ closeEditor: closeEditContent }), [closeEditContent])

  const resetEditContent = useMemoizedFn(() => {
    closeEditContent()
    setModelNameListMap(new Map())
  })
  // 刷新或回滚后，旧位置不再是当前编辑模型时丢弃浮层和缓存。
  useUpdateEffect(() => {
    if (isNil(currentSelectIndex) || !currentItem) return
    const item = list[currentSelectIndex]
    if (
      !item ||
      item.ProviderId !== currentItem.ProviderId ||
      item.ModelName !== currentItem.ModelName ||
      !!item.IsOnline !== !!currentItem.IsOnline ||
      providerToListAiModelConfig(item.Provider) !== providerToListAiModelConfig(currentItem.Provider)
    ) {
      resetEditContent()
    }
  }, [list])

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      clearHideTimer()
    }
  }, [])
  useEffect(() => {
    if (!open || !triggerRef.current) return
    // 输入区域宽度变化会同时关闭二级编辑浮层和一级模型选择下拉框；高度变化保留当前状态。
    const input = triggerRef.current
    let previousWidth: number | undefined
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const width = entry.contentRect.width
      if (previousWidth !== undefined && width !== previousWidth) {
        closeEditContent()
        onWidthChange()
      }
      previousWidth = width
    })
    observer.observe(input)
    return () => observer.disconnect()
  }, [open, triggerRef])
  /** 缓存中有就取缓存中的数据，反之调用接口获取数据 */
  const getModelNameList = useMemoizedFn((item: AIModelConfig) => {
    const config = providerToListAiModelConfig(item.Provider)
    if (!config || modelNameListMap.has(config)) return
    onRefreshModelNameList(item)
  })
  /** 强制刷新 */
  const onRefreshModelNameList = useMemoizedFn((item: AIModelConfig) => {
    const config = providerToListAiModelConfig(item.Provider)
    if (!config) return
    const request: ModelNameListRef = { loading: true, list: [] }
    setModelNameListMap((current) => new Map(current).set(config, request))
    grpcListAiModel({ Config: config })
      .then(({ ModelName }) => sortMemfitNameFirst(ModelName || []))
      .catch(() => [])
      .then((list) => {
        setModelNameListMap((current) => {
          // 关闭或再次刷新后，忽略已经失效的请求。
          if (current.get(config) !== request) return current
          return new Map(current).set(config, { loading: false, list })
        })
      })
  })
  const onSelectItem = useMemoizedFn((e, item: AIModelConfig, index: number) => {
    resetEditContent()
    onSelect(item, index)
  })

  const onMouseEnterEditContent = useMemoizedFn((e) => {
    e.stopPropagation()
    clearHideTimer()
  })
  const onMouseLeaveEditContent = useMemoizedFn((e) => {
    e.stopPropagation()
    hideEditContent()
  })
  const onMouseEnterEdit = useMemoizedFn((e: React.MouseEvent, item: AIModelConfig, index: number) => {
    clearHideTimer()
    if (isEqual(currentSelectIndex, index)) return
    editAnchorRef.current = e.currentTarget.getBoundingClientRect()
    setCurrentItem(item)
    setCurrentSelectIndex(index)
    getModelNameList(item)
  })
  const onMouseLeaveList = useMemoizedFn(() => {
    hideEditContent()
  })
  // 统一的隐藏逻辑：开启定时器，如果 150ms 内没有被再次打断，则关闭弹窗
  const hideEditContent = useMemoizedFn(() => {
    clearHideTimer()
    hideTimerRef.current = setTimeout(closeEditContent, 150)
  })
  const onEditContentChange = useMemoizedFn((v: AIModelConfig) => {
    if (isNil(currentSelectIndex)) return
    setCurrentItem(cloneDeep(v))
    onEdit(v, currentSelectIndex)
  })
  return (
    <div className={styles['ai-model-select-list-wrapper']}>
      <div className={styles['ai-model-select-list-wrapper-header']}>
        <div className={styles['ai-model-select-list-wrapper-header-title']}>
          {title}
          <Tooltip title={subTitle}>
            <InformationCircleOutlined className={styles['icon-info']} color="currentColor" />
          </Tooltip>
        </div>
      </div>
      <div className={styles['ai-online-model-list']}>
        {list.map((item, index) => (
          <div
            key={index}
            className={classNames(styles['ai-online-model-list-row'])}
            onClick={(e) => onSelectItem(e, item, index)}
          >
            <AIModelItem
              type={type}
              item={item}
              checked={index === 0}
              isSelected={index === currentSelectIndex}
              onEdit={(item) => onEdit(item, index)}
              onMouseEnterEdit={(e) => onMouseEnterEdit(e, item, index)}
              onMouseLeaveEdit={onMouseLeaveList}
            />
          </div>
        ))}
      </div>
      {/* 必须通过createPortal方式建立元素(原因：初次不渲染) */}
      {createPortal(
        <div
          className={classNames(styles['edit-content'])}
          ref={editContentRef}
          style={editStyle}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onMouseEnter={onMouseEnterEditContent}
          onMouseLeave={onMouseLeaveEditContent}
        >
          {!isNil(currentSelectIndex) && !!currentItem && (
            <AIModelEditContent
              modelNameData={
                modelNameListMap.get(providerToListAiModelConfig(currentItem.Provider) || '') || {
                  loading: false,
                  list: [],
                }
              }
              item={currentItem}
              onEdit={onEditContentChange}
              onRefreshModelNameList={onRefreshModelNameList}
            />
          )}
        </div>,
        document.body,
      )}
    </div>
  )
})

const AIModelEditContent: React.FC<AIModelEditContentProps> = React.memo((props) => {
  const { modelNameData, item, onEdit, onRefreshModelNameList } = props
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const onEditChange = useMemoizedFn((v: string, filed: keyof AIModelConfig) => {
    if (!item) return
    const newItem: Pick<AIModelConfig, 'ModelName'> = {
      ModelName: '',
    }
    switch (filed) {
      case 'ModelName':
        newItem.ModelName = v
        break
      default:
        break
    }

    onEdit?.({
      ...item,
      ...newItem,
    })
  })
  const modelNameOptions = useCreation(() => {
    return modelNameData.list.map((modelName) => ({
      label: <ModelNameOptionLabel name={modelName} />,
      value: modelName,
    }))
  }, [modelNameData.list])
  const modelName = useCreation(() => item.ModelName, [item.ModelName])

  const onRefresh = useDebounceFn(
    useMemoizedFn((e) => {
      e.stopPropagation()
      onRefreshModelNameList(item)
    }),
    { wait: 200, leading: true },
  ).run
  return (
    //  ANCHOR[id=ai-model-edit-content] edit-content-wrapper
    <div className={styles['edit-content-wrapper']}>
      <YakitSpin size="small" spinning={modelNameData.loading}>
        <AIModelEditContentItem
          filed="ModelName"
          options={modelNameOptions}
          title={
            <div className={styles['edit-title']}>
              <span>{t('AIModelSelect.selectModel')}</span>
              <YakitButton
                type="text2"
                size="small"
                aria-label={t('YakitButton.refresh')}
                icon={<RefreshOutlined color="currentColor" />}
                onClick={onRefresh}
              />
            </div>
          }
          value={modelName}
          onChange={(v) => onEditChange(v, 'ModelName')}
          listClassName={styles['model-name-list']}
          emptyTips={
            <>
              {t('AIModelSelect.emptyModels')}
              <YakitButton size="small" onClick={onRefresh} type="text">
                {t('YakitButton.refresh')}
              </YakitButton>
            </>
          }
        />
      </YakitSpin>
    </div>
  )
})

const ModelNameOptionLabel: React.FC<ModelNameOptionLabelProps> = React.memo((props) => {
  const { name } = props
  const isMemfit = useCreation(() => {
    return isMemfitStart(name)
  }, [name])
  const isFree = useCreation(() => {
    return isFreeEnd(name)
  }, [name])
  return (
    <div className={styles['option-label-wrapper']}>
      <span className={styles['label']}>{getModelName(name)}</span>
      {isMemfit && <div className={styles['option-icon-wrapper']}>{AIOnlineModelIconMap['aibalance']}</div>}
      {isFree && <AIModelFreeTag />}
    </div>
  )
})

const AIModelEditContentItem: React.FC<AIModelEditContentItemProps> = React.memo((props) => {
  const { title, options, onChange, value, listClassName = '', emptyTips } = props
  const onSelect = useMemoizedFn((v: string) => {
    onChange(v)
  })
  return (
    <div className={styles['edit-content-item']}>
      <div className={styles['edit-content-title']}>{title}</div>
      <div className={classNames(styles['edit-content-options'], listClassName)}>
        {options.map((option) => (
          <div
            key={option.value}
            className={styles['edit-content-options-item']}
            onClick={() => onSelect(option.value)}
          >
            {option.label}
            {value === option.value && <CheckOutlined className={styles['edit-content-check']} color="currentColor" />}
          </div>
        ))}
        {!options?.length && !!emptyTips && <div className={styles['edit-content-options-empty']}>{emptyTips}</div>}
      </div>
    </div>
  )
})

const getIconByAI = (value) => {
  return AIOnlineModelIconMap[value] || <OutlineAtomIconByStatus size="small" />
}

const AIModelItem: React.FC<AIModelItemProps> = React.memo((props) => {
  const { type, item, checked, isSelected, onMouseEnterEdit, onMouseLeaveEdit } = props
  const { t } = useI18nNamespaces(['projectManage', 'yakitUi'])

  const value = useCreation(() => {
    return getModelName(item?.ModelName)
  }, [item?.ModelName])
  const aiService = useCreation(() => {
    return item.Provider?.Type
  }, [item?.Provider?.Type])
  const icon = useCreation(() => {
    if (!aiService) return <></>
    return getIconByAI(aiService)
  }, [aiService])
  const reasoningEffort = useCreation(() => {
    return normalizeReasoningEffort(item?.Provider?.ReasoningEffort)
  }, [item])
  return (
    <div
      className={classNames(styles['select-option-wrapper'], {
        [styles['select-option-wrapper-select']]: !!isSelected,
      })}
      onMouseLeave={onMouseLeaveEdit}
    >
      <div className={styles['select-option-left']}>
        {icon}
        <div className={styles['option-text']} title={value}>
          {value}
        </div>
        {item?.IsOnline ? (
          <YakitTag size="small" color="warning" fullRadius>
            {t('ProjectManage.server')}
          </YakitTag>
        ) : null}
        {type === AIModelTypeEnum.TierIntelligent && reasoningEffort !== 'no-set' && reasoningEffort !== 'off' && (
          <BrainOutlined className={styles['brain-icon']} color="currentColor" />
        )}
      </div>
      <div className={styles['select-option-right']}>
        {checked && <CheckOutlined className={styles['check-icon']} color="currentColor" />}
        {type === AIModelTypeEnum.TierIntelligent && (
          <YakitButton
            type="text2"
            size="small"
            className={styles['edit-icon']}
            aria-label={t('YakitButton.edit')}
            icon={<PencilAltOutlined color="currentColor" />}
            onClick={(e) => {
              e.stopPropagation()
            }}
            onMouseEnter={onMouseEnterEdit}
          />
        )}
      </div>
    </div>
  )
})
