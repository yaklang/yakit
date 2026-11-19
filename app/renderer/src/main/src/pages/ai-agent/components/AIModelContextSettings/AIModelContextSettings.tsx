import type { FC } from 'react'
import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Slider } from 'antd'
import { ExclamationOutlined, InformationCircleOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitInputNumber } from '@/components/yakitUI/YakitInputNumber/YakitInputNumber'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { AIModelContextDraft, AIModelContextSettingsProps } from './type'
import type { ModelContextPatch } from '@/pages/ai-re-act/hooks/aiRender'
import useAIModelContext from '../../useContext/useAIModelContext'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import { useCurrentRawData } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { currentPrimaryModel, sameModel } from '@/pages/ai-re-act/hooks/modelContext'
import styles from './AIModelContextSettings.module.scss'

const AIModelContextSettings: FC<AIModelContextSettingsProps> = ({ ref, source, open = true }) => {
  const rawData = useCurrentRawData()
  const primaryModel = useAIGlobalConfigStore(currentPrimaryModel, sameModel)
  const context = useAIModelContext(source, open)
  const { editorThresholdTokens, editorDisableAutoAdjust, loading, waitingForContext, error, retry, save } = context
  const normalizeTokens = (tokens: number) =>
    Math.min(1000000, Math.max(context.minimumThresholdTokens, Math.round(tokens)))
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
    reset: () => updateDraft({ tokens: normalizeTokens(500000), disableAutoAdjust: false }),
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
            onChange={(next) => updateDraft({ tokens: next == null ? null : Number(next) * 1000 })}
            onBlur={finishInput}
            onPressEnter={finishInput}
          />
        </div>
        <Slider
          className={styles.slider}
          ariaLabelForHandle={t('AIContextUsage.threshold')}
          min={0}
          max={1000000}
          step={1000}
          value={Math.min(1000000, Math.max(0, value ?? 0))}
          tooltip={{ open: false }}
          onChange={(next) => updateDraft({ tokens: normalizeTokens(next) })}
        />
        <div className={styles.scale} aria-hidden="true">
          <span>0</span>
          <span>500K</span>
          <span>1M</span>
        </div>
        <div className={styles.automatic}>
          <div className={styles.description}>
            <span>{t('AIContextUsage.autoAdjust')}</span>
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
