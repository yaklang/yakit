import React, { createRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Editor, defaultValueCtx, editorViewCtx, parserCtx, rootCtx } from '@milkdown/kit/core'
import { DOMParser, DOMSerializer } from '@milkdown/kit/prose/model'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { $remark, callCommand, getMarkdown } from '@milkdown/kit/utils'
import directive from 'remark-directive'
import type { AIMilkdownInputProps, AIMilkdownInputRef } from '../../components/aiMilkdownInput/type'
import {
  aiHttpFlowCommand,
  aiHttpFlowCustomPlugin,
} from '../../components/aiMilkdownInput/aiMilkdownHttpFlow/aiHttpFlowPlugin'
import { extractDataWithMilkdown } from '../../components/aiMilkdownInput/utils'
import type { AIChatTextareaRefProps, AIChatTextareaSubmit } from '../type'
import type * as TemplateModule from '../template'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'
import { useHttpFlowSelection } from '@/components/useHttpFlowSelection'
import { yakitNotify } from '@/utils/notification'

const editors: Editor[] = []
const { deferEditor } = vi.hoisted(() => ({ deferEditor: { value: false } }))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string, params?: { count: number }) =>
      key === 'AIMilkdownInput.selectedHttpFlowSummary' ? `勾选了 ${params?.count} 条流量` : key,
  }),
}))
vi.mock('ahooks', async () => ({ ...(await vi.importActual('ahooks')), useInViewport: () => [true] }))
vi.mock('../../aiChatWelcome/hooks/useAIChatDrop', () => ({
  default: function useAIChatDrop() {
    return { isHovering: false, dropRef: useRef(null) }
  },
}))
vi.mock('@/components/MilkdownEditor/utils/utils', () => ({ imgTypes: [] }))
vi.mock('@/utils/notification', () => ({ success: vi.fn(), yakitNotify: vi.fn() }))
vi.mock('@/utils/clipboard', () => ({ setClipboardText: vi.fn() }))
vi.mock('../../aiModelList/aiModelSelect/AIModelSelect', () => ({ AIModelSelect: () => null }))
vi.mock('@/pages/ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect', () => ({ default: () => null }))
vi.mock('@/pages/ai-re-act/aiFocusMode/AIFocusMode', () => ({ AIFocusMode: () => null }))
vi.mock('@/pages/ai-re-act/aiReasoningEffortSelect/AIReasoningEffortSelect', () => ({
  AIReasoningEffortSelect: () => null,
}))
vi.mock('../../aiRunModeSelect/AIRunModeSelect', () => ({ default: () => null }))
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
vi.mock('../../aiChatWelcome/OpenFileDropdown/OpenFileDropdown', () => ({ default: () => null }))
vi.mock('@/pages/ai-re-act/aiReActChat/AIReActComponent', () => ({ UploadFileButton: () => null }))
vi.mock('@/pages/ai-re-act/aiReActTaskChat/AIReActTaskChat', () => ({ AIInputSettingPopover: () => null }))

// 保留真实 Milkdown 文档、解析与序列化，仅隔离文件上传、提及面板等外围 UI。
vi.mock('../../components/aiMilkdownInput/AIMilkdownInput', () => ({
  AIMilkdownInput: React.forwardRef<AIMilkdownInputRef, AIMilkdownInputProps>(function Input(props, ref) {
    const root = useRef<HTMLDivElement>(null)
    useImperativeHandle(ref, () => ({
      getSessionId: () => 'draft-session',
      setImage: vi.fn(),
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
        .use(aiHttpFlowCustomPlugin())
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
    return <div ref={root} data-testid="editor" />
  }),
}))

const { AIChatTextarea } = await compileReactModule<typeof TemplateModule>(import.meta.url, '../template.tsx')

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'], shouldAdvanceTime: true })
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
    vi.clearAllMocks()
  }
})

