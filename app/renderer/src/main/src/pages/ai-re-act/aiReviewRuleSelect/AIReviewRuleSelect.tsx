import type React from 'react'
import { memo, useRef, useState } from 'react'
import { Slider } from 'antd'
import type { SliderSingleProps } from 'antd'
import type { AIChatSelectProps, ReviewRuleSelectProps } from './type'
import styles from './AIReviewRuleSelect.module.scss'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import classNames from 'classnames'
import { useClickAway, useControllableValue, useMemoizedFn, useUpdateEffect } from 'ahooks'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { AIAgentSettingDefault, AIReviewRuleIconMap, AIReviewRuleOptions } from '@/pages/ai-agent/defaultConstant'
import type { AIReviewRuleOptionsType } from '@/pages/ai-agent/defaultConstant'
import { HandOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { AIColorful } from '@yakit-libs/yakit-ui-icons/colorful'
import { AIInputEventHotPatchTypeEnum } from '../hooks/grpcApi'
import type { AIInputEvent, AIStartParams } from '../hooks/grpcApi'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import useCurrentSessionId from '../hooks/useCurrentSessionId'
import { useCurrentStore } from '../hooks/useCurrentDataBySession'
import { useStore } from 'zustand'

const AIReviewRuleSelect: React.FC<ReviewRuleSelectProps> = memo((props) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  /** 当前对话唯一ID */
  const sessionId = useCurrentSessionId()
  const store = useCurrentStore()
  const execute = useStore(store, (state) => state.execute)

  const { setting } = useAIAgentStore()
  const { setSetting, onSend } = useAIAgentDispatcher()

  const [open, setOpen] = useState<boolean>(false)
  const [draftRiskScore, setDraftRiskScore] = useState<number>()
  const modelValue = setting?.ReviewPolicy || AIAgentSettingDefault.ReviewPolicy
  const [selectReviewPolicy, setSelectReviewPolicy] = useState<AIStartParams['ReviewPolicy']>()
  const displayReviewPolicy = selectReviewPolicy ?? modelValue
  const savedRiskScore = setting?.AIReviewRiskControlScore ?? AIAgentSettingDefault.AIReviewRiskControlScore
  const riskScore = draftRiskScore ?? savedRiskScore
  const riskLabel = t('AIChatSetting.riskThreshold')

  //#region 热更新 Review 规则
  useUpdateEffect(() => {
    if (setting.ReviewPolicy) handHotpatchReviewPolicy(setting.ReviewPolicy)
  }, [setting.ReviewPolicy])
  /** 热更新 Review 规则 */
  const handHotpatchReviewPolicy = useMemoizedFn((value: AIStartParams['ReviewPolicy']) => {
    if (!sessionId) return
    const info: AIInputEvent = {
      IsConfigHotpatch: true,
      HotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_AgreePolicy,
      Params: {
        ReviewPolicy: value,
      },
    }
    onSend({ token: sessionId, type: '', params: info })
  })
  //#endregion

  //#region 热更新 AIReviewRiskControlScore
  useUpdateEffect(() => {
    if (setting.AIReviewRiskControlScore) handHotpatchAIReviewRiskControlScore(setting.AIReviewRiskControlScore)
  }, [setting.AIReviewRiskControlScore])
  /** 热更新 AIReviewRiskControlScore */
  const handHotpatchAIReviewRiskControlScore = useMemoizedFn((value: number) => {
    if (!sessionId) return
    const info: AIInputEvent = {
      IsConfigHotpatch: true,
      HotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_RiskControlScore,
      Params: {
        AIReviewRiskControlScore: value ?? 0,
      },
    }
    onSend({ token: sessionId, type: '', params: info })
  })
  //#endregion

  const getIcon = useMemoizedFn((value: AIReviewRuleOptionsType) => {
    return AIReviewRuleIconMap[value]?.icon
  })
  const getActiveIcon = useMemoizedFn((value: AIReviewRuleOptionsType) => {
    if (value === 'ai') return <AIColorful />
    if (value === 'manual') return <HandOutlined color="currentColor" />
    return getIcon(value)
  })
  const onSetOpen = useMemoizedFn((nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) return

    if (draftRiskScore !== undefined && draftRiskScore !== savedRiskScore) {
      if (execute) handHotpatchAIReviewRiskControlScore(draftRiskScore)
      setSetting?.((old) => ({ ...old, AIReviewRiskControlScore: draftRiskScore }))
    }
    setDraftRiskScore(undefined)
    setSelectReviewPolicy(undefined)
  })
  const onPickPolicy = (policy: AIReviewRuleOptionsType) => {
    if (policy !== displayReviewPolicy) {
      if (execute) handHotpatchReviewPolicy(policy)
      setSetting?.((old) => ({ ...old, ReviewPolicy: policy }))
      if (policy === 'ai') {
        setSelectReviewPolicy(policy)
        return
      }
    }
    onSetOpen(false)
  }
  const renderContent = useMemoizedFn(() => {
    const currentSelect = AIReviewRuleOptions.find((item) => item.value === displayReviewPolicy)
    return (
      <>
        <YakitSelect.Option
          value="select"
          label={
            <div
              className={classNames(styles['select-option'], {
                [styles['select-option-ai']]: currentSelect?.value === 'ai',
                [styles['select-option-yolo']]: currentSelect?.value === 'yolo',
              })}
            >
              {currentSelect ? (
                <>
                  <div className={styles['select-icon-wrapper']}>{getActiveIcon(currentSelect?.value)}</div>
                  <span className={styles['select-option-text']}>{t(currentSelect?.label)}</span>
                </>
              ) : (
                <span className={styles['select-option-text']}>暂无选择</span>
              )}
            </div>
          }
        >
          回答模式
        </YakitSelect.Option>
      </>
    )
  })
  return (
    <div className={classNames(styles['review-rule-select-wrapper'], props.className)}>
      <AIChatSelect
        dropdownRender={() => {
          return (
            <div className={styles['drop-select-wrapper']} onClick={(event) => event.stopPropagation()}>
              <div className={styles['select-title']}>回答模式</div>
              <div className={styles['select-content']}>
                {AIReviewRuleOptions.map((item) => (
                  <div
                    key={item.value}
                    className={classNames(styles['option-wrapper'], styles['select-option-wrapper'], {
                      [styles['select-option-active-wrapper']]: item.value === displayReviewPolicy,
                    })}
                    onClick={() => onPickPolicy(item.value)}
                  >
                    <div className={styles['icon-wrapper']}>{getIcon(item.value)}</div>
                    <div className={styles['text-wrapper']}>
                      <div className={styles['text']}>{t(item.label)}</div>
                      <div className={styles['describe']}> {t(item.describe)}</div>
                    </div>
                  </div>
                ))}
              </div>
              {displayReviewPolicy === 'ai' && (
                <div className={styles['risk-panel']} onKeyDown={(event) => event.stopPropagation()}>
                  <span>{riskLabel}</span>
                  <FormItemSlider
                    className={styles['risk-slider']}
                    ariaLabelForHandle={riskLabel}
                    value={riskScore}
                    onChange={setDraftRiskScore}
                    min={0}
                    max={1}
                    step={0.01}
                  />
                </div>
              )}
            </div>
          )
        }}
        value="select"
        variant="borderless"
        suffixIcon={null}
        optionLabelProp="label"
        open={open}
        setOpen={onSetOpen}
      >
        {renderContent()}
      </AIChatSelect>
    </div>
  )
})
export default AIReviewRuleSelect

