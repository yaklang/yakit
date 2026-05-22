import React, { useEffect, useRef, useState } from 'react'
import { AIChatSelectProps, ReviewRuleSelectProps } from './type'
import styles from './AIReviewRuleSelect.module.scss'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import classNames from 'classnames'
import { useClickAway, useControllableValue, useCreation, useInViewport, useMemoizedFn } from 'ahooks'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import {
  AIAgentSettingDefault,
  AIReviewRuleIconMap,
  AIReviewRuleOptions,
  AIReviewRuleOptionsType,
} from '@/pages/ai-agent/defaultConstant'
import { OutlineSirenIcon } from '@/assets/icon/outline'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { FormItemSlider } from '@/pages/ai-agent/AIChatSetting/AIChatSetting'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import useChatIPCDispatcher from '@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher'
import useChatIPCStore from '@/pages/ai-agent/useContext/ChatIPCContent/useStore'
import { AIInputEventHotPatchTypeEnum, AIStartParams } from '../hooks/grpcApi'
import isEqual from 'lodash/isEqual'
import emiter from '@/utils/eventBus/eventBus'
import { JSONParseLog } from '@/utils/tool'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

const AIReviewRuleSelect: React.FC<ReviewRuleSelectProps> = React.memo((props) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { setting } = useAIAgentStore()
  const { setSetting } = useAIAgentDispatcher()

  const { chatIPCData } = useChatIPCStore()
  const { handleSendConfigHotpatch } = useChatIPCDispatcher()

  const [visible, setVisible] = useState<boolean>(false)
  const [open, setOpen] = useState<boolean>(false)
  const [selectAIReviewRiskControlScore, setAIReviewRiskControlScore] =
    useState<AIStartParams['AIReviewRiskControlScore']>()

  const modelValue = useCreation(() => {
    return setting?.ReviewPolicy || AIAgentSettingDefault.ReviewPolicy
  }, [setting?.ReviewPolicy, chatIPCData.execute])
  const [selectReviewPolicy, setSelectReviewPolicy] = useState<AIStartParams['ReviewPolicy']>()

  const refRef = useRef<HTMLDivElement>(null)
  const [inViewport = true] = useInViewport(refRef)

  useEffect(() => {
    if (!inViewport) return
    emiter.on('onRefreshAIReviewRuleSelect', onRefreshAIReviewRuleSelect)
    return () => {
      emiter.off('onRefreshAIReviewRuleSelect', onRefreshAIReviewRuleSelect)
    }
  }, [inViewport])

  const aiReviewRiskControlScore = useCreation(() => {
    return setting?.AIReviewRiskControlScore || AIAgentSettingDefault.AIReviewRiskControlScore
  }, [setting?.AIReviewRiskControlScore])

  const onRefreshAIReviewRuleSelect = useMemoizedFn((res: string) => {
    if (!chatIPCData.execute) return
    const data = JSONParseLog(res)
    if (!!data?.reviewPolicy) {
      handHotpatchReviewPolicy(data?.reviewPolicy as AIStartParams['ReviewPolicy'])
    }
    if (!!data?.aiReviewRiskControlScore) {
      handHotpatchAIReviewRiskControlScore(data?.aiReviewRiskControlScore)
    }
  })

  const handHotpatchReviewPolicy = useMemoizedFn((value: AIStartParams['ReviewPolicy']) => {
    handleSendConfigHotpatch({
      hotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_AgreePolicy,
      params: {
        ReviewPolicy: value,
      },
    })
  })

  const handHotpatchAIReviewRiskControlScore = useMemoizedFn((value: number) => {
    handleSendConfigHotpatch({
      hotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_RiskControlScore,
      params: {
        AIReviewRiskControlScore: value,
      },
    })
  })

  const onSelectModel = useMemoizedFn((value: AIStartParams['ReviewPolicy']) => {
    setSetting && setSetting((old) => ({ ...old, ReviewPolicy: value }))
  })

  const onSetAIReviewRiskControlScore = useMemoizedFn((value?: number) => {
    setSetting && setSetting((old) => ({ ...old, AIReviewRiskControlScore: value || 0 }))
  })

  const onVisibleChange = useMemoizedFn((v: boolean) => {
    setVisible(v)
    if (
      !v &&
      chatIPCData.execute &&
      selectAIReviewRiskControlScore &&
      !isEqual(selectAIReviewRiskControlScore, aiReviewRiskControlScore)
    ) {
      handHotpatchAIReviewRiskControlScore(selectAIReviewRiskControlScore)
    }
    if (v) {
      setAIReviewRiskControlScore(aiReviewRiskControlScore)
    } else {
      onSetAIReviewRiskControlScore(selectAIReviewRiskControlScore)
    }
  })
  const getIcon = useMemoizedFn((value: AIReviewRuleOptionsType) => {
    return AIReviewRuleIconMap[value]?.icon
  })
  const getActiveIcon = useMemoizedFn((value: AIReviewRuleOptionsType) => {
    return AIReviewRuleIconMap[value]?.activeIcon
  })
  const onSetOpen = useMemoizedFn((v: boolean) => {
    setOpen(v)
    if (!v && chatIPCData.execute && !isEqual(selectReviewPolicy, modelValue)) {
      handHotpatchReviewPolicy(selectReviewPolicy)
    }
    if (v) {
      setSelectReviewPolicy(modelValue)
    } else {
      onSelectModel(selectReviewPolicy)
    }
  })
  const renderContent = useMemoizedFn(() => {
    const currentSelect = AIReviewRuleOptions.find((item) => item.value === (selectReviewPolicy || modelValue))
    return (
      <>
        <YakitSelect.Option
          value="select"
          label={
            <div className={styles['select-option']}>
              {currentSelect ? (
                <>
                  <div
                    className={classNames(styles['select-icon-wrapper'], {
                      [styles['select-ai-icon-wrapper']]: currentSelect?.value === 'ai',
                      [styles['select-yolo-icon-wrapper']]: currentSelect?.value === 'yolo',
                      [styles['select-manual-icon-wrapper']]: currentSelect?.value === 'manual',
                    })}
                  >
                    {getActiveIcon(currentSelect?.value)}
                  </div>
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
    <div className={classNames(styles['review-rule-select-wrapper'], props.className)} ref={refRef}>
      <AIChatSelect
        dropdownRender={(menu) => {
          return (
            <div className={styles['drop-select-wrapper']}>
              <div className={styles['select-title']}>
                {/* <OutlineCodepenIcon /> */}
                回答模式
              </div>
              <div className={styles['select-content']} onClick={(e) => e.stopPropagation()}>
                {AIReviewRuleOptions.map((item) => (
                  <div
                    key={item.value}
                    className={classNames(styles['option-wrapper'], styles['select-option-wrapper'], {
                      [styles['select-option-active-wrapper']]: item.value === (selectReviewPolicy || modelValue),
                    })}
                    onClick={() => setSelectReviewPolicy(item.value)}
                  >
                    <div className={styles['icon-wrapper']}>{getIcon(item.value)}</div>
                    <div className={styles['text-wrapper']}>
                      <div className={styles['text']}>{t(item.label)}</div>
                      <div className={styles['describe']}> {t(item.describe)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        }}
        value="select"
        optionLabelProp="label"
        open={open}
        setOpen={onSetOpen}
      >
        {renderContent()}
      </AIChatSelect>
      {modelValue === 'ai' && (
        <YakitPopover
          content={
            <div className={styles['popover-wrapper']}>
              <span>风险阈值：</span>
              <FormItemSlider
                value={selectAIReviewRiskControlScore}
                onChange={setAIReviewRiskControlScore}
                min={0}
                max={1}
                step={0.01}
              />
            </div>
          }
          trigger={['hover', 'click']}
          visible={visible}
          onVisibleChange={onVisibleChange}
        >
          <YakitButton
            type="text2"
            isHover={visible}
            icon={<OutlineSirenIcon className={styles['siren-icon']} />}
            onClick={(e) => {
              e.stopPropagation()
            }}
          />
        </YakitPopover>
      )}
    </div>
  )
})
export default AIReviewRuleSelect

export const AIChatSelect: React.FC<AIChatSelectProps> = React.memo((props) => {
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
    <div ref={selectWrapperRef} className={classNames(styles['ai-chat-select-wrapper'])} onClick={onSelectWrapperClick}>
      <YakitSelect
        dropdownMatchSelectWidth={false}
        size="small"
        dropdownRender={onDropdownRender}
        open={open}
        disabled={disabled}
        {...rest}
      >
        {children}
      </YakitSelect>
    </div>
  )
})
