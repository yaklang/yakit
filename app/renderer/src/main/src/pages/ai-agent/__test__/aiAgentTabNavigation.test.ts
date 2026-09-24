import { afterEach, describe, expect, it, vi } from 'vitest'
import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
import { AIAgentTabListEnum, SwitchAIAgentTabEventEnum } from '../defaultConstant'
import { clearPendingAIAgentTabSwitch, openAIAgentTab, takePendingAIAgentTabSwitch } from '../aiAgentTabNavigation'

describe('aiAgentTabNavigation', () => {
  afterEach(() => {
    takePendingAIAgentTabSwitch()
  })

  it('stores pending payload, opens AI Agent page, and emits switchAIAgentTab', () => {
    const menuOpen = vi.fn()
    const switchTab = vi.fn()
    emiter.on('menuOpenPage', menuOpen)
    emiter.on('switchAIAgentTab', switchTab)

    openAIAgentTab(AIAgentTabListEnum.Browser)

    const expected = JSON.stringify({
      type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE,
      params: { active: AIAgentTabListEnum.Browser, show: true },
    })
    expect(menuOpen).toHaveBeenCalledWith(JSON.stringify({ route: YakitRoute.AI_Agent }))
    expect(switchTab).toHaveBeenCalledWith(expected)
    expect(takePendingAIAgentTabSwitch()).toBe(expected)
    expect(takePendingAIAgentTabSwitch()).toBe('')

    emiter.off('menuOpenPage', menuOpen)
    emiter.off('switchAIAgentTab', switchTab)
  })

  it('overwrites pending payload when opening again before consume', () => {
    openAIAgentTab(AIAgentTabListEnum.Session)
    openAIAgentTab(AIAgentTabListEnum.Browser)
    expect(JSON.parse(takePendingAIAgentTabSwitch()).params.active).toBe(AIAgentTabListEnum.Browser)
  })

  it('clearPendingAIAgentTabSwitch only clears matching payload', () => {
    openAIAgentTab(AIAgentTabListEnum.MCP)
    const mcpPayload = JSON.stringify({
      type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE,
      params: { active: AIAgentTabListEnum.MCP, show: true },
    })
    clearPendingAIAgentTabSwitch('other-payload')
    expect(takePendingAIAgentTabSwitch()).toBe(mcpPayload)

    openAIAgentTab(AIAgentTabListEnum.File)
    const filePayload = JSON.stringify({
      type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE,
      params: { active: AIAgentTabListEnum.File, show: true },
    })
    clearPendingAIAgentTabSwitch(mcpPayload)
    expect(takePendingAIAgentTabSwitch()).toBe(filePayload)
  })

  it('clearPendingAIAgentTabSwitch clears when payload still matches', () => {
    openAIAgentTab(AIAgentTabListEnum.Scheduled)
    const payload = JSON.stringify({
      type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE,
      params: { active: AIAgentTabListEnum.Scheduled, show: true },
    })
    clearPendingAIAgentTabSwitch(payload)
    expect(takePendingAIAgentTabSwitch()).toBe('')
  })
})
