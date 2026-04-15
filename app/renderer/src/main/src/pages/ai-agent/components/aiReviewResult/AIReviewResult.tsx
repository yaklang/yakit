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
import useChatIPCStore from '../../useContext/ChatIPCContent/useStore'
import { CopyComponents } from '@/components/yakitUI/YakitTag/YakitTag'
import { setClipboardText } from '@/utils/clipboard'
import { success } from '@/utils/notification'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { isEmpty } from 'lodash'
import classNames from 'classnames'

export const AIReviewResult: React.FC<AIReviewResultProps> = memo((props) => {
  const { info, timestamp } = props
  const { type, data } = info
  const { chatIPCData } = useChatIPCStore()

  const getChatType = useMemoizedFn(() => {
    return info.chatType
  })

  const [expand, setExpand] = useState<boolean>(true)

  const taskLength = useCreation(() => {
    return chatIPCData?.taskChat?.elements?.length
  }, [chatIPCData?.taskChat?.elements?.length])
  const casualLength = useCreation(() => {
    return chatIPCData?.casualChat?.elements?.length
  }, [chatIPCData?.casualChat?.elements?.length])

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
    switch (type) {
      case 'plan_review_require':
        return '计划审阅'
      case 'task_review_require':
        return '任务审阅'
      case 'tool_use_review_require':
        return '工具审阅'
      case 'exec_aiforge_review_require':
        return '智能应用审阅'
      case 'require_user_interactive':
        return '主动询问'
      default:
        return 'Review 决策'
    }
  }, [type])
  const userAction = useCreation(() => {
    let btnText: string = ''
    let userInput: string = ''
    try {
      switch (type) {
        case 'plan_review_require':
        case 'task_review_require':
        case 'tool_use_review_require':
        case 'exec_aiforge_review_require':
          const userSelected = JSON.parse(data.selected || '')
          if (data.optionValue === 'continue') {
            btnText = '立即执行'
          } else {
            const selectBtn = data.selectors.find((item) => item.value === data.optionValue)
            btnText = selectBtn ? selectBtn.prompt : '未知操作'
          }
          userInput = userSelected.extra_prompt || ''
          break
        case 'require_user_interactive':
          const aiSelected = JSON.parse(data.selected || '')
          const aiSelectType = data.options.find((item) => (item.prompt || item.prompt_title) === data.optionValue)
          btnText = aiSelectType?.prompt || aiSelectType?.prompt_title || '未知操作'
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
  }, [type, data])
  const renderContent = useMemoizedFn(() => {
    let paramsValue = !!userAction.userInput ? <PreWrapper code={userAction.userInput} /> : null
    switch (type) {
      case 'tool_use_review_require':
        const { params } = data
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
    switch (type) {
      case 'tool_use_review_require':
        return true
      default:
        return !!userAction.userInput
    }
  }, [type, userAction.userInput])
  return (
    <AISingHaveColorText
      // titleIcon={<SolidHandIcon />}
      title={title}
      subTitle={userAction.btnText}
      tip=""
      modalInfo={{
        title: info.AIModelName,
        time: timestamp,
        icon: info.AIService,
      }}
      titleMore={
        isShowExpandBtn ? (
          <div className={styles['header-extra']}>
            <Tooltip title={expand ? '收起' : '展开'}>
              <YakitButton
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
                  <CopyComponents copyText={valueString} />
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
