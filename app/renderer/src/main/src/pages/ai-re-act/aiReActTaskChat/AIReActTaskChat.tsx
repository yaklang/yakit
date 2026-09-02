import React, { useEffect, useRef, useState } from 'react'
import type {
  AIInputSettingFormProps,
  AIInputSettingPopoverProps,
  AIReActTaskChatLeftSideProps,
  AIReActTaskChatProps,
} from './AIReActTaskChatType'
import styles from './AIReActTaskChat.module.scss'
import { AIChatLeftSide } from '@/pages/ai-agent/chatTemplate/AIAgentChatTemplate'
import { useControllableValue, useCreation, useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { ChevrondownButton } from '../aiReActChat/AIReActComponent'
import { OutlineArrowscollapseIcon, OutlineArrowsexpandIcon, OutlineInformationcircleIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { type AIInputEvent, AIInputEventHotPatchTypeEnum } from '../hooks/grpcApi'
import { Form, Tooltip } from 'antd'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import emiter from '@/utils/eventBus/eventBus'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import useAIGlobalConfig from '../hooks/useAIGlobalConfig'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import has from 'lodash/has'
import { AITaskContent } from '../aiTaskContent/AITaskContent'
import { useCurrentStore } from '../hooks/useCurrentDataBySession'
import useCurrentSessionId from '../hooks/useCurrentSessionId'

const AIReActTaskChat: React.FC<AIReActTaskChatProps> = React.memo((props) => {
  const { setShowFreeChat, setTimeLine, onTaskTabsChange } = props

  const [leftExpand, setLeftExpand] = useState(true)
  const [expand, setExpand] = useState(false)
  const [hasTabs, setHasTabs] = useState(false)

  const onIsExpand = useMemoizedFn(() => {
    setLeftExpand(expand)
    setShowFreeChat(expand)
    setExpand((v) => !v)
  })

  useEffect(() => {
    setTimeLine(leftExpand)
  }, [leftExpand])

  const onTabsChange = useMemoizedFn((tabsLength: number) => {
    const next = tabsLength > 0
    setHasTabs(next)
    onTaskTabsChange?.(next)
  })

  // 无 tab：任务规划宽度强制为 0（覆盖 secondMinSize 默认 100px）；有 tab：时间线 30% + 规划区
  const firstNodeStyle = useCreation(() => {
    if (!hasTabs) {
      return {
        width: '100%',
        overflow: 'hidden',
        maxWidth: leftExpand ? '' : '30px',
        borderRight: leftExpand ? 'none' : '1px solid var(--Colors-Use-Neutral-Border)',
      }
    }
    return {
      width: leftExpand ? '30%' : undefined,
      overflow: 'hidden',
      maxWidth: leftExpand ? '' : '30px',
      borderRight: leftExpand ? 'none' : '1px solid var(--Colors-Use-Neutral-Border)',
    }
  }, [hasTabs, leftExpand])

  const secondNodeStyle = useCreation(() => {
    if (!hasTabs) {
      return {
        width: 0,
        minWidth: 0,
        maxWidth: 0,
        padding: 0,
        overflow: 'hidden' as const,
        flex: 'none',
      }
    }
    return {
      width: leftExpand ? '100%' : 'calc(100% - 30px)',
      padding: 0,
      overflow: 'auto hidden' as const,
    }
  }, [hasTabs, leftExpand])

  return (
    <div className={styles['ai-re-act-task-chat']}>
      <YakitResizeBox
        firstRatio={hasTabs ? '30%' : '100%'}
        secondRatio={hasTabs ? undefined : '0%'}
        lineDirection="right"
        firstMinSize={leftExpand ? (hasTabs ? 300 : 280) : 30}
        secondMinSize={hasTabs ? 100 : 0}
        lineStyle={{ width: hasTabs && leftExpand ? 4 : 0 }}
        freeze={hasTabs && leftExpand}
        isRecalculateWH={false && hasTabs}
        firstNodeStyle={firstNodeStyle}
        secondNodeStyle={secondNodeStyle}
        firstNode={<AIReActTaskChatLeftSide leftExpand={leftExpand} setLeftExpand={setLeftExpand} />}
        secondNode={
          <AITaskContent
            onTabsChange={onTabsChange}
            tabBarExtraContent={
              <YakitButton
                type="text2"
                icon={expand ? <OutlineArrowscollapseIcon /> : <OutlineArrowsexpandIcon />}
                onClick={onIsExpand}
              />
            }
          />
        }
      />
    </div>
  )
})

export default AIReActTaskChat

export const AIInputSettingPopover: React.FC<AIInputSettingPopoverProps> = React.memo((props) => {
  const { children } = props
  const { t } = useI18nNamespaces(['aiAgent'])

  const { onSend, setSetting } = useAIAgentDispatcher()

  const sessionId = useCurrentSessionId()
  const store = useCurrentStore()

  const { setting, activeChat } = useAIAgentStore()
  const [aiGlobalConfigData, aiGlobalConfigEvent] = useAIGlobalConfig()
  const aiGlobalConfig = aiGlobalConfigData.aiGlobalConfig

  const [visible, setVisible] = useControllableValue<boolean>(props, {
    defaultValue: false,
    valuePropName: 'visible',
    trigger: 'setVisible',
  })
  const [form] = Form.useForm<AIInputSettingFormProps>()

  // 缓存弹窗打开时的文本域初始值，用于关闭时比较是否修改
  const promptSnapshotRef = useRef<{ AIPresetPrompt: string; AIPlanPrompt: string }>({
    AIPresetPrompt: '',
    AIPlanPrompt: '',
  })

  const onHotSyncPerceptionTrigger = useMemoizedFn((value: boolean) => {
    if (store.getState().execute) {
      const info: AIInputEvent = {
        IsConfigHotpatch: true,
        HotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_SyncPerceptionTrigger,
        Params: {
          SyncPerceptionTrigger: value,
        },
      }
      onSend({ token: sessionId, type: 'casual', params: info })
    }
    if (activeChat?.SessionID) {
      emiter.emit(
        'sessionData',
        JSON.stringify({
          type: 'updateSession',
          sessionId: activeChat.SessionID,
          updates: {
            StartParams: {
              ...(activeChat.StartParams || {}),
              SyncPerceptionTrigger: value,
            },
          },
        }),
      )
    }
  })
  const onValuesChange = useMemoizedFn((changedValues: AIInputSettingFormProps) => {
    if (has(changedValues, 'SyncPerceptionTrigger')) {
      onHotSyncPerceptionTrigger(!!changedValues.SyncPerceptionTrigger)
      setSetting?.((v) => ({
        ...v,
        SyncPerceptionTrigger: !!changedValues.SyncPerceptionTrigger,
      }))
    }
  })

  // 打开弹窗时记录当前文本域快照，关闭时若有改动才保存
  const onVisibleChange = useMemoizedFn((v: boolean) => {
    if (v) {
      promptSnapshotRef.current = {
        AIPresetPrompt: aiGlobalConfig.AIPresetPrompt || '',
        AIPlanPrompt: aiGlobalConfig.AIPlanPrompt || '',
      }
      form.setFieldsValue({
        AIPresetPrompt: aiGlobalConfig.AIPresetPrompt || '',
        AIPlanPrompt: aiGlobalConfig.AIPlanPrompt || '',
      })
    } else {
      const values = form.getFieldsValue(['AIPresetPrompt', 'AIPlanPrompt'])
      const presetChanged = (values.AIPresetPrompt ?? '') !== promptSnapshotRef.current.AIPresetPrompt
      const planChanged = (values.AIPlanPrompt ?? '') !== promptSnapshotRef.current.AIPlanPrompt
      // 仅在内容有修改时才保存，避免无效请求
      if (presetChanged || planChanged) {
        aiGlobalConfigEvent.setAIGlobalConfig({
          ...(presetChanged ? { AIPresetPrompt: values.AIPresetPrompt ?? '' } : {}),
          ...(planChanged ? { AIPlanPrompt: values.AIPlanPrompt ?? '' } : {}),
        })
      }
    }
    setVisible(v)
  })

  return (
    <YakitPopover
      open={visible}
      content={
        <Form
          form={form}
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
          onValuesChange={onValuesChange}
          initialValues={{
            SyncPerceptionTrigger: setting.SyncPerceptionTrigger,
            EnablePlan: setting.EnablePlan,
            AIPresetPrompt: aiGlobalConfig.AIPresetPrompt || '',
            AIPlanPrompt: aiGlobalConfig.AIPlanPrompt || '',
          }}
          className={styles['ai-input-setting-form']}
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          <Form.Item
            label={
              <>
                同步意图识别
                <Tooltip
                  classNames={{ root: styles['form-info-icon-tooltip'] }}
                  title={'开启后回答精度更高，但速度会变慢'}
                >
                  <OutlineInformationcircleIcon className={styles['info-icon']} />
                </Tooltip>
              </>
            }
            name="SyncPerceptionTrigger"
            valuePropName="checked"
          >
            <YakitSwitch />
          </Form.Item>
          <Form.Item label={t('AIReActTaskChatContent.globalDirective')} name="AIPresetPrompt">
            <YakitInput.TextArea
              rows={2}
              isShowResize={false}
              placeholder={t('AIReActTaskChatContent.globalDirectiveDefault')}
              maxLength={500}
            />
          </Form.Item>
          <Form.Item label={t('AIReActTaskChatContent.planPrompt')} name="AIPlanPrompt">
            <YakitInput.TextArea
              rows={2}
              isShowResize={false}
              placeholder={t('AIReActTaskChatContent.planPromptPlaceholder')}
              maxLength={2000}
            />
          </Form.Item>
        </Form>
      }
      onOpenChange={onVisibleChange}
      trigger={'click'}
      destroyOnHidden={true}
    >
      {children}
    </YakitPopover>
  )
})

export const AIReActTaskChatLeftSide: React.FC<AIReActTaskChatLeftSideProps> = React.memo((props) => {
  const [leftExpand, setLeftExpand] = useControllableValue(props, {
    defaultValue: true,
    valuePropName: 'leftExpand',
    trigger: 'setLeftExpand',
  })

  return (
    <div
      className={classNames(styles['content-left-side'], {
        [styles['content-left-side-hidden']]: !leftExpand,
      })}
    >
      <AIChatLeftSide expand={leftExpand} setExpand={setLeftExpand} />
      <div className={styles['open-wrapper']} onClick={() => setLeftExpand(true)}>
        <ChevrondownButton />
        <div className={styles['text']}>任务列表</div>
      </div>
    </div>
  )
})
