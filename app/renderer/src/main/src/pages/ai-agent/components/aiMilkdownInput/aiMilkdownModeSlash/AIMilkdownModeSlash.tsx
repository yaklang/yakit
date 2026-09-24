import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { slashFactory, SlashProvider } from '@milkdown/kit/plugin/slash'
import { useInstance } from '@milkdown/react'
import { usePluginViewContext } from '@prosemirror-adapter/react'
import { useCreation, useClickAway, useDebounceEffect, useKeyPress, useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import type { Ctx } from '@milkdown/kit/ctx'
import { Tooltip } from 'antd'
import {
  BoxesOutlined,
  BrainCircuitOutlined,
  CheckOutlined,
  ChevronLeftOutlined,
  XOutlined,
  Goal2Outlined,
  SparklesOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { YakitInputNumber } from '@/components/yakitUI/YakitInputNumber/YakitInputNumber'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { useAIRunMode } from '@/pages/ai-agent/aiRunModeSelect/useAIRunMode'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './AIMilkdownModeSlash.module.scss'
import {
  setModeSlashReopenHandler,
  goalDurationKeyToSeconds,
  GOAL_DURATION_PRESETS,
  isGoalDurationPresetKey,
  type ModeSlashReopenPayload,
} from './store'
import { PANEL_GAP, PANEL_OFFSET_UP, PANEL_WIDTH_EXTRA_EACH } from '../constants'
import { tryClaimMilkdownPopup, releaseMilkdownPopup } from '../panelMutex'

export const aiModeSlashFactory = slashFactory('ai-mode-slash-commands')

const MODE_SLASH_QUERY_REG = /\/([^\s]*)$/
const MODE_SLASH_TRIGGER = '/'
type SlashStep = 'root' | 'goalModes' | 'multiAgentConfig' | 'goalIterations' | 'goalAcceptance' | 'goalDuration'

type GoalModeKey = 'iterations' | 'acceptance' | 'duration'

/** 最小迭代次数草稿：Strategy 未配置时为 0，面板里不得展示 0 */
const normalizeGoalIterations = (n?: number) => Math.max(1, Number(n) || 1)

const ROOT_OPTIONS = [
  { key: 'plan' as const, labelKey: 'AIMilkdownModeSlash.plan', icon: BrainCircuitOutlined },
  { key: 'multiAgent' as const, labelKey: 'AIMilkdownModeSlash.multiAgent', icon: BoxesOutlined },
  { key: 'goal' as const, labelKey: 'AIMilkdownModeSlash.goal', icon: Goal2Outlined },
]

const GOAL_MODE_OPTIONS: { key: GoalModeKey; labelKey: string }[] = [
  { key: 'iterations', labelKey: 'AIMilkdownModeSlash.minIterations' },
  { key: 'acceptance', labelKey: 'AIMilkdownModeSlash.acceptanceOption' },
  { key: 'duration', labelKey: 'AIMilkdownModeSlash.durationOption' },
]

/**
 * 输入 `/`：Plan 直接生效；Goal 进二级目标模式；Multi-Agent 配置子 Agent 数量。
 * 弹层宽高定位与 @ 一致。
 */
export const AIMilkdownModeSlash: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null)
  const slashProvider = useRef<SlashProvider>()
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState<SlashStep>('root')
  /** 从标签点编辑打开时为 true：返回应回到 / 上级菜单并保活，而不是直接关面板 */
  const reopenSessionRef = useRef(false)
  const [draftIterations, setDraftIterations] = useState(1)
  const [draftSubAgents, setDraftSubAgents] = useState(0)
  const [draftAcceptance, setDraftAcceptance] = useState('')
  const [draftDuration, setDraftDuration] = useState<string>('1h')
  const [activeIndex, setActiveIndex] = useState(0)
  /** `/` 后继续输入的筛选词，与 @ 的 filterKeyword 一致 */
  const [slashQuery, setSlashQuery] = useState('')
  /** 标签点击重开时，忽略同一次点击触发的 clickAway */
  const ignoreClickAwayUntilRef = useRef(0)
  const acceptanceTextAreaRef = useRef<any>(null)

  const { view, prevState } = usePluginViewContext()
  const [loading, get] = useInstance()
  const { t, i18nRefresh } = useI18nNamespaces(['aiAgent'])
  const { goalMinIterations, maxSubAgents, onToggleMode, onSetStrategy, isModeSelected } = useAIRunMode()

  const action = useMemoizedFn((fn: (ctx: Ctx) => void) => {
    if (loading) return
    get().action(fn)
  })

  useKeyPress(
    'esc',
    (e) => {
      if (!visible) return
      e.stopPropagation()
      e.preventDefault()
      // 配置持续时长 / 验收条件等时 Esc 直接关闭，不返回上一步
      onHide()
    },
    // document：焦点在面板输入框时也能收到（textarea stopPropagation 不影响 capture）
    { target: () => document, exactMatch: true, useCapture: true },
  )
  /** ↑↓/Enter：与 Escape / @ mention 相同，挂在 view.dom + useCapture，避免 ProseMirror 吞键 */
  const filteredRootOptions = useCreation(() => {
    const q = slashQuery.trim().toLowerCase()
    if (!q) return ROOT_OPTIONS
    return ROOT_OPTIONS.filter((item) => {
      const label = String(t(item.labelKey)).toLowerCase()
      return label.includes(q) || item.key.toLowerCase().includes(q)
    })
  }, [slashQuery, i18nRefresh])

  const navigableItems = useCreation(() => {
    if (!visible) return [] as { key: string }[]
    if (step === 'root') return filteredRootOptions.map((i) => ({ key: i.key }))
    if (step === 'goalModes') return GOAL_MODE_OPTIONS.map((i) => ({ key: i.key }))
    return [] as { key: string }[]
  }, [visible, step, filteredRootOptions])

  useEffect(() => {
    setActiveIndex(0)
  }, [step, visible, slashQuery])

  const moveActive = useMemoizedFn((delta: number) => {
    if (!navigableItems.length) return
    setActiveIndex((prev) => {
      const next = prev + delta
      if (next < 0) return navigableItems.length - 1
      if (next >= navigableItems.length) return 0
      return next
    })
  })

  const onConfirmActive = useMemoizedFn(() => {
    if (!visible) return
    if (step === 'root') {
      const item = filteredRootOptions[activeIndex]
      if (item) onPickRoot(item.key)
      return
    }
    if (step === 'goalModes') {
      const item = GOAL_MODE_OPTIONS[activeIndex]
      if (item) onPickGoalMode(item.key)
      return
    }
    if (step === 'multiAgentConfig') {
      onConfirmMultiAgent()
      return
    }
    if (step === 'goalIterations') {
      onConfirmGoalIterations()
      return
    }
    if (step === 'goalAcceptance') {
      onConfirmAcceptance()
      return
    }
    if (step === 'goalDuration') {
      onConfirmDuration()
    }
  })

  useKeyPress(
    'uparrow',
    (e) => {
      if (!visible) return
      e.stopPropagation()
      e.preventDefault()
      if (navigableItems.length) moveActive(-1)
    },
    { target: () => view.dom, exactMatch: true, useCapture: true },
  )

  useKeyPress(
    'downarrow',
    (e) => {
      if (!visible) return
      e.stopPropagation()
      e.preventDefault()
      if (navigableItems.length) moveActive(1)
    },
    { target: () => view.dom, exactMatch: true, useCapture: true },
  )

  useKeyPress(
    'enter',
    (e) => {
      if (!visible) return
      const canConfirmList = navigableItems.length > 0
      const canConfirmConfig =
        step === 'multiAgentConfig' || step === 'goalIterations' || step === 'goalDuration' || step === 'goalAcceptance'
      if (!canConfirmList && !canConfirmConfig) return
      e.stopPropagation()
      e.preventDefault()
      // 与确认 icon 相同：配置步（含验收条件）回车即确认
      onConfirmActive()
    },
    { target: () => document, exactMatch: true, useCapture: true },
  )

  useClickAway(
    (e) => {
      // 二级切换会卸载被点击的列表项，target 脱离 DOM 后 contains 恒为 false，会被误判为点击外部
      if (!e.target || !(e.target as Node).isConnected) return
      if ((e.target as HTMLElement).closest?.('.ant-select-dropdown')) return
      if (Date.now() < ignoreClickAwayUntilRef.current) return
      if (visible) onHide()
    },
    [ref, () => view.dom],
  )

  /** 强制保持弹层可见（二级步骤不再依赖编辑器里的 /） */
  const keepPanelOpen = useMemoizedFn(() => {
    const el = ref.current
    if (el) el.dataset.show = 'true'
    slashProvider.current?.show()
    requestAnimationFrame(() => syncPosition())
  })

  // 进入验收条件等步骤时按 step 重新贴边（验收贴顶 gap=0）
  useEffect(() => {
    if (!visible) return
    requestAnimationFrame(() => syncPosition())
  }, [step, visible])

  useEffect(() => {
    const div = ref.current
    if (loading || !div) return
    slashProvider.current = new SlashProvider({
      content: div,
      trigger: MODE_SLASH_TRIGGER,
    })
  }, [loading])

  useEffect(() => {
    return () => {
      slashProvider.current?.destroy()
    }
  }, [])

  // 进入二级后持续顶住 data-show，避免 SlashProvider 因失焦自动藏面板
  useEffect(() => {
    if (!visible || step === 'root') return
    keepPanelOpen()
  }, [visible, step])

  const focusAcceptanceInput = useMemoizedFn(() => {
    type TextAreaLike = {
      focus?: () => void
      resizableTextArea?: { textArea?: HTMLTextAreaElement }
    }
    const refEl = acceptanceTextAreaRef.current as unknown as HTMLTextAreaElement | TextAreaLike | null

    let el: HTMLTextAreaElement | null = null
    if (refEl instanceof HTMLTextAreaElement) {
      el = refEl
    } else if (refEl && typeof refEl === 'object') {
      el = refEl.resizableTextArea?.textArea ?? null
      if (!el && typeof refEl.focus === 'function') {
        try {
          view?.dom?.blur?.()
        } catch (_) {}
        refEl.focus()
      }
    }
    if (!el) {
      el =
        (document.querySelector(`.${styles['acceptance-input']} textarea`) as HTMLTextAreaElement | null) ||
        (document.querySelector(`.${styles['acceptance-box']} textarea`) as HTMLTextAreaElement | null)
    }
    if (!el) return false

    // 主编辑器若仍持焦，按键会进输入框而不是验收条件
    try {
      view?.dom?.blur?.()
    } catch (_) {}
    el.focus()
    const len = el.value?.length ?? 0
    try {
      el.setSelectionRange(len, len)
    } catch (_) {}
    return document.activeElement === el
  })

  useEffect(() => {
    if (!visible || step !== 'goalAcceptance') return
    let cancelled = false
    const timers = [0, 50, 120, 240].map((ms) =>
      window.setTimeout(() => {
        if (cancelled) return
        if (!focusAcceptanceInput()) {
          // 再试一帧，等 TextArea 挂载
          requestAnimationFrame(() => {
            if (!cancelled) focusAcceptanceInput()
          })
        }
      }, ms),
    )
    return () => {
      cancelled = true
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [visible, step])

  // tag click -> reopen goal / multi-agent config panel
  useEffect(() => {
    const handler = (payload: ModeSlashReopenPayload) => {
      ignoreClickAwayUntilRef.current = Date.now() + 300
      const openStep = (stepName: SlashStep) => {
        reopenSessionRef.current = true
        setStep(stepName)
        if (!tryClaimMilkdownPopup('modeSlash')) return
        setVisible(true)
        // 等 React 提交 DOM 再 show/定位，避免与标签同一点击事件里被关掉或定位失败
        requestAnimationFrame(() => {
          keepPanelOpen()
          requestAnimationFrame(() => keepPanelOpen())
        })
      }
      if (payload.kind === 'goalModes') {
        openStep('goalModes')
        return
      }
      if (payload.kind === 'goalDuration') {
        setDraftDuration(
          payload.durationKey && isGoalDurationPresetKey(payload.durationKey) ? payload.durationKey : '1h',
        )
        openStep('goalDuration')
        return
      }
      if (payload.kind === 'goalIterations') {
        setDraftIterations(normalizeGoalIterations(payload.iterations ?? goalMinIterations))
        openStep('goalIterations')
        return
      }
      if (payload.kind === 'goalAcceptance') {
        setDraftAcceptance(payload.text || '')
        openStep('goalAcceptance')
        // 标签点击后编辑器仍可能持焦，延迟抢回验收输入框
        window.setTimeout(() => focusAcceptanceInput(), 0)
        window.setTimeout(() => focusAcceptanceInput(), 80)
        window.setTimeout(() => focusAcceptanceInput(), 200)
        return
      }
      setDraftSubAgents(payload.subAgents ?? maxSubAgents)
      openStep('multiAgentConfig')
    }
    setModeSlashReopenHandler(handler)
    return () => setModeSlashReopenHandler(null)
  }, [maxSubAgents, goalMinIterations])

  const getInputAnchor = useMemoizedFn((): HTMLElement | null => {
    // CSS Modules 会把 ai-chat-textarea 哈希掉，不能写死 class 名；用 data 锚到整张输入卡片（含标签行）
    return (
      (view.dom.closest('[data-ai-input-card]') as HTMLElement | null) ||
      (view.dom.closest('[class*="ai-chat-textarea"]') as HTMLElement | null) ||
      (view.dom.closest('[class*="ai-milkdown-input"]') as HTMLElement | null) ||
      (view.dom.parentElement as HTMLElement | null)
    )
  })

  const syncPosition = useMemoizedFn(() => {
    const el = ref.current
    const anchor = getInputAnchor()
    if (!el || !anchor) return
    const box = anchor.getBoundingClientRect()
    const isAcceptance = step === 'goalAcceptance'
    const gap = isAcceptance ? 0 : PANEL_GAP + PANEL_OFFSET_UP
    const widthExtra = isAcceptance ? 0 : PANEL_WIDTH_EXTRA_EACH * 2
    const sideExtra = isAcceptance ? 0 : PANEL_WIDTH_EXTRA_EACH
    el.style.width = `${box.width + widthExtra}px`
    el.style.maxHeight = `${Math.max(180, box.top - gap * 2)}px`
    el.style.left = `${box.left - sideExtra}px`
    el.style.right = 'auto'
    el.style.position = 'fixed'
    el.style.top = 'auto'
    el.style.transform = 'none'
    el.style.bottom = `${window.innerHeight - box.top + gap}px`
  })

  // 标签行出现/消失会抬高输入卡片，弹层打开时跟着重算，避免挡住
  useEffect(() => {
    if (!visible) return
    const el = ref.current
    const anchor = getInputAnchor()
    if (!el || !anchor) return

    const reassert = () => {
      // Milkdown SlashProvider 用 floating-ui 按光标写 top，会盖掉贴卡片顶的定位；这里持续压回去
      requestAnimationFrame(() => syncPosition())
    }

    const ro = new ResizeObserver(reassert)
    ro.observe(anchor)

    const mo = new MutationObserver(() => {
      if (el.style.top && el.style.top !== 'auto') reassert()
    })
    mo.observe(el, { attributes: true, attributeFilter: ['style'] })

    window.addEventListener('resize', syncPosition)
    // 立刻一次，并在 floating-ui 默认 debounce(200) 之后再压一次
    syncPosition()
    const t1 = window.setTimeout(reassert, 0)
    const t2 = window.setTimeout(reassert, 220)

    return () => {
      ro.disconnect()
      mo.disconnect()
      window.removeEventListener('resize', syncPosition)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [visible])

  const deleteSlashTrigger = useMemoizedFn(() => {
    const { state, dispatch } = view
    const { from } = state.selection
    const textBefore = state.doc.textBetween(Math.max(0, from - 64), from, undefined, '\uFFFC')
    const match = textBefore.match(MODE_SLASH_QUERY_REG)
    if (!match) return
    dispatch(state.tr.deleteRange(from - match[0].length, from).scrollIntoView())
  })

  const resetDraft = useMemoizedFn(() => {
    setSlashQuery('')
    setStep('root')
    setDraftIterations(normalizeGoalIterations(goalMinIterations))
    setDraftSubAgents(maxSubAgents)
    setDraftAcceptance('')
    setDraftDuration('1h')
  })

  const onHide = useMemoizedFn(() => {
    reopenSessionRef.current = false
    releaseMilkdownPopup('modeSlash')
    if (!visible && slashProvider.current?.element?.dataset?.show === 'false') return
    deleteSlashTrigger()
    setVisible(false)
    resetDraft()
    view.focus()
    slashProvider.current?.hide()
  })

  const finishAndClose = useMemoizedFn(() => {
    releaseMilkdownPopup('modeSlash')
    reopenSessionRef.current = false
    setVisible(false)
    resetDraft()
    view.focus()
    slashProvider.current?.hide()
  })

  const goBackFromConfig = useMemoizedFn((fallback: SlashStep) => {
    setStep(fallback)
    // 标签编辑进入时编辑器里没有 /，必须手动保活，否则 debounce 会把面板关掉
    keepPanelOpen()
  })

  const onPickRoot = useMemoizedFn((key: 'plan' | 'multiAgent' | 'goal') => {
    // 标签编辑会话不要在这里清 reopenSessionRef，否则 root→子配置→再返回 root 会被 debounce 关掉
    if (key === 'plan') {
      if (!isModeSelected('plan')) onToggleMode('plan')
      deleteSlashTrigger()
      finishAndClose()
      return
    }
    if (key === 'multiAgent') {
      // 一选中 Multi-Agent 即开启模式；数量可稍后配置，Esc 会留下占位「设置子 Agent 数量」
      onSetStrategy({ EnableMultiAgent: true })
      setDraftSubAgents(maxSubAgents)
      setStep('multiAgentConfig')
      keepPanelOpen()
      return
    }
    // 一选中 Goal 即开启模式；具体目标可稍后配置，Esc 会留下占位「设置目标」
    onSetStrategy({ EnableGoalMode: true })
    setStep('goalModes')
    keepPanelOpen()
  })

  const onPickGoalMode = useMemoizedFn((key: GoalModeKey) => {
    if (key === 'iterations') {
      setDraftIterations(normalizeGoalIterations(goalMinIterations))
      setStep('goalIterations')
      keepPanelOpen()
      return
    }
    if (key === 'acceptance') {
      setDraftAcceptance('')
      setStep('goalAcceptance')
      keepPanelOpen()
      return
    }
    setDraftDuration('1h')
    setStep('goalDuration')
    keepPanelOpen()
  })

  const onConfirmMultiAgent = useMemoizedFn(() => {
    onSetStrategy({ EnableMultiAgent: true, MaxSubAgents: draftSubAgents })
    deleteSlashTrigger()
    finishAndClose()
  })

  const onConfirmGoalIterations = useMemoizedFn(() => {
    // Goal 三选一：最小迭代生效，清掉时间窗与验收条件
    onSetStrategy({
      EnableGoalMode: true,
      GoalMinIterations: Math.max(1, Number(draftIterations) || 1),
      GoalDurationSeconds: 0,
      GoalAcceptanceCriteria: '',
    })
    deleteSlashTrigger()
    finishAndClose()
  })

  const onConfirmAcceptance = useMemoizedFn(() => {
    const text = draftAcceptance.trim()
    if (!text) return
    // Goal 三选一：验收条件生效，清掉迭代次数与时间窗
    onSetStrategy({
      EnableGoalMode: true,
      GoalMinIterations: 0,
      GoalDurationSeconds: 0,
      GoalAcceptanceCriteria: text,
    })
    deleteSlashTrigger()
    finishAndClose()
  })

  const onConfirmDuration = useMemoizedFn(() => {
    // Goal 三选一：时间窗生效，清掉迭代次数与验收条件
    onSetStrategy({
      EnableGoalMode: true,
      GoalMinIterations: 0,
      GoalDurationSeconds: goalDurationKeyToSeconds(draftDuration),
      GoalAcceptanceCriteria: '',
    })
    deleteSlashTrigger()
    finishAndClose()
  })

  useDebounceEffect(
    () => {
      if (loading || !slashProvider.current || !ref.current) return
      // 二级步骤由面板自己维持，不因编辑器失焦 / 丢失而关
      if (step !== 'root') {
        keepPanelOpen()
        return
      }
      const content = slashProvider.current.getContent(view)
      const match = content?.match(MODE_SLASH_QUERY_REG)
      if (!match) {
        // 从标签点编辑打开的会话：无 / 也保持面板（返回上一级根/Goal 菜单）
        if (reopenSessionRef.current && visible) {
          keepPanelOpen()
          return
        }
        setSlashQuery('')
        setVisible(false)
        resetDraft()
        slashProvider.current.hide()
        releaseMilkdownPopup('modeSlash')
        return
      }
      const query = match[1] || ''
      // 若 @ mention 已占有，/ 只作为 mention 筛选，不抢开 ModeSlash
      if (!tryClaimMilkdownPopup('modeSlash')) {
        setSlashQuery('')
        setVisible(false)
        slashProvider.current.hide()
        return
      }
      setSlashQuery(query)
      setVisible(true)
      keepPanelOpen()
    },
    [loading, view, prevState, step],
    { wait: 200, leading: true },
  )

  const renderRoot = () => (
    <div
      className={styles['slash-panel']}
      onMouseDown={(e) => {
        const el = e.target as HTMLElement
        if (el.closest('textarea, input, [contenteditable="true"]')) return
        e.preventDefault()
      }}
    >
      <div className={styles['slash-hint']}>{t('AIMilkdownModeSlash.selectMode')}</div>
      <div className={styles['slash-list']}>
        {filteredRootOptions.map((item, index) => {
          const Icon = item.icon
          return (
            <div
              key={item.key}
              className={classNames(styles['slash-item'], {
                [styles['slash-item-active']]: index === activeIndex,
              })}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => onPickRoot(item.key)}
            >
              <span className={styles['slash-item-icon']}>
                <Icon color="currentColor" />
              </span>
              <span className={styles['slash-item-label']}>{t(item.labelKey)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderGoalModes = () => (
    <div
      className={styles['slash-panel']}
      onMouseDown={(e) => {
        const el = e.target as HTMLElement
        if (el.closest('textarea, input, [contenteditable="true"]')) return
        e.preventDefault()
      }}
    >
      <div className={styles['slash-hint-row']}>
        <button
          type="button"
          className={styles['config-icon-btn']}
          onClick={() => goBackFromConfig('root')}
          aria-label="back"
        >
          <ChevronLeftOutlined color="currentColor" />
        </button>
        <div className={styles['slash-hint']}>{t('AIMilkdownModeSlash.selectGoalMode')}</div>
      </div>
      <div className={styles['slash-list']}>
        {GOAL_MODE_OPTIONS.map((item, index) => (
          <div
            key={item.key}
            className={classNames(styles['slash-item'], {
              [styles['slash-item-active']]: index === activeIndex,
            })}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => onPickGoalMode(item.key)}
          >
            <span className={styles['slash-item-label']}>{t(item.labelKey)}</span>
          </div>
        ))}
      </div>
    </div>
  )

  const renderNumberConfig = (opts: {
    title: string
    tip: string
    value: number
    min?: number
    max?: number
    onChange: (n: number) => void
    onConfirm: () => void
    onCancel: () => void
  }) => (
    <div
      className={styles['config-panel']}
      onMouseDown={(e) => {
        const el = e.target as HTMLElement
        if (el.closest('textarea, input, [contenteditable="true"]')) return
        e.preventDefault()
      }}
    >
      <div className={styles['config-inline-header']}>
        <button type="button" className={styles['config-icon-btn']} onClick={opts.onCancel} aria-label="back">
          <ChevronLeftOutlined color="currentColor" />
        </button>
        <span className={styles['config-title']}>{opts.title}</span>
        <Tooltip title={opts.tip}>
          <div
            className={styles['config-inline-control']}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <YakitInputNumber
              type="horizontal"
              size="small"
              min={opts.min ?? 0}
              max={opts.max}
              value={opts.value}
              onChange={(v) => opts.onChange((v as number) ?? 0)}
            />
          </div>
        </Tooltip>
        <div className={styles['config-actions']}>
          <button type="button" className={styles['config-icon-btn']} onClick={opts.onCancel} aria-label="cancel">
            <XOutlined color="currentColor" />
          </button>
          <button type="button" className={styles['config-icon-btn']} onClick={opts.onConfirm} aria-label="confirm">
            <CheckOutlined color="currentColor" />
          </button>
        </div>
      </div>
    </div>
  )

  const renderAcceptance = () => (
    <div
      className={classNames(styles['config-panel'], styles['config-panel-acceptance'])}
      onMouseDown={(e) => {
        const el = e.target as HTMLElement
        if (el.closest('textarea, input, [contenteditable="true"]')) return
        e.preventDefault()
      }}
    >
      <div className={styles['config-header']}>
        <div className={styles['config-header-left']}>
          <button
            type="button"
            className={styles['config-icon-btn']}
            onClick={() => goBackFromConfig('goalModes')}
            aria-label="back"
          >
            <ChevronLeftOutlined color="currentColor" />
          </button>
          <span className={styles['config-title']}>{t('AIMilkdownModeSlash.acceptance')}</span>
        </div>
        <div className={styles['config-actions']}>
          <button type="button" className={styles['config-icon-btn']} onClick={onHide} aria-label="cancel">
            <XOutlined color="currentColor" />
          </button>
          <button
            type="button"
            className={styles['config-icon-btn']}
            onClick={onConfirmAcceptance}
            aria-label="confirm"
          >
            <CheckOutlined color="currentColor" />
          </button>
        </div>
      </div>
      <div
        className={styles['acceptance-box']}
        onMouseDown={(e) => {
          e.stopPropagation()
          // 点盒子空白处也抢焦，避免按键落到主输入
          const t = e.target as HTMLElement
          if (!t.closest('textarea')) {
            window.setTimeout(() => focusAcceptanceInput(), 0)
          }
        }}
      >
        <SparklesOutlined className={styles['acceptance-spark']} color="currentColor" />
        <YakitInput.TextArea
          ref={acceptanceTextAreaRef as any}
          className={styles['acceptance-input']}
          autoFocus
          autoSize={{ minRows: 3, maxRows: 8 }}
          placeholder={t('AIMilkdownModeSlash.acceptancePlaceholder')}
          value={draftAcceptance}
          onChange={(e) => setDraftAcceptance(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          onKeyUp={(e) => e.stopPropagation()}
          onKeyPress={(e) => e.stopPropagation()}
          bordered={false}
        />
      </div>
    </div>
  )

  const renderDuration = () => (
    <div
      className={styles['config-panel']}
      onMouseDown={(e) => {
        const el = e.target as HTMLElement
        if (el.closest('textarea, input, [contenteditable="true"], .ant-select-dropdown')) return
        e.preventDefault()
      }}
    >
      <div className={styles['config-inline-header']}>
        <button
          type="button"
          className={styles['config-icon-btn']}
          onClick={() => goBackFromConfig('goalModes')}
          aria-label="back"
        >
          <ChevronLeftOutlined color="currentColor" />
        </button>
        <span className={styles['config-title']}>{t('AIMilkdownModeSlash.duration')}</span>
        <div className={styles['config-inline-control']} onClick={(e) => e.stopPropagation()}>
          <YakitSelect
            size="small"
            value={draftDuration}
            onChange={(v) => setDraftDuration(String(v))}
            wrapperClassName={styles['duration-select']}
            getPopupContainer={() => document.body}
            dropdownStyle={{ zIndex: 9999 }}
            dropdownMatchSelectWidth={false}
          >
            {GOAL_DURATION_PRESETS.map((item) => (
              <YakitSelect.Option key={item.key} value={item.key}>
                {item.key === 'never' ? t('AIMilkdownModeSlash.durationNever') : item.label}
              </YakitSelect.Option>
            ))}
          </YakitSelect>
        </div>
        <div className={styles['config-actions']}>
          <button
            type="button"
            className={styles['config-icon-btn']}
            onClick={() => goBackFromConfig('goalModes')}
            aria-label="cancel"
          >
            <XOutlined color="currentColor" />
          </button>
          <button type="button" className={styles['config-icon-btn']} onClick={onConfirmDuration} aria-label="confirm">
            <CheckOutlined color="currentColor" />
          </button>
        </div>
      </div>
    </div>
  )

  const body = (() => {
    switch (step) {
      case 'goalModes':
        return renderGoalModes()
      case 'multiAgentConfig':
        return renderNumberConfig({
          title: t('AIMilkdownModeSlash.subAgentCount'),
          tip: t('AIMilkdownModeSlash.subAgentCountTip'),
          value: draftSubAgents,
          min: 0,
          max: 20,
          onChange: setDraftSubAgents,
          onConfirm: onConfirmMultiAgent,
          onCancel: () => goBackFromConfig('root'),
        })
      case 'goalIterations':
        return renderNumberConfig({
          title: t('AIMilkdownModeSlash.minIterations'),
          tip: t('AIMilkdownModeSlash.minIterationsTip'),
          value: draftIterations,
          min: 1,
          onChange: (v) => setDraftIterations(normalizeGoalIterations(v)),
          onConfirm: onConfirmGoalIterations,
          onCancel: () => goBackFromConfig('goalModes'),
        })
      case 'goalAcceptance':
        return renderAcceptance()
      case 'goalDuration':
        return renderDuration()
      case 'root':
      default:
        return renderRoot()
    }
  })()

  return createPortal(
    <div
      aria-expanded="false"
      data-show="false"
      className={classNames(styles['mode-slash'], {
        [styles['mode-slash-acceptance']]: step === 'goalAcceptance',
      })}
      ref={ref}
    >
      {body}
    </div>,
    document.body,
  )
}
