import React, { useEffect, useRef, useState } from 'react'
import {
  AIModelEditContentItemProps,
  AIModelEditContentProps,
  AIModelItemProps,
  AIModelSelectListProps,
  AIModelSelectProps,
  AISelectType,
} from './AIModelSelectType'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { useCreation, useDebounceFn, useInViewport, useMemoizedFn } from 'ahooks'
import { AIGlobalConfig, AIModelConfig, AIModelTypeFileName, isForcedSetAIModal } from '../utils'
import styles from './AIModelSelect.module.scss'
import classNames from 'classnames'
import { GetAIModelAvailableTotalResponse } from '../../type/aiModel'
import {
  AIAgentTabListEnum,
  AIModelPolicyEnum,
  AIModelPolicyOptions,
  AIModelTypeEnum,
  AIModelTypeInterFileNameEnum,
  AIOnlineModelIconMap,
  defaultAIGlobalConfig,
  SwitchAIAgentTabEventEnum,
} from '../../defaultConstant'
import { getTipByType, OutlineAtomIconByStatus, setAIModal } from '../AIModelList'
import { AIChatSelect } from '@/pages/ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect'
import useChatIPCStore from '../../useContext/ChatIPCContent/useStore'
import {
  OutlineBrainIcon,
  OutlineCheckIcon,
  OutlineCogIcon,
  OutlineInformationcircleIcon,
  OutlinePencilaltIcon,
  OutlineRefreshIcon,
} from '@/assets/icon/outline'
import { cloneDeep, has, isEqual, isNil, omit } from 'lodash'
import emiter from '@/utils/eventBus/eventBus'
import { YakitModalConfirm } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { Avatar, Tooltip } from 'antd'
import { yakitNotify } from '@/utils/notification'
import { YakitRoute } from '@/enums/yakitRoute'
import { usePageInfo } from '@/store/pageInfo'
import { shallow } from 'zustand/shallow'
import { TFunction, useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import useAIGlobalConfig from '@/pages/ai-re-act/hooks/useAIGlobalConfig'
import { createPortal } from 'react-dom'
import { getEnableThinkingOpt, parseEnableThinkingOptValue } from '../aiModelForm/AIModelForm'
import { ThirdPartyApplicationConfig } from '@/components/configNetwork/ConfigNetworkPage'

export const onOpenConfigModal = (mountContainer, t: TFunction) => {
  const m = YakitModalConfirm({
    title: (modalT) => modalT('AIModelSelect.configTitle'),
    width: 420,
    onOkText: (modalT) => modalT('AIModelSelect.toConfigure'),
    content: (modalT) => <div>{modalT('AIModelSelect.configDesc')}</div>,
    closable: false,
    maskClosable: false,
    keyboard: false,
    cancelButtonProps: { style: { display: 'none' } },
    getContainer: mountContainer,
    onOk: () => {
      setAIModal({
        mountContainer,
        t,
        onSuccess: () => {
          setTimeout(() => {
            emiter.emit('onRefreshAIModelList')
          }, 200)
        },
      })
      m.destroy()
    },
  })
}

const modelType = (t: TFunction) => [
  t('AiAgengt.intelligentModels'),
  t('AiAgengt.lightweightModels'),
  t('AiAgengt.visionModels'),
]
export const AIModelSelect: React.FC<AIModelSelectProps> = React.memo((props) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const { isOpen = true, mountContainer } = props

  const currentRouteKey = usePageInfo((state) => state.getCurrentPageTabRouteKey(), shallow)
  //#region AI model
  const { chatIPCData } = useChatIPCStore()

  const [aiType, setAIType] = useState<AISelectType>('online') //暂时只有online，后续会加"local"

  const [aiModelOptions, setAIModelOptions] = useState<GetAIModelAvailableTotalResponse>({
    onlineModelsTotal: 0,
    localModelsTotal: 0,
    onlineModels: cloneDeep(defaultAIGlobalConfig),
    localModels: [],
  })
  const [onlineLoading, setOnlineLoading] = useState<boolean>(false)
  const [open, setOpen] = useState<boolean>(false)

  const refRef = useRef<HTMLDivElement>(null)
  const dropdownRenderRef = useRef<HTMLDivElement>(null)
  const dropdownRenderRectRef = useRef<DOMRect>()

  const aiGlobalConfigRef = useRef<AIGlobalConfig>()
  const [inViewport = true] = useInViewport(refRef)

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        const rect = dropdownRenderRef.current?.getBoundingClientRect()
        dropdownRenderRectRef.current = rect
      }, 200)
    }
  }, [open])

  useEffect(() => {
    if (!inViewport) return
    getAIModelListOption()

    emiter.on('onRefreshAvailableAIModelList', onRefreshAvailableAIModelList)
    return () => {
      emiter.off('onRefreshAvailableAIModelList', onRefreshAvailableAIModelList)
    }
  }, [inViewport])

  const onRefreshAvailableAIModelList = useMemoizedFn(() => {
    setOnlineLoading(true)
    getAIModelListOption()
  })

  const getAIModelListOption = useDebounceFn(
    () => {
      isForcedSetAIModal({
        t,
        haveDataCall: (res) => {
          setAIModelOptions(res)
          aiGlobalConfigRef.current = cloneDeep(res.onlineModels)
        },
        pageKey: 'ai-agent',
        isOpen: isOpen,
        mountContainer: document.getElementById('main-operator-page-body-ai-agent'),
      }).finally(() => {
        setTimeout(() => {
          setOnlineLoading(false)
        }, 200)
      })
    },
    { wait: 200, leading: true },
  ).run

  const onSetOpen = useMemoizedFn((v: boolean) => {
    setOpen(v)

    switch (aiType) {
      case 'online':
        if (!v) {
          if (isEqual(aiGlobalConfigRef.current, aiModelOptions.onlineModels)) break
          onSetAI()
        }
        break

      default:
        break
    }
  })
  const [_, event] = useAIGlobalConfig()
  /**
   * 更新AI配置
   * */
  const onSetAI = useMemoizedFn(() => {
    if (intelligentModels.length === 0) return
    event.setAIGlobalConfig(aiModelOptions.onlineModels).then(() => {
      setAIModelOptions((v) => ({ ...v, onlineModels: cloneDeep(aiModelOptions.onlineModels) }))
      aiGlobalConfigRef.current = cloneDeep(aiModelOptions.onlineModels)
      if (aiType === 'local') emiter.emit('onRefreshAIModelList')
    })
  })

  const isHaveData = useCreation(() => {
    return aiModelOptions.onlineModelsTotal > 0 || aiModelOptions.localModels.length > 0
  }, [aiModelOptions.onlineModelsTotal, aiModelOptions.localModels.length])

  //#endregion

  const renderContent = useMemoizedFn(() => {
    switch (aiType) {
      case 'online':
        return (
          <>
            <YakitSelect.Option
              value="select"
              label={
                <div className={styles['select-option']}>
                  {selectList.length > 1 ? (
                    <Avatar.Group>
                      {selectList.map((item, index) => (
                        <Tooltip key={index} title={`${modelType(t)[index]}:${item.ModelName}`}>
                          <Avatar
                            className={styles['model-item']}
                            icon={getIconByAI(item.Provider.Type)}
                            size="small"
                          />
                        </Tooltip>
                      ))}
                    </Avatar.Group>
                  ) : (
                    <>
                      {getIconByAI(selectList[0]?.Provider.Type)}
                      <span className={styles['select-option-text']} title={`${selectList[0]?.ModelName}`}>
                        {selectList[0]?.ModelName}
                      </span>
                    </>
                  )}
                </div>
              }
            >
              {selectList.length}
            </YakitSelect.Option>
          </>
        )
      // TODO -
      // case "local":
      //     return (
      //         <>
      //             {aiModelOptions.localModels.map((nodeItem) => (
      //                 <YakitSelect.Option key={nodeItem.Name} value={nodeItem.Name}>
      //                     <AIModelItem value={nodeItem.Name} />
      //                 </YakitSelect.Option>
      //             ))}
      //         </>
      //     )
      default:
        return <></>
    }
  })
  const intelligentModels = useCreation(() => {
    return aiModelOptions?.onlineModels?.IntelligentModels || []
  }, [aiModelOptions?.onlineModels?.IntelligentModels])
  const lightweightModels = useCreation(() => {
    return aiModelOptions?.onlineModels?.LightweightModels || []
  }, [aiModelOptions?.onlineModels?.LightweightModels])
  const visionModels = useCreation(() => {
    return aiModelOptions?.onlineModels?.VisionModels || []
  }, [aiModelOptions?.onlineModels?.VisionModels])
  const policy: AIModelPolicyEnum = useCreation(() => {
    return aiModelOptions?.onlineModels?.RoutingPolicy as AIModelPolicyEnum
  }, [aiModelOptions?.onlineModels?.RoutingPolicy])

  const selectList = useCreation(() => {
    const intelligentItem = intelligentModels[0]
    const lightweightItem = lightweightModels[0]
    const visionItem = visionModels[0]
    const list: AIModelConfig[] = []
    // 顺序按照高质、轻量、视觉的优先级展示
    intelligentItem && list.push(intelligentItem)
    lightweightItem && list.push(lightweightItem)
    visionItem && list.push(visionItem)
    return list
  }, [intelligentModels, lightweightModels, visionModels])
  const execute = useCreation(() => {
    return chatIPCData.execute
  }, [chatIPCData.execute])
  const onSelectPolicy = useMemoizedFn((value) => {
    setAIModelOptions((old) => {
      return {
        ...old,
        onlineModels: {
          ...old.onlineModels,
          RoutingPolicy: value,
        },
      }
    })
  })
  const onAddModel = useMemoizedFn(() => {
    setAIModal({
      mountContainer,
      t,
      onSuccess: () => {
        emiter.emit('onRefreshAIModelList')
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
      setAIModelOptions((old) => {
        const newList = [...old.onlineModels[fileName]]
        newList.splice(index, 1)
        newList.unshift(item)
        return {
          ...old,
          onlineModels: {
            ...old.onlineModels,
            [fileName]: newList,
          },
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
      setAIModelOptions((old) => {
        const newList = [...old.onlineModels[fileName]]
        newList.splice(index, 1, item)
        return {
          ...old,
          onlineModels: {
            ...old.onlineModels,
            [fileName]: newList,
          },
        }
      })
    },
  )
  const openModelTab = useMemoizedFn(() => {
    if (currentRouteKey !== YakitRoute.AI_Agent) {
      emiter.emit(
        'openPage',
        JSON.stringify({
          route: YakitRoute.AI_Agent,
        }),
      )
      setTimeout(() => {
        onSwitchAIAgentTab()
      }, 100)
    } else {
      onSwitchAIAgentTab()
    }

    yakitNotify('success', t('AIModelSelect.openModelTabSuccess'))
  })
  const onSwitchAIAgentTab = useMemoizedFn(() => {
    emiter.emit(
      'switchAIAgentTab',
      JSON.stringify({
        type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE,
        params: {
          active: AIAgentTabListEnum.AI_Model,
          show: true,
        },
      }),
    )
  })
  return (
    <div ref={refRef}>
      {isHaveData ? (
        <AIChatSelect
          dropdownRender={(menu) => {
            return (
              <div className={styles['drop-select-wrapper']} ref={dropdownRenderRef}>
                <div className={styles['select-title']}>
                  <div className={styles['select-title-left']}>
                    <span>{t('AIModelSelect.selectModel')}</span>
                    {!execute && (
                      <YakitSelect
                        size="small"
                        disabled={execute}
                        options={AIModelPolicyOptions.map((item) => ({ ...item, label: t(item.label) }))}
                        value={policy}
                        onSelect={onSelectPolicy}
                        wrapperClassName={styles['select-policy-wrapper']}
                        dropdownClassName={styles['select-policy-dropdown']}
                        wrapperStyle={{ width: 80, marginRight: 4 }}
                        dropdownMatchSelectWidth={false}
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                      />
                    )}
                    <Tooltip title={getTipByType(policy, t)}>
                      <OutlineInformationcircleIcon className={styles['icon-info']} />
                    </Tooltip>
                  </div>
                  <div className={styles['select-title-right']}>
                    <Tooltip title={t('AIModelSelect.openConfigTooltip')}>
                      <YakitButton size="small" type="text2" icon={<OutlineCogIcon />} onClick={openModelTab} />
                    </Tooltip>
                    {aiType === 'online' && (
                      <Tooltip title={t('YakitButton.refresh')}>
                        <YakitButton
                          size="small"
                          type="text2"
                          icon={<OutlineRefreshIcon />}
                          loading={onlineLoading}
                          onClick={() => onRefreshAvailableAIModelList()}
                        />
                      </Tooltip>
                    )}
                  </div>
                </div>
                <div className={styles['select-content']}>
                  {!!intelligentModels.length && (
                    <AIModelSelectList
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
                      dropdownRenderRectRef={dropdownRenderRectRef.current}
                    />
                  )}
                  {!execute && !!lightweightModels.length && (
                    <AIModelSelectList
                      type={AIModelTypeEnum.TierLightweight}
                      title={t('AiAgengt.lightweightModels')}
                      subTitle={t('AIModelList.lightweightModelsDesc')}
                      list={lightweightModels}
                      onSelect={(item, index) =>
                        onSelect(item, {
                          fileName: AIModelTypeInterFileNameEnum.LightweightModels,
                          index,
                        })
                      }
                      onEdit={() => {}}
                    />
                  )}
                  {!execute && !!visionModels.length && (
                    <AIModelSelectList
                      type={AIModelTypeEnum.TierVision}
                      title={t('AiAgengt.visionModels')}
                      subTitle={t('AIModelList.visionModelsDesc')}
                      list={visionModels}
                      onSelect={(item, index) =>
                        onSelect(item, {
                          fileName: AIModelTypeInterFileNameEnum.VisionModels,
                          index,
                        })
                      }
                      onEdit={() => {}}
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
  const { title, subTitle, list, onSelect, type, onEdit, dropdownRenderRectRef } = props
  const [currentSelectIndex, setCurrentSelectIndex] = useState<number>()
  const [currentItem, setCurrentItem] = useState<AIModelConfig>()

  const [editStyle, setEditStyle] = useState<React.CSSProperties>()

  const hideTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      clearHideTimer()
    }
  }, [])

  const onSelectItem = useMemoizedFn((e, item: AIModelConfig, index: number) => {
    onSelect(item, index)
    setCurrentSelectIndex(undefined)
  })

  const onMouseEnterEditContent = useMemoizedFn((e) => {
    e.stopPropagation()
    clearHideTimer()
  })
  const onMouseLeaveEditContent = useMemoizedFn((e) => {
    e.stopPropagation()
    hideEditContent()
  })
  // 清除延迟隐藏定时器
  const clearHideTimer = useMemoizedFn(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  })

  const onMouseEnterEdit = useMemoizedFn((e: React.MouseEvent, item: AIModelConfig, index: number) => {
    clearHideTimer()
    if (!dropdownRenderRectRef) return
    if (isEqual(currentSelectIndex, index)) return
    const { left = 0, right = 0, width } = dropdownRenderRectRef || {}

    const rightContextWidth = 120
    const rightContextHeight = 110
    // 判断右侧屏幕剩余空间是否满足：如果不满足，则在 dropdownRenderRectRef 的左方展示
    const spaceOnRight = window.innerWidth - right
    let toLeft = spaceOnRight < rightContextWidth ? left - rightContextWidth - 6 : right + 6

    // 判断下方屏幕剩余高度是否足够居中显示的一半高度
    const spaceOnBottom = window.innerHeight - e.clientY
    const halfHeight = rightContextHeight / 2
    let toTop = 0

    if (spaceOnBottom >= halfHeight) {
      // 下方空间足够，垂直方向根据鼠标居中
      toTop = e.clientY - halfHeight
    } else {
      // 下方空间不足，元素完整显示在鼠标位置的上方
      toTop = e.clientY - rightContextHeight + 24
    }

    // 屏幕左/上边界安全防御
    if (toLeft < 0) toLeft = width
    if (toTop < 0) toTop = 0
    setCurrentItem(item)
    setCurrentSelectIndex(index)
    setEditStyle({
      transform: `translate(${toLeft}px, ${toTop}px)`,
      width: rightContextWidth,
      height: rightContextHeight,
    })
  })
  const onMouseLeaveList = useMemoizedFn(() => {
    hideEditContent()
  })
  // 统一的隐藏逻辑：开启定时器，如果 150ms 内没有被再次打断，则关闭弹窗
  const hideEditContent = useMemoizedFn(() => {
    clearHideTimer()
    hideTimerRef.current = setTimeout(() => {
      setCurrentItem(undefined)
      setCurrentSelectIndex(undefined)
      setEditStyle(undefined)
    }, 150)
  })
  const isShowEditContent = useCreation(() => {
    return !isNil(currentSelectIndex) && !!currentItem
  }, [currentSelectIndex, currentItem])
  const onEditContentChange = useMemoizedFn((v: AIModelConfig) => {
    if (isNil(currentSelectIndex)) return
    setCurrentItem(() => ({
      ...v,
      Provider: {
        ...v.Provider,
      },
    }))
    onEdit(v, currentSelectIndex)
  })
  return (
    <div className={styles['ai-model-select-list-wrapper']}>
      <div className={styles['ai-model-select-list-wrapper-header']}>
        <div className={styles['ai-model-select-list-wrapper-header-title']}>
          {title}
          <Tooltip title={subTitle}>
            <OutlineInformationcircleIcon className={styles['icon-info']} />
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
          style={editStyle}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onMouseEnter={onMouseEnterEditContent}
          onMouseLeave={onMouseLeaveEditContent}
        >
          {isShowEditContent && <AIModelEditContent item={currentItem} onEdit={onEditContentChange} />}
        </div>,
        document.body,
      )}
    </div>
  )
})

const AIModelEditContent: React.FC<AIModelEditContentProps> = React.memo((props) => {
  const { item, onEdit } = props

  const onEditChange = useMemoizedFn((v: string, filed: keyof ThirdPartyApplicationConfig) => {
    if (!item) return
    let newItemProvider = cloneDeep(item.Provider)
    switch (filed) {
      case 'EnableThinkingOpt':
        const enableThinkingOpt = parseEnableThinkingOptValue(v)
        if (enableThinkingOpt !== undefined) {
          newItemProvider.EnableThinkingOpt = enableThinkingOpt
        } else {
          newItemProvider = omit(newItemProvider, ['EnableThinkingOpt'])
        }
        break
      default:
        break
    }

    onEdit?.({
      ...item,
      Provider: {
        ...newItemProvider,
      },
    })
  })
  const enableThinkingOpt = useCreation(() => {
    if (!item?.Provider) return 'no-set'
    return getEnableThinkingOpt(item?.Provider)
  }, [item?.Provider])
  return (
    <div className={styles['edit-content-wrapper']}>
      <AIModelEditContentItem
        filed="EnableThinkingOpt"
        options={EnableThinkingOptions}
        title="Enable Thiking"
        value={enableThinkingOpt}
        onChange={(v) => onEditChange(v, 'EnableThinkingOpt')}
      />
    </div>
  )
})

const AIModelEditContentItem: React.FC<AIModelEditContentItemProps> = React.memo((props) => {
  const { title, options, onChange, value } = props
  const onSelect = useMemoizedFn((v: string) => {
    onChange(v)
  })
  return (
    <div className={styles['edit-content-item']}>
      <div className={styles['edit-content-title']}>{title}</div>
      <div className={styles['edit-content-options']}>
        {options.map((option) => (
          <div
            key={option.value}
            className={styles['edit-content-options-item']}
            onClick={() => onSelect(option.value)}
          >
            <span>{option.label}</span>
            {value === option.value && <OutlineCheckIcon className={styles['edit-content-check']} />}
          </div>
        ))}
      </div>
    </div>
  )
})

export const getIconByAI = (value) => {
  return AIOnlineModelIconMap[value] || <OutlineAtomIconByStatus size="small" />
}
export const EnableThinkingOptions = [
  { label: '不设置', value: 'no-set' },
  { label: '开启', value: 'open' },
  { label: '不开启', value: 'close' },
]

const AIModelItem: React.FC<AIModelItemProps> = React.memo((props) => {
  const { type, item, checked, isSelected, onMouseEnterEdit, onMouseLeaveEdit } = props

  const value = useCreation(() => {
    return item?.ModelName
  }, [item?.ModelName])
  const aiService = useCreation(() => {
    return item.Provider?.Type
  }, [item?.Provider?.Type])
  const icon = useCreation(() => {
    if (!aiService) return <></>
    return getIconByAI(aiService)
  }, [aiService])
  const enableThinkingOpt = useCreation(() => {
    return has(item, ['Provider', 'EnableThinkingOpt'])
      ? item?.Provider?.EnableThinkingOpt
        ? 'open'
        : 'close'
      : 'no-set'
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
        {type === AIModelTypeEnum.TierIntelligent && enableThinkingOpt === 'open' && (
          <OutlineBrainIcon className={styles['brain-icon']} />
        )}
      </div>
      <div className={styles['select-option-right']}>
        {checked && <OutlineCheckIcon className={styles['check-icon']} />}
        {type === AIModelTypeEnum.TierIntelligent && (
          <YakitButton
            type="text2"
            size="small"
            className={styles['edit-icon']}
            icon={<OutlinePencilaltIcon />}
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
