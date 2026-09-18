import '@/pages/ai-re-act/hooks/__test__/setupElectron'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import { AIChatQSDataTypeEnum, type AIYakExecFileRecord, type ChatToolResult } from '@/pages/ai-re-act/hooks/aiRender'
import { DefaultAIToolResult } from '@/pages/ai-re-act/hooks/defaultConstant'
import zh from '@/locales/zh/aiAgent.json'
import en from '@/locales/en/aiAgent.json'
import zhTW from '@/locales/zh-TW/aiAgent.json'
import ToolInvokerCard from '../ToolInvokerCard'

const store = createStore(() => ({ uiExpandMap: {} as Record<string, boolean> }))
const onSend = vi.fn()
const streaming = {
  stream: {
    data: {
      content: '第一段工具输出',
      selectors: { InteractiveId: 'review-1', selectors: [{ value: 'enough-cancel', prompt: '跳过' }] },
    },
    reference: ['reference-1'],
  },
}

// 保留真实折叠 hook、ChatCard、按钮和确认框，隔离流订阅、引擎及内容组件。
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => store,
  useCurrentRawData: () => ({}),
}))
vi.mock('@/pages/ai-re-act/hooks/ChatMultiSessionController', () => ({
  globalSessionEngine: {
    toggleUiExpand: (_sessionId: string, token: string, defaultExpand: boolean) => {
      store.setState(({ uiExpandMap }) => ({
        uiExpandMap: { ...uiExpandMap, [token]: !(uiExpandMap[token] ?? defaultExpand) },
      }))
    },
  },
}))
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: () => 'session-1' }))
vi.mock('@/utils/isAuxOrChildWindow', () => ({ isAuxOrChildWindow: () => false }))
vi.mock('../../useContext/useStore', () => ({ default: () => ({ activeChat: { SessionID: 'session-1' } }) }))
vi.mock('../../useContext/useDispatcher', () => ({ default: () => ({ onSend }) }))
vi.mock('../../grpc', () => ({ grpcQueryAIToolDetails: vi.fn() }))
vi.mock('../aiChatListItem/StreamingChatContent/hooks/useStreamingChatContent', () => ({
  useStreamingChatContent: () => streaming,
}))
vi.mock('../FileList', () => ({ default: () => <div data-testid="tool-files">生成的文件</div> }))
vi.mock('../OperationCardFooter/OperationCardFooter', () => ({
  OperationCardFooter: () => <div data-testid="tool-footer">工具操作</div>,
}))
// DataCompare → httpFlow 顶层 window.require('electron')，本用例不测对比抽屉
vi.mock('@/pages/compare/DataCompare', () => ({ CodeComparison: () => null }))
vi.mock('@/pages/ai-re-act/aiReActChatContents/AIReActChatContents', () => ({
  AIReferenceNode: () => <div data-testid="tool-references">参考资料</div>,
}))
vi.mock('@/components/yakitUI/YakitTag/YakitTag', () => ({ CopyComponents: () => null }))
vi.mock('@/components/yakitUI/YakitModal/YakitModal', () => ({ YakitModal: () => null }))
vi.mock('../ToolInvokerCard.module.scss', () => ({
  default: { 'tool-loading-status-icon': 'tool-loading-status-icon' },
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    i18n: { language: 'zh' },
    t: (key: string) =>
      ({
        'ToolInvokerCard.executing': zh.ToolInvokerCard.executing,
        'ToolInvokerCard.paramsGenerating': zh.ToolInvokerCard.paramsGenerating,
        'ToolInvokerCard.skipConfirm': '确认跳过？',
        'YakitButton.expand': '展开',
        'YakitButton.collapse': '收起',
        'YakitButton.ok': '确定',
        'YakitButton.cancel': '取消',
      })[key] || key,
  }),
}))

const createItem = (type: ChatToolResult['data']['type'] = 'stream'): ChatToolResult => ({
  id: 'tool-1',
  type: AIChatQSDataTypeEnum.TOOL_RESULT,
  chatType: 'reAct',
  AIService: '',
  AIModelName: '',
  Timestamp: 0,
  data: {
    ...DefaultAIToolResult,
    type,
    toolName: '测试工具',
    callToolId: 'call-1',
    stream: { EventUUID: 'stream-1' },
    tool: { ...DefaultAIToolResult.tool, reviewParams: { target: 'example.com' }, resultDetails: '最终工具输出' },
  },
})
const fileList: AIYakExecFileRecord[] = [{ id: 'file-1', level: 'file', data: '', timestamp: 1, order: 1 }]

beforeEach(() => {
  store.setState({ uiExpandMap: {} })
  onSend.mockClear()
  streaming.stream.data.content = '第一段工具输出'
  streaming.stream.data.selectors.InteractiveId = 'review-1'
})

