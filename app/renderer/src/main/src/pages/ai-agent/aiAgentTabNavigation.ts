import { YakitRoute } from '@/enums/yakitRoute'
import emiter from '@/utils/eventBus/eventBus'
import { AIAgentTabListEnum, SwitchAIAgentTabEventEnum } from './defaultConstant'

let pendingTabSwitch = ''

export const openAIAgentTab = (active: AIAgentTabListEnum) => {
  const payload = JSON.stringify({
    type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE,
    params: { active, show: true },
  })
  pendingTabSwitch = payload
  emiter.emit('menuOpenPage', JSON.stringify({ route: YakitRoute.AI_Agent }))
  emiter.emit('switchAIAgentTab', payload)
}

export const takePendingAIAgentTabSwitch = () => {
  const payload = pendingTabSwitch
  pendingTabSwitch = ''
  return payload
}

export const clearPendingAIAgentTabSwitch = (payload: string) => {
  if (pendingTabSwitch === payload) pendingTabSwitch = ''
}
