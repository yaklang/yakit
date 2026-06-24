import React, { memo, useEffect, useState } from 'react'
import { AIChatSettingProps, FormItemSliderProps } from './type'
import { Form, Slider, Tooltip } from 'antd'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { useMemoizedFn } from 'ahooks'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { OutlineInformationcircleIcon } from '@/assets/icon/outline'
import cloneDeep from 'lodash/cloneDeep'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInputNumber } from '@/components/yakitUI/YakitInputNumber/YakitInputNumber'
import { AIAgentSettingDefault, AIReviewRuleOptions } from '../defaultConstant'
import { YakitRadioButtonsProps } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtonsType'
import useAIAgentStore from '../useContext/useStore'
import useAIAgentDispatcher from '../useContext/useDispatcher'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'

// import classNames from "classnames"
import styles from './AIChatSetting.module.scss'
import emiter from '@/utils/eventBus/eventBus'
import YakitCollapse from '@/components/yakitUI/YakitCollapse/YakitCollapse'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { RemoteAIAgentGV } from '@/enums/aiAgent'
import { yakitFailed } from '@/utils/notification'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
const { YakitPanel } = YakitCollapse
const ReviewPolicyOptions: YakitRadioButtonsProps['options'] = AIReviewRuleOptions.map((item) => ({
  value: item.value,
  label: item.value,
}))
const defaultActiveKey = ['permissionsAndSecurity', 'planningAndExecution', 'resourcesLimits']
const AIChatSetting: React.FC<AIChatSettingProps> = memo((props) => {
  const { setting } = useAIAgentStore()
  const { setSetting } = useAIAgentDispatcher()
  const [form] = Form.useForm()

  useEffect(() => {
    form && form.setFieldsValue({ ...(setting || {}) })
  }, [setting])

  const handleFormChange = useMemoizedFn((changedValues, value) => {
    if (!!changedValues.ReviewPolicy) {
      emiter.emit('onRefreshAIReviewRuleSelect', JSON.stringify({ reviewPolicy: changedValues.ReviewPolicy }))
    }
    if (changedValues.AIReviewRiskControlScore !== undefined) {
      emiter.emit(
        'onRefreshAIReviewRuleSelect',
        JSON.stringify({ AIReviewRiskControlScore: changedValues.AIReviewRiskControlScore }),
      )
    }
    setSetting && setSetting((old) => ({ ...old, ...changedValues }))
  })

  const handeReset = useMemoizedFn(() => {
    form && form.setFieldsValue(cloneDeep(AIAgentSettingDefault))
    setSetting && setSetting(cloneDeep(AIAgentSettingDefault))
  })

  // AI主动问用户问题相关逻辑
  const AllowPlanUserInteractValue = Form.useWatch('AllowPlanUserInteract', form)

  const [activeKey, setActiveKey] = useState<string[]>([...defaultActiveKey])
  const { t } = useI18nNamespaces(['yakitUi', 'aiAgent'])
  useEffect(() => {
    getRemoteValue(RemoteAIAgentGV.AISettingActiveKey).then((data) => {
      try {
        setActiveKey(data ? JSON.parse(data) : [...defaultActiveKey])
      } catch (error) {
        yakitFailed('AISettingActiveKey获取报错:' + error)
      }
    })
  }, [])
  const onSwitchCollapse = useMemoizedFn((key) => {
    setActiveKey(key)
    setRemoteValue(RemoteAIAgentGV.AISettingActiveKey, JSON.stringify(key))
  })
  const onReset = useMemoizedFn((restValue) => {
    const v = form.getFieldsValue()
    setSetting?.({
      ...v,
      ...restValue,
    })
  })
  return (
    <div className={styles['ai-chat-setting']}>
      <div className={styles['setting-header']}>
        <div className={styles['header-title']}>配置</div>
        <YakitButton type="text" colors="danger" onClick={handeReset}>
          重置
        </YakitButton>
      </div>

      <Form
        className={styles['setting-form']}
        form={form}
        size="small"
        colon={false}
        labelCol={{ span: 10 }}
        labelWrap={true}
        onValuesChange={handleFormChange}
      >
        <YakitCollapse
          activeKey={activeKey}
          onChange={(key) => onSwitchCollapse(key)}
          destroyInactivePanel={true}
          bordered={true}
        >
          <YakitPanel
            header={t('AIChatSetting.permissionsAndSecurity')}
            key="permissionsAndSecurity"
            extra={
              <YakitButton
                type="text"
                colors="danger"
                className={styles['btn-padding-right-0']}
                onClick={(e) => {
                  e.stopPropagation()
                  const restValue = {
                    DisallowRequireForUserPrompt: AIAgentSettingDefault.DisallowRequireForUserPrompt,
                    EnableSystemFileSystemOperator: AIAgentSettingDefault.EnableSystemFileSystemOperator,
                    DisableToolIntervalReview: AIAgentSettingDefault.DisableToolIntervalReview,
                    AIReviewRiskControlScore: AIAgentSettingDefault.AIReviewRiskControlScore,
                  }
                  onReset(restValue)
                }}
                size="small"
              >
                {t('YakitButton.reset')}
              </YakitButton>
            }
          >
            <Form.Item label="禁用人机交互" name="DisallowRequireForUserPrompt" valuePropName="checked">
              <YakitSwitch />
            </Form.Item>
            <Form.Item label="激活系统文件操作权限" name="EnableSystemFileSystemOperator" valuePropName="checked">
              <YakitSwitch />
            </Form.Item>
            <Form.Item
              label={
                <>
                  禁用工具运行时AI审查
                  <Tooltip
                    classNames={{ root: styles['form-info-icon-tooltip'] }}
                    title={'在工具运行时关掉AI审查，提升工具执行效率'}
                  >
                    <OutlineInformationcircleIcon className={styles['info-icon']} />
                  </Tooltip>
                </>
              }
              name="DisableToolIntervalReview"
              valuePropName="checked"
            >
              <YakitSwitch />
            </Form.Item>
            <Form.Item
              label={
                <>
                  风险阈值
                  <Tooltip
                    classNames={{ root: styles['form-info-icon-tooltip'] }}
                    title={'低于这个分数,AI 自动同意,如果高于这个分数,转成手动'}
                  >
                    <OutlineInformationcircleIcon className={styles['info-icon']} />
                  </Tooltip>
                </>
              }
              name="AIReviewRiskControlScore"
            >
              <FormItemSlider min={0} max={1} step={0.01} />
            </Form.Item>
          </YakitPanel>
          <YakitPanel
            header={t('AIChatSetting.planningAndExecution')}
            key="planningAndExecution"
            extra={
              <YakitButton
                type="text"
                colors="danger"
                className={styles['btn-padding-right-0']}
                onClick={(e) => {
                  e.stopPropagation()
                  const restValue = {
                    ReviewPolicy: AIAgentSettingDefault.ReviewPolicy,
                    AllowPlanUserInteract: AIAgentSettingDefault.AllowPlanUserInteract,
                    PlanUserInteractMaxCount: AIAgentSettingDefault.PlanUserInteractMaxCount,
                    ReActMaxIteration: AIAgentSettingDefault.ReActMaxIteration,
                    PlanExecTaskConcurrency: AIAgentSettingDefault.PlanExecTaskConcurrency,
                  }
                  onReset(restValue)
                }}
                size="small"
              >
                {t('YakitButton.reset')}
              </YakitButton>
            }
          >
            <Form.Item label="Review 规则" name="ReviewPolicy">
              <YakitRadioButtons buttonStyle="solid" size={'small'} options={ReviewPolicyOptions} />
            </Form.Item>
            <Form.Item label="允许plan阶段人机交互" name="AllowPlanUserInteract" valuePropName="checked">
              <YakitSwitch />
            </Form.Item>
            {AllowPlanUserInteractValue && (
              <Form.Item
                label={
                  <>
                    plan阶段人机交互次数
                    <Tooltip
                      classNames={{ root: styles['form-info-icon-tooltip'] }}
                      title={'在任务规划的时候，如果AI允许问用户问题，那么最多问几次'}
                    >
                      <OutlineInformationcircleIcon className={styles['info-icon']} />
                    </Tooltip>
                  </>
                }
                name="PlanUserInteractMaxCount"
              >
                <YakitInputNumber type="horizontal" size="small" min={0} max={20} />
              </Form.Item>
            )}
            <Form.Item label={<>ReAct 迭代轮数限制</>} name="ReActMaxIteration">
              <YakitInputNumber type="horizontal" size="small" min={0} max={100} />
            </Form.Item>
            <Form.Item
              label={
                <>
                  深度规划任务并发数
                  <Tooltip
                    classNames={{ root: styles['form-info-icon-tooltip'] }}
                    title={'控制深度搜索或复杂拆解任务时的并行处理能力'}
                  >
                    <OutlineInformationcircleIcon className={styles['info-icon']} />
                  </Tooltip>
                </>
              }
              name="PlanExecTaskConcurrency"
            >
              <YakitInputNumber type="horizontal" size="small" min={1} max={5} />
            </Form.Item>
          </YakitPanel>
          <YakitPanel
            header={t('AIChatSetting.automation')}
            key="automation"
            extra={
              <YakitButton
                type="text"
                colors="danger"
                className={styles['btn-padding-right-0']}
                onClick={(e) => {
                  e.stopPropagation()
                  const restValue = {
                    UseDefaultAIConfig: AIAgentSettingDefault.UseDefaultAIConfig,
                    EnableAISearchTool: AIAgentSettingDefault.EnableAISearchTool,
                    DisableToolUse: AIAgentSettingDefault.DisableToolUse,
                    AICallAutoRetry: AIAgentSettingDefault.AICallAutoRetry,
                    AITransactionRetry: AIAgentSettingDefault.AITransactionRetry,
                  }
                  onReset(restValue)
                }}
                size="small"
              >
                {t('YakitButton.reset')}
              </YakitButton>
            }
          >
            <Form.Item label="使用默认系统配置AI" name="UseDefaultAIConfig" valuePropName="checked">
              <YakitSwitch />
            </Form.Item>
            <Form.Item label="AI 搜索本地工具" name="EnableAISearchTool" valuePropName="checked">
              <YakitSwitch />
            </Form.Item>

            <Form.Item
              label={
                <>
                  禁用Tools
                  <Tooltip
                    classNames={{ root: styles['form-info-icon-tooltip'] }}
                    title={'禁用任何外部工具，这就是一个纯聊天机器了'}
                  >
                    <OutlineInformationcircleIcon className={styles['info-icon']} />
                  </Tooltip>
                </>
              }
              name="DisableToolUse"
              valuePropName="checked"
            >
              <YakitSwitch />
            </Form.Item>

            <Form.Item
              label={
                <>
                  AI对话重试次数
                  <Tooltip
                    classNames={{ root: styles['form-info-icon-tooltip'] }}
                    title={'如果远端AI不稳定（网络原因）的时候，某一次对话重试几次'}
                  >
                    <OutlineInformationcircleIcon className={styles['info-icon']} />
                  </Tooltip>
                </>
              }
              name="AICallAutoRetry"
            >
              <YakitInputNumber type="horizontal" size="small" min={0} max={100} />
            </Form.Item>
            <Form.Item
              label={
                <>
                  AI事务重试次数
                  <Tooltip
                    classNames={{ root: styles['form-info-icon-tooltip'] }}
                    title={'如果回答质量不高的时候，调大可以有效重试回答'}
                  >
                    <OutlineInformationcircleIcon className={styles['info-icon']} />
                  </Tooltip>
                </>
              }
              name="AITransactionRetry"
            >
              <YakitInputNumber type="horizontal" size="small" min={0} max={100} />
            </Form.Item>
          </YakitPanel>
          <YakitPanel
            header={t('AIChatSetting.resourcesLimits')}
            key="resourcesLimits"
            extra={
              <YakitButton
                type="text"
                colors="danger"
                className={styles['btn-padding-right-0']}
                onClick={(e) => {
                  e.stopPropagation()
                  const restValue = {
                    TimelineItemLimit: AIAgentSettingDefault.TimelineItemLimit,
                    TimelineContentSizeLimit: AIAgentSettingDefault.TimelineContentSizeLimit,
                    AICallTokenLimit: AIAgentSettingDefault.AICallTokenLimit,
                    UserInteractLimit: AIAgentSettingDefault.UserInteractLimit,
                  }
                  onReset(restValue)
                }}
                size="small"
              >
                {t('YakitButton.reset')}
              </YakitButton>
            }
          >
            <Form.Item label={<>时间线上下文限制</>} name="TimelineItemLimit">
              <YakitInputNumber type="horizontal" size="small" min={0} max={200} />
            </Form.Item>
            <Form.Item
              label={<>时间线上下文大小</>}
              name="TimelineContentSizeLimit"
              normalize={(value) => {
                const num = Number(value.replace(/\D/g, ''))
                if (isNaN(num)) return ''
                return `${num}`
              }}
            >
              <YakitInput suffix="KB" size="small" className={styles['input-kb-suffix']} />
            </Form.Item>
            <Form.Item
              label={
                <>
                  压力token阈值
                  <Tooltip
                    classNames={{ root: styles['form-info-icon-tooltip'] }}
                    title={'Token pressure limit, 当 AI 对话的 token 数量超过这个限制时，需要警告'}
                  >
                    <OutlineInformationcircleIcon className={styles['info-icon']} />
                  </Tooltip>
                </>
              }
              name="AICallTokenLimit"
              normalize={(value) => {
                const num = Number(value.replace(/\D/g, ''))
                if (isNaN(num)) return ''
                return `${num}`
              }}
              initialValue={40}
            >
              <YakitInput suffix="K" size="small" className={styles['input-kb-suffix']} />
            </Form.Item>
            <Form.Item
              label={
                <>
                  用户交互测试
                  <Tooltip
                    classNames={{ root: styles['form-info-icon-tooltip'] }}
                    title={'用户交互的最大次数限制,超过这个次数，AI 将不再被允许问用户问题'}
                  >
                    <OutlineInformationcircleIcon className={styles['info-icon']} />
                  </Tooltip>
                </>
              }
              name="UserInteractLimit"
            >
              <YakitInputNumber type="horizontal" size="small" min={0} max={200} />
            </Form.Item>
          </YakitPanel>
        </YakitCollapse>
      </Form>
    </div>
  )
})

export default AIChatSetting

export const FormItemSlider: React.FC<FormItemSliderProps> = React.memo((props) => {
  const { value, ...rest } = props

  return (
    <div className={styles['form-item-slider']}>
      <div className={styles['slider-body']}>
        <Slider
          tooltip={{
            open: false,
          }}
          value={value}
          {...rest}
        />
      </div>

      <div className={styles['slider-value']}>{value}</div>
    </div>
  )
})
