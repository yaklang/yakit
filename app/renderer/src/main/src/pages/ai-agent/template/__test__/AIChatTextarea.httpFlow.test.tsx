import React, { createRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { ContextType } from 'react'
import { getLocalFileLinkInfo } from '@/components/MilkdownEditor/CustomFile/utils'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as OutlineIcons from '@yakit-libs/yakit-ui-icons/outline'
import { Editor, defaultValueCtx, editorViewCtx, parserCtx, rootCtx } from '@milkdown/kit/core'
import { DOMParser, DOMSerializer } from '@milkdown/kit/prose/model'
import { TextSelection } from '@milkdown/kit/prose/state'
import { SlashProvider } from '@milkdown/kit/plugin/slash'
import { extractMentionFilterKeyword } from '../../components/aiMilkdownInput/aiMilkdownMention/mentionQuery'
import { extractModeSlashFilterKeyword } from '../../components/aiMilkdownInput/aiMilkdownModeSlash/modeSlashQuery'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { $remark, callCommand, getMarkdown } from '@milkdown/kit/utils'
import directive from 'remark-directive'
import type { AIMilkdownInputProps, AIMilkdownInputRef } from '../../components/aiMilkdownInput/type'
import {
  aiResourceReferenceCommand,
  aiResourceReferenceCustomId,
  aiResourceReferenceCustomPlugin,
} from '../../components/aiMilkdownInput/aiMilkdownResourceReference/aiResourceReferencePlugin'
import { extractDataWithMilkdown, parseMentions } from '../../components/aiMilkdownInput/utils'
import { insertAIShortcutCommand } from '../../components/aiMilkdownInput/customPlugin'
import {
  aiMentionCommand,
  aiMentionCustomId,
  aiMentionCustomPlugin,
} from '../../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import type { AIChatInputDraft, AIChatTextareaRefProps, AIChatTextareaSubmit } from '../type'
import { AIInputFooterRightEnum, AIInputInnerFeatureEnum, getFooterLeftTypesWithItem } from '../type'
import type * as TemplateModule from '../template'
import type * as ReviewRuleSelectModule from '@/pages/ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect'
import buttonStyles from '@/components/yakitUI/YakitButton/yakitButton.module.scss'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'
import { useHttpFlowSelection } from '@/components/useHttpFlowSelection'
import { HistoryAIReActChatContext } from '@/components/historyAIReActChat/context'
import { yakitNotify } from '@/utils/notification'
import { toAtomFileUrl } from '@/utils/atomFileUrl'
import { handleOpenFileSystemDialog } from '@/utils/fileSystemDialog'
import emiter from '@/utils/eventBus/eventBus'
import * as edition from '@/utils/envfile'
import { AIAgentTabListEnum, AITabsEnum, SwitchAIAgentTabEventEnum } from '../../defaultConstant'
import { grpcGetAIReActRecommendedSkills, grpcQueryAIFocus, grpcQueryAIForge } from '../../grpc'
import { grpcGetAIToolList } from '../../aiToolList/utils'
import { useKnowledgeBase } from '@/pages/KnowledgeBase/hooks/useKnowledgeBase'
import type { KnowledgeBaseItem } from '@/pages/KnowledgeBase/hooks/useKnowledgeBase'
import { useBrowserInstances } from '../../browserInstances/browserInstanceStore'
import type { AIBrowserInstance } from '../../browserInstances/browserInstanceStore'
import { createChatStore } from '@/pages/ai-re-act/hooks/chatStore'
import { AIInputEventSyncTypeEnum, AITaskStatus } from '@/pages/ai-re-act/hooks/grpcApi'
import type * as CurrentDataBySession from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import type * as AIAgentStoreModule from '@/pages/ai-agent/useContext/useStore'
import type * as AIAgentDispatcherModule from '@/pages/ai-agent/useContext/useDispatcher'

vi.mock('../../browserInstances/browserInstanceStore', () => ({
  useBrowserInstances: vi.fn(() => ({
    instances: ['A', 'B'].map(
      (identity): AIBrowserInstance => ({
        id: `browser-${identity}`,
        installationId: `installation-${identity}`,
        name: `浏览器 ${identity}`,
        identity,
        client: 'Google Chrome',
        clientVersion: '156.0',
        origin: `https://browser-${identity}.example.com`,
        createdAt: 0,
        lastSeenAt: 0,
        online: true,
        running: true,
      }),
    ),
  })),
  readBrowserThumbnail: vi.fn(),
  browserInstanceMentionName: (instance: AIBrowserInstance) => instance.identity || instance.name,
  selectBrowserInstance: vi.fn(),
  formatLastSeen: vi.fn(),
  refreshBrowserInstances: vi.fn(),
  restoreBrowserHistory: vi.fn(),
}))
vi.mock('../../browserInstances/BrowserInstancesGuideEmpty/BrowserInstancesGuideEmpty', () => ({
  BrowserInstancesGuideEmpty: () => null,
  BrowserInstancesGuideManual: () => null,
}))
vi.mock('../../components/aiAgentSideBox/AIAgentSideBox', () => ({ default: () => null }))
vi.mock('@/components/yakitUI/YakitButton/yakitButton.module.scss', () => ({
  default: { 'yakit-active-button': 'yakit-active-button' },
}))

const editors: Editor[] = []
const fileSessions = new Map<
  string,
  { rawData: { draftMaterials: { files: { path: string; isFolder: boolean }[] } } }
>()
const fileSession = { id: 'file-session' }
let sessionStore: ReturnType<typeof createChatStore>
const sessionControls = vi.hoisted(() => ({ pending: false, onSend: vi.fn(), cancelPendingChat: vi.fn() }))
const startSessionTask = () =>
  sessionStore.setState((state) => ({
    execute: true,
    currentChatStatus: { ...state.currentChatStatus, status: AITaskStatus.inProgress, questionID: 'task-1' },
  }))

vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', async (importOriginal) => ({
  ...(await importOriginal<typeof CurrentDataBySession>()),
  useCurrentStore: () => sessionStore,
}))
vi.mock('@/pages/ai-agent/useContext/useStore', async (importOriginal) => {
  const actual = await importOriginal<typeof AIAgentStoreModule>()
  return {
    default: () => ({
      ...actual.default(),
      pendingChat: sessionControls.pending ? { status: 'connecting' } : undefined,
    }),
  }
})
vi.mock('@/pages/ai-agent/useContext/useDispatcher', async (importOriginal) => {
  const actual = await importOriginal<typeof AIAgentDispatcherModule>()
  return {
    default: () => ({
      ...actual.default(),
      onSend: sessionControls.onSend,
      cancelPendingChat: sessionControls.cancelPendingChat,
    }),
  }
})
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: () => fileSession.id }))
vi.mock('@/pages/ai-re-act/hooks/ChatMultiSessionController', () => ({
  globalSessionEngine: {
    ensureSession: (id: string) => {
      if (!fileSessions.has(id)) fileSessions.set(id, { rawData: { draftMaterials: { files: [] } } })
      return fileSessions.get(id)
    },
    updateDraftMaterials: (id: string, _category: string, files: { path: string; isFolder: boolean }[]) => {
      fileSessions.get(id)!.rawData.draftMaterials.files = files
    },
  },
}))
const { deferEditor, i18n, notifyElementResize } = vi.hoisted(() => ({
  deferEditor: { value: false },
  i18n: { language: 'zh' },
  notifyElementResize: new WeakMap<Element, (width: number) => void>(),
}))

vi.hoisted(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private readonly onResize: ResizeObserverCallback) {}

      observe(target: Element) {
        notifyElementResize.set(target, (width) => {
          Object.defineProperty(target, 'clientWidth', { configurable: true, value: width })
          this.onResize([{ target, contentRect: { width } } as ResizeObserverEntry], this)
        })
        this.onResize([{ target, contentRect: target.getBoundingClientRect() } as ResizeObserverEntry], this)
      }

      unobserve() {}
      disconnect() {}
    },
  )
})

const resizeObservedElement = (element: Element, width: number) => {
  act(() => {
    notifyElementResize.get(element)!(width)
    vi.advanceTimersByTime(100)
  })
}

const clickSceneSelector = (combobox: HTMLElement) => {
  const selector = combobox.closest('.ant-select-selector')!
  fireEvent.mouseDown(selector)
  fireEvent.click(selector)
}

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    i18n,
    t: (key: string, params?: { count: number; max?: number }) => {
      if (key === 'AIAddMaterialsPopover.scenarioCapabilities') return '能力'
      if (key === 'AIMilkdownInput.selectedHttpFlowSummary') return `勾选了 ${params?.count} 条流量`
      if (key === 'AIMilkdownInput.selectedRiskSummary') return `勾选了 ${params?.count} 条漏洞风险`
      if (key === 'AIAddMaterialsPopover.attachmentLimitExceeded')
        return `选中 ${params?.count} 个，最多 ${params?.max} 个`
      return key
    },
  }),
}))
vi.mock('ahooks', async () => ({ ...(await vi.importActual('ahooks')), useInViewport: () => [true] }))
vi.mock('../../aiChatWelcome/hooks/useAIChatDrop', () => ({
  default: function useAIChatDrop() {
    return { isHovering: false, dropRef: useRef(null) }
  },
}))
vi.mock('@/components/MilkdownEditor/utils/utils', () => ({ imgTypes: ['.png'] }))
vi.mock('@/utils/notification', () => ({ success: vi.fn(), yakitNotify: vi.fn() }))
vi.mock('@/utils/clipboard', () => ({ setClipboardText: vi.fn() }))
vi.mock('../../aiModelList/aiModelSelect/AIModelSelect', () => ({
  AIModelSelect: ({ iconOnly }: { iconOnly?: boolean }) => (
    <button type="button" data-icon-only={iconOnly}>
      默认模型选择
    </button>
  ),
}))
vi.mock('@/pages/ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect', async (importOriginal) => ({
  ...(await importOriginal<typeof ReviewRuleSelectModule>()),
  default: () => <button type="button">协同</button>,
}))
vi.mock('@/pages/ai-re-act/aiReasoningEffortSelect/AIReasoningEffortSelect', () => ({
  AIReasoningEffortSelect: () => null,
}))
vi.mock('../../aiRunModeSelect/AIRunModeSelect', () => ({ default: () => <button>执行模式</button> }))
vi.mock('../../aiRunModeSelect/useAIRunMode', () => ({
  useAIRunMode: () => ({
    execute: false,
    enablePlan: false,
    enableMultiAgent: false,
    enableGoalMode: false,
    goalMinIterations: 0,
    goalDurationSeconds: 0,
    goalAcceptanceCriteria: '',
    strategy: {
      EnableMultiAgent: false,
      EnableGoalMode: false,
      GoalMinIterations: 0,
      MaxSubAgents: 0,
      GoalDurationSeconds: 0,
      GoalAcceptanceCriteria: '',
    },
    maxSubAgents: 0,
    selectedModes: [],
    isModeSelected: () => false,
    onToggleMode: vi.fn(),
    onSetStrategy: vi.fn(),
  }),
}))
vi.mock('@/utils/fileSystemDialog', () => ({ handleOpenFileSystemDialog: vi.fn() }))
vi.mock('@yakit-libs/yakit-ui-icons/outline', async (importOriginal) => ({
  ...(await importOriginal<typeof OutlineIcons>()),
  FlowOutlined: () => <svg data-testid="flow-icon" />,
  ShieldExclamationOutlined: () => <svg data-testid="shield-icon" />,
  Wrench1Outlined: () => <svg data-testid="wrench-icon" />,
}))
vi.mock('@yakit-libs/yakit-ui-icons/oldicon/ColorsPreViewMDIcon', () => ({
  ColorsPreViewMDIcon: () => <svg data-testid="markdown-icon" />,
}))
vi.mock('@/components/MilkdownEditor/CustomFile/utils', () => ({ getLocalFileLinkInfo: vi.fn() }))
vi.mock('../../grpc', () => ({
  grpcGetAIReActRecommendedSkills: vi.fn().mockResolvedValue({ Data: [] }),
  grpcQueryAIFocus: vi.fn(),
  grpcQueryAIForge: vi.fn(),
  grpcResetAIReActRecommendedSkill: vi.fn(),
  grpcUpdateAIReActRecommendedSkill: vi.fn(),
}))
vi.mock('@/components/yakitUI/YakitEditor/YakitEditor', () => ({
  YakitEditor: ({ value, setValue }: { value: string; setValue: (value: string) => void }) => (
    <textarea aria-label="能力正文" value={value} onChange={(event) => setValue(event.target.value)} />
  ),
}))
vi.mock('@/components/yakitUI/YakitModal/YakitModal', () => ({
  YakitModal: ({
    open,
    title,
    children,
    onOk,
    footerExtra,
  }: React.PropsWithChildren<{ open: boolean; title: string; onOk: () => void; footerExtra: React.ReactNode }>) =>
    open && (
      <section role="dialog" aria-label={title}>
        {children}
        {footerExtra}
        <button onClick={onOk}>保存</button>
      </section>
    ),
}))
vi.mock('@/utils/getMainOperatorPageBodyContainer', () => ({
  getMainOperatorPageBodyContainerOrBody: () => document.body,
}))
vi.mock('@/pages/ai-re-act/aiRightPanel/AISkillLoadingPane/aiSkillList/AISkillDetails/AISkillDetails', () => ({
  default: ({ name, source }: { name: string; source: string }) => (
    <div data-testid="skill-preview" data-source={source}>
      {name}
    </div>
  ),
}))
vi.mock('../../aiToolList/utils', () => ({ grpcGetAIToolList: vi.fn() }))
vi.mock('@/pages/ai-re-act/aiReActTaskChat/AIReActTaskChat', () => ({
  AIInputSettingPopover: ({
    children,
    visible,
    setVisible,
  }: {
    children: React.ReactElement<{ onClick?: React.MouseEventHandler<HTMLButtonElement> }>
    visible: boolean
    setVisible: (visible: boolean) => void
  }) =>
    React.cloneElement(children, {
      onClick: (event) => {
        children.props.onClick?.(event)
        setVisible(!visible)
      },
    }),
}))

