import '../../../../ai-re-act/hooks/__test__/setupElectron'
import { createContext, createRef, useContext, useMemo } from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AIMilkdownInputBase } from '../AIMilkdownInput'
import type { AIMilkdownInputRef } from '../type'
import type * as MilkdownCore from '@milkdown/kit/core'

const SessionContext = createContext<string | undefined>(undefined)
const mocks = vi.hoisted(() => ({
  draftSequence: 0,
  upload: Symbol('upload'),
  uploader: undefined as undefined | ((files: FileList, schema: unknown) => Promise<unknown>),
}))
vi.mock('@/pages/ai-agent/useContext/useStore', () => ({
  default: function useAgentStoreMock() {
    return {
      activeChat: { SessionID: useContext(SessionContext) },
    }
  },
}))
vi.mock('@/pages/ai-agent/utils', () => ({ createActiveChatSessionId: () => `draft-${++mocks.draftSequence}` }))
vi.mock('lottie-web', () => ({ default: vi.fn() }))
vi.mock('@milkdown/react', () => ({
  Milkdown: () => null,
  useEditor: (create: (root: HTMLElement) => unknown) => {
    useMemo(() => create(document.createElement('div')), [])
    return { get: () => undefined, loading: false }
  },
}))
vi.mock('@prosemirror-adapter/react', () => ({
  useNodeViewFactory: () => vi.fn(),
  usePluginViewFactory: () => vi.fn(),
}))
vi.mock('@milkdown/kit/plugin/upload', () => ({ upload: mocks.upload, uploadConfig: { key: 'upload' } }))
vi.mock('@milkdown/kit/core', async (importOriginal) => ({
  ...(await importOriginal<typeof MilkdownCore>()),
  Editor: {
    make: () => {
      const editor = {
        config: () => editor,
        use: (plugins: unknown) => {
          if (Array.isArray(plugins) && plugins.includes(mocks.upload)) {
            // 捕获组件配置给上传插件的真实 uploader，编辑器排版不参与本测试。
            const configure = plugins.at(-1)
            configure({
              update: (_key: unknown, update: (previous: object) => { uploader: typeof mocks.uploader }) => {
                mocks.uploader = update({}).uploader
              },
            })()
          }
          return editor
        },
      }
      return editor
    },
  },
}))
vi.mock('../aiMilkdownMention/AIMilkdownMention', () => ({
  aiMentionFactory: {},
  AICustomMention: () => null,
  AIMilkdownMention: () => null,
}))
vi.mock('../aiCustomFile/AICustomFile', () => ({ AICustomFile: () => null }))
vi.mock('../aiCustomCode/AICustomCode', () => ({ AICustomCode: () => null }))
vi.mock('../aiMilkdownResourceReference/AICustomResourceReference', () => ({ AICustomResourceReference: () => null }))
vi.mock('../aiCodeBlock/AICodeBlock', () => ({ AICustomCodeRef: () => null }))

afterEach(() => {
  vi.unstubAllGlobals()
})

it('欢迎页输入框挂载后就返回预分配的会话 ID', () => {
  const ref = createRef<AIMilkdownInputRef>()
  const element = (id: string) => (
    <SessionContext.Provider value={id}>
      <AIMilkdownInputBase chatDataStoreKey="aiChatDataStore" ref={ref} />
    </SessionContext.Provider>
  )
  const view = render(element('welcome-one'))
  expect(ref.current?.getSessionId()).toBe('welcome-one')
  view.rerender(element('welcome-two'))
  expect(ref.current?.getSessionId()).toBe('welcome-two')
})

it('reuses the image fallback ID and immediately follows active session changes', async () => {
  mocks.draftSequence = 0
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = () => 'blob:test-image'
    },
  )
  const ref = createRef<AIMilkdownInputRef>()
  const element = (id?: string) => (
    <SessionContext.Provider value={id}>
      <AIMilkdownInputBase chatDataStoreKey="aiChatDataStore" ref={ref} />
    </SessionContext.Provider>
  )
  const result = render(element())
  const file = new File(['image'], 'image.png', { type: 'image/png' })
  const schema = { nodes: { image: { createAndFill: vi.fn((attrs) => ({ attrs })) } } }
  const upload = async () => {
    await act(async () => mocks.uploader!({ length: 1, item: () => file } as unknown as FileList, schema))
    return ref.current!.getSessionId()
  }
  expect(await upload()).toBe('draft-1')
  expect(schema.nodes.image.createAndFill).toHaveBeenCalledWith({
    src: 'blob:test-image',
    alt: 'image.png',
    title: 'ai-attachment',
  })
  expect(await upload()).toBe('draft-1')
  result.rerender(element('history'))
  expect(ref.current!.getSessionId()).toBe('history')
  expect(await upload()).toBe('history')
  result.rerender(element('welcome-next'))
  expect(ref.current!.getSessionId()).toBe('welcome-next')
  expect(await upload()).toBe('welcome-next')
  result.rerender(element())
  expect(ref.current!.getSessionId()).toBe('')
  expect(await upload()).toBe('draft-2')
})
