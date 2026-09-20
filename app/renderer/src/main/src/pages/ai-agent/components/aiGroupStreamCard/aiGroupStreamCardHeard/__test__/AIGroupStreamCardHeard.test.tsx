import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AIGroupStreamCardHeard, { isThoughtHeaderStreaming } from '../AIGroupStreamCardHeard'
import { AIChatQSDataTypeEnum, type ChatStream } from '@/pages/ai-re-act/hooks/aiRender'
import { AI_STREAM_THOUGHT_NODE_ID } from '@/pages/ai-re-act/hooks/defaultConstant'

vi.mock('../AIGroupStreamCardHeard.module.scss', () => ({
  default: { 'thought-title-blink': 'thought-title-blink' },
}))

vi.mock('../../../thoughtDuration/ThoughtDuration', () => ({
  default: ({ status }: { status?: string }) => <span data-testid="thought-duration">{status}</span>,
}))

vi.mock('../../aiChatListItem/StreamingChatContent/hooks/useTypedStream', () => ({
  useTypedStream: ({ getContent }: { getContent: () => string }) => ({ content: getContent() }),
}))

vi.mock('../../aiStreamChatContent/icons', () => ({
  getAIStreamIcon: () => (props: object) => <span data-testid="stream-icon" {...props} />,
}))

const streamItem = (status: 'start' | 'end'): ChatStream =>
  ({
    type: AIChatQSDataTypeEnum.STREAM,
    id: 'stream-1',
    data: { content: '正文', status },
  }) as ChatStream

const heardProps = {
  expand: false,
  setExpand: vi.fn(),
  nodeLabel: '思考',
  shouldShowMask: false,
  childrenTokensLength: 1,
  persistKey: 'stream-1',
}

describe('isThoughtHeaderStreaming', () => {
  it('lastItem 为 undefined 时不为思考中', () => {
    expect(isThoughtHeaderStreaming(undefined)).toBe(false)
  })

  it('stream 未结束时为思考中', () => {
    expect(isThoughtHeaderStreaming(streamItem('start'))).toBe(true)
  })

  it('stream 已结束时不为思考中', () => {
    expect(isThoughtHeaderStreaming(streamItem('end'))).toBe(false)
  })
})

describe('AIGroupStreamCardHeard', () => {
  it('thought 节点渲染思考标题，无 lastItem 时不闪烁且时长为 end', () => {
    render(<AIGroupStreamCardHeard {...heardProps} nodeId={AI_STREAM_THOUGHT_NODE_ID} lastItem={undefined} />)
    const title = screen.getByText('思考')
    expect(title.className).not.toMatch(/thought-title-blink/)
    expect(screen.getByTestId('thought-duration')).toHaveTextContent('end')
    expect(screen.queryByText('正文')).not.toBeInTheDocument()
  })

  it('thought 节点在 stream start 时闪烁并计时', () => {
    render(<AIGroupStreamCardHeard {...heardProps} nodeId={AI_STREAM_THOUGHT_NODE_ID} lastItem={streamItem('start')} />)
    expect(screen.getByText('思考').className).toMatch(/thought-title-blink/)
    expect(screen.getByTestId('thought-duration')).toHaveTextContent('start')
  })

  it('thought 标题点击切换展开', () => {
    const setExpand = vi.fn()
    render(
      <AIGroupStreamCardHeard
        {...heardProps}
        setExpand={setExpand}
        nodeId={AI_STREAM_THOUGHT_NODE_ID}
        lastItem={streamItem('end')}
      />,
    )
    fireEvent.click(screen.getByText('思考'))
    expect(setExpand).toHaveBeenCalled()
  })

  it('非 thought 节点渲染普通组标题与摘要', () => {
    render(<AIGroupStreamCardHeard {...heardProps} nodeId="summary" nodeLabel="记录" lastItem={streamItem('end')} />)
    expect(screen.getByText('记录')).toBeInTheDocument()
    expect(screen.getByText('正文')).toBeInTheDocument()
    expect(screen.queryByTestId('thought-duration')).not.toBeInTheDocument()
  })
})
