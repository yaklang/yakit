import React, { createRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
vi.mock('@/utils/notification', () => ({ success: vi.fn() }))
vi.mock('@/utils/clipboard', () => ({ setClipboardText: vi.fn() }))
vi.mock('../../aiModelList/aiModelSelect/AIModelSelect', () => ({ AIModelSelect: () => null }))
vi.mock('@/pages/ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect', () => ({ default: () => null }))
vi.mock('@/pages/ai-re-act/aiFocusMode/AIFocusMode', () => ({ AIFocusMode: () => null }))
vi.mock('@/pages/ai-re-act/aiReasoningEffortSelect/AIReasoningEffortSelect', () => ({
  AIReasoningEffortSelect: () => null,
}))
vi.mock('../../aiRunModeSelect/AIRunModeSelect', () => ({ default: () => null }))
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

afterEach(async () => {
  cleanup()
  await Promise.all(editors.splice(0).map((editor) => editor.destroy()))
  deferEditor.value = false
  vi.clearAllMocks()
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

function getHttpFlowTags(container: HTMLElement) {
  return Array.from(container.querySelectorAll('[role="img"][tabindex="-1"]'), (icon) => icon.parentElement!)
}

function getHttpFlowCloseIcon(label: string) {
  return screen.getByText(label).parentElement!.querySelector('[role="img"][tabindex="-1"]')!
}

describe('流量勾选引用区', () => {
  it.each([1, 2, 3, 5, 6, 10])('%i 条流量按阈值显示 ID 或数量，正文和撤销记录不变', async (count) => {
    const { ref, container } = await setup('保留这段正文')
    const editor = editors[0]
    const previousState = editor.action((ctx) => ctx.get(editorViewCtx).state)
    act(() => ref.current?.setHttpFlow(Array.from({ length: count }, (_, i) => `${i + 1}`)))
    const label = count < 3 ? '#1' : `勾选了 ${count} 条流量`
    const chip = screen.getByText(label)
    expect(getHttpFlowTags(container)).toHaveLength(count < 3 ? count : 1)
    if (count === 2) expect(screen.getByText('#2').parentElement).not.toBe(chip.parentElement)
    const editorElement = screen.getByTestId('editor')
    expect(chip.parentElement?.parentElement?.parentElement).toBe(editorElement.parentElement)
    expect(chip.compareDocumentPosition(editorElement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(container.querySelector('.ProseMirror')?.textContent).toBe('保留这段正文')
    expect(editor.action((ctx) => ctx.get(editorViewCtx).state)).toBe(previousState)
    expect(ref.current?.getValue()).toBe('保留这段正文')
  })

  it('去重、取消勾选与关闭引用仅更新引用区，关闭回调携带完整 ID', async () => {
    const { ref, onHttpFlowRemove, onSubmit, send, container } = await setup('正文')
    act(() => ref.current?.setHttpFlow(['1', '2', '2', '']))
    expect(getHttpFlowTags(container)).toHaveLength(2)
    const focusEditor = vi.spyOn(
      editors[0].action((ctx) => ctx.get(editorViewCtx)),
      'focus',
    )
    fireEvent.click(getHttpFlowCloseIcon('#1'))
    expect(focusEditor).not.toHaveBeenCalled()
    focusEditor.mockRestore()
    expect(onHttpFlowRemove).toHaveBeenLastCalledWith('1', false)
    expect(screen.queryByText('#1')).not.toBeInTheDocument()
    expect(screen.getByText('#2')).toBeInTheDocument()
    fireEvent.click(send)
    expect(onSubmit.mock.calls[0][0].httpFlowList).toEqual([expect.objectContaining({ flowIds: ['2'] })])
    fireEvent.click(getHttpFlowCloseIcon('#2'))
    expect(onHttpFlowRemove).toHaveBeenLastCalledWith('2', false)
    expect(getHttpFlowTags(container)).toHaveLength(0)
    expect(ref.current?.getValue()).toBe('正文')
    act(() => ref.current?.setHttpFlow(['3']))
    act(() => ref.current?.setHttpFlow([]))
    expect(getHttpFlowTags(container)).toHaveLength(0)
    expect(onHttpFlowRemove).toHaveBeenCalledTimes(2)
  })

  it('达到 3 条后悬停展示完整 ID 列表，数量变化和关闭标签同步更新', async () => {
    const { ref, container, onHttpFlowRemove } = await setup('正文')
    act(() => ref.current?.setHttpFlow(['11', '12']))
    fireEvent.mouseEnter(screen.getByText('#11').parentElement!)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    act(() => ref.current?.setHttpFlow(['11', '12', '13']))
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    fireEvent.mouseEnter(screen.getByText('勾选了 3 条流量').parentElement!)
    const list = await screen.findByRole('list')
    expect(list.tagName).toBe('DIV')
    within(list)
      .getAllByRole('listitem')
      .forEach((item) => expect(item).toHaveClass('ant-tag'))
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['#11', '#12', '#13'])
    fireEvent.mouseLeave(screen.getByText('勾选了 3 条流量').parentElement!)
    await waitFor(() => expect(screen.queryByRole('list')).not.toBeInTheDocument())
    fireEvent.mouseEnter(screen.getByText('勾选了 3 条流量').parentElement!)
    await screen.findByRole('list')
    act(() => ref.current?.setHttpFlow(Array.from({ length: 10 }, (_, i) => `${i + 11}`)))
    expect(screen.getByText('勾选了 10 条流量')).toBeInTheDocument()
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(Array.from({ length: 10 }, (_, i) => `#${i + 11}`))
    fireEvent.click(getHttpFlowCloseIcon('勾选了 10 条流量'))
    expect(onHttpFlowRemove).toHaveBeenCalledExactlyOnceWith('11,12,13,14,15,16,17,18,19,20', true)
    expect(getHttpFlowTags(container)).toHaveLength(0)
    await waitFor(() => expect(screen.queryByRole('list')).not.toBeInTheDocument())
    act(() => ref.current?.setHttpFlow(['21']))
    expect(screen.getByText('#21').parentElement).toBeVisible()
    act(() => ref.current?.setHttpFlow(['21', '22', '23']))
    expect(getHttpFlowTags(container)).toHaveLength(1)
    act(() => ref.current?.setHttpFlow(['21', '22']))
    expect(getHttpFlowTags(container)).toHaveLength(2)
    expect(screen.getByText('#21')).toBeInTheDocument()
    expect(screen.getByText('#22')).toBeInTheDocument()
    expect(screen.queryByText('勾选了 3 条流量')).not.toBeInTheDocument()
  })

  it('在汇总列表中逐项取消勾选，跨过汇总阈值后恢复普通标签，提交仅保留剩余 ID', async () => {
    const { ref, onHttpFlowRemove, onSubmit, send, container } = await setup('正文')
    act(() => ref.current?.setHttpFlow(['11', '12', '13', '14']))
    fireEvent.mouseEnter(screen.getByText('勾选了 4 条流量').parentElement!)
    const list = await screen.findByRole('list')
    expect(list.querySelectorAll('.ant-tag-close-icon')).toHaveLength(4)
    fireEvent.click(within(list).getByText('#12').closest('.ant-tag')!.querySelector('.ant-tag-close-icon')!)
    expect(onHttpFlowRemove).toHaveBeenLastCalledWith('12', false)
    expect(screen.getByText('勾选了 3 条流量')).toBeInTheDocument()
    expect(within(list).queryByText('#12')).not.toBeInTheDocument()
    expect(list.querySelectorAll('.ant-tag-close-icon')).toHaveLength(3)
    fireEvent.click(within(list).getByText('#14').closest('.ant-tag')!.querySelector('.ant-tag-close-icon')!)
    expect(onHttpFlowRemove).toHaveBeenLastCalledWith('14', false)
    expect(onHttpFlowRemove).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(screen.queryByRole('list')).not.toBeInTheDocument())
    expect(getHttpFlowTags(container)).toHaveLength(2)
    expect(screen.getByText('#11')).toBeInTheDocument()
    expect(screen.getByText('#13')).toBeInTheDocument()
    expect(ref.current?.getValue()).toBe('正文')
    fireEvent.click(send)
    expect(onSubmit.mock.calls[0][0].httpFlowList).toEqual([
      expect.objectContaining({ flowIds: ['11', '13'], isSummary: false }),
    ])
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
    expect(screen.queryByText('#11')).not.toBeInTheDocument()
    expect(screen.queryByText('#12')).not.toBeInTheDocument()
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

  it('引用状态按输入组件实例隔离，编辑器未就绪也可以清空', () => {
    deferEditor.value = true
    const first = createRef<AIChatTextareaRefProps>()
    const second = createRef<AIChatTextareaRefProps>()
    render(
      <>
        <section data-testid="first">
          <AIChatTextarea ref={first} chatDataStoreKey="first" />
        </section>
        <section data-testid="second">
          <AIChatTextarea ref={second} chatDataStoreKey="second" />
        </section>
      </>,
    )
    act(() => first.current?.setHttpFlow(['1']))
    expect(within(screen.getByTestId('first')).getByText('#1')).toBeInTheDocument()
    expect(within(screen.getByTestId('second')).queryByText('#1')).not.toBeInTheDocument()
    act(() => first.current?.setValue(''))
    expect(screen.queryByText('#1')).not.toBeInTheDocument()
  })
})
