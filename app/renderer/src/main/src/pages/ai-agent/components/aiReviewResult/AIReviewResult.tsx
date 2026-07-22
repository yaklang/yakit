import { memo, useRef, useState } from 'react'
import { AIReviewParamsProps, AIReviewResultProps, AISingHaveColorTextProps } from './type'
import { useClickAway, useCreation, useMemoizedFn, useUpdateEffect } from 'ahooks'
import styles from './AIReviewResult.module.scss'
import React from 'react'
import ChatCard from '../ChatCard'
import ModalInfo from '../ModelInfo'
import { PreWrapper } from '../ToolInvokerCard'
import { Tooltip } from 'antd'
import { OutlineChevronsDownUpIcon, OutlineChevronsUpDownIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { CopyComponents } from '@/components/yakitUI/YakitTag/YakitTag'
import { setClipboardText } from '@/utils/clipboard'
import { success } from '@/utils/notification'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { isEmpty } from 'lodash'
import classNames from 'classnames'
import { AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'

export const AIReviewResult: React.FC<AIReviewResultProps> = memo((props) => {
  const { info, renderNum, taskLength, casualLength } = props
  const { t, i18n } = useI18nNamespaces(['aiAgent', 'yakitUi'])

  const getChatType = useMemoizedFn(() => {
    return info.chatType
  })

  const [expand, setExpand] = useState<boolean>(false)

  const isInit = useRef<boolean>(true)

  useUpdateEffect(() => {
    if (isInit.current && getChatType() === 'task') {
      setExpand(false)
      isInit.current = false
    }
  }, [taskLength])
  useUpdateEffect(() => {
    if (isInit.current && getChatType() === 'reAct') {
      setExpand(false)
      isInit.current = false
    }
  }, [casualLength])
  const title = useCreation(() => {
    switch (info.type) {
      case AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE:
        return t('AIReviewResult.planReview')
      case AIChatQSDataTypeEnum.TASK_REVIEW_REQUIRE:
        return t('AIReviewResult.taskReview')
      case AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE:
        return t('AIReviewResult.toolReview')
      case AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE:
        return t('AIReviewResult.appReview')
      case AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE:
        return t('AIReviewResult.userPrompt')
      default:
        return t('AIReviewResult.reviewDecision')
    }
  }, [i18n.language])

  const userAction = useCreation(() => {
    let btnText: string = ''
    let userInput: string = ''
    try {
      switch (info.type) {
        case AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE:
        case AIChatQSDataTypeEnum.TASK_REVIEW_REQUIRE:
        case AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE:
        case AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE:
          const userSelected = JSON.parse(info.data?.selected || '')
          if (info.data.optionValue === 'continue') {
            btnText = t('YakitButton.runNow')
          } else {
            const selectBtn = info.data.selectors.find((item) => item.value === info.data.optionValue)
            btnText = selectBtn ? selectBtn.prompt : t('AIReviewResult.unknownAction')
          }
          userInput = userSelected.extra_prompt || ''
          break
        case AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE:
          const aiSelected = JSON.parse(info.data.selected || '')
          const aiSelectType = info.data.options.find(
            (item) => (item.prompt || item.prompt_title) === info.data.optionValue,
          )
          btnText = aiSelectType?.prompt || aiSelectType?.prompt_title || t('AIReviewResult.unknownAction')
          userInput = aiSelected.suggestion || ''
          break
        default:
          break
      }
    } catch (error) {}

    return {
      btnText,
      userInput,
    }
  }, [i18n.language])
  const renderContent = useMemoizedFn(() => {
    let paramsValue = !!userAction.userInput ? <PreWrapper code={userAction.userInput} /> : null
    switch (info.type) {
      case 'tool_use_review_require':
        const { params } = info.data
        try {
          paramsValue = !!paramsValue ? paramsValue : <AIReviewParams params={params} isPreStyle={true} />
        } catch (error) {}
        break
      default:
        break
    }
    return paramsValue
  })
  const isShowExpandBtn = useCreation(() => {
    switch (info.type) {
      case 'tool_use_review_require':
        return true
      default:
        return !!userAction.userInput
    }
  }, [userAction.userInput])
  const modalInfo = useCreation(() => {
    return {
      title: info.AIModelName,
      time: info.Timestamp,
      icon: info.AIService,
    }
  }, [renderNum])
  return (
    <AISingHaveColorText
      title={title}
      subTitle={userAction.btnText}
      tip=""
      modalInfo={modalInfo}
      titleMore={
        isShowExpandBtn ? (
          <div className={styles['header-extra']}>
            <Tooltip title={expand ? '收起' : '展开'}>
              <YakitButton
                size="small"
                type="text2"
                onClick={() => {
                  setExpand((v) => !v)
                }}
                icon={expand ? <OutlineChevronsDownUpIcon /> : <OutlineChevronsUpDownIcon />}
              />
            </Tooltip>
          </div>
        ) : null
      }
    >
      {expand && renderContent()}
    </AISingHaveColorText>
  )
})

export const AIReviewParams: React.FC<AIReviewParamsProps> = React.memo((props) => {
  const { params, className, isPreStyle } = props
  const { t } = useI18nNamespaces(['yakitUi'])
  const [isScroll, setIsScroll] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useClickAway(() => {
    setIsScroll(false)
  }, containerRef)
  const onCopy = useMemoizedFn((value: string) => {
    setClipboardText(value, {
      hiddenHint: true,
      finalCallback: () => {
        setTimeout(() => {
          success(t('YakitNotification.copySuccess'))
        }, 200)
      },
    })
  })
  return (
    <div
      className={classNames(
        styles['ai-review-params-wrapper'],
        {
          [styles['ai-tool-param-pre-wrapper']]: !!isPreStyle,
        },
        className,
      )}
      style={{
        overflow: isScroll ? 'auto' : 'hidden',
      }}
      onClick={() => setIsScroll(true)}
      ref={containerRef}
    >
      {params && !isEmpty(params) ? (
        Object.entries(params || {}).map(([key, value]) => {
          const valueString = typeof value === 'string' ? value : JSON.stringify(value)
          return (
            <div key={key} className={styles['param-item']}>
              <div className={styles['param-key']}>{key}:</div>
              {!!valueString && (
                <div className={styles['param-value-wrapper']} onClick={() => onCopy(valueString)}>
                  <div className={styles['param-value']}>{valueString}</div>
                  <CopyComponents copyText={valueString} className={styles['copy-icon']} />
                </div>
              )}
            </div>
          )
        })
      ) : (
        <div className={styles['no-param']}>无参数</div>
      )}
    </div>
  )
})

export const AISingHaveColorText: React.FC<AISingHaveColorTextProps> = React.memo((props) => {
  const { title, subTitle, tip, titleIcon, modalInfo, children, ...reset } = props
  return (
    <ChatCard
      titleExtra={modalInfo && <ModalInfo {...modalInfo} />}
      titleText={
        <div className={styles['title-wrapper']}>
          <div className={styles['title-main']}>
            {titleIcon}
            <span className={styles['title']}>{title}</span>
            {subTitle && <div className={styles['mpb-color-text']}>{subTitle}</div>}
          </div>
          {tip && <div className={styles['title-extra']}>{tip}</div>}
        </div>
      }
      {...reset}
    >
      {children}
    </ChatCard>
  )
})