describe('ToolInvokerCard 执行中折叠', () => {
  it('默认隐藏正文、文件和操作，执行中状态位于跳过左侧并复用参数生成图标', () => {
    const { container, rerender } = render(
      <ToolInvokerCard itemData={createItem()} renderNum={1} fileList={fileList} />,
    )
    const status = screen.getByText('执行中...')
    expect(status.compareDocumentPosition(screen.getByText('跳过')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('button', { name: '展开' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('第一段工具输出')).not.toBeInTheDocument()
    expect(screen.queryByText('Params:')).not.toBeInTheDocument()
    expect(screen.queryByTestId('tool-files')).not.toBeInTheDocument()
    expect(screen.queryByTestId('tool-footer')).not.toBeInTheDocument()
    expect(screen.queryByTestId('tool-references')).not.toBeInTheDocument()
    const icon = container.querySelector('.tool-loading-status-icon svg')
    expect(icon).not.toBeNull()
    const iconMarkup = icon!.innerHTML

    rerender(<ToolInvokerCard itemData={createItem('create')} renderNum={2} fileList={fileList} />)
    expect(screen.getByText('参数生成中...')).toBeInTheDocument()
    expect(container.querySelector('.tool-loading-status-icon svg')!.innerHTML).toBe(iconMarkup)
    expect(screen.queryByText('执行中...')).not.toBeInTheDocument()
  })

  it('点击按钮展开一次，更新输出后保持展开，点击标题可折叠', () => {
    const item = createItem()
    const { rerender } = render(<ToolInvokerCard itemData={item} renderNum={1} fileList={fileList} />)
    fireEvent.click(screen.getByRole('button', { name: '展开' }))
    expect(screen.getByRole('button', { name: '收起' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('第一段工具输出')).toBeInTheDocument()
    expect(screen.getByText('Params:')).toBeInTheDocument()
    expect(screen.getByTestId('tool-files')).toBeInTheDocument()
    expect(screen.getByTestId('tool-footer')).toBeInTheDocument()
    expect(screen.getByTestId('tool-references')).toBeInTheDocument()
    expect(screen.queryByText('执行中...')).not.toBeInTheDocument()

    streaming.stream.data.content = '第二段工具输出'
    rerender(<ToolInvokerCard itemData={item} renderNum={2} fileList={fileList} />)
    expect(screen.getByText('第二段工具输出')).toBeInTheDocument()
    fireEvent.click(screen.getByText('测试工具'))
    expect(screen.getByText('执行中...')).toBeInTheDocument()
    expect(screen.queryByText('第二段工具输出')).not.toBeInTheDocument()
  })

  it.each([false, true])('虚拟列表重新挂载及执行结束时保留展开选择：%s', (expand) => {
    const first = render(<ToolInvokerCard itemData={createItem()} renderNum={1} fileList={[]} />)
    if (expand) fireEvent.click(screen.getByRole('button', { name: '展开' }))
    first.unmount()
    const { rerender } = render(<ToolInvokerCard itemData={createItem()} renderNum={2} fileList={[]} />)
    expect(screen.getByRole('button', { name: expand ? '收起' : '展开' })).toHaveAttribute('aria-expanded', `${expand}`)
    rerender(<ToolInvokerCard itemData={createItem('result')} renderNum={3} fileList={[]} />)
    expect(screen.queryByText('执行中...')).not.toBeInTheDocument()
    expect(screen.queryByText('跳过')).not.toBeInTheDocument()
    expect(!!screen.queryByText('最终工具输出')).toBe(expand)
  })

  it('折叠时流更新不会展开，展开后显示最新输出', () => {
    const item = createItem()
    const { rerender } = render(<ToolInvokerCard itemData={item} renderNum={1} fileList={[]} />)
    streaming.stream.data.content = '最新工具输出'
    rerender(<ToolInvokerCard itemData={item} renderNum={2} fileList={[]} />)
    expect(screen.queryByText('最新工具输出')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('测试工具'))
    expect(screen.getByText('最新工具输出')).toBeInTheDocument()
  })

  it('点击跳过及确认不会展开卡片，确认后发送正确的交互请求', async () => {
    render(<ToolInvokerCard itemData={createItem()} renderNum={1} fileList={[]} />)
    fireEvent.click(screen.getByText('跳过'))
    expect(screen.getByRole('button', { name: '展开' })).toHaveAttribute('aria-expanded', 'false')
    expect(onSend).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: '确定' }))
    expect(onSend).toHaveBeenCalledExactlyOnceWith({
      token: 'session-1',
      type: '',
      params: {
        IsInteractiveMessage: true,
        InteractiveId: 'review-1',
        InteractiveJSONInput: JSON.stringify({ suggestion: 'enough-cancel' }),
      },
    })
    expect(screen.getByRole('button', { name: '展开' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('取消跳过不发送请求，也不改变折叠状态', async () => {
    render(<ToolInvokerCard itemData={createItem()} renderNum={1} fileList={[]} />)
    fireEvent.click(screen.getByText('跳过'))
    fireEvent.click(await screen.findByRole('button', { name: '取消' }))
    expect(onSend).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '展开' })).toHaveAttribute('aria-expanded', 'false')
  })

  it.each([
    [zh, '执行中...'],
    [en, 'Executing...'],
    [zhTW, '執行中...'],
  ] as const)('执行状态文案已提供对应翻译 %#', (messages, text) => {
    expect(messages.ToolInvokerCard.executing).toBe(text)
  })
})
