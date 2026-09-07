import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Slider } from 'antd'
import { useDebounceFn, useMemoizedFn } from 'ahooks'
import cloneDeep from 'lodash/cloneDeep'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitInputNumber } from '@/components/yakitUI/YakitInputNumber/YakitInputNumber'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { RefreshOutlined, RotateCcwOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import type { AIAgentSetting } from '@/pages/ai-agent/aiAgentType'
import { AIAgentSettingDefault, AIReviewRuleOptions } from '@/pages/ai-agent/defaultConstant'
import {
  loadAIAgentChatSetting,
  persistAIAgentChatSetting,
  serializeAIAgentChatSetting,
} from '@/pages/ai-agent/utils/aiAgentChatSettingCache'
import emiter from '@/utils/eventBus/eventBus'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import classNames from 'classnames'
import styles from './AIConfigSettings.module.scss'

const ReviewPolicyOptions = AIReviewRuleOptions.map((item) => ({
  value: item.value,
  label: item.value,
}))

const permissionReset: Partial<AIAgentSetting> = {
  DisallowRequireForUserPrompt: AIAgentSettingDefault.DisallowRequireForUserPrompt,
  EnableSystemFileSystemOperator: AIAgentSettingDefault.EnableSystemFileSystemOperator,
  DisableToolIntervalReview: AIAgentSettingDefault.DisableToolIntervalReview,
  AIReviewRiskControlScore: AIAgentSettingDefault.AIReviewRiskControlScore,
}

const planningReset: Partial<AIAgentSetting> = {
  ReviewPolicy: AIAgentSettingDefault.ReviewPolicy,
  AllowPlanUserInteract: AIAgentSettingDefault.AllowPlanUserInteract,
  PlanUserInteractMaxCount: AIAgentSettingDefault.PlanUserInteractMaxCount,
  ReActMaxIteration: AIAgentSettingDefault.ReActMaxIteration,
  PlanExecTaskConcurrency: AIAgentSettingDefault.PlanExecTaskConcurrency,
}

const automationReset: Partial<AIAgentSetting> = {
  UseDefaultAIConfig: AIAgentSettingDefault.UseDefaultAIConfig,
  EnableAISearchTool: AIAgentSettingDefault.EnableAISearchTool,
  DisableToolUse: AIAgentSettingDefault.DisableToolUse,
  DisableMemoryTriage: AIAgentSettingDefault.DisableMemoryTriage,
  AICallAutoRetry: AIAgentSettingDefault.AICallAutoRetry,
  AITransactionRetry: AIAgentSettingDefault.AITransactionRetry,
}

const resourcesReset: Partial<AIAgentSetting> = {
  TimelineContentSizeLimit: AIAgentSettingDefault.TimelineContentSizeLimit,
  AICallTokenLimit: AIAgentSettingDefault.AICallTokenLimit,
  UserInteractLimit: AIAgentSettingDefault.UserInteractLimit,
}

const SettingRow: React.FC<{
  title: ReactNode
  desc?: ReactNode
  children: ReactNode
}> = (props) => {
  const { title, desc, children } = props
  return (
    <div className={styles['setting-row']}>
      <div className={styles['setting-row-text']}>
        <div className={styles['setting-row-title']}>{title}</div>
        {desc ? <div className={styles['setting-row-desc']}>{desc}</div> : null}
      </div>
      <div className={styles['setting-row-control']}>{children}</div>
    </div>
  )
}

const digitsOnly = (raw: string) => {
  let value = raw.replace(/\D/g, '')
  if (value.length > 1 && value.startsWith('0')) value = value.replace(/^0+/, '')
  return value
}

export const AIConfigSettings: React.FC = () => {
  const { t } = useI18nNamespaces(['setting', 'aiAgent', 'yakitUi'])
  const [setting, setSetting] = useState<AIAgentSetting>(() => cloneDeep(AIAgentSettingDefault))
  const lastPayloadRef = useRef(serializeAIAgentChatSetting(AIAgentSettingDefault))
  const settingRef = useRef(setting)
  settingRef.current = setting

  const persist = useDebounceFn(
    (next: AIAgentSetting) => {
      lastPayloadRef.current = serializeAIAgentChatSetting(next)
      persistAIAgentChatSetting(next)
    },
    { wait: 200 },
  ).run

  const apply = useMemoizedFn((patch: Partial<AIAgentSetting>) => {
    const next = { ...settingRef.current, ...patch }
    setSetting(next)
    persist(next)
  })

  const applyAll = useMemoizedFn((next: AIAgentSetting) => {
    setSetting(next)
    persist(next)
  })

  useEffect(() => {
    loadAIAgentChatSetting().then((next) => {
      if (!next) return
      lastPayloadRef.current = serializeAIAgentChatSetting(next)
      setSetting(next)
    })
  }, [])

  useEffect(() => {
    const onChange = (payload?: string) => {
      if (!payload || payload === lastPayloadRef.current) return
      try {
        const cache = JSON.parse(payload) as AIAgentSetting
        if (typeof cache !== 'object' || !cache) return
        lastPayloadRef.current = payload
        setSetting((old) => ({ ...old, ...cache }))
      } catch (_) {}
    }
    emiter.on('onAIAgentChatSettingChange', onChange)
    return () => {
      emiter.off('onAIAgentChatSettingChange', onChange)
    }
  }, [])

  const reviewDesc = AIReviewRuleOptions.find((item) => item.value === setting.ReviewPolicy)?.describe

  return (
    <div className={styles['ai-config']}>
      <div className={styles['page-head']}>
        <div className={styles['page-title']}>{t('SettingsPage.item.ai-config')}</div>
        <YakitButton
          type="outline1"
          colors="danger"
          icon={<RotateCcwOutlined color="currentColor" />}
          onClick={() => applyAll(cloneDeep(AIAgentSettingDefault))}
        >
          {t('YakitButton.reset')}
        </YakitButton>
      </div>

      <div className={styles['section']}>
        <div className={styles['section-head']}>
          <div className={styles['section-title']}>{t('AIChatSetting.permissionsAndSecurity')}</div>
          <YakitButton
            type="text2"
            icon={<RefreshOutlined color="currentColor" />}
            onClick={() => apply(permissionReset)}
          />
        </div>
        <div className={styles['list-panel']}>
          <SettingRow title={t('AIChatSetting.disallowUserPrompt')}>
            <YakitSwitch
              size="middle"
              checked={!!setting.DisallowRequireForUserPrompt}
              onChange={(v) => apply({ DisallowRequireForUserPrompt: v })}
            />
          </SettingRow>
          <SettingRow title={t('AIChatSetting.enableFileOperator')}>
            <YakitSwitch
              size="middle"
              checked={!!setting.EnableSystemFileSystemOperator}
              onChange={(v) => apply({ EnableSystemFileSystemOperator: v })}
            />
          </SettingRow>
          <SettingRow
            title={t('AIChatSetting.disableToolIntervalReview')}
            desc={t('AIChatSetting.disableToolIntervalReviewDesc')}
          >
            <YakitSwitch
              size="middle"
              checked={!!setting.DisableToolIntervalReview}
              onChange={(v) => apply({ DisableToolIntervalReview: v })}
            />
          </SettingRow>
          <SettingRow title={t('AIChatSetting.riskThreshold')} desc={t('AIChatSetting.riskThresholdDesc')}>
            <div className={styles['slider-control']}>
              <Slider
                min={0}
                max={1}
                step={0.01}
                tooltip={{ open: false }}
                value={setting.AIReviewRiskControlScore ?? AIAgentSettingDefault.AIReviewRiskControlScore}
                onChange={(v) => apply({ AIReviewRiskControlScore: v })}
              />
              <span className={styles['slider-value']}>
                {setting.AIReviewRiskControlScore ?? AIAgentSettingDefault.AIReviewRiskControlScore}
              </span>
            </div>
          </SettingRow>
        </div>
      </div>

      <div className={styles['section']}>
        <div className={styles['section-head']}>
          <div className={styles['section-title']}>{t('AIChatSetting.planningAndExecution')}</div>
          <YakitButton
            type="text2"
            icon={<RefreshOutlined color="currentColor" />}
            onClick={() => apply(planningReset)}
          />
        </div>
        <div className={styles['list-panel']}>
          <SettingRow title={t('AIChatSetting.reviewPolicy')}>
            <div className={styles['control-stack-end']}>
              <YakitRadioButtons
                buttonStyle="solid"
                options={ReviewPolicyOptions}
                value={setting.ReviewPolicy}
                onChange={(e) => apply({ ReviewPolicy: e.target.value })}
              />
              {reviewDesc ? <div className={classNames(styles['setting-row-desc'])}>{t(reviewDesc)}</div> : null}
            </div>
          </SettingRow>
          <SettingRow title={t('AIChatSetting.allowPlanUserInteract')}>
            <YakitSwitch
              size="middle"
              checked={!!setting.AllowPlanUserInteract}
              onChange={(v) => apply({ AllowPlanUserInteract: v })}
            />
          </SettingRow>
          {setting.AllowPlanUserInteract ? (
            <SettingRow
              title={t('AIChatSetting.planUserInteractMaxCount')}
              desc={t('AIChatSetting.planUserInteractMaxCountDesc')}
            >
              <YakitInputNumber
                size="middle"
                min={0}
                max={20}
                value={setting.PlanUserInteractMaxCount}
                onChange={(v) => apply({ PlanUserInteractMaxCount: Number(v) || 0 })}
              />
            </SettingRow>
          ) : null}
          <SettingRow title={t('AIChatSetting.reActMaxIteration')}>
            <YakitInputNumber
              size="middle"
              min={0}
              max={100}
              value={setting.ReActMaxIteration}
              onChange={(v) => apply({ ReActMaxIteration: Number(v) || 0 })}
            />
          </SettingRow>
          <SettingRow
            title={t('AIChatSetting.planExecTaskConcurrency')}
            desc={t('AIChatSetting.planExecTaskConcurrencyDesc')}
          >
            <YakitInputNumber
              size="middle"
              min={1}
              max={5}
              value={setting.PlanExecTaskConcurrency}
              onChange={(v) => apply({ PlanExecTaskConcurrency: Number(v) || 1 })}
            />
          </SettingRow>
        </div>
      </div>

      <div className={styles['section']}>
        <div className={styles['section-head']}>
          <div className={styles['section-title']}>{t('AIChatSetting.automation')}</div>
          <YakitButton
            type="text2"
            icon={<RefreshOutlined color="currentColor" />}
            onClick={() => apply(automationReset)}
          />
        </div>
        <div className={styles['list-panel']}>
          <SettingRow title={t('AIChatSetting.useDefaultAIConfig')}>
            <YakitSwitch
              size="middle"
              checked={!!setting.UseDefaultAIConfig}
              onChange={(v) => apply({ UseDefaultAIConfig: v })}
            />
          </SettingRow>
          <SettingRow title={t('AIChatSetting.enableAISearchTool')}>
            <YakitSwitch
              size="middle"
              checked={!!setting.EnableAISearchTool}
              onChange={(v) => apply({ EnableAISearchTool: v })}
            />
          </SettingRow>
          <SettingRow title={t('AIChatSetting.disableToolUse')} desc={t('AIChatSetting.disableToolUseDesc')}>
            <YakitSwitch
              size="middle"
              checked={!!setting.DisableToolUse}
              onChange={(v) => apply({ DisableToolUse: v })}
            />
          </SettingRow>
          <SettingRow title={t('AIChatSetting.disableMemoryTriage')} desc={t('AIChatSetting.disableMemoryTriageDesc')}>
            <YakitSwitch
              size="middle"
              checked={!!setting.DisableMemoryTriage}
              onChange={(v) => apply({ DisableMemoryTriage: v })}
            />
          </SettingRow>
          <SettingRow title={t('AIChatSetting.aiCallAutoRetry')} desc={t('AIChatSetting.aiCallAutoRetryDesc')}>
            <YakitInputNumber
              size="middle"
              min={0}
              max={100}
              value={setting.AICallAutoRetry}
              onChange={(v) => apply({ AICallAutoRetry: Number(v) || 0 })}
            />
          </SettingRow>
          <SettingRow title={t('AIChatSetting.aiTransactionRetry')} desc={t('AIChatSetting.aiTransactionRetryDesc')}>
            <YakitInputNumber
              size="middle"
              min={0}
              max={100}
              value={setting.AITransactionRetry}
              onChange={(v) => apply({ AITransactionRetry: Number(v) || 0 })}
            />
          </SettingRow>
        </div>
      </div>

      <div className={styles['section']}>
        <div className={styles['section-head']}>
          <div className={styles['section-title']}>{t('AIChatSetting.resourcesLimits')}</div>
          <YakitButton
            type="text2"
            icon={<RefreshOutlined color="currentColor" />}
            onClick={() => apply(resourcesReset)}
          />
        </div>
        <div className={styles['list-panel']}>
          <SettingRow title={t('AIChatSetting.timelineContentSize')}>
            <YakitInput
              wrapperClassName={classNames(styles['compact-input'], styles['input-suffix'])}
              suffix="KB"
              value={`${setting.TimelineContentSizeLimit ?? ''}`}
              onChange={(e) => {
                const value = digitsOnly(e.target.value)
                apply({ TimelineContentSizeLimit: value === '' ? 0 : Number(value) })
              }}
            />
          </SettingRow>
          <SettingRow title={t('AIChatSetting.aiCallTokenLimit')} desc={t('AIChatSetting.aiCallTokenLimitDesc')}>
            <YakitInput
              wrapperClassName={classNames(styles['compact-input'], styles['input-suffix'])}
              suffix="K"
              value={`${setting.AICallTokenLimit ?? ''}`}
              onChange={(e) => {
                const value = digitsOnly(e.target.value)
                apply({ AICallTokenLimit: value === '' ? 0 : Number(value) })
              }}
            />
          </SettingRow>
          <SettingRow title={t('AIChatSetting.userInteractLimit')} desc={t('AIChatSetting.userInteractLimitDesc')}>
            <YakitInputNumber
              size="middle"
              min={0}
              max={200}
              value={setting.UserInteractLimit}
              onChange={(v) => apply({ UserInteractLimit: Number(v) || 0 })}
            />
          </SettingRow>
        </div>
      </div>
    </div>
  )
}
