import '@ant-design/v5-patch-for-react-19'
import 'antd/dist/reset.css'
import '@/styles/index.css'
import '@/theme/yakit.scss'
import '../../../app/renderer/src/main/public/theme.css'
import './fixture.css'
import './i18n'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useStore } from 'zustand'
import { ConfigProvider } from 'antd'
import { getYakitAntdTheme } from '@/theme/antdTheme'
import { applyYakitThemeColors } from '@/utils/applyYakitThemeColors'
import { GetMainColor } from '@/utils/envfile'
import { ComponentCard, registeredComponents } from '@/pages/ai-re-act/interactive-ui/ComponentCard'
import { ClarificationPanel } from '@/pages/ai-re-act/interactive-ui/ClarificationPanel'
import { QuestionSummary } from '@/pages/ai-re-act/interactive-ui/QuestionSummary'
import { readDocument } from '@/pages/ai-re-act/interactive-ui/validate'
import { syncQuestionPanel } from '@/pages/ai-re-act/interactive-ui/questionPanel'
import { AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'
import { examples, question } from './examples.mjs'
import { contents, messages, store } from './adapter'

const errors: string[] = (window as any).memfitUIErrors
const base = { chatType: 'reAct', Timestamp: 0, AIService: '', AIModelName: '' }
applyYakitThemeColors('light', GetMainColor('light'))

function Fixture() {
  const [item, setItem] = useState<any>()
  const [epoch, setEpoch] = useState(0)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  useStore(store, (state) => state.questionPanelRevision)
  const api = {
    names: Object.keys(examples),
    registeredComponents,
    messages,
    errors,
    show(name: string, options: any = {}) {
      messages.length = 0
      contents.clear()
      store.setState({ questionPanelTokens: [], questionPanelRevision: 0 })
      const request = name === 'question' ? question(options.mode, options.deadline) : undefined
      const next = {
        ...base,
        id: request ? `ui-question:${request.id}` : `ui-component:${name}`,
        type: request ? AIChatQSDataTypeEnum.UI_QUESTION : AIChatQSDataTypeEnum.UI_COMPONENT,
        data: request
          ? { sessionId: 'fixture', request }
          : { sessionId: 'fixture', source: JSON.stringify(examples[name]), final: true },
      }
      if (!request) {
        const result = readDocument(next.data.source!, true)
        if (!result.document || result.diagnostics.length) throw new Error(JSON.stringify(result))
      }
      contents.set(next.id, next as any)
      if (request) syncQuestionPanel(store, next as any)
      setItem(next)
      setEpoch((value) => value + 1)
    },
    reparse() {
      const document = JSON.parse(item.data.source)
      document.nodes[0].props.title = '流式补充后的标题'
      setItem({ ...item, data: { ...item.data, source: JSON.stringify(document) } })
    },
    remount() {
      setEpoch((value) => value + 1)
    },
    setSource(source: string, final: boolean) {
      setItem({ ...item, data: { ...item.data, source, final } })
    },
    theme(value: 'light' | 'dark') {
      applyYakitThemeColors(value, GetMainColor(value))
      setTheme(value)
    },
  }
  ;(window as any).memfitUITest = api
  return (
    <ConfigProvider theme={getYakitAntdTheme(theme)}>
      <main data-testid="fixture">
        {item?.data.request ? (
          <>
            <div data-testid="history">
              <QuestionSummary item={item} />
            </div>
            <div data-testid="composer" className="composer">
              <ClarificationPanel key={epoch} />
              <textarea aria-label="会话输入栏" placeholder="继续发送消息" />
            </div>
          </>
        ) : (
          item && <ComponentCard key={epoch} item={item} />
        )}
      </main>
    </ConfigProvider>
  )
}
createRoot(document.getElementById('root')!).render(<Fixture />)
