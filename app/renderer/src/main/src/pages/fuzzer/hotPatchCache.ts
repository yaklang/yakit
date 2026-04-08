import { FuzzerRemoteGV } from '@/enums/fuzzer'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'

export interface HotPatchCacheValue {
  hotPatchCodeOpen: boolean
  sharedHotReloadCode: boolean
  hotPatchCode: string
}

const defaultHotPatchCacheValue: HotPatchCacheValue = {
  hotPatchCodeOpen: false,
  sharedHotReloadCode: false,
  hotPatchCode: '',
}

export const parseHotPatchCache = (value?: string | null): HotPatchCacheValue => {
  if (!value) {
    return defaultHotPatchCacheValue
  }

  try {
    const data = JSON.parse(value) || {}
    return {
      hotPatchCodeOpen: !!data.hotPatchCodeOpen,
      sharedHotReloadCode: !!(data.sharedHotReloadCode ?? data.inheritLastHotPatchCode ?? data.hotPatchCodeOpen),
      hotPatchCode: data.hotPatchCode || '',
    }
  } catch (error) {
    return defaultHotPatchCacheValue
  }
}

export const getHotPatchCache = async (): Promise<HotPatchCacheValue> => {
  const value = await getRemoteValue(FuzzerRemoteGV.FuzzerHotCodeSwitchAndCode)
  return parseHotPatchCache(value)
}

export const setHotPatchCache = async (value: Partial<HotPatchCacheValue>): Promise<HotPatchCacheValue> => {
  const nextValue = {
    ...(await getHotPatchCache()),
    ...value,
  }

  await setRemoteValue(FuzzerRemoteGV.FuzzerHotCodeSwitchAndCode, JSON.stringify(nextValue))
  return nextValue
}
