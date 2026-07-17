import React, { memo, useState, type FC } from 'react'
import { Tooltip } from 'antd'
import { Dropdown } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import {
  OutlineBoxesIcon,
  OutlineBrainCircuitIcon,
  OutlineChevrondownIcon,
  OutlineGrid2x2CheckIcon,
  OutlineGoal2Icon,
} from '@/assets/icon/outline'
import { SolidCheckIcon } from '@/assets/icon/solid'
import { useCreation, useDebounceFn, useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import styles from './AIRunModeSelect.module.scss'
import { YakitInputNumber } from '@/components/yakitUI/YakitInputNumber/YakitInputNumber'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import { AIExecutionStrategy, AIInputEventHotPatchTypeEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import useChatIPCDispatcher from '@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher'
import useChatIPCStore from '@/pages/ai-agent/useContext/ChatIPCContent/useStore'
import emiter from '@/utils/eventBus/eventBus'
import { OutlineViewGridIcon } from '@/components/yakChat/icon'

type ModeOptionKey = 'plan' | 'multiAgent' | 'goal'

const ModeOptionList: {
  key: ModeOptionKey
  label: string
  icon: FC
}[] = [
  {
    key: 'plan',
    label: 'Plan',
    icon: OutlineBrainCircuitIcon,
  },
  {
    key: 'multiAgent',
    label: 'Multi-Agent',
    icon: OutlineBoxesIcon,
  },
  {
    key: 'goal',
    label: 'Goal',
    icon: OutlineGoal2Icon,
  },
]

const AIRunModeSelect: React.FC = memo(() => {
  const { setting, activeChat } = useAIAgentStore()
  const { setSetting } = useAIAgentDispatcher()
  const { handleSendConfigHotpatch } = useChatIPCDispatcher()
  const { chatIPCData } = useChatIPCStore()
  const execute = useCreation(() => !!chatIPCData.execute, [chatIPCData.execute])

  const enablePlan = useCreation(() => {
    return !!setting?.EnablePlan
  }, [setting?.EnablePlan])
  const onSetPlan = useDebounceFn(
    useMemoizedFn((checked) => {
      if (execute) {
        // ai运行才能热更新 plan
        handleSendConfigHotpatch({
          hotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_EnablePlan,
          params: {
            EnablePlan: checked,
          },
        })
      }
      setSetting?.((v) => ({
        ...v,
        EnablePlan: checked,
      }))
      if (activeChat?.SessionID) {
        emiter.emit(
          'sessionData',
          JSON.stringify({
            type: 'updateSession',
            sessionId: activeChat.SessionID,
            updates: {
              StartParams: {
                ...(activeChat.StartParams || {}),
                EnablePlan: checked,
              },
            },
          }),
        )
      }
    }),
    { wait: 200, leading: true },
  ).run
  const enableMultiAgent = useCreation(
    () => !!setting?.Strategy?.EnableMultiAgent,
    [setting?.Strategy?.EnableMultiAgent],
  )
  const enableGoalMode = useCreation(() => !!setting?.Strategy?.EnableGoalMode, [setting?.Strategy?.EnableGoalMode])
  const goalMinIterations = useCreation(
    () => setting?.Strategy?.GoalMinIterations ?? 0,
    [setting?.Strategy?.GoalMinIterations],
  )
  const [modeVisible, setModeVisible] = useState<boolean>(false)
  const onSetStrategy = useDebounceFn(
    useMemoizedFn((next: AIExecutionStrategy) => {
      if (execute) return
      setSetting?.((v) => ({
        ...v,
        Strategy: { ...v.Strategy, ...next },
      }))
      if (activeChat?.SessionID) {
        emiter.emit(
          'sessionData',
          JSON.stringify({
            type: 'updateSession',
            sessionId: activeChat.SessionID,
            updates: {
              StartParams: {
                ...(activeChat.StartParams || {}),
                Strategy: { ...(activeChat.StartParams?.Strategy || {}), ...next },
              },
            },
          }),
        )
      }
      // 热加载扩展点：后端支持 Strategy 热更新后取消下方注释启用 hotpatch
      // handleSendConfigHotpatch({
      //   hotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_Strategy,
      //   params: { Strategy: { ...setting?.Strategy, ...next } },
      // })
    }),
    { wait: 200, leading: true },
  ).run

  const isModeSelected = useMemoizedFn((key: ModeOptionKey) => {
    switch (key) {
      case 'plan':
        return enablePlan
      case 'multiAgent':
        return enableMultiAgent
      case 'goal':
        return enableGoalMode
      default:
        return false
    }
  })

  const selectedModes = useCreation(() => {
    return ModeOptionList.filter((item) => {
      switch (item.key) {
        case 'plan':
          return enablePlan
        case 'multiAgent':
          return enableMultiAgent
        case 'goal':
          return enableGoalMode
        default:
          return false
      }
    })
  }, [enablePlan, enableMultiAgent, enableGoalMode])

  const triggerDisplay = useCreation(() => {
    const count = selectedModes.length
    if (count === 0) {
      return { Icon: OutlineViewGridIcon, label: '模式' }
    }
    if (count === 1) {
      return { Icon: selectedModes[0].icon, label: selectedModes[0].label }
    }
    return { Icon: OutlineGrid2x2CheckIcon, label: '多模式' }
  }, [selectedModes])

  const onToggleMode = useMemoizedFn((key: ModeOptionKey) => {
    // Plan 支持热更新，运行中可改；Multi-Agent / Goal 运行中不可改
    if (execute && key !== 'plan') return
    switch (key) {
      case 'plan':
        onSetPlan(!enablePlan)
        break
      case 'multiAgent':
        onSetStrategy({ EnableMultiAgent: !enableMultiAgent })
        break
      case 'goal':
        onSetStrategy({ EnableGoalMode: !enableGoalMode })
        break
      default:
        break
    }
  })

  const isModeLocked = useMemoizedFn((key: ModeOptionKey) => {
    return execute && key !== 'plan'
  })

  const TriggerIcon = triggerDisplay.Icon

  return (
    <Dropdown
      trigger={['click']}
      visible={modeVisible}
      onVisibleChange={setModeVisible}
      overlayClassName={styles['mode-dropdown']}
      overlay={
        <div className={styles['mode-menu']}>
          <div className={styles['mode-menu-hint']}>
            {execute ? 'AI 运行中，仅 Plan 可修改，Multi-Agent / Goal 暂不可改' : '请选择模式，可多选'}
          </div>
          <div className={styles['mode-list']}>
            {ModeOptionList.map((item) => {
              const Icon = item.icon
              const checked = isModeSelected(item.key)
              const locked = isModeLocked(item.key)
              return (
                <div
                  key={item.key}
                  className={classNames(styles['mode-option'], {
                    [styles['mode-option-disabled']]: locked,
                  })}
                  onClick={() => onToggleMode(item.key)}
                >
                  <div className={styles['mode-option-left']}>
                    <div className={styles['mode-option-icon']}>
                      <Icon />
                    </div>
                    <span className={styles['mode-option-label']}>{item.label}</span>
                  </div>
                  {checked ? (
                    <SolidCheckIcon className={styles['mode-option-check']} />
                  ) : (
                    <span className={styles['mode-option-check-placeholder']} />
                  )}
                </div>
              )
            })}
          </div>
          {enableGoalMode && (
            <>
              <div className={styles['mode-panel-divider']} />
              <div className={styles['mode-goal-iter']}>
                <span className={styles['mode-goal-iter-label']}>最小迭代次数</span>
                <Tooltip title="<=0 时由服务端使用默认值">
                  <div onClick={(e) => e.stopPropagation()}>
                    <YakitInputNumber
                      type="horizontal"
                      size="small"
                      min={0}
                      disabled={execute}
                      value={goalMinIterations}
                      onChange={(v) => onSetStrategy({ GoalMinIterations: (v as number) ?? 0 })}
                      className={styles['mode-goal-iter-input']}
                    />
                  </div>
                </Tooltip>
              </div>
            </>
          )}
        </div>
      }
    >
      <YakitButton
        type="outline2"
        radius="28px"
        isHover={modeVisible}
        icon={<TriggerIcon />}
        onClick={(e) => e.stopPropagation()}
        className={styles['mode-btn']}
      >
        <span className={styles['mode-btn-label']}>{triggerDisplay.label}</span>
        <OutlineChevrondownIcon className={styles['mode-btn-arrow']} />
      </YakitButton>
    </Dropdown>
  )
})

export default AIRunModeSelect