async function setup(defaultValue = '') {
  const ref = createRef<AIChatTextareaRefProps>()
  const onSubmit = vi.fn<(value: AIChatTextareaSubmit) => void>()
  const onHttpFlowRemove = vi.fn()
  function SelectionHarness() {
    const inputRef = useRef<AIChatTextareaRefProps>(null)
    const selectedIds = useRef<string[]>([])
    const selection = useHttpFlowSelection(true, 'test', {
      syncSelectedHttpFlowIds: (ids) => {
        selectedIds.current = ids
        inputRef.current?.setHttpFlow(ids)
      },
    })
    useLayoutEffect(() => {
      selection.onRegisterTableSelectApi({
        reset: () => {
          selectedIds.current = []
        },
        deselectId: (id) => selection.onSetSelectedHttpFlowIds(selectedIds.current.filter((value) => value !== id)),
      })
    }, [selection])
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
        onSubmit={onSubmit}
        onHttpFlowRemove={(id, isSummary) => {
          onHttpFlowRemove(id, isSummary)
          selection.onHttpFlowRemove(id, isSummary)
        }}
        chatDataStoreKey="test"
        inputFooterLeft={<span />}
        footer={<span />}
      />
    )
  }
  const view = render(<SelectionHarness />)
  await waitFor(() => expect(ref.current?.getValue()).toBe(defaultValue))
  await waitFor(() => expect(screen.getByTestId('editor').querySelector('.ProseMirror')).not.toBeNull())
  // 等待编辑器的初始化回调将实例传到公共输入组件。
  await act(async () => {})
  const send = within(view.container).getByRole('button')
  return { ...view, ref, onSubmit, onHttpFlowRemove, send }
}