export const AIChatSelect: React.FC<AIChatSelectProps> = memo((props) => {
  const { getList, dropdownRender, children, setOpen: defSetOpen, closestClassName, disabled, ...rest } = props
  const [open, setOpen] = useControllableValue(props, {
    defaultValue: false,
    valuePropName: 'open',
    trigger: 'setOpen',
  })

  const selectWrapperRef = useRef<HTMLDivElement>(null)
  const dropdownRenderRef = useRef<HTMLDivElement>(null)

  useClickAway(
    (e: Event) => {
      const target = e.target as HTMLElement
      // 如果点击的元素或其父级是我们不想触发关闭的元素（如二级悬浮层），直接忽略
      if (closestClassName && target.closest(closestClassName)) {
        return
      }
      if (open) setOpen(false)
    },
    [selectWrapperRef, dropdownRenderRef],
    'mousedown',
  )

  const onSelectWrapperClick = useMemoizedFn((e) => {
    if (disabled) return
    if (open) {
      setOpen(false)
    } else {
      onOpen()
    }
  })
  const onOpen = useMemoizedFn(() => {
    setOpen(true)
    getList && getList()
  })
  const onDropdownRender = useMemoizedFn((menu) => <div ref={dropdownRenderRef}>{dropdownRender(menu, setOpen)}</div>)
  return (
    <div
      ref={selectWrapperRef}
      className={classNames(styles['ai-chat-select-wrapper'], {
        [styles['ai-chat-select-borderless']]: rest.variant === 'borderless',
      })}
      onClick={rest.onOpenChange ? undefined : onSelectWrapperClick}
    >
      <YakitSelect
        {...rest}
        popupMatchSelectWidth={false}
        size="small"
        popupRender={onDropdownRender}
        open={open}
        disabled={disabled}
      >
        {children}
      </YakitSelect>
    </div>
  )
})

const FormItemSlider: React.FC<SliderSingleProps> = memo((props) => {
  const { value, ...rest } = props
  return (
    <div className={styles['form-item-slider']}>
      <div className={styles['slider-body']}>
        <Slider tooltip={{ open: false }} value={value} {...rest} />
      </div>
      <div className={styles['slider-value']}>{value}</div>
    </div>
  )
})
