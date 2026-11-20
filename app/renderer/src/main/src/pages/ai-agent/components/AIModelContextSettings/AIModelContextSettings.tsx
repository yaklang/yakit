import type { FC } from 'react'
import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Slider, Tooltip } from 'antd'
import {
  ExclamationOutlined,
  InformationCircleOutlined,
  QuestionMarkCircleOutlined,
  RotateCcwOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { YakitInputNumber } from '@/components/yakitUI/YakitInputNumber/YakitInputNumber'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { yakitNotify } from '@/utils/notification'
import type { AIModelContextDraft, AIModelContextSettingsProps } from './type'
import type { ModelContextPatch } from '@/pages/ai-re-act/hooks/aiRender'
import useAIModelContext from '../../useContext/useAIModelContext'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import { useCurrentRawData } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { currentPrimaryModel, sameModel } from '@/pages/ai-re-act/hooks/modelContext'
import { formatModelContextTokens } from '../../utils/modelContextFormat'
import styles from './AIModelContextSettings.module.scss'

const AIModelContextSettings: FC<AIModelContextSettingsProps> = ({ ref, source, open = true }) => {
  const rawData = useCurrentRawData()
  const primaryModel = useAIGlobalConfigStore(currentPrimaryModel, sameModel)
  const context = useAIModelContext(source, open)
  const { editorThresholdTokens, editorDisableAutoAdjust, loading, waitingForContext, error, retry, save } = context
  const { minimumThresholdTokens } = context
  const maximumThresholdTokens = 1000000
  const normalizeTokens = (tokens: number) =>
    Math.min(maximumThresholdTokens, Math.max(minimumThresholdTokens, Math.round(tokens)))
  const defaultThresholdTokens = normalizeTokens(500000)
  const { t } = useI18nNamespaces(['aiAgent'])
  const [draft, setDraft] = useState<AIModelContextDraft>({})
  const draftRef = useRef(draft)
  useEffect(() => {
    draftRef.current = {}
    setDraft(draftRef.current)
  }, [rawData, primaryModel])
  const updateDraft = (change: AIModelContextDraft) => {
    draftRef.current = { ...draftRef.current, ...change }
    setDraft(draftRef.current)
  }
  const finishInput = () => {
    const tokens = draftRef.current.tokens
    if (tokens !== undefined)
      updateDraft({ tokens: tokens == null || !Number.isFinite(tokens) ? undefined : normalizeTokens(tokens) })
  }
  const value = draft.tokens === undefined ? editorThresholdTokens : draft.tokens
  useImperativeHandle(ref, () => ({
    save: () => {
      const { tokens, disableAutoAdjust } = draftRef.current
      draftRef.current = {}
      setDraft(draftRef.current)
      const patch: ModelContextPatch = {}
      if (tokens != null && Number.isFinite(tokens) && normalizeTokens(tokens) !== editorThresholdTokens)
        patch.threshold_tokens = normalizeTokens(tokens)
      if (disableAutoAdjust !== undefined && disableAutoAdjust !== editorDisableAutoAdjust)
        patch.disable_auto_adjust = disableAutoAdjust
      if (Object.keys(patch).length) save(patch)
    },
    reset: () => updateDraft({ tokens: defaultThresholdTokens, disableAutoAdjust: false }),
  }))

  return (
    <div className={styles.settings} aria-busy={loading}>
      {loading && (
        <div className={styles.loadingOverlay}>
          <YakitSpin size="small" />
        </div>
      )}
      <div className={styles.card}>
        <div className={styles.heading}>
          <div className={styles.thresholdLabel}>
            <span>{t('AIContextUsage.threshold')}</span>
            {waitingForContext && !error && (
              <YakitPopover trigger={['hover', 'focus']} placement="top" content={t('AIContextUsage.waitingContext')}>
                <span
                  role="img"
                  aria-label={t('AIContextUsage.waitingContext')}
                  tabIndex={0}
                  className={styles.waitingIcon}
                >
                  <InformationCircleOutlined size={14} color="currentColor" />
                </span>
              </YakitPopover>
            )}
            {error && (
              <YakitPopover
                trigger={['hover', 'focus']}
                placement="top"
                destroyOnHidden
                content={
                  <div className={styles.feedback}>
                    <span>{error}</span>
                    <YakitButton className={styles.retryButton} type="primary" size="small" onClick={retry}>
                      {t('AIContextUsage.retry')}
                    </YakitButton>
                  </div>
                }
              >
                <YakitTag
                  className={styles.errorTag}
                  size="small"
                  color="serious"
                  fullRadius
                  border={false}
                  tabIndex={0}
                >
                  <ExclamationOutlined size={12} color="currentColor" />
                  <span className={styles.errorMessage}>{error}</span>
                </YakitTag>
              </YakitPopover>
            )}
          </div>
          <YakitInputNumber
            aria-label={t('AIContextUsage.threshold')}
            value={value == null ? null : value / 1000}
            placeholder="—"
            suffix="K"
            controls={false}
            wrapperClassName={styles.number}
            onChangeCapture={(event) => {
              const input = event.target as HTMLInputElement
              const parsed = input.value.replace(/[^\w.-]+/g, '')
              if (Number(parsed) > maximumThresholdTokens / 1000 || input.value.replace(/\D/g, '').length > 4) {
                input.value = value == null ? '' : String(value / 1000)
                yakitNotify('warning', t('AIContextUsage.exceedsMaximum'))
              }
            }}
            onChange={(next) => updateDraft({ tokens: next == null ? null : Number(next) * 1000 })}
            onBlur={finishInput}
            onPressEnter={finishInput}
          />
          <Tooltip title={t('AIContextUsage.restoreDefault')} trigger={['hover', 'focus']}>
            <YakitButton
              type="text2"
              size="small"
              htmlType="button"
              aria-label={t('AIContextUsage.restoreDefault')}
              icon={<RotateCcwOutlined size={16} color="currentColor" />}
              onClick={() => updateDraft({ tokens: defaultThresholdTokens })}
            />
          </Tooltip>
        </div>
        <Slider
          className={styles.slider}
          ariaLabelForHandle={t('AIContextUsage.threshold')}
          min={minimumThresholdTokens}
          max={maximumThresholdTokens}
          step={1000}
          value={normalizeTokens(value ?? minimumThresholdTokens)}
          tooltip={{ open: false }}
          onChange={(next) => updateDraft({ tokens: normalizeTokens(next) })}
        />
        <div className={styles.scale} aria-hidden="true">
          <span>{formatModelContextTokens(minimumThresholdTokens)}</span>
          <span>{formatModelContextTokens((minimumThresholdTokens + maximumThresholdTokens) / 2)}</span>
          <span>{formatModelContextTokens(maximumThresholdTokens)}</span>
        </div>
        <div className={styles.automatic}>
          <div className={styles.description}>
            <span className={styles.autoAdjustLabel}>
              {t('AIContextUsage.autoAdjust')}
              <Tooltip title={t('AIContextUsage.autoAdjustTooltip')} placement="top" trigger={['hover', 'focus']}>
                <span
                  role="img"
                  aria-label={t('AIContextUsage.autoAdjust')}
                  tabIndex={0}
                  className={styles.waitingIcon}
                >
                  <QuestionMarkCircleOutlined size={14} color="currentColor" />
                </span>
              </Tooltip>
            </span>
            <span>{t('AIContextUsage.autoAdjustHelp')}</span>
          </div>
          <YakitSwitch
            aria-label={t('AIContextUsage.autoAdjust')}
            checked={!(draft.disableAutoAdjust ?? editorDisableAutoAdjust)}
            onChange={(enabled) => updateDraft({ disableAutoAdjust: !enabled })}
            wrapperClassName={styles.switch}
          />
        </div>
      </div>
    </div>
  )
}

export default AIModelContextSettings