// 保留真实 Milkdown 文档、解析与序列化，仅隔离文件上传、提及面板等外围 UI。
vi.mock('../../components/aiMilkdownInput/AIMilkdownInput', () => ({
  AIMilkdownInput: React.forwardRef<AIMilkdownInputRef, AIMilkdownInputProps>(function Input(props, ref) {
    const root = useRef<HTMLDivElement>(null)
    useImperativeHandle(ref, () => ({
      getSessionId: () => 'draft-session',
      setMention: vi.fn(),
      setCodeRef: vi.fn(),
    }))
    useEffect(() => {
      if (deferEditor.value) return
      let cancelled = false
      const editor = Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root.current)
          ctx.set(defaultValueCtx, props.defaultValue || '')
          ctx.get(listenerCtx).markdownUpdated((_, markdown) => props.onUpdateContent?.(markdown))
        })
        .use(commonmark)
        .use(listener)
        .use($remark('test-http-flow-directive', () => directive))
        .use(aiResourceReferenceCustomPlugin())
        .use(aiMentionCustomPlugin())
        .use(insertAIShortcutCommand)
      editors.push(editor)
      void editor.create().then(() => {
        if (!cancelled) {
          props.onUpdateEditor?.(editor)
          props.onUpdateContent?.(editor.action(getMarkdown()))
        }
      })
      return () => {
        cancelled = true
      }
    }, [])
    return <div ref={root} data-testid="editor" data-mention-filter={props.filterMode?.join(',')} />
  }),
}))

const { AIChatTextarea } = await compileReactModule<typeof TemplateModule>(import.meta.url, '../template.tsx')

const zeroDomRect = () => ({
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  width: 0,
  height: 0,
  toJSON: () => ({}),
})
const emptyClientRects = () => ({
  length: 0,
  item: () => null,
  [Symbol.iterator]: function* empty() {},
})

beforeEach(() => {
  // 提及后的空格把光标放进文本节点。scrollIntoView 会量这个位置，jsdom 没有这些 DOM 矩形方法。
  for (const prototype of [Text.prototype, Range.prototype, Element.prototype]) {
    const target = prototype as {
      getClientRects?: () => ReturnType<typeof emptyClientRects>
      getBoundingClientRect?: () => ReturnType<typeof zeroDomRect>
    }
    if (typeof target.getClientRects !== 'function') target.getClientRects = emptyClientRects
    if (typeof target.getBoundingClientRect !== 'function') target.getBoundingClientRect = zeroDomRect
  }
  fileSessions.clear()
  fileSession.id = 'file-session'
  sessionStore = createChatStore()
  sessionControls.pending = false
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'], shouldAdvanceTime: true })
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('container') ? 480 : 0
  })
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('container') ? 289 : 0
  })
})

afterAll(() => {
  vi.unstubAllGlobals()
})

afterEach(async () => {
  try {
    cleanup()
    await Promise.all(editors.splice(0).map((editor) => editor.destroy()))
    // Milkdown 初始化成功后仍保留超时回调，必须在 jsdom 销毁前执行完毕。
    await vi.runAllTimersAsync()
    expect(vi.getTimerCount()).toBe(0)
  } finally {
    vi.useRealTimers()
    deferEditor.value = false
    i18n.language = 'zh'
    vi.clearAllMocks()
    vi.mocked(handleOpenFileSystemDialog).mockReset()
    vi.restoreAllMocks()
  }
})

async function setup(defaultValue = '', showScenarioCapabilities = false) {
  const ref = createRef<AIChatTextareaRefProps & { setHttpFlow: (ids: string[]) => void }>()
  const onSubmit = vi.fn<(value: AIChatTextareaSubmit) => void>()
  const onHttpFlowRemove = vi.fn()
  const onWorkspaceAddedChange = vi.fn()
  function SelectionHarness() {
    const inputRef = useRef<AIChatTextareaRefProps>(null)
    const selection = useHttpFlowSelection(true, 'test')
    useImperativeHandle(ref, () => ({
      setHttpFlow: selection.onSetSelectedHttpFlowIds,
      setValue: (value) => inputRef.current?.setValue(value),
      getValue: () => inputRef.current?.getValue(),
      setMention: (value) => inputRef.current?.setMention(value),
    }))
    return (
      <AIChatTextarea
        ref={inputRef}
        defaultValue={defaultValue}
        showScenarioCapabilities={showScenarioCapabilities}
        selectedHttpFlowIds={selection.selectedHttpFlowIds}
        onSubmit={onSubmit}
        onHttpFlowRemove={(id, isSummary) => {
          onHttpFlowRemove(id, isSummary)
          selection.onHttpFlowRemove(id, isSummary)
        }}
        onWorkspaceAddedChange={onWorkspaceAddedChange}
        chatDataStoreKey="test"
        footer={<span />}
      />
    )
  }
  const view = render(<SelectionHarness />)
  await waitFor(() => expect(ref.current?.getValue()).toBe(defaultValue))
  await waitFor(() => expect(screen.getByTestId('editor').querySelector('.ProseMirror')).not.toBeNull())
  // 等待编辑器的初始化回调将实例传到公共输入组件。
  await act(async () => {})
  const send = within(view.container).getByRole('button', { name: 'YakitButton.send' })
  return { ...view, ref, onSubmit, onHttpFlowRemove, onWorkspaceAddedChange, send }
}

const codeReview = {
  Name: 'code-review',
  Type: 'skill',
  DisplayNameZhCN: '代码审计',
  Description: '',
  Content: '现有正文',
  IsModified: true,
}

