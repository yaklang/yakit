import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Slider } from 'antd'
import { useMemoizedFn } from 'ahooks'
import cloneDeep from 'lodash/cloneDeep'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitInputNumber } from '@/components/yakitUI/YakitInputNumber/YakitInputNumber'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { RefreshOutlined, RotateCcwOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import type { AIAgentSetting } from '@/pages/ai-agent/aiAgentType'
import { setWelcomeAnimationDisabled, useWelcomeAnimationDisabled } from '@/pages/ai-agent/store/welcomeAnimationStore'
import { AIAgentSettingDefault, AIReviewRuleOptions } from '@/pages/ai-agent/defaultConstant'
import {
  applyAIAgentChatSettingBroadcast,
  loadAIAgentChatSetting,
  persistAIAgentChatSetting,
  serializeAIAgentChatSetting,
} from '@/pages/ai-agent/utils/aiAgentChatSettingCache'
import emiter from '@/utils/eventBus/eventBus'
import { yakitNotify } from '@/utils/notification'
import useAIGlobalConfig from '@/pages/ai-re-act/hooks/useAIGlobalConfig'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import classNames from 'classnames'
import { SettingsSections } from '../../constants'
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
  const welcomeAnimationDisabled = useWelcomeAnimationDisabled()
  const [globalState, globalEvents] = useAIGlobalConfig()
  const globalConfig = globalState.aiGlobalConfig
  // store 初始值也是完整对象，必须等当前 hook 成功读到配置后才能写入。
  const globalWriteDisabled =
    !globalState.aiGlobalConfigRef.current || globalState.queryLoading || globalState.updateLoading
  const [modelRPM, setModelRPM] = useState<number | null>(0)
  useEffect(
    () => setModelRPM(Number(globalConfig?.ModelRequestsPerMinute || 0)),
    [globalConfig?.ModelRequestsPerMinute],
  )
  const saveGlobal = (patch: Parameters<typeof globalEvents.setAIGlobalConfig>[0]) => {
    if (!readyRef.current || globalWriteDisabled) return
    void globalEvents.setAIGlobalConfig(patch).catch(() => undefined)
  }
  const resetGlobal = () => saveGlobal({ ModelRequestsPerMinute: 0, RetryForever: false, NetworkDebug: false })
  const saveRPM = () => {
    if (modelRPM === null) {
      setModelRPM(Number(globalConfig?.ModelRequestsPerMinute || 0))
      return
    }
    const next = Math.max(0, Math.min(60000, Math.trunc(modelRPM)))
    setModelRPM(next)
    if (next !== Number(globalConfig?.ModelRequestsPerMinute || 0)) saveGlobal({ ModelRequestsPerMinute: next })
  }
  const [setting, setSetting] = useState<AIAgentSetting>(() => cloneDeep(AIAgentSettingDefault))
  const [ready, setReady] = useState(false)
  const settingRef = useRef(setting)
  const savedSetting = useRef(setting)
  const pendingSettings = useRef(new Map<AIAgentSetting, Partial<AIAgentSetting>>())
  const readyRef = useRef(false)

  const syncDisplayedSetting = useMemoizedFn(() => {
    const displayed = [...pendingSettings.current.values()].reduce<AIAgentSetting>(
      applyAIAgentChatSettingBroadcast,
      savedSetting.current,
    )
    if (serializeAIAgentChatSetting(displayed) === serializeAIAgentChatSetting(settingRef.current)) return
    settingRef.current = displayed
    setSetting(displayed)
  })

  const apply = useMemoizedFn(async (patch?: Partial<AIAgentSetting>) => {
    if (!readyRef.current) return
    const next = patch ? { ...settingRef.current, ...patch } : cloneDeep(AIAgentSettingDefault)
    pendingSettings.current.set(next, patch ?? next)
    settingRef.current = next
    setSetting(next)
    try {
      savedSetting.current = await persistAIAgentChatSetting(patch)
    } catch (error) {
      yakitNotify('error', t('AIChatSetting.saveFailed', { error: String(error) }))
    } finally {
      pendingSettings.current.delete(next)
      syncDisplayedSetting()
    }
  })

  useEffect(() => {
    let cancelled = false
    const pendingBroadcasts: Partial<AIAgentSetting>[] = []
    const onChange = (payload?: string) => {
      if (!payload) return
      try {
        const cache = JSON.parse(payload) as Partial<AIAgentSetting>
        if (typeof cache !== 'object' || !cache) return
        if (!readyRef.current) pendingBroadcasts.push(cache)
        const next = applyAIAgentChatSettingBroadcast(savedSetting.current, cache)
        savedSetting.current = next
        syncDisplayedSetting()
      } catch (_) {}
    }
    emiter.on('onAIAgentChatSettingChange', onChange)
    loadAIAgentChatSetting()
      .then((result) => {
        if (cancelled) return
        if (result.status === 'error') return
        if (result.status === 'success') {
          const next = pendingBroadcasts.reduce(applyAIAgentChatSettingBroadcast, result.setting)
          savedSetting.current = next
          settingRef.current = next
          setSetting(next)
        }
        pendingBroadcasts.length = 0
        readyRef.current = true
        setReady(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
      emiter.off('onAIAgentChatSettingChange', onChange)
    }
  }, [])

  const reviewDesc = AIReviewRuleOptions.find((item) => item.value === setting.ReviewPolicy)?.describe

  return (
    <div
      className={classNames(styles['ai-config'], { [styles['ai-config-pending']]: !ready })}
      data-ai-config-ready={ready ? '1' : '0'}
      aria-busy={!ready}
    >
      <div className={styles['page-head']}>
        <div className={styles['page-title']}>{t('SettingsPage.item.ai-config')}</div>
        <YakitButton
          type="outline1"
          colors="danger"
          icon={<RotateCcwOutlined color="currentColor" />}
          disabled={!ready || globalWriteDisabled}
          onClick={() => {
            if (!readyRef.current || globalWriteDisabled) return
            apply()
            resetGlobal()
          }}
        >
          {t('YakitButton.reset')}
        </YakitButton>
      </div>

      <div className={styles['section']} data-settings-section={SettingsSections['ai-config'].permissions}>
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
          <SettingRow title={t('AIChatSetting.disableWelcomeAnimation')}>
            <YakitSwitch
              size="middle"
              aria-label={t('AIChatSetting.disableWelcomeAnimation')}
              checked={welcomeAnimationDisabled}
              onChange={setWelcomeAnimationDisabled}
            />
          </SettingRow>
        </div>
      </div>

      <div className={styles['section']} data-settings-section={SettingsSections['ai-config'].planning}>
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

      <div className={styles['section']} data-settings-section={SettingsSections['ai-config'].automation}>
        <div className={styles['section-head']}>
          <div className={styles['section-title']}>{t('AIChatSetting.automation')}</div>
          <YakitButton
            type="text2"
            icon={<RefreshOutlined color="currentColor" />}
            disabled={!ready || globalWriteDisabled}
            onClick={() => {
              if (!readyRef.current || globalWriteDisabled) return
              apply(automationReset)
              resetGlobal()
            }}
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
          <SettingRow title={t('AIChatSetting.modelRPM')} desc={t('AIChatSetting.modelRPMDesc')}>
            <YakitInputNumber
              aria-label={t('AIChatSetting.modelRPM')}
              min={0}
              max={60000}
              precision={0}
              value={modelRPM}
              disabled={!ready || globalWriteDisabled}
              onChange={(v) => setModelRPM(v === null ? null : Number(v))}
              onBlur={saveRPM}
              onPressEnter={saveRPM}
            />
          </SettingRow>
          <SettingRow title={t('AIChatSetting.retryForever')} desc={t('AIChatSetting.retryForeverDesc')}>
            <YakitSwitch
              aria-label={t('AIChatSetting.retryForever')}
              checked={!!globalConfig?.RetryForever}
              disabled={!ready || globalWriteDisabled}
              onChange={(v) => saveGlobal({ RetryForever: v })}
            />
          </SettingRow>
          <SettingRow title={t('AIChatSetting.networkDebug')} desc={t('AIChatSetting.networkDebugDesc')}>
            <YakitSwitch
              aria-label={t('AIChatSetting.networkDebug')}
              checked={!!globalConfig?.NetworkDebug}
              disabled={!ready || globalWriteDisabled}
              onChange={(v) => saveGlobal({ NetworkDebug: v })}
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

      <div className={styles['section']} data-settings-section={SettingsSections['ai-config'].resources}>
        <div className={styles['section-head']}>
          <div className={styles['section-title']}>{t('AIChatSetting.resourcesLimits')}</div>
          <YakitButton
            type="text2"
            icon={<RefreshOutlined color="currentColor" />}
            onClick={() => apply(resourcesReset)}
          />
        </div>
        <div className={styles['list-panel']}>
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
