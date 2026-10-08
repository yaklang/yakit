import { bindExternalStoreHook, createExternalStore } from '@/utils/createExternalStore'
import { RemoteAIAgentGV } from '@/enums/aiAgent'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'

// 设置页与首页共享的关闭状态，false 表示默认启用动画
const store = createExternalStore(false)
// 是否已发起缓存读取，避免多个组件订阅时重复请求
let hydrated = false
// 是否已在本地切换，防止迟到的缓存读取覆盖新选择
let localDirty = false

// 首次订阅时加载缓存，读取失败则保留当前状态
const hydrate = () => {
  if (hydrated) return
  hydrated = true
  void getRemoteValue(RemoteAIAgentGV.WelcomeAnimationDisabled)
    .then((raw) => {
      if (localDirty) return
      store.setSnapshot(() => raw === 'true')
    })
    .catch(() => {})
}

export const useWelcomeAnimationDisabled = bindExternalStoreHook({
  subscribe: (listener) => {
    hydrate()
    return store.subscribe(listener)
  },
  getSnapshot: store.getSnapshot,
  setSnapshot: store.setSnapshot,
})

export const setWelcomeAnimationDisabled = (disabled: boolean) => {
  localDirty = true
  store.setSnapshot(() => disabled)
  setRemoteValue(RemoteAIAgentGV.WelcomeAnimationDisabled, `${disabled}`)
}
