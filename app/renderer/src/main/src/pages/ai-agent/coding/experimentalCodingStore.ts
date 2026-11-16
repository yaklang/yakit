import { bindExternalStoreHook, createExternalStore } from '@/utils/createExternalStore'

const key = 'yakit.experimental.coding-agent'
const read = () => {
  try {
    return localStorage.getItem(key) === 'true'
  } catch {
    return false
  }
}
const store = createExternalStore(read())

export const useExperimentalCoding = bindExternalStoreHook(store)
export const isExperimentalCodingEnabled = store.getSnapshot
export const setExperimentalCoding = (enabled: boolean) => {
  localStorage.setItem(key, String(enabled))
  store.setSnapshot(() => enabled)
}
