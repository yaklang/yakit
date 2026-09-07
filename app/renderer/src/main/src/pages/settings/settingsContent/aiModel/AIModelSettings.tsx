import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useCreation, useInViewport, useMemoizedFn } from 'ahooks'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { YakitSegmented } from '@/components/yakitUI/YakitSegmented/YakitSegmented'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import {
  DesktopComputerOutlined,
  GlobeAltOutlined,
  PlusOutlined,
  RefreshOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { ChevronDownSolid, ChevronRightSolid } from '@yakit-libs/yakit-ui-icons/solid'
import {
  AILocalModelList,
  AILocalModelListItemPromptHint,
  AIOnlineModel,
  getTipByType,
  onEditAIModel,
  onRemoveAIModel,
  onSelectAIModel,
  setAIModal,
} from '@/pages/ai-agent/aiModelList/AIModelList'
import type {
  AILocalModelListRefProps,
  AIModelActionProps,
  AIModelType,
} from '@/pages/ai-agent/aiModelList/AIModelListType'
import { grpcClearAllModels, type AIModelConfig, type AIModelTypeFileName } from '@/pages/ai-agent/aiModelList/utils'
import {
  AIModelPolicyEnum,
  AIModelPolicyOptions,
  AIModelTypeEnum,
  type AIModelTypeEnumType,
  AIModelTypeInterFileNameEnum,
} from '@/pages/ai-agent/defaultConstant'
import { AddAIModel } from '@/pages/ai-agent/aiModelList/addAIModel/AddAIModel'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import useAIGlobalConfig from '@/pages/ai-re-act/hooks/useAIGlobalConfig'
import emiter from '@/utils/eventBus/eventBus'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { YakitAlert } from '@/components/yakitUI/YakitAlert/YakitAlert'
import styles from './AIModelSettings.module.scss'

const ModelGroup: React.FC<{
  title: ReactNode
  desc: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}> = (props) => {
  const { title, desc, defaultOpen = true, children } = props
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={styles['model-group']}>
      <div className={styles['model-group-head']} onClick={() => setOpen((v) => !v)}>
        {open ? (
          <ChevronDownSolid className={styles['model-group-chevron']} color="currentColor" />
        ) : (
          <ChevronRightSolid className={styles['model-group-chevron']} color="currentColor" />
        )}
        <div className={styles['model-group-text']}>
          <div className={styles['model-group-title']}>{title}</div>
          <div className={styles['model-group-desc']}>{desc}</div>
        </div>
      </div>
      {open ? <div className={styles['model-group-body']}>{children}</div> : null}
    </div>
  )
}

