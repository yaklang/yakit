import React, { useEffect, useRef, useState } from 'react'
import type { AIModelEditContentItemProps, AIModelSelectProps, ModelNameOptionLabelProps } from './AIModelSelectType'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { useCreation, useDebounceFn, useInViewport, useMemoizedFn, useRequest } from 'ahooks'
import {
  type AIGlobalConfig,
  type AIModelConfig,
  getModelName,
  grpcListAiModel,
  isForcedSetAIModal,
  isFreeEnd,
  isMemfitStart,
  sortMemfitNameFirst,
} from '../utils'
import styles from './AIModelSelect.module.scss'
import classNames from 'classnames'
import { AIOnlineModelIconMap, defaultAIGlobalConfig } from '../../defaultConstant'
import { AIModelFreeTag, OutlineAtomIconByStatus, setAIModal } from '../AIModelList'
import { AIChatSelect } from '@/pages/ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect'
import { CheckOutlined, CogOutlined, RefreshOutlined, RotateCcwOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import cloneDeep from 'lodash/cloneDeep'
import isEqual from 'lodash/isEqual'
import emiter from '@/utils/eventBus/eventBus'
import { YakitModalConfirm } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { Tooltip } from 'antd'
import { YakitRoute } from '@/enums/yakitRoute'
import { type TFunction, useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import useAIGlobalConfig from '@/pages/ai-re-act/hooks/useAIGlobalConfig'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { yakitNotify } from '@/utils/notification'

const getModelListConfig = (model?: AIModelConfig) => {
  if (!model?.Provider) return undefined
  const { Type, APIKey, Domain, NoHttps, Proxy, APIType, BaseURL, Endpoint, EnableEndpoint, Headers, ExtraParams } =
    model.Provider
  return JSON.stringify({
    Type,
    api_key: APIKey,
    domain: Domain,
    no_https: NoHttps,
    proxy: Proxy,
    api_type: APIType ?? '',
    base_url: BaseURL ?? '',
    endpoint: Endpoint ?? '',
    enable_endpoint: !!EnableEndpoint,
    Headers: Headers ?? [],
    ExtraParams: ExtraParams ?? [],
  })
}

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

export const AIModelSelect: React.FC<AIModelSelectProps> = React.memo((props) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const { isOpen = true, className } = props
  const [aiDraftConfig, setAIDraftConfig] = useState<AIGlobalConfig>(() => cloneDeep(defaultAIGlobalConfig))
  const [open, setOpen] = useState(false)
  const [modelNames, setModelNames] = useState<string[]>([])
  const refRef = useRef<HTMLDivElement>(null)
  const savedConfigRef = useRef<AIGlobalConfig>()
  const [inViewport = true] = useInViewport(refRef)
  const [{ aiGlobalConfig }, event] = useAIGlobalConfig()

  // 配置与保存基线统一从全局配置同步，可用性检查不回写选择草稿。
  useEffect(() => {
    if (isEqual(savedConfigRef.current, aiGlobalConfig)) return
    const config = cloneDeep(aiGlobalConfig)
    savedConfigRef.current = config
    setAIDraftConfig(config)
  }, [aiGlobalConfig])
  // 与选择器显示值保持同源：当前选中的高质模型是配置中的首项。
  const selectIntelligentItem = aiDraftConfig.IntelligentModels[0]
  const modelListConfig = useCreation(
    () => getModelListConfig(selectIntelligentItem),
    [selectIntelligentItem?.Provider],
  )

  const { run: getAIModelListOption, cancel: cancelGetAIModelListOption } = useDebounceFn(
    () => {
      isForcedSetAIModal({
        t,
        pageKey: 'ai-agent',
        isOpen,
        mountContainer: document.getElementById('main-operator-page-body-ai-agent'),
      }).catch(() => undefined)
    },
    { wait: 200, leading: true },
  )

  useEffect(() => {
    if (!inViewport) return
    getAIModelListOption()
    return cancelGetAIModelListOption
  }, [inViewport])

  const {
    run: getModelNameList,
    cancel: cancelModelNameList,
    loading: modelNamesLoading,
  } = useRequest((config: string) => grpcListAiModel({ Config: config }), {
    manual: true,
    onBefore: () => setModelNames([]),
    onSuccess: ({ ModelName }) => setModelNames(sortMemfitNameFirst(ModelName || [])),
    onError: () => {},
  })

  useEffect(() => {
    if (open && modelListConfig) {
      getModelNameList(modelListConfig)
    } else {
      setModelNames([])
    }
    return cancelModelNameList
  }, [open, modelListConfig, getModelNameList, cancelModelNameList])

  const { run: onRefreshModelNameList } = useDebounceFn(
    () => {
      if (!open || !modelListConfig || modelNamesLoading || resetLoading) return
      return getModelNameList(modelListConfig)
    },
    { wait: 500, leading: true, trailing: false },
  )

  const onSetOpen = useMemoizedFn((value: boolean) => {
    setOpen(value)
    if (value) return
    cancelResetModel()
    cancelModelNameList()
    if (!selectIntelligentItem || isEqual(savedConfigRef.current, aiDraftConfig)) return
    const config = cloneDeep(aiDraftConfig)
    event.setAIGlobalConfig(config).catch(() => undefined)
  })

  useEffect(() => {
    if (!open || !refRef.current) return
    let previousWidth: number | undefined
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const width = entry.contentRect.width
      if (previousWidth !== undefined && width !== previousWidth) onSetOpen(false)
      previousWidth = width
    })
    observer.observe(refRef.current)
    return () => observer.disconnect()
  }, [open])

  const onSelectModelName = useMemoizedFn((ModelName: string) => {
    setAIDraftConfig((old) => {
      const [currentModel, ...rest] = old.IntelligentModels
      if (!currentModel || currentModel.ModelName === ModelName) return old
      return {
        ...old,
        IntelligentModels: [{ ...currentModel, ModelName }, ...rest],
      }
    })
  })

  const {
    run: resetModel,
    cancel: cancelResetModel,
    loading: resetLoading,
  } = useRequest(() => event.getLastAIGlobalConfig(), {
    manual: true,
    onSuccess: (config) => {
      // 点击时获取最新配置，再查找内置高质模型；不使用首次加载的缓存。
      const builtinIndex = config.IntelligentModels.findIndex((model) =>
        model.ExtraParams?.some(({ Key, Value }) => Key === 'isBuildin' && Value === 'true'),
      )
      if (builtinIndex === -1) {
        yakitNotify('warning', t('AIModelSelect.noBuiltinModel'))
        return
      }
      const models = [...config.IntelligentModels]
      const [builtinModel] = models.splice(builtinIndex, 1)
      models.unshift(builtinModel)
      // 重置只更新草稿，关闭时仍与全局保存基线比较并统一持久化。
      setAIDraftConfig({ ...config, IntelligentModels: models })
      // 连接变化时由 effect 加载；同一连接则直接刷新，避免重复请求。
      const builtinModelListConfig = getModelListConfig(builtinModel)
      if (builtinModelListConfig && builtinModelListConfig === modelListConfig) {
        getModelNameList(builtinModelListConfig)
      }
    },
    onError: () => {},
  })

  const { run: onResetModel } = useDebounceFn(
    () => {
      if (!open || resetLoading || modelNamesLoading) return
      resetModel()
    },
    { wait: 500, leading: true, trailing: false },
  )

  const openModelTab = useMemoizedFn(() => {
    emiter.emit('openPage', JSON.stringify({ route: YakitRoute.Settings, params: { anchor: 'ai-model' } }))
  })
  const modelNameOptions = useCreation(
    () =>
      modelNames.map((name) => ({
        label: <ModelNameOptionLabel name={name} />,
        value: name,
      })),
    [modelNames],
  )
  const isHaveData =
    aiDraftConfig.IntelligentModels.length > 0 ||
    aiDraftConfig.LightweightModels.length > 0 ||
    aiDraftConfig.VisionModels.length > 0

  return (
    <div ref={refRef} className={className}>
      {isHaveData && (
        <AIChatSelect
          dropdownRender={() => (
            <div className={styles['drop-select-wrapper']} onClick={(e) => e.stopPropagation()}>
              <div className={styles['select-title']}>
                <div className={styles['select-title-left']}>
                  <span>{t('AIModelSelect.selectModel')}</span>
                  <Tooltip title={t('AIModelSelect.resetModelTooltip')}>
                    <YakitButton
                      icon={<RotateCcwOutlined color="currentColor" />}
                      size="small"
                      type="text2"
                      loading={resetLoading}
                      disabled={resetLoading || modelNamesLoading}
                      onClick={onResetModel}
                    >
                      {t('AIModelSelect.resetModel')}
                    </YakitButton>
                  </Tooltip>
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
                      aria-label={t('YakitButton.refresh')}
                      icon={<RefreshOutlined color="currentColor" />}
                      loading={modelNamesLoading}
                      disabled={!selectIntelligentItem || resetLoading || modelNamesLoading}
                      onClick={onRefreshModelNameList}
                    />
                  </Tooltip>
                </div>
              </div>
              <div className={styles['model-name-content']}>
                <YakitSpin size="small" spinning={modelNamesLoading || resetLoading}>
                  <AIModelEditContentItem
                    options={modelNameOptions}
                    value={selectIntelligentItem?.ModelName || ''}
                    onChange={onSelectModelName}
                    listClassName={styles['model-name-list']}
                    emptyTips={
                      !modelNamesLoading && (
                        <>
                          {t('AIModelSelect.emptyModels')}
                          <YakitButton
                            size="small"
                            type="text"
                            disabled={!selectIntelligentItem || resetLoading || modelNamesLoading}
                            onClick={onRefreshModelNameList}
                          >
                            {t('YakitButton.refresh')}
                          </YakitButton>
                        </>
                      )
                    }
                  />
                </YakitSpin>
              </div>
            </div>
          )}
          open={open}
          setOpen={onSetOpen}
          optionLabelProp="label"
          value="select"
        >
          <YakitSelect.Option
            value="select"
            label={
              <div className={styles['select-option']}>
                {getIconByAI(selectIntelligentItem?.Provider.Type)}
                <span className={styles['select-option-text']} title={getModelName(selectIntelligentItem?.ModelName)}>
                  {getModelName(selectIntelligentItem?.ModelName)}
                </span>
              </div>
            }
          >
            {selectIntelligentItem?.ModelName}
          </YakitSelect.Option>
        </AIChatSelect>
      )}
    </div>
  )
})

export const ModelNameOptionLabel: React.FC<ModelNameOptionLabelProps> = React.memo((props) => {
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
  const { options, onChange, value, listClassName = '', emptyTips } = props
  const onSelect = useMemoizedFn((v: string) => {
    onChange(v)
  })
  return (
    <div className={styles['edit-content-item']}>
      <div className={classNames(styles['edit-content-options'], listClassName)} role="listbox">
        {options.map((option) => (
          <div
            key={option.value}
            className={styles['edit-content-options-item']}
            role="option"
            aria-selected={value === option.value}
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

export const getIconByAI = (value) => {
  return AIOnlineModelIconMap[value] || <OutlineAtomIconByStatus size="small" />
}