describe('输入框资料栏', () => {
  it.each([
    ['@', 'AIAddMaterialsPopover.mentionShortcut', '', '@'],
    ['/', 'AIAddMaterialsPopover.modeShortcut', '', '/'],
    ['@', 'AIAddMaterialsPopover.mentionShortcut', '现有正文', '现有正文 @'],
    ['/', 'AIAddMaterialsPopover.modeShortcut', '现有正文', '现有正文 /'],
  ] as const)('快捷入口 %s（%s），草稿「%s」插入后激活已有弹窗触发条件', async (shortcut, label, draft, expected) => {
    const { onSubmit } = await setup(draft)
    const editorView = editors[0].action((ctx) => ctx.get(editorViewCtx))
    editorView.setProps({ handleScrollToSelection: () => true })
    await act(async () => {
      editorView.dispatch(editorView.state.tr.setSelection(TextSelection.atEnd(editorView.state.doc)))
      editorView.focus()
    })
    const trigger = screen.getByRole('button', { name: 'AIChatTextarea.addMaterials' })
    fireEvent.click(trigger)
    const row = await screen.findByRole('menuitem', { name: new RegExp(label) })
    await act(async () => fireEvent.click(row))

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(editorView.state.doc.textContent).toBe(expected)
    expect(editorView.hasFocus()).toBe(true)
    expect(editorView.state.selection.empty).toBe(true)
    const provider = new SlashProvider({ content: document.createElement('div'), trigger: shortcut })
    const content = provider.getContent(editorView)
    const extractQuery = shortcut === '@' ? extractMentionFilterKeyword : extractModeSlashFilterKeyword
    expect(extractQuery(content)).toBe('')
    expect(onSubmit).not.toHaveBeenCalled()
    provider.destroy()
  })

  it('将添加资料弹窗挂在页面根节点并跟随输入框宽度', async () => {
    const { container } = await setup()
    container.style.overflowY = 'auto'
    const anchor = container.querySelector<HTMLElement>('[data-ai-input-card] > div:last-child')!
    const getAnchorBounds = vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 360, 480, 80))

    fireEvent.click(screen.getByRole('button', { name: 'AIChatTextarea.addMaterials' }))

    const popup = (await screen.findByRole('dialog', { name: 'AIChatTextarea.addMaterials' })).closest<HTMLElement>(
      '.ant-popover',
    )!
    expect(popup.parentElement).toBe(document.body)
    await waitFor(() => expect(popup.style.width).toBe('480px'))

    vi.spyOn(popup, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 100, 480, 256))
    getAnchorBounds.mockReturnValue(new DOMRect(0, 360, 400, 80))
    fireEvent.resize(window)
    await waitFor(() => expect(popup.style.width).toBe('400px'))
  })

  it('恢复正文、独立资料和场景能力后，可完整重新发送', async () => {
    const draft: AIChatInputDraft = {
      markdown: 'original question',
      selectedMaterials: [
        {
          mentionType: 'file',
          mentionId: '/tmp/report.txt',
          mentionName: '/tmp/report.txt',
          mentionSource: 'attachment',
        },
      ],
      hiddenInlineKeys: [],
      selectedResourceIds: { http: ['7'], risk: ['8'] },
      focusMode: 'scene',
      enabledCapabilities: [{ Name: 'other-skill', Type: 'skill' }],
    }
    vi.mocked(grpcGetAIReActRecommendedSkills).mockResolvedValueOnce({
      Data: [codeReview, { ...codeReview, Name: 'other-skill' }],
    })
    const onSubmitWithDraft = vi.fn()
    render(
      <AIChatTextarea
        chatDataStoreKey="test"
        initialDraft={draft}
        selectedHttpFlowIds={draft.selectedResourceIds.http}
        selectedRiskIds={draft.selectedResourceIds.risk}
        showScenarioCapabilities
        onSubmitWithDraft={onSubmitWithDraft}
      />,
    )
    await waitFor(() => expect(grpcGetAIReActRecommendedSkills).toHaveBeenCalled())
    await waitFor(() =>
      expect(screen.getByTestId('editor').querySelector('.ProseMirror')).toHaveTextContent(draft.markdown),
    )
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.send' }))

    expect(onSubmitWithDraft).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        qs: expect.stringContaining(draft.markdown),
        mentionList: draft.selectedMaterials,
        resourceReferences: [
          expect.objectContaining({ type: 'http', ids: ['7'] }),
          expect.objectContaining({ type: 'risk', ids: ['8'] }),
        ],
        focusMode: draft.focusMode,
        enabledCapabilities: draft.enabledCapabilities,
      }),
      draft,
    )
  })

  it('自定义左侧内容替换配置的底栏控件，移除后恢复配置项', () => {
    const footerLeftTypes = [
      AIInputInnerFeatureEnum.AIRunModeSelect,
      AIInputInnerFeatureEnum.AIReviewRuleSelect,
      AIInputInnerFeatureEnum.AIInputSettings,
    ]
    const { rerender } = render(
      <AIChatTextarea
        chatDataStoreKey="test"
        inputFooterLeft={<span>自定义左侧</span>}
        footerLeftTypes={footerLeftTypes}
      />,
    )

    expect(screen.getByText('自定义左侧')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '执行模式' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '协同' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'AIRightPanel.aiSettings' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'YakitButton.send' })).toBeInTheDocument()

    rerender(<AIChatTextarea chatDataStoreKey="test" footerLeftTypes={footerLeftTypes} />)
    expect(screen.queryByText('自定义左侧')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '执行模式' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '协同' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'AIRightPanel.aiSettings' })).toBeInTheDocument()
  })

  it('左侧依次显示协同、模型、场景和设置，支持隐藏模型选择', () => {
    const { rerender } = render(<AIChatTextarea chatDataStoreKey="test" footerRightTypes={[]} />)

    const review = screen.getByRole('button', { name: '协同' })
    const add = screen.getByRole('button', { name: 'AIChatTextarea.addMaterials' })
    const mode = screen.getByRole('button', { name: '执行模式' })
    expect(add.parentElement).toBe(review.parentElement)
    expect(add.compareDocumentPosition(mode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(mode.compareDocumentPosition(review) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const model = screen.getByRole('button', { name: '默认模型选择' })
    const scene = screen.getByRole('combobox', { name: 'AiAgengt.focusMode' })
    const settings = screen.getByRole('button', { name: 'AIRightPanel.aiSettings' })
    expect(review.parentElement).toContainElement(scene)
    expect(review.parentElement).toContainElement(settings)
    expect(review.compareDocumentPosition(model) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(model.compareDocumentPosition(scene) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(scene.compareDocumentPosition(settings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    rerender(
      <AIChatTextarea
        chatDataStoreKey="test"
        footerLeftTypes={[AIInputInnerFeatureEnum.AIReviewRuleSelect, AIInputInnerFeatureEnum.AIFocusMode]}
      />,
    )

    expect(screen.queryByRole('button', { name: '默认模型选择' })).toBeNull()
    expect(screen.getByRole('combobox', { name: 'AiAgengt.focusMode' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'YakitButton.send' })).toBeInTheDocument()
  })

  it('自定义模型仍位于左侧，右侧依次显示审计模式、停止和发送按钮', () => {
    render(
      <AIChatTextarea
        chatDataStoreKey="test"
        footerLeftTypes={getFooterLeftTypesWithItem({
          type: AIInputInnerFeatureEnum.AIModelSelect,
          component: <button type="button">自定义模型</button>,
        })}
        footerRightTypes={[
          {
            type: AIInputFooterRightEnum.Custom,
            key: 'audit-style',
            component: <button type="button">审计模式</button>,
          },
        ]}
        inputFooterRight={<button type="button">停止</button>}
      />,
    )

    const model = screen.getByRole('button', { name: '自定义模型' })
    const scene = screen.getByRole('combobox', { name: 'AiAgengt.focusMode' })
    const auditStyle = screen.getByRole('button', { name: '审计模式' })
    const stop = screen.getByRole('button', { name: '停止' })
    const send = screen.getByRole('button', { name: 'YakitButton.send' })
    expect(model.parentElement).not.toContainElement(auditStyle)
    expect(screen.queryByRole('button', { name: '默认模型选择' })).not.toBeInTheDocument()
    expect(model.compareDocumentPosition(scene) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(send.parentElement).toContainElement(auditStyle)
    expect(model.compareDocumentPosition(auditStyle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(auditStyle.compareDocumentPosition(stop) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(stop.compareDocumentPosition(send) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('右侧显示默认状态项时，宽屏底栏的模型、场景和设置也只显示图标', () => {
    const { container, rerender } = render(<AIChatTextarea chatDataStoreKey="test" />)
    resizeObservedElement(container.querySelector('[data-ai-input-card]')!, 864)

    expect(screen.getByRole('progressbar', { name: 'AIContextUsage.label' })).toBeInTheDocument()
    const mode = screen.getByRole('button', { name: '执行模式' })
    expect(screen.queryByRole('status', { name: 'AIRunningStatus.label' })).not.toBeInTheDocument()
    expect(mode.closest('[data-has-footer-indicators]')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '默认模型选择' })).toHaveAttribute('data-icon-only', 'true')
    expect(screen.getByTitle('AiAgengt.focusMode').querySelector('svg')).toBeInTheDocument()
    expect(screen.queryByText('AiAgengt.focusMode')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'AIRightPanel.aiSettings' })).not.toHaveTextContent(
      'AIRightPanel.aiSettings',
    )

    rerender(<AIChatTextarea chatDataStoreKey="test" footerRightTypes={[]} />)
    expect(mode.closest('[data-has-footer-indicators]')).toBeNull()
    expect(screen.getByRole('button', { name: '默认模型选择' })).toHaveAttribute('data-icon-only', 'false')
    expect(screen.getByText('AiAgengt.focusMode')).toBeVisible()
  })

  it('输入框宽度小于 640px 时模型和场景只显示图标，场景仍可选择和清空', async () => {
    vi.mocked(grpcQueryAIFocus).mockResolvedValue({
      Data: [
        {
          Name: 'scene',
          VerboseNameZh: '测试场景',
          VerboseName: 'Scene',
          Description: '',
          DescriptionZh: '',
          OutputExamplePrompt: '',
          UsagePrompt: '',
        },
      ],
    })
    const { container } = render(<AIChatTextarea chatDataStoreKey="test" footerRightTypes={[]} />)
    const input = container.querySelector('[data-ai-input-card]')!
    const label = 'AiAgengt.focusMode'
    const model = screen.getByRole('button', { name: '默认模型选择' })
    resizeObservedElement(input, 640)
    expect(model).toHaveAttribute('data-icon-only', 'false')
    expect(screen.getByText(label)).toBeVisible()

    resizeObservedElement(input, 639)
    expect(model).toHaveAttribute('data-icon-only', 'true')
    const scene = screen.getByRole('combobox', { name: label })
    expect(screen.queryByText(label)).not.toBeInTheDocument()
    expect(screen.getByTitle(label).querySelector('svg')).toBeInTheDocument()

    clickSceneSelector(scene)
    fireEvent.click(await screen.findByText('测试场景'))
    expect(scene).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByTitle('测试场景').querySelector('svg')).toBeInTheDocument()
    fireEvent.mouseDown(scene.closest('.ant-select')!.querySelector('.ant-select-clear')!)
    expect(screen.getByTitle(label)).toBeInTheDocument()

    resizeObservedElement(input, 0)
    expect(model).toHaveAttribute('data-icon-only', 'true')
    resizeObservedElement(input, 640)
    expect(model).toHaveAttribute('data-icon-only', 'false')
    expect(within(model.parentElement!).getByText(label)).toBeVisible()
  })

  it('左侧底栏小于 360px 时在更多菜单中显示模型、场景和设置，恢复宽度后回到底栏', async () => {
    vi.mocked(grpcQueryAIFocus).mockResolvedValue({
      Data: [
        {
          Name: 'overflow-scene',
          VerboseNameZh: '更多菜单场景',
          VerboseName: 'Overflow scene',
          Description: '',
          DescriptionZh: '',
          OutputExamplePrompt: '',
          UsagePrompt: '',
        },
      ],
    })
    const { container } = render(<AIChatTextarea chatDataStoreKey="test" />)
    const footerLeft = screen.getByRole('button', { name: '协同' }).parentElement!

    resizeObservedElement(container.querySelector('[data-ai-input-card]')!, 864)
    resizeObservedElement(footerLeft, 359)
    const more = within(footerLeft).getByRole('button', { name: 'YakitButton.more' })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    expect(more).not.toHaveClass(buttonStyles['yakit-active-button'])
    expect(within(footerLeft).queryByRole('button', { name: '默认模型选择' })).not.toBeInTheDocument()
    expect(within(footerLeft).queryByRole('combobox', { name: 'AiAgengt.focusMode' })).not.toBeInTheDocument()
    expect(within(footerLeft).queryByRole('button', { name: 'AIRightPanel.aiSettings' })).not.toBeInTheDocument()
    expect(within(footerLeft).getByRole('button', { name: '执行模式' })).toBeInTheDocument()

    fireEvent.click(more)
    const menu = await screen.findByRole('dialog', { name: 'YakitButton.more' })
    expect(more).toHaveAttribute('aria-expanded', 'true')
    expect(more).toHaveClass(buttonStyles['yakit-active-button'])
    expect(menu.closest('.ant-popover')).toHaveStyle({ width: '180px' })
    expect(menu.closest('.ant-popover-inner')).toHaveStyle({ padding: '4px', borderRadius: '12px' })
    expect(within(menu).getByRole('button', { name: '默认模型选择' })).toHaveAttribute('data-icon-only', 'false')
    expect(within(menu).getByRole('button', { name: 'AIRightPanel.aiSettings' })).toBeInTheDocument()
    const scene = within(menu).getByRole('combobox', { name: 'AiAgengt.focusMode' })
    clickSceneSelector(scene)
    expect(scene).toHaveAttribute('aria-expanded', 'true')
    await screen.findByText('更多菜单场景')
    clickSceneSelector(scene)
    expect(scene).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('dialog', { name: 'YakitButton.more' })).toBe(menu)
    clickSceneSelector(scene)
    fireEvent.click(await screen.findByText('更多菜单场景'))
    const sceneTrigger = scene.closest('.ant-select')
    expect(sceneTrigger?.querySelector('.ant-select-clear')).toBeInTheDocument()
    expect(sceneTrigger?.querySelector('.ant-select-arrow')).toBeInTheDocument()

    fireEvent.click(more)
    expect(more).toHaveAttribute('aria-expanded', 'false')
    expect(more).not.toHaveClass(buttonStyles['yakit-active-button'])
    fireEvent.click(more)
    const menuSettings = await screen.findByRole('button', { name: 'AIRightPanel.aiSettings' })
    fireEvent.click(menuSettings)
    expect(menuSettings).toHaveAttribute('aria-expanded', 'true')

    resizeObservedElement(footerLeft, 360)
    expect(screen.queryByRole('dialog', { name: 'YakitButton.more' })).not.toBeInTheDocument()
    expect(within(footerLeft).queryByRole('button', { name: 'YakitButton.more' })).not.toBeInTheDocument()
    expect(within(footerLeft).getByRole('button', { name: '默认模型选择' })).toHaveAttribute('data-icon-only', 'true')
    expect(await within(footerLeft).findByTitle('更多菜单场景')).toBeInTheDocument()
    const inlineSettings = within(footerLeft).getByRole('button', { name: 'AIRightPanel.aiSettings' })
    expect(inlineSettings).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(inlineSettings)
    expect(inlineSettings).toHaveAttribute('aria-expanded', 'true')

    resizeObservedElement(footerLeft, 359)
    const reopenedMore = within(footerLeft).getByRole('button', { name: 'YakitButton.more' })
    expect(reopenedMore).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(reopenedMore)
    const reopenedSettings = await screen.findByRole('button', { name: 'AIRightPanel.aiSettings' })
    expect(reopenedSettings).toHaveAttribute('aria-expanded', 'false')
  })

  it('默认显示上下文并隐藏运行状态，运行时展示排队发送和固定停止按钮', async () => {
    const onSubmit = vi.fn()
    const view = render(<AIChatTextarea chatDataStoreKey="test" defaultValue="follow up" onSubmit={onSubmit} />)
    expect(screen.getByRole('progressbar', { name: 'AIContextUsage.label' })).toHaveAttribute('aria-valuenow', '62')
    expect(screen.queryByRole('status', { name: 'AIRunningStatus.label' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'YakitButton.send' })).toBeInTheDocument()
    act(startSessionTask)
    expect(screen.queryByRole('status', { name: 'AIRunningStatus.label' })).not.toBeInTheDocument()
    const contextUsage = screen.getByRole('progressbar', { name: 'AIContextUsage.label' })
    const queue = screen.getByRole('button', { name: 'AIChatTextarea.queueSend' })
    const stop = screen.getByRole('button', { name: 'YakitButton.stop' })
    expect(contextUsage.compareDocumentPosition(queue) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(queue.compareDocumentPosition(stop) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.click(stop)
    expect(sessionControls.onSend).toHaveBeenCalledExactlyOnceWith({
      token: 'file-session',
      type: 'casual',
      params: {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CANCEL_TASK,
        SyncJsonInput: JSON.stringify({ task_id: 'task-1' }),
        SyncID: expect.any(String),
      },
    })
    expect(sessionStore.getState().cancelChatLoading).toBe(true)
    await waitFor(() => expect(view.container.querySelector('.ProseMirror')).toBeTruthy())
    fireEvent.keyDown(stop, { key: 'Enter', code: 'Enter' })
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.click(queue)
    expect(onSubmit).toHaveBeenCalledTimes(1)
    act(() =>
      sessionStore.setState((state) => ({
        execute: false,
        currentChatStatus: { ...state.currentChatStatus, status: AITaskStatus.success },
      })),
    )
    expect(screen.queryByRole('status', { name: 'AIRunningStatus.label' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'YakitButton.send' })).toBeInTheDocument()
    act(startSessionTask)
    view.rerender(<AIChatTextarea chatDataStoreKey="test" footerRightTypes={[]} />)
    expect(screen.queryByText('AIContextUsage.label')).not.toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'AIRunningStatus.label' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.stop' }))
    expect(sessionControls.onSend).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'AIChatTextarea.queueSend' })).toBeInTheDocument()
  })

  it('停止待连接的会话时走取消连接入口，欢迎页保留普通发送入口', () => {
    sessionControls.pending = true
    startSessionTask()
    const { rerender } = render(<AIChatTextarea chatDataStoreKey="test" />)

    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.stop' }))
    expect(sessionControls.cancelPendingChat).toHaveBeenCalledTimes(1)
    expect(sessionControls.onSend).not.toHaveBeenCalled()

    rerender(<AIChatTextarea chatDataStoreKey="test" onSubmitWithDraft={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'YakitButton.send' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'YakitButton.stop' })).not.toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'AIRunningStatus.label' })).not.toBeInTheDocument()
  })

  it('右侧配置支持调整状态组件顺序和自定义内容', () => {
    render(
      <AIChatTextarea
        chatDataStoreKey="test"
        footerRightTypes={[
          AIInputFooterRightEnum.AIRunningStatus,
          { type: AIInputFooterRightEnum.AIContextUsage, component: <span>custom context</span> },
        ]}
      />,
    )
    expect(
      screen
        .getByRole('status', { name: 'AIRunningStatus.label' })
        .compareDocumentPosition(screen.getByText('custom context')) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(screen.queryByText('AIContextUsage.label')).not.toBeInTheDocument()
  })

  it('普通会话不查询场景能力', async () => {
    await setup()
    expect(grpcGetAIReActRecommendedSkills).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /^能力 \d+$/ })).toBeNull()
  })

  it('场景能力面板未打开时，默认选中的能力也随首问提交', async () => {
    vi.mocked(grpcGetAIReActRecommendedSkills).mockResolvedValueOnce({ Data: [codeReview] })
    const { send, onSubmit } = await setup('正文', true)
    await act(async () => {})

    fireEvent.click(send)
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ enabledCapabilities: [{ Name: codeReview.Name, Type: codeReview.Type }] }),
    )
  })

  it('点击能力、技能、知识库和其他资料的摘要可以查看已添加内容', async () => {
    vi.mocked(grpcGetAIReActRecommendedSkills).mockResolvedValueOnce({ Data: [codeReview] })
    vi.mocked(handleOpenFileSystemDialog).mockResolvedValueOnce({ canceled: false, filePaths: ['/tmp/summary.txt'] })
    render(
      <AIChatTextarea
        chatDataStoreKey="test"
        showScenarioCapabilities
        initialDraft={{
          markdown: '正文',
          selectedMaterials: [
            { mentionType: 'forge', mentionId: '1', mentionName: '已添加技能样例' },
            { mentionType: 'knowledgeBase', mentionId: '2', mentionName: '已添加知识库样例' },
          ],
          hiddenInlineKeys: [],
          selectedResourceIds: { http: [], risk: [] },
        }}
      />,
    )
    const add = screen.getByRole('button', { name: 'AIChatTextarea.addMaterials' })
    fireEvent.click(add)
    const addFile = await screen.findByRole('menuitem', { name: /^AIAddMaterialsPopover\.attachment / })
    await act(async () => fireEvent.click(addFile))

    for (const [badgeName, panelName, itemName] of [
      ['能力 1', '能力', '代码审计'],
      ['AIMentionTabs.skill 1', 'AIAddMaterialsPopover.addedSkills', '已添加技能样例'],
      ['AIMentionTabs.knowledgeBase 1', 'AIAddMaterialsPopover.addedKnowledgeBases', '已添加知识库样例'],
    ]) {
      const badge = await screen.findByRole('button', { name: badgeName })
      fireEvent.click(badge)
      expect(
        await within(await screen.findByRole('dialog', { name: panelName })).findByText(itemName),
      ).toBeInTheDocument()
      fireEvent.click(badge)
    }

    fireEvent.click(await screen.findByRole('button', { name: 'AIChatTextarea.otherMaterials 1' }))
    const other = await screen.findByRole('dialog', { name: 'AIAddMaterialsPopover.addedOtherMaterials' })
    fireEvent.click(within(other).getByRole('button', { name: 'AIAddMaterialsPopover.attachments' }))
    const attachments = await screen.findByRole('dialog', { name: 'AIChatTextarea.addMaterials' })
    expect(within(attachments).getByText('AIAddMaterialsPopover.addedAttachments')).toBeInTheDocument()
    expect(await within(attachments).findByTitle('/tmp/summary.txt')).toBeInTheDocument()
  })

  it.each([
    ['AIAddMaterialsPopover.flow', 'switchAIActTab', { key: AITabsEnum.HTTP }],
    ['AIAddMaterialsPopover.risk', 'switchAIActTab', { key: AITabsEnum.Risk }],
    [
      'AIMentionTabs.fileSystem',
      'switchAIAgentTab',
      { type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE, params: { active: AIAgentTabListEnum.File, show: true } },
    ],
  ] as const)('点击 %s 打开 AI Agent 内对应标签', async (label, event, payload) => {
    await setup()
    const [trigger] = screen.getAllByRole('button', { name: 'AIChatTextarea.addMaterials' })
    const onSwitchTab = vi.fn()
    emiter.on(event, onSwitchTab)
    try {
      fireEvent.click(trigger)
      const panel = await screen.findByRole('dialog', { name: 'AIChatTextarea.addMaterials' })
      fireEvent.click(within(panel).getByText(label))
      expect(onSwitchTab).toHaveBeenCalledExactlyOnceWith(JSON.stringify(payload))
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    } finally {
      emiter.off(event, onSwitchTab)
    }
  })

  it('没有浏览器实例时，添加资料菜单仍可打开浏览器侧边栏', async () => {
    const browserStore = vi.mocked(useBrowserInstances)
    const browserState = browserStore()
    browserStore.mockReturnValue({ ...browserState, instances: [] })
    const onSwitchTab = vi.fn()
    emiter.on('switchAIAgentTab', onSwitchTab)
    try {
      await setup()
      fireEvent.click(screen.getByRole('button', { name: 'AIChatTextarea.addMaterials' }))

      const menu = await screen.findByRole('menu')
      fireEvent.click(within(menu).getByText('AIMentionTabs.browser'))
      expect(onSwitchTab).toHaveBeenCalledExactlyOnceWith(
        JSON.stringify({
          type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE,
          params: { active: AIAgentTabListEnum.Browser, show: true },
        }),
      )
    } finally {
      browserStore.mockReturnValue(browserState)
      emiter.off('switchAIAgentTab', onSwitchTab)
    }
  })

  it('侧栏资料菜单只隐藏独立 AI 页面专用入口', async () => {
    const sidebarContext = {} as NonNullable<ContextType<typeof HistoryAIReActChatContext>>
    render(
      <HistoryAIReActChatContext.Provider value={sidebarContext}>
        <AIChatTextarea chatDataStoreKey="test" selectedHttpFlowIds={['12']} />
      </HistoryAIReActChatContext.Provider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'AIChatTextarea.addMaterials' }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).queryByText('AIAddMaterialsPopover.risk')).not.toBeInTheDocument()
    expect(within(menu).queryByText('AIAddMaterialsPopover.flow')).not.toBeInTheDocument()
    expect(within(menu).queryByText('AIMentionTabs.fileSystem')).not.toBeInTheDocument()
    expect(within(menu).queryByText('AIMentionTabs.browser')).not.toBeInTheDocument()
    expect(within(menu).getByText('AIAddMaterialsPopover.attachment')).toBeInTheDocument()
  })

  it('提及过滤只传给 @ 菜单，底栏由 footerLeftTypes 决定', async () => {
    const { rerender } = render(
      <AIChatTextarea chatDataStoreKey="test" filterMentionType={['focusMode', 'knowledgeBase']} />,
    )
    expect(screen.getByTestId('editor')).toHaveAttribute('data-mention-filter', 'focusMode,knowledgeBase')
    expect(screen.getByRole('combobox', { name: 'AiAgengt.focusMode' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '默认模型选择' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'AIChatTextarea.addMaterials' }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByText('AIMentionTabs.knowledgeBase')).toBeInTheDocument()
    expect(within(menu).queryByText('AiAgengt.focusMode')).not.toBeInTheDocument()
    rerender(<AIChatTextarea chatDataStoreKey="test" footerLeftTypes={[]} />)
    expect(screen.queryByRole('combobox', { name: 'AiAgengt.focusMode' })).not.toBeInTheDocument()
  })

  it.each([false, true])('侧栏固定场景只在底栏展示且不可修改（IRify: %s）', async (isIRify) => {
    vi.spyOn(edition, 'isIRify').mockReturnValue(isIRify)
    const sidebarContext = {
      focusModeLoop: 'fixed_scene',
    } as NonNullable<ContextType<typeof HistoryAIReActChatContext>>
    vi.mocked(grpcQueryAIFocus).mockResolvedValueOnce({
      Data: [
        {
          Name: 'fixed_scene',
          VerboseNameZh: '侧栏固定场景',
          VerboseName: 'Fixed scene',
          Description: '',
          DescriptionZh: '',
          OutputExamplePrompt: '',
          UsagePrompt: '',
        },
      ],
    })
    render(
      <HistoryAIReActChatContext.Provider value={sidebarContext}>
        <AIChatTextarea
          chatDataStoreKey="test"
          selectedHttpFlowIds={['12']}
          filterMentionType={['focusMode']}
          footerLeftTypes={[
            AIInputInnerFeatureEnum.AddMaterials,
            { type: AIInputInnerFeatureEnum.AIFocusMode, props: { value: 'fixed_scene', disabled: true } },
          ]}
        />
      </HistoryAIReActChatContext.Provider>,
    )

    expect(screen.getByRole('combobox', { name: 'AiAgengt.focusMode' })).toBeDisabled()
    expect(await screen.findByTitle('侧栏固定场景')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'AIChatTextarea.addMaterials' }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).queryByText('AiAgengt.focusMode')).not.toBeInTheDocument()
  })

  it('侧栏可用自定义场景列表切换固定场景，锁定时只展示当前值', async () => {
    const onChange = vi.fn()
    const options = [
      { value: 'code', label: '代码审计' },
      { value: 'skill', label: '技能审计' },
    ]
    const input = (value: string, disabled = false) => (
      <AIChatTextarea
        chatDataStoreKey="test"
        filterMentionType={['focusMode']}
        footerLeftTypes={[
          {
            type: AIInputInnerFeatureEnum.AIFocusMode,
            props: { options, value, onChange, disabled, allowClear: false },
          },
        ]}
      />
    )
    const { rerender } = render(input('code'))
    const scene = screen.getByRole('combobox', { name: 'AiAgengt.focusMode' })
    expect(screen.getByTitle('代码审计')).toBeInTheDocument()
    expect(scene.closest('.ant-select')?.querySelector('.ant-select-clear')).toBeNull()

    clickSceneSelector(scene)
    fireEvent.click(await screen.findByText('技能审计'))
    expect(onChange).toHaveBeenCalledExactlyOnceWith('skill')
    expect(grpcQueryAIFocus).not.toHaveBeenCalled()

    rerender(input('skill', true))
    expect(screen.getByRole('combobox', { name: 'AiAgengt.focusMode' })).toBeDisabled()
    expect(screen.getByTitle('技能审计')).toBeInTheDocument()
  })

  it('底栏加号打开资料弹窗，选择或取消附件时保持打开', async () => {
    const { ref } = await setup()
    const trigger = screen.getByRole('button', { name: 'AIChatTextarea.addMaterials' })
    expect(screen.queryByText('AIChatTextarea.addMaterials')).toBeNull()
    expect(trigger).not.toHaveTextContent('AIChatTextarea.addMaterials')
    fireEvent.click(trigger)
    const panel = await screen.findByRole('dialog', { name: 'AIChatTextarea.addMaterials' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('data-menu-open', 'true')
    expect(within(panel).getByText('AIMentionTabs.skill')).toBeInTheDocument()
    expect(within(panel).queryByRole('button', { name: 'YakitButton.back' })).toBeNull()
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).not.toHaveAttribute('data-menu-open')

    vi.mocked(handleOpenFileSystemDialog)
      .mockResolvedValueOnce({ canceled: true, filePaths: [] })
      .mockResolvedValueOnce({ canceled: false, filePaths: ['/tmp/context.txt'] })
    fireEvent.click(trigger)
    const attachment = await screen.findByRole('menuitem', { name: /^AIAddMaterialsPopover\.attachment / })
    expect(trigger).toHaveAttribute('data-menu-open', 'true')
    await act(async () => fireEvent.click(attachment))
    expect(handleOpenFileSystemDialog).toHaveBeenCalledWith({
      title: 'AIAddMaterialsPopover.attachment',
      properties: ['openFile', 'multiSelections'],
    })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(ref.current?.getValue()).toBe('')

    fireEvent.click(attachment)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await waitFor(() => expect(ref.current?.getValue()).toContain('/tmp/context.txt'))
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('从底栏资料菜单添加文件夹后随消息发送', async () => {
    vi.mocked(handleOpenFileSystemDialog).mockResolvedValueOnce({ canceled: false, filePaths: ['/tmp/context'] })
    const { send, onSubmit } = await setup('正文')
    fireEvent.click(screen.getByRole('button', { name: 'AIChatTextarea.addMaterials' }))
    const menu = await screen.findByRole('menu')
    await act(async () => fireEvent.click(within(menu).getByText('AIAddMaterialsPopover.addFolder')))
    expect(handleOpenFileSystemDialog).toHaveBeenCalledWith({
      title: 'AIAddMaterialsPopover.addFolder',
      properties: ['openDirectory', 'multiSelections'],
    })
    fireEvent.click(send)
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        mentionList: [
          expect.objectContaining({
            mentionId: '/tmp/context',
            mentionType: 'folder',
            mentionSource: 'attachment',
          }),
        ],
      }),
    )
  })

  it('已选流量和文件系统资料同步给欢迎页，附件不计入文件', async () => {
    const { ref, onWorkspaceAddedChange } = await setup()
    editors[0].action((ctx) => ctx.get(editorViewCtx).setProps({ handleScrollToSelection: () => true }))
    act(() => {
      ref.current?.setHttpFlow(['11'])
      ref.current?.setMention({ mentionType: 'file', mentionId: '/tmp/a.txt', mentionName: '/tmp/a.txt' })
      ref.current?.setMention({
        mentionType: 'file',
        mentionId: '/tmp/b.txt',
        mentionName: '/tmp/b.txt',
        mentionSource: 'attachment',
      })
    })
    await waitFor(() => expect(onWorkspaceAddedChange).toHaveBeenLastCalledWith({ risk: 0, traffic: 1, fileSystem: 1 }))
  })

  it('图片附件可随草稿恢复和发送，从附件列表删除时保留正文图片', async () => {
    const { ref, send, onSubmit } = await setup('正文')
    editors[0].action((ctx) => ctx.get(editorViewCtx).setProps({ handleScrollToSelection: () => true }))
    const imagePath = 'C:\\files\\context_image.PNG'
    const textPath = 'C:\\files\\context.txt'
    vi.mocked(handleOpenFileSystemDialog).mockResolvedValueOnce({ canceled: false, filePaths: [imagePath, textPath] })
    const [trigger] = screen.getAllByRole('button', { name: 'AIChatTextarea.addMaterials' })
    fireEvent.click(trigger)
    const attachment = await screen.findByRole('menuitem', { name: /^AIAddMaterialsPopover\.attachment / })
    await act(async () => fireEvent.click(attachment))
    expect(screen.getByRole('img', { name: imagePath })).toHaveAttribute('src', imagePath)

    const saved = ref.current?.getValue() ?? ''
    act(() => ref.current?.setValue(saved))
    expect(screen.getByRole('img', { name: imagePath })).toBeInTheDocument()
    fireEvent.click(send)
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        imageList: [imagePath],
        mentionList: [expect.objectContaining({ mentionId: textPath, mentionSource: 'attachment' })],
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'AIChatTextarea.otherMaterials 2' }))
    const summary = await screen.findByRole('dialog', { name: 'AIAddMaterialsPopover.addedOtherMaterials' })
    await act(async () => fireEvent.click(within(summary).getByText('AIAddMaterialsPopover.attachments')))
    const panel = await screen.findByRole('dialog', { name: 'AIChatTextarea.addMaterials' })
    expect(within(panel).getByText('(2)')).toBeInTheDocument()
    const thumbnail = within(panel).getByRole('img', { name: 'context_image.PNG' })
    expect(thumbnail).toHaveAttribute('src', toAtomFileUrl(imagePath))
    expect(within(panel).queryByRole('img', { name: 'context.txt' })).not.toBeInTheDocument()
    fireEvent.error(thumbnail)
    expect(thumbnail).not.toBeInTheDocument()
    expect(within(panel).getByTitle(imagePath)).toBeInTheDocument()
    const removeButtons = within(panel).getAllByRole('button', { name: /^YakitButton\.delete / })
    expect(removeButtons[0]).toHaveAccessibleName('YakitButton.delete context_image.PNG')
    await act(async () => fireEvent.click(removeButtons[0]))
    expect(screen.getByRole('img', { name: imagePath })).toHaveAttribute('src', imagePath)
    expect(within(panel).getByText('(1)')).toBeInTheDocument()
    expect(within(panel).queryByRole('button', { name: 'YakitButton.delete context_image.PNG' })).toBeNull()
  })

  it('粘贴的图片保存前后都在附件列表显示，发送时只提交图片路径', async () => {
    const { ref, send, onSubmit } = await setup('正文')
    const pendingPath = 'blob:clipboard-image'
    const savedPath = '/draft/image_123.png'
    act(() => ref.current?.setValue(`正文 ![clipboard.png](${pendingPath} "ai-attachment")`))

    fireEvent.click(screen.getByRole('button', { name: 'AIChatTextarea.otherMaterials 1' }))
    const summary = await screen.findByRole('dialog', { name: 'AIAddMaterialsPopover.addedOtherMaterials' })
    await act(async () => fireEvent.click(within(summary).getByText('AIAddMaterialsPopover.attachments')))
    const panel = await screen.findByRole('dialog', { name: 'AIChatTextarea.addMaterials' })
    expect(within(panel).getByText('(1)')).toBeInTheDocument()
    expect(within(panel).getByRole('img', { name: 'clipboard.png' })).toHaveAttribute('src', pendingPath)
    expect(getLocalFileLinkInfo).not.toHaveBeenCalledWith(pendingPath, true)
    fireEvent.click(send)
    expect(onSubmit).not.toHaveBeenCalled()

    await act(async () => {
      editors[0].action((ctx) => {
        const view = ctx.get(editorViewCtx)
        const { doc, tr } = view.state
        doc.descendants((node, pos) => {
          if (node.type.name !== 'image' || node.attrs.src !== pendingPath) return
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: savedPath })
        })
        view.dispatch(tr)
      })
    })
    expect(within(panel).getByText('(1)')).toBeInTheDocument()
    const savedThumbnail = await within(panel).findByRole('img', { name: 'image_123.png' })
    expect(savedThumbnail).toHaveAttribute('src', toAtomFileUrl(savedPath))
    await waitFor(() => expect(getLocalFileLinkInfo).toHaveBeenCalledExactlyOnceWith(savedPath, true))
    fireEvent.click(send)
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ imageList: [savedPath], mentionList: [] }),
    )
    await act(async () =>
      fireEvent.click(within(panel).getByRole('button', { name: 'YakitButton.delete image_123.png' })),
    )
    expect(within(panel).getByText('(0)')).toBeInTheDocument()
    expect(extractDataWithMilkdown(editors[0]).imageList).toEqual([savedPath])
  })

  it('附件选择器拒绝超过 10 个的批次，并允许一次添加 10 个', async () => {
    const { send, onSubmit } = await setup('正文')
    editors[0].action((ctx) => ctx.get(editorViewCtx).setProps({ handleScrollToSelection: () => true }))
    const filePaths = Array.from({ length: 11 }, (_, index) => `/tmp/attachment-${index}.txt`)
    vi.mocked(handleOpenFileSystemDialog)
      .mockResolvedValueOnce({ canceled: false, filePaths })
      .mockResolvedValueOnce({ canceled: false, filePaths: filePaths.slice(0, 10) })
    const [trigger] = screen.getAllByRole('button', { name: 'AIChatTextarea.addMaterials' })
    fireEvent.click(trigger)
    const attachment = await screen.findByRole('menuitem', { name: /^AIAddMaterialsPopover\.attachment / })
    await act(async () => fireEvent.click(attachment))
    expect(yakitNotify).toHaveBeenCalledWith('warning', '选中 11 个，最多 10 个')
    expect(extractDataWithMilkdown(editors[0]).mentions).toHaveLength(0)

    await act(async () => fireEvent.click(attachment))
    fireEvent.click(send)
    expect(onSubmit.mock.calls[0][0].mentionList?.map((item) => item.mentionId)).toEqual(filePaths.slice(0, 10))
  })

  it('文件系统引用按会话同步，取消保留同路径附件，正文删除同步清空', async () => {
    const { ref } = await setup('正文')
    editors[0].action((ctx) => ctx.get(editorViewCtx).setProps({ handleScrollToSelection: () => true }))
    const path = '/tmp/example.txt'
    act(() => {
      ref.current?.setMention({ mentionType: 'file', mentionId: path, mentionName: path })
      ref.current?.setMention({ mentionType: 'file', mentionId: path, mentionName: path })
      ref.current?.setMention({ mentionType: 'file', mentionId: path, mentionName: path, mentionSource: 'attachment' })
    })
    expect(fileSessions.get('file-session')!.rawData.draftMaterials.files).toHaveLength(1)
    act(() => emiter.emit('removeAIFileMaterial', JSON.stringify({ sessionId: 'another-session', path })))
    expect(extractDataWithMilkdown(editors[0]).mentions).toHaveLength(3)
    act(() => emiter.emit('removeAIFileMaterial', JSON.stringify({ sessionId: 'file-session', path })))
    expect(extractDataWithMilkdown(editors[0]).mentions.map((item) => item.mentionSource)).toEqual(['attachment'])
    expect(fileSessions.get('file-session')!.rawData.draftMaterials.files).toEqual([])
    act(() => ref.current?.setMention({ mentionType: 'file', mentionId: path, mentionName: path }))
    act(() => ref.current?.setValue('正文'))
    expect(fileSessions.get('file-session')!.rawData.draftMaterials.files).toEqual([])
  })

  it('列表添加的技能只进资料栏，正文提及同时显示在两处并随消息发送', async () => {
    vi.mocked(grpcQueryAIForge).mockImplementation(async ({ Pagination, Filter }) => ({
      Pagination,
      Data: [
        { Id: 1, ForgeName: Filter?.Keyword || '初始技能', ForgeType: 'skillmd', Description: '技能说明' },
        { Id: 2, ForgeName: '正文技能', ForgeType: 'skillmd' },
      ],
      Total: 2,
    }))
    const { ref, onSubmit, send } = await setup('正文')
    editors[0].action((ctx) => ctx.get(editorViewCtx).setProps({ handleScrollToSelection: () => true }))
    const [trigger] = screen.getAllByRole('button', { name: 'AIChatTextarea.addMaterials' })
    fireEvent.click(trigger)
    const panel = await screen.findByRole('dialog', { name: 'AIChatTextarea.addMaterials' })
    fireEvent.click(within(panel).getByText('AIMentionTabs.skill'))
    expect(within(panel).getByRole('button', { name: 'YakitButton.back' })).toBeInTheDocument()
    expect(await within(panel).findByText('技能说明')).toBeInTheDocument()
    fireEvent.change(within(panel).getByRole('textbox', { name: 'YakitInput.search' }), {
      target: { value: '目标技能' },
    })
    fireEvent.click(await within(panel).findByRole('button', { name: 'YakitButton.add 目标技能' }))
    expect(ref.current?.getValue()).toBe('正文')
    act(() => {
      editors[0].action(
        callCommand(aiMentionCommand.key, { mentionType: 'forge', mentionId: '2', mentionName: '正文技能' }),
      )
    })
    expect(ref.current?.getValue()).toContain('正文技能')
    expect(ref.current?.getValue()).not.toContain('目标技能')
    fireEvent.click(send)
    const submitted = onSubmit.mock.calls[0][0]
    expect(submitted.mentionList?.map(({ mentionName }) => mentionName)).toEqual(['目标技能', '正文技能'])
    expect(parseMentions(submitted.qs).map(({ mentionId }) => mentionId)).toEqual(['1', '2'])

    fireEvent.change(within(panel).getByRole('textbox', { name: 'YakitInput.search' }), { target: { value: '' } })
    const picker = panel
    const cancel = await within(picker).findByRole('button', { name: 'YakitButton.cancel 初始技能' })
    expect(cancel).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(cancel)
    expect(ref.current?.getValue()).toContain('正文技能')

    fireEvent.click(within(picker).getByRole('button', { name: 'YakitButton.cancel 正文技能' }))
    expect(ref.current?.getValue()).toContain('正文技能')
    fireEvent.click(send)
    expect(onSubmit.mock.calls[1][0].mentionList?.map(({ mentionId }) => mentionId)).toEqual(['2'])

    fireEvent.click(within(picker).getByRole('button', { name: 'YakitButton.add 正文技能' }))
    act(() => {
      editors[0].action((ctx) => {
        const view = ctx.get(editorViewCtx)
        const { doc, tr } = view.state
        doc.descendants((node, position) => {
          if (node.type.name === aiMentionCustomId && node.attrs.mentionId === '2') {
            tr.delete(position, position + node.nodeSize)
          }
        })
        view.dispatch(tr)
      })
    })
    fireEvent.click(send)
    expect(onSubmit.mock.calls[2][0].mentionList).toEqual([])
    expect(ref.current?.getValue()).toBe('正文')
    fireEvent.click(trigger)
    fireEvent.click(trigger)
    const menu = await screen.findByRole('dialog', { name: 'AIChatTextarea.addMaterials' })
    expect(within(menu).queryByRole('button', { name: 'YakitButton.back' })).toBeNull()
    expect(within(menu).getByText('AIMentionTabs.tool')).toBeInTheDocument()
  })

  it('资料筛选默认显示全部，已添加可搜索未加载的提及并取消', async () => {
    vi.mocked(grpcQueryAIForge).mockImplementation(async ({ Pagination }) => ({
      Pagination,
      Data: [{ Id: 1, ForgeName: '目录技能', ForgeType: 'skillmd' }],
      Total: 1,
    }))
    const { ref } = await setup('正文')
    editors[0].action((ctx) => ctx.get(editorViewCtx).setProps({ handleScrollToSelection: () => true }))
    act(() => {
      ref.current?.setMention({ mentionType: 'forge', mentionId: '20', mentionName: '未加载技能' })
      ref.current?.setMention({ mentionType: 'forge', mentionId: '21', mentionName: '另一项技能' })
    })
    const trigger = screen.getByRole('button', { name: 'AIChatTextarea.addMaterials' })
    fireEvent.click(trigger)
    const panel = await screen.findByRole('dialog', { name: 'AIChatTextarea.addMaterials' })
    fireEvent.click(within(panel).getByText('AIMentionTabs.skill'))
    expect(await within(panel).findByRole('button', { name: 'YakitButton.add 目录技能' })).toBeInTheDocument()
    expect(trigger).toHaveAttribute('data-menu-open', 'true')
    fireEvent.click(within(panel).getByRole('button', { name: 'AIMentionTabs.all' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'YakitButton.added' }))
    expect(within(panel).getByRole('button', { name: 'YakitButton.added' })).toHaveAttribute('aria-expanded', 'false')
    expect(await within(panel).findByRole('button', { name: 'YakitButton.cancel 未加载技能' })).toBeInTheDocument()
    expect(within(panel).queryByText('目录技能')).toBeNull()

    const search = within(panel).getByRole('textbox', { name: 'YakitInput.search' })
    fireEvent.change(search, { target: { value: '未加载' } })
    expect(within(panel).queryByText('另一项技能')).toBeNull()
    fireEvent.click(await within(panel).findByRole('button', { name: 'YakitButton.cancel 未加载技能' }))
    expect(within(panel).getByText('YakitEmpty.noData')).toBeInTheDocument()
    expect(ref.current?.getValue()).toContain('未加载技能')
    expect(grpcQueryAIForge).toHaveBeenCalledTimes(1)

    fireEvent.click(within(panel).getByRole('button', { name: 'YakitButton.added' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'AIMentionTabs.all' }))
    expect(await within(panel).findByRole('button', { name: 'YakitButton.add 目录技能' })).toBeInTheDocument()
  })

  it('技能目录行 hover 不弹出正文预览，保留简介和添加取消操作', async () => {
    vi.mocked(grpcQueryAIForge).mockResolvedValue({
      Pagination: { Page: 1, Limit: 20, OrderBy: 'id', Order: 'desc' },
      Total: 1,
      Data: [
        {
          Id: 1,
          ForgeName: 'review-skill',
          ForgeVerboseName: '审计技能',
          ForgeType: 'skillmd',
          Description: '审计简介',
        },
      ],
    })
    await setup('正文')
    fireEvent.click(screen.getAllByRole('button', { name: 'AIChatTextarea.addMaterials' })[0])
    const panel = await screen.findByRole('dialog', { name: 'AIChatTextarea.addMaterials' })
    fireEvent.click(within(panel).getByText('AIMentionTabs.skill'))
    const add = await within(panel).findByRole('button', { name: 'YakitButton.add 审计技能' })
    expect(within(panel).getByText('审计简介')).toBeInTheDocument()
    expect(screen.queryByTestId('skill-preview')).not.toBeInTheDocument()
    fireEvent.mouseEnter(add.parentElement!.parentElement!)
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(screen.queryByTestId('skill-preview')).not.toBeInTheDocument()
    fireEvent.click(add)
    expect(within(panel).getByRole('button', { name: 'YakitButton.cancel 审计技能' })).toBeInTheDocument()
    fireEvent.mouseLeave(add.parentElement!.parentElement!)
    expect(screen.queryByTestId('skill-preview')).not.toBeInTheDocument()

    fireEvent.click(within(panel).getByRole('button', { name: 'AIMentionTabs.all' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'YakitButton.added' }))
    const cancel = await within(panel).findByRole('button', { name: 'YakitButton.cancel 审计技能' })
    fireEvent.mouseEnter(cancel.parentElement!.parentElement!)
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(screen.queryByTestId('skill-preview')).not.toBeInTheDocument()
    fireEvent.click(cancel)
  })

  it('从旧 Markdown 和 DOM 技能引用恢复原名', async () => {
    await setup('正文')
    editors[0].action((ctx) => {
      const markdown =
        ':mention[审计技能]{mentionId="1" mentionType="forge" mentionName="审计技能" forgeName="review-skill"}'
      const doc = ctx.get(parserCtx)(markdown)!
      expect(doc.firstChild!.firstChild!.attrs).toMatchObject({ mentionName: '审计技能', name: 'review-skill' })

      const container = document.createElement('div')
      const element = document.createElement('div')
      element.dataset.type = aiMentionCustomId
      element.dataset.mentionId = '1'
      element.dataset.mentionType = 'forge'
      element.dataset.mentionName = '审计技能'
      element.dataset.forgeName = 'review-skill'
      element.textContent = '审计技能'
      container.append(element)
      const restored = DOMParser.fromSchema(doc.type.schema).parse(container)
      expect(restored.firstChild!.firstChild!.attrs).toMatchObject({ mentionName: '审计技能', name: 'review-skill' })
    })
  })

  it('技能分页加载时显示指示器，加载完成后可滚到末尾提示', async () => {
    let finishPage!: () => void
    const nextPage = new Promise<void>((resolve) => {
      finishPage = resolve
    })
    vi.mocked(grpcQueryAIForge).mockImplementation(async ({ Pagination }) => {
      if (Pagination.Page === 2) await nextPage
      return {
        Pagination,
        Data: Array.from({ length: Pagination.Page === 1 ? 20 : 1 }, (_, index) => {
          const id = (Pagination.Page - 1) * 20 + index + 1
          return { Id: id, ForgeName: `技能 ${id}`, ForgeType: 'skillmd' }
        }),
        Total: 21,
      }
    })
    await setup()
    const [trigger] = screen.getAllByRole('button', { name: 'AIChatTextarea.addMaterials' })
    fireEvent.click(trigger)
    const panel = await screen.findByRole('dialog', { name: 'AIChatTextarea.addMaterials' })
    fireEvent.click(within(panel).getByText('AIMentionTabs.skill'))
    const first = await within(panel).findByRole('button', { name: 'YakitButton.add 技能 1' })
    expect(within(panel).queryByRole('button', { name: 'YakitButton.add 技能 20' })).toBeNull()
    expect(within(panel).queryByText('YakitEmpty.noMoreData')).toBeNull()
    const scroller = first.closest<HTMLElement>('.container')!
    fireEvent.scroll(scroller, { target: { scrollTop: 290 } })
    const spinner = await within(scroller).findByRole('img', { name: 'loading' })
    expect(within(panel).queryByText('YakitEmpty.noMoreData')).toBeNull()
    await act(async () => finishPage())
    const last = await within(panel).findByRole('button', { name: 'YakitButton.add 技能 21' })
    const footer = within(panel).getByText('YakitEmpty.noMoreData')
    expect(footer.previousElementSibling).toContainElement(last)
    expect(spinner).not.toBeInTheDocument()
    expect(vi.mocked(grpcQueryAIForge).mock.calls.map(([request]) => request.Pagination.Page)).toEqual([1, 2])
  })

  it('知识库首项展示所有知识库，搜索时保留且可添加、取消和提交', async () => {
    useKnowledgeBase.setState({
      knowledgeBases: [{ ID: '1', KnowledgeBaseName: '测试知识库' } as KnowledgeBaseItem],
    })
    try {
      const { ref, send, onSubmit } = await setup()
      fireEvent.click(screen.getAllByRole('button', { name: 'AIChatTextarea.addMaterials' })[0])
      const panel = await screen.findByRole('dialog', { name: 'AIChatTextarea.addMaterials' })
      fireEvent.click(within(panel).getByText('AIMentionTabs.knowledgeBase'))
      const allName = 'AIMentionTabs.allKnowledgeBase'
      expect((await within(panel).findAllByRole('button', { name: /^YakitButton.add / }))[0]).toHaveAccessibleName(
        `YakitButton.add ${allName}`,
      )
      fireEvent.change(within(panel).getByRole('textbox', { name: 'YakitInput.search' }), {
        target: { value: '没有匹配的知识库' },
      })
      expect(within(panel).queryByText('测试知识库')).toBeNull()
      fireEvent.click(await within(panel).findByRole('button', { name: `YakitButton.add ${allName}` }))
      expect(ref.current?.getValue()).toBe('')
      fireEvent.click(await within(panel).findByRole('button', { name: `YakitButton.cancel ${allName}` }))
      fireEvent.click(await within(panel).findByRole('button', { name: `YakitButton.add ${allName}` }))
      fireEvent.click(send)
      expect(onSubmit.mock.calls[0][0].mentionList).toEqual([
        expect.objectContaining({ mentionId: '@所有知识库', mentionType: 'knowledgeBase' }),
      ])
    } finally {
      act(() => useKnowledgeBase.getState().clearAll())
    }
  })

  it('知识库数量相同时，虚拟列表也会更新名称和搜索结果', async () => {
    useKnowledgeBase.setState({
      knowledgeBases: [
        { ID: '1', KnowledgeBaseName: '旧知识库' } as KnowledgeBaseItem,
        { ID: '2', KnowledgeBaseName: '第二知识库' } as KnowledgeBaseItem,
      ],
    })
    try {
      await setup()
      const [trigger] = screen.getAllByRole('button', { name: 'AIChatTextarea.addMaterials' })
      fireEvent.click(trigger)
      const panel = await screen.findByRole('dialog', { name: 'AIChatTextarea.addMaterials' })
      fireEvent.click(within(panel).getByText('AIMentionTabs.knowledgeBase'))
      const search = within(panel).getByRole('textbox', { name: 'YakitInput.search' })
      fireEvent.change(search, { target: { value: '旧' } })
      expect(await within(panel).findByText('旧知识库')).toBeInTheDocument()
      fireEvent.change(search, { target: { value: '第二' } })
      expect(await within(panel).findByText('第二知识库')).toBeInTheDocument()
      act(() => useKnowledgeBase.getState().editKnowledgeBase('2', { KnowledgeBaseName: '第二知识库已改名' }))
      expect(await within(panel).findByText('第二知识库已改名')).toBeInTheDocument()
    } finally {
      act(() => useKnowledgeBase.getState().clearAll())
    }
  })

  it('工具和知识库使用各自的数据源，选中后可随消息发送', async () => {
    vi.mocked(grpcGetAIToolList).mockImplementation(async ({ Pagination }) => ({
      Pagination,
      Tools: [
        {
          ID: 2,
          Name: 'query-tool',
          VerboseName: 'Legacy query tool',
          VerboseNameI18n: { Zh: '查询工具', En: 'Query Tool' },
          Description: '工具说明',
        } as Awaited<ReturnType<typeof grpcGetAIToolList>>['Tools'][number],
      ],
      Total: 1,
    }))
    useKnowledgeBase.setState({
      knowledgeBases: [
        { ID: '3', KnowledgeBaseName: '测试知识库', KnowledgeBaseDescription: '知识库说明' } as KnowledgeBaseItem,
      ],
    })
    try {
      const { ref, send, onSubmit } = await setup()
      const [trigger] = screen.getAllByRole('button', { name: 'AIChatTextarea.addMaterials' })
      const openPopover = async () => {
        fireEvent.click(trigger)
        return screen.findByRole('dialog', { name: 'AIChatTextarea.addMaterials' })
      }
      const panel = await openPopover()
      expect(grpcQueryAIForge).not.toHaveBeenCalled()
      expect(grpcGetAIToolList).not.toHaveBeenCalled()
      for (const [category, description, name] of [
        ['AIMentionTabs.tool', '工具说明', '查询工具'],
        ['AIMentionTabs.knowledgeBase', '知识库说明', '测试知识库'],
      ]) {
        fireEvent.click(within(panel).getByText(category))
        expect(await within(panel).findByText(description)).toBeInTheDocument()
        fireEvent.click(within(panel).getByRole('button', { name: `YakitButton.add ${name}` }))
        fireEvent.click(within(panel).getByRole('button', { name: 'YakitButton.back' }))
      }
      expect(grpcGetAIToolList).toHaveBeenCalledTimes(1)
      expect(grpcQueryAIForge).not.toHaveBeenCalled()
      expect(ref.current?.getValue()).toBe('')
      expect(send).toBeEnabled()
      fireEvent.click(send)
      const submitted = onSubmit.mock.calls[0][0]
      expect(submitted.mentionList?.map(({ mentionType }) => mentionType)).toEqual(['tool', 'knowledgeBase'])
      expect(submitted.mentionList?.[0]).toMatchObject({ mentionName: '查询工具', name: 'query-tool' })
      expect(parseMentions(submitted.qs).map(({ mentionId }) => mentionId)).toEqual(['2', '3'])
      editors[0].action((ctx) => {
        const doc = ctx.get(parserCtx)(submitted.qs)!
        const node = doc.firstChild!.firstChild!
        expect(node.attrs).toMatchObject({ mentionName: '查询工具', name: 'query-tool' })
        const container = document.createElement('div')
        container.append(DOMSerializer.fromSchema(doc.type.schema).serializeNode(node))
        const restored = DOMParser.fromSchema(doc.type.schema).parse(container)
        expect(restored.firstChild!.firstChild!.attrs).toMatchObject({ mentionName: '查询工具', name: 'query-tool' })
      })
      expect(grpcQueryAIFocus).not.toHaveBeenCalled()
      expect(within(panel).queryByText('AiAgengt.focusMode')).not.toBeInTheDocument()
      act(() => ref.current?.setValue(''))
    } finally {
      act(() => useKnowledgeBase.getState().clearAll())
    }
  })

  it.each([
    ['zh', '测试场景'],
    ['zh-TW', '测试场景'],
    ['en', 'scene'],
  ])('在底栏选择、同步和清空场景（%s）', async (language, label) => {
    i18n.language = language
    vi.mocked(grpcQueryAIFocus).mockResolvedValue({
      Data: [
        {
          Name: 'scene',
          VerboseName: 'Scene',
          VerboseNameZh: '测试场景',
          Description: 'Scenario description',
          DescriptionZh: '场景说明',
          OutputExamplePrompt: '',
          UsagePrompt: '',
        },
      ],
    })

    const { ref, send, onSubmit } = await setup('正文')
    const scene = screen.getByRole('combobox', { name: 'AiAgengt.focusMode' })
    expect(grpcQueryAIFocus).not.toHaveBeenCalled()
    if (language === 'en') fireEvent.keyDown(scene, { key: 'ArrowDown', keyCode: 40 })
    else clickSceneSelector(scene)
    fireEvent.click(await screen.findByText(label))
    expect(scene).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByTitle(label)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /AIChatTextarea.otherMaterials/ })).not.toBeInTheDocument()
    fireEvent.click(send)
    expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ focusMode: 'scene' }))

    act(() => ref.current?.setMention({ mentionType: 'focusMode', mentionId: 'fallback', mentionName: 'fallback' }))
    expect(screen.getByTitle('fallback')).toBeInTheDocument()
    const clear = scene.closest('.ant-select')!.querySelector('.ant-select-clear')!
    fireEvent.mouseDown(clear)
    expect(scene).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(send)
    expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ focusMode: undefined }))
  })

  it('同一知识库重复加入时不追加', async () => {
    const { ref } = await setup()
    editors[0].action((ctx) => ctx.get(editorViewCtx).setProps({ handleScrollToSelection: () => true }))
    const current = { mentionType: 'knowledgeBase' as const, lock: true, unique: true }
    act(() => {
      ref.current?.setMention({ ...current, mentionId: 'kb-a', mentionName: '知识库A' })
      ref.current?.setMention({ ...current, mentionId: 'kb-a', mentionName: '知识库A' })
      ref.current?.setMention({ ...current, mentionId: 'kb-b', mentionName: '知识库B' })
    })
    expect(extractDataWithMilkdown(editors[0]).mentions.map((item) => item.mentionId)).toEqual(['kb-a', 'kb-b'])
  })

  it('从输入框删除浏览器实例或技能时同步移除对应的资料', async () => {
    const { ref } = await setup('正文')
    editors[0].action((ctx) => ctx.get(editorViewCtx).setProps({ handleScrollToSelection: () => true }))
    act(() => {
      ref.current?.setMention({ mentionType: 'browser', mentionId: 'browser-A', mentionName: 'A' })
      ref.current?.setMention({ mentionType: 'forge', mentionId: 'skill-1', mentionName: '技能 A' })
    })

    const removeMention = (mentionId: string) => {
      act(() =>
        editors[0].action((ctx) => {
          const view = ctx.get(editorViewCtx)
          const { doc, tr } = view.state
          doc.descendants((node, position) => {
            if (node.type.name === aiMentionCustomId && node.attrs.mentionId === mentionId) {
              tr.delete(position, position + node.nodeSize)
            }
          })
          view.dispatch(tr)
        }),
      )
    }
    removeMention('browser-A')
    expect(ref.current?.getValue()).not.toContain('browser-A')
    expect(ref.current?.getValue()).toContain('skill-1')
    removeMention('skill-1')

    expect(ref.current?.getValue()).toBe('正文')
  })

  it.each(['点击', '回车'])('%s 提交等待所有图片路径写回后，才读取最新正文和附件', async (method) => {
    const { ref, onSubmit, send } = await setup('正文')
    act(() => ref.current?.setValue('正文 ![一](blob:first) ![二](blob:second)'))
    const submit = () => {
      if (method === '点击') fireEvent.click(send)
      else fireEvent.keyDown(screen.getByTestId('editor'), { key: 'Enter', code: 'Enter', keyCode: 13 })
    }
    // 转换期间尚未调用保存 IPC，编辑器仍持有 blob 地址。
    submit()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(yakitNotify).toHaveBeenLastCalledWith('warning', 'AIMilkdownInput.imagesNotSaved')

    const finishImage = (src: string, path: string) => {
      act(() => {
        editors[0].action((ctx) => {
          const view = ctx.get(editorViewCtx)
          const tr = view.state.tr
          view.state.doc.descendants((node, pos) => {
            if (node.type.name === 'image' && node.attrs.src === src) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: path })
            }
          })
          view.dispatch(tr)
        })
      })
    }
    finishImage('blob:first', '/draft/image_1.png')
    // 一张保存完成、另一张仍在写盘，不能提前提交。
    submit()
    expect(onSubmit).not.toHaveBeenCalled()

    finishImage('blob:second', '/draft/image_2.png')
    submit()
    expect(onSubmit).toHaveBeenCalledTimes(1)
    const payload = onSubmit.mock.calls[0][0]
    expect(payload.imageList).toEqual(['/draft/image_1.png', '/draft/image_2.png'])
    expect(payload.qs).toContain('/draft/image_1.png')
    expect(payload.qs).toContain('/draft/image_2.png')
    expect(payload.qs).not.toContain('blob:')
    expect(payload.showQS).toBe(payload.qs)
    expect(payload.sessionId).toBe('draft-session')
  })

  it('保存失败后残留的 blob 图片持续阻止提交，移除后可发送剩余正文', async () => {
    const { ref, onSubmit, send } = await setup('正文')
    act(() => ref.current?.setValue('正文 ![失败图片](blob:failed)'))
    fireEvent.click(send)
    fireEvent.click(send)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(yakitNotify).toHaveBeenCalledTimes(2)
    act(() => ref.current?.setValue('正文'))
    fireEvent.click(send)
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ qs: '正文', imageList: [] }))
  })
})

