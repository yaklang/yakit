import React, { useEffect, useMemo, useState } from 'react'
import type { AIReasoningEffortSelectProps } from './type'
import { OutlineBrainIcon, OutlineQuestionmarkcircleIcon } from '@/assets/icon/outline'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import YakitSolidLoading from '@/components/yakitUI/YakitSolidLoading/YakitSolidLoading'
import { useDebounceFn, useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { Tooltip } from 'antd'
import { AIChatSelect } from '../aiReviewRuleSelect/AIReviewRuleSelect'
import useAIGlobalConfig from '@/pages/ai-re-act/hooks/useAIGlobalConfig'
import {
  buildReasoningEffortOptions,
  effortProbeResultFromResponse,
  normalizeReasoningEffort,
} from '@/pages/ai-agent/aiModelList/aiModelForm/reasoningEffort'
import { type AIModelConfig, grpcProbeReasoningEffort } from '@/pages/ai-agent/aiModelList/utils'
import emiter from '@/utils/eventBus/eventBus'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './AIReasoningEffortSelect.module.scss'

export const AIReasoningEffortSelect: React.FC<AIReasoningEffortSelectProps> = React.memo((props) => {
  const { className } = props
  // configNetwork 命名空间：选项文案（ConfigNetworkPage.effortNoSet/effortOff 等）与表单共用
  const { t, i18nRefresh } = useI18nNamespaces(['aiAgent', 'configNetwork'])

  const [{ aiGlobalConfig }, event] = useAIGlobalConfig()
  // 与 AIModelSelect 一致：IntelligentModels[0] 即当前选中模型，Provider 为完整连接配置
  const currentModel = aiGlobalConfig?.IntelligentModels?.[0]
  const effortValue = normalizeReasoningEffort(currentModel?.Provider?.ReasoningEffort)

  const [open, setOpen] = useState<boolean>(false)
  const [effortProbing, setEffortProbing] = useState<boolean>(false)

  const reasoningEffortOptions = useMemo(() => {
    return buildReasoningEffortOptions(t, currentModel?.ProbedExtendedEfforts, effortValue)
  }, [currentModel?.ProbedExtendedEfforts, effortValue, i18nRefresh])

  /** 更新当前模型条目并持久化到全局 AI 配置；聊天发送侧由引擎读取持久化配置，故选中即落库 */
  const updateCurrentModel = useMemoizedFn((mutate: (m: AIModelConfig) => AIModelConfig) => {
    const models = aiGlobalConfig?.IntelligentModels || []
    if (!models.length) return
    const nextModels = [mutate({ ...models[0] }), ...models.slice(1)]
    event
      .setAIGlobalConfig({ ...aiGlobalConfig, IntelligentModels: nextModels })
      .then(() => {
        // AIModelSelect 持有本地副本，通知其刷新，避免后续重排模型时用旧副本覆盖本次修改
        emiter.emit('onRefreshAvailableAIModelList')
      })
      .catch(() => {})
  })

  /** 懒探测：当前模型未探测过时探测是否支持 xhigh/max；失败不置已探测，下次触发可重试 */
  const ensureEffortProbed = useDebounceFn(
    () => {
      if (props.disabled || currentModel?.IsOnline) return
      if (currentModel?.EffortProbed) return
      if (effortProbing) return
      if (!currentModel?.Provider || !currentModel?.ModelName) return
      setEffortProbing(true)
      const providerId = currentModel.ProviderId
      const modelName = currentModel.ModelName
      grpcProbeReasoningEffort({
        Config: currentModel.Provider,
        Model: currentModel.ModelName,
      })
        .then((resp) => {
          const { conclusive, efforts } = effortProbeResultFromResponse(resp)
          // 瞬时错误（限流/网络失败等）不落库已探测，下次触发可重试
          if (!conclusive) return
          updateCurrentModel((m) => {
            if (m.ProviderId !== providerId || m.ModelName !== modelName) return m
            return { ...m, EffortProbed: true, ProbedExtendedEfforts: efforts }
          })
        })
        .catch(() => {})
        .finally(() => {
          setEffortProbing(false)
        })
    },
    { wait: 300, leading: true },
  ).run

  // 挂载或切换到未探测的模型时主动探测，下拉打开时经 getList 再触发一次兜底重试
  useEffect(() => {
    ensureEffortProbed()
  }, [currentModel?.ModelName, currentModel?.ProviderId, currentModel?.EffortProbed])

  const onSetOpen = useMemoizedFn((v: boolean) => {
    setOpen(v)
  })

  const onEffortSelect = useMemoizedFn((value: string) => {
    setOpen(false)
    const next = normalizeReasoningEffort(value)
    // no-set 不落库（undefined），与模型表单 formValueToAIConfigProvider 保存语义一致
    updateCurrentModel((m) => ({
      ...m,
      Provider: { ...m.Provider, ReasoningEffort: next === 'no-set' ? undefined : next },
    }))
  })

  const pillText = useMemoizedFn((value: string) => {
    return value === 'no-set' ? t('AiAgengt.reasoningEffort') : value
  })

  // 未设置档位时不默认选中第一个选项（no-set），以占位形式展示"思考"
  const effortUnset = effortValue === 'no-set'

  /** 收起态 pill 内容：探测中且下拉未打开时，脑图标位置替换为 loading */
  const renderPill = useMemoizedFn((text: string) => (
    <div className={styles['select-option']}>
      {!open && effortProbing ? (
        <div className={styles['icon-wrapper']}>
          <YakitSolidLoading inline size={12} />
        </div>
      ) : (
        <OutlineBrainIcon className={styles['icon-wrapper']} />
      )}
      <span className={styles['select-option-text']}>{text}</span>
    </div>
  ))

  return (
    <div className={classNames(styles['reasoning-effort-select'], className)}>
      <AIChatSelect
        getList={ensureEffortProbed}
        dropdownRender={(menu) => {
          return (
            <div className={styles['drop-select-wrapper']}>
              <div className={styles['select-title']}>
                <OutlineBrainIcon />
                {t('AiAgengt.reasoningEffort')}
                <Tooltip title={t('AIReasoningEffort.tooltip')}>
                  <OutlineQuestionmarkcircleIcon />
                </Tooltip>
              </div>
              {menu}
              {effortProbing && (
                <div className={styles['dropdown-loading']}>
                  <YakitSolidLoading size={14} inline />
                  {t('ConfigNetworkPage.reasoningEffortProbing')}
                </div>
              )}
            </div>
          )
        }}
        value={effortUnset ? { label: renderPill(t('AiAgengt.reasoningEffort')), value: '' } : effortValue}
        onSelect={onEffortSelect}
        optionLabelProp="label"
        open={open}
        setOpen={onSetOpen}
        disabled={props.disabled || !currentModel}
      >
        {reasoningEffortOptions.map((item) => (
          <YakitSelect.Option
            key={item.value}
            value={item.value as string}
            label={renderPill(pillText(item.value as string))}
          >
            <div
              className={classNames(styles['select-option-wrapper'], {
                [styles['select-option-active-wrapper']]: !effortUnset && item.value === effortValue,
              })}
            >
              <div className={styles['text']}>{item.label}</div>
            </div>
          </YakitSelect.Option>
        ))}
      </AIChatSelect>
    </div>
  )
})