export const AIModelSettings: React.FC = () => {
  const { t } = useI18nNamespaces(['setting', 'aiAgent', 'yakitUi'])
  const [modelType, setModelType] = useState<AIModelType>('online')
  const [localTotal, setLocalTotal] = useState(0)
  const [clearLocalVisible, setClearLocalVisible] = useState(false)
  const [sameModelAlert, setSameModelAlert] = useState(true)
  const localRef = useRef<AILocalModelListRefProps>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const [inViewport = true] = useInViewport(pageRef)
  const [aiGlobalConfigData, event] = useAIGlobalConfig()

  useEffect(() => {
    if (!inViewport) return
    const onRefreshAIModelList = () => onRefresh()
    emiter.on('onRefreshAIModelList', onRefreshAIModelList)
    return () => {
      emiter.off('onRefreshAIModelList', onRefreshAIModelList)
    }
  }, [inViewport])

  useEffect(() => {
    if (inViewport) onRefresh()
  }, [inViewport])

  const aiGlobalConfig = useCreation(() => aiGlobalConfigData.aiGlobalConfig, [aiGlobalConfigData.aiGlobalConfig])

  const onRefresh = useMemoizedFn((isShowLoading?: boolean) => {
    if (modelType === 'online') {
      event.onRefresh(isShowLoading)
      emiter.emit('onRefreshAvailableAIModelList')
      return
    }
    localRef.current?.onRefresh()
  })

  const onAddOnline = useMemoizedFn(() => {
    setAIModal({
      t,
      onSuccess: () => {
        event.onRefresh()
      },
    })
  })

  const onAddLocal = useMemoizedFn(() => {
    const m = showYakitModal({
      title: (modalT) => modalT('AIModelList.addLocalModel'),
      width: '50%',
      content: (
        <AddAIModel
          onCancel={() => {
            m.destroy()
            localRef.current?.onRefresh()
          }}
        />
      ),
      footer: null,
    })
  })

  const onAdd = useMemoizedFn(() => {
    if (modelType === 'online') onAddOnline()
    else onAddLocal()
  })

  const onClearLocal = useMemoizedFn((deleteSourceFile: boolean) => {
    return grpcClearAllModels({ DeleteSourceFile: deleteSourceFile }).then(() => {
      localRef.current?.onRefresh()
      setClearLocalVisible(false)
    })
  })

  const isSameSelectedModel = useCreation(() => {
    const intelligentSelect = aiGlobalConfig?.IntelligentModels?.[0]
    const lightweightSelect = aiGlobalConfig?.LightweightModels?.[0]
    if (!intelligentSelect || !lightweightSelect) return false
    return (
      intelligentSelect.ModelName === lightweightSelect.ModelName &&
      intelligentSelect.Provider?.Type === lightweightSelect.Provider?.Type
    )
  }, [aiGlobalConfig?.IntelligentModels, aiGlobalConfig?.LightweightModels])

  const onEdit = useMemoizedFn((options: AIModelActionProps) => {
    if (!aiGlobalConfig) return
    onEditAIModel({
      aiGlobalConfig,
      index: options.index,
      fileName: options.fileName,
      t,
      onSuccess: () => event.onRefresh(),
    })
  })

  const onRemove = useMemoizedFn((options: AIModelActionProps) => {
    if (!aiGlobalConfig) return
    onRemoveAIModel({
      aiGlobalConfig,
      index: options.index,
      fileName: options.fileName,
      onSuccess: () => event.onRefresh(),
    })
  })

  const onSelect = useMemoizedFn((item: AIModelConfig, options: AIModelActionProps) => {
    if (!aiGlobalConfig) return
    onSelectAIModel({
      aiGlobalConfig,
      item,
      index: options.index,
      fileName: options.fileName,
      onSuccess: () => event.onRefresh(),
    })
  })

  const isHaveData = !!(
    aiGlobalConfig?.IntelligentModels?.length ||
    aiGlobalConfig?.LightweightModels?.length ||
    aiGlobalConfig?.VisionModels?.length
  )

  const renderOnlineGroup = (fileName: AIModelTypeFileName, list: AIModelConfig[], type: AIModelTypeEnumType) => (
    <AIOnlineModel
      list={list}
      onEdit={(index) => onEdit({ fileName, index })}
      onRemove={(index) => onRemove({ fileName, index })}
      onSelect={(item, index) => onSelect(item, { fileName, index })}
      modelType={type}
      checkedVariant="circle"
    />
  )

  return (
    <div className={styles['ai-model']} ref={pageRef}>
      <div className={styles['page-head']}>
        <div className={styles['page-title']}>{t('SettingsPage.item.ai-model')}</div>
        <div className={styles['toolbar']}>
          <div className={styles['toolbar-left']}>
            <YakitSegmented
              size="small"
              value={modelType}
              options={[
                {
                  label: (
                    <span className={styles['tab-label']}>
                      <GlobeAltOutlined size={14} color="currentColor" />
                      {t('AIModelList.online')}
                    </span>
                  ),
                  value: 'online',
                },
                {
                  label: (
                    <span className={styles['tab-label']}>
                      <DesktopComputerOutlined size={14} color="currentColor" />
                      {t('AIModelList.local')}
                    </span>
                  ),
                  value: 'local',
                },
              ]}
              onChange={(v) => setModelType(v as AIModelType)}
            />
            <div className={styles['toolbar-desc']}>
              {modelType === 'online' ? t('AIModelList.onlineTooltip') : t('AIModelList.localTooltip')}
            </div>
          </div>
          <div className={styles['toolbar-actions']}>
            <YakitButton type="text" icon={<PlusOutlined color="currentColor" />} onClick={onAdd}>
              {t('YakitButton.add')}
            </YakitButton>
            {modelType === 'local' && localTotal > 0 && (
              <YakitButton type="text" colors="danger" onClick={() => setClearLocalVisible(true)}>
                {t('YakitButton.clear')}
              </YakitButton>
            )}
            <YakitButton type="text2" icon={<RefreshOutlined color="currentColor" />} onClick={() => onRefresh()} />
          </div>
        </div>
      </div>

      {modelType === 'online' ? (
        <YakitSpin spinning={aiGlobalConfigData.queryLoading}>
          <div className={styles['list-panel']}>
            <div className={styles['setting-row']}>
              <div className={styles['setting-row-text']}>
                <div className={styles['setting-row-title']}>{t('AiAgengt.callingMode')}</div>
              </div>
              <div className={styles['setting-row-control']}>
                <div className={styles['control-stack-end']}>
                  <YakitRadioButtons
                    buttonStyle="solid"
                    options={AIModelPolicyOptions.map((item) => ({ ...item, label: t(item.label) }))}
                    value={aiGlobalConfig?.RoutingPolicy}
                    onChange={(v) => event.setAIGlobalConfig({ RoutingPolicy: v.target.value })}
                  />
                  <div className={styles['setting-row-desc']}>
                    {getTipByType(aiGlobalConfig?.RoutingPolicy || AIModelPolicyEnum.PolicyAuto, t)}
                  </div>
                </div>
              </div>
            </div>
            <div className={styles['setting-row']}>
              <div className={styles['setting-row-text']}>
                <div className={styles['setting-row-title']}>{t('AIOnlineModeSetting.disableFallback')}</div>
              </div>
              <div className={styles['setting-row-control']}>
                <YakitSwitch
                  size="middle"
                  checked={!!aiGlobalConfig?.DisableFallback}
                  onChange={(c) => event.setAIGlobalConfig({ DisableFallback: c })}
                />
              </div>
            </div>
            {isHaveData ? (
              <div className={styles['groups']}>
                {sameModelAlert && isSameSelectedModel && (
                  <div className={styles['same-model-alert']}>
                    <YakitAlert
                      type="warning"
                      description={t('AIModelList.sameModelWarning')}
                      closable
                      onClose={() => setSameModelAlert(false)}
                    />
                  </div>
                )}
                {!!aiGlobalConfig?.IntelligentModels?.length && (
                  <ModelGroup title={t('AiAgengt.intelligentModels')} desc={t('AIModelList.intelligentModelsDesc')}>
                    {renderOnlineGroup(
                      AIModelTypeInterFileNameEnum.IntelligentModels,
                      aiGlobalConfig.IntelligentModels,
                      AIModelTypeEnum.TierIntelligent,
                    )}
                  </ModelGroup>
                )}
                {!!aiGlobalConfig?.LightweightModels?.length && (
                  <ModelGroup title={t('AiAgengt.lightweightModels')} desc={t('AIModelList.lightweightModelsDesc')}>
                    {renderOnlineGroup(
                      AIModelTypeInterFileNameEnum.LightweightModels,
                      aiGlobalConfig.LightweightModels,
                      AIModelTypeEnum.TierLightweight,
                    )}
                  </ModelGroup>
                )}
                {!!aiGlobalConfig?.VisionModels?.length && (
                  <ModelGroup title={t('AiAgengt.visionModels')} desc={t('AIModelList.visionModelsDesc')}>
                    {renderOnlineGroup(
                      AIModelTypeInterFileNameEnum.VisionModels,
                      aiGlobalConfig.VisionModels,
                      AIModelTypeEnum.TierVision,
                    )}
                  </ModelGroup>
                )}
              </div>
            ) : (
              <div className={styles['entry-empty']}>
                <YakitButton type="text" onClick={onAddOnline} icon={<PlusOutlined color="currentColor" />}>
                  {t('YakitButton.add')}
                </YakitButton>
              </div>
            )}
          </div>
        </YakitSpin>
      ) : (
        <div className={styles['list-panel']}>
          <div className={styles['local-slot']}>
            <AILocalModelList ref={localRef} setLocalTotal={setLocalTotal} />
          </div>
        </div>
      )}
      {clearLocalVisible && (
        <AILocalModelListItemPromptHint
          title={t('AIModelList.clearModelsTitle')}
          content={t('AIModelList.clearModelsDesc')}
          onOk={onClearLocal}
          onCancel={() => setClearLocalVisible(false)}
        />
      )}
    </div>
  )
}