describe('流量勾选引用逻辑', () => {
  it.each([
    { type: 'risk', ids: ['21', '22'], displayText: '#21, #22', isSummary: false },
    { type: 'risk', ids: ['21', '22', '23'], displayText: '勾选了 3 条漏洞风险', isSummary: true },
  ])('风险勾选以一个引用发送和回显（摘要：$isSummary）', async (reference) => {
    const onSubmit = vi.fn()
    const onWorkspaceAddedChange = vi.fn()
    const view = render(
      <AIChatTextarea
        chatDataStoreKey="test"
        selectedRiskIds={reference.ids}
        onSubmit={onSubmit}
        onWorkspaceAddedChange={onWorkspaceAddedChange}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('editor').querySelector('.ProseMirror')).not.toBeNull())
    await act(async () => {})
    expect(onWorkspaceAddedChange).toHaveBeenCalledWith({
      risk: reference.ids.length,
      traffic: 0,
      fileSystem: 0,
    })
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.send' }))
    const payload: AIChatTextareaSubmit = onSubmit.mock.calls[0][0]
    expect(payload.resourceReferences).toEqual([reference])
    expect(payload.mentionList).toEqual([])
    expect(payload.qs).toContain(':risk[')
    expect(payload.qs).toContain(`ids="${reference.ids.join(',')}"`)
    expect(payload.showQS).toBe(payload.qs)
    editors[0].action((ctx) => {
      const doc = ctx.get(parserCtx)(payload.qs)!
      const node = doc.firstChild!.firstChild!
      expect(doc.firstChild!.childCount).toBe(1)
      expect(node.type.name).toBe(aiResourceReferenceCustomId)
      expect(node.attrs).toMatchObject(reference)
      const container = document.createElement('div')
      container.append(DOMSerializer.fromSchema(doc.type.schema).serializeNode(node))
      const restored = DOMParser.fromSchema(doc.type.schema).parse(container)
      expect(restored.firstChild!.firstChild!.attrs).toMatchObject(reference)
    })
    view.rerender(<AIChatTextarea chatDataStoreKey="test" selectedRiskIds={[]} onSubmit={onSubmit} />)
  })

  it.each([
    { type: 'http', directive: 'httpFlow', selectionProp: 'selectedHttpFlowIds' },
    { type: 'risk', directive: 'risk', selectionProp: 'selectedRiskIds' },
  ] as const)('$type 正文和表格按 ID 去重，取消表格勾选后保留正文引用', async ({ type, directive, selectionProp }) => {
    const onSubmit = vi.fn<(value: AIChatTextareaSubmit) => void>()
    const renderInput = (ids: string[]) => (
      <AIChatTextarea
        chatDataStoreKey="test"
        defaultValue={`:${directive}[#7]{ids="7" displayText="#7" isSummary="false"}`}
        {...{ [selectionProp]: ids }}
        onSubmit={onSubmit}
      />
    )
    const view = render(renderInput(['7', '8', '8']))
    await act(async () => {})
    await waitFor(() => expect(screen.getByTestId('editor').querySelector('.ProseMirror')).not.toBeNull())
    const send = screen.getByRole('button', { name: 'YakitButton.send' })
    fireEvent.click(send)
    expect(onSubmit.mock.calls[0][0].resourceReferences).toMatchObject([
      { type, ids: ['7'] },
      { type, ids: ['8'] },
    ])

    view.rerender(renderInput([]))
    fireEvent.click(send)
    expect(onSubmit.mock.calls[1][0].resourceReferences).toMatchObject([{ type, ids: ['7'] }])
  })

  it('编辑已发送的风险引用时保留风险 ID 并继续发送', async () => {
    const { onSubmit, ref, send } = await setup()
    act(() => ref.current?.setValue(':risk[#21, #22]{ids="21,22" displayText="#21, #22" isSummary="false"}'))

    const reference = { type: 'risk', ids: ['21', '22'], displayText: '#21, #22', isSummary: false }
    expect(extractDataWithMilkdown(editors[0]).resourceReferences).toEqual([reference])
    await waitFor(() => expect(send).not.toBeDisabled())
    fireEvent.click(send)
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ resourceReferences: [reference] }))
  })

  it('受控流量选择随属性更新并在发送时使用当前 ID', async () => {
    const onSubmit = vi.fn()
    const view = render(<AIChatTextarea chatDataStoreKey="" selectedHttpFlowIds={['21', '22']} onSubmit={onSubmit} />)
    await waitFor(() => expect(screen.getByTestId('editor').querySelector('.ProseMirror')).not.toBeNull())
    await act(async () => {})
    view.rerender(<AIChatTextarea chatDataStoreKey="" selectedHttpFlowIds={['22']} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.send' }))
    expect(onSubmit.mock.calls[0][0].resourceReferences).toEqual([
      expect.objectContaining({ type: 'http', ids: ['22'] }),
    ])
    view.rerender(<AIChatTextarea chatDataStoreKey="" selectedHttpFlowIds={[]} onSubmit={onSubmit} />)
  })

  it.each([1, 2, 3, 5, 6, 10])('%i 条流量不再显示标签，但保留提交数据、正文和撤销记录', async (count) => {
    const { ref, container, onSubmit, send } = await setup('保留这段正文')
    const editor = editors[0]
    const previousState = editor.action((ctx) => ctx.get(editorViewCtx).state)
    const ids = Array.from({ length: count }, (_, i) => String(i + 1))
    act(() => ref.current?.setHttpFlow(ids))

    expect(screen.queryByText('#1')).not.toBeInTheDocument()
    expect(screen.queryByText(`勾选了 ${count} 条流量`)).not.toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(container.querySelector('.ProseMirror')?.textContent).toBe('保留这段正文')
    expect(editor.action((ctx) => ctx.get(editorViewCtx).state)).toBe(previousState)
    expect(ref.current?.getValue()).toBe('保留这段正文')

    fireEvent.click(send)
    expect(onSubmit.mock.calls[0][0].resourceReferences).toEqual([
      {
        type: 'http',
        ids,
        displayText: count < 3 ? ids.map((id) => '#' + id).join(', ') : `勾选了 ${count} 条流量`,
        isSummary: count >= 3,
      },
    ])
  })

  it('去重、替换和清空勾选后，提交只包含当前选中的流量 ID', async () => {
    const { ref, onSubmit, send } = await setup('正文')
    act(() => ref.current?.setHttpFlow(['1', '2', '2', '']))
    fireEvent.click(send)
    expect(onSubmit.mock.calls[0][0].resourceReferences).toEqual([expect.objectContaining({ ids: ['1', '2'] })])

    act(() => ref.current?.setHttpFlow(['3']))
    fireEvent.click(send)
    expect(onSubmit.mock.calls[1][0].resourceReferences).toEqual([expect.objectContaining({ ids: ['3'] })])

    act(() => ref.current?.setHttpFlow([]))
    fireEvent.click(send)
    expect(onSubmit.mock.calls[2][0]).toEqual(expect.objectContaining({ qs: '正文', resourceReferences: [] }))
    expect(ref.current?.getValue()).toBe('正文')
  })

  it.each(['', '请分析这些流量'])('正文为“%s”时，提交引用快照和可解析的消息协议，不向编辑器写回', async (text) => {
    const { ref, onSubmit, send } = await setup(text)
    act(() => ref.current?.setHttpFlow(['11', '12']))
    expect(send).not.toBeDisabled()
    fireEvent.click(send)
    const payload = onSubmit.mock.calls[0][0]
    expect(payload.resourceReferences).toEqual([
      { type: 'http', ids: ['11', '12'], displayText: '#11, #12', isSummary: false },
    ])
    expect(payload.sessionId).toBe('draft-session')
    expect(payload.qs).toContain(':httpFlow[')
    expect(payload.qs).toContain('ids="11,12"')
    expect(payload.qs).not.toMatch(/\bflowId(?:=|\s|})/)
    expect(payload.showQS).toBe(payload.qs)
    expect(ref.current?.getValue()).toBe(text)
    const parsed = editors[0].action((ctx) => ctx.get(parserCtx)(payload.qs))
    const flowIds: string[][] = []
    parsed?.descendants((node) => {
      if (node.type.name === aiResourceReferenceCustomId) flowIds.push(node.attrs.ids)
    })
    expect(flowIds).toEqual([['11', '12']])
    act(() => ref.current?.setValue(''))
    expect(send).not.toBeDisabled()
    act(() => ref.current?.setHttpFlow([]))
    await waitFor(() => expect(send).toBeDisabled())
    expect(payload.resourceReferences?.[0].ids).toEqual(['11', '12'])
  })

  it('完全为空不可提交；只取消引用恢复空状态；纯正文保持原提交协议', async () => {
    const { ref, onSubmit, send } = await setup()
    expect(send).toBeDisabled()
    act(() => ref.current?.setHttpFlow(['1']))
    expect(send).not.toBeDisabled()
    act(() => ref.current?.setHttpFlow([]))
    expect(send).toBeDisabled()
    fireEvent.keyDown(screen.getByTestId('editor'), { key: 'Enter', code: 'Enter', keyCode: 13 })
    expect(onSubmit).not.toHaveBeenCalled()
    act(() => ref.current?.setValue('只有正文'))
    await waitFor(() => expect(send).not.toBeDisabled())
    fireEvent.click(send)
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ qs: '只有正文', resourceReferences: [] }))
  })

  it.each([
    ['flowId', 'flowId="7"', ['7'], false],
    ['空 flowIds', 'flowId="7" flowIds=""', ['7'], false],
    ['flowIds', 'flowId="7" flowIds="8,9,8"', ['8', '9'], true],
  ])('旧消息 %s 转为 ids 后与外置引用共同提交', async (_, legacyAttrs, ids, isSummary) => {
    const { ref, onSubmit, send } = await setup()
    const displayText = isSummary ? '已选择 2 条流量' : '#7'
    act(() =>
      ref.current?.setValue(
        `:httpFlow[${displayText}]{${legacyAttrs} displayText="${displayText}" isSummary="${isSummary}"}`,
      ),
    )
    act(() => ref.current?.setHttpFlow(['10']))
    fireEvent.click(send)
    expect(onSubmit.mock.calls[0][0].resourceReferences).toEqual([
      expect.objectContaining({ type: 'http', ids, displayText, isSummary }),
      expect.objectContaining({ type: 'http', ids: ['10'] }),
    ])
    expect(extractDataWithMilkdown(editors[0]).resourceReferences).toHaveLength(1)
    expect(onSubmit.mock.calls[0][0].qs).toContain(`:httpFlow[${displayText}]{ids="${ids.join(',')}"`)
    expect(onSubmit.mock.calls[0][0].qs).not.toMatch(/\bflowIds?(?:=|\s|})/)
  })

  it.each([
    ['', '7'],
    ['8,9', '8,9'],
    ['8, 9,8, ,', '8,9'],
  ])('旧 DOM 引用兼容 flowId，优先保留 flowIds=%s', async (flowIds, expected) => {
    await setup()
    editors[0].action((ctx) => {
      const { schema } = ctx.get(editorViewCtx).state
      const container = document.createElement('div')
      container.innerHTML = `<div data-type="ai-http-flow-custom" data-flow-id="7" data-flow-ids="${flowIds}" data-display-text="#7">#7</div>`
      const doc = DOMParser.fromSchema(schema).parse(container)
      const node = doc.firstChild!.firstChild!
      expect(node.attrs).toMatchObject({ type: 'http', ids: expected.split(',') })
      expect(node.attrs).not.toHaveProperty('flowId')
      const dom = DOMSerializer.fromSchema(schema).serializeNode(node) as HTMLElement
      expect(dom.getAttribute('data-ids')).toBe(expected)
      expect(dom.hasAttribute('data-flow-id')).toBe(false)
    })
  })

  it('数组流量命令创建数组节点，Markdown 序列化后可还原', async () => {
    await setup()
    act(() => {
      editors[0].action(
        callCommand(aiResourceReferenceCommand.key, {
          type: 'http',
          ids: ['31', '32'],
          displayText: '#31, #32',
          isSummary: false,
        }),
      )
    })
    expect(extractDataWithMilkdown(editors[0]).resourceReferences[0].ids).toEqual(['31', '32'])
    const markdown = editors[0].action(getMarkdown())
    expect(markdown).toContain('ids="31,32"')
    const parsed = editors[0].action((ctx) => ctx.get(parserCtx)(markdown))
    expect(parsed?.firstChild?.firstChild?.attrs.ids).toEqual(['31', '32'])
    expect(parsed?.firstChild?.firstChild?.attrs.isSummary).toBe(false)
  })

  it('各输入框独立使用父级传入的流量选择', async () => {
    const onSubmit = vi.fn()
    const renderInputs = (firstIds: string[], secondIds: string[]) => (
      <>
        <section data-testid="first">
          <AIChatTextarea
            selectedHttpFlowIds={firstIds}
            chatDataStoreKey="first"
            inputFooterLeft={<span />}
            footer={<span />}
          />
        </section>
        <section data-testid="second">
          <AIChatTextarea
            selectedHttpFlowIds={secondIds}
            chatDataStoreKey="second"
            inputFooterLeft={<span />}
            footer={<span />}
            onSubmit={onSubmit}
          />
        </section>
      </>
    )
    const { rerender } = render(renderInputs(['1'], []))
    await waitFor(() => expect(document.querySelectorAll('.ProseMirror')).toHaveLength(2))
    await act(async () => {})
    const firstSend = within(screen.getByTestId('first')).getByRole('button', { name: 'YakitButton.send' })
    const secondSend = within(screen.getByTestId('second')).getByRole('button', { name: 'YakitButton.send' })

    expect(firstSend).not.toBeDisabled()
    expect(secondSend).toBeDisabled()
    rerender(renderInputs([], ['2']))
    expect(firstSend).toBeDisabled()
    expect(secondSend).not.toBeDisabled()
    fireEvent.click(secondSend)
    expect(onSubmit.mock.calls[0][0].resourceReferences).toEqual([expect.objectContaining({ ids: ['2'] })])
  })

  it('编辑器未就绪也可以清空流量选择', () => {
    deferEditor.value = true
    const renderInput = (ids: string[]) => (
      <AIChatTextarea
        selectedHttpFlowIds={ids}
        chatDataStoreKey="deferred"
        inputFooterLeft={<span />}
        footer={<span />}
      />
    )
    const { rerender } = render(renderInput(['1']))
    const send = screen.getByRole('button', { name: 'YakitButton.send' })
    expect(send).not.toBeDisabled()
    rerender(renderInput([]))
    expect(send).toBeDisabled()
  })
})
