import '../../../../ai-re-act/hooks/__test__/setupElectron'
import { createContext, createRef, useContext, useMemo } from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AIMilkdownInputBase } from '../AIMilkdownInput'
import type { AIMilkdownInputRef } from '../type'
import type * as MilkdownCore from '@milkdown/kit/core'
import { editorViewOptionsCtx } from '@milkdown/kit/core'
import type { EditorView } from '@milkdown/kit/prose/view'
import { placeholderConfig } from '@/components/MilkdownEditor/Placeholder'
import type { PlaceHolderFeatureConfig } from '@/components/MilkdownEditor/Placeholder'
import zh from '@/locales/zh/aiAgent.json'

const SessionContext = createContext<string | undefined>(undefined)
const mocks = vi.hoisted(() => ({
  draftSequence: 0,
  upload: Symbol('upload'),
  uploader: undefined as undefined | ((files: FileList, schema: unknown) => Promise<unknown>),
  renderPlaceholder: undefined as PlaceHolderFeatureConfig['render'],
  ariaPlaceholder: undefined as string | undefined,
}))
vi.mock('@/pages/ai-agent/useContext/useStore', () => ({
  default: function useAgentStoreMock() {
    return {
      activeChat: { SessionID: useContext(SessionContext) },
    }
  },
}))
vi.mock('@/pages/ai-agent/utils', () => ({ createActiveChatSessionId: () => `draft-${++mocks.draftSequence}` }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string) => {
      if (key === 'AIMilkdownInput.placeholder') return zh.AIMilkdownInput.placeholder
      return key
    },
  }),
}))
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
        config: (configure: (ctx: unknown) => void) => {
          configure({
            set: (key: unknown, value: { attributes?: Record<string, string> }) => {
              if (key === editorViewOptionsCtx) mocks.ariaPlaceholder = value.attributes?.['aria-placeholder']
            },
            get: () => ({ markdownUpdated: vi.fn() }),
          })
          return editor
        },
        use: (plugins: unknown) => {
          if (Array.isArray(plugins) && (plugins.includes(mocks.upload) || plugins.includes(placeholderConfig))) {
            // 捕获组件交给 Milkdown 的插件配置。
            const configure = plugins.at(-1)
            configure({
              update: (
                key: unknown,
                update: (previous: object) => PlaceHolderFeatureConfig & { uploader: typeof mocks.uploader },
              ) => {
                const options = update({})
                if (key === placeholderConfig.key) mocks.renderPlaceholder = options.render
                else mocks.uploader = options.uploader
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
  mocks.renderPlaceholder = undefined
  mocks.ariaPlaceholder = undefined
  vi.unstubAllGlobals()
})

it('可编辑时显示完整的占位提示', () => {
  render(<AIMilkdownInputBase chatDataStoreKey="aiChatDataStore" />)

  const view = { dom: document.createElement('div') } as unknown as EditorView
  const placeholder = mocks.renderPlaceholder!(view)
  const expectedParts = ['向我提问', '@', '使用技能、工具、文件和知识库，', '/', '选择模式']
  expect(Array.from(placeholder.children, (segment) => segment.textContent)).toEqual(expectedParts)
  expect(placeholder).toHaveAttribute('aria-hidden', 'true')
  expect(mocks.ariaPlaceholder).toBe(expectedParts.join(' '))
})

it('只读时仍注册占位插件并设置相同的 aria-placeholder', () => {
  render(<AIMilkdownInputBase chatDataStoreKey="aiChatDataStore" readonly />)

  expect(mocks.renderPlaceholder).toBeTypeOf('function')
  expect(mocks.ariaPlaceholder).toBe(zh.AIMilkdownInput.placeholder)
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