describe('图片保存期间的提交保护', () => {
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
    expect(onSubmit.mock.calls[0][0].httpFlowList).toEqual([
      {
        flowIds: ids,
        displayText: count < 3 ? ids.map((id) => '#' + id).join(', ') : `勾选了 ${count} 条流量`,
        isSummary: count >= 3,
      },
    ])
  })

  it('去重、替换和清空勾选后，提交只包含当前选中的流量 ID', async () => {
    const { ref, onSubmit, send } = await setup('正文')
    act(() => ref.current?.setHttpFlow(['1', '2', '2', '']))
    fireEvent.click(send)
    expect(onSubmit.mock.calls[0][0].httpFlowList).toEqual([expect.objectContaining({ flowIds: ['1', '2'] })])

    act(() => ref.current?.setHttpFlow(['3']))
    fireEvent.click(send)
    expect(onSubmit.mock.calls[1][0].httpFlowList).toEqual([expect.objectContaining({ flowIds: ['3'] })])

    act(() => ref.current?.setHttpFlow([]))
    fireEvent.click(send)
    expect(onSubmit.mock.calls[2][0]).toEqual(expect.objectContaining({ qs: '正文', httpFlowList: [] }))
    expect(ref.current?.getValue()).toBe('正文')
  })

  it.each(['', '请分析这些流量'])('正文为“%s”时，提交引用快照和可解析的消息协议，不向编辑器写回', async (text) => {
    const { ref, onSubmit, send } = await setup(text)
    act(() => ref.current?.setHttpFlow(['11', '12']))
    expect(send).not.toBeDisabled()
    fireEvent.click(send)
    const payload = onSubmit.mock.calls[0][0]
    expect(payload.httpFlowList).toEqual([{ flowIds: ['11', '12'], displayText: '#11, #12', isSummary: false }])
    expect(payload.sessionId).toBe('draft-session')
    expect(payload.qs).toContain(':httpFlow[')
    expect(payload.qs).toContain('flowIds="11,12"')
    expect(payload.qs).not.toMatch(/\bflowId(?:=|\s|})/)
    expect(payload.showQS).toBe(payload.qs)
    expect(ref.current?.getValue()).toBe(text)
    const parsed = editors[0].action((ctx) => ctx.get(parserCtx)(payload.qs))
    const flowIds: string[][] = []
    parsed?.descendants((node) => {
      if (node.type.name === 'ai-http-flow-custom') flowIds.push(node.attrs.flowIds)
    })
    expect(flowIds).toEqual([['11', '12']])
    act(() => ref.current?.setValue(''))
    await waitFor(() => expect(send).toBeDisabled())
    expect(payload.httpFlowList?.[0].flowIds).toEqual(['11', '12'])
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
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ qs: '只有正文', httpFlowList: [] }))
  })

  it.each(['', ' flowIds=""'])('旧消息 flowId 转为 flowIds 后与外置引用共同提交（%s）', async (idsAttr) => {
    const { ref, onSubmit, send } = await setup()
    act(() => ref.current?.setValue(`:httpFlow[#7]{flowId="7"${idsAttr} displayText="#7" isSummary="false"}`))
    act(() => ref.current?.setHttpFlow(['8']))
    fireEvent.click(send)
    expect(onSubmit.mock.calls[0][0].httpFlowList).toEqual([
      expect.objectContaining({ flowIds: ['7'], isSummary: false }),
      expect.objectContaining({ flowIds: ['8'] }),
    ])
    expect(extractDataWithMilkdown(editors[0]).httpFlowList).toHaveLength(1)
    expect(onSubmit.mock.calls[0][0].qs).not.toMatch(/\bflowId(?:=|\s|})/)
    expect(onSubmit.mock.calls[0][0].httpFlowList?.[0]).not.toHaveProperty('flowId')
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
      expect(node.attrs.flowIds).toEqual(expected.split(','))
      expect(node.attrs).not.toHaveProperty('flowId')
      const dom = DOMSerializer.fromSchema(schema).serializeNode(node) as HTMLElement
      expect(dom.getAttribute('data-flow-ids')).toBe(expected)
      expect(dom.hasAttribute('data-flow-id')).toBe(false)
    })
  })

  it('数组流量命令创建数组节点，Markdown 序列化后可还原', async () => {
    await setup()
    act(() => {
      editors[0].action(
        callCommand(aiHttpFlowCommand.key, {
          flowIds: ['31', '32'],
          displayText: '#31, #32',
          isSummary: false,
        }),
      )
    })
    expect(extractDataWithMilkdown(editors[0]).httpFlowList[0].flowIds).toEqual(['31', '32'])
    const markdown = editors[0].action(getMarkdown())
    expect(markdown).toContain('flowIds="31,32"')
    const parsed = editors[0].action((ctx) => ctx.get(parserCtx)(markdown))
    expect(parsed?.firstChild?.firstChild?.attrs.flowIds).toEqual(['31', '32'])
    expect(parsed?.firstChild?.firstChild?.attrs.isSummary).toBe(false)
  })

  it('引用状态按输入组件实例隔离，清空正文同步清空当前实例的流量选择', async () => {
    const first = createRef<AIChatTextareaRefProps>()
    const second = createRef<AIChatTextareaRefProps>()
    const onSubmit = vi.fn()
    render(
      <>
        <section data-testid="first">
          <AIChatTextarea ref={first} chatDataStoreKey="first" inputFooterLeft={<span />} footer={<span />} />
        </section>
        <section data-testid="second">
          <AIChatTextarea
            ref={second}
            chatDataStoreKey="second"
            inputFooterLeft={<span />}
            footer={<span />}
            onSubmit={onSubmit}
          />
        </section>
      </>,
    )
    await waitFor(() => expect(document.querySelectorAll('.ProseMirror')).toHaveLength(2))
    await act(async () => {})
    const firstSend = within(screen.getByTestId('first')).getByRole('button')
    const secondSend = within(screen.getByTestId('second')).getByRole('button')

    act(() => first.current?.setHttpFlow(['1']))
    expect(firstSend).not.toBeDisabled()
    expect(secondSend).toBeDisabled()
    act(() => second.current?.setHttpFlow(['2']))
    act(() => first.current?.setValue(''))
    expect(firstSend).toBeDisabled()
    expect(secondSend).not.toBeDisabled()
    fireEvent.click(secondSend)
    expect(onSubmit.mock.calls[0][0].httpFlowList).toEqual([expect.objectContaining({ flowIds: ['2'] })])
  })

  it('编辑器未就绪也可以清空流量选择', () => {
    deferEditor.value = true
    const ref = createRef<AIChatTextareaRefProps>()
    render(<AIChatTextarea ref={ref} chatDataStoreKey="deferred" inputFooterLeft={<span />} footer={<span />} />)
    const send = screen.getByRole('button')
    act(() => ref.current?.setHttpFlow(['1']))
    expect(send).not.toBeDisabled()
    act(() => ref.current?.setValue(''))
    expect(send).toBeDisabled()
  })
})
