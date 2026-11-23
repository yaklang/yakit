import { describe, expect, it, vi } from 'vitest'
import { registerModeSlashReopenHandler, requestModeSlashReopen } from '../modeSlashReopen'

const createCard = () => {
  const card = document.createElement('div')
  card.setAttribute('data-ai-input-card', '')
  return card
}

describe('modeSlashReopen', () => {
  it('只将请求交给点击来源所在的输入框', () => {
    const main = createCard()
    const history = createCard()
    const tag = document.createElement('button')
    main.appendChild(tag)
    const mainHandler = vi.fn()
    const historyHandler = vi.fn()
    const unregister = registerModeSlashReopenHandler(main, mainHandler)
    registerModeSlashReopenHandler(history, historyHandler)

    const payload = { kind: 'goalAcceptance' as const, text: '接口 200' }
    requestModeSlashReopen(tag, payload)
    expect(mainHandler).toHaveBeenCalledExactlyOnceWith(payload)
    expect(historyHandler).not.toHaveBeenCalled()

    unregister()
    requestModeSlashReopen(tag, { kind: 'goalModes' })
    requestModeSlashReopen(document.createElement('button'), { kind: 'goalModes' })
    expect(mainHandler).toHaveBeenCalledTimes(1)
    expect(historyHandler).not.toHaveBeenCalled()

    requestModeSlashReopen(history, { kind: 'multiAgentConfig', subAgents: 3 })
    expect(historyHandler).toHaveBeenCalledExactlyOnceWith({ kind: 'multiAgentConfig', subAgents: 3 })
  })

  it('同一卡片替换编辑器后，旧编辑器的卸载保留新的处理函数', () => {
    const card = createCard()
    const oldHandler = vi.fn()
    const unregister = registerModeSlashReopenHandler(card, oldHandler)
    const newHandler = vi.fn()
    registerModeSlashReopenHandler(card, newHandler)
    unregister()

    requestModeSlashReopen(card, { kind: 'goalIterations', iterations: 5 })
    expect(oldHandler).not.toHaveBeenCalled()
    expect(newHandler).toHaveBeenCalledExactlyOnceWith({ kind: 'goalIterations', iterations: 5 })
  })
})
